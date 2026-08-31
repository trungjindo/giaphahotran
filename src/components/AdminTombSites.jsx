import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../store';
import { apiRequest, apiUpload } from '../api';
import LocationPicker from './LocationPicker';

const MAX_UPLOAD_MB = 10;

const emptyForm = { name: '', chiId: '', latitude: '', longitude: '', address: '', photo: '', description: '' };

// Quản lý DANH MỤC LĂNG — lăng tổ, lăng của chi, lăng gia đình: những nơi có NHIỀU người
// cùng an táng. Ghim vị trí ở đây đúng 1 lần, sau đó sang tab "Người An Táng" chỉ cần gõ tên
// lăng để thêm từng người vào, khỏi phải nhập lại tọa độ cho từng người.
const AdminTombSites = ({ sites, chiList, isLoading, error, onReload }) => {
  const { token } = useContext(AppContext);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [flyTarget, setFlyTarget] = useState(null);
  // Đổi khi bắt đầu sửa 1 lăng khác, để React dựng lại ô tìm địa chỉ với giá trị điền sẵn mới.
  const [formKey, setFormKey] = useState(0);

  useEffect(() => { setFlyTarget(null); }, [editingId]);

  const handleLocationChange = ({ lat, lng, address }) => {
    setForm(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      // Bấm thẳng lên bản đồ thì không có tên địa chỉ — giữ nguyên địa chỉ đang có.
      ...(address ? { address } : {}),
    }));
  };

  const handleUploadPhoto = async (file) => {
    if (!file) return;
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      return alert(`File quá lớn! Vui lòng chọn ảnh dưới ${MAX_UPLOAD_MB}MB.`);
    }
    setUploading(true);
    try {
      const data = await apiUpload(file, 'tomb', token);
      if (data.success) setForm(prev => ({ ...prev, photo: data.url }));
      else alert('Lỗi: ' + data.error);
    } catch (err) {
      alert('Lỗi kết nối Server tải ảnh: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setFlyTarget(null);
    setFormKey(k => k + 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return alert('Vui lòng nhập tên lăng.');
    if (form.latitude === '' || form.longitude === '') return alert('Vui lòng ghim vị trí lăng trên bản đồ.');

    const body = {
      name: form.name.trim(),
      chiId: form.chiId === '' ? null : Number(form.chiId),
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      address: form.address,
      photo: form.photo,
      description: form.description,
    };

    try {
      if (editingId) {
        await apiRequest(`tomb_sites.php?id=${editingId}`, { method: 'PUT', body, token });
        alert('Cập nhật lăng thành công!');
      } else {
        await apiRequest('tomb_sites.php', { method: 'POST', body, token });
        alert('Tạo lăng thành công! Giờ có thể sang tab "Người An Táng" để thêm người vào lăng này.');
      }
      resetForm();
      onReload();
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  const handleEdit = (site) => {
    setEditingId(site.id);
    setForm({
      name: site.name,
      chiId: site.chiId === null ? '' : String(site.chiId),
      latitude: String(site.latitude),
      longitude: String(site.longitude),
      address: site.address || '',
      photo: site.photo || '',
      description: site.description || '',
    });
    setFlyTarget({ lat: site.latitude, lng: site.longitude });
    setFormKey(k => k + 1);
  };

  const handleDelete = async (site) => {
    if (site.memberCount > 0) {
      return alert(
        `Lăng "${site.name}" đang có ${site.memberCount} người an táng.\n\n`
        + 'Hãy chuyển những người đó sang lăng khác (hoặc sang mộ riêng) ở tab "Người An Táng" trước khi xóa lăng này.'
      );
    }
    if (!window.confirm(`Xóa lăng "${site.name}"?`)) return;
    try {
      await apiRequest(`tomb_sites.php?id=${site.id}`, { method: 'DELETE', token });
      if (editingId === site.id) resetForm();
      onReload();
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: '30px' }}>
        <h3>{editingId ? 'Cập Nhật Lăng' : 'Tạo Lăng Mới'}</h3>
        <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontSize: '0.9rem' }}>
          Lăng là nơi có <strong>nhiều người cùng an táng</strong> — lăng tổ, lăng của chi, lăng gia đình.
          Ghim vị trí ở đây một lần, sau đó vào tab <strong>Người An Táng</strong> gõ tên lăng để thêm từng người vào.
        </p>

        <form onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Tên Lăng *</label>
              <input
                type="text" className="input-control" style={{ width: '100%' }}
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="VD: Lăng Tổ Trần Đình, Lăng Chi 3, Lăng gia đình ông Hoạt"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Thuộc Chi</label>
              <select
                className="select-control" style={{ width: '100%' }}
                value={form.chiId}
                onChange={e => setForm({ ...form, chiId: e.target.value })}
              >
                <option value="">-- Lăng chung của cả họ --</option>
                {chiList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Vị Trí Lăng *</label>
              <LocationPicker
                key={formKey}
                latitude={form.latitude}
                longitude={form.longitude}
                onChange={handleLocationChange}
                onClear={() => setForm(prev => ({ ...prev, latitude: '', longitude: '' }))}
                flyTarget={flyTarget}
                onFlyTargetChange={setFlyTarget}
                addressInitialValue={form.address}
                searchPlaceholder="VD: Nghĩa trang xã..., huyện..., tỉnh Nam Định"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Ảnh Lăng</label>
              <label className="btn-primary" style={{ display: 'inline-block', cursor: uploading ? 'wait' : 'pointer', opacity: uploading ? 0.7 : 1 }}>
                {uploading ? 'Đang tải...' : 'Tải Ảnh Lên'}
                <input type="file" accept="image/*" style={{ display: 'none' }} disabled={uploading} onChange={e => handleUploadPhoto(e.target.files[0])} />
              </label>
              {form.photo && (
                <div style={{ marginTop: '10px' }}>
                  <img src={form.photo} alt="Xem trước ảnh lăng" style={{ maxHeight: '90px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }} />
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Mô Tả</label>
              <textarea
                className="input-control"
                style={{ width: '100%', minHeight: '80px', resize: 'vertical', fontFamily: 'inherit' }}
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Lối vào, dấu mốc dễ nhận biết, ghi chú thêm..."
              />
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              {editingId && <button type="button" onClick={resetForm} style={{ padding: '10px 20px', background: '#ccc', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>Hủy Bỏ</button>}
              <button type="submit" className="btn-primary">{editingId ? 'Cập Nhật Lăng' : 'Tạo Lăng'}</button>
            </div>
          </div>
        </form>
      </div>

      <div className="card">
        <h3>Danh Sách Lăng ({sites.length})</h3>
        {isLoading ? <p>Đang tải...</p> : error ? <p style={{ color: '#B03A3A' }}>{error}</p> : (
          <div style={{ overflowX: 'auto', marginTop: '20px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '760px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                  <th style={{ padding: '12px' }}>Ảnh</th>
                  <th style={{ padding: '12px' }}>Tên Lăng</th>
                  <th style={{ padding: '12px' }}>Thuộc Chi</th>
                  <th style={{ padding: '12px' }}>Số Người</th>
                  <th style={{ padding: '12px' }}>Tọa Độ</th>
                  <th style={{ padding: '12px' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {sites.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px' }}>
                      {s.photo ? <img src={s.photo} alt="" loading="lazy" style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} /> : '—'}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <strong>{s.name}</strong>
                      {s.address && <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{s.address}</div>}
                    </td>
                    <td style={{ padding: '12px' }}>{s.chiName || <em style={{ color: 'var(--text-secondary)' }}>Cả họ</em>}</td>
                    <td style={{ padding: '12px' }}>
                      <span className="badge badge-gold">{s.memberCount} người</span>
                    </td>
                    <td style={{ padding: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {s.latitude.toFixed(5)}, {s.longitude.toFixed(5)}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <button onClick={() => handleEdit(s)} style={{ padding: '5px 10px', background: '#3498db', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', marginRight: '5px' }}>Sửa</button>
                      <button onClick={() => handleDelete(s)} style={{ padding: '5px 10px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>Xóa</button>
                    </td>
                  </tr>
                ))}
                {sites.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    Chưa có lăng nào. Tạo lăng đầu tiên ở form phía trên.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminTombSites;
