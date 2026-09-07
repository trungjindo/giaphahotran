import React, { useContext, useEffect, useMemo, useState } from 'react';
import { AppContext } from '../store';
import { buildDescendantList, calculateAge, describeRelationship, formatDateVN } from '../utils/family';
import { geocodeAddress, haversineDistanceKm } from '../utils/geo';

const addressOf = (m) => [m.currentWard, m.currentProvince].filter(Boolean).join(', ');

const mapsDirectionsUrl = (a, b) => `https://www.google.com/maps/dir/?api=1&origin=${a.lat},${a.lng}&destination=${b.lat},${b.lng}`;

// So sánh vai vế, tuổi tác, nơi ở và khoảng cách địa lý giữa 2 người bất kỳ trong cây gia
// phả. Khoảng cách được suy ra bằng cách định vị Phường/Xã + Tỉnh/Thành của mỗi người qua
// Nominatim (OpenStreetMap, miễn phí) — là vị trí gần đúng của khu vực, không phải nhà riêng
// chính xác, vì hồ sơ thành viên hiện chỉ lưu tới cấp phường/xã.
const CompareMembersModal = ({ onClose }) => {
  const { familyData } = useContext(AppContext);
  const descendantList = useMemo(() => buildDescendantList(familyData), [familyData]);
  const sortedList = useMemo(
    () => [...descendantList].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true })),
    [descendantList]
  );

  const [idA, setIdA] = useState('');
  const [idB, setIdB] = useState('');
  const [distanceState, setDistanceState] = useState(null); // null | 'loading' | { km, pointA, pointB }

  const memberA = descendantList.find(m => m.id === idA) || null;
  const memberB = descendantList.find(m => m.id === idB) || null;
  const relationship = useMemo(
    () => (memberA && memberB ? describeRelationship(idA, idB, familyData) : null),
    [idA, idB, memberA, memberB, familyData]
  );

  useEffect(() => {
    if (!memberA || !memberB) { setDistanceState(null); return; }
    const addrA = addressOf(memberA);
    const addrB = addressOf(memberB);
    if (!addrA || !addrB) { setDistanceState(null); return; }

    let cancelled = false;
    setDistanceState('loading');
    (async () => {
      const pointA = await geocodeAddress(addrA);
      const pointB = await geocodeAddress(addrB);
      if (cancelled) return;
      if (pointA && pointB) {
        setDistanceState({ km: haversineDistanceKm(pointA.lat, pointA.lng, pointB.lat, pointB.lng), pointA, pointB });
      } else {
        setDistanceState({ km: null, pointA, pointB });
      }
    })();
    return () => { cancelled = true; };
  }, [idA, idB]);

  const ageA = memberA ? calculateAge(memberA.birthDate, memberA.deathDate, memberA.isAlive) : null;
  const ageB = memberB ? calculateAge(memberB.birthDate, memberB.deathDate, memberB.isAlive) : null;
  const ageDiff = (ageA !== null && ageB !== null) ? Math.abs(ageA - ageB) : null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="So sánh 2 người trong dòng họ">
      <div className="modal-content compare-modal-content" onClick={e => e.stopPropagation()}>
        <div className="compare-modal-header">
          <h2>So Sánh 2 Người Trong Dòng Họ</h2>
          <button className="modal-close-btn" style={{ position: 'static' }} onClick={onClose} aria-label="Đóng">✕</button>
        </div>

        <div className="compare-picker-row">
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Người thứ nhất</label>
            <select className="select-control" style={{ width: '100%' }} value={idA} onChange={e => setIdA(e.target.value)}>
              <option value="">-- Chọn người --</option>
              {sortedList.map(m => (
                <option key={m.id} value={m.id} disabled={m.id === idB}>{m.name} (#{m.code} — Đời {m.generation})</option>
              ))}
            </select>
          </div>
          <div className="compare-picker-vs">so với</div>
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Người thứ hai</label>
            <select className="select-control" style={{ width: '100%' }} value={idB} onChange={e => setIdB(e.target.value)}>
              <option value="">-- Chọn người --</option>
              {sortedList.map(m => (
                <option key={m.id} value={m.id} disabled={m.id === idA}>{m.name} (#{m.code} — Đời {m.generation})</option>
              ))}
            </select>
          </div>
        </div>

        {memberA && memberB && (
          <div className="compare-table-wrap">
            <table className="compare-table">
              <thead>
                <tr>
                  <th>Tiêu chí</th>
                  <th>{memberA.name}</th>
                  <th>{memberB.name}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Vai vế trong gia phả</td>
                  <td>Đời {memberA.generation} · Mã {memberA.code}</td>
                  <td>Đời {memberB.generation} · Mã {memberB.code}</td>
                </tr>
                <tr>
                  <td>Quan hệ xưng hô</td>
                  <td colSpan={2} className="compare-relation-cell">
                    {relationship
                      ? <>
                          <strong>{relationship.relationLabel}</strong>
                          <div className="compare-relation-detail">
                            {memberA.name} gọi {memberB.name} là <strong>{relationship.aCallsB}</strong> · {memberB.name} gọi {memberA.name} là <strong>{relationship.bCallsA}</strong>
                          </div>
                        </>
                      : <span style={{ color: 'var(--text-secondary)' }}>Không xác định được quan hệ (không cùng nhánh huyết thống trong cây).</span>
                    }
                  </td>
                </tr>
                <tr>
                  <td>Năm sinh</td>
                  <td>{memberA.birthDate ? new Date(memberA.birthDate).getFullYear() : 'Chưa rõ'}</td>
                  <td>{memberB.birthDate ? new Date(memberB.birthDate).getFullYear() : 'Chưa rõ'}</td>
                </tr>
                <tr>
                  <td>Tuổi hiện tại</td>
                  <td>{ageA !== null ? `${ageA} tuổi${!memberA.isAlive ? ' (hưởng thọ)' : ''}` : 'Chưa rõ'}</td>
                  <td>{ageB !== null ? `${ageB} tuổi${!memberB.isAlive ? ' (hưởng thọ)' : ''}` : 'Chưa rõ'}</td>
                </tr>
                <tr>
                  <td>Chênh lệch tuổi</td>
                  <td colSpan={2}>{ageDiff !== null ? `${ageDiff} tuổi` : 'Chưa xác định được (thiếu ngày sinh)'}</td>
                </tr>
                <tr>
                  <td>Nơi sinh sống hiện tại</td>
                  <td>{addressOf(memberA) || 'Chưa rõ'}</td>
                  <td>{addressOf(memberB) || 'Chưa rõ'}</td>
                </tr>
                <tr>
                  <td>Khoảng cách địa lý</td>
                  <td colSpan={2}>
                    {distanceState === 'loading' && 'Đang định vị...'}
                    {distanceState && distanceState !== 'loading' && distanceState.km !== null && (
                      <>≈ {distanceState.km.toFixed(1)} km (đường chim bay, ước tính theo khu vực Phường/Xã)</>
                    )}
                    {distanceState && distanceState !== 'loading' && distanceState.km === null && (
                      <span style={{ color: 'var(--text-secondary)' }}>Không định vị được địa chỉ của một hoặc cả hai người.</span>
                    )}
                    {distanceState === null && <span style={{ color: 'var(--text-secondary)' }}>Thiếu địa chỉ để tính khoảng cách.</span>}
                  </td>
                </tr>
                <tr>
                  <td>Bản đồ</td>
                  <td colSpan={2}>
                    {distanceState && distanceState !== 'loading' && distanceState.pointA && distanceState.pointB ? (
                      <a
                        href={mapsDirectionsUrl(distanceState.pointA, distanceState.pointB)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="tomb-directions-btn"
                      >
                        <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="3 11 22 2 13 21 11 13 3 11" />
                        </svg>
                        Xem trên bản đồ
                      </a>
                    ) : (
                      <span style={{ color: 'var(--text-secondary)' }}>Chưa có đủ tọa độ để mở bản đồ.</span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {(!memberA || !memberB) && (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '20px' }}>
            Chọn đủ 2 người ở trên để xem bảng so sánh.
          </p>
        )}
      </div>
    </div>
  );
};

export default CompareMembersModal;
