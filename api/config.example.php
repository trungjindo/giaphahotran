<?php
// Sao chép file này thành config.php (KHÔNG commit config.php lên Git) và điền thông tin thật.

define('DB_HOST', 'localhost');
define('DB_NAME', 'u113008662_hotrandinh');
define('DB_USER', 'u113008662_XXXXX');
define('DB_PASS', 'thay-bang-mat-khau-that');

// Danh sách domain được phép gọi API (CORS). Thêm domain thật khi deploy.
define('ALLOWED_ORIGINS', [
  'http://localhost:5173',
  'https://hotrandinh.com',
  'https://www.hotrandinh.com',
]);

// Thư mục lưu ảnh upload trên server (đường dẫn tuyệt đối tính từ vị trí file này)
define('STORAGE_DIR', __DIR__ . '/storage');
