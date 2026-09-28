import React, { useEffect, useRef, useState } from 'react';
import {
  loadGoogleMaps, hasGoogleMapsKey, BASE_MAP_OPTIONS,
  GOOGLE_MAPS_KEY_MISSING, GOOGLE_MAPS_AUTH_FAILED, onGoogleMapsAuthFailure,
} from '../utils/googleMaps';

// Rộng rãi để mạng chậm không bị báo nhầm là hỏng.
const MAP_READY_TIMEOUT_MS = 15000;

const GOOGLE_MAPS_NOT_LOADING =
  'Google Maps không tải được. Thường do một trong các nguyên nhân sau, theo thứ tự hay gặp: '
  + 'chưa bật "Maps JavaScript API" cho project; vừa bật xong và Google chưa kịp có hiệu lực '
  + '(đợi vài phút rồi tải lại trang); project chưa bật thanh toán; hoặc giới hạn tên miền của '
  + 'khóa không khớp tên miền đang mở.';

// Khung bản đồ Google dùng chung cho mọi bản đồ trong dự án.
//
// Lo phần lặp lại ở mọi nơi: nạp API, tạo bản đồ đúng một lần, và hiện thông báo đọc được
// khi hỏng thay vì để lại một mảng xám trống không ai hiểu vì sao.
//
// Ghim/đường/cụm là thao tác mệnh lệnh của Google Maps chứ không phải phần tử React, nên
// component này KHÔNG tự vẽ chúng — nó giao đối tượng map ra ngoài qua onMapReady để bên
// gọi tự quản lý trong useEffect của mình.
const GoogleMapCanvas = ({
  options,
  onMapReady,
  className = '',
  style,
  // Bản đồ được tạo lại khi giá trị này đổi. Dùng khi cần dựng lại hẳn (hiếm) — đổi tâm hay
  // mức phóng thì nên gọi map.panTo()/setZoom() từ bên ngoài, không dựng lại cả bản đồ.
  resetKey,
}) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const [error, setError] = useState(hasGoogleMapsKey() ? '' : GOOGLE_MAPS_KEY_MISSING);
  // Giữ callback trong ref để không phải đưa nó vào mảng phụ thuộc — nếu đưa vào, mỗi lần
  // component cha render lại là bản đồ bị dựng mới, mất hết ghim và vị trí đang xem.
  const onReadyRef = useRef(onMapReady);
  onReadyRef.current = onMapReady;
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (!hasGoogleMapsKey()) return undefined;
    let cancelled = false;
    let readyTimer = null;

    loadGoogleMaps()
      .then(maps => {
        if (cancelled || !containerRef.current) return;
        const map = new maps.Map(containerRef.current, { ...BASE_MAP_OPTIONS, ...optionsRef.current });
        mapRef.current = map;

        // Không phải lỗi nào của Google cũng gọi gm_authFailure. Khi API chưa được bật, hoặc
        // thanh toán chưa hiệu lực, Google chỉ vẽ đè lớp "Rất tiếc! Đã xảy ra lỗi" lên khung
        // và bảo người dùng đi mở bảng điều khiển JavaScript — thứ không ai ngoài lập trình
        // viên đọc được. Bản đồ chạy được thì luôn phát sự kiện 'idle'; không thấy nó sau một
        // khoảng thời gian rộng rãi thì coi là hỏng và nói rõ nguyên nhân thường gặp.
        readyTimer = setTimeout(() => {
          if (!cancelled) setError(GOOGLE_MAPS_NOT_LOADING);
        }, MAP_READY_TIMEOUT_MS);
        maps.event.addListenerOnce(map, 'idle', () => clearTimeout(readyTimer));

        onReadyRef.current?.(map, maps);
      })
      .catch(err => { if (!cancelled) setError(err.message); });

    return () => { cancelled = true; clearTimeout(readyTimer); };
  }, [resetKey]);

  // Khóa bị Google từ chối: đổi khung bản đồ thành thông báo nêu rõ nguyên nhân, thay vì
  // để lại ô xám kèm lớp phủ mờ của Google mà không ai biết phải sửa ở đâu.
  useEffect(() => onGoogleMapsAuthFailure(() => setError(GOOGLE_MAPS_AUTH_FAILED)), []);

  // Google Maps đo kích thước khung lúc khởi tạo. Nếu lúc đó khung chưa có kích thước thật
  // (form vừa hiện ra, tab vừa đổi...) bản đồ sẽ vẽ lệch hoặc chỉ hiện một góc. Theo dõi
  // kích thước khung và báo cho bản đồ vẽ lại — cùng lý do như bản Leaflet trước đây.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => {
      const map = mapRef.current;
      if (!map || !window.google?.maps) return;
      const center = map.getCenter();
      window.google.maps.event.trigger(map, 'resize');
      if (center) map.setCenter(center); // giữ nguyên chỗ đang xem sau khi vẽ lại
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (error) {
    return (
      <div className={`gmap-fallback ${className}`} style={style}>
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11z" />
          <circle cx="12" cy="10" r="2.6" />
        </svg>
        <p>{error}</p>
      </div>
    );
  }

  return <div ref={containerRef} className={`gmap-canvas ${className}`} style={style} />;
};

export default GoogleMapCanvas;
