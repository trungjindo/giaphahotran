import React, { useContext, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AppContext } from '../store';

const countMembers = (node) => {
  if (!node) return 0;
  let count = 1;
  if (node.children) {
    node.children.forEach(child => { count += countMembers(child); });
  }
  return count;
};

const countGenerations = (node) => {
  if (!node) return 0;
  let max = node.generation || 1;
  if (node.children) {
    node.children.forEach(child => {
      const childMax = countGenerations(child);
      if (childMax > max) max = childMax;
    });
  }
  return max;
};

function Home() {
  const { financeData, newsData, familyData } = useContext(AppContext);

  const { totalMembers, totalGenerations } = useMemo(() => ({
    totalMembers: countMembers(familyData),
    totalGenerations: countGenerations(familyData)
  }), [familyData]);

  return (
    <div className="container">
      <div className="hero-section" style={{ textAlign: 'center', margin: '40px 0' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '20px' }}>Trần Đình Gia Phả</h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', maxWidth: '800px', margin: '0 auto' }}>
          "Mộc bản thủy nguyên" - Cây có cội, nước có nguồn. Website lưu giữ và truyền lại những giá trị truyền thống tốt đẹp của dòng họ Trần Đình cho muôn đời sau.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px', marginTop: '60px' }}>
        <div className="card">
          <h3>Thống Kê Nhanh</h3>
          <ul style={{ marginTop: '15px', lineHeight: '2' }}>
            <li><strong>Số đời ghi nhận:</strong> {totalGenerations} đời</li>
            <li><strong>Số lượng thành viên:</strong> {totalMembers} thành viên</li>
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
    </div>
  );
}

export default Home;
