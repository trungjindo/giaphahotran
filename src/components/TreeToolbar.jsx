import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useControls, useTransformEffect } from 'react-zoom-pan-pinch';

// Thanh công cụ của popup sơ đồ gia phả — tự đọc scale sống để hiện %, tự gọi useControls()
// cho zoom in/out/reset (vì đã là con của <TransformWrapper> nên có quyền truy cập context).
// Các hành động còn lại (fit-to-screen, thu gọn tất cả, chế độ tối giản, đóng, lọc khu vực)
// nhận qua props vì cần dữ liệu/refs chỉ trang cha mới có.
function TreeToolbar({ onFitToScreen, onCollapseAll, lowDetail, onToggleLowDetail, provinceOptions, filterProvince, onFilterChange, chiOptions = [], chiFilterId, onChiFilterChange, isFocusMode }) {
  const { zoomIn, zoomOut, resetTransform, instance } = useControls();
  const [scalePercent, setScalePercent] = useState(100);
  const [draftPercent, setDraftPercent] = useState(null);

  useTransformEffect(({ state }) => {
    setScalePercent(Math.round(state.scale * 100));
  });

  // Cho phép gõ trực tiếp % để zoom tới đúng mức mong muốn — quy đổi thành step tương đối
  // rồi gọi zoomIn/zoomOut (zoom quanh tâm khung nhìn hiện tại, không nhảy trọng tâm) thay vì
  // setTransform trực tiếp (sẽ đổi cả vị trí neo về góc (0,0) của nội dung).
  const applyDraftPercent = (raw) => {
    setDraftPercent(null);
    const parsed = parseInt(raw, 10);
    if (!Number.isFinite(parsed)) return;
    const minPct = Math.round((instance.setup.minScale || 0.15) * 100);
    const maxPct = Math.round((instance.setup.maxScale || 3) * 100);
    const targetScale = Math.min(Math.max(parsed, minPct), maxPct) / 100;
    const currentScale = instance.state.scale;
    if (targetScale > currentScale) zoomIn(Math.log(targetScale / currentScale), 200);
    else if (targetScale < currentScale) zoomOut(Math.log(currentScale / targetScale), 200);
  };

  return (
    <div className="tree-toolbar">
      <div className="tree-toolbar-group">
        <button className="btn-icon" onClick={() => zoomOut()} aria-label="Thu nhỏ" title="Thu nhỏ">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round"><path d="M5 12h14" /></svg>
        </button>
        <input
          className="tree-toolbar-zoom-input"
          type="text"
          inputMode="numeric"
          value={draftPercent !== null ? draftPercent : `${scalePercent}%`}
          aria-label="Nhập phần trăm zoom"
          title="Nhập % để zoom tới đúng mức mong muốn"
          onFocus={(e) => { setDraftPercent(String(scalePercent)); e.target.select(); }}
          onChange={(e) => setDraftPercent(e.target.value.replace(/[^0-9]/g, ''))}
          onBlur={(e) => applyDraftPercent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
            else if (e.key === 'Escape') { setDraftPercent(null); e.currentTarget.blur(); }
          }}
        />
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

      {/* Đang xem sơ đồ riêng của 1 người thì ẩn ô lọc chi — 2 chế độ lọc loại trừ nhau, để cả
          hai cùng lúc chỉ gây hiểu nhầm là chúng cộng dồn được. */}
      {!isFocusMode && chiOptions.length > 0 && (
        <select
          className="select-control tree-toolbar-filter"
          value={chiFilterId || ''}
          onChange={e => onChiFilterChange(e.target.value)}
          aria-label="Lọc theo chi"
          title="Chỉ hiển thị 1 chi: từ Thủy tổ xuống tới gốc chi và toàn bộ chi đó"
        >
          <option value="">Lọc theo chi...</option>
          {chiOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      )}

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
