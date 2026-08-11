import React, { useContext } from 'react';
import { AppContext } from '../store';
import { calculateAge, formatDateVN } from '../utils/family';
import MapLinkButton from './MapLinkButton';
import PhoneRevealButton from './PhoneRevealButton';

const getChildrenNames = (children) => {
  if (!children || children.length === 0) return 'Chưa có thông tin';
  return children.map(c => c.name).join(', ');
};

// Modal hồ sơ chi tiết một thành viên, dùng chung cho Sơ Đồ Gia Phả và Danh Sách Con Cháu.
const MemberProfileModal = ({ member, onClose }) => {
  const { isAuthenticated } = useContext(AppContext);
  if (!member) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <button className="close-btn" onClick={onClose}>✕</button>
          <div style={{ height: '40px' }}></div>
        </div>

        <div style={{ padding: '0 30px 30px', textAlign: 'center' }}>
          <img
            src={member.avatar || 'https://via.placeholder.com/150'}
            alt={member.name}
            className="modal-avatar"
            style={{ filter: member.isAlive ? 'none' : 'grayscale(100%)' }}
          />
          <h2 style={{ margin: '15px 0 5px', fontFamily: 'var(--font-serif)', color: 'var(--primary-color)' }}>
            {member.name}
          </h2>
          <span className="generation" style={{ display: 'inline-block', marginBottom: '15px', padding: '5px 15px', fontSize: '0.9rem' }}>
            Đời thứ {member.generation}
            {member.code && <> · Mã: <span style={{ fontFamily: 'monospace' }}>{member.code}</span></>}
          </span>
          <div>
            <span style={{
              display: 'inline-block', marginBottom: '25px', padding: '4px 12px', borderRadius: '10px',
              fontSize: '0.85rem', fontWeight: '600',
              background: member.isRegistered ? '#e8f5e9' : '#f5f5f5',
              color: member.isRegistered ? '#2e7d32' : '#7f8c8d'
            }}>
              {member.isRegistered ? '✓ Đã đăng ký suất đinh' : 'Chưa đăng ký suất đinh'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', textAlign: 'left', background: 'var(--bg-color)', padding: '20px', borderRadius: '8px' }}>
            <div><strong>Giới tính:</strong> {member.gender || 'Chưa rõ'}</div>
            <div>
              <strong>Tình trạng:</strong> {member.isAlive ? <span style={{color: '#27ae60', fontWeight: 'bold'}}>Đang sống</span> : <span style={{color: '#7f8c8d'}}>Đã mất</span>}
              {(() => {
                const age = calculateAge(member.birthDate, member.deathDate, member.isAlive);
                return age !== null ? <span style={{ color: 'var(--text-secondary)' }}> ({member.isAlive ? `${age} tuổi` : `hưởng thọ ${age} tuổi`})</span> : null;
              })()}
            </div>
            <div><strong>Ngày sinh:</strong> {formatDateVN(member.birthDate) || 'Chưa rõ'}</div>
            <div><strong>Ngày mất:</strong> {member.isAlive ? '—' : (formatDateVN(member.deathDate) || 'Chưa rõ')}</div>
            <div><strong>Học vấn:</strong> {member.education || 'Chưa rõ'}</div>
            <div><strong>Nghề nghiệp:</strong> {member.occupation || 'Chưa rõ'}</div>

            <div style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--border-color)', paddingTop: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                <div>
                  <strong>Địa chỉ hiện nay:</strong> {[member.currentWard, member.currentProvince].filter(Boolean).join(', ') || 'Chưa rõ'}
                  {member.oldAddress && (
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Địa chỉ cũ: {member.oldAddress}
                    </div>
                  )}
                </div>
                <MapLinkButton
                  address={[member.currentWard, member.currentProvince].filter(Boolean).join(', ')}
                  lat={member.latitude}
                  lng={member.longitude}
                />
              </div>
            </div>

            {(member.phone || member.zalo) && (
              <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                <div>
                  <strong>Liên hệ:</strong>{' '}
                  {member.phone && (
                    <span>
                      ĐT: <span style={{ userSelect: isAuthenticated ? 'text' : 'none' }}>{member.phone}</span>
                    </span>
                  )}
                  {member.phone && member.zalo && ' — '}
                  {member.zalo && <span>Zalo: {member.zalo}</span>}
                </div>
                {member.phone && <PhoneRevealButton memberId={member.id} />}
              </div>
            )}

            <div style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--border-color)', paddingTop: '15px' }}>
              <strong>Cha:</strong> {member.father || 'Chưa rõ'} &nbsp;·&nbsp; <strong>Mẹ:</strong> {member.mother || 'Chưa rõ'}
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <strong>Phu nhân / Phu quân:</strong> {member.spouse || 'Chưa rõ'}
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <strong>Con cái:</strong> {getChildrenNames(member.children)}
            </div>
          </div>

          {member.description && (
            <div style={{ marginTop: '25px', textAlign: 'left', lineHeight: '1.7', color: 'var(--text-primary)' }}>
              <h3 style={{ borderBottom: '2px solid var(--primary-light)', display: 'inline-block', paddingBottom: '5px', marginBottom: '15px' }}>Tiểu sử</h3>
              <p>{member.description}</p>
            </div>
          )}

          {member.achievements && member.achievements.length > 0 && (
            <div className="achievements-box" style={{ textAlign: 'left' }}>
              <h3>🏆 Thành Tựu Nổi Bật</h3>
              <p style={{ fontStyle: 'italic', color: '#555', marginBottom: '15px' }}>Tấm gương sáng cho con cháu dòng họ noi theo:</p>
              <ul style={{ paddingLeft: '25px', listStyleType: 'square', lineHeight: '1.8', fontSize: '1.05rem', fontWeight: '500' }}>
                {member.achievements.map((ach, idx) => <li key={idx}>{ach}</li>)}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MemberProfileModal;
