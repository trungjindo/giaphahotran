<?php
require_once __DIR__ . '/helpers.php';
send_cors_headers();

// Thu chi riêng của từng Chi dùng lại đúng cấu trúc dữ liệu và logic tính toán của
// thu chi dòng họ lớn ({ openingBalance, transactions: [...] }), chỉ khác chỗ lưu:
// mỗi chi có 1 dòng riêng trong app_data với khóa "financeData_chi_<id>".

$pdo = get_db();

$chiId = (int)($_GET['chiId'] ?? 0);
if ($chiId <= 0) {
  json_error('Thiếu hoặc sai tham số chiId.', 400);
}

// Xác nhận chi này thực sự tồn tại
$stmt = $pdo->prepare('SELECT id FROM chi WHERE id = ?');
$stmt->execute([$chiId]);
if (!$stmt->fetch()) {
  json_error('Không tìm thấy chi này.', 404);
}

$dataKey = 'financeData_chi_' . $chiId;

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
  $stmt = $pdo->prepare('SELECT data_json FROM app_data WHERE data_key = ?');
  $stmt->execute([$dataKey]);
  $row = $stmt->fetch();
  header('Content-Type: application/json; charset=utf-8');
  echo $row ? $row['data_json'] : 'null';
  exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $currentUser = require_auth();
  require_chi_access($currentUser, $chiId);

  $raw = file_get_contents('php://input');
  json_decode($raw);
  if (json_last_error() !== JSON_ERROR_NONE) {
    json_error('Dữ liệu gửi lên không phải JSON hợp lệ.', 400);
  }

  $stmt = $pdo->prepare(
    'INSERT INTO app_data (data_key, data_json) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE data_json = VALUES(data_json)'
  );
  $stmt->execute([$dataKey, $raw]);

  json_response(['success' => true]);
}

json_error('Method not allowed', 405);
