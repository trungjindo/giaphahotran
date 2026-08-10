# Hướng Dẫn Triển Khai lên Hostinger (hotrandinh.com)

Kiến trúc: Hostinger chỉ host file tĩnh (React đã build) + mã nguồn PHP dưới `/api`.
MySQL của Hostinger lưu toàn bộ dữ liệu. GitHub Actions tự build mỗi khi push lên `main`,
đẩy kết quả vào nhánh `deploy`; Hostinger dùng tính năng Git tích hợp để tự đồng bộ nhánh đó.

## Bước 1 — Thêm site hotrandinh.com trên Hostinger

1. Vào hPanel → **Trang web** → **Thêm trang web**, chọn domain `hotrandinh.com` (site thứ 3 trong gói Premium).

## Bước 2 — Tạo database MySQL riêng

1. Vào trang quản lý `hotrandinh.com` → **Cơ sở dữ liệu** → **Tạo cơ sở dữ liệu MySQL mới** (giống màn hình bạn đã dùng cho leanai.vn).
2. Đặt tên DB (VD: `hotrandinh`), tên người dùng, mật khẩu mạnh — **ghi lại 3 giá trị này** (tên DB đầy đủ sẽ có dạng `u113008662_hotrandinh`).
3. Mở **phpMyAdmin** (nút "Nhập phpMyAdmin" cạnh database vừa tạo), chọn tab **Import**, tải lên file [`api/schema.sql`](api/schema.sql) trong repo, bấm Go.
4. Kiểm tra có 3 bảng: `app_data`, `admin_users`, `admin_sessions`.

## Bước 3 — Tạo file cấu hình thật trên server

1. Vào **File Manager** trên hPanel, tới thư mục gốc của `hotrandinh.com`.
2. Sau khi nhánh `deploy` đã được đồng bộ lần đầu (Bước 5), sẽ có sẵn thư mục `api/` với file `config.example.php`.
3. Tạo file mới **`api/config.php`** (copy nội dung từ `config.example.php`), điền đúng `DB_HOST` (thường là `localhost`), `DB_NAME`, `DB_USER`, `DB_PASS` theo giá trị ở Bước 2.
4. File này **không nằm trong Git** — chỉ tồn tại trên server, không bao giờ bị ghi đè khi deploy lại (do `.gitignore` loại trừ).

## Bước 4 — Đổi mật khẩu admin mặc định

Tài khoản mặc định trong `schema.sql` là `admin` / `admin123` — **bắt buộc đổi trước khi dùng thật**:

1. Trong phpMyAdmin, chạy lệnh SQL (thay `MAT_KHAU_MOI` bằng mật khẩu bạn muốn), sau khi đã tạo hash bằng PHP:
   - Vào **File Manager** → tạo tạm 1 file `hash.php` với nội dung: `<?php echo password_hash('MAT_KHAU_MOI', PASSWORD_BCRYPT);`
   - Mở file đó trên trình duyệt (`hotrandinh.com/hash.php`) để lấy chuỗi hash, rồi **xóa file này ngay**.
2. Chạy trong phpMyAdmin (tab SQL):
   ```sql
   UPDATE admin_users SET password_hash = 'DÁN_HASH_VỪA_LẤY' WHERE username = 'admin';
   ```

## Bước 5 — Kết nối GitHub qua tính năng Git của Hostinger

1. Vào trang quản lý `hotrandinh.com` → mục **Git** (giống leanai.vn).
2. Repository: URL GitHub của dự án này.
3. **Branch: `deploy`** (không phải `main` — nhánh này do GitHub Actions tự tạo, chỉ chứa file đã build sẵn, không phải mã nguồn thô).
4. Thư mục đích: thư mục gốc web (`public_html` hoặc tương đương).

## Bước 6 — Cấu hình GitHub Actions

Trong repo GitHub → **Settings → Secrets and variables → Actions → New repository secret**, thêm:

| Tên | Giá trị |
|---|---|
| `VITE_API_URL` | `https://hotrandinh.com/api` |

Không cần thêm secret nào khác — workflow dùng `GITHUB_TOKEN` có sẵn để đẩy code, không cần mật khẩu FTP.

Từ lần push tiếp theo lên `main`, GitHub Actions sẽ tự build và cập nhật nhánh `deploy`; Hostinger phát hiện thay đổi và tự đồng bộ (tùy chọn tự động hoặc bấm "Deploy" thủ công trong mục Git, tùy Hostinger cấu hình).

## Bước 7 — Kiểm tra sau khi lên thật

- [ ] Truy cập `https://hotrandinh.com` — trang chủ tải được, không lỗi trắng trang.
- [ ] Đăng nhập admin bằng mật khẩu **mới** (không phải `admin123`).
- [ ] Thử thêm 1 giao dịch/tin tức test, tải lại trang bằng trình duyệt ẩn danh khác để xác nhận dữ liệu hiện ra (chứng tỏ đã lưu chung trên server, không còn phụ thuộc localStorage).
- [ ] Thử tải 1 ảnh lên, kiểm tra ảnh hiển thị đúng.
- [ ] Xóa dữ liệu mẫu, bắt đầu nhập dữ liệu chính thức theo checklist trong [`TRANG_THAI_DU_AN.md`](TRANG_THAI_DU_AN.md).
