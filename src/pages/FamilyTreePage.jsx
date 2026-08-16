import React, { useState, useContext, useRef, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { TransformWrapper, TransformComponent, Virtualize, useTransformEffect } from 'react-zoom-pan-pinch';
import { AppContext } from '../store';
import { apiRequest } from '../api';
import { flattenFamily, buildDescendantList, buildFamilyCodeMap } from '../utils/family';
import { computeTreeLayout, CARD_WIDTH, CARD_HEIGHT } from '../utils/treeLayout';
import MemberProfileModal from '../components/MemberProfileModal';
import TreeNodeCard from '../components/TreeNodeCard';
import TreeConnectorsSvg from '../components/TreeConnectorsSvg';
import TreeAxis from '../components/TreeAxis';
import TreeToolbar from '../components/TreeToolbar';

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
// hàng), cùng danh sách cặp cha-con để vẽ đường nối.
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

// Ngưỡng zoom để tự thu gọn cây về trạng thái mặc định (giảm số ô đang hiển thị) khi đã zoom
// quá nhỏ để đọc được chi tiết — có độ trễ (0.4 / 0.45) giữa lúc thu gọn và lúc khôi phục để
// tránh nhấp nháy khi zoom dao động quanh ranh giới.
const COLLAPSE_THRESHOLD = 0.4;
const RESTORE_THRESHOLD = 0.45;
const LOW_DETAIL_NODE_THRESHOLD = 150;

// Component "âm thầm" (không render gì) sống bên trong <TransformWrapper> chỉ để theo dõi
// scale sống và báo lên component cha khi vượt qua ngưỡng thu gọn/khôi phục — tách riêng vì
// hook useTransformEffect chỉ dùng được bên trong context của TransformWrapper, trong khi
// FamilyTreePage (nơi giữ state thật) lại là nơi RENDER RA <TransformWrapper>, không phải con
// của nó.
function ZoomAutoCollapseWatcher({ onCollapseChange }) {
  const collapsedRef = useRef(false);
  useTransformEffect(({ state }) => {
    if (!collapsedRef.current && state.scale < COLLAPSE_THRESHOLD) {
      collapsedRef.current = true;
      onCollapseChange(true);
    } else if (collapsedRef.current && state.scale > RESTORE_THRESHOLD) {
      collapsedRef.current = false;
      onCollapseChange(false);
    }
  });
  return null;
}

function FamilyTreePage() {
  const navigate = useNavigate();
  const { familyData } = useContext(AppContext);
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [filterProvince, setFilterProvince] = useState('');
  const [chiList, setChiList] = useState([]);
  const [chiLoaded, setChiLoaded] = useState(false);
  const [expandedChiRootId, setExpandedChiRootId] = useState(null);
  const [manualOverrides, setManualOverrides] = useState(() => new Map());
  const [lowDetail, setLowDetail] = useState(false);
  const autoCollapseSnapshotRef = useRef(null);
  const transformRef = useRef(null);

  useEffect(() => {
    apiRequest('chi.php').then(setChiList).catch(() => {}).finally(() => setChiLoaded(true));
  }, []);

  // Popup toàn màn hình: khoá cuộn trang nền trong lúc mở, mở lại khi đóng.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prevOverflow; };
  }, []);

  const handleClose = useCallback(() => navigate('/'), [navigate]);

  // Escape: ưu tiên đóng modal hồ sơ thành viên nếu đang mở, chỉ đóng popup sơ đồ khi không
  // còn modal nào che phía trên. Đọc selectedMemberId qua ref (thay vì đóng biến trực tiếp)
  // để tránh gọi navigate() (chính nó lại kích hoạt render khác) từ BÊN TRONG updater của
  // setState — vi phạm quy tắc React và gây cảnh báo "Cannot update a component while
  // rendering a different component".
  const selectedMemberIdRef = useRef(null);
  useEffect(() => { selectedMemberIdRef.current = selectedMemberId; }, [selectedMemberId]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      if (selectedMemberIdRef.current) setSelectedMemberId(null);
      else handleClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [handleClose]);

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

  const layout = useMemo(() => computeTreeLayout(sortedGenerations, rowsMap), [sortedGenerations, rowsMap]);

  // Tự thu gọn cây khi zoom quá nhỏ để giảm số ô — lưu lại trạng thái mở/đóng đang có để khôi
  // phục đúng khi zoom lại lên (xem lưu ý trong tài liệu kế hoạch: nếu người dùng chủ động mở
  // rộng 1 nhánh NGAY TRONG lúc đang tự thu gọn, thao tác đó sẽ bị thay bằng trạng thái cũ khi
  // khôi phục — đánh đổi chấp nhận được ở quy mô cây hiện tại).
  const handleAutoCollapseChange = useCallback((collapsed) => {
    if (collapsed) {
      autoCollapseSnapshotRef.current = { expandedChiRootId, manualOverrides };
      setExpandedChiRootId(null);
      setManualOverrides(new Map());
    } else if (autoCollapseSnapshotRef.current) {
      const snap = autoCollapseSnapshotRef.current;
      autoCollapseSnapshotRef.current = null;
      setExpandedChiRootId(snap.expandedChiRootId);
      setManualOverrides(snap.manualOverrides);
    }
  }, [expandedChiRootId, manualOverrides]);

  const handleCollapseAll = useCallback(() => {
    autoCollapseSnapshotRef.current = null;
    setExpandedChiRootId(null);
    setManualOverrides(new Map());
  }, []);

  // Tự bật chế độ tối giản trên di động khi cây đang có nhiều ô (giảm hiệu ứng cho thiết bị
  // yếu) — người dùng vẫn có thể tự bật/tắt tay qua thanh công cụ bất kể điều kiện này.
  useEffect(() => {
    if (window.innerWidth < 768 && layout.nodesById.size > LOW_DETAIL_NODE_THRESHOLD) {
      setLowDetail(true);
    }
  }, [layout.nodesById.size]);

  // Ngưỡng nhỏ nhất cho "Vừa khung hình" — dưới mức này, chữ (đã khoá tối thiểu 12px qua
  // ZoomFloorText) sẽ tràn ra ngoài viền ô vì ô hình học co nhỏ hơn nhưng chữ thì không co
  // theo. Thà không lọt hết toàn bộ cây trong 1 khung hình (còn cuộn/pan tiếp được) còn hơn
  // là chữ đè lên nhau mất thẩm mỹ.
  const MIN_FIT_SCALE = 0.6;

  const handleFitToScreen = useCallback(() => {
    const ref = transformRef.current;
    const wrapper = ref?.instance?.wrapperComponent;
    if (!ref || !wrapper) return;
    const vw = wrapper.clientWidth;
    const vh = wrapper.clientHeight;
    const contentW = Math.max(layout.totalWidth + CARD_WIDTH, 1);
    const contentH = Math.max(layout.totalHeight, 1);
    const scale = Math.min(vw / contentW, vh / contentH) * 0.92;
    const clampedScale = Math.min(Math.max(scale, MIN_FIT_SCALE), 3);
    const posX = (vw - contentW * clampedScale) / 2;
    const posY = (vh - contentH * clampedScale) / 2;
    ref.setTransform(posX, posY, clampedScale, 300);
  }, [layout.totalWidth, layout.totalHeight]);

  const isReady = familyData && chiLoaded;
  const contentWidth = layout.totalWidth + CARD_WIDTH;

  return (
    <div className="tree-popup-overlay" role="dialog" aria-modal="true" aria-label="Sơ đồ gia phả toàn màn hình">
      <button className="tree-popup-close-btn" onClick={handleClose} aria-label="Đóng sơ đồ gia phả" title="Đóng (Esc)">
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2.4" fill="none" strokeLinecap="round"><path d="M5 5l14 14M19 5L5 19" /></svg>
      </button>

      <div className="tree-popup-header">
        <h2>Sơ Đồ Gia Phả - Dòng Họ Trần Đình</h2>
        <div className="tree-legend">
          <span><i className="star-badge-legend star-main">★</i> Đích tôn dòng họ</span>
          <span><i className="star-badge-legend star-chi">★</i> Đích tôn của chi</span>
          <span><i className="legend-swatch" /> Mỗi màu nền = 1 chi</span>
        </div>
      </div>

      {isReady ? (
        <TransformWrapper
          ref={transformRef}
          initialScale={1}
          minScale={0.15}
          maxScale={3}
          centerOnInit
          limitToBounds={false}
          doubleClick={{ mode: 'zoomIn', step: 0.7 }}
          wheel={{ step: 0.002 }}
          pinch={{ step: 5 }}
        >
          <ZoomAutoCollapseWatcher onCollapseChange={handleAutoCollapseChange} />
          <TreeAxis rowYById={layout.rowYById} />
          <TransformComponent wrapperClass="tree-transform-wrapper" contentClass="tree-transform-content">
            <div
              className="tree-content-canvas"
              style={{ width: contentWidth, height: layout.totalHeight }}
              role="tree"
              aria-label="Sơ đồ gia phả"
            >
              <TreeConnectorsSvg
                edges={edges}
                nodesById={layout.nodesById}
                rowYById={layout.rowYById}
                totalWidth={contentWidth}
                lowDetail={lowDetail}
              />
              {[...layout.nodesById.entries()].map(([id, pos]) => {
                const st = nodeState.get(id) || {};
                return (
                  <Virtualize key={id} x={pos.x} y={pos.y} width={CARD_WIDTH} height={CARD_HEIGHT} margin={250}>
                    <TreeNodeCard
                      node={pos.node}
                      x={pos.x}
                      y={pos.y}
                      onSelect={handleSelectNode}
                      filterProvince={filterProvince}
                      chiInfoMap={chiInfoMap}
                      isChiRoot={st.isChiRoot}
                      isExpanded={st.isExpanded}
                      hasChildren={st.hasChildren}
                      onToggleChiRoot={handleToggleChiRoot}
                      onToggleNode={handleToggleNode}
                      lowDetail={lowDetail}
                    />
                  </Virtualize>
                );
              })}
            </div>
          </TransformComponent>
          <TreeToolbar
            onFitToScreen={handleFitToScreen}
            onCollapseAll={handleCollapseAll}
            lowDetail={lowDetail}
            onToggleLowDetail={() => setLowDetail(v => !v)}
            provinceOptions={provinceOptions}
            filterProvince={filterProvince}
            onFilterChange={setFilterProvince}
          />
        </TransformWrapper>
      ) : (
        <p className="tree-popup-loading">{familyData ? 'Đang tải dữ liệu chi...' : 'Không có dữ liệu'}</p>
      )}

      <style>{`
        .tree-popup-overlay {
          position: fixed;
          inset: 0;
          z-index: 1500;
          background: var(--bg-color);
          display: flex;
          flex-direction: column;
          padding: 14px 20px 10px;
        }

        .tree-popup-close-btn {
          position: absolute;
          top: 16px;
          right: 20px;
          z-index: 20;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 1px solid var(--border-color);
          background: var(--surface-color);
          color: var(--text-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: var(--shadow-md);
          transition: background-color var(--transition-fast), transform var(--transition-micro);
        }

        .tree-popup-close-btn:hover {
          background: var(--color-sand);
        }

        .tree-popup-close-btn:active {
          transform: scale(0.94);
        }

        .tree-popup-header {
          text-align: center;
          margin-bottom: 10px;
          padding-right: 50px;
        }

        .tree-popup-header h2 {
          margin-bottom: 5px;
        }

        .tree-popup-loading {
          margin: auto;
          color: var(--text-secondary);
        }

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

        /* react-zoom-pan-pinch tự đặt wrapper/content về "fit-content" — phải ép lại để wrapper
           lấp đầy phần không gian còn lại của popup (bên dưới tiêu đề, bên trong lề trục trái). */
        .tree-transform-wrapper {
          flex: 1;
          width: 100% !important;
          height: 100% !important;
          background: var(--surface-color);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-sm);
          margin-left: 52px;
        }

        .tree-content-canvas {
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

        /* Trục "Các đời" cố định bên trái, không nằm trong vùng bị pan/zoom. */
        .tree-axis {
          position: absolute;
          left: 20px;
          top: 74px;
          bottom: 10px;
          width: 46px;
          overflow: hidden;
          pointer-events: none;
          z-index: 15;
        }

        .tree-axis-label {
          position: absolute;
          left: 0;
          right: 0;
          transform: translateY(-50%);
          font-size: 0.7rem;
          font-weight: 600;
          color: var(--text-secondary);
          white-space: nowrap;
          background: var(--surface-color);
          padding: 2px 6px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-color);
          text-align: center;
        }

        .tree-axis-short { display: none; }

        .tree-node {
          background: var(--surface-color);
          border: 2px solid;
          border-radius: var(--radius-sm);
          padding: 8px 6px;
          display: flex;
          flex-direction: column;
          align-items: center;
          box-shadow: var(--shadow-sm);
          transition: box-shadow var(--transition-normal), background-color var(--transition-normal);
        }

        .tree-node-low-detail {
          border-radius: 3px;
          box-shadow: none;
          transition: none;
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
          font-size: 12px;
          font-weight: 400;
          letter-spacing: 0.01em;
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

        /* Thanh công cụ: mặc định 1 thanh ngang phía trên khung, chuyển thành thanh nổi dưới
           cùng trên di động (<768px). */
        .tree-toolbar {
          position: absolute;
          top: 10px;
          left: 62px;
          right: 10px;
          z-index: 15;
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
          background: var(--surface-color);
          padding: 8px 12px;
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-sm);
        }

        .tree-toolbar-group {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .tree-toolbar-zoom-input {
          font-weight: bold;
          width: 46px;
          text-align: center;
          font-size: 0.85rem;
          font-family: inherit;
          color: var(--text-primary);
          background: var(--color-sand);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          padding: 6px 2px;
        }

        .tree-toolbar-zoom-input:focus {
          outline: none;
          border-color: var(--accent-teal);
          background: var(--surface-color);
        }

        .tree-toolbar-filter {
          padding: 6px 10px;
        }

        .tree-toolbar-list-link {
          margin-left: auto;
          font-size: 0.82rem;
          color: var(--accent-teal);
          font-weight: 600;
          white-space: nowrap;
        }

        .btn-icon {
          background: var(--color-sand);
          color: var(--primary-color);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background-color var(--transition-fast), transform var(--transition-micro);
          flex-shrink: 0;
        }

        .btn-icon:hover {
          background: var(--accent-teal-light);
          color: white;
        }

        .btn-icon:active {
          transform: scale(0.94);
        }

        .btn-icon-active {
          background: var(--accent-teal);
          color: white;
        }

        @media (max-width: 768px) {
          .tree-popup-overlay {
            padding: 10px 10px 6px;
          }

          .tree-popup-header {
            padding-right: 46px;
          }

          .tree-popup-header h2 {
            font-size: 1.1rem;
          }

          .tree-legend {
            gap: 10px;
            font-size: 0.75rem;
          }

          .tree-transform-wrapper {
            margin-left: 40px;
          }

          .tree-axis {
            left: 10px;
            width: 30px;
            top: 10px;
          }

          .tree-axis-label {
            font-size: 0.62rem;
            padding: 2px 3px;
          }

          .tree-axis-full { display: none; }
          .tree-axis-short { display: inline; }

          .node-name-vertical span {
            font-size: 11px;
          }

          /* Thanh công cụ chuyển xuống dạng nổi ở cạnh dưới trên di động. */
          .tree-toolbar {
            top: auto;
            left: 10px;
            right: 10px;
            bottom: 10px;
            justify-content: center;
          }

          .tree-toolbar-list-link {
            margin-left: 0;
            order: 10;
            flex-basis: 100%;
            text-align: center;
          }
        }
      `}</style>

      <MemberProfileModal member={selectedMember} onClose={() => setSelectedMemberId(null)} onSelectMember={setSelectedMemberId} />
    </div>
  );
}

export default FamilyTreePage;
