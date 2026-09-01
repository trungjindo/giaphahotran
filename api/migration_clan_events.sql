-- Migration: LỊCH GIA TỘC — sự kiện dòng họ có ngày cụ thể
-- Chạy 1 lần trong phpMyAdmin (tab SQL). An toàn khi chạy lại nhiều lần.
--
-- Bảng activities sẵn có chỉ ghi được NĂM (year) nên không dựng lịch theo ngày được.
-- Bảng này ghi rõ ngày/tháng, và quan trọng nhất là ghi theo lịch nào:
--   calendar = 'am'    -> ngày/tháng ÂM lịch (giỗ tổ, tế họ, rằm... — đa số việc họ)
--   calendar = 'duong' -> ngày/tháng DƯƠNG lịch (họp mặt, khánh thành...)
-- event_year = NULL nghĩa là sự kiện LẶP LẠI HẰNG NĂM (giỗ tổ, ngày tế họ);
-- có năm cụ thể nghĩa là sự kiện chỉ diễn ra đúng năm đó.
-- chi_id = NULL nghĩa là việc CHUNG của cả họ (cùng quy ước với activities, assets, tomb_sites).
CREATE TABLE IF NOT EXISTS clan_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT NULL,
  chi_id INT NULL,
  calendar ENUM('am', 'duong') NOT NULL DEFAULT 'am',
  event_day TINYINT UNSIGNED NOT NULL,
  event_month TINYINT UNSIGNED NOT NULL,
  event_year INT NULL,
  location VARCHAR(255) NULL,
  created_by INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_clan_events_md (event_month, event_day),
  FOREIGN KEY (chi_id) REFERENCES chi(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
