import React, { useContext, useState } from 'react';
import { AppContext } from '../store';

function NewsGallery() {
  const { newsData } = useContext(AppContext);
  const [selectedNews, setSelectedNews] = useState(null);

  return (
    <div className="container">
      <h2 style={{ textAlign: 'center', marginBottom: '40px' }}>Tin Tức & Hoạt Động</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '30px' }}>
        {newsData.map(news => (
          <div key={news.id} className="card" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ height: '200px', width: '100%' }}>
              <img
                src={news.image}
                alt={news.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
              <small style={{ color: 'var(--primary-color)', fontWeight: 'bold', marginBottom: '10px' }}>{news.date}</small>
              <h3 style={{ margin: '0 0 15px 0' }}>{news.title}</h3>
              <p style={{
                color: 'var(--text-secondary)',
                marginBottom: '20px',
                flex: 1,
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}>{news.content}</p>
              <button className="btn-primary" style={{ width: '100%' }} onClick={() => setSelectedNews(news)}>Đọc Tiếp</button>
            </div>
          </div>
        ))}
      </div>

      {selectedNews && (
        <div
          onClick={() => setSelectedNews(null)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 2000, padding: '20px'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="card"
            style={{ maxWidth: '700px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: 0 }}
          >
            <div style={{ position: 'relative' }}>
              <img
                src={selectedNews.image}
                alt={selectedNews.title}
                style={{ width: '100%', height: '280px', objectFit: 'cover' }}
              />
              <button
                onClick={() => setSelectedNews(null)}
                style={{
                  position: 'absolute', top: '15px', right: '15px',
                  background: 'rgba(0,0,0,0.5)', border: 'none', color: 'white',
                  width: '35px', height: '35px', borderRadius: '50%',
                  fontSize: '1.2rem', cursor: 'pointer'
                }}
              >✕</button>
            </div>
            <div style={{ padding: '30px' }}>
              <small style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>{selectedNews.date}</small>
              <h2 style={{ margin: '10px 0 20px' }}>{selectedNews.title}</h2>
              <p style={{ lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>{selectedNews.content}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default NewsGallery;
