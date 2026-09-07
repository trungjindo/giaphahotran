import React, { useContext, useEffect, useMemo, useState } from 'react';
import { AppContext } from '../store';
import { apiRequest, apiUpload } from '../api';
import { buildDescendantList, formatDateVN } from '../utils/family';
import LocationPicker from './LocationPicker';
import SearchableSelect from './SearchableSelect';
import AdminTombSites from './AdminTombSites';

const MAX_UPLOAD_MB = 10;

// siteId !== '' => người này nằm trong 1 LĂNG chung, tọa độ lấy theo lăng.
// siteId === '' => mộ riêng lẻ, phải tự ghim tọa độ.
const emptyForm = { memberId: '', siteId: '', latitude: '', longitude: '', photo: '', description: '', interredDate: '' };

const AdminTombs = () => {
  const { familyData, token } = useContext(AppContext);
  const [subTab, setSubTab] = useState('burials');

  const [tombs, setTombs] = useState([]);
  const [sites, setSites] = useState([]);
  const [chiList, setChiList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [flyTarget, setFlyTarget] = useState(null);
  const [formKey, setFormKey] = useState(0);

  const descendantList = useMemo(() => buildDescendantList(familyData), [familyData]);
  const membersById = useMemo(() => Object.fromEntries(descendantList.map(m => [m.id, m])), [descendantList]);
  const deceasedMembers = useMemo(() => descendantList.filter(m => !m.isAlive), [descendantList]);

  const loadAll = () => {
    setIsLoading(true);
    setError('');
    Promise.all([
      apiRequest('tombs.php'),
      apiRequest('tomb_sites.php'),
    ])
      .then(([tombRows, siteRows]) => { setTombs(tombRows); setSites(siteRows); })
      .catch(err => setError(err.message))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadAll();
    apiRequest('chi.php').then(setChiList).catch(() => {});
  }, []);

  // Gõ tên (có dấu hay không dấu đều được) để tìm người trong danh sách đã mất, thay vì
  // phải cuộn tay qua hàng trăm dòng như <select> trước đây.
  const memberOptions = useMemo(() => deceasedMembers.map(m => ({
    value: m.id,
    label: m.name,
    sublabel: [
      m.code ? `#${m.code}` : null,
      m.generation ? `Đời ${m.generation}` : null,
      m.deathDate ? `mất ${new Date(m.deathDate).getFullYear()}` : null,
    ].filter(Boolean).join(' · '),
    keywords: m.code || '',
  })), [deceasedMembers]);

  // Tìm lăng theo TÊN để thêm người vào lăng đó.
  const siteOptions = useMemo(() => sites.map(s => ({
    value: String(s.id),
    label: s.name,
    sublabel: [
      s.chiName || 'Cả họ',
      `${s.memberCount} người`,
      s.address || null,
    ].filter(Boolean).join(' · '),
    keywords: [s.address, s.chiName].filter(Boolean).join(' '),
  })), [sites]);

  const selectedSite = useMemo(
    () => sites.find(s => String(s.id) === String(form.siteId)) || null,
    [sites, form.siteId]
  );

  const handleLocationChange = ({ lat, lng }) => setForm(prev => ({ ...prev, latitude: lat, longitude: lng }));

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
    if (!form.memberId) return alert('Vui lòng chọn người an táng.');
    if (!form.siteId && (form.latitude === '' || form.longitude === '')) {
      return alert('Vui lòng chọn lăng, hoặc ghim tọa độ mộ riêng trên bản đồ.');
    }

    const body = {
      memberId: form.memberId,
      siteId: form.siteId === '' ? null : Number(form.siteId),
      // Khi đã chọn lăng thì tọa độ lấy theo lăng — không gửi tọa độ riêng lên nữa.
      latitude: form.siteId === '' ? Number(form.latitude) : null,
      longitude: form.siteId === '' ? Number(form.longitude) : null,
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
      resetForm();
      loadAll();
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  const handleEdit = (tomb) => {
    setEditingId(tomb.id);
    setForm({
      memberId: tomb.memberId,
      siteId: tomb.siteId === null ? '' : String(tomb.siteId),
      // Người trong lăng không có tọa độ riêng — để trống 2 ô, tọa độ hiện theo lăng.
      latitude: tomb.siteId === null && tomb.latitude !== null ? String(tomb.latitude) : '',
      longitude: tomb.siteId === null && tomb.longitude !== null ? String(tomb.longitude) : '',
      photo: tomb.photo || '',
      description: tomb.description || '',
      interredDate: tomb.interredDate || '',
    });
    setFlyTarget(tomb.siteId === null && tomb.latitude !== null ? { lat: tomb.latitude, lng: tomb.longitude } : null);
    setFormKey(k => k + 1);
    setSubTab('burials');
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Xóa vị trí lăng mộ của "${name}"?`)) return;
    try {
      await apiRequest(`tombs.php?id=${id}`, { method: 'DELETE', token });
      loadAll();
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  return (
    <div>
      <div className="tomb-subtabs">
        <button
          type="button"
          className={subTab === 'burials' ? 'is-active' : ''}
          onClick={() => setSubTab('burials')}
        >
          Người An Táng ({tombs.length})
        </button>
        <button
          type="button"
          className={subTab === 'sites' ? 'is-active' : ''}
          onClick={() => setSubTab('sites')}
        >
          Quản Lý Lăng ({sites.length})
        </button>
      </div>

      {subTab === 'sites' ? (
        <AdminTombSites
          sites={sites}
          chiList={chiList}
          isLoading={isLoading}
          error={error}
          onReload={loadAll}
        />
      ) : (
        <div>
          <div className="card" style={{ marginBottom: '30px' }}>
            <h3>{editingId ? 'Cập Nhật Vị Trí Lăng Mộ' : 'Thêm Vị Trí Lăng Mộ'}</h3>
            <form onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="tomb-member" style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Người An Táng *</label>
                  <SearchableSelect
                    id="tomb-member"
                    options={memberOptions}
                    value={form.memberId}
                    onChange={v => setForm(prev => ({ ...prev, memberId: v }))}
                    placeholder="Gõ tên để tìm người đã mất trong cây gia phả..."
                    emptyText="Không tìm thấy người đã mất nào khớp với từ khóa."
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Nơi An Táng *</label>
                  <div className="tomb-place-modes">
                    <label className={form.siteId !== '' ? 'is-active' : ''}>
                      <input
                        type="radio"
                        name="tomb-place-mode"
                        checked={form.siteId !== ''}
                        onChange={() => setForm(prev => ({ ...prev, siteId: sites[0] ? String(sites[0].id) : '', latitude: '', longitude: '' }))}
                        disabled={sites.length === 0}
                      />
                      <span>
                        <strong>Trong một lăng chung</strong>
                        <small>Lăng tổ, lăng của chi, lăng gia đình — nhiều người cùng một ghim</small>
                      </span>
                    </label>
                    <label className={form.siteId === '' ? 'is-active' : ''}>
                      <input
                        type="radio"
                        name="tomb-place-mode"
                        checked={form.siteId === ''}
                        onChange={() => setForm(prev => ({ ...prev, siteId: '' }))}
                      />
                      <span>
                        <strong>Mộ riêng lẻ</strong>
                        <small>Tự ghim một vị trí riêng cho người này</small>
                      </span>
                    </label>
                  </div>

                  {sites.length === 0 && (
                    <p style={{ marginTop: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Chưa có lăng nào — sang tab <strong>Quản Lý Lăng</strong> để tạo lăng trước, rồi quay lại đây thêm người vào lăng.
                    </p>
                  )}
                </div>

                {form.siteId !== '' ? (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label htmlFor="tomb-site" style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Chọn Lăng *</label>
                    <SearchableSelect
                      id="tomb-site"
                      options={siteOptions}
                      value={form.siteId}
                      onChange={v => setForm(prev => ({ ...prev, siteId: v }))}
                      placeholder="Gõ tên lăng để tìm..."
                      emptyText="Không tìm thấy lăng nào khớp với từ khóa."
                    />
                    {selectedSite && (
                      <div className="tomb-site-preview">
                        <div>
                          <strong>{selectedSite.name}</strong>
                          <span className="badge badge-gold" style={{ marginLeft: '8px' }}>{selectedSite.memberCount} người</span>
                        </div>
                        {selectedSite.address && <div className="tomb-site-preview-line">{selectedSite.address}</div>}
                        <div className="tomb-site-preview-line">
                          Tọa độ dùng chung của lăng: {selectedSite.latitude.toFixed(6)}, {selectedSite.longitude.toFixed(6)}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Vị Trí Mộ Riêng *</label>
                    <LocationPicker
                      key={formKey}
                      latitude={form.latitude}
                      longitude={form.longitude}
                      onChange={handleLocationChange}
                      onClear={() => setForm(prev => ({ ...prev, latitude: '', longitude: '' }))}
                      flyTarget={flyTarget}
                      onFlyTargetChange={setFlyTarget}
                      searchPlaceholder="VD: Nghĩa trang xã..., huyện..., tỉnh Nam Định"
                    />
                  </div>
                )}

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
                    placeholder="Vị trí cụ thể trong lăng (VD: hàng 2, bên trái), ghi chú thêm..."
                  />
                </div>

                <div style={{ gridColumn: '1 / -1', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  {editingId && <button type="button" onClick={resetForm} style={{ padding: '10px 20px', background: '#ccc', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>Hủy Bỏ</button>}
                  <button type="submit" className="btn-primary">{editingId ? 'Cập Nhật' : 'Thêm Vị Trí'}</button>
                </div>
              </div>
            </form>
          </div>

          <div className="card">
            <h3>Danh Sách Lăng Mộ Đã Ghi Nhận ({tombs.length})</h3>
            {isLoading ? <p>Đang tải...</p> : error ? <p style={{ color: '#B03A3A' }}>{error}</p> : (
              <div style={{ overflowX: 'auto', marginTop: '20px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '860px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                      <th style={{ padding: '12px' }}>Ảnh</th>
                      <th style={{ padding: '12px' }}>Họ Tên</th>
                      <th style={{ padding: '12px' }}>Mã ĐD</th>
                      <th style={{ padding: '12px' }}>Nơi An Táng</th>
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
                          <td style={{ padding: '12px' }}>
                            {t.siteName
                              ? <span className="badge badge-gold">{t.siteName}</span>
                              : <em style={{ color: 'var(--text-secondary)' }}>Mộ riêng</em>}
                          </td>
                          <td style={{ padding: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            {t.latitude !== null && t.longitude !== null ? `${t.latitude.toFixed(5)}, ${t.longitude.toFixed(5)}` : '—'}
                          </td>
                          <td style={{ padding: '12px' }}>{t.interredDate ? formatDateVN(t.interredDate) : '—'}</td>
                          <td style={{ padding: '12px' }}>
                            <button onClick={() => handleEdit(t)} style={{ padding: '5px 10px', background: '#3498db', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', marginRight: '5px' }}>Sửa</button>
                            <button onClick={() => handleDelete(t.id, member?.name || 'không rõ')} style={{ padding: '5px 10px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>Xóa</button>
                          </td>
                        </tr>
                      );
                    })}
                    {tombs.length === 0 && (
                      <tr><td colSpan={7} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>Chưa có vị trí lăng mộ nào. Thêm mục đầu tiên ở form phía trên.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTombs;
