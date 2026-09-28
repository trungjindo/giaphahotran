<?php
// Bộ nhớ đệm kết quả định vị, dùng chung cho mọi người xem.
//
// GET  ?q=...  -> trả kết quả đã đệm, hoặc { cached: false } nếu chưa có.
// POST         -> lưu lại kết quả mà trình duyệt vừa tra được từ Google.
//
// Mục đích: một địa danh (phường/xã, nghĩa trang, nhà thờ họ) chỉ phải trả phí cho Google
// ĐÚNG MỘT LẦN, sau đó mọi lượt xem về sau đều lấy từ đây.
require_once __DIR__ . '/helpers.php';
send_cors_headers();

$pdo = get_db();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
  require_family_access();

  $q = trim($_GET['q'] ?? '');
  if ($q === '') json_error('Thiếu tham số q.');

  $stmt = $pdo->prepare('SELECT * FROM geocode_cache WHERE query_key = ?');
  $stmt->execute([normalize_vn_name($q)]);
  $row = $stmt->fetch();

  if (!$row) json_response(['cached' => false]);

  // Đếm lượt dùng lại — để sau này nhìn ra đệm đang tiết kiệm được bao nhiêu lượt gọi.
  $pdo->prepare('UPDATE geocode_cache SET hits = hits + 1 WHERE query_key = ?')
      ->execute([$row['query_key']]);

  json_response([
    'cached' => true,
    'found' => (int)$row['found'] === 1,
    'lat' => $row['latitude'] !== null ? (float)$row['latitude'] : null,
    'lng' => $row['longitude'] !== null ? (float)$row['longitude'] : null,
    'label' => $row['label'],
  ]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  // Ghi vào đệm cũng chỉ cần quyền xem: con cháu đã xác thực mới mở được màn hình dùng tới
  // nó, và dữ liệu ở đây là tọa độ địa danh công khai, không phải thông tin riêng của ai.
  require_family_access();

  $body = read_json_body();
  $q = trim($body['q'] ?? '');
  if ($q === '') json_error('Thiếu tham số q.');

  $found = !empty($body['found']);
  $lat = $found && is_numeric($body['lat'] ?? null) ? (float)$body['lat'] : null;
  $lng = $found && is_numeric($body['lng'] ?? null) ? (float)$body['lng'] : null;
  $label = trim($body['label'] ?? '') ?: null;

  if ($found && ($lat === null || $lng === null)) {
    json_error('Thiếu tọa độ cho kết quả tìm được.');
  }
  if ($lat !== null && ($lat < -90 || $lat > 90 || $lng < -180 || $lng > 180)) {
    json_error('Tọa độ ngoài phạm vi hợp lệ.');
  }

  // Ghi đè bản cũ nếu có: lần tra sau thường chính xác hơn (dữ liệu Google được cập nhật).
  $stmt = $pdo->prepare(
    'INSERT INTO geocode_cache (query_key, query_text, latitude, longitude, label, found)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE latitude = VALUES(latitude), longitude = VALUES(longitude),
                             label = VALUES(label), found = VALUES(found)'
  );
  $stmt->execute([normalize_vn_name($q), mb_substr($q, 0, 255), $lat, $lng, $label, $found ? 1 : 0]);

  json_response(['success' => true]);
}

json_error('Method not allowed', 405);
