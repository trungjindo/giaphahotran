import React, { useMemo } from 'react';
import { CARD_WIDTH, CARD_HEIGHT, ROW_HEIGHT } from '../utils/treeLayout';

// Vẽ đường nối cha-con + đường phân cách đời bằng 1 lớp SVG duy nhất, toạ độ lấy thẳng từ
// bước tính layout (nodesById) — không còn cần đo DOM (offsetTop/ResizeObserver) như bản cũ,
// vì giờ vị trí mỗi ô đã biết trước khi render. Luôn vẽ đủ mọi cạnh/đường (không lọc theo
// khung nhìn) — ở quy mô vài trăm thành viên, vài trăm <path>/<line> không đáng kể về hiệu
// năng, trong khi phần nặng thực sự (số lượng ô DOM) đã được <Virtualize> xử lý riêng.
function TreeConnectorsSvg({ edges, nodesById, rowYById, totalWidth, lowDetail }) {
  const { paths, dividers } = useMemo(() => {
    const paths = [];
    edges.forEach(({ parentId, childId }) => {
      const p = nodesById.get(parentId);
      const c = nodesById.get(childId);
      if (!p || !c) return;
      const parentX = p.x + CARD_WIDTH / 2;
      const parentY = p.y + CARD_HEIGHT;
      const childX = c.x + CARD_WIDTH / 2;
      const childY = c.y;
      const color = c.node.isMainLineage ? '#0E6FA8' : '#A9BAC4';
      const width = c.node.isMainLineage ? 2.5 : 1.5;
      let d;
      if (lowDetail) {
        d = `M ${parentX} ${parentY} L ${childX} ${childY}`;
      } else {
        const midY = (parentY + childY) / 2;
        d = `M ${parentX} ${parentY} L ${parentX} ${midY} L ${childX} ${midY} L ${childX} ${childY}`;
      }
      paths.push({ key: `${parentId}-${childId}`, d, color, width });
    });

    const dividers = [];
    rowYById.forEach((y) => {
      if (y === 0) return; // mép trên cùng không cần đường kẻ
      dividers.push(y);
    });

    return { paths, dividers };
  }, [edges, nodesById, rowYById, lowDetail]);

  const totalHeight = rowYById.size * ROW_HEIGHT;

  return (
    <svg
      className="tree-connectors-svg"
      width={totalWidth}
      height={totalHeight}
      aria-hidden="true"
    >
      {dividers.map(y => (
        <line
          key={`div-${y}`}
          x1={0} y1={y} x2={totalWidth} y2={y}
          stroke="rgba(0,0,0,0.08)"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {paths.map(p => (
        <path key={p.key} d={p.d} stroke={p.color} strokeWidth={p.width} fill="none" strokeLinecap="round" />
      ))}
    </svg>
  );
}

export default TreeConnectorsSvg;
