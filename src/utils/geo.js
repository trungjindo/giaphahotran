// Tiện ích định vị: dùng Google Geocoding/Places qua Maps JavaScript API
// (xem utils/googleMaps.js), đồng bộ với mọi bản đồ khác trong dự án.

import { searchPlaces } from './googleMaps';

// Địa chỉ thành viên trong hệ thống chỉ có độ chi tiết Phường/Xã + Tỉnh/Thành (không có
// số nhà/tọa độ lưu sẵn), nên tọa độ trả về là vị trí gần đúng của khu vực đó, không phải
// địa chỉ nhà chính xác.
export async function geocodeAddress(query) {
  if (!query || !query.trim()) return null;
  try {
    const results = await searchPlaces(query);
    if (results.length > 0) return { lat: results[0].lat, lng: results[0].lng };
  } catch {
    // Chưa cấu hình khóa API/lỗi mạng -> coi như không định vị được, để phía gọi tự xử lý.
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
