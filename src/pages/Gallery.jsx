import React, { useContext, useState } from 'react';
import { AppContext } from '../store';

function Gallery() {
  const { galleryData } = useContext(AppContext);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  return (
    <div className="container">
      <div className="section-header">
        <span className="section-eyebrow">Dòng Họ Trần Đình</span>
        <h2>Thư Viện Ảnh</h2>
        <p>Những khoảnh khắc lễ hội, quê hương và con cháu dòng họ qua các năm.</p>
      </div>

      {galleryData.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Chưa có ảnh nào trong thư viện.</p>
      ) : (
        <div className="gallery-grid">
          {galleryData.map(photo => (
            <button
              key={photo.id}
              onClick={() => setSelectedPhoto(photo)}
              className="gallery-tile"
              aria-label={photo.caption ? `Xem ảnh: ${photo.caption}` : 'Xem ảnh'}
            >
              <div className="gallery-tile-image">
                <img src={photo.url} alt={photo.caption || ''} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              {(photo.caption || photo.date) && (
                <div className="gallery-tile-caption">
                  {photo.caption && <div style={{ fontSize: '0.9rem', fontWeight: '500' }}>{photo.caption}</div>}
                  {photo.date && <small style={{ color: 'var(--text-secondary)' }}>{photo.date}</small>}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {selectedPhoto && (
        <div
          onClick={() => setSelectedPhoto(null)}
          role="dialog"
          aria-modal="true"
          aria-label={selectedPhoto.caption || 'Xem ảnh'}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px'
          }}
        >
          <button
            onClick={() => setSelectedPhoto(null)}
            aria-label="Đóng"
            className="modal-close-btn"
            style={{ top: '20px', right: '25px' }}
          >✕</button>
          <img
            src={selectedPhoto.url}
            alt={selectedPhoto.caption || ''}
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '90vw', maxHeight: '80vh', objectFit: 'contain', borderRadius: 'var(--radius-md)' }}
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
