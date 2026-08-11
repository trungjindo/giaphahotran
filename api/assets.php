<?php
require_once __DIR__ . '/helpers.php';
send_cors_headers();

// Quản lý tài sản dòng họ (đất đai, nhà cửa, đồ thờ, đồ dùng lễ nghi, vật dụng, tài sản
// giá trị...). chiId NULL = tài sản CHUNG của cả họ, chiId cụ thể = tài sản riêng của 1 chi.
// GET công khai (không cần đăng nhập) nhưng trả về bản RÚT GỌN cho người xem thường: không
// có tọa độ GPS/địa chỉ chính xác, người bảo quản, giá trị ước tính, khấu hao — tương tự
// cách data.php che số điện thoại cho người chưa đăng nhập, tránh lộ thông tin có thể bị
// lợi dụng để nhắm tới tài sản có giá trị (đồ thờ, tài sản giá trị...).

$pdo = get_db();

$ASSET_CATEGORIES = ['dat_dai', 'nha_cua', 'do_tho', 'le_nghi', 'vat_dung', 'gia_tri', 'khac'];
$ASSET_STATUSES = ['dang_dung', 'hu_hong', 'can_sua', 'luu_kho'];

$FIELD_LABELS = [
  'name' => 'Tên tài sản',
  'category' => 'Loại tài sản',
  'description' => 'Mô tả',
  'status' => 'Tình trạng sử dụng',
  'address' => 'Vị trí',
  'latitude' => 'Tọa độ GPS',
  'longitude' => 'Tọa độ GPS',
  'custodian' => 'Người bảo quản',
  'acquiredDate' => 'Ngày mua/tiếp nhận',
  'financeTxId' => 'Liên kết thu chi',
  'estimatedValue' => 'Giá trị ước tính',
  'usefulLifeYears' => 'Tuổi thọ dự kiến',
  'expectedReplaceYear' => 'Năm dự kiến thay thế',
  'expectedReplaceCost' => 'Chi phí dự kiến thay thế',
  'images' => 'Hình ảnh',
  'chiId' => 'Thuộc chi',
];

function format_asset_full($row) {
  return [
    'id' => (int)$row['id'],
    'chiId' => $row['chi_id'] !== null ? (int)$row['chi_id'] : null,
    'name' => $row['name'],
    'category' => $row['category'],
    'description' => $row['description'],
    'status' => $row['status'],
    'address' => $row['address'],
    'latitude' => $row['latitude'] !== null ? (float)$row['latitude'] : null,
    'longitude' => $row['longitude'] !== null ? (float)$row['longitude'] : null,
    'custodian' => $row['custodian'],
    'acquiredDate' => $row['acquired_date'],
    'financeTxId' => $row['finance_tx_id'],
    'estimatedValue' => $row['estimated_value'] !== null ? (float)$row['estimated_value'] : null,
    'usefulLifeYears' => $row['useful_life_years'] !== null ? (int)$row['useful_life_years'] : null,
    'expectedReplaceYear' => $row['expected_replace_year'] !== null ? (int)$row['expected_replace_year'] : null,
    'expectedReplaceCost' => $row['expected_replace_cost'] !== null ? (float)$row['expected_replace_cost'] : null,
    'images' => json_decode($row['images'] ?? '[]', true) ?: [],
    'createdAt' => $row['created_at'],
    'updatedAt' => $row['updated_at'],
  ];
}

// Bản rút gọn cho người xem công khai/chưa đăng nhập — không có GPS, địa chỉ, người bảo
// quản, giá trị, khấu hao (xem lý do ở đầu file).
function format_asset_public($row) {
  $images = json_decode($row['images'] ?? '[]', true) ?: [];
  return [
    'id' => (int)$row['id'],
    'chiId' => $row['chi_id'] !== null ? (int)$row['chi_id'] : null,
    'name' => $row['name'],
    'category' => $row['category'],
    'description' => $row['description'],
    'status' => $row['status'],
    'image' => $images[0] ?? null,
  ];
}

// admin: toàn quyền mọi chi + tài sản chung. bai_bien không được quản lý tài sản (vai trò
// tạm thời theo năm, không phù hợp với tài sản dài hạn). chi_admin/dich_ton chỉ được thao
// tác tài sản của đúng chi mình; tài sản chung (chiId NULL) chỉ admin mới được tạo/sửa/xóa.
function require_asset_write_access(array $user, ?int $chiId): void {
  if ($user['role'] === 'admin') return;
  if ($user['role'] === 'bai_bien') {
    json_error('Tài khoản bãi biện không có quyền quản lý tài sản.', 403);
  }
  if ($chiId === null) {
    json_error('Chỉ quản trị dòng họ mới được thêm/sửa tài sản chung.', 403);
  }
  require_chi_access($user, $chiId);
}

function log_asset_history(PDO $pdo, ?int $assetId, string $assetName, ?array $user, string $action, ?string $summary): void {
  $stmt = $pdo->prepare(
    'INSERT INTO asset_history (asset_id, asset_name, user_id, user_name, action, summary) VALUES (?, ?, ?, ?, ?, ?)'
  );
  $stmt->execute([$assetId, $assetName, $user['id'] ?? null, $user['full_name'] ?? null, $action, $summary]);
}

function diff_asset_summary(array $old, array $new, array $labels): ?string {
  $changed = [];
  foreach ($labels as $key => $label) {
    $oldVal = $old[$key] ?? null;
    $newVal = $new[$key] ?? null;
    if ($key === 'images') {
      if (json_encode($oldVal) !== json_encode($newVal)) $changed[] = $label;
      continue;
    }
    if ((string)$oldVal !== (string)$newVal) $changed[] = $label;
  }
  return $changed ? ('Cập nhật: ' . implode(', ', array_unique($changed))) : null;
}

function validate_asset_body(array $body, array $categories, array $statuses): array {
  $name = trim($body['name'] ?? '');
  if ($name === '') json_error('Vui lòng nhập tên tài sản.');

  $category = $body['category'] ?? 'vat_dung';
  if (!in_array($category, $categories, true)) json_error('Loại tài sản không hợp lệ.');

  $status = $body['status'] ?? 'dang_dung';
  if (!in_array($status, $statuses, true)) json_error('Tình trạng sử dụng không hợp lệ.');

  $chiIdRaw = $body['chiId'] ?? null;
  $chiId = ($chiIdRaw === null || $chiIdRaw === '') ? null : (int)$chiIdRaw;

  $latitude = $body['latitude'] ?? null;
  $longitude = $body['longitude'] ?? null;
  if ($latitude !== null && $latitude !== '') {
    if (!is_numeric($latitude) || (float)$latitude < -90 || (float)$latitude > 90) json_error('Vĩ độ GPS không hợp lệ.');
    $latitude = (float)$latitude;
  } else { $latitude = null; }
  if ($longitude !== null && $longitude !== '') {
    if (!is_numeric($longitude) || (float)$longitude < -180 || (float)$longitude > 180) json_error('Kinh độ GPS không hợp lệ.');
    $longitude = (float)$longitude;
  } else { $longitude = null; }

  $images = $body['images'] ?? [];
  if (!is_array($images)) $images = [];
  $images = array_values(array_filter(array_map('trim', $images), fn($u) => $u !== ''));
  if (count($images) > 10) json_error('Tối đa 10 hình ảnh cho mỗi tài sản.');

  $estimatedValue = ($body['estimatedValue'] ?? '') !== '' ? (float)$body['estimatedValue'] : null;
  $usefulLifeYears = ($body['usefulLifeYears'] ?? '') !== '' ? (int)$body['usefulLifeYears'] : null;
  $expectedReplaceCost = ($body['expectedReplaceCost'] ?? '') !== '' ? (float)$body['expectedReplaceCost'] : null;
  $acquiredDate = trim($body['acquiredDate'] ?? '') ?: null;

  $expectedReplaceYear = ($body['expectedReplaceYear'] ?? '') !== '' ? (int)$body['expectedReplaceYear'] : null;
  // Nếu không nhập tay năm dự kiến thay thế, tự tính từ ngày mua + tuổi thọ dự kiến.
  if ($expectedReplaceYear === null && $acquiredDate && $usefulLifeYears) {
    $acquiredYear = (int)substr($acquiredDate, 0, 4);
    if ($acquiredYear > 0) $expectedReplaceYear = $acquiredYear + $usefulLifeYears;
  }

  return [
    'chiId' => $chiId,
    'name' => $name,
    'category' => $category,
    'description' => trim($body['description'] ?? '') ?: null,
    'status' => $status,
    'address' => trim($body['address'] ?? '') ?: null,
    'latitude' => $latitude,
    'longitude' => $longitude,
    'custodian' => trim($body['custodian'] ?? '') ?: null,
    'acquiredDate' => $acquiredDate,
    'financeTxId' => trim($body['financeTxId'] ?? '') ?: null,
    'estimatedValue' => $estimatedValue,
    'usefulLifeYears' => $usefulLifeYears,
    'expectedReplaceYear' => $expectedReplaceYear,
    'expectedReplaceCost' => $expectedReplaceCost,
    'images' => $images,
  ];
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
  $currentUser = get_authenticated_user();
  $stmt = $pdo->query('SELECT * FROM assets ORDER BY created_at DESC');
  $rows = $stmt->fetchAll();

  if ($currentUser === null) {
    json_response(array_map('format_asset_public', $rows));
  }

  if ($currentUser['role'] !== 'admin') {
    $myChiId = $currentUser['chi_id'] !== null ? (int)$currentUser['chi_id'] : null;
    $rows = array_values(array_filter($rows, function ($r) use ($myChiId) {
      return $r['chi_id'] === null || (int)$r['chi_id'] === $myChiId;
    }));
  }

  json_response(array_map('format_asset_full', $rows));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $currentUser = require_auth();
  $data = validate_asset_body(read_json_body(), $ASSET_CATEGORIES, $ASSET_STATUSES);
  require_asset_write_access($currentUser, $data['chiId']);

  $stmt = $pdo->prepare(
    'INSERT INTO assets (chi_id, name, category, description, status, address, latitude, longitude,
      custodian, acquired_date, finance_tx_id, estimated_value, useful_life_years, expected_replace_year,
      expected_replace_cost, images, created_by, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  $stmt->execute([
    $data['chiId'], $data['name'], $data['category'], $data['description'], $data['status'],
    $data['address'], $data['latitude'], $data['longitude'], $data['custodian'], $data['acquiredDate'],
    $data['financeTxId'], $data['estimatedValue'], $data['usefulLifeYears'], $data['expectedReplaceYear'],
    $data['expectedReplaceCost'], json_encode($data['images'], JSON_UNESCAPED_UNICODE),
    $currentUser['id'], $currentUser['id'],
  ]);
  $newId = (int)$pdo->lastInsertId();

  log_asset_history($pdo, $newId, $data['name'], $currentUser, 'created', 'Tạo mới tài sản');

  json_response(['success' => true, 'id' => $newId]);
}

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
  $currentUser = require_auth();
  $id = (int)($_GET['id'] ?? 0);
  if ($id <= 0) json_error('Thiếu id tài sản cần cập nhật.');

  $stmt = $pdo->prepare('SELECT * FROM assets WHERE id = ?');
  $stmt->execute([$id]);
  $existing = $stmt->fetch();
  if (!$existing) json_error('Không tìm thấy tài sản này.', 404);

  $existingChiId = $existing['chi_id'] !== null ? (int)$existing['chi_id'] : null;
  require_asset_write_access($currentUser, $existingChiId);

  $data = validate_asset_body(read_json_body(), $ASSET_CATEGORIES, $ASSET_STATUSES);
  require_asset_write_access($currentUser, $data['chiId']); // cũng phải có quyền trên chi ĐÍCH nếu đổi chi

  $stmt = $pdo->prepare(
    'UPDATE assets SET chi_id = ?, name = ?, category = ?, description = ?, status = ?, address = ?,
      latitude = ?, longitude = ?, custodian = ?, acquired_date = ?, finance_tx_id = ?, estimated_value = ?,
      useful_life_years = ?, expected_replace_year = ?, expected_replace_cost = ?, images = ?, updated_by = ?
     WHERE id = ?'
  );
  $stmt->execute([
    $data['chiId'], $data['name'], $data['category'], $data['description'], $data['status'],
    $data['address'], $data['latitude'], $data['longitude'], $data['custodian'], $data['acquiredDate'],
    $data['financeTxId'], $data['estimatedValue'], $data['usefulLifeYears'], $data['expectedReplaceYear'],
    $data['expectedReplaceCost'], json_encode($data['images'], JSON_UNESCAPED_UNICODE),
    $currentUser['id'], $id,
  ]);

  $oldForDiff = [
    'name' => $existing['name'], 'category' => $existing['category'], 'description' => $existing['description'],
    'status' => $existing['status'], 'address' => $existing['address'], 'latitude' => $existing['latitude'],
    'longitude' => $existing['longitude'], 'custodian' => $existing['custodian'], 'acquiredDate' => $existing['acquired_date'],
    'financeTxId' => $existing['finance_tx_id'], 'estimatedValue' => $existing['estimated_value'],
    'usefulLifeYears' => $existing['useful_life_years'], 'expectedReplaceYear' => $existing['expected_replace_year'],
    'expectedReplaceCost' => $existing['expected_replace_cost'], 'images' => json_decode($existing['images'] ?? '[]', true) ?: [],
    'chiId' => $existingChiId,
  ];
  $summary = diff_asset_summary($oldForDiff, $data, $FIELD_LABELS);
  log_asset_history($pdo, $id, $data['name'], $currentUser, 'updated', $summary ?? 'Cập nhật tài sản');

  json_response(['success' => true]);
}

if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
  $currentUser = require_auth();
  $id = (int)($_GET['id'] ?? 0);
  if ($id <= 0) json_error('Thiếu id tài sản cần xóa.');

  $stmt = $pdo->prepare('SELECT * FROM assets WHERE id = ?');
  $stmt->execute([$id]);
  $existing = $stmt->fetch();
  if (!$existing) json_error('Không tìm thấy tài sản này.', 404);

  $existingChiId = $existing['chi_id'] !== null ? (int)$existing['chi_id'] : null;
  require_asset_write_access($currentUser, $existingChiId);

  log_asset_history($pdo, $id, $existing['name'], $currentUser, 'deleted', 'Xóa tài sản');

  $stmt = $pdo->prepare('DELETE FROM assets WHERE id = ?');
  $stmt->execute([$id]);

  json_response(['success' => true]);
}

json_error('Method not allowed', 405);
