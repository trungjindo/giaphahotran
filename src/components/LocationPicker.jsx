import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import AddressAutocomplete from './AddressAutocomplete';

const VIETNAM_CENTER = [16.0, 106.0];
const VIETNAM_ZOOM = 5.5;

const pickerIcon = L.divIcon({
  className: 'tomb-marker-icon',
  html: `<svg width="30" height="39" viewBox="0 0 34 44" xmlns="http://www.w3.org/2000/svg">
    <path d="M17 0C7.6 0 0 7.6 0 17c0 12 17 27 17 27s17-15 17-27C34 7.6 26.4 0 17 0z" fill="#0E6FA8" stroke="#F2C46A" stroke-width="1.5"/>
    <circle cx="17" cy="17" r="6" fill="#F5E9D6"/>
  </svg>`,
  iconSize: [30, 39],
  iconAnchor: [15, 39],
});

// Bấm vào bản đồ (hoặc kéo ghim) để đặt tọa độ, thay vì phải tự gõ số.
const CoordinatePicker = ({ position, onPick }) => {
  useMapEvents({ click(e) { onPick(e.latlng.lat, e.latlng.lng); } });

  return position ? (
    <Marker
      position={position}
      icon={pickerIcon}
      draggable
      eventHandlers={{ dragend: (e) => { const p = e.target.getLatLng(); onPick(p.lat, p.lng); } }}
    />
  ) : null;
};

// MapContainer chỉ đọc center/zoom lúc khởi tạo, nên phải gọi map.flyTo() theo cách này
// mới di chuyển được bản đồ sau khi đã mount (khi chọn 1 địa chỉ từ ô tìm kiếm).
const MapFlyTo = ({ target }) => {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], 17, { duration: 1 });
  }, [target, map]);
  return null;
};

// Chọn vị trí trên bản đồ: gõ địa chỉ để bay tới nơi cần, rồi bấm/kéo ghim cho thật chính xác.
// Dùng chung cho cả "mộ riêng lẻ" và "lăng" nên hai nơi luôn hoạt động giống hệt nhau.
//
// onChange nhận { lat, lng, address } — address CHỈ có khi người dùng chọn từ ô tìm địa chỉ
// (bấm thẳng lên bản đồ thì không có tên địa chỉ, và cũng không nên ghi đè địa chỉ đang có).
const LocationPicker = ({
  latitude,
  longitude,
  onChange,
  onClear,
  flyTarget,
  onFlyTargetChange,
  searchPlaceholder = 'Gõ địa chỉ để tìm nhanh trên bản đồ...',
  addressInitialValue = '',
  height = 320,
}) => {
  const hasCoords = latitude !== '' && longitude !== ''
    && latitude !== null && longitude !== null
    && !isNaN(Number(latitude)) && !isNaN(Number(longitude));
  const position = hasCoords ? [Number(latitude), Number(longitude)] : null;

  const pick = (lat, lng) => onChange({ lat: lat.toFixed(6), lng: lng.toFixed(6) });

  const handleAddressSelect = ({ lat, lng, label }) => {
    onChange({ lat: lat.toFixed(6), lng: lng.toFixed(6), address: label });
    onFlyTargetChange?.({ lat, lng });
  };

  return (
    <div className="location-picker">
      <AddressAutocomplete
        onSelect={handleAddressSelect}
        placeholder={searchPlaceholder}
        initialValue={addressInitialValue}
      />

      <div className="location-picker-hint">
        Bấm vào bản đồ để đặt ghim, kéo ghim để chỉnh cho chính xác.
      </div>

      <div className="location-picker-map" style={{ height: typeof height === 'number' ? `${height}px` : height }}>
        <MapContainer
          center={position || VIETNAM_CENTER}
          zoom={position ? 17 : VIETNAM_ZOOM}
          scrollWheelZoom
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <CoordinatePicker position={position} onPick={pick} />
          <MapFlyTo target={flyTarget} />
        </MapContainer>
      </div>

      <div className="location-picker-coords">
        {hasCoords ? (
          <>
            <span className="location-picker-badge">
              Đã ghim: {Number(latitude).toFixed(6)}, {Number(longitude).toFixed(6)}
            </span>
            {onClear && (
              <button type="button" className="location-picker-clear" onClick={onClear}>Xóa ghim</button>
            )}
          </>
        ) : (
          <span className="location-picker-badge is-empty">Chưa ghim vị trí nào</span>
        )}
      </div>

      <div className="location-picker-manual">
        <label>
          Vĩ độ (Latitude)
          <input
            type="number" step="any" className="input-control"
            value={latitude}
            onChange={e => onChange({ lat: e.target.value, lng: longitude })}
            placeholder="VD: 20.4388"
          />
        </label>
        <label>
          Kinh độ (Longitude)
          <input
            type="number" step="any" className="input-control"
            value={longitude}
            onChange={e => onChange({ lat: latitude, lng: e.target.value })}
            placeholder="VD: 106.1621"
          />
        </label>
      </div>
    </div>
  );
};

export default LocationPicker;
