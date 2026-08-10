<?php
require_once __DIR__ . '/helpers.php';
send_cors_headers();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  json_error('Method not allowed', 405);
}

$body = read_json_body();
$username = trim($body['username'] ?? '');
$password = (string)($body['password'] ?? '');

if ($username === '' || $password === '') {
  json_error('Vui lòng nhập tên đăng nhập và mật khẩu.');
}

$pdo = get_db();
$stmt = $pdo->prepare('SELECT id, password_hash FROM admin_users WHERE username = ?');
$stmt->execute([$username]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password_hash'])) {
  json_error('Tài khoản hoặc mật khẩu không chính xác!', 401);
}

// Tạo token ngẫu nhiên, hết hạn sau 30 ngày
$token = bin2hex(random_bytes(32));
$expiresAt = date('Y-m-d H:i:s', strtotime('+30 days'));

$stmt = $pdo->prepare('INSERT INTO admin_sessions (token, admin_id, expires_at) VALUES (?, ?, ?)');
$stmt->execute([$token, $user['id'], $expiresAt]);

json_response(['success' => true, 'token' => $token]);
