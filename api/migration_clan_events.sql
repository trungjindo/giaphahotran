-- Migration: LỊCH GIA TỘC — sự kiện dòng họ có ngày cụ thể
-- Chạy 1 lần trong phpMyAdmin (tab SQL). An toàn khi chạy lại nhiều lần, và an toàn cả khi
-- bạn đã chạy bản trước của file này (các cột thêm sau sẽ tự bỏ qua nếu đã có).
--
-- Bảng activities sẵn có chỉ ghi được NĂM (year) nên không dựng lịch theo ngày được.
-- Bảng này ghi rõ ngày/tháng, và quan trọng nhất là ghi theo lịch nào:
--   calendar = 'am'    -> ngày/tháng ÂM lịch (giỗ tổ, tế họ, rằm... — đa số việc họ)
--   calendar = 'duong' -> ngày/tháng DƯƠNG lịch (họp mặt, khánh thành...)
-- event_year = NULL nghĩa là sự kiện LẶP LẠI HẰNG NĂM (giỗ tổ, ngày tế họ);
-- có năm cụ thể nghĩa là sự kiện chỉ diễn ra đúng năm đó.
-- chi_id = NULL nghĩa là việc CHUNG của cả họ (cùng quy ước với activities, assets, tomb_sites).
-- member_id (nếu có) gắn sự kiện vào ngày giỗ của MỘT người trong cây gia phả, để khi xem
--   "hôm nay ai giỗ" thì hiện luôn ai đứng ra tổ chức, ở đâu, mấy giờ.
CREATE TABLE IF NOT EXISTS clan_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT NULL,
  chi_id INT NULL,
  member_id VARCHAR(50) NULL,
  calendar ENUM('am', 'duong') NOT NULL DEFAULT 'am',
  event_day TINYINT UNSIGNED NOT NULL,
  event_month TINYINT UNSIGNED NOT NULL,
  event_year INT NULL,
  event_time VARCHAR(20) NULL,
  organizer VARCHAR(150) NULL,
  location VARCHAR(255) NULL,
  created_by INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_clan_events_md (event_month, event_day),
  INDEX idx_clan_events_member (member_id),
  FOREIGN KEY (chi_id) REFERENCES chi(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Thêm 3 cột trên cho database đã tạo bảng này từ bản migration trước.
-- MySQL không có "ADD COLUMN IF NOT EXISTS" nên phải tự kiểm tra information_schema.
-- (Dùng câu lệnh động thay vì stored procedure + DELIMITER, vì phpMyAdmin xử lý DELIMITER
--  không phải lúc nào cũng đúng.)
SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clan_events' AND COLUMN_NAME = 'member_id') > 0,
  'SELECT ''Cot member_id da co - bo qua'' AS ghi_chu',
  'ALTER TABLE clan_events ADD COLUMN member_id VARCHAR(50) NULL AFTER chi_id, ADD INDEX idx_clan_events_member (member_id)');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clan_events' AND COLUMN_NAME = 'event_time') > 0,
  'SELECT ''Cot event_time da co - bo qua'' AS ghi_chu',
  'ALTER TABLE clan_events ADD COLUMN event_time VARCHAR(20) NULL AFTER event_year');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clan_events' AND COLUMN_NAME = 'organizer') > 0,
  'SELECT ''Cot organizer da co - bo qua'' AS ghi_chu',
  'ALTER TABLE clan_events ADD COLUMN organizer VARCHAR(150) NULL AFTER event_time');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
