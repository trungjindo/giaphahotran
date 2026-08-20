<?php
require_once __DIR__ . '/helpers.php';
send_cors_headers();

$pdo = get_db();
$VALID_ROLES = ['admin', 'chi_admin', 'dich_ton', 'bai_bien'];

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
  // admin xem toàn bộ tài khoản; chi_admin/dich_ton chỉ xem được tài khoản trong đúng chi mình
  // (cần thiết để chọn người phân công bãi biện); bai_bien không được xem danh sách này.
  $currentUser = require_role(['admin', 'chi_admin', 'dich_ton']);

  if ($currentUser['role'] === 'admin') {
    $stmt = $pdo->query(
      'SELECT u.id, u.username, u.full_name, u.role, u.chi_id, u.year_assigned, c.name AS chi_name
       FROM users u
       LEFT JOIN chi c ON c.id = u.chi_id
       ORDER BY u.role, u.full_name'
    );
  } else {
    $stmt = $pdo->prepare(
      'SELECT u.id, u.username, u.full_name, u.role, u.chi_id, u.year_assigned, c.name AS chi_name
       FROM users u
       LEFT JOIN chi c ON c.id = u.chi_id
       WHERE u.chi_id = ?
       ORDER BY u.role, u.full_name'
    );
    $stmt->execute([(int)$currentUser['chi_id']]);
  }
  $rows = $stmt->fetchAll();
  $result = array_map(function ($row) {
    return [
      'id' => (int)$row['id'],
      'username' => $row['username'],
      'fullName' => $row['full_name'],
      'role' => $row['role'],
      'chiId' => $row['chi_id'] !== null ? (int)$row['chi_id'] : null,
      'chiName' => $row['chi_name'],
      'yearAssigned' => $row['year_assigned'] !== null ? (int)$row['year_assigned'] : null,
    ];
  }, $rows);
  json_response($result);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  require_role(['admin']);
  $body = read_json_body();
  $username = trim($body['username'] ?? '');
  $password = (string)($body['password'] ?? '');
  $fullName = trim($body['fullName'] ?? '');
  $role = $body['role'] ?? '';
  $chiId = isset($body['chiId']) && $body['chiId'] !== '' ? (int)$body['chiId'] : null;
  $yearAssigned = isset($body['yearAssigned']) && $body['yearAssigned'] !== '' ? (int)$body['yearAssigned'] : null;

  if ($username === '' || $password === '' || $fullName === '') {
    json_error('Vui lòng nhập đủ tên đăng nhập, mật khẩu và họ tên.');
  }
  if (!in_array($role, $VALID_ROLES, true)) {
    json_error('Vai trò không hợp lệ.');
  }
  if ($role !== 'admin' && $chiId === null) {
    json_error('Vui lòng chọn chi cho vai trò này.');
  }

  $stmt = $pdo->prepare('SELECT id FROM users WHERE username = ?');
  $stmt->execute([$username]);
  if ($stmt->fetch()) {
    json_error('Tên đăng nhập đã tồn tại.');
  }

  $hash = password_hash($password, PASSWORD_BCRYPT);
  $stmt = $pdo->prepare(
    'INSERT INTO users (username, password_hash, full_name, role, chi_id, year_assigned) VALUES (?, ?, ?, ?, ?, ?)'
  );
  $stmt->execute([$username, $hash, $fullName, $role, $chiId, $yearAssigned]);

  json_response(['success' => true, 'id' => (int)$pdo->lastInsertId()]);
}

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
  $currentUser = require_role(['admin']);
  $id = (int)($_GET['id'] ?? 0);
  if ($id <= 0) json_error('Thiếu id tài khoản cần cập nhật.');

  $body = read_json_body();
  $fullName = trim($body['fullName'] ?? '');
  $role = $body['role'] ?? '';
  $chiId = isset($body['chiId']) && $body['chiId'] !== '' ? (int)$body['chiId'] : null;
  $yearAssigned = isset($body['yearAssigned']) && $body['yearAssigned'] !== '' ? (int)$body['yearAssigned'] : null;
  $password = (string)($body['password'] ?? ''); // để trống nếu không đổi mật khẩu

  if ($fullName === '' || !in_array($role, $VALID_ROLES, true)) {
    json_error('Dữ liệu không hợp lệ.');
  }
  if ($role !== 'admin' && $chiId === null) {
    json_error('Vui lòng chọn chi cho vai trò này.');
  }

  // Không cho tự hạ quyền admin của chính mình để tránh tự khóa tài khoản duy nhất còn quyền quản trị
  if ((int)$currentUser['id'] === $id && $role !== 'admin') {
    $stmt = $pdo->query("SELECT COUNT(*) AS c FROM users WHERE role = 'admin'");
    if ((int)$stmt->fetch()['c'] <= 1) {
      json_error('Không thể hạ quyền tài khoản admin duy nhất còn lại.');
    }
  }

  if ($password !== '') {
    $hash = password_hash($password, PASSWORD_BCRYPT);
    $stmt = $pdo->prepare(
      'UPDATE users SET full_name = ?, role = ?, chi_id = ?, year_assigned = ?, password_hash = ? WHERE id = ?'
    );
    $stmt->execute([$fullName, $role, $chiId, $yearAssigned, $hash, $id]);

    // Đổi mật khẩu phải HUỶ MỌI PHIÊN CŨ của tài khoản đó. Nếu không, khi cấp lại mật khẩu
    // vì nghi ngờ bị lộ, token mà kẻ lạ đã lấy được vẫn dùng được thêm tới 30 ngày nữa —
    // tức là việc đổi mật khẩu không thực sự cắt được quyền truy cập.
    $pdo->prepare('DELETE FROM user_sessions WHERE user_id = ?')->execute([$id]);
  } else {
    $stmt = $pdo->prepare(
      'UPDATE users SET full_name = ?, role = ?, chi_id = ?, year_assigned = ? WHERE id = ?'
    );
    $stmt->execute([$fullName, $role, $chiId, $yearAssigned, $id]);
  }

  json_response(['success' => true]);
}

if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
  $currentUser = require_role(['admin']);
  $id = (int)($_GET['id'] ?? 0);
  if ($id <= 0) json_error('Thiếu id tài khoản cần xóa.');

  if ((int)$currentUser['id'] === $id) {
    json_error('Không thể tự xóa tài khoản đang đăng nhập.');
  }

  $stmt = $pdo->prepare('DELETE FROM users WHERE id = ?');
  $stmt->execute([$id]);

  json_response(['success' => true]);
}

json_error('Method not allowed', 405);
