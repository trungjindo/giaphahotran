-- Migration: kiểm soát truy cập dữ liệu nhạy cảm + chống dò mật khẩu
-- Chạy 1 lần trong phpMyAdmin trên database thật. An toàn khi chạy lại nhiều lần
-- (CREATE TABLE IF NOT EXISTS / INSERT IGNORE), không đụng tới dữ liệu đang có.

-- 1) Phiên XÁC THỰC CON CHÁU: dành cho người trong dòng họ KHÔNG có tài khoản quản trị.
--    Họ chứng minh là người trong họ bằng cách trả lời đúng: họ tên của mình + họ tên cha
--    + ngày tế họ hàng năm (xem family_verify.php). Tách hẳn khỏi user_sessions vì đây
--    KHÔNG phải tài khoản: chỉ có quyền XEM, không bao giờ có quyền ghi.
CREATE TABLE IF NOT EXISTS viewer_sessions (
  token CHAR(64) PRIMARY KEY,
  member_id VARCHAR(50) NOT NULL,
  member_name VARCHAR(150) NOT NULL,
  ip VARCHAR(45) NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2) Nhật ký đăng nhập & xác thực — dùng để CHẶN DÒ MẬT KHẨU (đếm số lần sai gần đây theo
--    IP và theo tài khoản), đồng thời để quản trị viên xem lại khi nghi ngờ bị tấn công.
--    KHÔNG bao giờ lưu mật khẩu đã nhập, chỉ lưu tên đăng nhập/tên đã khai.
CREATE TABLE IF NOT EXISTS auth_attempt_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  kind ENUM('login', 'verify') NOT NULL,
  ip VARCHAR(45) NOT NULL,
  identifier VARCHAR(150) NULL,
  success TINYINT(1) NOT NULL DEFAULT 0,
  attempted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_kind_ip_time (kind, ip, attempted_at),
  INDEX idx_kind_ident_time (kind, identifier, attempted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3) Cấu hình chung của trang, hiện dùng cho câu hỏi xác thực "ngày tế họ hàng năm".
--    Lưu ngày/tháng ÂM LỊCH dạng số để so khớp chính xác, không phụ thuộc cách gõ chữ
--    ("rằm tháng giêng" / "15 tháng 1 âm" / "mùng 15/1"... đều là 15 và 1).
CREATE TABLE IF NOT EXISTS site_settings (
  setting_key VARCHAR(50) PRIMARY KEY,
  setting_value VARCHAR(255) NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Giá trị khởi tạo 0 = CHƯA CẤU HÌNH. Khi chưa cấu hình, family_verify.php sẽ từ chối mọi
-- yêu cầu xác thực (an toàn mặc định) thay vì cho qua — quản trị viên phải vào
-- "Quản Lý Tài Khoản > Xác thực con cháu" đặt đúng ngày tế họ trước.
INSERT IGNORE INTO site_settings (setting_key, setting_value) VALUES
  ('te_ho_day', '0'),
  ('te_ho_month', '0');
