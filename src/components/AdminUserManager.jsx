import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../store';
import { apiRequest } from '../api';

const ROLE_LABELS = {
  admin: 'Quản trị dòng họ',
  chi_admin: 'Quản lý chi',
  dich_ton: 'Đích tôn',
  bai_bien: 'Bãi biện'
};

const emptyForm = { username: '', password: '', fullName: '', role: 'chi_admin', chiId: '', yearAssigned: '' };

// Cấu hình câu hỏi xác thực dành cho con cháu KHÔNG có tài khoản: ngày tế họ hàng năm.
// Đây là đáp án bảo vệ toàn bộ dữ liệu riêng của dòng họ, nên chỉ tài khoản admin thấy được.
const FamilyGateSettings = ({ token }) => {
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiRequest('settings.php', { token })
      .then(s => {
        setDay(s.teHoDay > 0 ? String(s.teHoDay) : '');
        setMonth(s.teHoMonth > 0 ? String(s.teHoMonth) : '');
      })
      .catch(err => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [token]);

  const handleSave = async () => {
    if (!day || !month) return alert('Vui lòng chọn cả ngày và tháng tế họ.');
    if (!window.confirm(
      `Đặt ngày tế họ là ngày ${day} tháng ${month} (âm lịch)?\n\n` +
      'Lưu ý: mọi con cháu đã xác thực trước đây sẽ phải xác thực lại bằng đáp án mới.'
    )) return;
    setIsSaving(true);
    try {
      await apiRequest('settings.php', {
        method: 'PUT', token,
        body: { teHoDay: Number(day), teHoMonth: Number(month) }
      });
      alert('Đã lưu câu hỏi xác thực.');
    } catch (err) {
      alert('Lỗi lưu cấu hình: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const isConfigured = day && month;

  return (
    <div className="card" style={{ marginBottom: '30px' }}>
      <h3>Xác Thực Con Cháu Dòng Họ</h3>
      <p style={{ marginTop: '8px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
        Người trong dòng họ không có tài khoản sẽ phải trả lời đúng <strong>họ tên của mình</strong>,
        <strong> họ tên cha</strong> và <strong>ngày tế họ hàng năm</strong> mới xem được gia phả,
        danh sách con cháu, lăng mộ, tài sản và thu chi. Hai câu đầu đối chiếu tự động với gia
        phả; ngày tế họ do quản trị viên đặt tại đây.
      </p>

      {isLoading ? (
        <p style={{ marginTop: '15px', color: 'var(--text-secondary)' }}>Đang tải cấu hình...</p>
      ) : error ? (
        <p style={{ marginTop: '15px', color: '#c0392b' }}>{error}</p>
      ) : (
        <>
          {!isConfigured && (
            <p style={{
              marginTop: '15px', padding: '10px 14px', borderRadius: '6px',
              background: '#fff8e1', border: '1px solid #f0c14b'
            }}>
              <strong>Chưa cấu hình.</strong> Khi chưa đặt ngày tế họ, không ai xác thực được —
              con cháu chưa có tài khoản sẽ không xem được gia phả. Hãy đặt ngay bên dưới.
            </p>
          )}

          <div style={{ marginTop: '18px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 'bold' }}>Ngày tế họ (âm lịch):</span>
            <span>Ngày</span>
            <select value={day} onChange={e => setDay(e.target.value)} style={{ padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
              <option value="">--</option>
              {Array.from({ length: 30 }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <span>tháng</span>
            <select value={month} onChange={e => setMonth(e.target.value)} style={{ padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
              <option value="">--</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <button className="btn-primary" onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Đang lưu...' : 'Lưu câu hỏi xác thực'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

const AdminUserManager = () => {
  const { token, user: currentUser } = useContext(AppContext);
  const [userList, setUserList] = useState([]);
  const [chiList, setChiList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const loadData = () => {
    setIsLoading(true);
    Promise.all([
      apiRequest('users.php', { token }),
      apiRequest('chi.php')
    ])
      .then(([users, chi]) => { setUserList(users); setChiList(chi); })
      .catch(err => setError(err.message))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.fullName || (!editingId && !form.password)) {
      return alert('Vui lòng điền đủ tên đăng nhập, họ tên' + (editingId ? '' : ' và mật khẩu') + '.');
    }
    if (form.role !== 'admin' && !form.chiId) {
      return alert('Vui lòng chọn chi cho vai trò này.');
    }
    try {
      if (editingId) {
        await apiRequest(`users.php?id=${editingId}`, { method: 'PUT', body: form, token });
        alert('Cập nhật tài khoản thành công!');
      } else {
        await apiRequest('users.php', { method: 'POST', body: form, token });
        alert('Tạo tài khoản thành công!');
      }
      setForm(emptyForm);
      setEditingId(null);
      loadData();
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  const handleEdit = (u) => {
    setEditingId(u.id);
    setForm({
      username: u.username,
      password: '',
      fullName: u.fullName,
      role: u.role,
      chiId: u.chiId ?? '',
      yearAssigned: u.yearAssigned ?? ''
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Xóa tài khoản "${name}"?`)) return;
    try {
      await apiRequest(`users.php?id=${id}`, { method: 'DELETE', token });
      loadData();
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  return (
    <div>
      {currentUser?.role === 'admin' && <FamilyGateSettings token={token} />}

      <div className="card" style={{ marginBottom: '30px' }}>
        <h3>{editingId ? 'Cập Nhật Tài Khoản' : 'Tạo Tài Khoản Mới'}</h3>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Tên Đăng Nhập *</label>
            <input type="text" value={form.username} onChange={e => setForm({...form, username: e.target.value})} disabled={!!editingId} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)', background: editingId ? 'var(--bg-color)' : 'white' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Mật Khẩu {editingId ? '(để trống nếu không đổi)' : '*'}</label>
            <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Họ Tên *</label>
            <input type="text" value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Vai Trò *</label>
            <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
              {Object.entries(ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>

          {form.role !== 'admin' && (
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Chi *</label>
              <select value={form.chiId} onChange={e => setForm({...form, chiId: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                <option value="">-- Chọn chi --</option>
                {chiList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          {form.role === 'bai_bien' && (
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Năm Phụ Trách</label>
              <input type="number" value={form.yearAssigned} onChange={e => setForm({...form, yearAssigned: e.target.value})} placeholder="VD: 2026" style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
            </div>
          )}

          <div style={{ gridColumn: '1 / -1', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            {editingId && <button type="button" onClick={handleCancel} style={{ padding: '10px 20px', background: '#ccc', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Hủy Bỏ</button>}
            <button type="submit" className="btn-primary">{editingId ? 'Cập Nhật' : 'Tạo Tài Khoản'}</button>
          </div>
        </form>
      </div>

      <div className="card">
        <h3>Danh Sách Tài Khoản ({userList.length})</h3>
        {isLoading ? <p>Đang tải...</p> : error ? <p style={{ color: '#c0392b' }}>{error}</p> : (
          <div style={{ overflowX: 'auto', marginTop: '20px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                  <th style={{ padding: '12px' }}>Họ Tên</th>
                  <th style={{ padding: '12px' }}>Tên Đăng Nhập</th>
                  <th style={{ padding: '12px' }}>Vai Trò</th>
                  <th style={{ padding: '12px' }}>Chi</th>
                  <th style={{ padding: '12px' }}>Năm PT</th>
                  <th style={{ padding: '12px' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {userList.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px', fontWeight: 'bold' }}>{u.fullName}</td>
                    <td style={{ padding: '12px' }}>{u.username}</td>
                    <td style={{ padding: '12px' }}>{ROLE_LABELS[u.role] || u.role}</td>
                    <td style={{ padding: '12px' }}>{u.chiName || '—'}</td>
                    <td style={{ padding: '12px' }}>{u.yearAssigned || '—'}</td>
                    <td style={{ padding: '12px' }}>
                      <button onClick={() => handleEdit(u)} style={{ padding: '5px 10px', background: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '5px' }}>Sửa</button>
                      {u.id !== currentUser?.id && (
                        <button onClick={() => handleDelete(u.id, u.fullName)} style={{ padding: '5px 10px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Xóa</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUserManager;
