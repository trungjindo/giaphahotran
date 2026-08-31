import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { formatDateVN, calculateAge } from '../utils/family';

// Ghim MỘ RIÊNG LẺ: hình giọt nước tông đại dương, họa tiết mái đình nhỏ bên trong (đồng bộ logo).
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

// Ghim LĂNG (nhiều người cùng an táng): mái lăng + số người bên trong, để trên bản đồ tổng
// phân biệt ngay được đâu là lăng chung, đâu là mộ riêng lẻ.
const createSiteIcon = (count) => L.divIcon({
  className: 'tomb-marker-icon',
  html: `
    <div class="tomb-site-marker">
      <svg width="42" height="46" viewBox="0 0 42 46" xmlns="http://www.w3.org/2000/svg">
        <path d="M21 2 3 13h36L21 2z" fill="#0E6FA8" stroke="#F2C46A" stroke-width="1.5" stroke-linejoin="round"/>
        <rect x="5" y="13" width="32" height="4" rx="1" fill="#0E6FA8"/>
        <rect x="7" y="17" width="28" height="21" rx="2" fill="#F5E9D6" stroke="#0E6FA8" stroke-width="1.5"/>
        <rect x="18" y="26" width="6" height="12" rx="1" fill="#0E6FA8"/>
        <path d="M12 44h18" stroke="#0E6FA8" stroke-width="2.4" stroke-linecap="round"/>
      </svg>
      <span class="tomb-site-marker-count">${count}</span>
    </div>
  `,
  iconSize: [42, 46],
  iconAnchor: [21, 44],
  popupAnchor: [0, -42],
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

const DirectionsLink = ({ lat, lng }) => (
  <a href={directionsUrl(lat, lng)} target="_blank" rel="noopener noreferrer" className="tomb-directions-btn">
    <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3 11 22 2 13 21 11 13 3 11" />
    </svg>
    Dẫn đường
  </a>
);

const memberYears = (member) => member
  ? `${member.birthDate ? new Date(member.birthDate).getFullYear() : '?'} – ${member.deathDate ? new Date(member.deathDate).getFullYear() : '?'}`
  : '';

// Popup của MỘT ngôi mộ riêng lẻ.
const TombPopupCard = ({ tomb, onViewProfile }) => {
  const { member } = tomb;
  const age = member ? calculateAge(member.birthDate, member.deathDate, false) : null;

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
          <span>{memberYears(member)}{age !== null ? ` (${age} tuổi)` : ''}</span>
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
          <DirectionsLink lat={tomb.latitude} lng={tomb.longitude} />
        </div>
      </div>
    </div>
  );
};

// Popup của MỘT LĂNG: liệt kê toàn bộ người an táng bên trong, bấm từng tên để mở hồ sơ.
const SitePopupCard = ({ site, onViewProfile }) => (
  <div className="tomb-popup-card">
    {site.photo && <img src={site.photo} alt={`Lăng ${site.name}`} loading="lazy" className="tomb-popup-photo" />}
    <div className="tomb-popup-body">
      <div className="tomb-popup-name">{site.name}</div>
      <div className="tomb-popup-meta">
        <span className="badge badge-gold">{site.members.length} người an táng</span>
        {site.chiName && <span>{site.chiName}</span>}
      </div>
      {site.address && <div className="tomb-popup-line">{site.address}</div>}
      {site.description && <p className="tomb-popup-desc">{site.description}</p>}

      {site.members.length > 0 ? (
        <ul className="tomb-site-member-list">
          {site.members.map(t => (
            <li key={t.id}>
              <button type="button" onClick={() => onViewProfile(t.member.id)}>
                <span className="tomb-site-member-name">
                  {t.member.name} {t.member.gender === 'Nam' ? '♂' : t.member.gender === 'Nữ' ? '♀' : ''}
                </span>
                <span className="tomb-site-member-meta">
                  {memberYears(t.member)}
                  {t.member.generation ? ` · Đời ${t.member.generation}` : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="tomb-popup-desc">Chưa ghi nhận người an táng nào trong lăng này.</p>
      )}

      <div className="tomb-popup-actions">
        <DirectionsLink lat={site.latitude} lng={site.longitude} />
      </div>
    </div>
  </div>
);

// sites : các LĂNG (mỗi lăng 1 ghim, kèm danh sách người bên trong)
// singles: các mộ RIÊNG LẺ (mỗi người 1 ghim)
function TombMap({ sites = [], singles = [], onViewProfile, center, zoom = 7 }) {
  const bounds = useMemo(() => {
    const points = [
      ...sites.map(s => [s.latitude, s.longitude]),
      ...singles.map(t => [t.latitude, t.longitude]),
    ];
    if (points.length === 0) return null;
    const lats = points.map(p => p[0]);
    const lngs = points.map(p => p[1]);
    return [
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)],
    ];
  }, [sites, singles]);

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
          {sites.map(s => (
            <Marker key={`site-${s.id}`} position={[s.latitude, s.longitude]} icon={createSiteIcon(s.members.length)}>
              <Tooltip direction="top" offset={[0, -40]} opacity={1}>
                <span className="tomb-hover-tip-name">{s.name}</span>
                <span> · {s.members.length} người</span>
              </Tooltip>
              <Popup minWidth={250} maxWidth={290}>
                <SitePopupCard site={s} onViewProfile={onViewProfile} />
              </Popup>
            </Marker>
          ))}

          {singles.map(t => (
            <Marker key={`tomb-${t.id}`} position={[t.latitude, t.longitude]} icon={tombIcon}>
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
