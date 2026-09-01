// Nạp Google Maps JavaScript API — dùng chung cho MỌI bản đồ trong dự án
// (bản đồ lăng mộ, bản đồ tài sản, ô chọn vị trí trong khu quản trị).
//
// Tự chèn thẻ <script> thay vì thêm thư viện npm: chỉ vài chục dòng, không phải theo dõi
// phiên bản của một gói phụ thuộc nữa, và quan trọng hơn là bảo đảm script CHỈ được nạp
// ĐÚNG MỘT LẦN dù có bao nhiêu bản đồ cùng xuất hiện trên trang — nạp lại lần hai sẽ khiến
// Google ghi đè namespace và các bản đồ đang mở bị hỏng.

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

// Thư viện cần dùng: 'places' cho ô tìm địa chỉ, 'marker' cho ghim.
const LIBRARIES = 'places,marker,geometry';
const LANGUAGE = 'vi';
const REGION = 'VN';

export const GOOGLE_MAPS_KEY_MISSING =
  'Chưa cấu hình khóa Google Maps (VITE_GOOGLE_MAPS_API_KEY), nên bản đồ không hiển thị được.';

export function hasGoogleMapsKey() {
  return API_KEY.trim() !== '';
}

let loadPromise = null;

// Google báo lỗi xác thực khóa (khóa sai, chưa bật thanh toán, sai giới hạn tên miền) bằng
// cách gọi hàm toàn cục này — KHÔNG phải bằng cách làm promise nạp script thất bại. Nếu
// không bắt, người dùng chỉ thấy một ô xám kèm lớp phủ khó hiểu của Google, còn nguyên nhân
// thật thì nằm im trong console. Bắt lại để hiện đúng lý do ngay trên khung bản đồ.
export const GOOGLE_MAPS_AUTH_FAILED =
  'Google Maps từ chối khóa API. Thường do: khóa sai, chưa bật thanh toán cho project, '
  + 'chưa bật Maps JavaScript API, hoặc giới hạn tên miền của khóa không khớp tên miền này.';

const authFailureSubscribers = new Set();
let authFailed = false;

export function onGoogleMapsAuthFailure(callback) {
  if (authFailed) callback();
  authFailureSubscribers.add(callback);
  return () => authFailureSubscribers.delete(callback);
}

if (typeof window !== 'undefined') {
  window.gm_authFailure = () => {
    authFailed = true;
    authFailureSubscribers.forEach(cb => cb());
  };
}

// Trả về Promise cho đối tượng `google.maps` đã sẵn sàng.
// Gọi bao nhiêu lần cũng được — lần đầu nạp script, các lần sau dùng lại đúng promise đó.
export function loadGoogleMaps() {
  if (loadPromise) return loadPromise;

  if (!hasGoogleMapsKey()) {
    loadPromise = Promise.reject(new Error(GOOGLE_MAPS_KEY_MISSING));
    return loadPromise;
  }

  // Script đã có sẵn trên trang (VD do lần nạp trước hoặc do trang khác chèn).
  if (window.google?.maps) {
    loadPromise = Promise.resolve(window.google.maps);
    return loadPromise;
  }

  loadPromise = new Promise((resolve, reject) => {
    // Google gọi lại hàm này khi đã nạp xong — dùng callback thay vì sự kiện load của thẻ
    // script, vì thẻ script báo "load xong" trước khi các thư viện con sẵn sàng.
    const callbackName = '__onGoogleMapsReady';
    window[callbackName] = () => {
      delete window[callbackName];
      resolve(window.google.maps);
    };

    const script = document.createElement('script');
    const params = new URLSearchParams({
      key: API_KEY,
      libraries: LIBRARIES,
      language: LANGUAGE,
      region: REGION,
      loading: 'async',
      callback: callbackName,
    });
    script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
    script.async = true;
    script.onerror = () => {
      delete window[callbackName];
      // Cho phép thử lại ở lần gọi sau (VD mất mạng tạm thời) thay vì hỏng vĩnh viễn.
      loadPromise = null;
      reject(new Error('Không tải được Google Maps. Kiểm tra kết nối mạng và khóa API.'));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}

// Tâm và mức phóng mặc định khi chưa có vị trí nào — nhìn bao trọn Việt Nam.
export const VIETNAM_CENTER = { lat: 16.0, lng: 106.0 };
export const VIETNAM_ZOOM = 5;

// Kiểu bản đồ dùng chung: ẩn bớt các điểm quan tâm thương mại cho đỡ rối, giữ lại địa danh
// hành chính và đường sá — thứ thực sự cần khi tìm phần mộ hay tài sản của dòng họ.
export const BASE_MAP_OPTIONS = {
  mapTypeControl: true,
  streetViewControl: false,
  fullscreenControl: true,
  clickableIcons: false,
  styles: [
    { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  ],
};

// Ghim dạng SVG (chuỗi) -> icon cho google.maps.Marker.
// Dùng Marker cổ điển thay vì AdvancedMarkerElement vì loại mới BẮT BUỘC phải khai báo
// Map ID trong Google Cloud Console — thêm một bước cấu hình nữa cho người quản trị mà
// không đổi lại được gì cho nhu cầu ở đây.
export function svgMarkerIcon(maps, svg, { width, height, anchorX, anchorY }) {
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new maps.Size(width, height),
    anchor: new maps.Point(anchorX, anchorY),
  };
}

// Tìm địa chỉ / địa điểm theo chữ người dùng gõ. Trả về [{ label, lat, lng }].
//
// Ưu tiên Places Text Search vì con cháu thường gõ TÊN ĐỊA ĐIỂM ("Nghĩa trang xã Vị Hoàng",
// "Nhà thờ họ Trần Đình") chứ không phải địa chỉ số nhà — Geocoding thường không ra.
// Nếu Places không dùng được (chưa bật API, hết hạn mức, phiên bản SDK cũ) thì lùi về
// Geocoding để ô tìm kiếm không bao giờ chết hẳn.
export async function searchPlaces(query) {
  const q = (query || '').trim();
  if (q.length < 3) return [];
  const maps = await loadGoogleMaps();

  try {
    if (typeof maps.importLibrary === 'function') {
      const { Place } = await maps.importLibrary('places');
      if (Place?.searchByText) {
        const { places } = await Place.searchByText({
          textQuery: q,
          fields: ['displayName', 'formattedAddress', 'location'],
          language: LANGUAGE,
          region: REGION,
          maxResultCount: 5,
        });
        const rows = (places || [])
          .filter(p => p.location)
          .map(p => ({
            label: [p.displayName, p.formattedAddress].filter(Boolean).join(' — '),
            lat: p.location.lat(),
            lng: p.location.lng(),
          }));
        if (rows.length > 0) return rows;
      }
    }
  } catch {
    // Rơi xuống Geocoding bên dưới.
  }

  return new Promise(resolve => {
    new maps.Geocoder().geocode({ address: q, region: REGION }, (results, status) => {
      if (status !== 'OK' || !Array.isArray(results)) return resolve([]);
      resolve(results.slice(0, 5).map(r => ({
        label: r.formatted_address,
        lat: r.geometry.location.lat(),
        lng: r.geometry.location.lng(),
      })));
    });
  });
}
