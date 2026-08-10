// Lớp giao tiếp với backend PHP. Toàn bộ dữ liệu web (gia phả, thu chi, tin tức...)
// giờ lưu trên MySQL qua các API này thay vì localStorage, để mọi người xem cùng 1 dữ liệu.

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost/api';

async function parseJsonOrThrow(res) {
  let body;
  try {
    body = await res.json();
  } catch {
    throw new Error('Máy chủ trả về dữ liệu không hợp lệ.');
  }
  if (!res.ok) {
    throw new Error(body?.error || `Lỗi máy chủ (${res.status})`);
  }
  return body;
}

export async function apiGet(key) {
  const res = await fetch(`${API_URL}/data.php?key=${encodeURIComponent(key)}`);
  return parseJsonOrThrow(res);
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
