<?php
require_once __DIR__ . '/helpers.php';
send_cors_headers();

$ALLOWED_KEYS = ['familyData', 'financeData', 'newsData', 'aboutData', 'bannerData', 'galleryData'];

$key = $_GET['key'] ?? '';
if (!in_array($key, $ALLOWED_KEYS, true)) {
  json_error('Tham số key không hợp lệ.', 400);
}

$pdo = get_db();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
  $stmt = $pdo->prepare('SELECT data_json FROM app_data WHERE data_key = ?');
  $stmt->execute([$key]);
  $row = $stmt->fetch();
  $json = $row ? $row['data_json'] : 'null';
  header('Content-Type: application/json; charset=utf-8');
  echo $json;
  exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  require_auth(); // Chỉ admin đã đăng nhập mới được ghi dữ liệu

  $raw = file_get_contents('php://input');
  // Kiểm tra JSON hợp lệ trước khi lưu để tránh làm hỏng dữ liệu đang có
  json_decode($raw);
  if (json_last_error() !== JSON_ERROR_NONE) {
    json_error('Dữ liệu gửi lên không phải JSON hợp lệ.', 400);
  }

  $stmt = $pdo->prepare(
    'INSERT INTO app_data (data_key, data_json) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE data_json = VALUES(data_json)'
  );
  $stmt->execute([$key, $raw]);

  json_response(['success' => true]);
}

json_error('Method not allowed', 405);
