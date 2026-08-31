import React, { useContext, useEffect, useMemo, useState } from 'react';
import { AppContext } from '../store';
import { apiRequest } from '../api';
import { buildDescendantList } from '../utils/family';
import TombMap from '../components/TombMap';
import MemberProfileModal from '../components/MemberProfileModal';

const VIETNAM_CENTER = [16.0, 106.0];

function TombMapPage() {
  const { familyData } = useContext(AppContext);
  const [tombs, setTombs] = useState([]);
  const [sites, setSites] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState(null);

  useEffect(() => {
    Promise.all([apiRequest('tombs.php'), apiRequest('tomb_sites.php')])
      .then(([tombRows, siteRows]) => { setTombs(tombRows); setSites(siteRows); })
      .catch(err => setError(err.message))
      .finally(() => setIsLoading(false));
  }, []);

  const descendantList = useMemo(() => buildDescendantList(familyData), [familyData]);
  const membersById = useMemo(
    () => Object.fromEntries(descendantList.map(m => [m.id, m])),
    [descendantList]
  );

  const tombsWithMember = useMemo(
    () => tombs
      .map(t => ({ ...t, member: membersById[t.memberId] || null, code: membersById[t.memberId]?.code }))
      .filter(t => t.member !== null),
    [tombs, membersById]
  );

  // Người nằm trong cùng một lăng được gom lại thành MỘT ghim trên bản đồ tổng — nếu để mỗi
  // người một ghim thì chúng chồng khít lên nhau (cùng tọa độ của lăng) và không bấm được.
  const siteGroups = useMemo(() => {
    const bySite = new Map();
    tombsWithMember.forEach(t => {
      if (t.siteId === null) return;
      if (!bySite.has(t.siteId)) bySite.set(t.siteId, []);
      bySite.get(t.siteId).push(t);
    });
    // Hiện MỌI lăng đã tạo, kể cả lăng chưa gán người nào — để người xem thấy lăng đã được
    // ghim ở đâu ngay sau khi quản trị viên tạo xong.
    return sites.map(s => ({ ...s, members: bySite.get(s.id) || [] }));
  }, [tombsWithMember, sites]);

  const singleTombs = useMemo(
    () => tombsWithMember.filter(t => t.siteId === null && t.latitude !== null && t.longitude !== null),
    [tombsWithMember]
  );

  const selectedMember = useMemo(
    () => descendantList.find(m => m.id === selectedMemberId) || null,
    [descendantList, selectedMemberId]
  );

  const totalPins = siteGroups.length + singleTombs.length;

  return (
    <div className="container">
      <div className="section-header">
        <span className="section-eyebrow">Dòng Họ Trần Đình</span>
        <h2>Bản Đồ Lăng Mộ Tổ Tiên</h2>
        <p>Vị trí an nghỉ của tổ tiên, ông bà — bấm vào từng ghim để xem thông tin và chỉ đường.</p>
      </div>

      {isLoading ? (
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Đang tải bản đồ...</p>
      ) : error ? (
        <p style={{ textAlign: 'center', color: '#B03A3A' }}>{error}</p>
      ) : totalPins === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '50px 20px' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Chưa có vị trí lăng mộ nào được ghi nhận.</p>
        </div>
      ) : (
        <>
          <p className="tomb-map-legend">
            <span className="tomb-map-legend-item"><span className="tomb-map-legend-dot is-site" /> Lăng chung ({siteGroups.length})</span>
            <span className="tomb-map-legend-item"><span className="tomb-map-legend-dot is-single" /> Mộ riêng lẻ ({singleTombs.length})</span>
          </p>
          <TombMap
            sites={siteGroups}
            singles={singleTombs}
            onViewProfile={setSelectedMemberId}
            center={VIETNAM_CENTER}
            zoom={5.5}
          />
        </>
      )}

      <MemberProfileModal member={selectedMember} onClose={() => setSelectedMemberId(null)} onSelectMember={setSelectedMemberId} />
    </div>
  );
}

export default TombMapPage;
