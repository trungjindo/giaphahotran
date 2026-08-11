import React, { useState, useContext, useRef, useMemo, useEffect, useCallback } from 'react';
import { AppContext } from '../store';
import { apiRequest } from '../api';
import { flattenFamily, buildDescendantList } from '../utils/family';
import MemberProfileModal from '../components/MemberProfileModal';

// Bảng màu gán cho từng chi lớn để tạo "khối màu" phân biệt các nhánh trên sơ đồ.
const CHI_COLORS = [
  { line: '#0E6FA8', bg: 'rgba(14,111,168,0.09)' },
  { line: '#C87F0A', bg: 'rgba(200,127,10,0.11)' },
  { line: '#B03A3A', bg: 'rgba(176,58,58,0.09)' },
  { line: '#4E8B5C', bg: 'rgba(78,139,92,0.10)' },
  { line: '#7D5BA6', bg: 'rgba(125,91,166,0.10)' },
  { line: '#2FB3C0', bg: 'rgba(47,179,192,0.10)' },
];

const findNodeById = (node, id) => {
  if (!node) return null;
  if (node.id === id) return node;
  for (const child of node.children || []) {
    const found = findNodeById(child, id);
    if (found) return found;
  }
  return null;
};

// Đánh dấu mọi tổ tiên nằm trên đường đi từ gốc tới 1 gốc chi bất kỳ (kể cả chính gốc chi
// đó) — dùng để mặc định mở sẵn "trục xương sống" dẫn tới các chi.
const markChiPathAncestors = (node, chiRootIds, result) => {
  if (!node) return false;
  let hasChiDescendant = chiRootIds.has(node.id);
  for (const child of node.children || []) {
    if (markChiPathAncestors(child, chiRootIds, result)) hasChiDescendant = true;
  }
  if (hasChiDescendant) result.add(node.id);
  return hasChiDescendant;
};

// Tên rút gọn hiển thị trong ô: bỏ họ chung "Trần" (lặp lại ở mọi thành viên, không cần
// thiết), giữ lại các chữ còn lại để xếp theo hàng dọc, mỗi chữ 1 dòng — VD "Trần Tiến Hoa"
// -> ["Tiến", "Hoa"].
const getShortNameWords = (name) => {
  if (!name) return [''];
  const parts = name.trim().split(/\s+/);
  if (parts.length > 1 && parts[0] === 'Trần') return parts.slice(1);
  return parts;
};

// Đo vị trí 1 phần tử theo hệ tọa độ layout gốc (offsetTop/offsetLeft, không bị ảnh hưởng
// bởi transform: scale() của zoom) — dùng chung cho cả đường phân cách theo đời lẫn đường
// nối cha-con.
function getLocalOffset(el, container) {
  let top = 0, left = 0, cur = el, guard = 0;
  while (cur && cur !== container && guard < 300) {
    top += cur.offsetTop;
    left += cur.offsetLeft;
    cur = cur.offsetParent;
    guard++;
  }
  return { top, left };
}

// Đo 2 hệ tọa độ khác nhau cho mỗi "đời": localTop (offsetTop cục bộ, không bị ảnh hưởng
// bởi transform: scale — dùng để vẽ đường phân cách nằm BÊN TRONG lớp zoom) và screenCenter
// (tọa độ tương đối theo getBoundingClientRect so với chính overlayRef — vì overlayRef LÀ
// containing block thật sự của nhãn dính (position:sticky bên trong 1 anchor position:
// absolute), phép trừ 2 rect nằm CÙNG bối cảnh cuộn nên tự triệt tiêu scrollTop, không cần
// cộng bù tay; dùng scrollRect của .tree-scroll-container làm mốc — như bản trước — sai vì
// đó KHÔNG phải containing block của anchor, gây lệch 1 khoảng cố định (đúng bằng phần đệm/
// margin nằm giữa scroll-container và overlay) mà lại NHÂN THEO SỐ ĐỜI do accumulate encoding
// nhầm giữa 2 hệ tọa độ ở bản trước đó).
function useMeasuredBands(overlayRef, contentContainerRef, watch) {
  const [bands, setBands] = useState([]);

  useEffect(() => {
    const overlayEl = overlayRef.current;
    const contentEl = contentContainerRef.current;
    if (!overlayEl || !contentEl) return;

    const measure = () => {
      const nodes = contentEl.querySelectorAll('[data-generation]');
      const overlayRect = overlayEl.getBoundingClientRect();
      const localTops = {};
      const screenCenters = {};

      nodes.forEach(el => {
        const gen = Number(el.dataset.generation);

        const { top: localTop } = getLocalOffset(el, contentEl);
        if (localTops[gen] === undefined || localTop < localTops[gen]) localTops[gen] = localTop;

        const rect = el.getBoundingClientRect();
        const screenCenter = (rect.top - overlayRect.top) + rect.height / 2;
        if (screenCenters[gen] === undefined || screenCenter < screenCenters[gen]) screenCenters[gen] = screenCenter;
      });

      const gens = [...new Set([...Object.keys(localTops), ...Object.keys(screenCenters)].map(Number))];
      const next = gens
        .map(gen => ({ generation: gen, localTop: localTops[gen], screenCenter: screenCenters[gen] }))
        .sort((a, b) => a.localTop - b.localTop);
      setBands(next);
    };

    measure();
    const observer = new ResizeObserver(() => measure());
    observer.observe(contentEl);
    return () => observer.disconnect();
  }, [overlayRef, contentContainerRef, watch]);

  return bands;
}

// Vẽ TOÀN BỘ đường nối cha-con bằng 1 lớp SVG duy nhất, tọa độ đo trực tiếp từ vị trí
// thật của từng ô (không suy đoán qua % như CSS trước đây) — đảm bảo luôn liền mạch, không
// bao giờ bị đứt quãng ở khoảng cách giữa các ô anh em (margin) như cách vẽ bằng viền cũ.
function TreeConnectors({ containerRef, watch }) {
  const [state, setState] = useState({ edges: [], width: 0, height: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measure = () => {
      const rows = container.querySelectorAll('.tree-children');
      const edges = [];
      rows.forEach(row => {
        const parentCard = row.parentElement?.querySelector(':scope > .tree-node');
        if (!parentCard) return;
        const p = getLocalOffset(parentCard, container);
        const parentX = p.left + parentCard.offsetWidth / 2;
        const parentY = p.top + parentCard.offsetHeight;

        row.querySelectorAll(':scope > .tree-node-wrapper').forEach(wrapper => {
          const childCard = wrapper.querySelector(':scope > .tree-node');
          if (!childCard) return;
          const c = getLocalOffset(childCard, container);
          const childX = c.left + childCard.offsetWidth / 2;
          const childY = c.top;
          edges.push({
            parentX, parentY, childX, childY,
            color: childCard.dataset.lineColor || '#A9BAC4',
            width: Number(childCard.dataset.lineWidth || 1.5),
          });
        });
      });
      setState({ edges, width: container.scrollWidth, height: container.scrollHeight });
    };

    measure();
    const observer = new ResizeObserver(() => measure());
    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef, watch]);

  return (
    <svg className="tree-connectors-svg" width={state.width} height={state.height} aria-hidden="true">
      {state.edges.map((e, i) => {
        const midY = (e.parentY + e.childY) / 2;
        const d = `M ${e.parentX} ${e.parentY} L ${e.parentX} ${midY} L ${e.childX} ${midY} L ${e.childX} ${e.childY}`;
        return <path key={i} d={d} stroke={e.color} strokeWidth={e.width} fill="none" strokeLinecap="round" />;
      })}
    </svg>
  );
}

const TreeNode = ({ node, onSelect, filterProvince, chiInfoMap, chiRootIds, chiPathAncestorIds, expandedChiRootId, onToggleChiRoot, forceExpanded }) => {
  const isChiRoot = chiRootIds.has(node.id);
  const defaultOpen = !isChiRoot && (forceExpanded || chiPathAncestorIds.has(node.id) || node.generation < 2);
  const [localExpanded, setLocalExpanded] = useState(defaultOpen);
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = isChiRoot ? expandedChiRootId === node.id : localExpanded;
  const childForceExpanded = isChiRoot ? isExpanded : forceExpanded;

  const isMain = node.isMainLineage;
  const isFilterMatch = !!filterProvince && node.currentProvince === filterProvince;

  const chiInfo = chiInfoMap[node.id] || null;
  // Cấp độ nổi bật của đường nối TỚI ô này: 'main' = đích tôn của cả dòng họ (rõ nhất),
  // 'chi' = đích tôn riêng của 1 chi (theo màu của chi đó), 'normal' = các nhánh còn lại.
  const lineTier = !isMain ? 'normal' : (chiInfo ? 'chi' : 'main');
  const lineColor = lineTier === 'main' ? '#0E6FA8' : lineTier === 'chi' ? chiInfo.line : '#A9BAC4';
  const lineWidth = lineTier === 'main' ? 3.5 : lineTier === 'chi' ? 2.5 : 1.5;

  const borderColor = chiInfo ? chiInfo.line : (isMain ? 'var(--primary-color)' : 'var(--border-color)');
  const nameWords = useMemo(() => getShortNameWords(node.name), [node.name]);

  const handleToggle = (e) => {
    e.stopPropagation();
    if (isChiRoot) onToggleChiRoot(node.id);
    else setLocalExpanded(prev => !prev);
  };

  return (
    <div className="tree-node-wrapper">
      <div
        className="tree-node"
        data-generation={node.generation}
        data-line-color={lineColor}
        data-line-width={lineWidth}
        style={{
          borderColor: isFilterMatch ? 'var(--secondary-color)' : borderColor,
          background: chiInfo ? chiInfo.bg : undefined,
          boxShadow: isFilterMatch ? '0 0 0 3px rgba(242,196,106,0.4)' : undefined,
          opacity: filterProvince && !isFilterMatch ? 0.4 : 1
        }}
      >
        {lineTier === 'main' && <span className="star-badge star-main" title="Đích tôn dòng họ">★</span>}
        {lineTier === 'chi' && <span className="star-badge star-chi" style={{ color: chiInfo.line }} title={`Đích tôn ${chiInfo.chiName}`}>★</span>}

        <div
          className="node-content"
          onClick={() => onSelect(node)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(node); } }}
          role="button"
          tabIndex={0}
          aria-label={`Xem hồ sơ ${node.name}`}
          title={node.name}
        >
          <div className="node-name-vertical">
            {nameWords.map((w, i) => <span key={i}>{w}</span>)}
          </div>
        </div>

        {hasChildren && (
          <button
            className="expand-btn"
            onClick={handleToggle}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? `Thu gọn nhánh của ${node.name}` : `Mở rộng nhánh của ${node.name}`}
            title={isChiRoot ? (isExpanded ? 'Thu gọn chi này' : 'Mở chi này (các chi khác sẽ tự thu gọn)') : (isExpanded ? 'Thu gọn nhánh' : 'Mở rộng nhánh')}
          >
            {isExpanded ? '−' : '+'}
          </button>
        )}
      </div>

      {hasChildren && isExpanded && (
        <div className="tree-children">
          {node.children.map(child => (
            <TreeNode
              key={child.id}
              node={child}
              onSelect={onSelect}
              filterProvince={filterProvince}
              chiInfoMap={chiInfoMap}
              chiRootIds={chiRootIds}
              chiPathAncestorIds={chiPathAncestorIds}
              expandedChiRootId={expandedChiRootId}
              onToggleChiRoot={onToggleChiRoot}
              forceExpanded={childForceExpanded}
            />
          ))}
        </div>
      )}
    </div>
  );
};

function FamilyTreePage() {
  const { familyData } = useContext(AppContext);
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [filterProvince, setFilterProvince] = useState('');
  const [chiList, setChiList] = useState([]);
  const [chiLoaded, setChiLoaded] = useState(false);
  const [expandedChiRootId, setExpandedChiRootId] = useState(null);

  useEffect(() => {
    apiRequest('chi.php').then(setChiList).catch(() => {}).finally(() => setChiLoaded(true));
  }, []);

  const provinceOptions = useMemo(() => {
    const members = flattenFamily(familyData);
    return [...new Set(members.map(m => m.currentProvince).filter(Boolean))].sort();
  }, [familyData]);

  const descendantList = useMemo(() => buildDescendantList(familyData), [familyData]);
  const selectedMember = useMemo(
    () => descendantList.find(m => m.id === selectedMemberId) || null,
    [descendantList, selectedMemberId]
  );

  const { chiInfoMap, chiRootIds, chiPathAncestorIds } = useMemo(() => {
    const infoMap = {};
    const rootIds = new Set(chiList.map(c => c.rootMemberId));
    if (familyData) {
      chiList.forEach((chi, idx) => {
        const rootNode = findNodeById(familyData, chi.rootMemberId);
        if (!rootNode) return;
        const color = CHI_COLORS[idx % CHI_COLORS.length];
        flattenFamily(rootNode).forEach(m => {
          infoMap[m.id] = { chiId: chi.id, chiName: chi.name, line: color.line, bg: color.bg };
        });
      });
    }
    const pathIds = new Set();
    if (familyData) markChiPathAncestors(familyData, rootIds, pathIds);
    return { chiInfoMap: infoMap, chiRootIds: rootIds, chiPathAncestorIds: pathIds };
  }, [familyData, chiList]);

  const handleToggleChiRoot = useCallback((id) => {
    setExpandedChiRootId(prev => (prev === id ? null : id));
  }, []);

  // Trạng thái cho tính năng Zoom và Pan (Kéo thả)
  const [zoom, setZoom] = useState(1);
  const scrollContainerRef = useRef(null);
  const generationOverlayRef = useRef(null);
  const treeContainerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.15, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.15, 0.3));
  const handleResetZoom = () => setZoom(1);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setStartY(e.pageY - scrollContainerRef.current.offsetTop);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
    setScrollTop(scrollContainerRef.current.scrollTop);
  };
  const handleMouseLeave = () => setIsDragging(false);
  const handleMouseUp = () => setIsDragging(false);
  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const y = e.pageY - scrollContainerRef.current.offsetTop;
    const walkX = (x - startX) * 1.5;
    const walkY = (y - startY) * 1.5;
    scrollContainerRef.current.scrollLeft = scrollLeft - walkX;
    scrollContainerRef.current.scrollTop = scrollTop - walkY;
  };

  const measureWatch = `${expandedChiRootId}-${zoom}-${chiList.length}`;
  const bands = useMeasuredBands(generationOverlayRef, treeContainerRef, measureWatch);

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)', padding: '20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '15px' }}>
        <h2 style={{ marginBottom: '5px' }}>Sơ Đồ Gia Phả - Dòng Họ Trần Đình</h2>
        <div className="tree-legend">
          <span><i className="star-badge-legend star-main">★</i> Đích tôn dòng họ</span>
          <span><i className="star-badge-legend star-chi">★</i> Đích tôn của chi</span>
          <span><i className="legend-swatch" /> Mỗi màu nền = 1 chi</span>
        </div>
      </div>

      <div className="tree-toolbar">
        <button className="btn-icon" onClick={handleZoomOut} aria-label="Thu nhỏ" title="Thu nhỏ">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round"><path d="M5 12h14" /></svg>
        </button>
        <span style={{ fontWeight: 'bold', width: '50px', textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
        <button className="btn-icon" onClick={handleZoomIn} aria-label="Phóng to" title="Phóng to">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
        </button>
        <button className="btn-icon" onClick={handleResetZoom} aria-label="Về mặc định" title="Mặc định" style={{ marginLeft: '10px' }}>
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 1 3 6.7" /><path d="M3 20v-6h6" /></svg>
        </button>
        <span style={{ marginLeft: '15px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Kéo giữ để di chuyển · Kéo góc dưới-phải khung để phóng to
        </span>
        {provinceOptions.length > 0 && (
          <select
            className="select-control"
            value={filterProvince}
            onChange={e => setFilterProvince(e.target.value)}
            aria-label="Lọc theo khu vực"
            style={{ marginLeft: '15px', padding: '7px 12px' }}
          >
            <option value="">Lọc theo khu vực...</option>
            {provinceOptions.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        )}
      </div>

      <div
        className="tree-scroll-container"
        ref={scrollContainerRef}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
      >
        {/* Nhãn "Đời N" — nằm NGOÀI lớp transform: scale() và dùng position:sticky theo
            trục ngang, nên luôn hiện rõ ở mép trái khung nhìn dù kéo cuộn sang bên nào,
            không còn bị trôi mất khỏi màn hình như khi đặt trực tiếp trong nội dung cây. */}
        <div className="tree-generation-overlay" ref={generationOverlayRef}>
          {bands.map(b => (
            <div key={b.generation} className="generation-row-anchor" style={{ top: `${b.screenCenter}px` }}>
              <span className="generation-label">Đời {b.generation}</span>
            </div>
          ))}
        </div>

        <div
          className="tree-scale-wrapper"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
        >
          <div className="tree-container" ref={treeContainerRef}>
            {familyData && chiLoaded ? (
              <>
                <TreeConnectors containerRef={treeContainerRef} watch={measureWatch} />
                {bands.map(b => (
                  <div key={b.generation} className="generation-line" style={{ top: `${b.localTop - 11}px` }} />
                ))}
                <TreeNode
                  node={familyData}
                  onSelect={node => setSelectedMemberId(node.id)}
                  filterProvince={filterProvince}
                  chiInfoMap={chiInfoMap}
                  chiRootIds={chiRootIds}
                  chiPathAncestorIds={chiPathAncestorIds}
                  expandedChiRootId={expandedChiRootId}
                  onToggleChiRoot={handleToggleChiRoot}
                  forceExpanded={false}
                />
              </>
            ) : familyData ? <p>Đang tải dữ liệu chi...</p> : <p>Không có dữ liệu</p>}
          </div>
        </div>
      </div>

      <style>{`
        .tree-legend {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 16px;
          font-size: 0.85rem;
          color: var(--text-secondary);
        }

        .tree-legend span {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .star-badge-legend {
          font-style: normal;
          font-size: 1rem;
          line-height: 1;
        }

        .star-badge-legend.star-main { color: #C0392B; }
        .star-badge-legend.star-chi { color: #D4AF37; }

        .legend-swatch {
          display: inline-block;
          width: 12px;
          height: 12px;
          border-radius: 3px;
          background: rgba(14,111,168,0.15);
          border: 1px solid rgba(14,111,168,0.4);
        }

        .tree-toolbar {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
          background: var(--surface-color);
          padding: 10px;
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-sm);
          margin-bottom: 15px;
          gap: 5px;
        }

        .btn-icon {
          background: var(--color-sand);
          color: var(--primary-color);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background-color var(--transition-fast), transform var(--transition-micro);
          font-size: 1rem;
        }

        .btn-icon:hover {
          background: var(--accent-teal-light);
          color: white;
        }

        .btn-icon:active {
          transform: scale(0.94);
        }

        .tree-scroll-container {
          flex: 1;
          overflow: auto;
          background: var(--surface-color);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-sm);
          padding: 20px;
          position: relative;
          cursor: grab;
          resize: both;
          min-height: 420px;
          min-width: 320px;
        }

        .tree-scroll-container:active {
          cursor: grabbing;
        }

        /* Lớp phủ chứa nhãn "Đời N" — nằm ngoài transform, position:sticky theo left để
           luôn dính mép trái khung nhìn; vẫn cuộn dọc bình thường theo đúng hàng của nó. */
        .tree-generation-overlay {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 4;
        }

        .generation-row-anchor {
          position: absolute;
          left: 0;
          right: 0;
          height: 0;
        }

        .generation-label {
          position: sticky;
          left: 8px;
          display: inline-block;
          transform: translateY(-50%);
          background: var(--primary-color);
          color: white;
          font-size: 0.72rem;
          font-weight: 700;
          -webkit-font-smoothing: antialiased;
          padding: 3px 10px;
          border-radius: var(--radius-pill);
          box-shadow: var(--shadow-sm);
          white-space: nowrap;
          pointer-events: auto;
        }

        .tree-scale-wrapper {
          transition: transform var(--transition-normal);
          min-width: 100%;
          display: flex;
          justify-content: center;
        }

        .tree-container {
          display: flex;
          justify-content: center;
          min-width: max-content;
          padding: 20px;
          position: relative;
        }

        .tree-connectors-svg {
          position: absolute;
          top: 0;
          left: 0;
          z-index: 1;
          pointer-events: none;
          overflow: visible;
        }

        .generation-line {
          position: absolute;
          left: 0;
          right: 0;
          height: 0;
          border-top: 1px dashed var(--border-color);
          z-index: 1;
          pointer-events: none;
        }

        .tree-node-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          margin: 0 9px;
        }

        .tree-node {
          background: var(--surface-color);
          border: 2px solid;
          border-radius: var(--radius-sm);
          padding: 8px 6px;
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          z-index: 2;
          min-width: 46px;
          box-shadow: var(--shadow-sm);
          transition: box-shadow var(--transition-normal), background-color var(--transition-normal);
        }

        .tree-node:hover {
          box-shadow: var(--shadow-md);
        }

        .star-badge {
          position: absolute;
          top: -10px;
          right: -8px;
          font-style: normal;
          font-size: 1.05rem;
          line-height: 1;
          color: #C0392B;
          text-shadow: 0 1px 1px rgba(0,0,0,0.25), 0 0 0 1px white;
          z-index: 3;
        }

        .node-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
          border-radius: var(--radius-sm);
        }

        .node-name-vertical {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .node-name-vertical span {
          font-family: var(--font-serif);
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1.28;
          white-space: nowrap;
          -webkit-font-smoothing: antialiased;
          text-rendering: optimizeLegibility;
        }

        .expand-btn {
          margin-top: 8px;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          border: 1px solid var(--border-color);
          background: var(--surface-color);
          color: var(--text-primary);
          font-weight: bold;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          line-height: 1;
          box-shadow: var(--shadow-sm);
          transition: background-color var(--transition-fast), transform var(--transition-micro);
        }

        .expand-btn:hover {
          background: var(--color-sand);
          transform: scale(1.1);
        }

        .tree-children {
          display: flex;
          margin-top: 30px;
          position: relative;
        }
      `}</style>

      <MemberProfileModal member={selectedMember} onClose={() => setSelectedMemberId(null)} />
    </div>
  );
}

export default FamilyTreePage;
