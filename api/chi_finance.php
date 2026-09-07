<?php
require_once __DIR__ . '/helpers.php';
send_cors_headers();

// Thu chi riêng của từng Chi dùng lại đúng cấu trúc dữ liệu và logic tính toán của
// thu chi dòng họ lớn ({ openingBalance, transactions: [...] }), chỉ khác chỗ lưu:
// mỗi chi có 1 dòng riêng trong app_data với khóa "financeData_chi_<id>".

$pdo = get_db();

// Chặn NGAY TỪ ĐẦU, trước cả bước kiểm tra chi có tồn tại hay không: nếu để bước đó chạy
// trước, người ngoài chỉ cần so 404 ("không tìm thấy chi") với 401 ("chưa xác thực") là dò
// ra dòng họ có mấy chi và id từng chi, dù chưa xác thực gì cả.
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
  require_family_access();
}

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

// Lấy năm mà 1 bãi biện đang được phân công phụ trách (chi này), null nếu không có.
function get_bai_bien_active_year($pdo, int $userId, int $chiId): ?int {
  $stmt = $pdo->prepare(
    "SELECT year FROM bai_bien_assignments WHERE user_id = ? AND chi_id = ? AND status = 'active'"
  );
  $stmt->execute([$userId, $chiId]);
  $row = $stmt->fetch();
  return $row ? (int)$row['year'] : null;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $currentUser = require_auth();
  require_chi_access($currentUser, $chiId);

  $raw = file_get_contents('php://input');
  $newData = json_decode($raw, true);
  if (json_last_error() !== JSON_ERROR_NONE) {
    json_error('Dữ liệu gửi lên không phải JSON hợp lệ.', 400);
  }

  // Bãi biện chỉ được sửa các giao dịch thuộc đúng năm mình phụ trách, và không được
  // đổi tồn dư đầu kỳ (đó là thông số cấu trúc, không phải "ghi chép trong năm").
  if ($currentUser['role'] === 'bai_bien') {
    $assignedYear = get_bai_bien_active_year($pdo, (int)$currentUser['id'], $chiId);
    if ($assignedYear === null) {
      json_error('Bạn hiện không được phân công phụ trách năm nào của chi này.', 403);
    }

    $stmt = $pdo->prepare('SELECT data_json FROM app_data WHERE data_key = ?');
    $stmt->execute([$dataKey]);
    $row = $stmt->fetch();
    $oldData = $row ? json_decode($row['data_json'], true) : ['openingBalance' => 0, 'transactions' => []];

    if ((int)($newData['openingBalance'] ?? 0) !== (int)($oldData['openingBalance'] ?? 0)) {
      json_error('Bãi biện không có quyền thay đổi tồn dư đầu kỳ.', 403);
    }

    $oldById = [];
    foreach (($oldData['transactions'] ?? []) as $tx) { $oldById[$tx['id']] = $tx; }
    $newById = [];
    foreach (($newData['transactions'] ?? []) as $tx) { $newById[$tx['id']] = $tx; }

    $txYear = function ($tx) {
      $d = $tx['date'] ?? '';
      return $d && preg_match('/^(\d{4})-/', $d, $m) ? (int)$m[1] : null;
    };

    $touchedIds = array_unique(array_merge(array_keys($oldById), array_keys($newById)));
    foreach ($touchedIds as $id) {
      $old = $oldById[$id] ?? null;
      $new = $newById[$id] ?? null;
      // Không đổi gì thì bỏ qua
      if ($old !== null && $new !== null && $old == $new) continue;

      $years = array_filter([$old ? $txYear($old) : null, $new ? $txYear($new) : null], fn($y) => $y !== null);
      foreach ($years as $y) {
        if ($y !== $assignedYear) {
          json_error("Bãi biện chỉ được thêm/sửa/xóa giao dịch của năm $assignedYear (năm mình phụ trách).", 403);
        }
      }
    }
  }

  $stmt = $pdo->prepare(
    'INSERT INTO app_data (data_key, data_json) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE data_json = VALUES(data_json)'
  );
  $stmt->execute([$dataKey, json_encode($newData, JSON_UNESCAPED_UNICODE)]);

  json_response(['success' => true]);
}

json_error('Method not allowed', 405);
