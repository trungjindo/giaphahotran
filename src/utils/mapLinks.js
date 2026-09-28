// Liên kết mở sang ỨNG DỤNG Google Maps trên máy người xem.
//
// Những liên kết này KHÔNG cần khóa API và KHÔNG tính vào hạn mức: chỉ là một địa chỉ web
// bình thường. Trên điện thoại, hệ điều hành tự mở app Google Maps nếu đã cài; trên máy tính
// thì mở google.com/maps trong tab mới.
//
// Khác với bản đồ NHÚNG trong trang (utils/googleMaps.js) — thứ đó dùng Maps JavaScript API
// nên mỗi lần mở trang đều tính vào hạn mức của khóa.

// Mở Google Maps và đặt ghim ngay tại tọa độ — để XEM chỗ đó nằm ở đâu.
// Cố ý chỉ truyền TỌA ĐỘ, không truyền tên địa điểm: tên sẽ khiến Google tự dò lại và có thể
// nhảy sang một chỗ khác trùng tên, trong khi tọa độ đã ghim là thứ chính xác tuyệt đối.
export function googleMapsViewUrl(lat, lng) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

// Mở Google Maps ở chế độ CHỈ ĐƯỜNG từ vị trí hiện tại của người xem tới tọa độ này.
export function googleMapsDirectionsUrl(lat, lng) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

// Tọa độ hiển thị cho người đọc, cũng là thứ có thể sao chép rồi dán thẳng vào Google Maps.
export function formatCoords(lat, lng) {
  return `${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}`;
}
