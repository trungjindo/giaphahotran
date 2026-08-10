<?php
require_once __DIR__ . '/helpers.php';
send_cors_headers();

$pdo = get_db();

// Lấy chi_id của 1 hoạt động theo id, dùng để kiểm tra quyền trước khi sửa/xóa.
function get_activity_chi_id($pdo, int $id): ?array {
  $stmt = $pdo->prepare('SELECT chi_id FROM activities WHERE id = ?');
  $stmt->execute([$id]);
  $row = $stmt->fetch();
  return $row ?: null;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
  $where = [];
  $params = [];

  if (isset($_GET['chiId'])) {
    if ($_GET['chiId'] === 'null' || $_GET['chiId'] === '') {
      $where[] = 'a.chi_id IS NULL';
    } else {
      $where[] = 'a.chi_id = ?';
      $params[] = (int)$_GET['chiId'];
    }
  }
  if (isset($_GET['year']) && $_GET['year'] !== '') {
    $where[] = 'a.year = ?';
    $params[] = (int)$_GET['year'];
  }

  $sql = 'SELECT a.id, a.chi_id, a.year, a.title, a.description, a.created_at, c.name AS chi_name, u.full_name AS created_by_name
          FROM activities a
          LEFT JOIN chi c ON c.id = a.chi_id
          LEFT JOIN users u ON u.id = a.created_by';
  if ($where) $sql .= ' WHERE ' . implode(' AND ', $where);
  $sql .= ' ORDER BY a.year DESC, a.created_at DESC';

  $stmt = $pdo->prepare($sql);
  $stmt->execute($params);
  $rows = $stmt->fetchAll();

  $result = array_map(function ($row) {
    return [
      'id' => (int)$row['id'],
      'chiId' => $row['chi_id'] !== null ? (int)$row['chi_id'] : null,
      'chiName' => $row['chi_name'],
      'year' => (int)$row['year'],
      'title' => $row['title'],
      'description' => $row['description'],
      'createdByName' => $row['created_by_name'],
      'createdAt' => $row['created_at'],
    ];
  }, $rows);

  json_response($result);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $currentUser = require_auth();
  $body = read_json_body();
  $chiId = isset($body['chiId']) && $body['chiId'] !== null && $body['chiId'] !== '' ? (int)$body['chiId'] : null;
  $year = (int)($body['year'] ?? 0);
  $title = trim($body['title'] ?? '');
  $description = trim($body['description'] ?? '');

  if ($year <= 0 || $title === '') {
    json_error('Vui lòng nhập năm và tiêu đề hoạt động.');
  }

  require_chi_access($currentUser, $chiId);

  $stmt = $pdo->prepare('INSERT INTO activities (chi_id, year, title, description, created_by) VALUES (?, ?, ?, ?, ?)');
  $stmt->execute([$chiId, $year, $title, $description, $currentUser['id']]);

  json_response(['success' => true, 'id' => (int)$pdo->lastInsertId()]);
}

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
  $currentUser = require_auth();
  $id = (int)($_GET['id'] ?? 0);
  if ($id <= 0) json_error('Thiếu id hoạt động cần cập nhật.');

  $existing = get_activity_chi_id($pdo, $id);
  if ($existing === null) json_error('Không tìm thấy hoạt động.', 404);
  require_chi_access($currentUser, $existing['chi_id'] !== null ? (int)$existing['chi_id'] : null);

  $body = read_json_body();
  $year = (int)($body['year'] ?? 0);
  $title = trim($body['title'] ?? '');
  $description = trim($body['description'] ?? '');

  if ($year <= 0 || $title === '') {
    json_error('Vui lòng nhập năm và tiêu đề hoạt động.');
  }

  $stmt = $pdo->prepare('UPDATE activities SET year = ?, title = ?, description = ? WHERE id = ?');
  $stmt->execute([$year, $title, $description, $id]);

  json_response(['success' => true]);
}

if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
  $currentUser = require_auth();
  $id = (int)($_GET['id'] ?? 0);
  if ($id <= 0) json_error('Thiếu id hoạt động cần xóa.');

  $existing = get_activity_chi_id($pdo, $id);
  if ($existing === null) json_error('Không tìm thấy hoạt động.', 404);
  require_chi_access($currentUser, $existing['chi_id'] !== null ? (int)$existing['chi_id'] : null);

  $stmt = $pdo->prepare('DELETE FROM activities WHERE id = ?');
  $stmt->execute([$id]);

  json_response(['success' => true]);
}

json_error('Method not allowed', 405);
