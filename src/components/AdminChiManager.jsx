import React, { useContext, useEffect, useState, useMemo } from 'react';
import { AppContext } from '../store';
import { apiRequest } from '../api';
import { flattenFamily, buildFamilyCodeMap } from '../utils/family';

const emptyForm = { name: '', rootMemberId: '', description: '' };

const AdminChiManager = () => {
  const { familyData, token } = useContext(AppContext);
  const [chiList, setChiList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const flatMembers = useMemo(() => familyData ? flattenFamily(familyData) : [], [familyData]);
  const codeMap = useMemo(() => familyData ? buildFamilyCodeMap(familyData) : {}, [familyData]);

  const loadChiList = () => {
    setIsLoading(true);
    apiRequest('chi.php')
      .then(setChiList)
      .catch(err => setError(err.message))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { loadChiList(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.rootMemberId) return alert('Vui lòng nhập tên chi và chọn người làm gốc chi.');
    try {
      if (editingId) {
        await apiRequest(`chi.php?id=${editingId}`, { method: 'PUT', body: form, token });
        alert('Cập nhật chi thành công!');
      } else {
        await apiRequest('chi.php', { method: 'POST', body: form, token });
        alert('Thêm chi thành công!');
      }
      setForm(emptyForm);
      setEditingId(null);
      loadChiList();
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  const handleEdit = (chi) => {
    setEditingId(chi.id);
    setForm({ name: chi.name, rootMemberId: chi.rootMemberId, description: chi.description || '' });
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Xóa chi "${name}"? Các tài khoản đang gán vào chi này sẽ mất quyền truy cập cho tới khi được gán lại.`)) return;
    try {
      await apiRequest(`chi.php?id=${id}`, { method: 'DELETE', token });
      loadChiList();
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: '30px' }}>
        <h3>{editingId ? 'Cập Nhật Chi' : 'Thêm Chi Mới'}</h3>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Tên Chi *</label>
            <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="VD: Chi Trưởng, Chi Trần Đình A..." style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Người Gốc Chi (Đích Tôn) *</label>
            <select value={form.rootMemberId} onChange={e => setForm({...form, rootMemberId: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
              <option value="">-- Chọn người trong cây gia phả --</option>
              {flatMembers.map(m => (
                <option key={m.id} value={m.id}>{m.name} (#{codeMap[m.id]} — Đời {m.generation})</option>
              ))}
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Ghi Chú</label>
            <input type="text" value={form.description} onChange={e => setForm({...form, description: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
          </div>
          <div style={{ gridColumn: '1 / -1', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            {editingId && <button type="button" onClick={handleCancel} style={{ padding: '10px 20px', background: '#ccc', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Hủy Bỏ</button>}
            <button type="submit" className="btn-primary">{editingId ? 'Cập Nhật' : 'Thêm Chi'}</button>
          </div>
        </form>
      </div>

      <div className="card">
        <h3>Danh Sách Chi ({chiList.length})</h3>
        {isLoading ? <p>Đang tải...</p> : error ? <p style={{ color: '#c0392b' }}>{error}</p> : (
          <div style={{ overflowX: 'auto', marginTop: '20px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                  <th style={{ padding: '12px' }}>Tên Chi</th>
                  <th style={{ padding: '12px' }}>Gốc Chi</th>
                  <th style={{ padding: '12px' }}>Số Thành Viên</th>
                  <th style={{ padding: '12px' }}>Ghi Chú</th>
                  <th style={{ padding: '12px' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {chiList.map(chi => (
                  <tr key={chi.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px', fontWeight: 'bold' }}>{chi.name}</td>
                    <td style={{ padding: '12px' }}>{chi.rootMemberName || <em style={{ color: '#c0392b' }}>Không tìm thấy trong cây</em>}</td>
                    <td style={{ padding: '12px' }}>{chi.memberCount}</td>
                    <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{chi.description || '—'}</td>
                    <td style={{ padding: '12px' }}>
                      <button onClick={() => handleEdit(chi)} style={{ padding: '5px 10px', background: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '5px' }}>Sửa</button>
                      <button onClick={() => handleDelete(chi.id, chi.name)} style={{ padding: '5px 10px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Xóa</button>
                    </td>
                  </tr>
                ))}
                {chiList.length === 0 && (
                  <tr><td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>Chưa có chi nào. Thêm chi đầu tiên ở form phía trên.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminChiManager;
