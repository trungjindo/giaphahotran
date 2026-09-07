<?php
// LỊCH GIA TỘC: sự kiện dòng họ có ngày cụ thể (giỗ tổ, ngày tế họ, họp mặt, khánh thành...).
// Khác bảng activities cũ ở chỗ ghi rõ NGÀY/THÁNG và ghi theo lịch âm hay dương.
require_once __DIR__ . '/helpers.php';
send_cors_headers();

$pdo = get_db();

function format_clan_event($row) {
  return [
    'id' => (int)$row['id'],
    'title' => $row['title'],
    'description' => $row['description'],
    'chiId' => $row['chi_id'] === null ? null : (int)$row['chi_id'],
    'chiName' => $row['chi_name'] ?? null,
    // Gắn sự kiện vào ngày giỗ của một người cụ thể (tùy chọn)
    'memberId' => $row['member_id'],
    'time' => $row['event_time'],
    'organizer' => $row['organizer'],
    'calendar' => $row['calendar'],            // 'am' | 'duong'
    'day' => (int)$row['event_day'],
    'month' => (int)$row['event_month'],
    // null = lặp lại hằng năm
    'year' => $row['event_year'] === null ? null : (int)$row['event_year'],
    'location' => $row['location'],
    'createdAt' => $row['created_at'],
    'updatedAt' => $row['updated_at'],
  ];
}

function read_clan_event_input(PDO $pdo): array {
  $body = read_json_body();

  $title = trim($body['title'] ?? '');
  $description = trim($body['description'] ?? '') ?: null;
  $location = trim($body['location'] ?? '') ?: null;
  $organizer = trim($body['organizer'] ?? '') ?: null;
  $time = trim($body['time'] ?? '') ?: null;
  $memberId = trim($body['memberId'] ?? '') ?: null;
  $calendar = ($body['calendar'] ?? 'am') === 'duong' ? 'duong' : 'am';
  $day = $body['day'] ?? null;
  $month = $body['month'] ?? null;
  $year = $body['year'] ?? null;
  $chiId = $body['chiId'] ?? null;

  if ($title === '') json_error('Vui lòng nhập tên sự kiện.');
  if (mb_strlen($title) > 200) json_error('Tên sự kiện quá dài (tối đa 200 ký tự).');

  if (!is_numeric($day) || !is_numeric($month)) json_error('Vui lòng chọn ngày và tháng của sự kiện.');
  $day = (int)$day;
  $month = (int)$month;
  if ($month < 1 || $month > 12) json_error('Tháng phải từ 1 đến 12.');
  // Tháng âm lịch nhiều nhất 30 ngày; dương lịch nhiều nhất 31.
  $maxDay = $calendar === 'am' ? 30 : 31;
  if ($day < 1 || $day > $maxDay) {
    json_error($calendar === 'am'
      ? 'Ngày âm lịch phải từ 1 đến 30.'
      : 'Ngày dương lịch phải từ 1 đến 31.');
  }

  if ($year === '' || $year === null) {
    $year = null; // lặp lại hằng năm
  } else {
    $year = (int)$year;
    if ($year < 1000 || $year > 3000) json_error('Năm không hợp lệ.');
  }

  if ($chiId === '' || $chiId === null) {
    $chiId = null; // việc chung của cả họ
  } else {
    $chiId = (int)$chiId;
    $stmt = $pdo->prepare('SELECT id FROM chi WHERE id = ?');
    $stmt->execute([$chiId]);
    if (!$stmt->fetch()) json_error('Không tìm thấy chi đã chọn.', 404);
  }

  if ($organizer !== null && mb_strlen($organizer) > 150) json_error('Tên người/ban tổ chức quá dài (tối đa 150 ký tự).');
  if ($time !== null && mb_strlen($time) > 20) json_error('Thời gian quá dài (tối đa 20 ký tự).');

  if ($memberId !== null) {
    $tree = get_family_tree($pdo);
    if (($tree ? find_family_node($tree, $memberId) : null) === null) {
      json_error('Không tìm thấy người đã chọn trong cây gia phả.', 404);
    }
  }

  return compact('title', 'description', 'location', 'calendar', 'day', 'month', 'year', 'chiId', 'organizer', 'time', 'memberId');
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
  require_family_access(); // Dữ liệu riêng của dòng họ — chỉ con cháu đã xác thực mới được đọc.
  $stmt = $pdo->query(
    'SELECT e.*, c.name AS chi_name
     FROM clan_events e
     LEFT JOIN chi c ON c.id = e.chi_id
     ORDER BY e.event_month ASC, e.event_day ASC'
  );
  json_response(array_map('format_clan_event', $stmt->fetchAll()));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $currentUser = require_role(['admin']);
  $in = read_clan_event_input($pdo);

  $stmt = $pdo->prepare(
    'INSERT INTO clan_events (title, description, chi_id, member_id, calendar, event_day, event_month, event_year, event_time, organizer, location, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  $stmt->execute([
    $in['title'], $in['description'], $in['chiId'], $in['memberId'], $in['calendar'],
    $in['day'], $in['month'], $in['year'], $in['time'], $in['organizer'],
    $in['location'], $currentUser['id'],
  ]);

  json_response(['success' => true, 'id' => (int)$pdo->lastInsertId()]);
}

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
  require_role(['admin']);
  $id = (int)($_GET['id'] ?? 0);
  if ($id <= 0) json_error('Thiếu id sự kiện cần cập nhật.');

  $stmt = $pdo->prepare('SELECT id FROM clan_events WHERE id = ?');
  $stmt->execute([$id]);
  if (!$stmt->fetch()) json_error('Không tìm thấy sự kiện cần cập nhật.', 404);

  $in = read_clan_event_input($pdo);
  $stmt = $pdo->prepare(
    'UPDATE clan_events SET title = ?, description = ?, chi_id = ?, member_id = ?, calendar = ?,
            event_day = ?, event_month = ?, event_year = ?, event_time = ?, organizer = ?, location = ?
     WHERE id = ?'
  );
  $stmt->execute([
    $in['title'], $in['description'], $in['chiId'], $in['memberId'], $in['calendar'],
    $in['day'], $in['month'], $in['year'], $in['time'], $in['organizer'],
    $in['location'], $id,
  ]);

  json_response(['success' => true]);
}

if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
  require_role(['admin']);
  $id = (int)($_GET['id'] ?? 0);
  if ($id <= 0) json_error('Thiếu id sự kiện cần xóa.');

  $stmt = $pdo->prepare('DELETE FROM clan_events WHERE id = ?');
  $stmt->execute([$id]);

  json_response(['success' => true]);
}

json_error('Method not allowed', 405);
