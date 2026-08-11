<?php
require_once __DIR__ . '/helpers.php';
send_cors_headers();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  json_error('Method not allowed', 405);
}

require_auth(); // Chỉ admin đã đăng nhập mới được tải file lên

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB

const TYPE_FOLDERS = [
  'avatar'  => 'hinh_dai_dien',
  'news'    => 'tin_tuc',
  'receipt' => 'chung_tu',
  'banner'  => 'banner',
  'gallery' => 'thu_vien',
  'about'   => 'gioi_thieu',
  'tomb'    => 'mo_phan',
  'asset'   => 'tai_san',
];

if (empty($_FILES['image'])) {
  json_error('Không có file nào được tải lên.', 400);
}

$file = $_FILES['image'];

if ($file['error'] !== UPLOAD_ERR_OK) {
  if ($file['error'] === UPLOAD_ERR_INI_SIZE || $file['error'] === UPLOAD_ERR_FORM_SIZE) {
    json_error('File vượt quá dung lượng tối đa 10MB!', 413);
  }
  json_error('Có lỗi xảy ra khi tải file lên.', 400);
}

if ($file['size'] > MAX_UPLOAD_BYTES) {
  json_error('File vượt quá dung lượng tối đa 10MB!', 413);
}

$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

if (strpos($mimeType, 'image/') !== 0) {
  json_error('Chỉ cho phép tải lên định dạng hình ảnh!', 400);
}

$type = $_GET['type'] ?? '';
$folder = TYPE_FOLDERS[$type] ?? TYPE_FOLDERS['avatar'];
$targetDir = STORAGE_DIR . '/' . $folder;

if (!is_dir($targetDir)) {
  mkdir($targetDir, 0755, true);
}

$ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
$safeExt = preg_replace('/[^a-z0-9]/', '', $ext) ?: 'jpg';
$filename = time() . '-' . bin2hex(random_bytes(6)) . '.' . $safeExt;
$targetPath = $targetDir . '/' . $filename;

if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
  json_error('Không thể lưu file trên server.', 500);
}

// Xây URL tuyệt đối từ chính request hiện tại, tránh phải hard-code domain cho từng môi trường
$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'];
$apiDir = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/'); // ví dụ: /api
$absoluteUrl = "$scheme://$host$apiDir/storage/$folder/$filename";

json_response([
  'success' => true,
  'url' => $absoluteUrl,
]);
