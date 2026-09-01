<?php
require_once __DIR__ . '/helpers.php';
send_cors_headers();

$pdo = get_db();

function format_promo_banner($row) {
  return [
    'id' => (int)$row['id'],
    'businessName' => $row['business_name'],
    'description' => $row['description'],
    'image' => $row['image'],
    'linkUrl' => $row['link_url'],
    'contactName' => $row['contact_name'],
    'isActive' => (bool)$row['is_active'],
    'sortOrder' => (int)$row['sort_order'],
  ];
}

// Xem được toàn bộ (kể cả banner đang ẩn) nếu là admin — phục vụ trang quản trị.
// Người xem công khai chỉ thấy banner đang bật (is_active=1).
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
  $user = get_authenticated_user();
  $isAdmin = $user && $user['role'] === 'admin';

  $sql = 'SELECT * FROM promo_banners';
  if (!$isAdmin) $sql .= ' WHERE is_active = 1';
  $sql .= ' ORDER BY sort_order ASC, id ASC';

  $stmt = $pdo->query($sql);
  json_response(array_map('format_promo_banner', $stmt->fetchAll()));
}

// Đổi thứ tự: hoán đổi sort_order với banner liền kề (theo toàn bộ danh sách, không phân
// biệt đang bật/ẩn) — dùng nút mũi tên lên/xuống ở trang quản trị thay vì kéo-thả phức tạp.
if ($_SERVER['REQUEST_METHOD'] === 'PUT' && isset($_GET['move'])) {
  require_role(['admin']);
  $id = (int)($_GET['id'] ?? 0);
  $direction = $_GET['move'];
  if ($id <= 0 || !in_array($direction, ['up', 'down'], true)) json_error('Yêu cầu không hợp lệ.');

  $rows = $pdo->query('SELECT id, sort_order FROM promo_banners ORDER BY sort_order ASC, id ASC')->fetchAll();
  $ids = array_column($rows, 'id');
  $idx = array_search($id, $ids, true);
  if ($idx === false) json_error('Không tìm thấy banner.', 404);

  $swapIdx = $direction === 'up' ? $idx - 1 : $idx + 1;
  if ($swapIdx >= 0 && $swapIdx < count($rows)) {
    $a = $rows[$idx];
    $b = $rows[$swapIdx];
    $pdo->prepare('UPDATE promo_banners SET sort_order = ? WHERE id = ?')->execute([$b['sort_order'], $a['id']]);
    $pdo->prepare('UPDATE promo_banners SET sort_order = ? WHERE id = ?')->execute([$a['sort_order'], $b['id']]);
  }
  json_response(['success' => true]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $currentUser = require_role(['admin']);
  $body = read_json_body();

  $businessName = trim($body['businessName'] ?? '');
  $description = trim($body['description'] ?? '') ?: null;
  $image = trim($body['image'] ?? '');
  $linkUrl = trim($body['linkUrl'] ?? '') ?: null;
  $contactName = trim($body['contactName'] ?? '') ?: null;
  $isActive = !empty($body['isActive']) ? 1 : 0;

  if ($businessName === '') json_error('Vui lòng nhập tên doanh nghiệp/dịch vụ.');
  if ($image === '') json_error('Vui lòng tải lên hình ảnh banner.');
  if ($linkUrl !== null && !preg_match('#^https?://#i', $linkUrl)) {
    json_error('Đường dẫn phải bắt đầu bằng http:// hoặc https://');
  }

  $nextOrder = (int)$pdo->query('SELECT COALESCE(MAX(sort_order), 0) + 1 FROM promo_banners')->fetchColumn();

  $stmt = $pdo->prepare(
    'INSERT INTO promo_banners (business_name, description, image, link_url, contact_name, is_active, sort_order, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );
  $stmt->execute([$businessName, $description, $image, $linkUrl, $contactName, $isActive, $nextOrder, $currentUser['id']]);

  json_response(['success' => true, 'id' => (int)$pdo->lastInsertId()]);
}

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
  require_role(['admin']);
  $id = (int)($_GET['id'] ?? 0);
  if ($id <= 0) json_error('Thiếu id banner cần cập nhật.');

  $body = read_json_body();
  $businessName = trim($body['businessName'] ?? '');
  $description = trim($body['description'] ?? '') ?: null;
  $image = trim($body['image'] ?? '');
  $linkUrl = trim($body['linkUrl'] ?? '') ?: null;
  $contactName = trim($body['contactName'] ?? '') ?: null;
  $isActive = !empty($body['isActive']) ? 1 : 0;

  if ($businessName === '') json_error('Vui lòng nhập tên doanh nghiệp/dịch vụ.');
  if ($image === '') json_error('Vui lòng tải lên hình ảnh banner.');
  if ($linkUrl !== null && !preg_match('#^https?://#i', $linkUrl)) {
    json_error('Đường dẫn phải bắt đầu bằng http:// hoặc https://');
  }

  $stmt = $pdo->prepare(
    'UPDATE promo_banners SET business_name = ?, description = ?, image = ?, link_url = ?, contact_name = ?, is_active = ?
     WHERE id = ?'
  );
  $stmt->execute([$businessName, $description, $image, $linkUrl, $contactName, $isActive, $id]);

  json_response(['success' => true]);
}

if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
  require_role(['admin']);
  $id = (int)($_GET['id'] ?? 0);
  if ($id <= 0) json_error('Thiếu id banner cần xóa.');

  $stmt = $pdo->prepare('DELETE FROM promo_banners WHERE id = ?');
  $stmt->execute([$id]);

  json_response(['success' => true]);
}

json_error('Method not allowed', 405);
