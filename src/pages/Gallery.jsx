import React, { useContext, useState } from 'react';
import { AppContext } from '../store';

function Gallery() {
  const { galleryData } = useContext(AppContext);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  return (
    <div className="container">
      <h2 style={{ textAlign: 'center', marginBottom: '40px' }}>Thư Viện Ảnh</h2>

      {galleryData.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Chưa có ảnh nào trong thư viện.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
          {galleryData.map(photo => (
            <div
              key={photo.id}
              onClick={() => setSelectedPhoto(photo)}
              style={{
                borderRadius: '10px', overflow: 'hidden', cursor: 'pointer',
                boxShadow: 'var(--shadow-sm)', background: 'var(--surface-color)',
                border: '1px solid var(--border-color)'
              }}
            >
              <div style={{ height: '160px', overflow: 'hidden' }}>
                <img src={photo.url} alt={photo.caption} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              {(photo.caption || photo.date) && (
                <div style={{ padding: '10px 12px' }}>
                  {photo.caption && <div style={{ fontSize: '0.9rem', fontWeight: '500' }}>{photo.caption}</div>}
                  {photo.date && <small style={{ color: 'var(--text-secondary)' }}>{photo.date}</small>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {selectedPhoto && (
        <div
          onClick={() => setSelectedPhoto(null)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px'
          }}
        >
          <button
            onClick={() => setSelectedPhoto(null)}
            style={{
              position: 'absolute', top: '20px', right: '25px',
              background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white',
              width: '40px', height: '40px', borderRadius: '50%', fontSize: '1.3rem', cursor: 'pointer'
            }}
          >✕</button>
          <img
            src={selectedPhoto.url}
            alt={selectedPhoto.caption}
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '90vw', maxHeight: '80vh', objectFit: 'contain', borderRadius: '8px' }}
          />
          {selectedPhoto.caption && (
            <div style={{ color: 'white', marginTop: '15px', textAlign: 'center', fontSize: '1.1rem' }}>{selectedPhoto.caption}</div>
          )}
        </div>
      )}
    </div>
  );
}

export default Gallery;
