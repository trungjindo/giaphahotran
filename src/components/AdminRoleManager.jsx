import React, { useContext, useEffect, useMemo, useState } from 'react';
import { AppContext } from '../store';
import { apiRequest } from '../api';

const emptyForm = { name: '', description: '', scope: 'clan', permissions: [] };

// Quản lý VAI TRÒ và phân quyền.
//
// Danh mục quyền do máy chủ gửi về (api/permissions.php), không chốt cứng ở đây — thêm một
// quyền mới trong code là màn hình này tự hiện ra, khỏi phải sửa giao diện.
const AdminRoleManager = () => {
  const { token } = useContext(AppContext);
  const [catalog, setCatalog] = useState([]);
  const [roles, setRoles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const load = () => {
    setIsLoading(true);
    apiRequest('roles.php', { token })
      .then(data => { setCatalog(data.catalog || []); setRoles(data.roles || []); setError(''); })
      .catch(err => setError(err.message))
      .finally(() => setIsLoading(false));
  };

  useEffect(load, []);

  // Gom quyền theo nhóm để các ô tích không thành một danh sách dài loằng ngoằng.
  const groups = useMemo(() => {
    const byGroup = new Map();
    catalog.forEach(p => {
      if (!byGroup.has(p.group)) byGroup.set(p.group, []);
      byGroup.get(p.group).push(p);
    });
    return [...byGroup.entries()];
  }, [catalog]);

  const togglePermission = (key) => setForm(prev => ({
    ...prev,
    permissions: prev.permissions.includes(key)
      ? prev.permissions.filter(p => p !== key)
      : [...prev.permissions, key],
  }));

  const resetForm = () => { setForm(emptyForm); setEditingId(null); };

  const handleEdit = (role) => {
    setEditingId(role.id);
    setForm({
      name: role.name,
      description: role.description || '',
      scope: role.scope,
      permissions: [...role.permissions],
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return alert('Vui lòng nhập tên vai trò.');
    const body = {
      name: form.name.trim(),
      description: form.description,
      scope: form.scope,
      permissions: form.permissions,
    };
    try {
      if (editingId) {
        await apiRequest(`roles.php?id=${editingId}`, { method: 'PUT', body, token });
        alert('Cập nhật vai trò thành công! Những người mang vai trò này sẽ phải đăng nhập lại.');
      } else {
        await apiRequest('roles.php', { method: 'POST', body, token });
        alert('Tạo vai trò mới thành công!');
      }
      resetForm();
      load();
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  const handleDelete = async (role) => {
    if (!window.confirm(`Xóa vai trò "${role.name}"?`)) return;
    try {
      await apiRequest(`roles.php?id=${role.id}`, { method: 'DELETE', token });
      if (editingId === role.id) resetForm();
      load();
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  const editingRole = roles.find(r => r.id === editingId);
  const isEditingAdmin = editingRole?.code === 'admin';

  return (
    <div>
      <div className="card" style={{ marginBottom: '30px' }}>
        <h3>{editingId ? `Sửa vai trò: ${editingRole?.name}` : 'Tạo Vai Trò Mới'}</h3>
        <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontSize: '0.9rem' }}>
          Vai trò quyết định người dùng thấy và làm được gì. Tích vào các quyền bạn muốn cấp.
        </p>

        <form onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Tên Vai Trò *</label>
              <input
                type="text" className="input-control" style={{ width: '100%' }}
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="VD: Thư ký dòng họ"
                disabled={isEditingAdmin}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Phạm Vi *</label>
              <div className="calendar-kind-modes">
                <label className={form.scope === 'clan' ? 'is-active' : ''}>
                  <input type="radio" name="role-scope" checked={form.scope === 'clan'}
                    onChange={() => setForm({ ...form, scope: 'clan' })} disabled={isEditingAdmin} />
                  <span><strong>Cả dòng họ</strong><small>Làm việc trên dữ liệu của toàn dòng họ</small></span>
                </label>
                <label className={form.scope === 'chi' ? 'is-active' : ''}>
                  <input type="radio" name="role-scope" checked={form.scope === 'chi'}
                    onChange={() => setForm({ ...form, scope: 'chi' })} disabled={isEditingAdmin} />
                  <span><strong>Trong một chi</strong><small>Chỉ đụng được dữ liệu của chi mình</small></span>
                </label>
              </div>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Mô Tả</label>
              <input
                type="text" className="input-control" style={{ width: '100%' }}
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Vai trò này phụ trách việc gì"
                disabled={isEditingAdmin}
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '10px' }}>
                Quyền ({form.permissions.length}/{catalog.length})
              </label>
              {isEditingAdmin && (
                <p className="calendar-preview" style={{ marginBottom: 12 }}>
                  Vai trò Quản trị hệ thống luôn có toàn quyền và không thể chỉnh sửa — đây là
                  lối vào cuối cùng để cứu hệ thống nếu phân quyền bị cấu hình sai.
                </p>
              )}
              <div className="perm-groups">
                {groups.map(([groupName, perms]) => (
                  <fieldset key={groupName} className="perm-group">
                    <legend>{groupName}</legend>
                    {perms.map(p => (
                      <label key={p.key} className="perm-item">
                        <input
                          type="checkbox"
                          checked={form.permissions.includes(p.key)}
                          onChange={() => togglePermission(p.key)}
                          disabled={isEditingAdmin}
                        />
                        <span>
                          <strong>{p.label}</strong>
                          <small>{p.desc}</small>
                        </span>
                      </label>
                    ))}
                  </fieldset>
                ))}
              </div>
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              {editingId && <button type="button" onClick={resetForm} style={{ padding: '10px 20px', background: '#ccc', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>Hủy Bỏ</button>}
              <button type="submit" className="btn-primary" disabled={isEditingAdmin}>
                {editingId ? 'Cập Nhật Vai Trò' : 'Tạo Vai Trò'}
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="card">
        <h3>Các Vai Trò ({roles.length})</h3>
        {isLoading ? <p>Đang tải...</p> : error ? <p style={{ color: '#B03A3A' }}>{error}</p> : (
          <div style={{ overflowX: 'auto', marginTop: '20px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '760px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                  <th style={{ padding: '12px' }}>Vai Trò</th>
                  <th style={{ padding: '12px' }}>Phạm Vi</th>
                  <th style={{ padding: '12px' }}>Số Quyền</th>
                  <th style={{ padding: '12px' }}>Tài Khoản</th>
                  <th style={{ padding: '12px' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {roles.map(r => (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px' }}>
                      <strong>{r.name}</strong>
                      {r.isSystem && <span className="badge badge-gold" style={{ marginLeft: 8 }}>Lõi</span>}
                      {r.description && <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{r.description}</div>}
                    </td>
                    <td style={{ padding: '12px' }}>{r.scope === 'chi' ? 'Trong một chi' : 'Cả dòng họ'}</td>
                    <td style={{ padding: '12px' }}>
                      {r.code === 'admin' ? <em>Toàn quyền</em> : `${r.permissions.length}/${catalog.length}`}
                    </td>
                    <td style={{ padding: '12px' }}>{r.userCount}</td>
                    <td style={{ padding: '12px' }}>
                      <button onClick={() => handleEdit(r)} style={{ padding: '5px 10px', background: '#3498db', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', marginRight: '5px' }}>
                        {r.code === 'admin' ? 'Xem' : 'Sửa'}
                      </button>
                      {!r.isSystem && (
                        <button onClick={() => handleDelete(r)} style={{ padding: '5px 10px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>Xóa</button>
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

export default AdminRoleManager;
