<?php
require_once __DIR__ . '/helpers.php';
send_cors_headers();

$pdo = get_db();

function normalize_chi_id($raw): ?int {
  return ($raw === null || $raw === '' || $raw === 'null') ? null : (int)$raw;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
  require_family_access(); // Dữ liệu riêng của dòng họ — chỉ con cháu đã xác thực mới được đọc.
  $chiId = isset($_GET['chiId']) ? normalize_chi_id($_GET['chiId']) : null;
  $hasChiParam = isset($_GET['chiId']);

  $where = [];
  $params = [];
  if ($hasChiParam) {
    if ($chiId === null) {
      $where[] = 'b.chi_id IS NULL';
    } else {
      $where[] = 'b.chi_id = ?';
      $params[] = $chiId;
    }
  }

  $sql = 'SELECT b.id, b.chi_id, b.year, b.user_id, b.status, b.assigned_at, b.handed_over_at,
                 u.full_name AS user_full_name, c.name AS chi_name
          FROM bai_bien_assignments b
          JOIN users u ON u.id = b.user_id
          LEFT JOIN chi c ON c.id = b.chi_id';
  if ($where) $sql .= ' WHERE ' . implode(' AND ', $where);
  $sql .= ' ORDER BY b.year DESC, b.assigned_at DESC';

  $stmt = $pdo->prepare($sql);
  $stmt->execute($params);
  $rows = $stmt->fetchAll();

  $result = array_map(function ($row) {
    return [
      'id' => (int)$row['id'],
      'chiId' => $row['chi_id'] !== null ? (int)$row['chi_id'] : null,
      'chiName' => $row['chi_name'],
      'year' => (int)$row['year'],
      'userId' => (int)$row['user_id'],
      'userFullName' => $row['user_full_name'],
      'status' => $row['status'],
      'assignedAt' => $row['assigned_at'],
      'handedOverAt' => $row['handed_over_at'],
    ];
  }, $rows);

  json_response($result);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $currentUser = require_role(['admin', 'chi_admin', 'dich_ton']);
  $action = $_GET['action'] ?? '';
  $body = read_json_body();
  $chiId = normalize_chi_id($body['chiId'] ?? null);
  $year = (int)($body['year'] ?? 0);

  if ($year <= 0) {
    json_error('Vui lòng nhập năm phân công.');
  }
  require_chi_access($currentUser, $chiId);

  if ($action === 'assign') {
    $userId = (int)($body['userId'] ?? 0);
    if ($userId <= 0) json_error('Vui lòng chọn người được phân công.');

    $stmt = $pdo->prepare("SELECT id, role, chi_id FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $target = $stmt->fetch();
    if (!$target) json_error('Không tìm thấy tài khoản này.', 404);
    if ($target['role'] !== 'bai_bien' || (int)$target['chi_id'] !== ($chiId ?? (int)$target['chi_id'])) {
      // Cho phép chi_id null (dòng họ lớn) so khớp lỏng hơn; nếu có chi_id thì phải khớp đúng
      if ($chiId !== null && (int)$target['chi_id'] !== $chiId) {
        json_error('Tài khoản này không thuộc chi đang thao tác.');
      }
    }

    $stmt = $pdo->prepare(
      'INSERT INTO bai_bien_assignments (chi_id, year, user_id, status) VALUES (?, ?, ?, ?)'
    );
    $stmt->execute([$chiId, $year, $userId, 'active']);

    // Đồng bộ year_assigned trên users để hiển thị nhanh (bai_bien_assignments vẫn là nguồn xác thực quyền)
    $stmt = $pdo->prepare('UPDATE users SET year_assigned = ? WHERE id = ?');
    $stmt->execute([$year, $userId]);

    json_response(['success' => true, 'id' => (int)$pdo->lastInsertId()]);
  }

  if ($action === 'transfer') {
    $userIds = array_filter(array_map('intval', $body['userIds'] ?? []));
    if (count($userIds) === 0) json_error('Vui lòng chọn ít nhất 1 người cho năm mới.');

    try {
      $pdo->beginTransaction();

      // Khóa quyền của các phân công đang active cho chi này (mọi năm cũ)
      $stmt = $pdo->prepare(
        "UPDATE bai_bien_assignments SET status = 'handed_over', handed_over_at = NOW()
         WHERE chi_id <=> ? AND status = 'active'"
      );
      $stmt->execute([$chiId]);

      // Tạo phân công mới cho năm tiếp theo
      $insert = $pdo->prepare(
        'INSERT INTO bai_bien_assignments (chi_id, year, user_id, status) VALUES (?, ?, ?, ?)'
      );
      $updateUser = $pdo->prepare('UPDATE users SET year_assigned = ? WHERE id = ?');
      foreach ($userIds as $userId) {
        $insert->execute([$chiId, $year, $userId, 'active']);
        $updateUser->execute([$year, $userId]);
      }

      $pdo->commit();
    } catch (Exception $e) {
      $pdo->rollBack();
      json_error('Bàn giao thất bại: ' . $e->getMessage(), 500);
    }

    json_response(['success' => true]);
  }

  json_error('Tham số action không hợp lệ (dùng assign hoặc transfer).');
}

json_error('Method not allowed', 405);
