import React, { useContext, useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { AppContext } from '../../store';
import { apiRequest, apiUpload, apiGet } from '../../api';
import AddressAutocomplete from '../AddressAutocomplete';
import { ASSET_CATEGORIES, ASSET_STATUSES } from '../../utils/asset';

const MAX_UPLOAD_MB = 10;
const MAX_IMAGES = 10;
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

const MapFlyTo = ({ target }) => {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], 16, { duration: 1 });
  }, [target, map]);
  return null;
};

const emptyForm = {
  chiId: '', name: '', category: 'vat_dung', description: '', status: 'dang_dung',
  address: '', latitude: '', longitude: '', custodian: '', acquiredDate: '',
  financeTxId: '', estimatedValue: '', usefulLifeYears: '', expectedReplaceYear: '',
  expectedReplaceCost: '', images: [],
};

// Modal thêm/sửa tài sản. chiOptions=null nghĩa là chi bị khóa cố định (giao diện quản trị
// theo chi) — dùng fixedChiId; chiOptions có giá trị nghĩa là admin toàn họ, được chọn chi
// (kể cả "Chung của họ") cho tài sản đang thêm/sửa.
const AssetForm = ({ asset, fixedChiId, chiOptions, onSaved, onCancel }) => {
  const { token } = useContext(AppContext);
  const isLocked = chiOptions == null;
  const [form, setForm] = useState(() => asset ? {
    chiId: asset.chiId === null ? '' : String(asset.chiId),
    name: asset.name || '',
    category: asset.category || 'vat_dung',
    description: asset.description || '',
    status: asset.status || 'dang_dung',
    address: asset.address || '',
    latitude: asset.latitude != null ? String(asset.latitude) : '',
    longitude: asset.longitude != null ? String(asset.longitude) : '',
    custodian: asset.custodian || '',
    acquiredDate: asset.acquiredDate || '',
    financeTxId: asset.financeTxId || '',
    estimatedValue: asset.estimatedValue != null ? String(asset.estimatedValue) : '',
    usefulLifeYears: asset.usefulLifeYears != null ? String(asset.usefulLifeYears) : '',
    expectedReplaceYear: asset.expectedReplaceYear != null ? String(asset.expectedReplaceYear) : '',
    expectedReplaceCost: asset.expectedReplaceCost != null ? String(asset.expectedReplaceCost) : '',
    images: asset.images || [],
  } : { ...emptyForm, chiId: fixedChiId != null ? String(fixedChiId) : '' });

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [flyTarget, setFlyTarget] = useState(null);
  const [financeOptions, setFinanceOptions] = useState([]);
  const [loadingFinance, setLoadingFinance] = useState(false);

  const effectiveChiId = isLocked ? fixedChiId : (form.chiId === '' ? null : Number(form.chiId));

  // Danh sách giao dịch thu chi để chọn liên kết — phụ thuộc đúng chi đang chọn cho tài sản
  // (tài sản "Chung của họ" liên kết với thu chi dòng họ lớn, tài sản của 1 chi liên kết
  // với thu chi riêng của chi đó).
  useEffect(() => {
    setLoadingFinance(true);
    const load = effectiveChiId == null
      ? apiGet('financeData', token)
      : apiRequest('chi_finance.php', { params: { chiId: effectiveChiId } });
    load
      .then(data => setFinanceOptions((data?.transactions || []).slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''))))
      .catch(() => setFinanceOptions([]))
      .finally(() => setLoadingFinance(false));
  }, [effectiveChiId, token]);

  const pickerPosition = (form.latitude !== '' && form.longitude !== '' && !isNaN(Number(form.latitude)) && !isNaN(Number(form.longitude)))
    ? [Number(form.latitude), Number(form.longitude)]
    : null;

  const setCoords = (lat, lng) => setForm(prev => ({ ...prev, latitude: lat.toFixed(6), longitude: lng.toFixed(6) }));

  const handleAddressSelect = ({ lat, lng, label }) => {
    setCoords(lat, lng);
    setFlyTarget({ lat, lng });
    setForm(prev => ({ ...prev, address: prev.address || label }));
  };

  const handleUploadImages = async (files) => {
    const list = Array.from(files || []);
    if (list.length === 0) return;
    if (form.images.length + list.length > MAX_IMAGES) {
      return alert(`Tối đa ${MAX_IMAGES} hình ảnh cho mỗi tài sản.`);
    }
    setUploading(true);
    try {
      for (const file of list) {
        if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
          alert(`Bỏ qua "${file.name}": vượt quá ${MAX_UPLOAD_MB}MB.`);
          continue;
        }
        const data = await apiUpload(file, 'asset', token);
        if (data.success) {
          setForm(prev => ({ ...prev, images: [...prev.images, data.url] }));
        } else {
          alert(`Lỗi tải "${file.name}": ${data.error}`);
        }
      }
    } catch (err) {
      alert('Lỗi kết nối Server tải ảnh: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = (url) => {
    setForm(prev => ({ ...prev, images: prev.images.filter(u => u !== url) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return alert('Vui lòng nhập tên tài sản.');

    const body = {
      chiId: effectiveChiId,
      name: form.name.trim(),
      category: form.category,
      description: form.description,
      status: form.status,
      address: form.address,
      latitude: form.latitude === '' ? null : Number(form.latitude),
      longitude: form.longitude === '' ? null : Number(form.longitude),
      custodian: form.custodian,
      acquiredDate: form.acquiredDate,
      financeTxId: form.financeTxId,
      estimatedValue: form.estimatedValue,
      usefulLifeYears: form.usefulLifeYears,
      expectedReplaceYear: form.expectedReplaceYear,
      expectedReplaceCost: form.expectedReplaceCost,
      images: form.images,
    };

    setSaving(true);
    try {
      if (asset) {
        await apiRequest(`assets.php?id=${asset.id}`, { method: 'PUT', body, token });
      } else {
        await apiRequest('assets.php', { method: 'POST', body, token });
      }
      onSaved();
    } catch (err) {
      alert('Lỗi: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content asset-form-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <button className="close-btn" onClick={onCancel}>✕</button>
          <h3 style={{ margin: 0, paddingRight: '30px' }}>{asset ? 'Cập Nhật Tài Sản' : 'Thêm Tài Sản Mới'}</h3>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '0 30px 30px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {!isLocked && (
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Thuộc Chi</label>
                <select className="select-control" style={{ width: '100%' }} value={form.chiId} onChange={e => setForm({ ...form, chiId: e.target.value })}>
                  <option value="">Chung của họ</option>
                  {chiOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Tên Tài Sản *</label>
              <input type="text" className="input-control" style={{ width: '100%' }} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="VD: Bộ bàn thờ gian giữa nhà thờ họ" />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Loại Tài Sản</label>
              <select className="select-control" style={{ width: '100%' }} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                {ASSET_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Tình Trạng Sử Dụng</label>
              <select className="select-control" style={{ width: '100%' }} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                {ASSET_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Mô Tả Chi Tiết</label>
              <textarea className="input-control" style={{ width: '100%', minHeight: '80px', resize: 'vertical', fontFamily: 'inherit' }} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Chất liệu, kích thước, ghi chú..." />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Người Đang Bảo Quản</label>
              <input type="text" className="input-control" style={{ width: '100%' }} value={form.custodian} onChange={e => setForm({ ...form, custodian: e.target.value })} placeholder="VD: Ông Trần Đình A" />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Ngày Mua / Tiếp Nhận</label>
              <input type="date" className="input-control" style={{ width: '100%' }} value={form.acquiredDate} onChange={e => setForm({ ...form, acquiredDate: e.target.value })} />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Địa Chỉ</label>
              <input type="text" className="input-control" style={{ width: '100%', marginBottom: '8px' }} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Địa chỉ hiện tại của tài sản" />
              <AddressAutocomplete onSelect={handleAddressSelect} placeholder="Tìm địa chỉ để định vị nhanh trên bản đồ..." />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Tọa Độ GPS (tùy chọn — bấm vào bản đồ hoặc kéo ghim để chọn)</label>
              <div className="tomb-picker-map">
                <MapContainer center={pickerPosition || VIETNAM_CENTER} zoom={pickerPosition ? 15 : 5.5} style={{ height: '100%', width: '100%' }}>
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <CoordinatePicker position={pickerPosition} onChange={setCoords} />
                  <MapFlyTo target={flyTarget} />
                </MapContainer>
              </div>
              {pickerPosition && (
                <button type="button" onClick={() => setForm({ ...form, latitude: '', longitude: '' })} style={{ marginTop: '8px', padding: '5px 10px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.85rem' }}>
                  Xóa tọa độ
                </button>
              )}
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Thuộc Đợt Chi Tiền Nào (liên kết Quản Lý Thu Chi)</label>
              <select className="select-control" style={{ width: '100%' }} value={form.financeTxId} onChange={e => setForm({ ...form, financeTxId: e.target.value })} disabled={loadingFinance}>
                <option value="">-- Không liên kết --</option>
                {financeOptions.map(tx => (
                  <option key={tx.id} value={tx.id}>
                    {tx.date} · {tx.description} · {Number(tx.amount).toLocaleString('vi-VN')}đ
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Giá Trị Ước Tính (đ)</label>
              <input type="number" min="0" className="input-control" style={{ width: '100%' }} value={form.estimatedValue} onChange={e => setForm({ ...form, estimatedValue: e.target.value })} placeholder="VD: 50000000" />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Tuổi Thọ Dự Kiến (năm)</label>
              <input type="number" min="0" className="input-control" style={{ width: '100%' }} value={form.usefulLifeYears} onChange={e => setForm({ ...form, usefulLifeYears: e.target.value })} placeholder="VD: 20" />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Năm Dự Kiến Thay Thế</label>
              <input type="number" className="input-control" style={{ width: '100%' }} value={form.expectedReplaceYear} onChange={e => setForm({ ...form, expectedReplaceYear: e.target.value })} placeholder="Tự tính nếu để trống" />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Chi Phí Dự Kiến Thay Thế (đ)</label>
              <input type="number" min="0" className="input-control" style={{ width: '100%' }} value={form.expectedReplaceCost} onChange={e => setForm({ ...form, expectedReplaceCost: e.target.value })} placeholder="VD: 60000000" />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Hình Ảnh Tài Sản ({form.images.length}/{MAX_IMAGES})</label>
              <label className="btn-primary" style={{ display: 'inline-block', cursor: uploading ? 'wait' : 'pointer', opacity: uploading ? 0.7 : 1 }}>
                {uploading ? 'Đang tải...' : 'Tải Ảnh Lên (chọn nhiều ảnh)'}
                <input type="file" accept="image/*" multiple style={{ display: 'none' }} disabled={uploading} onChange={e => { handleUploadImages(e.target.files); e.target.value = ''; }} />
              </label>
              {form.images.length > 0 && (
                <div className="asset-image-grid" style={{ marginTop: '12px' }}>
                  {form.images.map(url => (
                    <div key={url} className="asset-image-thumb">
                      <img src={url} alt="" loading="lazy" />
                      <button type="button" onClick={() => handleRemoveImage(url)} aria-label="Xóa ảnh">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ gridColumn: '1 / -1', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" onClick={onCancel} style={{ padding: '10px 20px', background: '#ccc', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>Hủy Bỏ</button>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Đang lưu...' : (asset ? 'Cập Nhật' : 'Thêm Tài Sản')}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssetForm;
