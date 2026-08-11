import React, { useMemo, useState } from 'react';
import { ASSET_CATEGORIES, ASSET_STATUSES, getAssetCategory, getAssetStatus, formatVND } from '../../utils/asset';

// Danh sách tài sản dạng bảng + card, có tìm kiếm & lọc. compact=true dùng cho trang công
// khai (danh sách rút gọn): ẩn giá trị/người bảo quản/thao tác, chỉ hiện card ảnh + tên/loại.
const AssetList = ({ assets, chiOptions, getChiName, onSelect, onAdd, onEdit, onDelete, canEdit, compact = false }) => {
  const [view, setView] = useState('card');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [custodianFilter, setCustodianFilter] = useState('all');
  const [chiFilter, setChiFilter] = useState('all');

  const custodians = useMemo(
    () => Array.from(new Set(assets.map(a => a.custodian).filter(Boolean))).sort(),
    [assets]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return assets.filter(a => {
      if (categoryFilter !== 'all' && a.category !== categoryFilter) return false;
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (custodianFilter !== 'all' && a.custodian !== custodianFilter) return false;
      if (chiFilter !== 'all') {
        const wantChung = chiFilter === 'chung';
        if (wantChung ? a.chiId !== null : String(a.chiId) !== chiFilter) return false;
      }
      if (q) {
        const haystack = [a.name, a.description, a.custodian, a.address].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [assets, search, categoryFilter, statusFilter, custodianFilter, chiFilter]);

  return (
    <div>
      <div className="asset-filter-bar">
        <input
          type="text"
          className="input-control"
          placeholder="Tìm theo tên, mô tả, vị trí..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: '1 1 220px' }}
        />
        <select className="select-control" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
          <option value="all">Tất cả loại tài sản</option>
          {ASSET_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
        </select>
        <select className="select-control" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">Tất cả tình trạng</option>
          {ASSET_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        {!compact && custodians.length > 0 && (
          <select className="select-control" value={custodianFilter} onChange={e => setCustodianFilter(e.target.value)}>
            <option value="all">Tất cả người bảo quản</option>
            {custodians.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        {!compact && chiOptions && (
          <select className="select-control" value={chiFilter} onChange={e => setChiFilter(e.target.value)}>
            <option value="all">Tất cả các chi</option>
            <option value="chung">Chung của họ</option>
            {chiOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
        <div className="asset-view-toggle">
          <button type="button" className={view === 'card' ? 'active' : ''} onClick={() => setView('card')} aria-label="Xem dạng card">▦</button>
          <button type="button" className={view === 'table' ? 'active' : ''} onClick={() => setView('table')} aria-label="Xem dạng bảng">☰</button>
        </div>
        {canEdit && !compact && (
          <button type="button" className="btn-primary" onClick={onAdd} style={{ whiteSpace: 'nowrap' }}>+ Thêm Tài Sản</button>
        )}
      </div>

      {filtered.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '30px 0' }}>Không tìm thấy tài sản phù hợp.</p>
      ) : view === 'card' ? (
        <div className="asset-card-grid">
          {filtered.map(a => {
            const category = getAssetCategory(a.category);
            const status = getAssetStatus(a.status);
            return (
              <div key={a.id} className="asset-card" onClick={() => onSelect(a)}>
                <div className="asset-card-photo" style={a.images?.[0] || a.image ? { backgroundImage: `url(${a.images?.[0] || a.image})` } : { background: category.color }}>
                  {!(a.images?.[0] || a.image) && <span className="asset-card-photo-icon">{category.icon}</span>}
                  <span className="asset-status-badge asset-status-badge-float" style={{ background: status.color }}>{status.label}</span>
                </div>
                <div className="asset-card-body">
                  <div className="asset-card-title">{a.name}</div>
                  <div className="asset-card-meta">
                    <span className="asset-category-badge" style={{ background: category.color }}>{category.icon} {category.label}</span>
                    {!compact && <span className="asset-card-chi">{getChiName ? getChiName(a.chiId) : (a.chiId ? `Chi #${a.chiId}` : 'Chung của họ')}</span>}
                  </div>
                  {!compact && (
                    <div className="asset-card-footer">
                      <span>{a.custodian || 'Chưa có người bảo quản'}</span>
                      {a.estimatedValue != null && <strong>{formatVND(a.estimatedValue)}</strong>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '760px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                <th style={{ padding: '12px' }}>Ảnh</th>
                <th style={{ padding: '12px' }}>Tên Tài Sản</th>
                <th style={{ padding: '12px' }}>Loại</th>
                <th style={{ padding: '12px' }}>Tình Trạng</th>
                {!compact && <th style={{ padding: '12px' }}>Chi</th>}
                {!compact && <th style={{ padding: '12px' }}>Người Bảo Quản</th>}
                {!compact && <th style={{ padding: '12px' }}>Giá Trị</th>}
                {canEdit && !compact && <th style={{ padding: '12px' }}>Thao Tác</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => {
                const category = getAssetCategory(a.category);
                const status = getAssetStatus(a.status);
                const photo = a.images?.[0] || a.image;
                return (
                  <tr key={a.id} style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }} onClick={() => onSelect(a)}>
                    <td style={{ padding: '12px' }}>
                      {photo ? <img src={photo} alt="" loading="lazy" style={{ width: '44px', height: '44px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} /> : <span style={{ fontSize: '1.3rem' }}>{category.icon}</span>}
                    </td>
                    <td style={{ padding: '12px', fontWeight: 'bold' }}>{a.name}</td>
                    <td style={{ padding: '12px' }}><span className="asset-category-badge" style={{ background: category.color }}>{category.label}</span></td>
                    <td style={{ padding: '12px' }}><span className="asset-status-badge" style={{ background: status.color }}>{status.label}</span></td>
                    {!compact && <td style={{ padding: '12px' }}>{getChiName ? getChiName(a.chiId) : (a.chiId ? `Chi #${a.chiId}` : 'Chung của họ')}</td>}
                    {!compact && <td style={{ padding: '12px' }}>{a.custodian || '—'}</td>}
                    {!compact && <td style={{ padding: '12px' }}>{formatVND(a.estimatedValue)}</td>}
                    {canEdit && !compact && (
                      <td style={{ padding: '12px' }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => onEdit(a)} style={{ padding: '5px 10px', background: '#3498db', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', marginRight: '5px' }}>Sửa</button>
                        <button onClick={() => onDelete(a)} style={{ padding: '5px 10px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>Xóa</button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AssetList;
