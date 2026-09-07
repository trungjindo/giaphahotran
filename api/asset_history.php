<?php
require_once __DIR__ . '/helpers.php';
send_cors_headers();

// Lịch sử thay đổi của 1 tài sản cụ thể (assetId) — chỉ người có quyền xem tài sản đó
// (admin, hoặc chi_admin/dich_ton/bai_bien đúng chi) mới được xem lịch sử của nó.

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
  json_error('Method not allowed', 405);
}

$currentUser = require_auth();
$pdo = get_db();

$assetId = (int)($_GET['assetId'] ?? 0);
if ($assetId <= 0) {
  json_error('Thiếu assetId.', 400);
}

$stmt = $pdo->prepare('SELECT chi_id FROM assets WHERE id = ?');
$stmt->execute([$assetId]);
$asset = $stmt->fetch();
if (!$asset) {
  json_error('Không tìm thấy tài sản này.', 404);
}

if ($currentUser['role'] !== 'admin') {
  $chiId = $asset['chi_id'] !== null ? (int)$asset['chi_id'] : null;
  if ($chiId !== null) {
    require_chi_access($currentUser, $chiId);
  }
}

$stmt = $pdo->prepare('SELECT * FROM asset_history WHERE asset_id = ? ORDER BY created_at DESC');
$stmt->execute([$assetId]);

json_response(array_map(function ($row) {
  return [
    'id' => (int)$row['id'],
    'userName' => $row['user_name'],
    'action' => $row['action'],
    'summary' => $row['summary'],
    'createdAt' => $row['created_at'],
  ];
}, $stmt->fetchAll()));
