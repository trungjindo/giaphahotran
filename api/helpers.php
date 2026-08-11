<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

function send_cors_headers(): void {
  $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
  if (in_array($origin, ALLOWED_ORIGINS, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
  }
  header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
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

// Trả về thông tin đầy đủ người dùng (id, username, full_name, role, chi_id, year_assigned)
// nếu token hợp lệ, ngược lại trả về null.
function get_authenticated_user(): ?array {
  $header = get_authorization_header();
  if (!preg_match('/Bearer\s+(\S+)/i', $header, $m)) {
    return null;
  }
  $token = $m[1];

  $pdo = get_db();
  $stmt = $pdo->prepare(
    'SELECT u.id, u.username, u.full_name, u.role, u.chi_id, u.year_assigned
     FROM user_sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = ? AND s.expires_at > NOW()'
  );
  $stmt->execute([$token]);
  $row = $stmt->fetch();
  return $row ?: null;
}

// Bắt buộc đã đăng nhập, trả về thông tin người dùng. Dừng request với lỗi 401 nếu chưa.
function require_auth(): array {
  $user = get_authenticated_user();
  if ($user === null) {
    json_error('Chưa đăng nhập hoặc phiên đã hết hạn.', 401);
  }
  return $user;
}

// Bắt buộc người dùng có 1 trong các role cho phép. Dừng request với lỗi 403 nếu không đủ quyền.
function require_role(array $allowedRoles): array {
  $user = require_auth();
  if (!in_array($user['role'], $allowedRoles, true)) {
    json_error('Bạn không có quyền thực hiện thao tác này.', 403);
  }
  return $user;
}

// Kiểm tra người dùng có quyền thao tác trên 1 chi cụ thể hay không:
// admin luôn được phép; các role còn lại chỉ được phép trên đúng chi_id của mình.
function require_chi_access(array $user, ?int $chiId): void {
  if ($user['role'] === 'admin') {
    return;
  }
  if ($chiId === null || (int)$user['chi_id'] !== (int)$chiId) {
    json_error('Bạn không có quyền truy cập dữ liệu của chi này.', 403);
  }
}

// Giống require_chi_access, nhưng với tài khoản bãi biện còn kiểm tra thêm: chỉ được
// ghi dữ liệu của đúng năm mình đang được phân công phụ trách (bảng bai_bien_assignments,
// status='active'). admin/chi_admin/dich_ton không bị giới hạn theo năm.
function require_chi_year_access(array $user, ?int $chiId, int $year): void {
  require_chi_access($user, $chiId);

  if ($user['role'] !== 'bai_bien') {
    return;
  }

  $pdo = get_db();
  $stmt = $pdo->prepare(
    "SELECT id FROM bai_bien_assignments
     WHERE user_id = ? AND chi_id <=> ? AND year = ? AND status = 'active'"
  );
  $stmt->execute([$user['id'], $chiId, $year]);
  if (!$stmt->fetch()) {
    json_error('Bạn chỉ được ghi dữ liệu của năm mình đang được phân công phụ trách (bãi biện).', 403);
  }
}

// Tìm 1 node trong cây gia phả (JSON) theo id — dùng chung cho chi.php, tombs.php,
// reveal_phone.php (mọi nơi cần tra cứu 1 người theo id trong familyData).
function find_family_node($node, string $id) {
  if (!is_array($node)) return null;
  if (($node['id'] ?? null) === $id) return $node;
  foreach ($node['children'] ?? [] as $child) {
    $found = find_family_node($child, $id);
    if ($found !== null) return $found;
  }
  return null;
}

function get_family_tree(PDO $pdo) {
  $stmt = $pdo->prepare('SELECT data_json FROM app_data WHERE data_key = ?');
  $stmt->execute(['familyData']);
  $row = $stmt->fetch();
  return $row ? json_decode($row['data_json'], true) : null;
}

// Che số điện thoại: giữ đầu (+mã quốc gia hoặc "0x") và 2-3 số cuối, phần giữa thay bằng
// dấu chấm tròn. VD: "0987654321" -> "09•••••321", "+84987654321" -> "+84•••••••21".
function mask_phone(string $phone): string {
  $phone = trim($phone);
  $len = mb_strlen($phone);
  if ($len === 0) return $phone;

  $isIntl = str_starts_with($phone, '+');
  $prefixLen = $isIntl ? 3 : 2;
  $suffixLen = $isIntl ? 2 : 3;

  if ($len <= $prefixLen + $suffixLen) return $phone; // số quá ngắn, không đủ để che có ý nghĩa

  $prefix = mb_substr($phone, 0, $prefixLen);
  $suffix = mb_substr($phone, -$suffixLen);
  $maskLen = $len - $prefixLen - $suffixLen;
  return $prefix . str_repeat('•', $maskLen) . $suffix;
}

// Che số điện thoại VÀ Zalo (Zalo cũng là số điện thoại, cùng mức nhạy cảm) của TOÀN BỘ
// cây gia phả (đệ quy qua children), dùng cho response trả về người dùng chưa đăng nhập —
// không sửa gì khác ngoài 2 field "phone" và "zalo".
function mask_family_contacts(array &$node): void {
  if (!empty($node['phone']) && is_string($node['phone'])) {
    $node['phone'] = mask_phone($node['phone']);
  }
  if (!empty($node['zalo']) && is_string($node['zalo'])) {
    $node['zalo'] = mask_phone($node['zalo']);
  }
  if (!empty($node['children']) && is_array($node['children'])) {
    foreach ($node['children'] as &$child) {
      if (is_array($child)) mask_family_contacts($child);
    }
    unset($child);
  }
}
