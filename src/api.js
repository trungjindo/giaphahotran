// Lớp giao tiếp với backend PHP. Toàn bộ dữ liệu web (gia phả, thu chi, tin tức...)
// giờ lưu trên MySQL qua các API này thay vì localStorage, để mọi người xem cùng 1 dữ liệu.

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost/api';

export const VIEWER_TOKEN_KEY = 'familyViewerToken';

// Lỗi 401 được phân biệt riêng để giao diện biết đây là "chưa xác thực" (cần hiện màn hình
// xác thực con cháu) chứ không phải lỗi mạng/máy chủ.
export class ApiAuthError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ApiAuthError';
    this.isAuthError = true;
  }
}

// Token xác thực con cháu được gắn TỰ ĐỘNG vào mọi lời gọi API, đọc thẳng từ localStorage.
// Làm ở tầng này để không phải sửa từng nơi gọi (chi.php, tombs.php, assets.php... đang được
// gọi rải rác ở nhiều trang), và để không bao giờ quên gắn ở một chỗ nào đó.
function viewerHeaders() {
  try {
    const t = localStorage.getItem(VIEWER_TOKEN_KEY);
    return t ? { 'X-Viewer-Token': t } : {};
  } catch {
    return {}; // trình duyệt chặn localStorage (chế độ riêng tư) — coi như chưa xác thực
  }
}

async function parseJsonOrThrow(res) {
  let body;
  try {
    body = await res.json();
  } catch {
    throw new Error('Máy chủ trả về dữ liệu không hợp lệ.');
  }
  if (!res.ok) {
    const message = body?.error || `Lỗi máy chủ (${res.status})`;
    if (res.status === 401) throw new ApiAuthError(message);
    throw new Error(message);
  }
  return body;
}

export async function apiGet(key, token) {
  const res = await fetch(`${API_URL}/data.php?key=${encodeURIComponent(key)}`, {
    // familyData trả về khác nhau tùy trạng thái đăng nhập (số điện thoại che hay không) —
    // không cho trình duyệt tự ý cache lại response theo suy đoán riêng.
    cache: 'no-store',
    headers: {
      ...viewerHeaders(),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });
  return parseJsonOrThrow(res);
}

// Xác thực "đúng là con cháu trong dòng họ" — trả về token chỉ-đọc dùng cho mọi API sau đó.
export async function apiVerifyFamily({ fullName, fatherName, teHoDay, teHoMonth }) {
  const res = await fetch(`${API_URL}/family_verify.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullName, fatherName, teHoDay, teHoMonth })
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, ...body };
}

export async function apiSave(key, data, token) {
  const res = await fetch(`${API_URL}/data.php?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(data)
  });
  return parseJsonOrThrow(res);
}

export async function apiLogin(username, password) {
  const res = await fetch(`${API_URL}/login.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, ...body };
}

export async function apiLogout(token) {
  if (!token) return;
  try {
    await fetch(`${API_URL}/logout.php`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch {
    // Đăng xuất cục bộ vẫn tiếp tục dù gọi API lỗi (VD mất mạng)
  }
}

export async function apiUpload(file, type, token) {
  const fd = new FormData();
  fd.append('image', file);
  const res = await fetch(`${API_URL}/upload.php?type=${encodeURIComponent(type)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd
  });
  return parseJsonOrThrow(res);
}

// Gọi chung cho các endpoint quản lý (chi.php, users.php...): tự thêm token + JSON body.
export async function apiRequest(path, { method = 'GET', body, token, params } = {}) {
  const query = params
    ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null)).toString()
    : '';
  const res = await fetch(`${API_URL}/${path}${query}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...viewerHeaders(),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {})
  });
  return parseJsonOrThrow(res);
}
