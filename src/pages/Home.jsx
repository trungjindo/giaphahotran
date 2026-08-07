import React, { useContext, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AppContext } from '../store';
import { computeFamilyStats, getMaxGeneration } from '../utils/family';

const StatTile = ({ label, value, color }) => (
  <div className="stat-tile">
    <div className="stat-tile-value" style={{ color: color || 'var(--primary-color)' }}>{value}</div>
    <div className="stat-tile-label">{label}</div>
  </div>
);

const StatBarList = ({ data, color }) => {
  const entries = Object.entries(data).filter(([, v]) => v > 0);
  const max = Math.max(...entries.map(([, v]) => v), 1);

  if (entries.length === 0) {
    return <p style={{ color: 'var(--text-secondary)' }}>Chưa có dữ liệu</p>;
  }

  return (
    <div>
      {entries.map(([label, value]) => (
        <div key={label} style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '4px' }}>
            <span>{label}</span>
            <span style={{ fontWeight: 'bold' }}>{value}</span>
          </div>
          <div style={{ background: 'var(--bg-color)', borderRadius: '6px', height: '10px', overflow: 'hidden' }}>
            <div style={{
              width: `${(value / max) * 100}%`,
              background: color || 'var(--primary-color)',
              height: '100%',
              borderRadius: '6px',
              transition: 'width 0.4s ease'
            }} />
          </div>
        </div>
      ))}
    </div>
  );
};

function Home() {
  const { financeData, newsData, familyData } = useContext(AppContext);

  const stats = useMemo(() => computeFamilyStats(familyData), [familyData]);
  const totalGenerations = useMemo(() => getMaxGeneration(familyData), [familyData]);

  const ageChartData = useMemo(
    () => Object.fromEntries(stats.ageBrackets.map(b => [b.label, b.count])),
    [stats]
  );

  return (
    <div className="container">
      <div className="hero-section" style={{ textAlign: 'center', margin: '40px 0' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '20px' }}>Trần Đình Gia Phả</h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', maxWidth: '800px', margin: '0 auto' }}>
          "Mộc bản thủy nguyên" - Cây có cội, nước có nguồn. Website lưu giữ và truyền lại những giá trị truyền thống tốt đẹp của dòng họ Trần Đình cho muôn đời sau.
        </p>

        <Link to="/gia-pha" className="quick-access-cta" title="Xem nhanh Sơ Đồ Gia Phả">
          <span className="quick-access-icon">
            <svg viewBox="0 0 24 24" width="34" height="34" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="4" r="2.2" />
              <circle cx="5" cy="12" r="2.2" />
              <circle cx="19" cy="12" r="2.2" />
              <circle cx="8.5" cy="20" r="2.2" />
              <circle cx="15.5" cy="20" r="2.2" />
              <path d="M12 6.2V10M5 14.2V16M19 14.2V16M9.5 18.2 8.5 17.8M14.5 18.2l1-0.4M6.3 13.3 10.5 10.8M17.7 13.3 13.5 10.8M8.5 17.8 5 16M15.5 17.8 19 16" />
            </svg>
          </span>
          <span className="quick-access-text">
            <strong>Xem Sơ Đồ Gia Phả</strong>
            <small>Truy cập nhanh danh sách & phả hệ dòng họ</small>
          </span>
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
        <div className="card">
          <h3>Thống Kê Nhanh</h3>
          <ul style={{ marginTop: '15px', lineHeight: '2' }}>
            <li><strong>Số đời ghi nhận:</strong> {totalGenerations} đời</li>
            <li><strong>Số lượng thành viên:</strong> {stats.total} thành viên</li>
            <li><strong>Tổng quỹ dòng họ:</strong> {financeData.totalFund.toLocaleString('vi-VN')} VNĐ</li>
          </ul>
          <div style={{ marginTop: '20px' }}>
            <Link to="/gia-pha" className="btn-primary">Xem Phả Hệ</Link>
          </div>
        </div>

        <div className="card">
          <h3>Tin Tức Mới Nhất</h3>
          {newsData.slice(0, 2).map(news => (
            <div key={news.id} style={{ marginTop: '15px', borderBottom: '1px solid var(--border-color)', paddingBottom: '15px' }}>
              <h4 style={{ margin: '0 0 5px 0' }}>{news.title}</h4>
              <small style={{ color: 'var(--text-secondary)' }}>{news.date}</small>
              <p style={{ marginTop: '5px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {news.content}
              </p>
            </div>
          ))}
          <div style={{ marginTop: '20px' }}>
            <Link to="/tin-tuc" className="btn-primary">Xem Tất Cả Tin</Link>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '50px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '10px' }}>Thống Kê Dòng Họ</h2>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '30px' }}>
          Tổng hợp nhanh từ hồ sơ chi tiết của từng thành viên trong gia phả.
        </p>

        <div className="stat-tile-grid">
          <StatTile label="Tổng thành viên" value={stats.total} />
          <StatTile label="Đang sống" value={stats.alive} color="#27ae60" />
          <StatTile label="Đã mất" value={stats.deceased} color="#7f8c8d" />
          <StatTile label="Nam" value={stats.genderCounts['Nam']} color="#2980b9" />
          <StatTile label="Nữ" value={stats.genderCounts['Nữ']} color="#c0392b" />
          <StatTile label="Con dâu" value={stats.inLawCounts['Con dâu']} color="#d1a93e" />
          <StatTile label="Con rể" value={stats.inLawCounts['Con rể']} color="#d1a93e" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px', marginTop: '30px' }}>
          <div className="card">
            <h3>Học Vấn</h3>
            <div style={{ marginTop: '15px' }}>
              <StatBarList data={stats.educationCounts} color="#8b1c1c" />
            </div>
          </div>

          <div className="card">
            <h3>Độ Tuổi</h3>
            <div style={{ marginTop: '15px' }}>
              <StatBarList data={ageChartData} color="#2980b9" />
            </div>
          </div>

          <div className="card">
            <h3>Khu Vực Sinh Sống</h3>
            <div style={{ marginTop: '15px' }}>
              <StatBarList data={stats.regionCounts} color="#27ae60" />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .quick-access-cta {
          display: inline-flex;
          align-items: center;
          gap: 16px;
          margin-top: 30px;
          padding: 14px 28px 14px 14px;
          background: linear-gradient(135deg, var(--primary-color), var(--primary-light));
          border: 2px solid var(--secondary-color);
          border-radius: 999px;
          color: white;
          box-shadow: var(--shadow-md);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .quick-access-cta:hover {
          transform: translateY(-3px) scale(1.02);
          box-shadow: var(--shadow-lg);
        }

        .quick-access-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 56px;
          height: 56px;
          flex-shrink: 0;
          border-radius: 50%;
          background: rgba(255,255,255,0.15);
          border: 2px solid var(--secondary-light);
          animation: quick-access-pulse 2.4s ease-in-out infinite;
        }

        @keyframes quick-access-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(245, 209, 114, 0.55); }
          50% { box-shadow: 0 0 0 10px rgba(245, 209, 114, 0); }
        }

        .quick-access-text {
          display: flex;
          flex-direction: column;
          text-align: left;
          gap: 2px;
        }

        .quick-access-text strong {
          font-family: var(--font-serif);
          font-size: 1.15rem;
        }

        .quick-access-text small {
          color: rgba(255,255,255,0.85);
        }

        .stat-tile-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
          gap: 15px;
        }

        .stat-tile {
          background: var(--surface-color);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 20px 10px;
          text-align: center;
          box-shadow: var(--shadow-sm);
        }

        .stat-tile-value {
          font-family: var(--font-serif);
          font-size: 2rem;
          font-weight: 700;
        }

        .stat-tile-label {
          margin-top: 5px;
          color: var(--text-secondary);
          font-size: 0.9rem;
        }
      `}</style>
    </div>
  );
}

export default Home;
