import React, { useContext, useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { AppContext } from '../store';
import { apiRequest, apiUpload } from '../api';
import { buildDescendantList, formatDateVN } from '../utils/family';

const MAX_UPLOAD_MB = 10;
const VIETNAM_CENTER = [16.0, 106.0];

const pickerIcon = L.divIcon({
  className: 'tomb-marker-icon',
  html: `<svg width="28" height="36" viewBox="0 0 34 44" xmlns="http://www.w3.org/2000/svg">
    <path d="M17 0C7.6 0 0 7.6 0 17c0 12 17 27 17 27s17-15 17-27C34 7.6 26.4 0 17 0z" fill="#0E6FA8" stroke="#F2C46A" stroke-width="1.5"/>
    <circle cx="17" cy="17" r="6" fill="#F5E9D6"/>
  </svg>`,
  iconSize: [28, 36],
  iconAnchor: [14, 36],
});

const emptyForm = { memberId: '', latitude: '', longitude: '', photo: '', description: '', interredDate: '' };

// Bấm hoặc kéo ghim trên bản đồ nhỏ để chọn tọa độ GPS thay vì phải tự gõ số.
const CoordinatePicker = ({ position, onChange }) => {
  useMapEvents({
    click(e) { onChange(e.latlng.lat, e.latlng.lng); },
  });

  return position ? (
    <Marker
      position={position}
      icon={pickerIcon}
      draggable
      eventHandlers={{ dragend: (e) => { const p = e.target.getLatLng(); onChange(p.lat, p.lng); } }}
    />
  ) : null;
};

const AdminTombs = () => {
  const { familyData, token } = useContext(AppContext);
  const [tombs, setTombs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [uploading, setUploading] = useState(false);

  const descendantList = useMemo(() => buildDescendantList(familyData), [familyData]);
  const membersById = useMemo(() => Object.fromEntries(descendantList.map(m => [m.id, m])), [descendantList]);
  const deceasedMembers = useMemo(() => descendantList.filter(m => !m.isAlive), [descendantList]);

  const loadTombs = () => {
    setIsLoading(true);
    apiRequest('tombs.php')
      .then(setTombs)
      .catch(err => setError(err.message))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { loadTombs(); }, []);

  const pickerPosition = (form.latitude !== '' && form.longitude !== '' && !isNaN(Number(form.latitude)) && !isNaN(Number(form.longitude)))
    ? [Number(form.latitude), Number(form.longitude)]
    : null;

  const setCoords = (lat, lng) => {
    setForm(prev => ({ ...prev, latitude: lat.toFixed(6), longitude: lng.toFixed(6) }));
  };

  const handleUploadPhoto = async (file) => {
    if (!file) return;
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      return alert(`File quá lớn! Vui lòng chọn ảnh dưới ${MAX_UPLOAD_MB}MB.`);
    }
    setUploading(true);
    try {
      const data = await apiUpload(file, 'tomb', token);
      if (data.success) {
        setForm(prev => ({ ...prev, photo: data.url }));
      } else {
        alert('Lỗi: ' + data.error);
      }
    } catch (err) {
      alert('Lỗi kết nối Server tải ảnh: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.memberId) return alert('Vui lòng chọn người an táng.');
    if (form.latitude === '' || form.longitude === '') return alert('Vui lòng nhập hoặc bấm chọn tọa độ GPS trên bản đồ.');

    const body = {
      memberId: form.memberId,
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      photo: form.photo,
      description: form.description,
      interredDate: form.interredDate,
    };

    try {
      if (editingId) {
        await apiRequest(`tombs.php?id=${editingId}`, { method: 'PUT', body, token });
        alert('Cập nhật vị trí lăng mộ thành công!');
      } else {
        await apiRequest('tombs.php', { method: 'POST', body, token });
        alert('Thêm vị trí lăng mộ thành công!');
      }
      setForm(emptyForm);
      setEditingId(null);
      loadTombs();
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  const handleEdit = (tomb) => {
    setEditingId(tomb.id);
    setForm({
      memberId: tomb.memberId,
      latitude: String(tomb.latitude),
      longitude: String(tomb.longitude),
      photo: tomb.photo || '',
      description: tomb.description || '',
      interredDate: tomb.interredDate || '',
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Xóa vị trí lăng mộ của "${name}"?`)) return;
    try {
      await apiRequest(`tombs.php?id=${id}`, { method: 'DELETE', token });
      loadTombs();
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: '30px' }}>
        <h3>{editingId ? 'Cập Nhật Vị Trí Lăng Mộ' : 'Thêm Vị Trí Lăng Mộ'}</h3>
        <form onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Người An Táng *</label>
              <select className="select-control" style={{ width: '100%' }} value={form.memberId} onChange={e => setForm({ ...form, memberId: e.target.value })}>
                <option value="">-- Chọn người đã mất trong cây gia phả --</option>
                {deceasedMembers.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} (#{m.code} — Đời {m.generation}){m.deathDate ? ` — mất ${new Date(m.deathDate).getFullYear()}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Vĩ độ (Latitude) *</label>
              <input type="number" step="any" className="input-control" style={{ width: '100%' }} value={form.latitude} onChange={e => setForm({ ...form, latitude: e.target.value })} placeholder="VD: 20.4388" />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Kinh độ (Longitude) *</label>
              <input type="number" step="any" className="input-control" style={{ width: '100%' }} value={form.longitude} onChange={e => setForm({ ...form, longitude: e.target.value })} placeholder="VD: 106.1621" />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Bấm vào bản đồ để chọn tọa độ (có thể kéo ghim để chỉnh)</label>
              <div className="tomb-picker-map">
                <MapContainer center={pickerPosition || VIETNAM_CENTER} zoom={pickerPosition ? 15 : 5.5} style={{ height: '100%', width: '100%' }}>
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <CoordinatePicker position={pickerPosition} onChange={setCoords} />
                </MapContainer>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Ngày Đưa Vào Lăng</label>
              <input type="date" className="input-control" style={{ width: '100%' }} value={form.interredDate} onChange={e => setForm({ ...form, interredDate: e.target.value })} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Hình Ảnh Mộ</label>
              <label className="btn-primary" style={{ display: 'inline-block', cursor: uploading ? 'wait' : 'pointer', opacity: uploading ? 0.7 : 1 }}>
                {uploading ? 'Đang tải...' : 'Tải Ảnh Lên'}
                <input type="file" accept="image/*" style={{ display: 'none' }} disabled={uploading} onChange={e => handleUploadPhoto(e.target.files[0])} />
              </label>
              {form.photo && (
                <div style={{ marginTop: '10px' }}>
                  <img src={form.photo} alt="Xem trước ảnh mộ" style={{ maxHeight: '90px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }} />
                </div>
              )}
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Mô Tả</label>
              <textarea
                className="input-control"
                style={{ width: '100%', minHeight: '80px', resize: 'vertical', fontFamily: 'inherit' }}
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Vị trí cụ thể, ghi chú thêm..."
              />
            </div>

            <div style={{ gridColumn: '1 / -1', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              {editingId && <button type="button" onClick={handleCancel} style={{ padding: '10px 20px', background: '#ccc', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>Hủy Bỏ</button>}
              <button type="submit" className="btn-primary">{editingId ? 'Cập Nhật' : 'Thêm Vị Trí'}</button>
            </div>
          </div>
        </form>
      </div>

      <div className="card">
        <h3>Danh Sách Lăng Mộ Đã Ghi Nhận ({tombs.length})</h3>
        {isLoading ? <p>Đang tải...</p> : error ? <p style={{ color: '#B03A3A' }}>{error}</p> : (
          <div style={{ overflowX: 'auto', marginTop: '20px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '760px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                  <th style={{ padding: '12px' }}>Ảnh</th>
                  <th style={{ padding: '12px' }}>Họ Tên</th>
                  <th style={{ padding: '12px' }}>Mã ĐD</th>
                  <th style={{ padding: '12px' }}>Tọa Độ</th>
                  <th style={{ padding: '12px' }}>Ngày Đưa Vào Lăng</th>
                  <th style={{ padding: '12px' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {tombs.map(t => {
                  const member = membersById[t.memberId];
                  return (
                    <tr key={t.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px' }}>
                        {t.photo ? (
                          <img src={t.photo} alt="" loading="lazy" style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} />
                        ) : '—'}
                      </td>
                      <td style={{ padding: '12px', fontWeight: 'bold' }}>{member?.name || <em style={{ color: '#B03A3A' }}>Không tìm thấy trong cây</em>}</td>
                      <td style={{ padding: '12px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{member?.code || '—'}</td>
                      <td style={{ padding: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t.latitude.toFixed(5)}, {t.longitude.toFixed(5)}</td>
                      <td style={{ padding: '12px' }}>{t.interredDate ? formatDateVN(t.interredDate) : '—'}</td>
                      <td style={{ padding: '12px' }}>
                        <button onClick={() => handleEdit(t)} style={{ padding: '5px 10px', background: '#3498db', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', marginRight: '5px' }}>Sửa</button>
                        <button onClick={() => handleDelete(t.id, member?.name || 'không rõ')} style={{ padding: '5px 10px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>Xóa</button>
                      </td>
                    </tr>
                  );
                })}
                {tombs.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>Chưa có vị trí lăng mộ nào. Thêm mục đầu tiên ở form phía trên.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminTombs;
