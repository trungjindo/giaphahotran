import React from 'react';
import { calculateAge, formatDateVN } from '../utils/family';
import MapLinkButton from './MapLinkButton';
import CallButton from './CallButton';

const getChildrenNames = (children) => {
  if (!children || children.length === 0) return 'Chưa có thông tin';
  return children.map(c => c.name).join(', ');
};

// Modal hồ sơ chi tiết một thành viên, dùng chung cho Sơ Đồ Gia Phả và Danh Sách Con Cháu.
const MemberProfileModal = ({ member, onClose }) => {
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
                  {member.phone && <span>ĐT: {member.phone}</span>}
                  {member.phone && member.zalo && ' — '}
                  {member.zalo && <span>Zalo: {member.zalo}</span>}
                </div>
                <CallButton phone={member.phone} />
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

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(5px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          padding: 20px;
        }

        .modal-content {
          max-width: 700px;
          width: 100%;
          position: relative;
          background: white;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: var(--shadow-lg);
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-header {
          background: linear-gradient(135deg, var(--primary-color), var(--primary-light));
          padding: 30px 20px;
          color: white;
          text-align: center;
          position: relative;
        }

        .modal-avatar {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          border: 4px solid white;
          object-fit: cover;
          margin-top: -80px;
          box-shadow: var(--shadow-md);
          background: white;
        }

        .close-btn {
          position: absolute;
          top: 15px;
          right: 20px;
          background: rgba(255,255,255,0.2);
          border: none;
          color: white;
          width: 35px;
          height: 35px;
          border-radius: 50%;
          font-size: 1.2rem;
          cursor: pointer;
          transition: background 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .close-btn:hover {
          background: rgba(255,255,255,0.4);
        }

        .achievements-box {
          background: linear-gradient(135deg, #fff9c4, #fff59d);
          border-left: 5px solid var(--secondary-color);
          padding: 20px;
          border-radius: 8px;
          margin-top: 25px;
          box-shadow: var(--shadow-sm);
        }

        .achievements-box h3 {
          color: #d35400;
          margin-top: 0;
          display: flex;
          align-items: center;
          gap: 10px;
        }
      `}</style>
    </div>
  );
};

export default MemberProfileModal;
