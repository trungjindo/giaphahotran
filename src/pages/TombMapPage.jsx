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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState(null);

  useEffect(() => {
    apiRequest('tombs.php')
      .then(setTombs)
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

  const selectedMember = useMemo(
    () => descendantList.find(m => m.id === selectedMemberId) || null,
    [descendantList, selectedMemberId]
  );

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
      ) : tombsWithMember.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '50px 20px' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Chưa có vị trí lăng mộ nào được ghi nhận.</p>
        </div>
      ) : (
        <TombMap tombs={tombsWithMember} onViewProfile={setSelectedMemberId} center={VIETNAM_CENTER} zoom={5.5} />
      )}

      <MemberProfileModal member={selectedMember} onClose={() => setSelectedMemberId(null)} />
    </div>
  );
}

export default TombMapPage;
