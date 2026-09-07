// Liên kết mở sang ỨNG DỤNG Google Maps trên máy người xem.
//
// Đây là cách dùng Google Maps HOÀN TOÀN MIỄN PHÍ và không cần khóa API: chỉ là một địa chỉ
// web bình thường. Trên điện thoại, hệ điều hành tự mở app Google Maps nếu đã cài; trên máy
// tính thì mở google.com/maps trong tab mới.
//
// (Nhúng bản đồ Google vào thẳng trang web thì lại khác — thứ đó bắt buộc phải có khóa API
// và project đã bật thanh toán, nên nền bản đồ trong web vẫn dùng OpenStreetMap miễn phí.)

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
