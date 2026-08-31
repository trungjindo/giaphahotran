<?php
// Danh mục LĂNG (khu an táng chung): lăng tổ, lăng của chi, lăng gia đình.
// Ghim vị trí đúng 1 lần ở đây, sau đó gán người an táng vào lăng theo tên (xem tombs.php)
// — thay vì bắt mỗi người nhập lại một cặp tọa độ gần giống nhau.
require_once __DIR__ . '/helpers.php';
send_cors_headers();

$pdo = get_db();

function format_tomb_site($row) {
  return [
    'id' => (int)$row['id'],
    'name' => $row['name'],
    'chiId' => $row['chi_id'] === null ? null : (int)$row['chi_id'],
    'chiName' => $row['chi_name'] ?? null,
    'latitude' => (float)$row['latitude'],
    'longitude' => (float)$row['longitude'],
    'address' => $row['address'],
    'photo' => $row['photo'],
    'description' => $row['description'],
    // Số người đã được gán vào lăng này — dùng để hiện "(N người)" trong ô tìm lăng và để
    // chặn xóa nhầm một lăng đang có người bên trong.
    'memberCount' => isset($row['member_count']) ? (int)$row['member_count'] : 0,
    'createdAt' => $row['created_at'],
    'updatedAt' => $row['updated_at'],
  ];
}

// Đọc + kiểm tra các trường dùng chung cho cả POST và PUT.
function read_tomb_site_input(PDO $pdo): array {
  $body = read_json_body();

  $name = trim($body['name'] ?? '');
  $latitude = $body['latitude'] ?? null;
  $longitude = $body['longitude'] ?? null;
  $address = trim($body['address'] ?? '') ?: null;
  $photo = trim($body['photo'] ?? '') ?: null;
  $description = trim($body['description'] ?? '') ?: null;
  $chiId = $body['chiId'] ?? null;

  if ($name === '') json_error('Vui lòng nhập tên lăng.');
  if (mb_strlen($name) > 200) json_error('Tên lăng quá dài (tối đa 200 ký tự).');
  if (!is_numeric($latitude) || !is_numeric($longitude)) json_error('Vui lòng chọn vị trí lăng trên bản đồ.');

  $latitude = (float)$latitude;
  $longitude = (float)$longitude;
  if ($latitude < -90 || $latitude > 90 || $longitude < -180 || $longitude > 180) {
    json_error('Tọa độ GPS ngoài phạm vi hợp lệ.');
  }

  if ($chiId === '' || $chiId === null) {
    $chiId = null; // lăng chung của cả họ
  } else {
    $chiId = (int)$chiId;
    $stmt = $pdo->prepare('SELECT id FROM chi WHERE id = ?');
    $stmt->execute([$chiId]);
    if (!$stmt->fetch()) json_error('Không tìm thấy chi đã chọn.', 404);
  }

  return compact('name', 'chiId', 'latitude', 'longitude', 'address', 'photo', 'description');
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
  require_family_access(); // Dữ liệu riêng của dòng họ — chỉ con cháu đã xác thực mới được đọc.
  $stmt = $pdo->query(
    'SELECT s.*, c.name AS chi_name, (SELECT COUNT(*) FROM tombs t WHERE t.site_id = s.id) AS member_count
     FROM tomb_sites s
     LEFT JOIN chi c ON c.id = s.chi_id
     ORDER BY s.name ASC'
  );
  json_response(array_map('format_tomb_site', $stmt->fetchAll()));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $currentUser = require_role(['admin']);
  $in = read_tomb_site_input($pdo);

  $stmt = $pdo->prepare(
    'INSERT INTO tomb_sites (name, chi_id, latitude, longitude, address, photo, description, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );
  $stmt->execute([
    $in['name'], $in['chiId'], $in['latitude'], $in['longitude'],
    $in['address'], $in['photo'], $in['description'], $currentUser['id'],
  ]);

  json_response(['success' => true, 'id' => (int)$pdo->lastInsertId()]);
}

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
  require_role(['admin']);
  $id = (int)($_GET['id'] ?? 0);
  if ($id <= 0) json_error('Thiếu id lăng cần cập nhật.');

  $stmt = $pdo->prepare('SELECT id FROM tomb_sites WHERE id = ?');
  $stmt->execute([$id]);
  if (!$stmt->fetch()) json_error('Không tìm thấy lăng cần cập nhật.', 404);

  $in = read_tomb_site_input($pdo);

  $stmt = $pdo->prepare(
    'UPDATE tomb_sites SET name = ?, chi_id = ?, latitude = ?, longitude = ?, address = ?, photo = ?, description = ?
     WHERE id = ?'
  );
  $stmt->execute([
    $in['name'], $in['chiId'], $in['latitude'], $in['longitude'],
    $in['address'], $in['photo'], $in['description'], $id,
  ]);

  json_response(['success' => true]);
}

if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
  require_role(['admin']);
  $id = (int)($_GET['id'] ?? 0);
  if ($id <= 0) json_error('Thiếu id lăng cần xóa.');

  // Người trong lăng KHÔNG có tọa độ riêng (lấy từ lăng), nên xóa lăng khi vẫn còn người
  // bên trong sẽ làm họ biến mất khỏi bản đồ mà không ai hay. Bắt chuyển người đi trước.
  $stmt = $pdo->prepare('SELECT COUNT(*) FROM tombs WHERE site_id = ?');
  $stmt->execute([$id]);
  $count = (int)$stmt->fetchColumn();
  if ($count > 0) {
    json_error("Lăng này đang có $count người an táng. Hãy chuyển họ sang lăng khác hoặc sang mộ riêng trước khi xóa lăng.");
  }

  $stmt = $pdo->prepare('DELETE FROM tomb_sites WHERE id = ?');
  $stmt->execute([$id]);

  json_response(['success' => true]);
}

json_error('Method not allowed', 405);
