<?php
// Thông tin tài khoản đang đăng nhập, kèm QUYỀN của họ.
//
// Cần thiết vì quyền có thể đổi sau khi đã đăng nhập (quản trị viên sửa phân quyền), và vì
// các phiên đăng nhập có từ trước khi có hệ phân quyền này không hề lưu danh sách quyền.
// Giao diện gọi lúc khởi động để luôn dựng menu theo quyền THẬT chứ không theo bản cũ đã
// lưu trong máy người dùng.
require_once __DIR__ . '/helpers.php';
send_cors_headers();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
  json_error('Method not allowed', 405);
}

$user = require_auth();
$role = get_role_of($user);

json_response([
  'id' => (int)$user['id'],
  'username' => $user['username'],
  'fullName' => $user['full_name'],
  'role' => $user['role'],
  'roleName' => $role['name'] ?? $user['role'],
  'roleScope' => $role['scope'] ?? 'chi',
  'permissions' => get_permissions_of($user),
  'chiId' => $user['chi_id'] !== null ? (int)$user['chi_id'] : null,
  'yearAssigned' => $user['year_assigned'] !== null ? (int)$user['year_assigned'] : null,
]);
