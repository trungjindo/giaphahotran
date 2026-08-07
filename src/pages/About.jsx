import React, { useContext } from 'react';
import { AppContext } from '../store';

function About() {
  const { aboutData } = useContext(AppContext);

  return (
    <div className="container">
      <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>Giới Thiệu Dòng Họ</h2>

      {aboutData.image && (
        <div style={{ borderRadius: '12px', overflow: 'hidden', marginBottom: '30px', boxShadow: 'var(--shadow-md)' }}>
          <img src={aboutData.image} alt="Giới thiệu dòng họ" style={{ width: '100%', maxHeight: '420px', objectFit: 'cover', display: 'block' }} />
        </div>
      )}

      <div className="card" style={{ marginBottom: '30px' }}>
        {aboutData.content.split('\n').filter(p => p.trim()).map((paragraph, idx) => (
          <p key={idx} style={{ lineHeight: '1.8', marginBottom: '16px', color: 'var(--text-primary)' }}>
            {paragraph}
          </p>
        ))}
      </div>

      {aboutData.highlights && aboutData.highlights.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: '25px' }}>Các Mốc Son Lịch Sử</h3>
          <div className="timeline">
            {aboutData.highlights.map((item, idx) => (
              <div key={idx} className="timeline-item">
                <div className="timeline-year">{item.year}</div>
                <div className="timeline-text">{item.text}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .timeline {
          position: relative;
          padding-left: 30px;
          border-left: 3px solid var(--secondary-color);
        }
        .timeline-item {
          position: relative;
          margin-bottom: 25px;
        }
        .timeline-item:last-child {
          margin-bottom: 0;
        }
        .timeline-item::before {
          content: '';
          position: absolute;
          left: -38px;
          top: 4px;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: var(--primary-color);
          border: 3px solid var(--secondary-light);
        }
        .timeline-year {
          font-family: var(--font-serif);
          font-weight: 700;
          color: var(--primary-color);
          font-size: 1.1rem;
        }
        .timeline-text {
          color: var(--text-secondary);
          margin-top: 4px;
        }
      `}</style>
    </div>
  );
}

export default About;
