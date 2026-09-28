<?php
require_once __DIR__ . '/helpers.php';
send_cors_headers();

$pdo = get_db();

// ---- Rào chắn leo thang đặc quyền ----
//
// Quyền 'users.manage' giờ có thể cấp cho vai trò do quản trị viên tự tạo, nên mọi thao tác
// ở đây phải tự kiểm tra lại: người đang thao tác có được phép đụng tới ĐÚNG tài khoản này,
// và có được phép cấp ĐÚNG vai trò này không. Thiếu các kiểm tra đó thì một quản trị chi có
// thể tự tạo cho mình một tài khoản toàn quyền, hoặc xóa luôn tài khoản quản trị hệ thống.

function load_role_or_fail(string $code): array {
  $stmt = get_db()->prepare('SELECT * FROM roles WHERE code = ?');
  $stmt->execute([$code]);
  $role = $stmt->fetch();
  if (!$role) json_error('Vai trò không hợp lệ hoặc đã bị xóa.');
  return $role;
}

// Vai trò này có mang quyền hệ thống không (chỉ Quản trị hệ thống mới được cấp)?
function role_has_system_permission(array $role): bool {
  if ($role['code'] === 'admin') return true;
  $stmt = get_db()->prepare('SELECT permission FROM role_permissions WHERE role_id = ?');
  $stmt->execute([$role['id']]);
  foreach ($stmt->fetchAll() as $row) {
    if (is_system_permission($row['permission'])) return true;
  }
  return false;
}

// Người đang thao tác có được cấp vai trò này cho ai đó không?
function assert_can_assign_role(array $actor, array $role, ?int $chiId): void {
  $actorIsAdmin = ($actor['role'] ?? '') === 'admin';

  if (!$actorIsAdmin && role_has_system_permission($role)) {
    json_error('Chỉ Quản trị hệ thống mới được cấp vai trò có quyền hệ thống.', 403);
  }

  // Người quản lý trong phạm vi một chi chỉ được tạo tài khoản phạm vi chi, và đúng chi mình.
  if (user_is_chi_scoped($actor)) {
    if ($role['scope'] !== 'chi') {
      json_error('Bạn chỉ được cấp các vai trò trong phạm vi chi.', 403);
    }
    if ($chiId === null || (int)$actor['chi_id'] !== $chiId) {
      json_error('Bạn chỉ được tạo tài khoản cho chi của mình.', 403);
    }
  }

  if ($role['scope'] === 'chi' && $chiId === null) {
    json_error('Vui lòng chọn chi cho vai trò này.');
  }
}

// Người đang thao tác có được sửa/xóa tài khoản đích không?
function assert_can_manage_user(array $actor, array $target): void {
  if (($actor['role'] ?? '') === 'admin') return;

  // Không ai ngoài Quản trị hệ thống được đụng vào tài khoản có quyền hệ thống.
  $targetRole = load_role_or_fail($target['role']);
  if (role_has_system_permission($targetRole)) {
    json_error('Bạn không có quyền thao tác trên tài khoản này.', 403);
  }

  if (user_is_chi_scoped($actor)
      && (int)$actor['chi_id'] !== (int)$target['chi_id']) {
    json_error('Bạn chỉ được quản lý tài khoản trong chi của mình.', 403);
  }
}

function fetch_user_or_fail(int $id): array {
  $stmt = get_db()->prepare('SELECT * FROM users WHERE id = ?');
  $stmt->execute([$id]);
  $row = $stmt->fetch();
  if (!$row) json_error('Không tìm thấy tài khoản.', 404);
  return $row;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
  // Người quản lý phạm vi cả dòng họ xem được toàn bộ; phạm vi chi chỉ xem tài khoản
  // trong đúng chi mình (cần để chọn người phân công bãi biện).
  $currentUser = require_permission('users.manage');

  $sql = 'SELECT u.id, u.username, u.full_name, u.role, u.chi_id, u.year_assigned,
                 c.name AS chi_name, r.name AS role_name, r.scope AS role_scope
          FROM users u
          LEFT JOIN chi c ON c.id = u.chi_id
          LEFT JOIN roles r ON r.code = u.role';

  if (user_is_chi_scoped($currentUser)) {
    $stmt = $pdo->prepare($sql . ' WHERE u.chi_id = ? ORDER BY u.role, u.full_name');
    $stmt->execute([(int)$currentUser['chi_id']]);
  } else {
    $stmt = $pdo->query($sql . ' ORDER BY u.role, u.full_name');
  }

  json_response(array_map(function ($row) {
    return [
      'id' => (int)$row['id'],
      'username' => $row['username'],
      'fullName' => $row['full_name'],
      'role' => $row['role'],
      // Tên vai trò lấy từ bảng roles; null nghĩa là vai trò đã bị xóa -> giao diện báo để sửa.
      'roleName' => $row['role_name'],
      'roleScope' => $row['role_scope'],
      'chiId' => $row['chi_id'] !== null ? (int)$row['chi_id'] : null,
      'chiName' => $row['chi_name'],
      'yearAssigned' => $row['year_assigned'] !== null ? (int)$row['year_assigned'] : null,
    ];
  }, $stmt->fetchAll()));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $currentUser = require_permission('users.manage');
  $body = read_json_body();

  $username = trim($body['username'] ?? '');
  $password = (string)($body['password'] ?? '');
  $fullName = trim($body['fullName'] ?? '');
  $roleCode = $body['role'] ?? '';
  $chiId = isset($body['chiId']) && $body['chiId'] !== '' ? (int)$body['chiId'] : null;
  $yearAssigned = isset($body['yearAssigned']) && $body['yearAssigned'] !== '' ? (int)$body['yearAssigned'] : null;

  if ($username === '' || $password === '' || $fullName === '') {
    json_error('Vui lòng nhập đủ tên đăng nhập, mật khẩu và họ tên.');
  }

  $role = load_role_or_fail($roleCode);
  assert_can_assign_role($currentUser, $role, $chiId);
  if ($role['scope'] !== 'chi') $chiId = null; // vai trò phạm vi dòng họ không gắn chi

  $stmt = $pdo->prepare('SELECT id FROM users WHERE username = ?');
  $stmt->execute([$username]);
  if ($stmt->fetch()) json_error('Tên đăng nhập đã tồn tại.');

  $hash = password_hash($password, PASSWORD_BCRYPT);
  $stmt = $pdo->prepare(
    'INSERT INTO users (username, password_hash, full_name, role, chi_id, year_assigned) VALUES (?, ?, ?, ?, ?, ?)'
  );
  $stmt->execute([$username, $hash, $fullName, $roleCode, $chiId, $yearAssigned]);

  json_response(['success' => true, 'id' => (int)$pdo->lastInsertId()]);
}

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
  $currentUser = require_permission('users.manage');
  $id = (int)($_GET['id'] ?? 0);
  if ($id <= 0) json_error('Thiếu id tài khoản cần cập nhật.');

  $target = fetch_user_or_fail($id);
  assert_can_manage_user($currentUser, $target);

  $body = read_json_body();
  $fullName = trim($body['fullName'] ?? '');
  $roleCode = $body['role'] ?? '';
  $chiId = isset($body['chiId']) && $body['chiId'] !== '' ? (int)$body['chiId'] : null;
  $yearAssigned = isset($body['yearAssigned']) && $body['yearAssigned'] !== '' ? (int)$body['yearAssigned'] : null;
  $password = (string)($body['password'] ?? ''); // để trống nếu không đổi mật khẩu

  if ($fullName === '') json_error('Dữ liệu không hợp lệ.');

  $role = load_role_or_fail($roleCode);
  assert_can_assign_role($currentUser, $role, $chiId);
  if ($role['scope'] !== 'chi') $chiId = null;

  // Không để mất tài khoản Quản trị hệ thống cuối cùng — nếu không sẽ không còn ai vào sửa
  // phân quyền được nữa.
  if ($target['role'] === 'admin' && $roleCode !== 'admin') {
    $remaining = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE role = 'admin'")->fetchColumn();
    if ($remaining <= 1) json_error('Không thể hạ quyền tài khoản Quản trị hệ thống duy nhất còn lại.');
  }

  if ($password !== '') {
    $hash = password_hash($password, PASSWORD_BCRYPT);
    $stmt = $pdo->prepare(
      'UPDATE users SET full_name = ?, role = ?, chi_id = ?, year_assigned = ?, password_hash = ? WHERE id = ?'
    );
    $stmt->execute([$fullName, $roleCode, $chiId, $yearAssigned, $hash, $id]);

    // Đổi mật khẩu phải HUỶ MỌI PHIÊN CŨ của tài khoản đó. Nếu không, khi cấp lại mật khẩu
    // vì nghi ngờ bị lộ, token mà kẻ lạ đã lấy được vẫn dùng được thêm tới 30 ngày nữa —
    // tức là việc đổi mật khẩu không thực sự cắt được quyền truy cập.
    $pdo->prepare('DELETE FROM user_sessions WHERE user_id = ?')->execute([$id]);
  } else {
    $stmt = $pdo->prepare(
      'UPDATE users SET full_name = ?, role = ?, chi_id = ?, year_assigned = ? WHERE id = ?'
    );
    $stmt->execute([$fullName, $roleCode, $chiId, $yearAssigned, $id]);
  }

  // Đổi vai trò cũng phải huỷ phiên cũ: quyền được nạp lúc đăng nhập, không huỷ thì người
  // vừa bị hạ quyền vẫn giữ nguyên quyền cũ cho tới khi token hết hạn.
  if ($target['role'] !== $roleCode) {
    $pdo->prepare('DELETE FROM user_sessions WHERE user_id = ?')->execute([$id]);
  }

  json_response(['success' => true]);
}

if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
  $currentUser = require_permission('users.manage');
  $id = (int)($_GET['id'] ?? 0);
  if ($id <= 0) json_error('Thiếu id tài khoản cần xóa.');

  if ((int)$currentUser['id'] === $id) {
    json_error('Không thể tự xóa tài khoản đang đăng nhập.');
  }

  $target = fetch_user_or_fail($id);
  assert_can_manage_user($currentUser, $target);

  if ($target['role'] === 'admin') {
    $remaining = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE role = 'admin'")->fetchColumn();
    if ($remaining <= 1) json_error('Không thể xóa tài khoản Quản trị hệ thống duy nhất còn lại.');
  }

  $pdo->prepare('DELETE FROM users WHERE id = ?')->execute([$id]);
  json_response(['success' => true]);
}

json_error('Method not allowed', 405);
