import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { formatDateVN, calculateAge } from '../utils/family';

// Ghim mộ hình giọt nước tông đại dương, họa tiết mái đình nhỏ bên trong (đồng bộ logo).
const tombIcon = L.divIcon({
  className: 'tomb-marker-icon',
  html: `
    <svg width="34" height="44" viewBox="0 0 34 44" xmlns="http://www.w3.org/2000/svg">
      <path d="M17 0C7.6 0 0 7.6 0 17c0 12 17 27 17 27s17-15 17-27C34 7.6 26.4 0 17 0z" fill="#0E6FA8" stroke="#F2C46A" stroke-width="1.5"/>
      <circle cx="17" cy="17" r="10.5" fill="#F5E9D6"/>
      <path d="M9 19.5c1.8-2 3.6-2 5.4 0M9 19.5l-1.8 1.2M9 19.5c-.2-2.2.4-3.6 2-4.4-.7 1.6-.8 2.9-.3 4.4" stroke="#0E6FA8" stroke-width="1.1" fill="none" stroke-linecap="round"/>
      <path d="M25 19.5c-1.8-2-3.6-2-5.4 0M25 19.5l1.8 1.2M25 19.5c.2-2.2-.4-3.6-2-4.4.7 1.6.8 2.9.3 4.4" stroke="#0E6FA8" stroke-width="1.1" fill="none" stroke-linecap="round"/>
      <path d="M13.5 19.7c1-2.6 2-3.9 3.5-3.9s2.5 1.3 3.5 3.9" stroke="#0E6FA8" stroke-width="1.1" fill="none" stroke-linecap="round"/>
      <line x1="17" y1="15.8" x2="17" y2="21" stroke="#0E6FA8" stroke-width="1.1" stroke-linecap="round"/>
      <line x1="14" y1="21" x2="20" y2="21" stroke="#0E6FA8" stroke-width="1.3" stroke-linecap="round"/>
    </svg>
  `,
  iconSize: [34, 44],
  iconAnchor: [17, 44],
  popupAnchor: [0, -40],
});

const createClusterIcon = (cluster) => {
  const count = cluster.getChildCount();
  const size = count < 10 ? 38 : count < 30 ? 46 : 54;
  return L.divIcon({
    html: `<div class="tomb-cluster-icon" style="width:${size}px;height:${size}px;line-height:${size}px;">${count}</div>`,
    className: 'tomb-cluster-wrapper',
    iconSize: L.point(size, size, true),
  });
};

const directionsUrl = (lat, lng) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

const TombPopupCard = ({ tomb, onViewProfile }) => {
  const { member } = tomb;
  const age = member ? calculateAge(member.birthDate, member.deathDate, false) : null;
  const years = member
    ? `${member.birthDate ? new Date(member.birthDate).getFullYear() : '?'} – ${member.deathDate ? new Date(member.deathDate).getFullYear() : '?'}`
    : '';

  return (
    <div className="tomb-popup-card">
      {tomb.photo && (
        <img src={tomb.photo} alt={`Mộ phần ${member?.name || ''}`} loading="lazy" className="tomb-popup-photo" />
      )}
      <div className="tomb-popup-body">
        <div className="tomb-popup-name">
          {member?.name || 'Không rõ'} {member?.gender === 'Nam' ? '♂' : member?.gender === 'Nữ' ? '♀' : ''}
        </div>
        <div className="tomb-popup-meta">
          <span>{years}{age !== null ? ` (${age} tuổi)` : ''}</span>
          {tomb.code && <span className="badge badge-gold">#{tomb.code}</span>}
        </div>
        {tomb.interredDate && (
          <div className="tomb-popup-line">Ngày đưa vào lăng: <strong>{formatDateVN(tomb.interredDate)}</strong></div>
        )}
        {tomb.description && <p className="tomb-popup-desc">{tomb.description}</p>}
        <div className="tomb-popup-actions">
          {member && (
            <button className="btn-primary" style={{ padding: '7px 14px', fontSize: '0.85rem' }} onClick={() => onViewProfile(member.id)}>
              Xem hồ sơ
            </button>
          )}
          <a
            href={directionsUrl(tomb.latitude, tomb.longitude)}
            target="_blank"
            rel="noopener noreferrer"
            className="tomb-directions-btn"
          >
            <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="3 11 22 2 13 21 11 13 3 11" />
            </svg>
            Dẫn đường
          </a>
        </div>
      </div>
    </div>
  );
};

function TombMap({ tombs, onViewProfile, center, zoom = 7 }) {
  const bounds = useMemo(() => {
    if (tombs.length === 0) return null;
    const lats = tombs.map(t => t.latitude);
    const lngs = tombs.map(t => t.longitude);
    return [
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)],
    ];
  }, [tombs]);

  return (
    <div className="tomb-map-wrap">
      <MapContainer
        center={center}
        zoom={zoom}
        bounds={bounds || undefined}
        boundsOptions={{ padding: [50, 50] }}
        scrollWheelZoom
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MarkerClusterGroup iconCreateFunction={createClusterIcon} chunkedLoading maxClusterRadius={50}>
          {tombs.map(t => (
            <Marker key={t.id} position={[t.latitude, t.longitude]} icon={tombIcon}>
              <Tooltip direction="top" offset={[0, -38]} opacity={1}>
                <span className="tomb-hover-tip-name">{t.member?.name || 'Không rõ'}</span>
                {t.member?.generation && <span> · Đời {t.member.generation}</span>}
                {t.code && <span> · #{t.code}</span>}
              </Tooltip>
              <Popup minWidth={230} maxWidth={260}>
                <TombPopupCard tomb={t} onViewProfile={onViewProfile} />
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}

export default TombMap;
