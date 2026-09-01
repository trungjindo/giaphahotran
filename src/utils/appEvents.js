// Sự kiện dùng chung giữa các phần rời nhau của giao diện.
//
// "Lịch Gia Tộc" có 2 nút mở (menu trên cùng và khối nổi bật giữa trang chủ) nhưng hộp thoại
// chỉ nên tồn tại DUY NHẤT 1 bản ở App, nếu không bấm cả hai sẽ mở chồng 2 lớp lên nhau.
// Trang chủ phát sự kiện này, App bắt và mở hộp thoại.
//
// Đặt ở file riêng thay vì export thẳng từ App.jsx để tránh import vòng (App -> Home -> App).
export const OPEN_FAMILY_CALENDAR = 'open-family-calendar';
