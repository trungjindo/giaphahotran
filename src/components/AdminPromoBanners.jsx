import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../store';
import { apiRequest, apiUpload } from '../api';

const MAX_UPLOAD_MB = 10;
const emptyForm = { businessName: '', description: '', image: '', linkUrl: '', contactName: '', isActive: true };

const AdminPromoBanners = () => {
  const { token } = useContext(AppContext);
  const [banners, setBanners] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [uploading, setUploading] = useState(false);

  const loadBanners = () => {
    setIsLoading(true);
    apiRequest('promo_banners.php', { token })
      .then(setBanners)
      .catch(err => setError(err.message))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { loadBanners(); }, []);

  const handleUploadImage = async (file) => {
    if (!file) return;
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      return alert(`File quá lớn! Vui lòng chọn ảnh dưới ${MAX_UPLOAD_MB}MB.`);
    }
    setUploading(true);
    try {
      const data = await apiUpload(file, 'promo', token);
      if (data.success) {
        setForm(prev => ({ ...prev, image: data.url }));
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
    if (!form.businessName.trim()) return alert('Vui lòng nhập tên doanh nghiệp/dịch vụ.');
    if (!form.image) return alert('Vui lòng tải lên hình ảnh banner.');
    if (form.linkUrl && !/^https?:\/\//i.test(form.linkUrl.trim())) {
      return alert('Đường dẫn phải bắt đầu bằng http:// hoặc https://');
    }

    const body = { ...form };

    try {
      if (editingId) {
        await apiRequest(`promo_banners.php?id=${editingId}`, { method: 'PUT', body, token });
        alert('Cập nhật banner thành công!');
      } else {
        await apiRequest('promo_banners.php', { method: 'POST', body, token });
        alert('Thêm banner thành công!');
      }
      setForm(emptyForm);
      setEditingId(null);
      loadBanners();
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  const handleEdit = (b) => {
    setEditingId(b.id);
    setForm({
      businessName: b.businessName,
      description: b.description || '',
      image: b.image,
      linkUrl: b.linkUrl || '',
      contactName: b.contactName || '',
      isActive: b.isActive,
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Xóa banner "${name}"?`)) return;
    try {
      await apiRequest(`promo_banners.php?id=${id}`, { method: 'DELETE', token });
      loadBanners();
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  const handleToggleActive = async (b) => {
    try {
      await apiRequest(`promo_banners.php?id=${b.id}`, {
        method: 'PUT',
        token,
        body: { businessName: b.businessName, description: b.description, image: b.image, linkUrl: b.linkUrl, contactName: b.contactName, isActive: !b.isActive },
      });
      loadBanners();
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  const handleMove = async (id, direction) => {
    try {
      await apiRequest(`promo_banners.php?id=${id}&move=${direction}`, { method: 'PUT', token });
      loadBanners();
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: '30px' }}>
        <h3>{editingId ? 'Cập Nhật Banner Quảng Cáo' : 'Thêm Banner Quảng Cáo'}</h3>
        <p style={{ color: 'var(--text-secondary)', marginTop: '5px' }}>
          Giới thiệu sản phẩm, dịch vụ hoặc công ty của thành viên trong dòng họ — hiển thị dạng banner dọc 2 bên trang web (chỉ trên màn hình rộng), tự động xoay vòng nếu có nhiều banner.
        </p>
        <form onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Tên Doanh Nghiệp/Dịch Vụ *</label>
              <input type="text" className="input-control" style={{ width: '100%' }} value={form.businessName} onChange={e => setForm({ ...form, businessName: e.target.value })} placeholder="VD: Xưởng Mộc Trần Đình Long" />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Người Liên Hệ</label>
              <input type="text" className="input-control" style={{ width: '100%' }} value={form.contactName} onChange={e => setForm({ ...form, contactName: e.target.value })} placeholder="VD: Trần Đình Long — 0912 345 678" />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Đường Dẫn (website/Zalo/Facebook — tùy chọn)</label>
              <input type="text" className="input-control" style={{ width: '100%' }} value={form.linkUrl} onChange={e => setForm({ ...form, linkUrl: e.target.value })} placeholder="https://..." />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Mô Tả Ngắn</label>
              <textarea
                className="input-control"
                style={{ width: '100%', minHeight: '70px', resize: 'vertical', fontFamily: 'inherit' }}
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="1-2 câu giới thiệu ngắn gọn về sản phẩm/dịch vụ..."
                maxLength={300}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Hình Ảnh Banner *</label>
              <label className="btn-primary" style={{ display: 'inline-block', cursor: uploading ? 'wait' : 'pointer', opacity: uploading ? 0.7 : 1 }}>
                {uploading ? 'Đang tải...' : 'Tải Ảnh Lên'}
                <input type="file" accept="image/*" style={{ display: 'none' }} disabled={uploading} onChange={e => handleUploadImage(e.target.files[0])} />
              </label>
              {form.image && (
                <div style={{ marginTop: '10px' }}>
                  <img src={form.image} alt="Xem trước banner" style={{ maxHeight: '120px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }} />
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} />
                Đang hiển thị công khai
              </label>
            </div>

            <div style={{ gridColumn: '1 / -1', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              {editingId && <button type="button" onClick={handleCancel} style={{ padding: '10px 20px', background: '#ccc', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>Hủy Bỏ</button>}
              <button type="submit" className="btn-primary">{editingId ? 'Cập Nhật' : 'Thêm Banner'}</button>
            </div>
          </div>
        </form>
      </div>

      <div className="card">
        <h3>Danh Sách Banner ({banners.length})</h3>
        {isLoading ? <p>Đang tải...</p> : error ? <p style={{ color: '#B03A3A' }}>{error}</p> : (
          <div style={{ overflowX: 'auto', marginTop: '20px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '760px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                  <th style={{ padding: '12px' }}>Thứ Tự</th>
                  <th style={{ padding: '12px' }}>Ảnh</th>
                  <th style={{ padding: '12px' }}>Tên</th>
                  <th style={{ padding: '12px' }}>Liên Hệ</th>
                  <th style={{ padding: '12px' }}>Trạng Thái</th>
                  <th style={{ padding: '12px' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {banners.map((b, i) => (
                  <tr key={b.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <button onClick={() => handleMove(b.id, 'up')} disabled={i === 0} style={{ cursor: i === 0 ? 'default' : 'pointer', opacity: i === 0 ? 0.3 : 1, border: 'none', background: 'none', fontSize: '0.9rem' }}>▲</button>
                        <button onClick={() => handleMove(b.id, 'down')} disabled={i === banners.length - 1} style={{ cursor: i === banners.length - 1 ? 'default' : 'pointer', opacity: i === banners.length - 1 ? 0.3 : 1, border: 'none', background: 'none', fontSize: '0.9rem' }}>▼</button>
                      </div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <img src={b.image} alt="" loading="lazy" style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} />
                    </td>
                    <td style={{ padding: '12px', fontWeight: 'bold' }}>
                      {b.businessName}
                      {b.description && <div style={{ fontWeight: 'normal', fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{b.description}</div>}
                    </td>
                    <td style={{ padding: '12px', fontSize: '0.9rem' }}>{b.contactName || '—'}</td>
                    <td style={{ padding: '12px' }}>
                      <button
                        onClick={() => handleToggleActive(b)}
                        style={{
                          padding: '4px 10px', borderRadius: 'var(--radius-pill)', border: 'none', cursor: 'pointer',
                          background: b.isActive ? '#DFF3E3' : '#F2E4E4', color: b.isActive ? '#1E7B34' : '#B03A3A', fontSize: '0.85rem', fontWeight: 'bold',
                        }}
                      >
                        {b.isActive ? 'Đang hiện' : 'Đang ẩn'}
                      </button>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <button onClick={() => handleEdit(b)} style={{ padding: '5px 10px', background: '#3498db', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', marginRight: '5px' }}>Sửa</button>
                      <button onClick={() => handleDelete(b.id, b.businessName)} style={{ padding: '5px 10px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>Xóa</button>
                    </td>
                  </tr>
                ))}
                {banners.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>Chưa có banner nào. Thêm mục đầu tiên ở form phía trên.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPromoBanners;
