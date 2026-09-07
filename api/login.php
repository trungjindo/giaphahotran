<?php
require_once __DIR__ . '/helpers.php';
send_cors_headers();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  json_error('Method not allowed', 405);
}

const LOGIN_WINDOW_MINUTES = 15;
const LOGIN_MAX_FAILURES_PER_IP = 15;      // chặn quét nhiều tài khoản từ cùng 1 máy
const LOGIN_MAX_FAILURES_PER_ACCOUNT = 5;  // chặn dò mật khẩu của 1 tài khoản cụ thể

$body = read_json_body();
$username = trim($body['username'] ?? '');
$password = (string)($body['password'] ?? '');

if ($username === '' || $password === '') {
  json_error('Vui lòng nhập tên đăng nhập và mật khẩu.');
}

// Khoá tạm khi có dấu hiệu dò mật khẩu. Đếm cả theo IP lẫn theo tài khoản: chỉ đếm theo IP
// thì đổi IP là thoát; chỉ đếm theo tài khoản thì lại cho phép quét lần lượt nhiều tài khoản.
if (count_recent_auth_failures('login', null, LOGIN_WINDOW_MINUTES) >= LOGIN_MAX_FAILURES_PER_IP
    || count_recent_auth_failures('login', $username, LOGIN_WINDOW_MINUTES) >= LOGIN_MAX_FAILURES_PER_ACCOUNT) {
  json_error('Đăng nhập sai quá nhiều lần. Vui lòng thử lại sau ' . LOGIN_WINDOW_MINUTES . ' phút, hoặc liên hệ quản trị viên để được cấp lại mật khẩu.', 429);
}

$pdo = get_db();
$stmt = $pdo->prepare('SELECT id, password_hash, full_name, role, chi_id, year_assigned FROM users WHERE username = ?');
$stmt->execute([$username]);
$user = $stmt->fetch();

// Không có tài khoản thì vẫn chạy password_verify với 1 hash giả, để thời gian phản hồi
// của "sai tên đăng nhập" và "sai mật khẩu" xấp xỉ nhau — nếu bỏ qua bước này, kẻ tấn công
// đo thời gian phản hồi là biết được tên đăng nhập nào có thật.
const DUMMY_HASH = '$2y$10$usesomesillystringfoxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
$passwordOk = $user
  ? password_verify($password, $user['password_hash'])
  : (password_verify($password, DUMMY_HASH) && false);

if (!$user || !$passwordOk) {
  log_auth_attempt('login', $username, false);
  json_error('Tài khoản hoặc mật khẩu không chính xác!', 401);
}

log_auth_attempt('login', $username, true);

// Tạo token ngẫu nhiên, hết hạn sau 30 ngày
$token = bin2hex(random_bytes(32));
$expiresAt = date('Y-m-d H:i:s', strtotime('+30 days'));

$stmt = $pdo->prepare('INSERT INTO user_sessions (token, user_id, expires_at) VALUES (?, ?, ?)');
$stmt->execute([$token, $user['id'], $expiresAt]);

json_response([
  'success' => true,
  'token' => $token,
  'user' => [
    'id' => (int)$user['id'],
    'username' => $username,
    'fullName' => $user['full_name'],
    'role' => $user['role'],
    'chiId' => $user['chi_id'] !== null ? (int)$user['chi_id'] : null,
    'yearAssigned' => $user['year_assigned'] !== null ? (int)$user['year_assigned'] : null,
  ],
]);
