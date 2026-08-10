import React from 'react';

// Icon mở Google Maps cạnh 1 trường địa chỉ. Ưu tiên tọa độ GPS nếu có, không thì
// tìm theo chuỗi địa chỉ. Không render gì nếu không có dữ liệu để mở bản đồ.
const MapLinkButton = ({ address, lat, lng, className = '' }) => {
  const hasCoords = typeof lat === 'number' && typeof lng === 'number' && !Number.isNaN(lat) && !Number.isNaN(lng);
  const hasAddress = !!(address && address.trim());
  if (!hasCoords && !hasAddress) return null;

  const url = hasCoords
    ? `https://www.google.com/maps?q=${lat},${lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.trim())}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`map-link-btn ${className}`}
      aria-label={hasCoords ? `Mở bản đồ tại tọa độ ${lat}, ${lng}` : `Mở bản đồ cho địa chỉ ${address}`}
      title="Xem trên Google Maps"
    >
      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 6-9 13-9 13s-9-7-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    </a>
  );
};

export default MapLinkButton;
