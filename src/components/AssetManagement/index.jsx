import React, { useContext, useEffect, useMemo, useState } from 'react';
import { AppContext } from '../../store';
import { apiRequest } from '../../api';
import AssetList from './AssetList';
import AssetMapView from './AssetMapView';
import AssetDetailModal from './AssetDetailModal';
import AssetForm from './AssetForm';

// Module quản lý tài sản dòng họ. scopeChiId===undefined nghĩa là chế độ admin toàn họ
// (thấy mọi tài sản, có thể lọc/chọn chi); scopeChiId=1 số cụ thể nghĩa là bị khóa cố định
// vào đúng chi đó (giao diện quản trị theo chi, giống AdminActivities/AdminChiFinance).
// compact=true dùng cho trang công khai: chỉ đọc, danh sách rút gọn (API tự che field nhạy
// cảm cho người chưa đăng nhập ở phía server, xem api/assets.php).
const AssetManagement = ({ scopeChiId, compact = false }) => {
  const { token, role, isAuthenticated } = useContext(AppContext);
  const [assets, setAssets] = useState([]);
  const [chiList, setChiList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);

  const isSuperAdminMode = scopeChiId === undefined;

  const load = () => {
    setIsLoading(true);
    apiRequest('assets.php', { token })
      .then(setAssets)
      .catch(err => setError(err.message))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { load(); }, [token]);

  useEffect(() => {
    if (!isSuperAdminMode) return;
    apiRequest('chi.php').then(setChiList).catch(() => {});
  }, [isSuperAdminMode]);

  const getChiName = (chiId) => {
    if (chiId === null || chiId === undefined) return 'Chung của họ';
    const found = chiList.find(c => c.id === chiId);
    return found ? found.name : `Chi #${chiId}`;
  };

  const scopedAssets = useMemo(() => {
    if (isSuperAdminMode) return assets;
    return assets.filter(a => a.chiId === scopeChiId);
  }, [assets, isSuperAdminMode, scopeChiId]);

  const canEdit = !compact && isAuthenticated && role !== 'bai_bien';

  const handleAdd = () => setEditing('new');
  const handleEdit = (asset) => { setSelected(null); setEditing(asset); };
  const handleDelete = async (asset) => {
    if (!window.confirm(`Xóa tài sản "${asset.name}"? Không thể hoàn tác.`)) return;
    try {
      await apiRequest(`assets.php?id=${asset.id}`, { method: 'DELETE', token });
      setSelected(null);
      load();
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };
  const handleSaved = () => { setEditing(null); load(); };

  if (isLoading) return <p>Đang tải danh sách tài sản...</p>;
  if (error) return <p style={{ color: '#c0392b' }}>{error}</p>;

  return (
    <div>
      {!compact && (
        <div className="asset-view-tabs">
          <button type="button" className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}>📋 Danh Sách</button>
          <button type="button" className={viewMode === 'map' ? 'active' : ''} onClick={() => setViewMode('map')}>🗺️ Bản Đồ Tài Sản</button>
        </div>
      )}

      {(viewMode === 'list' || compact) ? (
        <AssetList
          assets={scopedAssets}
          chiOptions={isSuperAdminMode ? chiList : null}
          getChiName={getChiName}
          onSelect={setSelected}
          onAdd={handleAdd}
          onEdit={handleEdit}
          onDelete={handleDelete}
          canEdit={canEdit}
          compact={compact}
        />
      ) : (
        <AssetMapView assets={scopedAssets} onViewDetail={setSelected} />
      )}

      {selected && (
        <AssetDetailModal
          asset={selected}
          chiName={getChiName(selected.chiId)}
          canEdit={canEdit}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onClose={() => setSelected(null)}
          compact={compact}
        />
      )}

      {editing && (
        <AssetForm
          asset={editing === 'new' ? null : editing}
          fixedChiId={isSuperAdminMode ? undefined : scopeChiId}
          chiOptions={isSuperAdminMode ? chiList : null}
          onSaved={handleSaved}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  );
};

export default AssetManagement;
