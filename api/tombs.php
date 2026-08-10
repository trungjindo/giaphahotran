<?php
require_once __DIR__ . '/helpers.php';
send_cors_headers();

$pdo = get_db();

// Tìm 1 node trong cây gia phả (JSON) theo id — dùng để xác thực memberId khi thêm/sửa mộ.
function find_family_node($node, string $id) {
  if (!is_array($node)) return null;
  if (($node['id'] ?? null) === $id) return $node;
  foreach ($node['children'] ?? [] as $child) {
    $found = find_family_node($child, $id);
    if ($found !== null) return $found;
  }
  return null;
}

function get_family_tree($pdo) {
  $stmt = $pdo->prepare('SELECT data_json FROM app_data WHERE data_key = ?');
  $stmt->execute(['familyData']);
  $row = $stmt->fetch();
  return $row ? json_decode($row['data_json'], true) : null;
}

function format_tomb($row) {
  return [
    'id' => (int)$row['id'],
    'memberId' => $row['member_id'],
    'latitude' => (float)$row['latitude'],
    'longitude' => (float)$row['longitude'],
    'photo' => $row['photo'],
    'description' => $row['description'],
    'interredDate' => $row['interred_date'],
    'createdAt' => $row['created_at'],
    'updatedAt' => $row['updated_at'],
  ];
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
  $stmt = $pdo->query('SELECT * FROM tombs ORDER BY created_at DESC');
  json_response(array_map('format_tomb', $stmt->fetchAll()));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $currentUser = require_role(['admin']);
  $body = read_json_body();

  $memberId = trim($body['memberId'] ?? '');
  $latitude = $body['latitude'] ?? null;
  $longitude = $body['longitude'] ?? null;
  $photo = trim($body['photo'] ?? '') ?: null;
  $description = trim($body['description'] ?? '') ?: null;
  $interredDate = trim($body['interredDate'] ?? '') ?: null;

  if ($memberId === '') json_error('Vui lòng chọn người an táng.');
  if (!is_numeric($latitude) || !is_numeric($longitude)) json_error('Vui lòng nhập tọa độ GPS hợp lệ.');
  $latitude = (float)$latitude;
  $longitude = (float)$longitude;
  if ($latitude < -90 || $latitude > 90 || $longitude < -180 || $longitude > 180) {
    json_error('Tọa độ GPS ngoài phạm vi hợp lệ.');
  }

  $tree = get_family_tree($pdo);
  $member = $tree ? find_family_node($tree, $memberId) : null;
  if ($member === null) json_error('Không tìm thấy người này trong cây gia phả.', 404);
  if (!empty($member['isAlive'])) json_error('Chỉ có thể ghi nhận vị trí lăng mộ cho người đã mất.');

  $stmt = $pdo->prepare('SELECT id FROM tombs WHERE member_id = ?');
  $stmt->execute([$memberId]);
  if ($stmt->fetch()) json_error('Người này đã có vị trí lăng mộ được ghi nhận. Vui lòng sửa mục hiện có thay vì tạo mới.');

  $stmt = $pdo->prepare(
    'INSERT INTO tombs (member_id, latitude, longitude, photo, description, interred_date, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  $stmt->execute([$memberId, $latitude, $longitude, $photo, $description, $interredDate, $currentUser['id']]);

  json_response(['success' => true, 'id' => (int)$pdo->lastInsertId()]);
}

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
  require_role(['admin']);
  $id = (int)($_GET['id'] ?? 0);
  if ($id <= 0) json_error('Thiếu id vị trí lăng mộ cần cập nhật.');

  $body = read_json_body();
  $memberId = trim($body['memberId'] ?? '');
  $latitude = $body['latitude'] ?? null;
  $longitude = $body['longitude'] ?? null;
  $photo = trim($body['photo'] ?? '') ?: null;
  $description = trim($body['description'] ?? '') ?: null;
  $interredDate = trim($body['interredDate'] ?? '') ?: null;

  if ($memberId === '') json_error('Vui lòng chọn người an táng.');
  if (!is_numeric($latitude) || !is_numeric($longitude)) json_error('Vui lòng nhập tọa độ GPS hợp lệ.');
  $latitude = (float)$latitude;
  $longitude = (float)$longitude;
  if ($latitude < -90 || $latitude > 90 || $longitude < -180 || $longitude > 180) {
    json_error('Tọa độ GPS ngoài phạm vi hợp lệ.');
  }

  $tree = get_family_tree($pdo);
  $member = $tree ? find_family_node($tree, $memberId) : null;
  if ($member === null) json_error('Không tìm thấy người này trong cây gia phả.', 404);
  if (!empty($member['isAlive'])) json_error('Chỉ có thể ghi nhận vị trí lăng mộ cho người đã mất.');

  $stmt = $pdo->prepare('SELECT id FROM tombs WHERE member_id = ? AND id != ?');
  $stmt->execute([$memberId, $id]);
  if ($stmt->fetch()) json_error('Người này đã có vị trí lăng mộ được ghi nhận ở một mục khác.');

  $stmt = $pdo->prepare(
    'UPDATE tombs SET member_id = ?, latitude = ?, longitude = ?, photo = ?, description = ?, interred_date = ?
     WHERE id = ?'
  );
  $stmt->execute([$memberId, $latitude, $longitude, $photo, $description, $interredDate, $id]);

  json_response(['success' => true]);
}

if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
  require_role(['admin']);
  $id = (int)($_GET['id'] ?? 0);
  if ($id <= 0) json_error('Thiếu id vị trí lăng mộ cần xóa.');

  $stmt = $pdo->prepare('DELETE FROM tombs WHERE id = ?');
  $stmt->execute([$id]);

  json_response(['success' => true]);
}

json_error('Method not allowed', 405);
