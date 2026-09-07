<?php
require_once __DIR__ . '/helpers.php';
send_cors_headers();

// Xác thực "đúng là người trong dòng họ" cho khách KHÔNG có tài khoản quản trị.
// Người xác thực phải trả lời đúng CẢ BA:
//   1) Họ và tên của chính mình  — phải có trong gia phả
//   2) Họ và tên cha của mình    — phải đúng là cha của người ở (1) trong cây
//   3) Ngày tế họ hàng năm (âm lịch) — bí mật chung mà chỉ người trong họ mới biết
// Đạt cả 3 thì được cấp token chỉ-đọc (viewer_sessions), KHÔNG có quyền ghi bất cứ thứ gì.

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  json_error('Method not allowed', 405);
}

const VERIFY_WINDOW_MINUTES = 15;
const VERIFY_MAX_FAILURES_PER_IP = 8;
const VIEWER_SESSION_DAYS = 30;

// (2) và (3) đều là dữ liệu có thể đoán được với số lần thử không giới hạn (ngày tế họ chỉ
// có khoảng 360 khả năng). Chặn dò theo IP là biện pháp giữ cho việc đoán mò không khả thi.
if (count_recent_auth_failures('verify', null, VERIFY_WINDOW_MINUTES) >= VERIFY_MAX_FAILURES_PER_IP) {
  json_error('Bạn đã nhập sai quá nhiều lần. Vui lòng thử lại sau ít phút hoặc liên hệ quản trị viên dòng họ.', 429);
}

$body = read_json_body();
$fullName   = trim((string)($body['fullName'] ?? ''));
$fatherName = trim((string)($body['fatherName'] ?? ''));
$teHoDay    = (int)($body['teHoDay'] ?? 0);
$teHoMonth  = (int)($body['teHoMonth'] ?? 0);

if ($fullName === '' || $fatherName === '' || $teHoDay <= 0 || $teHoMonth <= 0) {
  json_error('Vui lòng điền đầy đủ họ tên của bạn, họ tên cha và ngày tế họ.');
}

// Chưa cấu hình ngày tế họ thì TỪ CHỐI TẤT CẢ (an toàn mặc định) — nếu cho qua khi chưa cấu
// hình thì cổng xác thực coi như không tồn tại.
$expectedDay   = (int)get_setting('te_ho_day', '0');
$expectedMonth = (int)get_setting('te_ho_month', '0');
if ($expectedDay <= 0 || $expectedMonth <= 0) {
  json_error('Quản trị viên chưa cấu hình câu hỏi xác thực. Vui lòng liên hệ quản trị viên dòng họ.', 503);
}

$pdo = get_db();
$tree = get_family_tree($pdo);
if (!is_array($tree)) {
  json_error('Chưa có dữ liệu gia phả để đối chiếu. Vui lòng liên hệ quản trị viên.', 503);
}

$wantName   = normalize_vn_name($fullName);
$wantFather = normalize_vn_name($fatherName);

// Duyệt cây tìm người vừa khớp tên mình vừa khớp tên cha. Cây có thể có nhiều người trùng
// tên nên phải xét CẢ CẶP (tên + tên cha), và vẫn duyệt hết để không phụ thuộc thứ tự.
$matched = null;
$walk = function ($node, $parentName) use (&$walk, $wantName, $wantFather, &$matched) {
  if ($matched !== null || !is_array($node)) return;
  if (normalize_vn_name((string)($node['name'] ?? '')) === $wantName
      && $parentName !== null
      && normalize_vn_name($parentName) === $wantFather) {
    $matched = $node;
    return;
  }
  foreach ($node['children'] ?? [] as $child) {
    $walk($child, (string)($node['name'] ?? ''));
  }
};
$walk($tree, null);

// Người khai có thể là con của một bà vợ được ghi trên hồ sơ (fatherName/motherName) chứ
// không phải con của chính nút cha trong cây — nhưng với gia phả phụ hệ này, nút cha LUÔN
// là người cha, nên chỉ cần đối chiếu như trên là đủ.

$dateOk = ($teHoDay === $expectedDay && $teHoMonth === $expectedMonth);

if ($matched === null || !$dateOk) {
  // Thông báo CHUNG CHUNG, không nói sai ở phần nào: nếu báo rõ "sai ngày tế họ" thì kẻ lạ
  // có thể dùng chính endpoint này để dò xem một cặp tên bất kỳ có trong gia phả hay không.
  log_auth_attempt('verify', $fullName, false);
  json_error('Thông tin xác thực chưa đúng. Vui lòng kiểm tra lại họ tên, họ tên cha và ngày tế họ, hoặc liên hệ quản trị viên dòng họ.', 401);
}

$token = bin2hex(random_bytes(32));
$expiresAt = date('Y-m-d H:i:s', strtotime('+' . VIEWER_SESSION_DAYS . ' days'));
$stmt = $pdo->prepare(
  'INSERT INTO viewer_sessions (token, member_id, member_name, ip, expires_at) VALUES (?, ?, ?, ?, ?)'
);
$stmt->execute([
  $token,
  (string)($matched['id'] ?? ''),
  mb_substr((string)($matched['name'] ?? ''), 0, 150),
  get_client_ip(),
  $expiresAt,
]);

log_auth_attempt('verify', $fullName, true);

json_response([
  'success' => true,
  'viewerToken' => $token,
  'member' => [
    'id' => (string)($matched['id'] ?? ''),
    'name' => (string)($matched['name'] ?? ''),
  ],
  'expiresAt' => $expiresAt,
]);
