// Tiện ích định vị, có BỘ NHỚ ĐỆM để không phải trả phí Google nhiều lần cho cùng một địa danh.
//
// Thứ tự tra, dừng ngay khi có kết quả:
//   1. Đệm trong phiên (Map ở dưới)  — nhanh nhất, không gọi mạng
//   2. Đệm ở máy chủ (geocode_cache) — dùng chung cho MỌI người xem, kể cả máy khác
//   3. Google Places/Geocoding       — chỉ tới đây khi thật sự chưa ai tra bao giờ,
//                                      và kết quả được ghi ngược lại đệm máy chủ
//
// Nhờ vậy một phường/xã chỉ tốn đúng 1 lượt gọi Google trong suốt vòng đời của web, thay vì
// mỗi lần có người mở màn hình So Sánh 2 Người lại gọi một lần.

import { searchPlaces } from './googleMaps';
import { apiRequest } from '../api';

// Đệm trong phiên, gồm cả kết quả "không tìm thấy" (lưu null) — nếu không, một địa chỉ sai
// sẽ bị tra đi tra lại mỗi lần render.
const sessionCache = new Map();

const keyOf = (query) => query.trim().toLowerCase();

// Địa chỉ thành viên trong hệ thống chỉ có độ chi tiết Phường/Xã + Tỉnh/Thành (không có
// số nhà/tọa độ lưu sẵn), nên tọa độ trả về là vị trí gần đúng của khu vực đó, không phải
// địa chỉ nhà chính xác.
export async function geocodeAddress(query) {
  if (!query || !query.trim()) return null;
  const key = keyOf(query);

  if (sessionCache.has(key)) return sessionCache.get(key);

  // 2. Đệm ở máy chủ
  try {
    const cached = await apiRequest(`geocode.php?q=${encodeURIComponent(query.trim())}`);
    if (cached?.cached) {
      const point = cached.found ? { lat: cached.lat, lng: cached.lng } : null;
      sessionCache.set(key, point);
      return point;
    }
  } catch {
    // Không đọc được đệm (mất mạng, chưa chạy migration) — vẫn tra Google như thường.
  }

  // 3. Hỏi Google, rồi ghi ngược vào đệm cho những người sau
  let point = null;
  try {
    const results = await searchPlaces(query);
    if (results.length > 0) point = { lat: results[0].lat, lng: results[0].lng };
  } catch {
    // Chưa cấu hình khóa API hoặc lỗi mạng -> coi như không định vị được.
    // KHÔNG ghi vào đệm: đây là sự cố tạm thời, không phải kết luận "địa chỉ này không có".
    sessionCache.set(key, null);
    return null;
  }

  try {
    await apiRequest('geocode.php', {
      method: 'POST',
      body: {
        q: query.trim(),
        found: point !== null,
        lat: point?.lat,
        lng: point?.lng,
      },
    });
  } catch {
    // Ghi đệm hỏng thì thôi, lần sau tra lại — không được để việc này làm hỏng kết quả.
  }

  sessionCache.set(key, point);
  return point;
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
