<?php
require_once __DIR__ . '/helpers.php';
send_cors_headers();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  json_error('Method not allowed', 405);
}

$header = get_authorization_header();
if (preg_match('/Bearer\s+(\S+)/i', $header, $m)) {
  $pdo = get_db();
  $stmt = $pdo->prepare('DELETE FROM user_sessions WHERE token = ?');
  $stmt->execute([$m[1]]);
}

json_response(['success' => true]);
