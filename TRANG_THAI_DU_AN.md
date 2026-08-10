# Trạng Thái Dự Án — Website Gia Phả Họ Trần Đình

_Cập nhật lần cuối: 10/08/2026_

## Tóm tắt nhanh

| Lớp | Hoàn thiện | Ghi chú |
|---|---|---|
| **Tính năng (giao diện + luồng thao tác)** | ~90% | Các trang/chức năng đã liệt kê bên dưới đều chạy đúng, đã kiểm thử tay |
| **Sẵn sàng vận hành thật (go-live)** | ~70% | Backend PHP + MySQL, đăng nhập an toàn, CI/CD đã xong và kiểm thử; còn thiếu bước triển khai thật lên Hostinger |
| **Dữ liệu chính thức của dòng họ** | 0% | Toàn bộ dữ liệu hiện tại là dữ liệu mẫu (họ "Trần Đình" hư cấu) |

> ✅ **Đã xử lý xong vấn đề chặn go-live quan trọng nhất:** dữ liệu (gia phả, thu chi, tin tức, giới thiệu, banner, thư viện ảnh) giờ lưu trên **MySQL dùng chung** qua backend PHP tự viết (`api/`), không còn phụ thuộc localStorage của từng trình duyệt. Đăng nhập admin đã có mã hóa mật khẩu (bcrypt) và phiên đăng nhập dạng token thay vì hard-code trong code client. Đã kiểm thử toàn bộ luồng (đăng nhập, CRUD gia phả/thu chi/tin tức, upload ảnh) trên môi trường XAMPP cục bộ mô phỏng Hostinger, hoạt động đúng 100%.
>
> Việc còn lại: **triển khai thật lên Hostinger** theo hướng dẫn trong [`DEPLOY.md`](DEPLOY.md) — tạo database MySQL trên hPanel, import `api/schema.sql`, kết nối Git nhánh `deploy`, đổi mật khẩu admin mặc định.

---

## 1. Tính năng Hiển thị (công khai)

| # | Tính năng | Trang | % Hoàn thiện | Cần nâng cấp | Ưu tiên |
|---|---|---|---|---|---|
| 1 | Trang chủ: banner slideshow, thống kê nhanh, CTA xem gia phả | `/` | 90% | Thay ảnh/nội dung demo bằng nội dung thật | Trung bình |
| 2 | Thống kê & biểu đồ dòng họ (Nam/Nữ, dâu/rể, học vấn, độ tuổi, khu vực) | `/` | 95% | Không có, hoạt động tốt | Thấp |
| 3 | Trang Giới thiệu (lịch sử, mốc son) | `/gioi-thieu` | 80% | Nội dung đang là văn bản mẫu, cần thay bằng lịch sử thật của dòng họ | **Cao** |
| 4 | Sơ đồ Gia phả (cây phả hệ, zoom/kéo thả, lọc khu vực & suất đinh) | `/gia-pha` | 95% | Chưa kiểm thử trên nhiều đời (>50 người) — có thể cần tối ưu hiệu năng khi dữ liệu lớn | Trung bình |
| 5 | Danh sách con cháu qua các đời (bảng, tìm kiếm, lọc, xuất Excel) | `/danh-sach` | 90% | Chưa có phân trang — nếu dòng họ có hàng trăm người, bảng sẽ dài | Thấp |
| 6 | Hồ sơ chi tiết thành viên (modal) | dùng chung | 95% | Không có | Thấp |
| 7 | Quản lý Thu Chi (xem công khai): phân loại nguồn thu, cân đối theo năm | `/thu-chi` | 90% | Cần dữ liệu tài chính thật của dòng họ | **Cao** |
| 8 | Tin tức & Hoạt động (danh sách + xem chi tiết) | `/tin-tuc` | 85% | Chưa có phân trang khi nhiều tin | Thấp |
| 9 | Thư viện ảnh (lưới ảnh + xem full size) | `/thu-vien` | 85% | Chưa có phân loại album/sự kiện | Thấp |
| 10 | Đăng nhập quản trị | `/login` | 40% | **Tài khoản/mật khẩu hard-code ngay trong mã nguồn phía client (`admin`/`admin123`), ai xem mã nguồn trình duyệt cũng thấy được** | **Rất cao (bảo mật)** |

## 2. Tính năng Quản trị (Khu Vực Quản Trị — `/admin`)

| # | Tính năng | Tab | % Hoàn thiện | Cần nâng cấp | Ưu tiên |
|---|---|---|---|---|---|
| 1 | Thêm/Sửa/Xóa thành viên gia phả, mã định danh tự động | Quản Lý Gia Phả | 90% | Không có | Thấp |
| 2 | Import/Export Excel danh sách gia phả | Quản Lý Gia Phả | 85% | Chưa validate kỹ dữ liệu khi import (VD: ParentID sai, trùng ID) — import lỗi có thể phá cây | Trung bình |
| 3 | Thêm/Sửa/Xóa giao dịch thu chi, phân loại nguồn thu, trạng thái thực tế/dự kiến | Quản Lý Thu Chi | 90% | Không có | Thấp |
| 4 | Upload minh chứng giao dịch (hóa đơn/bill), tồn dư đầu kỳ | Quản Lý Thu Chi | 90% | Không có | Thấp |
| 5 | Thêm/Sửa/Xóa tin tức, upload ảnh | Quản Lý Tin Tức | 90% | Không có | Thấp |
| 6 | Chỉnh nội dung trang Giới thiệu | Giới Thiệu | 85% | Không có | Thấp |
| 7 | Quản lý Banner trang chủ & Thư viện ảnh | Banner & Thư Viện Ảnh | 85% | Chưa sắp xếp lại thứ tự banner (kéo-thả) | Thấp |
| 8 | Upload ảnh (avatar, tin tức, chứng từ, banner, thư viện) | dùng chung | 90% | Giới hạn 10MB/ảnh, lưu trên đĩa server — cần server có ổ đĩa cố định (xem mục hạ tầng) | Trung bình |

## 3. Hạ tầng & Kỹ thuật (chưa có giao diện riêng nhưng quyết định độ "thật" của hệ thống)

| # | Hạng mục | % Hoàn thiện | Mô tả vấn đề | Ưu tiên |
|---|---|---|---|---|
| 1 | **Lưu trữ dữ liệu dùng chung (backend/database)** | 95% | ✅ Đã xây xong backend PHP (`api/`) + MySQL, thay hoàn toàn `localStorage`. Đã kiểm thử đầy đủ trên local; còn thiếu bước tạo DB thật + deploy lên Hostinger | **Cần deploy** |
| 2 | **Bảo mật đăng nhập admin** | 90% | ✅ Mật khẩu mã hóa bcrypt, phiên đăng nhập dạng token có hạn 30 ngày, API ghi dữ liệu yêu cầu xác thực. Còn phải đổi mật khẩu mặc định khi deploy thật | **Cần đổi mật khẩu khi deploy** |
| 3 | **Cấu hình triển khai (deploy)** | 90% | ✅ Đã bỏ hard-code, dùng biến môi trường `VITE_API_URL` (`.env`/`.env.example`), URL upload tự tính từ request. GitHub Actions tự build + publish nhánh `deploy` | **Cần deploy** |
| 4 | Biến môi trường (.env) cho API URL, secret | 100% | ✅ Đã thiết lập `.env.example`, `api/config.example.php` | Xong |
| 5 | Tên miền + HTTPS | 50% | Đã có tên miền `hotrandinh.com` trên Hostinger; HTTPS cần bật (Hostinger thường có SSL miễn phí tự động) | Cao |
| 6 | Sao lưu dữ liệu định kỳ (backup) | 30% | Gói Premium Hosting có "Sao lưu hàng tuần" tự động theo gói — đủ dùng ban đầu, nhưng nên tự export DB định kỳ thêm cho dữ liệu tài chính | Trung bình |
| 7 | Repo Git & GitHub + CI/CD | 100% | ✅ Đã thiết lập, có GitHub Actions tự build & publish (`deploy.yml`), kết nối Git tích hợp Hostinger | Xong |
| 8 | Kiểm thử tự động (unit/e2e test) | 0% | Hiện chỉ kiểm thử tay qua trình duyệt mỗi lần thay đổi | Thấp (có thể làm sau go-live) |
| 9 | SEO / thẻ meta cho mạng xã hội (Open Graph) | 15% | `index.html` mới có tiêu đề cơ bản, chưa có mô tả, ảnh chia sẻ | Thấp |
| 10 | Responsive/di động | 70% | Có CSS responsive cơ bản cho menu, nhưng các bảng nhiều cột (Danh sách con cháu, Thu Chi) chưa tối ưu riêng cho màn hình nhỏ | Trung bình |

---

## 4. Việc Cần Làm Để Go-live (xếp theo thứ tự ưu tiên)

### ✅ Mức 1 — Đã hoàn thành (xem [`DEPLOY.md`](DEPLOY.md) để triển khai)
1. ~~Xây dựng backend lưu trữ dữ liệu dùng chung~~ → Backend PHP + MySQL (`api/`), đã kiểm thử đầy đủ trên môi trường XAMPP mô phỏng Hostinger.
2. ~~Làm lại cơ chế đăng nhập an toàn~~ → bcrypt + token phiên đăng nhập, API ghi dữ liệu yêu cầu xác thực.
3. ~~Bỏ hard-code `localhost:3001`~~ → dùng `VITE_API_URL`, URL upload tự tính từ request.
4. ~~Cấu hình CI/CD~~ → GitHub Actions tự build, publish nhánh `deploy`, Hostinger Git tự đồng bộ.

**Việc còn lại để thật sự go-live:** làm theo 7 bước trong [`DEPLOY.md`](DEPLOY.md) — tạo database MySQL thật trên Hostinger, import schema, tạo `api/config.php` với thông tin thật, đổi mật khẩu admin mặc định, kết nối Git nhánh `deploy`, bật HTTPS.

### 🟠 Mức 2 — Nên làm sớm sau khi go-live
5. Thiết lập sao lưu dữ liệu tự động bổ sung (đặc biệt dữ liệu thu chi) ngoài backup hàng tuần có sẵn của Hostinger.
6. Validate chặt khi import Excel (tránh phá cây gia phả do file sai định dạng).
7. Tối ưu responsive cho các bảng dữ liệu trên di động.
8. Thêm thẻ SEO/Open Graph để chia sẻ link lên mạng xã hội đẹp hơn.

### 🟡 Mức 3 — Có thể làm dần sau go-live
9. Phân trang cho danh sách con cháu / tin tức khi dữ liệu lớn.
10. Sắp xếp lại thứ tự banner bằng kéo-thả.
11. Phân loại album cho thư viện ảnh.
12. Viết test tự động cho các luồng quan trọng (thêm/sửa/xóa thành viên, giao dịch).

---

## 5. Thiết Lập Dữ Liệu Chính Thức

Sau khi hoàn tất Mức 1 ở trên (có backend thật), cần thay dữ liệu mẫu bằng dữ liệu thật của dòng họ:

- [ ] **Gia phả:** chuẩn bị file Excel theo mẫu (`Tải Mẫu Excel` trong trang Quản Lý Gia Phả) với đầy đủ các đời thật, import vào hệ thống.
- [ ] Rà soát lại **mã định danh** tự sinh sau khi import có đúng thứ tự các đời như phả ký giấy hay không.
- [ ] Nhập **ngày sinh/mất chính xác**, **giới tính**, **địa chỉ hiện nay/địa chỉ cũ**, **học vấn**, **số điện thoại/Zalo** cho từng thành viên (đặc biệt người còn sống, để hiển thị đúng thống kê).
- [ ] Đánh dấu đúng trạng thái **"đã đăng ký suất đinh"** theo sổ họ hiện tại.
- [ ] **Thu chi:** nhập tồn dư đầu kỳ thật, nhập lại lịch sử giao dịch (hoặc ít nhất từ thời điểm bắt đầu dùng hệ thống), đính kèm ảnh chứng từ nếu có lưu.
- [ ] **Giới thiệu:** thay nội dung lịch sử/mốc son bằng tư liệu thật của dòng họ, đổi ảnh đầu trang.
- [ ] **Banner & Thư viện ảnh:** thay bằng ảnh thật (nhà thờ họ, lễ hội, hoạt động) — hiện đang là ảnh minh họa từ Unsplash.
- [ ] **Tin tức:** xóa 2 tin mẫu, đăng tin thật đầu tiên.
- [ ] Đổi **tên đăng nhập/mật khẩu admin** khỏi giá trị mặc định `admin`/`admin123` (sau khi đã có cơ chế đăng nhập an toàn ở Mức 1).
- [ ] Cập nhật **tên/logo dòng họ** trong `Navbar` (hiện đang cố định "TĐ — Trần Đình") nếu dữ liệu thật khác tên dùng khi phát triển.
