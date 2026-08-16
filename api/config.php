<?php
// File này được commit lên Git (không như trước đây) — nên KHÔNG chứa mật khẩu thật nào,
// để tránh bị Hostinger xóa mất mỗi khi tự động deploy lại (file trước đây nằm ngoài Git
// nên bị dọn sạch cùng các file "thừa" khi đồng bộ). Giá trị thật được đọc theo thứ tự:
//   1) Biến môi trường thật (nếu hPanel > Nâng cao > Environment Variables có hỗ trợ)
//   2) File riêng nằm NGOÀI public_html (không nằm trong Git, không bao giờ bị deploy đè lên)
//   3) Giá trị mặc định để chạy local bằng XAMPP

$secretsFile = dirname(__DIR__, 2) . '/hotrandinh_db_secrets.php';
if (is_file($secretsFile)) {
  require $secretsFile;
}

function env_value(string $name, string $default): string {
  $v = getenv($name);
  return ($v === false || $v === '') ? $default : $v;
}

if (!defined('DB_HOST')) define('DB_HOST', env_value('DB_HOST', 'localhost'));
if (!defined('DB_NAME')) define('DB_NAME', env_value('DB_NAME', 'hotrandinh_local'));
if (!defined('DB_USER')) define('DB_USER', env_value('DB_USER', 'root'));
if (!defined('DB_PASS')) define('DB_PASS', env_value('DB_PASS', ''));

define('ALLOWED_ORIGINS', [
  'http://localhost:5173',
  'https://hotrandinh.com',
  'https://www.hotrandinh.com',
]);

define('STORAGE_DIR', __DIR__ . '/storage');
