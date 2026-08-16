import React, { useMemo, useRef, useState } from 'react';
import { useTransformEffect, KeepScale } from 'react-zoom-pan-pinch';
import { CARD_WIDTH } from '../utils/treeLayout';

// Tên rút gọn hiển thị trong ô: bỏ họ chung "Trần" (lặp lại ở mọi thành viên, không cần
// thiết), giữ lại các chữ còn lại để xếp theo hàng dọc, mỗi chữ 1 dòng.
const getShortNameWords = (name) => {
  if (!name) return [''];
  const parts = name.trim().split(/\s+/);
  if (parts.length > 1 && parts[0] === 'Trần') return parts.slice(1);
  return parts;
};

// Khi scale < 1 (đã zoom nhỏ hơn cỡ gốc), khoá chữ về đúng kích thước CSS gốc (bằng đúng
// ngưỡng đọc tối thiểu — xem .node-name-vertical span font-size) bất kể khung đang bị scale
// nhỏ tới đâu, dùng <KeepScale> có sẵn của thư viện — chỉ counter-scale khi zoom NHỎ hơn gốc,
// còn zoom LỚN hơn gốc thì để chữ tự phóng to bình thường theo transform như mọi phần tử khác.
// Chỉ render lại khi ranh giới scale=1 thực sự bị vượt qua (không phải mỗi khung hình pan/zoom).
function ZoomFloorText({ children }) {
  const [belowNative, setBelowNative] = useState(false);
  const belowRef = useRef(false);
  useTransformEffect(({ state }) => {
    const isBelow = state.scale < 1;
    if (isBelow !== belowRef.current) {
      belowRef.current = isBelow;
      setBelowNative(isBelow);
    }
  });
  return belowNative ? <KeepScale>{children}</KeepScale> : <>{children}</>;
}

const TreeNodeCard = ({ node, x, y, onSelect, filterProvince, chiInfoMap, isChiRoot, isExpanded, hasChildren, onToggleChiRoot, onToggleNode, lowDetail }) => {
  const isMain = node.isMainLineage;
  const isFilterMatch = !!filterProvince && node.currentProvince === filterProvince;
  const chiInfo = chiInfoMap[node.id] || null;

  // Cấp độ nổi bật: 'main' = đích tôn của cả dòng họ (sao đỏ), 'chi' = đích tôn riêng của 1
  // chi (sao vàng theo màu chi đó), 'normal' = các nhánh còn lại (không có sao).
  const lineTier = !isMain ? 'normal' : (chiInfo ? 'chi' : 'main');
  const borderColor = chiInfo ? chiInfo.line : (isMain ? 'var(--primary-color)' : 'var(--border-color)');
  const nameWords = useMemo(() => getShortNameWords(node.name), [node.name]);

  const handleToggle = (e) => {
    e.stopPropagation();
    if (isChiRoot) onToggleChiRoot(node.id);
    else onToggleNode(node);
  };

  const stateLabel = !hasChildren ? '' : isExpanded ? ', đã mở rộng' : ', đã thu gọn';

  return (
    <div
      className={`tree-node${lowDetail ? ' tree-node-low-detail' : ''}`}
      data-node-id={node.id}
      role="treeitem"
      aria-label={`${node.name}, đời ${node.generation}${stateLabel}`}
      aria-expanded={hasChildren ? isExpanded : undefined}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: CARD_WIDTH,
        borderColor: isFilterMatch ? 'var(--secondary-color)' : borderColor,
        background: chiInfo ? chiInfo.bg : undefined,
        boxShadow: isFilterMatch ? '0 0 0 3px rgba(242,196,106,0.4)' : undefined,
        opacity: filterProvince && !isFilterMatch ? 0.4 : 1,
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
          <ZoomFloorText>
            {nameWords.map((w, i) => <span key={i}>{w}</span>)}
          </ZoomFloorText>
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

export default TreeNodeCard;
