-- Migration: BỘ NHỚ ĐỆM KẾT QUẢ ĐỊNH VỊ (geocoding)
-- Chạy 1 lần trong phpMyAdmin (tab SQL). An toàn khi chạy lại nhiều lần.
--
-- Vì sao cần: màn hình "So Sánh 2 Người" tính khoảng cách giữa nơi ở của 2 thành viên bằng
-- cách định vị "Phường/Xã, Tỉnh/Thành" của mỗi người. Trước đây MỖI LẦN có người mở màn hình
-- đó là một lần gọi Google — dù hàng trăm thành viên dùng chung vài chục phường/xã, và ranh
-- giới hành chính thì gần như không đổi.
--
-- Đệm Ở MÁY CHỦ chứ không phải ở trình duyệt: như vậy người đầu tiên tra một phường/xã sẽ
-- trả phí đúng 1 lần cho TẤT CẢ mọi người sau đó, kể cả người dùng máy khác.
CREATE TABLE IF NOT EXISTS geocode_cache (
  -- Chuỗi tìm kiếm đã chuẩn hóa (bỏ dấu, thường hóa) — xem api/helpers.php#normalize_vn_name
  query_key VARCHAR(191) NOT NULL PRIMARY KEY,
  query_text VARCHAR(255) NOT NULL,
  latitude DECIMAL(10,7) NULL,
  longitude DECIMAL(10,7) NULL,
  label VARCHAR(255) NULL,
  -- found = 0 nghĩa là Google đã tra và KHÔNG có kết quả. Vẫn phải lưu, nếu không mỗi lần
  -- mở lại là một lần gọi Google chỉ để nhận lại đúng câu trả lời "không tìm thấy".
  found TINYINT(1) NOT NULL DEFAULT 1,
  hits INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
