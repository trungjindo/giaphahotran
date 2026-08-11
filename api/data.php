<?php
require_once __DIR__ . '/helpers.php';
send_cors_headers();

$ALLOWED_KEYS = ['familyData', 'financeData', 'newsData', 'aboutData', 'bannerData', 'galleryData', 'contactAdminData'];

$key = $_GET['key'] ?? '';
if (!in_array($key, $ALLOWED_KEYS, true)) {
  json_error('Tham số key không hợp lệ.', 400);
}

$pdo = get_db();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
  // familyData trả về khác nhau tùy đã đăng nhập hay chưa (số điện thoại che hay không) —
  // bắt buộc phải chặn cache (trình duyệt lẫn mọi proxy trung gian), nếu không người vừa
  // đăng xuất (hoặc chưa từng đăng nhập) có thể vẫn nhận lại bản KHÔNG che đã được cache
  // từ một request trước đó có gửi kèm token, vì phản hồi HTTP mặc định không có
  // Cache-Control nên trình duyệt được phép tự lưu cache theo suy đoán riêng.
  if ($key === 'familyData') {
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache');
  }

  $stmt = $pdo->prepare('SELECT data_json FROM app_data WHERE data_key = ?');
  $stmt->execute([$key]);
  $row = $stmt->fetch();

  // Số điện thoại và Zalo thành viên chỉ hiển thị đầy đủ cho người đã đăng nhập (mọi role
  // quản trị trong hệ thống này đều là tài khoản quản trị ở cấp nào đó) — người xem công
  // khai/chưa đăng nhập chỉ nhận bản đã che số (VD "09•••••123"), không phải toàn quyền che
  // ở frontend vì familyData vẫn có thể xem trực tiếp qua Network tab nếu không che tại đây.
  if ($key === 'familyData' && $row && get_authenticated_user() === null) {
    $tree = json_decode($row['data_json'], true);
    if (is_array($tree)) {
      mask_family_contacts($tree);
      json_response($tree);
    }
  }

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
