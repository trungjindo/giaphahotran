import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../store';
import { apiRequest } from '../api';

const currentYear = new Date().getFullYear();
const emptyForm = { year: String(currentYear), title: '', description: '' };

// Quản lý hoạt động theo năm — dùng chung cho cả dòng họ lớn (chiId = null) và từng chi.
const AdminActivities = ({ chiId = null, title = 'Hoạt Động' }) => {
  const { token } = useContext(AppContext);
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [yearFilter, setYearFilter] = useState('');

  const loadActivities = () => {
    setIsLoading(true);
    apiRequest('activities.php', { params: { chiId: chiId ?? 'null' } })
      .then(setActivities)
      .catch(err => setError(err.message))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { loadActivities(); }, [chiId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.year || !form.title) return alert('Vui lòng nhập năm và tiêu đề hoạt động.');
    try {
      const body = { chiId, year: Number(form.year), title: form.title, description: form.description };
      if (editingId) {
        await apiRequest(`activities.php?id=${editingId}`, { method: 'PUT', body, token });
        alert('Cập nhật hoạt động thành công!');
      } else {
        await apiRequest('activities.php', { method: 'POST', body, token });
        alert('Thêm hoạt động thành công!');
      }
      setForm(emptyForm);
      setEditingId(null);
      loadActivities();
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  const handleEdit = (a) => {
    setEditingId(a.id);
    setForm({ year: String(a.year), title: a.title, description: a.description || '' });
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleDelete = async (id, activityTitle) => {
    if (!window.confirm(`Xóa hoạt động "${activityTitle}"?`)) return;
    try {
      await apiRequest(`activities.php?id=${id}`, { method: 'DELETE', token });
      loadActivities();
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  const filtered = yearFilter ? activities.filter(a => a.year === Number(yearFilter)) : activities;
  const availableYears = [...new Set(activities.map(a => a.year))].sort((a, b) => b - a);

  return (
    <div>
      <div className="card" style={{ marginBottom: '30px' }}>
        <h3>{editingId ? 'Cập Nhật Hoạt Động' : `Thêm Hoạt Động ${title}`}</h3>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', marginTop: '20px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Năm *</label>
            <input type="number" value={form.year} onChange={e => setForm({...form, year: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Tiêu Đề *</label>
            <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="VD: Lễ giỗ Tổ, họp mặt đầu năm..." style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Mô Tả</label>
            <textarea rows="3" value={form.description} onChange={e => setForm({...form, description: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }}></textarea>
          </div>
          <div style={{ gridColumn: '1 / -1', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            {editingId && <button type="button" onClick={handleCancel} style={{ padding: '10px 20px', background: '#ccc', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Hủy Bỏ</button>}
            <button type="submit" className="btn-primary">{editingId ? 'Cập Nhật' : 'Thêm Hoạt Động'}</button>
          </div>
        </form>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <h3 style={{ margin: 0 }}>Danh Sách Hoạt Động ({filtered.length})</h3>
          {availableYears.length > 0 && (
            <select value={yearFilter} onChange={e => setYearFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              <option value="">Tất cả các năm</option>
              {availableYears.map(y => <option key={y} value={y}>Năm {y}</option>)}
            </select>
          )}
        </div>
        {isLoading ? <p style={{ marginTop: '15px' }}>Đang tải...</p> : error ? <p style={{ color: '#c0392b', marginTop: '15px' }}>{error}</p> : (
          <div style={{ overflowX: 'auto', marginTop: '20px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                  <th style={{ padding: '12px' }}>Năm</th>
                  <th style={{ padding: '12px' }}>Tiêu Đề</th>
                  <th style={{ padding: '12px' }}>Mô Tả</th>
                  <th style={{ padding: '12px' }}>Người Ghi</th>
                  <th style={{ padding: '12px' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px' }}>{a.year}</td>
                    <td style={{ padding: '12px', fontWeight: 'bold' }}>{a.title}</td>
                    <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{a.description || '—'}</td>
                    <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{a.createdByName || '—'}</td>
                    <td style={{ padding: '12px' }}>
                      <button onClick={() => handleEdit(a)} style={{ padding: '5px 10px', background: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '5px' }}>Sửa</button>
                      <button onClick={() => handleDelete(a.id, a.title)} style={{ padding: '5px 10px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Xóa</button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>Chưa có hoạt động nào.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminActivities;
