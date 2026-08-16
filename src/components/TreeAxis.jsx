import React, { useState } from 'react';
import { useTransformEffect } from 'react-zoom-pan-pinch';
import { CARD_HEIGHT } from '../utils/treeLayout';

// Trục "Các đời" cố định ở mép trái, KHÔNG nằm trong vùng bị pan/zoom (không phải con của
// <TransformComponent>) nhưng vẫn là con React của <TransformWrapper> nên đọc được trạng thái
// scale/positionY sống qua useTransformEffect — nhờ đó vị trí từng nhãn "Đời N" luôn khớp
// đúng hàng tương ứng trên sơ đồ dù đang pan/zoom ở bất kỳ mức nào.
function TreeAxis({ rowYById }) {
  const [transform, setTransform] = useState({ scale: 1, positionY: 0 });

  useTransformEffect(({ state }) => {
    setTransform({ scale: state.scale, positionY: state.positionY });
  });

  const rows = [...rowYById.entries()]; // [generation, y]

  return (
    <div className="tree-axis" aria-hidden="true">
      {rows.map(([gen, y]) => {
        const top = y * transform.scale + transform.positionY + (CARD_HEIGHT * transform.scale) / 2;
        return (
          <div key={gen} className="tree-axis-label" style={{ top }}>
            <span className="tree-axis-full">Đời {gen}</span>
            <span className="tree-axis-short">{gen}</span>
          </div>
        );
      })}
    </div>
  );
}

export default TreeAxis;
