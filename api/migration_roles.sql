-- Migration: PHÂN QUYỀN ĐỘNG (vai trò do quản trị viên tự tạo và tự cấu hình)
-- Chạy 1 lần trong phpMyAdmin (tab SQL). An toàn khi chạy lại nhiều lần.
--
-- Trước đây vai trò bị chốt cứng trong code (ENUM 4 giá trị) nên muốn thêm vai trò hay đổi
-- quyền là phải sửa code. Nay tách thành 2 bảng: danh mục VAI TRÒ và danh sách QUYỀN của
-- từng vai trò, để admin tự thêm/sửa ngay trên web.
--
-- Mỗi quyền là một chuỗi cố định do code định nghĩa (xem api/permissions.php). Bảng này chỉ
-- lưu vai trò nào được cấp những quyền nào.

-- ---------------------------------------------------------------------------
-- 1) Danh mục vai trò
--    scope = 'chi'  -> tài khoản BẮT BUỘC gắn với 1 chi, và mọi quyền chỉ có hiệu lực
--                      trong phạm vi chi đó.
--    scope = 'clan' -> phạm vi cả dòng họ.
--    is_system = 1  -> vai trò lõi, không cho xóa (tránh tự khóa mình ra ngoài).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(255) NULL,
  scope ENUM('clan', 'chi') NOT NULL DEFAULT 'clan',
  is_system TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 2) Quyền của từng vai trò
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id INT NOT NULL,
  permission VARCHAR(60) NOT NULL,
  PRIMARY KEY (role_id, permission),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 3) users.role: đổi từ ENUM cứng sang VARCHAR trỏ tới roles.code
--    Giữ nguyên tên cột và các giá trị đang có -> tài khoản hiện tại không bị ảnh hưởng.
-- ---------------------------------------------------------------------------
ALTER TABLE users MODIFY COLUMN role VARCHAR(50) NOT NULL DEFAULT 'chi_admin';

-- ---------------------------------------------------------------------------
-- 4) Nạp 5 vai trò lõi. Dùng INSERT IGNORE để chạy lại không nhân đôi, và KHÔNG ghi đè
--    vai trò đã có — admin có thể đã tự sửa tên/mô tả, không được đạp lên.
-- ---------------------------------------------------------------------------
INSERT IGNORE INTO roles (code, name, description, scope, is_system) VALUES
  ('admin',          'Quản trị hệ thống',        'Toàn quyền, kể cả cấu hình hệ thống và phân quyền.', 'clan', 1),
  ('clan_admin',     'Quản trị dòng họ',         'Toàn quyền về nội dung và hoạt động của cả dòng họ.', 'clan', 1),
  ('clan_treasurer', 'Thủ quỹ / Bãi biện dòng họ', 'Thu chi và hoạt động ở phạm vi cả dòng họ.',       'clan', 1),
  ('chi_admin',      'Quản trị chi họ',          'Quản lý nội dung và hoạt động trong phạm vi chi mình.', 'chi', 1),
  ('chi_treasurer',  'Thủ quỹ / Bãi biện chi họ', 'Thu chi và hoạt động trong phạm vi chi mình.',      'chi', 1);

-- ---------------------------------------------------------------------------
-- 5) Quyền mặc định. Đây chỉ là điểm khởi đầu — admin chỉnh lại được trên web.
--    admin KHÔNG cần liệt kê quyền: code luôn cho vai trò 'admin' đi qua mọi kiểm tra,
--    để không bao giờ có chuyện gỡ nhầm quyền rồi không ai vào sửa được nữa.
-- ---------------------------------------------------------------------------
INSERT IGNORE INTO role_permissions (role_id, permission)
SELECT r.id, p.perm FROM roles r JOIN (
  SELECT 'family.manage' AS perm UNION ALL SELECT 'tombs.manage' UNION ALL
  SELECT 'assets.manage'         UNION ALL SELECT 'events.manage' UNION ALL
  SELECT 'news.manage'           UNION ALL SELECT 'gallery.manage' UNION ALL
  SELECT 'about.manage'          UNION ALL SELECT 'finance.manage' UNION ALL
  SELECT 'activities.manage'     UNION ALL SELECT 'baibien.manage' UNION ALL
  SELECT 'users.manage'
) p WHERE r.code = 'clan_admin';

INSERT IGNORE INTO role_permissions (role_id, permission)
SELECT r.id, p.perm FROM roles r JOIN (
  SELECT 'finance.manage' AS perm UNION ALL SELECT 'activities.manage' UNION ALL
  SELECT 'baibien.manage'
) p WHERE r.code = 'clan_treasurer';

INSERT IGNORE INTO role_permissions (role_id, permission)
SELECT r.id, p.perm FROM roles r JOIN (
  SELECT 'finance.manage' AS perm UNION ALL SELECT 'activities.manage' UNION ALL
  SELECT 'baibien.manage'         UNION ALL SELECT 'users.manage'
) p WHERE r.code = 'chi_admin';

INSERT IGNORE INTO role_permissions (role_id, permission)
SELECT r.id, p.perm FROM roles r JOIN (
  SELECT 'finance.manage' AS perm UNION ALL SELECT 'activities.manage'
) p WHERE r.code = 'chi_treasurer';

-- ---------------------------------------------------------------------------
-- 6) Chuyển tài khoản đang dùng vai trò cũ sang vai trò mới.
--
--    'dich_ton' bị bỏ theo yêu cầu. KHÔNG xóa trắng vai trò của họ: tài khoản mang vai trò
--    không còn tồn tại sẽ mất sạch quyền và không ai vào sửa hộ được. Chuyển sang
--    'chi_admin' — gần nhất với quyền họ đang có — rồi quản trị viên xem lại và đổi nếu cần.
-- ---------------------------------------------------------------------------
UPDATE users SET role = 'chi_admin'     WHERE role = 'dich_ton';
UPDATE users SET role = 'chi_treasurer' WHERE role = 'bai_bien';

-- Kiểm tra lại: liệt kê số tài khoản theo từng vai trò sau khi chuyển.
SELECT u.role AS ma_vai_tro,
       COALESCE(r.name, '(!) VAI TRÒ KHÔNG TỒN TẠI - CẦN XEM LẠI') AS ten_vai_tro,
       COUNT(*) AS so_tai_khoan
FROM users u LEFT JOIN roles r ON r.code = u.role
GROUP BY u.role, r.name;
