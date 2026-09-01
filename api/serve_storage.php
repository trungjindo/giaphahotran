<?php
// Đọc và trả về file ảnh từ STORAGE_DIR (có thể nằm ngoài public_html trên server thật —
// xem config.php). Request /api/storage/... được .htaccess chuyển hướng nội bộ vào đây,
// nên URL ảnh mà frontend/DB đang lưu (dạng https://.../api/storage/{folder}/{file}) không đổi.
require_once __DIR__ . '/config.php';

$path = $_GET['path'] ?? '';
$path = str_replace('\\', '/', $path);

if ($path === '' || strpos($path, '..') !== false || $path[0] === '/') {
  http_response_code(400);
  exit;
}

$realStorage = realpath(STORAGE_DIR);
$realFile = realpath(STORAGE_DIR . '/' . $path);

if ($realStorage === false || $realFile === false || strpos($realFile, $realStorage) !== 0 || !is_file($realFile)) {
  http_response_code(404);
  exit;
}

$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mime = finfo_file($finfo, $realFile);
finfo_close($finfo);

header('Content-Type: ' . $mime);
header('Content-Length: ' . filesize($realFile));
header('Cache-Control: public, max-age=31536000, immutable');
readfile($realFile);
