import React, { useState, useContext, useRef, useMemo, useEffect, useCallback } from 'react';
import { AppContext } from '../store';
import { apiRequest } from '../api';
import { flattenFamily, buildDescendantList } from '../utils/family';
import MemberProfileModal from '../components/MemberProfileModal';

// Bảng màu gán cho từng chi lớn để tạo "khối màu" phân biệt các nhánh trên sơ đồ.
const CHI_COLORS = [
  { line: '#0E6FA8', bg: 'rgba(14,111,168,0.07)' },
  { line: '#C87F0A', bg: 'rgba(200,127,10,0.09)' },
  { line: '#B03A3A', bg: 'rgba(176,58,58,0.07)' },
  { line: '#4E8B5C', bg: 'rgba(78,139,92,0.08)' },
  { line: '#7D5BA6', bg: 'rgba(125,91,166,0.08)' },
  { line: '#2FB3C0', bg: 'rgba(47,179,192,0.08)' },
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
// đó) — dùng để mặc định mở sẵn "trục xương sống" dẫn tới các chi, thay vì người xem phải
// tự bấm mở từng đời một mới thấy được các chi để chọn.
const markChiPathAncestors = (node, chiRootIds, result) => {
  if (!node) return false;
  let hasChiDescendant = chiRootIds.has(node.id);
  for (const child of node.children || []) {
    if (markChiPathAncestors(child, chiRootIds, result)) hasChiDescendant = true;
  }
  if (hasChiDescendant) result.add(node.id);
  return hasChiDescendant;
};

// Đo vị trí đỉnh (top) từng thẻ theo hệ tọa độ layout gốc (offsetTop, không bị ảnh hưởng
// bởi transform: scale() của zoom) để vẽ đường phân cách ngang đúng theo từng đời, bất kể
// nhánh nào đang mở/thu gọn.
function GenerationDividers({ containerRef, watch }) {
  const [bands, setBands] = useState([]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measure = () => {
      const nodes = container.querySelectorAll('[data-generation]');
      const tops = {};
      nodes.forEach(el => {
        const gen = Number(el.dataset.generation);
        let top = 0;
        let cur = el;
        let guard = 0;
        while (cur && cur !== container && guard < 200) {
          top += cur.offsetTop;
          cur = cur.offsetParent;
          guard++;
        }
        if (tops[gen] === undefined || top < tops[gen]) tops[gen] = top;
      });
      const next = Object.entries(tops)
        .map(([gen, top]) => ({ generation: Number(gen), top }))
        .sort((a, b) => a.top - b.top);
      setBands(next);
    };

    measure();
    const observer = new ResizeObserver(() => measure());
    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef, watch]);

  return (
    <>
      {bands.map(b => (
        <div key={b.generation} className="generation-divider" style={{ top: `${b.top - 11}px` }}>
          <span>Đời {b.generation}</span>
        </div>
      ))}
    </>
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
  // Cấp độ nổi bật của đường nối tới ô này: 'main' = đích tôn của cả dòng họ (rõ nhất),
  // 'chi' = đích tôn riêng của 1 chi (theo màu của chi đó), 'normal' = các nhánh còn lại.
  const lineTier = !isMain ? 'normal' : (chiInfo ? 'chi' : 'main');
  const lineColor = lineTier === 'main' ? 'var(--primary-color)' : lineTier === 'chi' ? chiInfo.line : 'var(--tree-line-color)';
  const lineWidth = lineTier === 'main' ? '3px' : lineTier === 'chi' ? '2.5px' : '1.5px';

  const borderColor = chiInfo ? chiInfo.line : (isMain ? 'var(--primary-color)' : 'var(--text-secondary)');

  // Đường trục nối xuống hàng con: lấy theo cấp độ của người con đích tôn (nếu có) để cả
  // đoạn thân trục cũng nổi bật liền mạch tới tận ô đích tôn, không chỉ đoạn cuối.
  const mainChild = (node.children || []).find(c => c.isMainLineage);
  const trunkChiInfo = mainChild ? chiInfoMap[mainChild.id] : null;
  const trunkTier = !mainChild ? 'normal' : (trunkChiInfo ? 'chi' : 'main');
  const trunkColor = trunkTier === 'main' ? 'var(--primary-color)' : trunkTier === 'chi' ? trunkChiInfo.line : 'var(--tree-line-color)';
  const trunkWidth = trunkTier === 'main' ? '3px' : trunkTier === 'chi' ? '2.5px' : '1.5px';

  const handleToggle = (e) => {
    e.stopPropagation();
    if (isChiRoot) onToggleChiRoot(node.id);
    else setLocalExpanded(prev => !prev);
  };

  return (
    <div
      className="tree-node-wrapper"
      data-generation={node.generation}
      style={{ '--line-color': lineColor, '--line-width': lineWidth }}
    >
      <div
        className="tree-node"
        style={{
          borderColor: isFilterMatch ? 'var(--secondary-color)' : borderColor,
          background: chiInfo ? chiInfo.bg : undefined,
          boxShadow: isFilterMatch ? '0 0 0 3px rgba(242,196,106,0.4)' : undefined,
          opacity: filterProvince && !isFilterMatch ? 0.4 : 1
        }}
      >
        <div
          className="node-content"
          onClick={() => onSelect(node)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(node); } }}
          role="button"
          tabIndex={0}
          aria-label={`Xem hồ sơ ${node.name}`}
          title="Bấm để xem hồ sơ"
        >
          <h4 style={{ color: isMain ? (chiInfo ? chiInfo.line : 'var(--primary-color)') : 'var(--text-primary)' }}>
            {node.name} {node.gender === 'Nam' ? '♂' : node.gender === 'Nữ' ? '♀' : ''}
          </h4>
          <span className="generation">Đời {node.generation}</span>
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
        <div className="tree-children" style={{ '--line-color': trunkColor, '--line-width': trunkWidth }}>
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
  // TreeNode chỉ tính trạng thái mở/thu gọn mặc định 1 LẦN lúc mount (useState initializer),
  // nên phải đợi danh sách chi tải xong rồi mới render cây — nếu không, các ô mount trước khi
  // chi.php trả về sẽ mãi mãi không được đánh dấu là "trên đường tới 1 chi" để tự mở sẵn.
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
  const treeContainerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.15, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.15, 0.3));
  const handleResetZoom = () => setZoom(1);

  // Logic kéo thả để di chuyển cây gia phả
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

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)', padding: '20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '15px' }}>
        <h2 style={{ marginBottom: '5px' }}>Sơ Đồ Gia Phả</h2>
        <div className="tree-legend">
          <span><i className="legend-line legend-line-main" /> Đích tôn dòng họ</span>
          <span><i className="legend-line legend-line-chi" /> Đích tôn của chi</span>
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
        <div
          className="tree-scale-wrapper"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
        >
          <div className="tree-container" ref={treeContainerRef}>
            {familyData && chiLoaded ? (
              <>
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
                <GenerationDividers containerRef={treeContainerRef} watch={`${expandedChiRootId}-${zoom}-${chiList.length}`} />
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

        .legend-line {
          display: inline-block;
          width: 20px;
          height: 0;
          border-top: 3px solid var(--primary-color);
        }

        .legend-line-chi {
          border-top: 2.5px solid #C87F0A;
        }

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
          --tree-line-color: #A9BAC4; /* Đậm hơn --border-color mặc định để đường kẻ nối rõ hơn */
        }

        .generation-divider {
          position: absolute;
          left: 0;
          right: 0;
          height: 0;
          border-top: 1px dashed var(--border-color);
          z-index: 1;
          pointer-events: none;
        }

        .generation-divider span {
          position: absolute;
          left: 0;
          top: -9px;
          background: var(--surface-color);
          color: var(--text-secondary);
          font-size: 0.7rem;
          font-weight: 600;
          -webkit-font-smoothing: antialiased;
          padding: 1px 9px;
          border-radius: var(--radius-pill);
          border: 1px solid var(--border-color);
          white-space: nowrap;
        }

        .tree-node-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          margin: 0 7px; /* Thu gọn khoảng cách ngang */
        }

        .tree-node {
          background: var(--surface-color);
          border: 2px solid;
          border-radius: var(--radius-sm);
          padding: 6px 12px; /* Chỉ còn họ tên + đời nên thu gọn tối đa */
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          z-index: 2;
          min-width: 84px;
          box-shadow: var(--shadow-sm);
          transition: box-shadow var(--transition-normal), background-color var(--transition-normal);
        }

        .tree-node:hover {
          box-shadow: var(--shadow-md);
        }

        .node-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
          border-radius: var(--radius-sm);
        }

        .node-content h4 {
          margin: 0;
          font-family: var(--font-serif);
          font-size: 0.92rem;
          font-weight: 600;
          letter-spacing: 0.01em;
          text-align: center;
          white-space: nowrap;
          -webkit-font-smoothing: antialiased;
          text-rendering: optimizeLegibility;
        }

        .generation {
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--primary-color);
          background: var(--color-sand);
          padding: 2px 8px;
          border-radius: var(--radius-pill);
          margin-top: 4px;
          display: inline-block;
          text-align: center;
        }

        .expand-btn {
          margin-top: 8px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 1px solid var(--border-color);
          background: var(--surface-color);
          color: var(--text-primary);
          font-weight: bold;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
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
          margin-top: 25px; /* Giảm khoảng cách dọc */
          position: relative;
        }

        /* Đường kẻ nối rõ ràng hơn: 1 thang bậc mặc định + màu/độ dày riêng theo từng ô
           (đích tôn dòng họ / đích tôn chi / bình thường) qua biến --line-color, --line-width. */
        .tree-children::before {
          content: '';
          position: absolute;
          top: -15px;
          left: 50%;
          width: 0;
          height: 15px;
          border-left: var(--line-width, 1.5px) solid var(--line-color, var(--tree-line-color));
        }

        .tree-node-wrapper::before {
          content: '';
          position: absolute;
          top: -15px;
          left: 50%;
          width: 0;
          height: 15px;
          border-left: var(--line-width, 1.5px) solid var(--line-color, var(--tree-line-color));
        }

        .tree-children .tree-node-wrapper:first-child::after {
          content: '';
          position: absolute;
          top: -15px;
          left: 50%;
          width: 50%;
          height: var(--line-width, 1.5px);
          background: var(--line-color, var(--tree-line-color));
        }

        .tree-children .tree-node-wrapper:last-child::after {
          content: '';
          position: absolute;
          top: -15px;
          right: 50%;
          width: 50%;
          height: var(--line-width, 1.5px);
          background: var(--line-color, var(--tree-line-color));
        }

        .tree-children .tree-node-wrapper:not(:first-child):not(:last-child)::after {
          content: '';
          position: absolute;
          top: -15px;
          left: 0;
          width: 100%;
          height: var(--line-width, 1.5px);
          background: var(--line-color, var(--tree-line-color));
        }

        .tree-children .tree-node-wrapper:first-child:last-child::after {
          display: none;
        }
      `}</style>

      <MemberProfileModal member={selectedMember} onClose={() => setSelectedMemberId(null)} />
    </div>
  );
}

export default FamilyTreePage;
