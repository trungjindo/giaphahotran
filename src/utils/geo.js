// Tiện ích định vị: dùng Nominatim (OpenStreetMap) — miễn phí, không cần API key,
// đồng bộ với cách bản đồ lăng mộ đã dùng thay cho Google Places/Geocoding có phí.

const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search';

// Địa chỉ thành viên trong hệ thống chỉ có độ chi tiết Phường/Xã + Tỉnh/Thành (không có
// số nhà/tọa độ lưu sẵn), nên tọa độ trả về là vị trí gần đúng của khu vực đó, không phải
// địa chỉ nhà chính xác.
export async function geocodeAddress(query) {
  if (!query || !query.trim()) return null;
  try {
    const url = `${NOMINATIM_SEARCH_URL}?format=json&q=${encodeURIComponent(query.trim())}&limit=1&accept-language=vi`;
    const res = await fetch(url);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch {
    // Lỗi mạng/định dạng -> coi như không định vị được, để phía gọi tự xử lý hiển thị
  }
  return null;
}

// Khoảng cách đường chim bay giữa 2 tọa độ (km), công thức Haversine.
export function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
