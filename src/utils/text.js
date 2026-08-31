// Chuẩn hóa chuỗi tiếng Việt để TÌM KIẾM: bỏ dấu, bỏ phân biệt hoa/thường, gộp khoảng trắng.
// Nhờ vậy gõ "tran dinh hoat" vẫn tìm ra "Trần Đình Hoạt", và gõ thiếu dấu vẫn ra kết quả —
// rất cần cho ô tìm người/tìm lăng vì hầu như không ai gõ đủ dấu khi đang tìm nhanh.
// (Bản JS của normalize_vn_name() trong api/helpers.php, dùng cho phía giao diện.)
export function normalizeVN(str) {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // bỏ các dấu thanh/dấu mũ đã tách rời sau NFD
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')                // "đ/Đ" không tách dấu bằng NFD nên phải thay tay
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// Khớp khi TẤT CẢ các từ đã gõ đều xuất hiện trong nội dung (không cần đúng thứ tự),
// nên "hoat dinh" vẫn tìm ra "Trần Đình Hoạt".
export function matchesSearch(haystack, query) {
  const q = normalizeVN(query);
  if (!q) return true;
  const target = normalizeVN(haystack);
  return q.split(' ').every(word => target.includes(word));
}

// Điểm ƯU TIÊN của một kết quả so với từ khóa — càng nhỏ càng khớp sát, dùng để XẾP HẠNG.
// Cần thiết vì matchesSearch() cố ý khớp lỏng (từng từ, không cần đúng thứ tự): gõ
// "tran dinh a" sẽ khớp cả "Trần Đình Khởi" (chữ "a" nằm trong "tran"), nên nếu không xếp
// hạng thì đúng người cần tìm lại nằm lọt thỏm giữa danh sách.
export function matchScore(text, query) {
  const q = normalizeVN(query);
  if (!q) return 0;
  const t = normalizeVN(text);
  if (t === q) return 0;            // trùng khít cả chuỗi
  if (t.startsWith(q)) return 1;    // bắt đầu bằng đúng từ khóa
  if (t.includes(q)) return 2;      // chứa nguyên cụm từ khóa
  return 3;                         // chỉ khớp rời rạc từng từ
}
