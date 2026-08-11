import React, { useState, useContext, useRef, useMemo, useEffect, useCallback } from 'react';
import { AppContext } from '../store';
import { apiRequest } from '../api';
import { flattenFamily, buildDescendantList, buildFamilyCodeMap } from '../utils/family';
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

// So sánh mã định danh phả hệ dạng "1.2.3" theo TỪNG SỐ (không phải so chuỗi — "1.10" phải
// đứng sau "1.9") — dùng để xếp thứ tự trái-phải trong 1 hàng đời sao cho các anh em/con
// cháu cùng 1 nhánh vẫn đứng cạnh nhau, đúng theo thứ tự khai sinh trong cây.
const compareDottedCode = (a, b) => {
  const pa = (a || '').split('.').map(Number);
  const pb = (b || '').split('.').map(Number);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const na = pa[i] ?? -1;
    const nb = pb[i] ?? -1;
    if (na !== nb) return na - nb;
  }
  return 0;
};

// Duyệt cây tính danh sách các ô ĐANG HIỂN THỊ, gom theo TỪNG ĐỜI (mỗi ô chỉ thuộc đúng 1
// hàng), cùng danh sách cặp cha-con để vẽ đường nối — thay cho đệ quy JSX như bản trước, vì
// đệ quy lồng nhau không đảm bảo được yêu cầu "1 đời = 1 hàng ngang, mỗi ô chỉ nằm trong 1
// hàng" khi các nhánh có độ sâu/chiều cao hiển thị khác nhau.
function computeVisibleTree(root, { chiRootIds, chiPathAncestorIds, expandedChiRootId, manualOverrides }) {
  const rowsMap = new Map();
  const edges = [];
  const nodeState = new Map();

  const walk = (node, forceExpanded) => {
    if (!rowsMap.has(node.generation)) rowsMap.set(node.generation, []);
    rowsMap.get(node.generation).push(node);

    const hasChildren = !!(node.children && node.children.length > 0);
    const isChiRoot = chiRootIds.has(node.id);
    let isExpanded = false;
    if (hasChildren) {
      if (isChiRoot) isExpanded = expandedChiRootId === node.id;
      else if (manualOverrides.has(node.id)) isExpanded = manualOverrides.get(node.id);
      else isExpanded = forceExpanded || chiPathAncestorIds.has(node.id) || node.generation < 2;
    }
    nodeState.set(node.id, { isChiRoot, isExpanded, hasChildren });

    if (isExpanded) {
      const childForceExpanded = isChiRoot ? true : forceExpanded;
      node.children.forEach(child => {
        edges.push({ parentId: node.id, childId: child.id });
        walk(child, childForceExpanded);
      });
    }
  };

  if (root) walk(root, false);
  return { rowsMap, edges, nodeState };
}

// Đo vị trí 1 phần tử theo hệ tọa độ layout gốc (offsetTop/offsetLeft, không bị ảnh hưởng
// bởi transform: scale() của zoom) — dùng cho việc vẽ đường nối cha-con.
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

// Vẽ đường nối cha-con bằng 1 lớp SVG duy nhất, tọa độ đo trực tiếp từ vị trí thật của từng
// ô qua data-node-id (không còn dựa vào việc lồng cha-con trong DOM như bản trước, vì giờ
// mỗi ô nằm phẳng trong đúng 1 hàng đời — quan hệ cha-con lấy thẳng từ danh sách "edges").
function TreeConnectors({ edges, containerRef, watch }) {
  const [state, setState] = useState({ paths: [], width: 0, height: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measure = () => {
      const byId = {};
      container.querySelectorAll('[data-node-id]').forEach(el => { byId[el.dataset.nodeId] = el; });

      const paths = [];
      edges.forEach(({ parentId, childId }) => {
        const parentEl = byId[parentId];
        const childEl = byId[childId];
        if (!parentEl || !childEl) return;
        const p = getLocalOffset(parentEl, container);
        const c = getLocalOffset(childEl, container);
        const parentX = p.left + parentEl.offsetWidth / 2;
        const parentY = p.top + parentEl.offsetHeight;
        const childX = c.left + childEl.offsetWidth / 2;
        const childY = c.top;
        paths.push({
          parentX, parentY, childX, childY,
          color: childEl.dataset.lineColor || '#A9BAC4',
          width: Number(childEl.dataset.lineWidth || 1.5),
        });
      });
      setState({ paths, width: container.scrollWidth, height: container.scrollHeight });
    };

    measure();
    const observer = new ResizeObserver(() => measure());
    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef, edges, watch]);

  return (
    <svg className="tree-connectors-svg" width={state.width} height={state.height} aria-hidden="true">
      {state.paths.map((e, i) => {
        const midY = (e.parentY + e.childY) / 2;
        const d = `M ${e.parentX} ${e.parentY} L ${e.parentX} ${midY} L ${e.childX} ${midY} L ${e.childX} ${e.childY}`;
        return <path key={i} d={d} stroke={e.color} strokeWidth={e.width} fill="none" strokeLinecap="round" />;
      })}
    </svg>
  );
}

const TreeNodeCard = ({ node, onSelect, filterProvince, chiInfoMap, isChiRoot, isExpanded, hasChildren, onToggleChiRoot, onToggleNode }) => {
  const isMain = node.isMainLineage;
  const isFilterMatch = !!filterProvince && node.currentProvince === filterProvince;
  const chiInfo = chiInfoMap[node.id] || null;

  // Cấp độ nổi bật: 'main' = đích tôn của cả dòng họ (sao đỏ), 'chi' = đích tôn riêng của 1
  // chi (sao vàng theo màu chi đó), 'normal' = các nhánh còn lại (không có sao).
  const lineTier = !isMain ? 'normal' : (chiInfo ? 'chi' : 'main');
  const lineColor = lineTier === 'main' ? '#0E6FA8' : lineTier === 'chi' ? chiInfo.line : '#A9BAC4';
  const lineWidth = lineTier === 'main' ? 3.5 : lineTier === 'chi' ? 2.5 : 1.5;
  const borderColor = chiInfo ? chiInfo.line : (isMain ? 'var(--primary-color)' : 'var(--border-color)');
  const nameWords = useMemo(() => getShortNameWords(node.name), [node.name]);

  const handleToggle = (e) => {
    e.stopPropagation();
    if (isChiRoot) onToggleChiRoot(node.id);
    else onToggleNode(node);
  };

  return (
    <div
      className="tree-node"
      data-node-id={node.id}
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
  );
};

function FamilyTreePage() {
  const { familyData } = useContext(AppContext);
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [filterProvince, setFilterProvince] = useState('');
  const [chiList, setChiList] = useState([]);
  const [chiLoaded, setChiLoaded] = useState(false);
  const [expandedChiRootId, setExpandedChiRootId] = useState(null);
  const [manualOverrides, setManualOverrides] = useState(() => new Map());

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

  // Danh sách ô đang hiển thị, gom theo đời (mỗi ô chỉ thuộc đúng 1 hàng) + danh sách cặp
  // cha-con để vẽ đường nối. sortedGenerations/rowsMap sắp theo mã định danh phả hệ để các
  // anh em/con cháu cùng nhánh đứng cạnh nhau trong hàng.
  const { sortedGenerations, rowsMap, edges, nodeState } = useMemo(() => {
    if (!familyData || !chiLoaded) return { sortedGenerations: [], rowsMap: new Map(), edges: [], nodeState: new Map() };
    const { rowsMap, edges, nodeState } = computeVisibleTree(familyData, { chiRootIds, chiPathAncestorIds, expandedChiRootId, manualOverrides });
    const codeMap = buildFamilyCodeMap(familyData);
    const sortedGenerations = [...rowsMap.keys()].sort((a, b) => a - b);
    sortedGenerations.forEach(g => {
      rowsMap.set(g, [...rowsMap.get(g)].sort((a, b) => compareDottedCode(codeMap[a.id], codeMap[b.id])));
    });
    return { sortedGenerations, rowsMap, edges, nodeState };
  }, [familyData, chiLoaded, chiRootIds, chiPathAncestorIds, expandedChiRootId, manualOverrides]);

  const handleToggleNode = useCallback((node) => {
    setManualOverrides(prev => {
      const current = nodeState.get(node.id);
      const next = new Map(prev);
      next.set(node.id, current ? !current.isExpanded : true);
      return next;
    });
  }, [nodeState]);

  const handleSelectNode = useCallback((node) => setSelectedMemberId(node.id), []);

  // Trạng thái Zoom + Pan (kéo thả) + kéo rộng khung sang trái (bổ sung cho resize:both mặc
  // định của trình duyệt vốn chỉ kéo được ở góc dưới-phải).
  const [zoom, setZoom] = useState(1);
  const scrollContainerRef = useRef(null);
  const treeContainerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [extraLeftWidth, setExtraLeftWidth] = useState(0);
  const leftResizeRef = useRef(null);

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

  // Kéo mép trái để mở rộng khung sang bên trái — resize:both của CSS chỉ hỗ trợ góc
  // dưới-phải, nên phần mở rộng sang trái phải tự làm bằng tay: tăng width + kéo margin-left
  // âm cùng lúc để mép phải đứng yên, chỉ mép trái "chạy" ra xa hơn theo con trỏ chuột.
  const handleLeftResizeMouseDown = (e) => {
    e.preventDefault();
    const startPageX = e.clientX;
    const startWidth = extraLeftWidth;
    leftResizeRef.current = { startPageX, startWidth };

    const onMove = (moveEvent) => {
      if (!leftResizeRef.current) return;
      const delta = leftResizeRef.current.startPageX - moveEvent.clientX;
      const next = Math.min(600, Math.max(0, leftResizeRef.current.startWidth + delta));
      setExtraLeftWidth(next);
    };
    const onUp = () => {
      leftResizeRef.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const measureWatch = `${expandedChiRootId}-${manualOverrides.size}-${zoom}-${sortedGenerations.length}`;

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
          Kéo giữ để di chuyển · Kéo mép trái hoặc góc dưới-phải khung để mở rộng
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

      <div className="tree-scroll-wrapper">
        <div className="tree-left-resize-handle" onMouseDown={handleLeftResizeMouseDown} title="Kéo để mở rộng khung sang trái" />
        <div
          className="tree-scroll-container"
          ref={scrollContainerRef}
          style={{ width: `calc(100% + ${extraLeftWidth}px)`, marginLeft: `${-extraLeftWidth}px` }}
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
                <TreeConnectors edges={edges} containerRef={treeContainerRef} watch={measureWatch} />
                {sortedGenerations.map(gen => (
                  <div key={gen} className="gen-row">
                    <div className="gen-row-label"><span>Đời {gen}</span></div>
                    <div className="gen-row-content">
                      {rowsMap.get(gen).map(node => {
                        const st = nodeState.get(node.id) || {};
                        return (
                          <TreeNodeCard
                            key={node.id}
                            node={node}
                            onSelect={handleSelectNode}
                            filterProvince={filterProvince}
                            chiInfoMap={chiInfoMap}
                            isChiRoot={st.isChiRoot}
                            isExpanded={st.isExpanded}
                            hasChildren={st.hasChildren}
                            onToggleChiRoot={handleToggleChiRoot}
                            onToggleNode={handleToggleNode}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </>
            ) : familyData ? <p>Đang tải dữ liệu chi...</p> : <p>Không có dữ liệu</p>}
          </div>
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

        /* Bọc ngoài .tree-scroll-container để đặt tay kéo trái ở NGOÀI vùng cuộn — nếu để bên
           trong, tay kéo sẽ cuộn trôi theo nội dung, không còn bấm giữ được khi đã cuộn sang
           phải, khác với hành vi của tay kéo góc dưới-phải (resize:both) vốn luôn cố định. */
        .tree-scroll-wrapper {
          flex: 1;
          position: relative;
          display: flex;
          min-height: 420px;
        }

        .tree-scroll-container {
          flex: 1;
          overflow: auto;
          background: var(--surface-color);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-sm);
          padding: 0;
          position: relative;
          cursor: grab;
          resize: both;
          min-height: 420px;
          min-width: 320px;
        }

        .tree-scroll-container:active {
          cursor: grabbing;
        }

        .tree-left-resize-handle {
          position: absolute;
          left: -5px;
          top: 0;
          bottom: 0;
          width: 10px;
          cursor: ew-resize;
          z-index: 10;
          background: transparent;
          border-radius: var(--radius-sm);
          transition: background-color var(--transition-fast);
        }

        .tree-left-resize-handle:hover,
        .tree-left-resize-handle:active {
          background: var(--accent-teal-light);
          opacity: 0.6;
        }

        .tree-scale-wrapper {
          transition: transform var(--transition-normal);
          min-width: 100%;
          display: flex;
          justify-content: center;
          padding: 20px;
        }

        .tree-container {
          display: flex;
          flex-direction: column;
          min-width: max-content;
          position: relative;
          --tree-line-color: #A9BAC4;
        }

        .tree-connectors-svg {
          position: absolute;
          top: 0;
          left: 0;
          z-index: 1;
          pointer-events: none;
          overflow: visible;
        }

        /* Mỗi đời = 1 hàng ngang thật sự (không còn suy đoán từ vị trí render) — 2 đường kẻ
           song song (border-style: double) ngăn cách rõ ràng giữa các hàng. */
        .gen-row {
          display: flex;
          align-items: stretch;
          min-width: max-content;
          border-top: 6px double var(--tree-line-color);
        }

        .gen-row:last-child {
          border-bottom: 6px double var(--tree-line-color);
        }

        .gen-row-label {
          position: sticky;
          left: 0;
          flex-shrink: 0;
          width: 46px;
          display: flex;
          align-items: center;
          padding: 4px 8px;
          background: var(--surface-color);
          border-right: 1px solid var(--border-color);
          z-index: 5;
        }

        .gen-row-label span {
          font-size: 0.7rem;
          font-weight: 600;
          color: var(--text-secondary);
          white-space: nowrap;
          -webkit-font-smoothing: antialiased;
        }

        .gen-row-content {
          display: flex;
          align-items: center;
          gap: 20px;
          padding: 14px 20px;
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
          flex-shrink: 0;
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
      `}</style>

      <MemberProfileModal member={selectedMember} onClose={() => setSelectedMemberId(null)} />
    </div>
  );
}

export default FamilyTreePage;
