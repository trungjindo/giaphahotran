// Ảnh đại diện dự phòng khi thành viên chưa có/URL ảnh bị hỏng — tạo bằng SVG data URI ngay
// trên trình duyệt (không gọi dịch vụ ngoài như via.placeholder.com, vốn hay lỗi/mất kết nối),
// nên luôn hiển thị được, không bao giờ ra icon "ảnh bị hỏng".
const AVATAR_COLORS = ['#0E6FA8', '#C87F0A', '#B03A3A', '#4E8B5C', '#7D5BA6', '#2FB3C0', '#8B5E3C', '#5C6BC0'];

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getInitials(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function getAvatarPlaceholder(name) {
  const initials = getInitials(name);
  const color = AVATAR_COLORS[hashString(name || '') % AVATAR_COLORS.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">`
    + `<rect width="120" height="120" fill="${color}"/>`
    + `<text x="60" y="63" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" `
    + `font-size="46" fill="#ffffff" font-weight="600">${initials}</text>`
    + `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
