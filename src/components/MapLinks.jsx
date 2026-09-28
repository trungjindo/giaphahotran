import React from 'react';
import { googleMapsViewUrl, googleMapsDirectionsUrl, formatCoords } from '../utils/mapLinks';

// Hai nút mở sang ứng dụng Google Maps, dùng chung cho mọi ghim (mộ, lăng, tài sản).
//
// Bản đồ nhúng trong web chỉ để XEM và ghim vị trí. Khi con cháu cần ĐI TỚI TẬN NƠI thì
// bấm vào đây để chuyển sang ứng dụng Google Maps trên máy mình — nơi có chỉ đường theo
// thời gian thực và cảnh báo giao thông.
//
// Hai liên kết này KHÔNG dùng khóa API và không tính vào hạn mức, vì chúng chỉ là địa chỉ
// web thông thường — khác hẳn với bản đồ nhúng ở trên.
const MapLinks = ({ lat, lng, showCoords = false, compact = false }) => {
  if (lat == null || lng == null) return null;

  return (
    <div className={`map-links${compact ? ' is-compact' : ''}`}>
      <a
        href={googleMapsDirectionsUrl(lat, lng)}
        target="_blank"
        rel="noopener noreferrer"
        className="tomb-directions-btn"
      >
        <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polygon points="3 11 22 2 13 21 11 13 3 11" />
        </svg>
        Dẫn đường
      </a>

      <a
        href={googleMapsViewUrl(lat, lng)}
        target="_blank"
        rel="noopener noreferrer"
        className="map-open-btn"
        title="Mở vị trí này trong ứng dụng Google Maps"
      >
        <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11z" />
          <circle cx="12" cy="10" r="2.6" />
        </svg>
        Mở Google Maps
      </a>

      {showCoords && (
        <span className="map-links-coords" title="Tọa độ GPS — có thể sao chép rồi dán vào Google Maps">
          {formatCoords(lat, lng)}
        </span>
      )}
    </div>
  );
};

export default MapLinks;
