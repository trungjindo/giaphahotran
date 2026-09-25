<?php
// Quản lý VAI TRÒ và phân quyền. Chỉ tài khoản có quyền 'system.roles' được đụng vào.
require_once __DIR__ . '/helpers.php';
send_cors_headers();

$pdo = get_db();

function format_role(array $row, array $permissions): array {
  return [
    'id' => (int)$row['id'],
    'code' => $row['code'],
    'name' => $row['name'],
    'description' => $row['description'],
    'scope' => $row['scope'],            // 'clan' | 'chi'
    'isSystem' => (int)$row['is_system'] === 1,
    'permissions' => $permissions,
    'userCount' => (int)($row['user_count'] ?? 0),
  ];
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
  require_permission('system.roles');

  $stmt = $pdo->query(
    'SELECT r.*, (SELECT COUNT(*) FROM users u WHERE u.role = r.code) AS user_count
     FROM roles r ORDER BY r.is_system DESC, r.name ASC'
  );
  $roles = $stmt->fetchAll();

  $permsByRole = [];
  foreach ($pdo->query('SELECT role_id, permission FROM role_permissions')->fetchAll() as $row) {
    $permsByRole[(int)$row['role_id']][] = $row['permission'];
  }

  json_response([
    // Danh mục quyền do code định nghĩa — giao diện dựng các ô tích từ đây, nên thêm quyền
    // mới trong permissions.php là màn hình tự có ngay, không phải sửa giao diện.
    'catalog' => PERMISSION_CATALOG,
    'roles' => array_map(function ($r) use ($permsByRole) {
      // Vai trò 'admin' luôn có mọi quyền (xem helpers.php#get_permissions_of) — trả về đủ
      // danh mục để màn hình hiện đúng thực tế thay vì một danh sách trống gây hiểu nhầm.
      $perms = $r['code'] === 'admin'
        ? all_permission_keys()
        : ($permsByRole[(int)$r['id']] ?? []);
      return format_role($r, $perms);
    }, $roles),
  ]);
}

function read_role_input(): array {
  $body = read_json_body();
  $name = trim($body['name'] ?? '');
  $description = trim($body['description'] ?? '') ?: null;
  $scope = ($body['scope'] ?? 'clan') === 'chi' ? 'chi' : 'clan';
  $permissions = is_array($body['permissions'] ?? null) ? $body['permissions'] : [];

  if ($name === '') json_error('Vui lòng nhập tên vai trò.');
  if (mb_strlen($name) > 100) json_error('Tên vai trò quá dài (tối đa 100 ký tự).');

  $permissions = array_values(array_unique(array_filter($permissions, 'is_valid_permission')));
  return compact('name', 'description', 'scope', 'permissions');
}

function save_permissions(int $roleId, array $permissions): void {
  $pdo = get_db();
  $pdo->prepare('DELETE FROM role_permissions WHERE role_id = ?')->execute([$roleId]);
  if (!$permissions) return;
  $stmt = $pdo->prepare('INSERT INTO role_permissions (role_id, permission) VALUES (?, ?)');
  foreach ($permissions as $perm) $stmt->execute([$roleId, $perm]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  require_permission('system.roles');
  $in = read_role_input();

  // Mã vai trò sinh từ tên, chỉ dùng nội bộ để nối với users.role.
  $base = preg_replace('/[^a-z0-9]+/', '_', strtolower(normalize_vn_name($in['name'])));
  $base = trim($base, '_') ?: 'vai_tro';
  $code = $base;
  $i = 2;
  while (true) {
    $stmt = $pdo->prepare('SELECT id FROM roles WHERE code = ?');
    $stmt->execute([$code]);
    if (!$stmt->fetch()) break;
    $code = $base . '_' . $i++;
  }

  $stmt = $pdo->prepare('INSERT INTO roles (code, name, description, scope, is_system) VALUES (?, ?, ?, ?, 0)');
  $stmt->execute([$code, $in['name'], $in['description'], $in['scope']]);
  $roleId = (int)$pdo->lastInsertId();
  save_permissions($roleId, $in['permissions']);

  json_response(['success' => true, 'id' => $roleId, 'code' => $code]);
}

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
  require_permission('system.roles');
  $id = (int)($_GET['id'] ?? 0);
  if ($id <= 0) json_error('Thiếu id vai trò cần cập nhật.');

  $stmt = $pdo->prepare('SELECT * FROM roles WHERE id = ?');
  $stmt->execute([$id]);
  $role = $stmt->fetch();
  if (!$role) json_error('Không tìm thấy vai trò.', 404);

  // Vai trò Quản trị hệ thống luôn có mọi quyền và không được sửa — đây là lối vào cuối
  // cùng để cứu hệ thống nếu phân quyền bị cấu hình sai.
  if ($role['code'] === 'admin') {
    json_error('Vai trò Quản trị hệ thống luôn có toàn quyền và không thể chỉnh sửa.', 403);
  }

  $in = read_role_input();

  // Đổi phạm vi của vai trò đang có người dùng sẽ làm lệch dữ liệu chi của họ (vai trò chi
  // bắt buộc có chi, vai trò dòng họ thì không) — bắt chuyển người ra trước.
  if ($role['scope'] !== $in['scope']) {
    $count = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE role = " . $pdo->quote($role['code']))->fetchColumn();
    if ($count > 0) {
      json_error("Vai trò này đang có $count tài khoản. Hãy chuyển họ sang vai trò khác trước khi đổi phạm vi.");
    }
  }

  $stmt = $pdo->prepare('UPDATE roles SET name = ?, description = ?, scope = ? WHERE id = ?');
  $stmt->execute([$in['name'], $in['description'], $in['scope'], $id]);
  save_permissions($id, $in['permissions']);

  // Quyền được nạp lúc đăng nhập, nên đổi quyền phải huỷ phiên của mọi người mang vai trò
  // này — nếu không họ vẫn giữ quyền cũ tới khi token hết hạn.
  $pdo->prepare('DELETE FROM user_sessions WHERE user_id IN (SELECT id FROM users WHERE role = ?)')
      ->execute([$role['code']]);

  json_response(['success' => true]);
}

if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
  require_permission('system.roles');
  $id = (int)($_GET['id'] ?? 0);
  if ($id <= 0) json_error('Thiếu id vai trò cần xóa.');

  $stmt = $pdo->prepare('SELECT * FROM roles WHERE id = ?');
  $stmt->execute([$id]);
  $role = $stmt->fetch();
  if (!$role) json_error('Không tìm thấy vai trò.', 404);

  if ((int)$role['is_system'] === 1) {
    json_error('Đây là vai trò lõi của hệ thống, không thể xóa. Bạn có thể sửa quyền của nó.');
  }

  // Xóa vai trò khi còn người đang mang nó sẽ khiến họ mất sạch quyền mà không ai hay.
  $stmt = $pdo->prepare('SELECT COUNT(*) FROM users WHERE role = ?');
  $stmt->execute([$role['code']]);
  $count = (int)$stmt->fetchColumn();
  if ($count > 0) {
    json_error("Vai trò này đang có $count tài khoản. Hãy chuyển họ sang vai trò khác trước khi xóa.");
  }

  $pdo->prepare('DELETE FROM roles WHERE id = ?')->execute([$id]);
  json_response(['success' => true]);
}

json_error('Method not allowed', 405);
