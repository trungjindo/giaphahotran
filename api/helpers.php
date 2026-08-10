<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

function send_cors_headers(): void {
  $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
  if (in_array($origin, ALLOWED_ORIGINS, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
  }
  header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
  header('Access-Control-Allow-Headers: Content-Type, Authorization');
  header('Vary: Origin');

  if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
  }
}

function json_response($data, int $status = 200): void {
  http_response_code($status);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode($data, JSON_UNESCAPED_UNICODE);
  exit;
}

function json_error(string $message, int $status = 400): void {
  json_response(['error' => $message], $status);
}

function read_json_body(): array {
  $raw = file_get_contents('php://input');
  $data = json_decode($raw, true);
  return is_array($data) ? $data : [];
}

// Một số cấu hình Apache/mod_php không đưa header Authorization vào $_SERVER — thử thêm
// getallheaders() làm phương án dự phòng để hoạt động ổn định trên cả local lẫn hosting thật.
function get_authorization_header(): string {
  if (!empty($_SERVER['HTTP_AUTHORIZATION'])) {
    return $_SERVER['HTTP_AUTHORIZATION'];
  }
  if (!empty($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
    return $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
  }
  if (function_exists('getallheaders')) {
    $headers = getallheaders();
    foreach ($headers as $name => $value) {
      if (strcasecmp($name, 'Authorization') === 0) {
        return $value;
      }
    }
  }
  return '';
}

// Trả về admin_id nếu token hợp lệ, ngược lại trả về null.
function get_authenticated_admin_id(): ?int {
  $header = get_authorization_header();
  if (!preg_match('/Bearer\s+(\S+)/i', $header, $m)) {
    return null;
  }
  $token = $m[1];

  $pdo = get_db();
  $stmt = $pdo->prepare('SELECT admin_id FROM admin_sessions WHERE token = ? AND expires_at > NOW()');
  $stmt->execute([$token]);
  $row = $stmt->fetch();
  return $row ? (int)$row['admin_id'] : null;
}

function require_auth(): int {
  $adminId = get_authenticated_admin_id();
  if ($adminId === null) {
    json_error('Chưa đăng nhập hoặc phiên đã hết hạn.', 401);
  }
  return $adminId;
}
