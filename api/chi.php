<?php
require_once __DIR__ . '/helpers.php';
send_cors_headers();

$pdo = get_db();

// find_family_node() và get_family_tree() dùng chung từ helpers.php.

// Đếm số thành viên trong 1 nhánh cây (gồm chính người gốc)
function count_family_node($node): int {
  if (!is_array($node)) return 0;
  $count = 1;
  foreach ($node['children'] ?? [] as $child) {
    $count += count_family_node($child);
  }
  return $count;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
  $stmt = $pdo->query('SELECT id, name, root_member_id, description, created_at FROM chi ORDER BY name');
  $rows = $stmt->fetchAll();

  $tree = get_family_tree($pdo);
  $result = array_map(function ($row) use ($tree) {
    $node = $tree ? find_family_node($tree, $row['root_member_id']) : null;
    return [
      'id' => (int)$row['id'],
      'name' => $row['name'],
      'rootMemberId' => $row['root_member_id'],
      'rootMemberName' => $node['name'] ?? null,
      'description' => $row['description'],
      'memberCount' => $node ? count_family_node($node) : 0,
    ];
  }, $rows);

  json_response($result);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  require_role(['admin']);
  $body = read_json_body();
  $name = trim($body['name'] ?? '');
  $rootMemberId = trim($body['rootMemberId'] ?? '');
  $description = trim($body['description'] ?? '');

  if ($name === '' || $rootMemberId === '') {
    json_error('Vui lòng nhập tên chi và chọn người làm gốc chi.');
  }

  $tree = get_family_tree($pdo);
  if (!$tree || find_family_node($tree, $rootMemberId) === null) {
    json_error('Không tìm thấy người này trong cây gia phả.');
  }

  $stmt = $pdo->prepare('INSERT INTO chi (name, root_member_id, description) VALUES (?, ?, ?)');
  $stmt->execute([$name, $rootMemberId, $description]);

  json_response(['success' => true, 'id' => (int)$pdo->lastInsertId()]);
}

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
  require_role(['admin']);
  $id = (int)($_GET['id'] ?? 0);
  if ($id <= 0) json_error('Thiếu id chi cần cập nhật.');

  $body = read_json_body();
  $name = trim($body['name'] ?? '');
  $rootMemberId = trim($body['rootMemberId'] ?? '');
  $description = trim($body['description'] ?? '');

  if ($name === '' || $rootMemberId === '') {
    json_error('Vui lòng nhập tên chi và chọn người làm gốc chi.');
  }

  $tree = get_family_tree($pdo);
  if (!$tree || find_family_node($tree, $rootMemberId) === null) {
    json_error('Không tìm thấy người này trong cây gia phả.');
  }

  $stmt = $pdo->prepare('UPDATE chi SET name = ?, root_member_id = ?, description = ? WHERE id = ?');
  $stmt->execute([$name, $rootMemberId, $description, $id]);

  json_response(['success' => true]);
}

if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
  require_role(['admin']);
  $id = (int)($_GET['id'] ?? 0);
  if ($id <= 0) json_error('Thiếu id chi cần xóa.');

  // Tài khoản đang gán vào chi này sẽ tự động về chi_id = NULL (xem FK ON DELETE SET NULL
  // trong schema.sql) — coi như bị khóa quyền tạm thời cho tới khi admin gán lại chi khác.
  $stmt = $pdo->prepare('DELETE FROM chi WHERE id = ?');
  $stmt->execute([$id]);

  json_response(['success' => true]);
}

json_error('Method not allowed', 405);
