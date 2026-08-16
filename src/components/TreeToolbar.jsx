import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useControls, useTransformEffect } from 'react-zoom-pan-pinch';

// Thanh công cụ của popup sơ đồ gia phả — tự đọc scale sống để hiện %, tự gọi useControls()
// cho zoom in/out/reset (vì đã là con của <TransformWrapper> nên có quyền truy cập context).
// Các hành động còn lại (fit-to-screen, thu gọn tất cả, chế độ tối giản, đóng, lọc khu vực)
// nhận qua props vì cần dữ liệu/refs chỉ trang cha mới có.
function TreeToolbar({ onFitToScreen, onCollapseAll, lowDetail, onToggleLowDetail, provinceOptions, filterProvince, onFilterChange }) {
  const { zoomIn, zoomOut, resetTransform } = useControls();
  const [scalePercent, setScalePercent] = useState(100);

  useTransformEffect(({ state }) => {
    setScalePercent(Math.round(state.scale * 100));
  });

  return (
    <div className="tree-toolbar">
      <div className="tree-toolbar-group">
        <button className="btn-icon" onClick={() => zoomOut()} aria-label="Thu nhỏ" title="Thu nhỏ">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round"><path d="M5 12h14" /></svg>
        </button>
        <span className="tree-toolbar-zoom-pct">{scalePercent}%</span>
        <button className="btn-icon" onClick={() => zoomIn()} aria-label="Phóng to" title="Phóng to">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
        </button>
        <button className="btn-icon" onClick={() => resetTransform()} aria-label="Về 100%" title="Về 100%">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 1 3 6.7" /><path d="M3 20v-6h6" /></svg>
        </button>
        <button className="btn-icon" onClick={onFitToScreen} aria-label="Vừa khung hình" title="Vừa khung hình">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" /></svg>
        </button>
      </div>

      <div className="tree-toolbar-group">
        <button className="btn-icon" onClick={onCollapseAll} aria-label="Thu gọn tất cả" title="Thu gọn tất cả về mặc định">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7" /></svg>
        </button>
        <button
          className={`btn-icon${lowDetail ? ' btn-icon-active' : ''}`}
          onClick={onToggleLowDetail}
          aria-pressed={lowDetail}
          aria-label="Chế độ tối giản"
          title="Chế độ tối giản (giảm hiệu ứng, phù hợp thiết bị yếu)"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></svg>
        </button>
      </div>

      {provinceOptions.length > 0 && (
        <select
          className="select-control tree-toolbar-filter"
          value={filterProvince}
          onChange={e => onFilterChange(e.target.value)}
          aria-label="Lọc theo khu vực"
        >
          <option value="">Lọc theo khu vực...</option>
          {provinceOptions.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      )}

      <Link to="/danh-sach" className="tree-toolbar-list-link" title="Xem dạng danh sách (phù hợp trình đọc màn hình)">
        Xem dạng danh sách
      </Link>
    </div>
  );
}

export default TreeToolbar;
