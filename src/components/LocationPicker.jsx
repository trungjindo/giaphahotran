import React, { useEffect, useState } from 'react';
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

// Leaflet đo kích thước khung bản đồ ĐÚNG MỘT LẦN lúc mount. Nếu lúc đó khung chưa có kích
// thước thật (form vừa hiện ra, tab vừa đổi, khung co giãn theo cửa sổ...) thì nó tính ra sai
// và chỉ tải đúng 1 ô bản đồ ở góc — phần còn lại là một mảng XÁM trống trơn.
//
// invalidateSize() bắt Leaflet đo lại. Ở đây dùng 2 lớp bảo vệ vì mỗi lớp hụt một kiểu:
//   - ResizeObserver: đúng công cụ cho việc này, nhưng không phải môi trường nào cũng chạy
//     (một số WebView/trình duyệt nhúng vô hiệu hóa nó).
//   - Vòng kiểm tra định kỳ: so kích thước Leaflet ĐANG NGHĨ với kích thước thật của khung,
//     lệch thì đo lại. Tự dừng ngay khi khớp, và có hạn chót để không chạy mãi.
const SETTLE_INTERVAL_MS = 300;
const SETTLE_TIMEOUT_MS = 20000;

const MapAutoSize = () => {
  const map = useMap();
  useEffect(() => {
    const el = map.getContainer();
    const fix = () => map.invalidateSize();

    fix();
    const raf = requestAnimationFrame(fix);

    let ro = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(fix);
      ro.observe(el);
    }

    const startedAt = Date.now();
    const timer = setInterval(() => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      const size = map.getSize();
      if (w > 0 && h > 0 && size.x === w && size.y === h) {
        clearInterval(timer); // đã khớp — không cần canh nữa
        return;
      }
      if (Date.now() - startedAt > SETTLE_TIMEOUT_MS) {
        clearInterval(timer); // bỏ cuộc, nhường lại cho ResizeObserver
        return;
      }
      fix();
    }, SETTLE_INTERVAL_MS);

    return () => {
      cancelAnimationFrame(raf);
      clearInterval(timer);
      ro?.disconnect();
    };
  }, [map]);
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

  const [foundLabel, setFoundLabel] = useState('');
  // Đếm số ô bản đồ tải hỏng. Khi máy chủ nền bản đồ (OpenStreetMap) không truy cập được,
  // Leaflet chỉ hiện một mảng xám trống — không có thông báo gì, rất khó đoán là lỗi mạng
  // hay lỗi phần mềm. Đếm đủ vài ô hỏng thì nói rõ ra, đồng thời trấn an rằng việc ghim và
  // lưu tọa độ vẫn hoạt động bình thường.
  const [tileErrors, setTileErrors] = useState(0);

  const pick = (lat, lng) => {
    setFoundLabel(''); // tự bấm/kéo ghim thì không còn gắn với địa chỉ đã tìm nữa
    onChange({ lat: lat.toFixed(6), lng: lng.toFixed(6) });
  };

  const handleAddressSelect = ({ lat, lng, label }) => {
    setFoundLabel(label);
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
        Gõ địa chỉ rồi bấm <strong>Enter</strong> (hoặc nút kính lúp) để bản đồ bay tới và đánh dấu ngay.
        Sau đó bấm vào bản đồ để đặt lại ghim, kéo ghim để chỉnh cho thật chính xác.
      </div>

      {foundLabel && (
        <div className="location-picker-found">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          <span>Đã đánh dấu trên bản đồ: <strong>{foundLabel}</strong></span>
        </div>
      )}

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
            eventHandlers={{ tileerror: () => setTileErrors(n => n + 1) }}
          />
          <CoordinatePicker position={position} onPick={pick} />
          <MapFlyTo target={flyTarget} />
          <MapAutoSize />
        </MapContainer>
      </div>

      {tileErrors >= 3 && (
        <div className="location-picker-tilewarn">
          Không tải được nền bản đồ từ máy chủ OpenStreetMap (thường do mạng hoặc bị chặn).
          Bản đồ hiện ra xám là vì vậy — <strong>việc đặt ghim và lưu tọa độ vẫn hoạt động bình thường</strong>.
        </div>
      )}

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
