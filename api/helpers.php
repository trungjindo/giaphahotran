<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

function send_cors_headers(): void {
  $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
  if (in_array($origin, ALLOWED_ORIGINS, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
  }
  header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
  // X-Viewer-Token: phiên xác thực con cháu. Thiếu tên header này ở đây thì trình duyệt sẽ
  // CHẶN NGAY ở bước preflight (lỗi "Failed to fetch"), dù phía PHP đã xử lý đúng — gọi bằng
  // curl vẫn chạy được vì curl không thực hiện preflight, nên rất dễ bỏ sót.
  header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Viewer-Token');
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

// ---------------------------------------------------------------------------
// Xác thực "con cháu trong dòng họ" (không phải tài khoản quản trị)
// ---------------------------------------------------------------------------

function get_client_ip(): string {
  return substr((string)($_SERVER['REMOTE_ADDR'] ?? 'unknown'), 0, 45);
}

// Chuẩn hoá tên tiếng Việt để so khớp: bỏ dấu, chuyển thường, gộp khoảng trắng thừa.
// Người nhà gõ "tran dinh trung" hay "Trần  Đình Trung" đều phải khớp cùng 1 người —
// bắt gõ đúng dấu chỉ làm khó người lớn tuổi chứ không tăng được bảo mật thực chất
// (tên trong gia phả không phải bí mật, bí mật thật nằm ở câu hỏi ngày tế họ).
function normalize_vn_name(string $name): string {
  $name = trim($name);
  if ($name === '') return '';
  if (class_exists('Transliterator')) {
    $tr = Transliterator::create('Any-Latin; Latin-ASCII; Lower');
    if ($tr) $name = $tr->transliterate($name);
  } else {
    // Hosting không bật intl: bỏ dấu thủ công theo bảng chữ cái tiếng Việt.
    $map = [
      'a' => 'áàảãạăắằẳẵặâấầẩẫậ', 'e' => 'éèẻẽẹêếềểễệ', 'i' => 'íìỉĩị',
      'o' => 'óòỏõọôốồổỗộơớờởỡợ', 'u' => 'úùủũụưứừửữự', 'y' => 'ýỳỷỹỵ', 'd' => 'đ',
    ];
    $name = mb_strtolower($name, 'UTF-8');
    foreach ($map as $plain => $accented) {
      $chars = preg_split('//u', $accented, -1, PREG_SPLIT_NO_EMPTY);
      $name = str_replace($chars, $plain, $name);
    }
  }
  $name = mb_strtolower($name, 'UTF-8');
  $name = preg_replace('/[^a-z0-9\s]/u', ' ', $name);
  return trim(preg_replace('/\s+/u', ' ', $name));
}

function get_setting(string $key, string $default = ''): string {
  $pdo = get_db();
  $stmt = $pdo->prepare('SELECT setting_value FROM site_settings WHERE setting_key = ?');
  $stmt->execute([$key]);
  $row = $stmt->fetch();
  return $row ? (string)$row['setting_value'] : $default;
}

// Các hàm bên dưới bọc try/catch quanh truy vấn để phòng tình huống MÃ NGUỒN ĐÃ LÊN nhưng
// migration_access_control.sql CHƯA ĐƯỢC CHẠY trên database thật (bảng chưa tồn tại). Không
// bọc thì mỗi lời gọi sẽ ném PDOException → lỗi 500 → sập cả trang. Cách xử lý khi lỗi được
// chọn riêng cho từng hàm, xem chú thích tại chỗ.
function log_auth_attempt(string $kind, ?string $identifier, bool $success): void {
  try {
    $pdo = get_db();
    $stmt = $pdo->prepare(
      'INSERT INTO auth_attempt_log (kind, ip, identifier, success) VALUES (?, ?, ?, ?)'
    );
    $stmt->execute([$kind, get_client_ip(), $identifier !== null ? mb_substr($identifier, 0, 150) : null, $success ? 1 : 0]);
  } catch (PDOException $e) {
    // Không ghi được nhật ký thì vẫn cho phiên đăng nhập/xác thực diễn ra bình thường —
    // mất một dòng log không đáng để chặn người dùng hợp lệ.
  }
}

// Đếm số lần THẤT BẠI gần đây — dùng để khoá tạm khi có dấu hiệu dò mật khẩu.
// Đếm riêng theo IP và theo tài khoản: chỉ đếm theo IP thì kẻ tấn công đổi IP là thoát,
// chỉ đếm theo tài khoản thì lại vô tình cho phép quét hàng loạt tài khoản khác nhau.
function count_recent_auth_failures(string $kind, ?string $identifier, int $minutes): int {
  $pdo = get_db();
  // $minutes được ép kiểu int và nội suy thẳng: MySQL không nhận tham số bind ở vị trí
  // INTERVAL khi PDO dùng prepared statement thật (chỉ "chạy được" nhờ chế độ giả lập mặc
  // định). Giá trị này luôn do code truyền vào, không bao giờ đến từ người dùng.
  $minutes = max(1, $minutes);
  try {
  if ($identifier === null) {
    $stmt = $pdo->prepare(
      "SELECT COUNT(*) AS c FROM auth_attempt_log
       WHERE kind = ? AND ip = ? AND success = 0 AND attempted_at > (NOW() - INTERVAL $minutes MINUTE)"
    );
    $stmt->execute([$kind, get_client_ip()]);
  } else {
    $stmt = $pdo->prepare(
      "SELECT COUNT(*) AS c FROM auth_attempt_log
       WHERE kind = ? AND identifier = ? AND success = 0 AND attempted_at > (NOW() - INTERVAL $minutes MINUTE)"
    );
    $stmt->execute([$kind, mb_substr($identifier, 0, 150)]);
  }
  return (int)$stmt->fetch()['c'];
  } catch (PDOException $e) {
    // Chưa đếm được thì coi như chưa có lần sai nào: thà tạm thời mất lớp chống dò mật khẩu
    // còn hơn khoá nhầm toàn bộ người dùng hợp lệ ra khỏi hệ thống.
    return 0;
  }
}

// Phiên xác thực con cháu, gửi qua header riêng X-Viewer-Token (không dùng chung
// Authorization: Bearer với tài khoản quản trị, để không bao giờ có chuyện nhầm lẫn
// giữa "người chỉ được xem" và "tài khoản có quyền ghi").
function get_viewer_session(): ?array {
  $token = '';
  if (!empty($_SERVER['HTTP_X_VIEWER_TOKEN'])) {
    $token = $_SERVER['HTTP_X_VIEWER_TOKEN'];
  } elseif (function_exists('getallheaders')) {
    foreach (getallheaders() as $name => $value) {
      if (strcasecmp($name, 'X-Viewer-Token') === 0) { $token = $value; break; }
    }
  }
  if ($token === '') return null;

  try {
    $pdo = get_db();
    $stmt = $pdo->prepare(
      'SELECT member_id, member_name FROM viewer_sessions WHERE token = ? AND expires_at > NOW()'
    );
    $stmt->execute([$token]);
    $row = $stmt->fetch();
    return $row ?: null;
  } catch (PDOException $e) {
    // Không kiểm chứng được phiên thì coi như CHƯA xác thực (khoá lại), không bao giờ mở
    // dữ liệu dòng họ chỉ vì truy vấn lỗi — ngược với 2 hàm nhật ký ở trên, ở đây an toàn
    // phải được ưu tiên hơn tiện dụng.
    return null;
  }
}

// Cổng chung cho MỌI dữ liệu nhạy cảm của dòng họ (gia phả, thông tin cá nhân, tài sản,
// thu chi, lăng mộ, các chi): cho qua nếu là tài khoản quản trị đã đăng nhập HOẶC là con
// cháu đã xác thực. Ngược lại 401 để giao diện biết mà hiện màn hình xác thực.
// Trả về ['kind' => 'user'|'viewer', ...] cho nơi gọi cần phân biệt.
function require_family_access(): array {
  $user = get_authenticated_user();
  if ($user !== null) {
    return ['kind' => 'user', 'user' => $user];
  }
  $viewer = get_viewer_session();
  if ($viewer !== null) {
    return ['kind' => 'viewer', 'viewer' => $viewer];
  }
  json_error('Nội dung này chỉ dành cho con cháu trong dòng họ. Vui lòng xác thực để xem.', 401);
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
