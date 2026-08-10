-- Schema cho database MySQL riêng của dự án hotrandinh.com
-- Chạy file này 1 lần trong phpMyAdmin (hoặc mysql CLI) sau khi tạo database mới trên Hostinger.

-- Lưu trữ từng loại dữ liệu của web dưới dạng JSON (giống cấu trúc React đang dùng),
-- tránh phải thiết kế nhiều bảng quan hệ phức tạp cho một website quy mô 1 dòng họ.
CREATE TABLE IF NOT EXISTS app_data (
  data_key VARCHAR(50) PRIMARY KEY,
  data_json LONGTEXT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tài khoản quản trị (mật khẩu lưu dạng hash, không lưu văn bản thô)
CREATE TABLE IF NOT EXISTS admin_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Phiên đăng nhập dạng token (thay cho session cookie, hoạt động ổn định
-- kể cả khi frontend và API không cùng cổng lúc phát triển cục bộ)
CREATE TABLE IF NOT EXISTS admin_sessions (
  token CHAR(64) PRIMARY KEY,
  admin_id INT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES admin_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Khởi tạo 6 dòng dữ liệu rỗng — API sẽ điền dữ liệu mẫu vào lần chạy đầu qua ứng dụng,
-- hoặc bạn có thể tự import dữ liệu chính thức sau.
INSERT IGNORE INTO app_data (data_key, data_json) VALUES
  ('familyData', 'null'),
  ('financeData', 'null'),
  ('newsData', 'null'),
  ('aboutData', 'null'),
  ('bannerData', 'null'),
  ('galleryData', 'null');

-- Tạo tài khoản admin mặc định: username "admin", mật khẩu "admin123"
-- ĐỔI MẬT KHẨU NÀY NGAY sau khi triển khai — xem hướng dẫn trong DEPLOY.md
-- Hash bên dưới tương ứng "admin123" (bcrypt, cost 10)
INSERT IGNORE INTO admin_users (username, password_hash) VALUES
  ('admin', '$2y$10$L3h7sOSEyDBSyFaNAA2X8ewzkZbRR/XYVHeWZVvoU0UdsocxbG1uy');
