-- Migration: LĂNG (khu an táng chung) cho Bản Đồ Lăng Mộ
-- Chạy 1 lần trong phpMyAdmin (tab SQL) trên database thật. An toàn khi chạy lại nhiều lần:
-- mọi bước đều tự kiểm tra trước, không đụng tới dữ liệu đang có.
--
-- Bối cảnh: trước đây mỗi người an táng phải tự nhập 1 cặp tọa độ riêng. Nhưng thực tế rất
-- nhiều người cùng nằm trong MỘT lăng (lăng tổ, lăng của chi, lăng gia đình) — nhập tay từng
-- người vừa mất công vừa ra nhiều ghim lệch nhau vài mét, chồng lên nhau trên bản đồ tổng.
--
-- Từ nay: tạo lăng 1 lần (ghim đúng 1 vị trí), rồi gán người vào lăng theo TÊN LĂNG.
-- Người được gán lấy tọa độ từ lăng, nên cả lăng luôn chung đúng 1 ghim.
--
-- Ghi chú kỹ thuật: MySQL không có "ADD COLUMN IF NOT EXISTS". Ở đây dùng câu lệnh động
-- (PREPARE/EXECUTE) đọc information_schema, thay vì stored procedure + DELIMITER — vì
-- phpMyAdmin xử lý DELIMITER không phải lúc nào cũng đúng.

-- ---------------------------------------------------------------------------
-- 1) Danh mục lăng. chi_id = NULL nghĩa là lăng CHUNG của cả họ
--    (cùng quy ước với bảng activities và assets).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tomb_sites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  chi_id INT NULL,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  address VARCHAR(255) NULL,
  photo VARCHAR(255) NULL,
  description TEXT NULL,
  created_by INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tomb_sites_name (name),
  FOREIGN KEY (chi_id) REFERENCES chi(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 2) Thêm cột tombs.site_id (bỏ qua nếu đã có).
--    site_id NULL => mộ riêng lẻ, dùng latitude/longitude của chính bản ghi (như trước đây).
--    site_id có   => nằm trong lăng, tọa độ LẤY TỪ LĂNG.
-- ---------------------------------------------------------------------------
SET @has_col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tombs' AND COLUMN_NAME = 'site_id'
);
SET @sql := IF(@has_col > 0,
  'SELECT ''Cot tombs.site_id da ton tai - bo qua'' AS ghi_chu',
  'ALTER TABLE tombs ADD COLUMN site_id INT NULL AFTER member_id');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------------
-- 3) Khóa ngoại tombs.site_id -> tomb_sites.id (bỏ qua nếu đã có).
--    ON DELETE SET NULL chỉ là lưới an toàn cuối cùng của DB; tomb_sites.php đã CHẶN xóa
--    lăng khi còn người bên trong, để không ai vô tình làm họ biến mất khỏi bản đồ.
-- ---------------------------------------------------------------------------
SET @has_fk := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tombs'
    AND CONSTRAINT_NAME = 'fk_tombs_site' AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
SET @sql := IF(@has_fk > 0,
  'SELECT ''Khoa ngoai fk_tombs_site da ton tai - bo qua'' AS ghi_chu',
  'ALTER TABLE tombs ADD CONSTRAINT fk_tombs_site FOREIGN KEY (site_id) REFERENCES tomb_sites(id) ON DELETE SET NULL');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------------
-- 4) Cho phép tọa độ để trống: người nằm trong lăng KHÔNG có tọa độ riêng.
--    MODIFY chạy lại nhiều lần đều vô hại. Dữ liệu cũ (mộ riêng, đã có tọa độ) không đổi.
-- ---------------------------------------------------------------------------
ALTER TABLE tombs MODIFY COLUMN latitude DECIMAL(10,7) NULL;
ALTER TABLE tombs MODIFY COLUMN longitude DECIMAL(10,7) NULL;
