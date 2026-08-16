-- Schema cho database MySQL riêng của dự án hotrandinh.com
-- Chạy file này 1 lần trong phpMyAdmin (hoặc mysql CLI) sau khi tạo database mới trên Hostinger.

-- Lưu trữ từng loại dữ liệu của web dưới dạng JSON (giống cấu trúc React đang dùng),
-- tránh phải thiết kế nhiều bảng quan hệ phức tạp cho một website quy mô 1 dòng họ.
CREATE TABLE IF NOT EXISTS app_data (
  data_key VARCHAR(50) PRIMARY KEY,
  data_json LONGTEXT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Một "Chi" = nhánh hậu duệ của 1 người cụ thể trong cây gia phả (root_member_id
-- là "id" của người đó trong familyData JSON — không có ràng buộc khóa ngoại DB vì
-- cây gia phả được lưu dưới dạng JSON, không phải bảng quan hệ). Toàn bộ hậu duệ của
-- root_member_id được coi là thuộc Chi này (tính bằng cách duyệt cây trong code PHP).
CREATE TABLE IF NOT EXISTS chi (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  root_member_id VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tài khoản người dùng (mật khẩu lưu dạng hash, không lưu văn bản thô).
-- role: admin (quản trị dòng họ lớn) / chi_admin / dich_ton / bai_bien
-- chi_id: NULL với admin (không giới hạn theo chi); bắt buộc với 3 role còn lại
-- year_assigned: chỉ dùng cho role bai_bien — năm được phân công làm bãi biện
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL DEFAULT '',
  role ENUM('admin', 'chi_admin', 'dich_ton', 'bai_bien') NOT NULL DEFAULT 'chi_admin',
  chi_id INT NULL,
  year_assigned INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (chi_id) REFERENCES chi(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Phiên đăng nhập dạng token (thay cho session cookie, hoạt động ổn định
-- kể cả khi frontend và API không cùng cổng lúc phát triển cục bộ)
CREATE TABLE IF NOT EXISTS user_sessions (
  token CHAR(64) PRIMARY KEY,
  user_id INT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Lịch sử phân công "bãi biện" theo năm — nguồn xác thực duy nhất cho việc 1 tài khoản
-- bai_bien được phép ghi dữ liệu của năm nào. status='active' là đang đương nhiệm;
-- 'handed_over' là đã bàn giao (giữ lại để lưu lịch sử, không xóa).
CREATE TABLE IF NOT EXISTS bai_bien_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  chi_id INT NULL,
  year INT NOT NULL,
  user_id INT NOT NULL,
  status ENUM('active', 'handed_over') NOT NULL DEFAULT 'active',
  assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  handed_over_at TIMESTAMP NULL,
  FOREIGN KEY (chi_id) REFERENCES chi(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Hoạt động theo năm. chi_id = NULL nghĩa là hoạt động của dòng họ lớn (không thuộc chi nào).
CREATE TABLE IF NOT EXISTS activities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  chi_id INT NULL,
  year INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  created_by INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (chi_id) REFERENCES chi(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ghi lại mỗi lần API reveal_phone.php trả về số điện thoại thật của 1 người (dùng khi
-- người xem công khai bấm nút "Gọi") — chỉ để giới hạn tần suất theo IP, không phục vụ mục
-- đích thống kê/theo dõi nào khác. Có thể dọn định kỳ các dòng cũ hơn vài ngày nếu cần.
CREATE TABLE IF NOT EXISTS phone_reveal_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ip VARCHAR(45) NOT NULL,
  member_id VARCHAR(50) NOT NULL,
  revealed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ip_time (ip, revealed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Vị trí lăng mộ của từng thành viên đã mất, hiển thị trên "Bản đồ lăng mộ tổ tiên".
-- member_id tham chiếu id của người đó trong familyData JSON (không có khóa ngoại DB
-- vì cây gia phả là JSON, không phải bảng quan hệ — giống cách chi.root_member_id hoạt động).
CREATE TABLE IF NOT EXISTS tombs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_id VARCHAR(50) NOT NULL UNIQUE,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  photo VARCHAR(255) NULL,
  description TEXT NULL,
  interred_date DATE NULL,
  created_by INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tài sản dòng họ: đất đai, nhà cửa, đồ thờ, đồ dùng lễ nghi, vật dụng, tài sản giá trị...
-- chi_id = NULL nghĩa là tài sản CHUNG của cả họ (giống quy ước chi_id NULL ở bảng activities).
-- finance_tx_id tham chiếu lỏng tới 1 giao dịch trong financeData JSON (dòng họ nếu chi_id NULL,
-- financeData_chi_<chi_id> nếu có chi_id) — không có khóa ngoại DB vì thu chi lưu dạng JSON,
-- giống cách tombs.member_id / chi.root_member_id tham chiếu vào familyData JSON.
-- images lưu mảng URL ảnh dạng JSON (VD: ["https://.../a.jpg", "https://.../b.jpg"]).
CREATE TABLE IF NOT EXISTS assets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  chi_id INT NULL,
  name VARCHAR(200) NOT NULL,
  category ENUM('dat_dai', 'nha_cua', 'do_tho', 'le_nghi', 'vat_dung', 'gia_tri', 'khac') NOT NULL DEFAULT 'vat_dung',
  description TEXT NULL,
  status ENUM('dang_dung', 'hu_hong', 'can_sua', 'luu_kho') NOT NULL DEFAULT 'dang_dung',
  address VARCHAR(255) NULL,
  latitude DECIMAL(10,7) NULL,
  longitude DECIMAL(10,7) NULL,
  custodian VARCHAR(150) NULL,
  acquired_date DATE NULL,
  finance_tx_id VARCHAR(50) NULL,
  estimated_value DECIMAL(15,0) NULL,
  useful_life_years INT NULL,
  expected_replace_year INT NULL,
  expected_replace_cost DECIMAL(15,0) NULL,
  images JSON NULL,
  created_by INT NULL,
  updated_by INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (chi_id) REFERENCES chi(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_chi (chi_id),
  INDEX idx_category (category),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Lịch sử thay đổi tài sản. Lưu snapshot tên tài sản/người thao tác dạng text (không chỉ
-- FK) để lịch sử vẫn đọc được ý nghĩa kể cả sau khi tài sản hoặc tài khoản đó bị xóa.
CREATE TABLE IF NOT EXISTS asset_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  asset_id INT NULL,
  asset_name VARCHAR(200) NOT NULL,
  user_id INT NULL,
  user_name VARCHAR(100) NULL,
  action ENUM('created', 'updated', 'deleted') NOT NULL,
  summary TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_asset (asset_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Banner quảng cáo dọc 2 bên trang web — nơi thành viên trong họ quảng bá sản phẩm/dịch vụ/
-- công ty của mình. Chỉ admin dòng họ được thêm (duyệt nội dung trước khi đăng công khai).
-- is_active=0 để ẩn tạm mà không phải xóa hẳn; sort_order quyết định thứ tự xoay vòng hiển thị.
CREATE TABLE IF NOT EXISTS promo_banners (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_name VARCHAR(150) NOT NULL,
  description VARCHAR(300) NULL,
  image VARCHAR(500) NOT NULL,
  link_url VARCHAR(500) NULL,
  contact_name VARCHAR(150) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_by INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_active_order (is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Khởi tạo các dòng dữ liệu rỗng — API sẽ điền dữ liệu mẫu vào lần chạy đầu qua ứng dụng,
-- hoặc bạn có thể tự import dữ liệu chính thức sau.
INSERT IGNORE INTO app_data (data_key, data_json) VALUES
  ('familyData', 'null'),
  ('financeData', 'null'),
  ('newsData', 'null'),
  ('aboutData', 'null'),
  ('bannerData', 'null'),
  ('galleryData', 'null'),
  ('contactAdminData', 'null');

-- Tạo tài khoản admin (dòng họ lớn) mặc định: username "admin", mật khẩu "admin123"
-- ĐỔI MẬT KHẨU NÀY NGAY sau khi triển khai — xem hướng dẫn trong DEPLOY.md
-- Hash bên dưới tương ứng "admin123" (bcrypt, cost 10)
INSERT IGNORE INTO users (username, password_hash, full_name, role, chi_id) VALUES
  ('admin', '$2y$10$L3h7sOSEyDBSyFaNAA2X8ewzkZbRR/XYVHeWZVvoU0UdsocxbG1uy', 'Quản trị dòng họ', 'admin', NULL);
