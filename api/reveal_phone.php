<?php
require_once __DIR__ . '/helpers.php';
send_cors_headers();

// Endpoint công khai (không yêu cầu đăng nhập) — người xem thường vẫn được phép gọi điện,
// chỉ không được NHÌN THẤY số trên màn hình. Số điện thoại thật chỉ trả về đúng lúc bấm nút
// gọi, không đi kèm trong familyData (đã bị che ở data.php cho người chưa đăng nhập).

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
  json_error('Method not allowed', 405);
}

$pdo = get_db();
$memberId = trim($_GET['memberId'] ?? '');
if ($memberId === '') {
  json_error('Thiếu memberId.', 400);
}

// Giới hạn nhẹ theo IP để hạn chế việc dò quét số điện thoại hàng loạt qua endpoint này.
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$stmt = $pdo->prepare(
  "SELECT COUNT(*) AS c FROM phone_reveal_log WHERE ip = ? AND revealed_at > (NOW() - INTERVAL 1 MINUTE)"
);
$stmt->execute([$ip]);
if ((int)$stmt->fetch()['c'] >= 15) {
  json_error('Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút.', 429);
}

$tree = get_family_tree($pdo);
$member = $tree ? find_family_node($tree, $memberId) : null;
if ($member === null) {
  json_error('Không tìm thấy thành viên này.', 404);
}

$phone = trim($member['phone'] ?? '');
if ($phone === '') {
  json_error('Người này chưa có số điện thoại.', 404);
}

$log = $pdo->prepare('INSERT INTO phone_reveal_log (ip, member_id) VALUES (?, ?)');
$log->execute([$ip, $memberId]);

json_response(['phone' => $phone]);
