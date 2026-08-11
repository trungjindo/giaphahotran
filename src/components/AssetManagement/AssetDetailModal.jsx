import React, { useContext, useEffect, useMemo, useState } from 'react';
import { AppContext } from '../../store';
import { apiRequest, apiGet } from '../../api';
import { getAssetCategory, getAssetStatus, calculateDepreciation, formatVND } from '../../utils/asset';
import { formatDateVN } from '../../utils/family';

const directionsUrl = (lat, lng) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

const AssetDetailModal = ({ asset, chiName, canEdit, onEdit, onDelete, onClose, compact = false }) => {
  const { token } = useContext(AppContext);
  // Bản công khai (chưa đăng nhập) chỉ có field "image" (1 ảnh), không có mảng "images" đầy
  // đủ như bản quản trị — chuẩn hóa về 1 mảng để phần hiển thị dùng chung logic.
  const images = asset?.images || (asset?.image ? [asset.image] : []);
  const [activeImage, setActiveImage] = useState(images[0] || null);
  const [financeTx, setFinanceTx] = useState(null);
  const [history, setHistory] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => { setActiveImage(images[0] || null); }, [asset]);

  useEffect(() => {
    if (!asset?.financeTxId) { setFinanceTx(null); return; }
    const load = asset.chiId == null
      ? apiGet('financeData', token)
      : apiRequest('chi_finance.php', { params: { chiId: asset.chiId } });
    load
      .then(data => setFinanceTx((data?.transactions || []).find(t => String(t.id) === String(asset.financeTxId)) || null))
      .catch(() => setFinanceTx(null));
  }, [asset, token]);

  const loadHistory = () => {
    setShowHistory(true);
    if (history !== null) return;
    apiRequest('asset_history.php', { params: { assetId: asset.id }, token })
      .then(setHistory)
      .catch(() => setHistory([]));
  };

  if (!asset) return null;

  const category = getAssetCategory(asset.category);
  const status = getAssetStatus(asset.status);
  const depreciation = useMemo(
    () => calculateDepreciation(asset.estimatedValue, asset.acquiredDate, asset.usefulLifeYears),
    [asset]
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content asset-detail-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: '0 30px 30px' }}>
          {activeImage ? (
            <div className="asset-detail-gallery">
              <img src={activeImage} alt={asset.name} className="asset-detail-main-photo" />
              {images.length > 1 && (
                <div className="asset-image-grid" style={{ marginTop: '10px' }}>
                  {images.map(url => (
                    <div key={url} className={`asset-image-thumb ${url === activeImage ? 'active' : ''}`} onClick={() => setActiveImage(url)}>
                      <img src={url} alt="" loading="lazy" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="asset-detail-noimage" style={{ background: category.color }}>{category.icon}</div>
          )}

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, fontFamily: 'var(--font-serif)', color: 'var(--primary-color)' }}>{asset.name}</h2>
            <span className="asset-status-badge" style={{ background: status.color }}>{status.label}</span>
          </div>
          <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span className="asset-category-badge" style={{ background: category.color }}>{category.icon} {category.label}</span>
            <span className="badge" style={{ background: 'var(--bg-color)', color: 'var(--text-secondary)' }}>{chiName || 'Chung của họ'}</span>
          </div>

          {asset.description && <p style={{ marginTop: '15px', lineHeight: '1.7' }}>{asset.description}</p>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '20px', background: 'var(--bg-color)', padding: '18px', borderRadius: '8px' }}>
            {!compact && <div><strong>Người bảo quản:</strong> {asset.custodian || 'Chưa rõ'}</div>}
            <div><strong>Ngày mua/tiếp nhận:</strong> {asset.acquiredDate ? formatDateVN(asset.acquiredDate) : 'Chưa rõ'}</div>
            {!compact && (
              <div style={{ gridColumn: '1 / -1' }}>
                <strong>Vị trí:</strong> {asset.address || 'Chưa rõ'}
                {asset.latitude != null && asset.longitude != null && (
                  <a href={directionsUrl(asset.latitude, asset.longitude)} target="_blank" rel="noopener noreferrer" className="tomb-directions-btn" style={{ marginLeft: '10px' }}>
                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="3 11 22 2 13 21 11 13 3 11" />
                    </svg>
                    Dẫn đường
                  </a>
                )}
              </div>
            )}
            {!compact && (
              <>
                <div><strong>Giá trị ước tính:</strong> {formatVND(asset.estimatedValue)}</div>
                <div><strong>Giá trị hiện tại (khấu hao):</strong> {depreciation ? `${formatVND(depreciation.currentValue)} (${depreciation.depreciationPercent}%)` : '—'}</div>
                <div><strong>Tuổi thọ dự kiến:</strong> {asset.usefulLifeYears ? `${asset.usefulLifeYears} năm` : 'Chưa rõ'}</div>
                <div><strong>Năm dự kiến thay thế:</strong> {asset.expectedReplaceYear || (depreciation?.expectedReplaceYear ?? 'Chưa rõ')}</div>
                <div><strong>Chi phí dự kiến thay thế:</strong> {formatVND(asset.expectedReplaceCost)}</div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <strong>Liên kết thu chi:</strong>{' '}
                  {financeTx ? `${financeTx.date} · ${financeTx.description} · ${Number(financeTx.amount).toLocaleString('vi-VN')}đ` : (asset.financeTxId ? 'Không tìm thấy giao dịch liên kết' : 'Không liên kết')}
                </div>
              </>
            )}
          </div>

          {!compact && canEdit && (
            <div style={{ marginTop: '15px' }}>
              {!showHistory ? (
                <button type="button" onClick={loadHistory} className="asset-history-toggle">📜 Xem lịch sử thay đổi</button>
              ) : (
                <div className="asset-history-list">
                  <h4 style={{ margin: '0 0 10px' }}>Lịch Sử Thay Đổi</h4>
                  {history === null ? <p>Đang tải...</p> : history.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>Chưa có lịch sử.</p> : (
                    <ul>
                      {history.map(h => (
                        <li key={h.id}>
                          <strong>{h.userName || 'Không rõ'}</strong> — {h.summary || h.action} <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>({formatDateVN(h.createdAt)})</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

          {canEdit && (
            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => onDelete(asset)} style={{ padding: '10px 20px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>Xóa</button>
              <button onClick={() => onEdit(asset)} className="btn-primary">Sửa Tài Sản</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssetDetailModal;
