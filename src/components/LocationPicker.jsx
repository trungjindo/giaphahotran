import React, { useCallback, useEffect, useRef, useState } from 'react';
import AddressAutocomplete from './AddressAutocomplete';
import GoogleMapCanvas from './GoogleMapCanvas';
import { VIETNAM_CENTER, VIETNAM_ZOOM, svgMarkerIcon } from '../utils/googleMaps';

const PICKER_PIN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="44" viewBox="0 0 34 44">
  <path d="M17 0C7.6 0 0 7.6 0 17c0 12 17 27 17 27s17-15 17-27C34 7.6 26.4 0 17 0z" fill="#0E6FA8" stroke="#F2C46A" stroke-width="1.5"/>
  <circle cx="17" cy="17" r="6" fill="#F5E9D6"/>
</svg>`;

// Chọn vị trí trên bản đồ: gõ địa chỉ để bay tới nơi cần, rồi bấm/kéo ghim cho thật chính xác.
// Dùng chung cho mộ riêng lẻ, lăng, và tài sản dòng họ nên mọi nơi hoạt động giống hệt nhau.
//
// onChange nhận { lat, lng, address } — address CHỈ có khi người dùng chọn từ ô tìm địa chỉ
// (bấm thẳng lên bản đồ thì không có tên địa chỉ, và cũng không nên ghi đè địa chỉ đang có).
const LocationPicker = ({
  latitude,
  longitude,
  onChange,
  onClear,
  searchPlaceholder = 'Gõ địa chỉ để tìm nhanh trên bản đồ...',
  addressInitialValue = '',
  height = 320,
}) => {
  const hasCoords = latitude !== '' && longitude !== ''
    && latitude !== null && longitude !== null
    && !isNaN(Number(latitude)) && !isNaN(Number(longitude));

  const mapRef = useRef(null);
  const mapsRef = useRef(null);
  const markerRef = useRef(null);
  const [foundLabel, setFoundLabel] = useState('');

  // Giữ onChange trong ref: trình xử lý bấm bản đồ chỉ gắn MỘT lần lúc bản đồ sẵn sàng,
  // nếu đóng gói thẳng onChange vào đó thì nó sẽ mãi dùng bản cũ của lần render đầu.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const setPin = useCallback((lat, lng, address) => {
    onChangeRef.current({ lat: lat.toFixed(6), lng: lng.toFixed(6), ...(address ? { address } : {}) });
  }, []);

  const handleMapReady = useCallback((map, maps) => {
    mapRef.current = map;
    mapsRef.current = maps;

    map.addListener('click', (e) => {
      setFoundLabel(''); // tự bấm chọn thì không còn gắn với địa chỉ đã tìm nữa
      setPin(e.latLng.lat(), e.latLng.lng());
    });
  }, [setPin]);

  // Đồng bộ ghim theo tọa độ đang giữ ở component cha (bấm bản đồ, nhập tay, hoặc mở form Sửa).
  useEffect(() => {
    const map = mapRef.current;
    const maps = mapsRef.current;
    if (!map || !maps) return;

    if (!hasCoords) {
      markerRef.current?.setMap(null);
      markerRef.current = null;
      return;
    }

    const position = { lat: Number(latitude), lng: Number(longitude) };
    if (!markerRef.current) {
      markerRef.current = new maps.Marker({
        map,
        position,
        draggable: true,
        icon: svgMarkerIcon(maps, PICKER_PIN_SVG, { width: 34, height: 44, anchorX: 17, anchorY: 44 }),
      });
      markerRef.current.addListener('dragend', (e) => {
        setFoundLabel('');
        setPin(e.latLng.lat(), e.latLng.lng());
      });
    } else {
      markerRef.current.setPosition(position);
    }
  }, [latitude, longitude, hasCoords, setPin]);

  // Chọn một địa chỉ từ ô tìm kiếm: đặt ghim và đưa bản đồ tới đó.
  const handleAddressSelect = ({ lat, lng, label }) => {
    setFoundLabel(label);
    setPin(lat, lng, label);
    const map = mapRef.current;
    if (map) {
      map.panTo({ lat, lng });
      map.setZoom(17);
    }
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

      <GoogleMapCanvas
        className="location-picker-map"
        style={{ height: typeof height === 'number' ? `${height}px` : height }}
        options={{
          center: hasCoords ? { lat: Number(latitude), lng: Number(longitude) } : VIETNAM_CENTER,
          zoom: hasCoords ? 17 : VIETNAM_ZOOM,
        }}
        onMapReady={handleMapReady}
      />

      <div className="location-picker-coords">
        {hasCoords ? (
          <>
            <span className="location-picker-badge">
              Đã ghim: {Number(latitude).toFixed(6)}, {Number(longitude).toFixed(6)}
            </span>
            {onClear && (
              <button type="button" className="location-picker-clear" onClick={() => { setFoundLabel(''); onClear(); }}>
                Xóa ghim
              </button>
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
