<?php
require_once __DIR__ . '/helpers.php';
send_cors_headers();

// Cấu hình câu hỏi xác thực con cháu (ngày tế họ hàng năm, âm lịch).
// CHỈ admin được đọc và ghi — đây là đáp án của câu hỏi bảo vệ toàn bộ dữ liệu dòng họ,
// tuyệt đối không để lộ qua endpoint công khai nào.

$pdo = get_db();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
  require_role(['admin']);
  json_response([
    'teHoDay' => (int)get_setting('te_ho_day', '0'),
    'teHoMonth' => (int)get_setting('te_ho_month', '0'),
  ]);
}

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
  require_role(['admin']);
  $body = read_json_body();
  $day = (int)($body['teHoDay'] ?? 0);
  $month = (int)($body['teHoMonth'] ?? 0);

  // Âm lịch: tháng 1-12, ngày 1-30 (tháng âm lịch nhiều nhất 30 ngày).
  if ($day < 1 || $day > 30 || $month < 1 || $month > 12) {
    json_error('Ngày tế họ không hợp lệ: ngày phải từ 1 đến 30, tháng từ 1 đến 12 (âm lịch).');
  }

  $stmt = $pdo->prepare(
    'INSERT INTO site_settings (setting_key, setting_value) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)'
  );
  $stmt->execute(['te_ho_day', (string)$day]);
  $stmt->execute(['te_ho_month', (string)$month]);

  // Đổi câu hỏi xác thực thì huỷ toàn bộ phiên đã cấp trước đó — nếu không, người đã xác
  // thực bằng đáp án CŨ vẫn xem được, khiến việc đổi đáp án (VD vì nghi bị lộ ra ngoài họ)
  // không có tác dụng thu hồi.
  $pdo->exec('DELETE FROM viewer_sessions');

  json_response(['success' => true]);
}

json_error('Method not allowed', 405);
