<?php
// DANH MỤC QUYỀN — nguồn sự thật duy nhất cho phân quyền.
//
// Mỗi quyền là một chuỗi cố định do code định nghĩa ở đây; bảng role_permissions chỉ lưu
// vai trò nào được cấp quyền nào. Thêm một quyền mới nghĩa là thêm một dòng ở đây rồi dùng
// require_permission() ở chỗ cần chặn — màn hình phân quyền tự động hiện quyền mới ra.
//
// Lưu ý về PHẠM VI: quyền không tự mang phạm vi. Một tài khoản có scope = 'chi' dù được cấp
// 'finance.manage' thì vẫn chỉ đụng được thu chi của đúng chi mình — phần đó do
// require_chi_access() lo, xem helpers.php.

const PERMISSION_CATALOG = [
  // --- Hệ thống: chỉ nên cấp cho người làm kỹ thuật ---
  ['key' => 'system.settings', 'group' => 'Hệ thống', 'label' => 'Cấu hình hệ thống',
   'desc' => 'Đổi câu hỏi xác thực con cháu (ngày tế họ).'],
  ['key' => 'system.roles',    'group' => 'Hệ thống', 'label' => 'Vai trò & phân quyền',
   'desc' => 'Tạo vai trò mới, sửa quyền của từng vai trò.'],
  ['key' => 'system.chi',      'group' => 'Hệ thống', 'label' => 'Cơ cấu các chi',
   'desc' => 'Thêm/sửa/xóa chi và người làm gốc của mỗi chi.'],
  ['key' => 'system.banners',  'group' => 'Hệ thống', 'label' => 'Quảng bá thành viên',
   'desc' => 'Quản lý banner doanh nghiệp/dịch vụ của thành viên.'],

  // --- Tài khoản ---
  ['key' => 'users.manage',    'group' => 'Tài khoản', 'label' => 'Quản lý tài khoản',
   'desc' => 'Tạo và sửa tài khoản. Chỉ Quản trị hệ thống mới cấp được vai trò có quyền Hệ thống.'],

  // --- Nội dung dòng họ ---
  ['key' => 'family.manage',   'group' => 'Nội dung', 'label' => 'Quản lý gia phả',
   'desc' => 'Thêm/sửa/xóa thành viên trong cây gia phả, nhập từ Excel.'],
  ['key' => 'tombs.manage',    'group' => 'Nội dung', 'label' => 'Bản đồ lăng mộ',
   'desc' => 'Quản lý lăng và vị trí an táng.'],
  ['key' => 'assets.manage',   'group' => 'Nội dung', 'label' => 'Tài sản dòng họ',
   'desc' => 'Quản lý đất đai, nhà thờ, đồ thờ, vật dụng.'],
  ['key' => 'events.manage',   'group' => 'Nội dung', 'label' => 'Lịch gia tộc',
   'desc' => 'Tạo và sửa các việc họ có ngày (giỗ tổ, tế họ, họp mặt).'],
  ['key' => 'news.manage',     'group' => 'Nội dung', 'label' => 'Tin tức & hoạt động',
   'desc' => 'Đăng và sửa bài tin tức.'],
  ['key' => 'gallery.manage',  'group' => 'Nội dung', 'label' => 'Thư viện ảnh',
   'desc' => 'Thêm/xóa ảnh trong thư viện.'],
  ['key' => 'about.manage',    'group' => 'Nội dung', 'label' => 'Giới thiệu dòng họ',
   'desc' => 'Sửa nội dung trang Giới Thiệu.'],

  // --- Thu chi & hoạt động (bị giới hạn theo chi nếu vai trò có phạm vi chi) ---
  ['key' => 'finance.manage',    'group' => 'Thu chi & hoạt động', 'label' => 'Quản lý thu chi',
   'desc' => 'Ghi thu chi. Vai trò phạm vi chi chỉ ghi được cho chi mình.'],
  ['key' => 'activities.manage', 'group' => 'Thu chi & hoạt động', 'label' => 'Hoạt động dòng họ',
   'desc' => 'Ghi hoạt động theo năm. Vai trò phạm vi chi chỉ ghi được cho chi mình.'],
  ['key' => 'baibien.manage',    'group' => 'Thu chi & hoạt động', 'label' => 'Phân công bãi biện',
   'desc' => 'Phân công người làm bãi biện theo năm.'],
];

function all_permission_keys(): array {
  return array_column(PERMISSION_CATALOG, 'key');
}

function is_valid_permission(string $key): bool {
  return in_array($key, all_permission_keys(), true);
}

// Những quyền chỉ Quản trị hệ thống mới được CẤP cho người khác. Không có rào này thì một
// tài khoản có 'users.manage' có thể tự tạo vai trò/tài khoản mang quyền hệ thống rồi tự
// nâng mình lên toàn quyền.
function is_system_permission(string $key): bool {
  return str_starts_with($key, 'system.');
}
