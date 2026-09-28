import React, { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppContext } from '../store';
import { apiRequest } from '../api';
import { formatDateVN } from '../utils/family';
import MapLinks from './MapLinks';

// Khối "Vị Trí Phần Mộ" trong hồ sơ một người ĐÃ MẤT.
//
// Trước đây muốn biết cụ nằm ở đâu phải sang màn hình Bản Đồ Lăng Mộ rồi dò tìm; còn muốn
// sửa thì phải vào Quản trị và cuộn bảng. Nay ngay trong hồ sơ đã có sẵn nơi an táng, nút
// dẫn đường, và (với người có quyền) lối đi thẳng tới đúng bản ghi để sửa.
//
// Dữ liệu lăng mộ là dữ liệu riêng của dòng họ, nên chỉ hỏi máy chủ khi người xem đã xác
// thực — chưa xác thực thì không gọi API để khỏi nhận 401 vô ích.
const MemberTombCard = ({ member }) => {
  const { isFamilyVerified, hasPermission, token } = useContext(AppContext);
  const [tomb, setTomb] = useState(null);
  const [state, setState] = useState('loading'); // loading | ready | error
  const [error, setError] = useState('');

  const canManage = hasPermission('tombs.manage');

  useEffect(() => {
    if (!member || member.isAlive || !isFamilyVerified) return undefined;

    // Người xem có thể bấm nhanh từ hồ sơ này sang hồ sơ khác — cờ này để kết quả của
    // người cũ về muộn không ghi đè lên người đang xem.
    let cancelled = false;
    setState('loading');
    setTomb(null);

    apiRequest(`tombs.php?memberId=${encodeURIComponent(member.id)}`, { token })
      .then(row => { if (!cancelled) { setTomb(row); setState('ready'); } })
      .catch(err => { if (!cancelled) { setError(err.message); setState('error'); } });

    return () => { cancelled = true; };
  }, [member?.id, member?.isAlive, isFamilyVerified, token]);

  if (!member || member.isAlive) return null;
  if (!isFamilyVerified) return null;

  const adminLink = `/admin?tab=tombs&member=${encodeURIComponent(member.id)}`;

  return (
    <div className="member-tomb-card">
      <h3>Vị Trí Phần Mộ</h3>

      {state === 'loading' && <p className="member-tomb-muted">Đang tra vị trí phần mộ...</p>}

      {state === 'error' && (
        <p className="member-tomb-muted" style={{ color: '#B03A3A' }}>
          Không đọc được vị trí phần mộ: {error}
        </p>
      )}

      {state === 'ready' && !tomb && (
        <div>
          <p className="member-tomb-muted">Chưa ghi nhận vị trí phần mộ cho người này.</p>
          {canManage && (
            <Link to={adminLink} className="btn-primary member-tomb-action">Ghi nhận vị trí phần mộ</Link>
          )}
        </div>
      )}

      {state === 'ready' && tomb && (
        <div className="member-tomb-body">
          {tomb.photo && (
            <img src={tomb.photo} alt={`Phần mộ ${member.name}`} loading="lazy" className="member-tomb-photo" />
          )}

          <div className="member-tomb-info">
            <div className="member-tomb-place">
              {tomb.siteName
                ? <><span className="badge badge-gold">{tomb.siteName}</span> <span className="member-tomb-muted">(lăng chung)</span></>
                : <strong>Mộ riêng</strong>}
            </div>

            {tomb.siteAddress && <div className="member-tomb-line">{tomb.siteAddress}</div>}
            {tomb.interredDate && <div className="member-tomb-line">Ngày đưa vào lăng: {formatDateVN(tomb.interredDate)}</div>}
            {tomb.description && <div className="member-tomb-line">{tomb.description}</div>}

            {tomb.latitude !== null && tomb.longitude !== null ? (
              <MapLinks lat={tomb.latitude} lng={tomb.longitude} showCoords />
            ) : (
              <div className="member-tomb-muted">Chưa có tọa độ để dẫn đường.</div>
            )}

            <div className="member-tomb-actions">
              <Link to="/ban-do-lang-mo" className="member-tomb-action-link">Xem trên bản đồ lăng mộ</Link>
              {canManage && <Link to={adminLink} className="member-tomb-action-link">Sửa vị trí này</Link>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberTombCard;
