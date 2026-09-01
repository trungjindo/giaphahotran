<?php
require_once __DIR__ . '/helpers.php';
send_cors_headers();

$pdo = get_db();

// find_family_node() và get_family_tree() dùng chung từ helpers.php.

// Tọa độ hiển thị của một người: nếu nằm trong LĂNG thì lấy tọa độ của lăng (mọi người
// cùng lăng dùng chung 1 ghim), ngược lại là mộ riêng lẻ nên dùng tọa độ của chính bản ghi.
function format_tomb($row) {
  $inSite = $row['site_id'] !== null;
  $lat = $inSite ? $row['site_lat'] : $row['latitude'];
  $lng = $inSite ? $row['site_lng'] : $row['longitude'];

  return [
    'id' => (int)$row['id'],
    'memberId' => $row['member_id'],
    'siteId' => $inSite ? (int)$row['site_id'] : null,
    'siteName' => $row['site_name'] ?? null,
    'siteAddress' => $row['site_address'] ?? null,
    'latitude' => $lat === null ? null : (float)$lat,
    'longitude' => $lng === null ? null : (float)$lng,
    'photo' => $row['photo'],
    'description' => $row['description'],
    'interredDate' => $row['interred_date'],
    'createdAt' => $row['created_at'],
    'updatedAt' => $row['updated_at'],
  ];
}

const TOMB_SELECT_SQL =
  'SELECT t.*, s.name AS site_name, s.address AS site_address,
          s.latitude AS site_lat, s.longitude AS site_lng
   FROM tombs t
   LEFT JOIN tomb_sites s ON s.id = t.site_id';

// Đọc + kiểm tra dữ liệu gửi lên, dùng chung cho POST và PUT.
// Người an táng hoặc nằm TRONG LĂNG (chỉ cần chọn tên lăng, tọa độ lấy từ lăng),
// hoặc là MỘ RIÊNG LẺ (phải tự có tọa độ) — không bao giờ cả hai.
function read_tomb_input(PDO $pdo): array {
  $body = read_json_body();

  $memberId = trim($body['memberId'] ?? '');
  $siteId = $body['siteId'] ?? null;
  $photo = trim($body['photo'] ?? '') ?: null;
  $description = trim($body['description'] ?? '') ?: null;
  $interredDate = trim($body['interredDate'] ?? '') ?: null;

  if ($memberId === '') json_error('Vui lòng chọn người an táng.');

  $tree = get_family_tree($pdo);
  $member = $tree ? find_family_node($tree, $memberId) : null;
  if ($member === null) json_error('Không tìm thấy người này trong cây gia phả.', 404);
  if (!empty($member['isAlive'])) json_error('Chỉ có thể ghi nhận vị trí lăng mộ cho người đã mất.');

  if ($siteId === '' || $siteId === null) {
    // Mộ riêng lẻ: bắt buộc có tọa độ của chính nó.
    $latitude = $body['latitude'] ?? null;
    $longitude = $body['longitude'] ?? null;
    if (!is_numeric($latitude) || !is_numeric($longitude)) {
      json_error('Vui lòng chọn lăng, hoặc ghim tọa độ mộ riêng trên bản đồ.');
    }
    $latitude = (float)$latitude;
    $longitude = (float)$longitude;
    if ($latitude < -90 || $latitude > 90 || $longitude < -180 || $longitude > 180) {
      json_error('Tọa độ GPS ngoài phạm vi hợp lệ.');
    }
    return ['memberId' => $memberId, 'siteId' => null, 'latitude' => $latitude, 'longitude' => $longitude,
            'photo' => $photo, 'description' => $description, 'interredDate' => $interredDate];
  }

  // Nằm trong lăng: bỏ qua mọi tọa độ gửi kèm, luôn lấy theo lăng để cả lăng chung 1 ghim.
  $siteId = (int)$siteId;
  $stmt = $pdo->prepare('SELECT id FROM tomb_sites WHERE id = ?');
  $stmt->execute([$siteId]);
  if (!$stmt->fetch()) json_error('Không tìm thấy lăng đã chọn.', 404);

  return ['memberId' => $memberId, 'siteId' => $siteId, 'latitude' => null, 'longitude' => null,
          'photo' => $photo, 'description' => $description, 'interredDate' => $interredDate];
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
  require_family_access(); // Dữ liệu riêng của dòng họ — chỉ con cháu đã xác thực mới được đọc.
  $stmt = $pdo->query(TOMB_SELECT_SQL . ' ORDER BY t.created_at DESC');
  json_response(array_map('format_tomb', $stmt->fetchAll()));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $currentUser = require_role(['admin']);
  $in = read_tomb_input($pdo);

  $stmt = $pdo->prepare('SELECT id FROM tombs WHERE member_id = ?');
  $stmt->execute([$in['memberId']]);
  if ($stmt->fetch()) json_error('Người này đã có vị trí lăng mộ được ghi nhận. Vui lòng sửa mục hiện có thay vì tạo mới.');

  $stmt = $pdo->prepare(
    'INSERT INTO tombs (member_id, site_id, latitude, longitude, photo, description, interred_date, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );
  $stmt->execute([
    $in['memberId'], $in['siteId'], $in['latitude'], $in['longitude'],
    $in['photo'], $in['description'], $in['interredDate'], $currentUser['id'],
  ]);

  json_response(['success' => true, 'id' => (int)$pdo->lastInsertId()]);
}

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
  require_role(['admin']);
  $id = (int)($_GET['id'] ?? 0);
  if ($id <= 0) json_error('Thiếu id vị trí lăng mộ cần cập nhật.');

  $in = read_tomb_input($pdo);

  $stmt = $pdo->prepare('SELECT id FROM tombs WHERE member_id = ? AND id != ?');
  $stmt->execute([$in['memberId'], $id]);
  if ($stmt->fetch()) json_error('Người này đã có vị trí lăng mộ được ghi nhận ở một mục khác.');

  $stmt = $pdo->prepare(
    'UPDATE tombs SET member_id = ?, site_id = ?, latitude = ?, longitude = ?, photo = ?, description = ?, interred_date = ?
     WHERE id = ?'
  );
  $stmt->execute([
    $in['memberId'], $in['siteId'], $in['latitude'], $in['longitude'],
    $in['photo'], $in['description'], $in['interredDate'], $id,
  ]);

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
