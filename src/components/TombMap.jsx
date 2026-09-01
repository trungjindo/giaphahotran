import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import GoogleMapCanvas from './GoogleMapCanvas';
import { svgMarkerIcon } from '../utils/googleMaps';
import { formatDateVN, calculateAge } from '../utils/family';

// Ghim MỘ RIÊNG LẺ: giọt nước tông đại dương, họa tiết mái đình nhỏ bên trong (đồng bộ logo).
const TOMB_PIN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="44" viewBox="0 0 34 44">
  <path d="M17 0C7.6 0 0 7.6 0 17c0 12 17 27 17 27s17-15 17-27C34 7.6 26.4 0 17 0z" fill="#0E6FA8" stroke="#F2C46A" stroke-width="1.5"/>
  <circle cx="17" cy="17" r="10.5" fill="#F5E9D6"/>
  <path d="M13.5 19.7c1-2.6 2-3.9 3.5-3.9s2.5 1.3 3.5 3.9" stroke="#0E6FA8" stroke-width="1.1" fill="none" stroke-linecap="round"/>
  <line x1="17" y1="15.8" x2="17" y2="21" stroke="#0E6FA8" stroke-width="1.1" stroke-linecap="round"/>
  <line x1="14" y1="21" x2="20" y2="21" stroke="#0E6FA8" stroke-width="1.3" stroke-linecap="round"/>
</svg>`;

// Ghim LĂNG (nhiều người cùng an táng): mái lăng + số người bên trong, để trên bản đồ tổng
// phân biệt ngay được đâu là lăng chung, đâu là mộ riêng lẻ.
const siteSvg = (count) => `<svg xmlns="http://www.w3.org/2000/svg" width="46" height="50" viewBox="0 0 46 50">
  <path d="M23 4 5 15h36L23 4z" fill="#0E6FA8" stroke="#F2C46A" stroke-width="1.5" stroke-linejoin="round"/>
  <rect x="7" y="15" width="32" height="4" rx="1" fill="#0E6FA8"/>
  <rect x="9" y="19" width="28" height="21" rx="2" fill="#F5E9D6" stroke="#0E6FA8" stroke-width="1.5"/>
  <rect x="20" y="28" width="6" height="12" rx="1" fill="#0E6FA8"/>
  <path d="M14 46h18" stroke="#0E6FA8" stroke-width="2.4" stroke-linecap="round"/>
  <circle cx="38" cy="10" r="8.5" fill="#F2C46A" stroke="#fff" stroke-width="2"/>
  <text x="38" y="13.5" text-anchor="middle" font-family="Arial, sans-serif" font-size="9" font-weight="bold" fill="#4a3208">${count}</text>
</svg>`;

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
      {tomb.photo && <img src={tomb.photo} alt={`Mộ phần ${member?.name || ''}`} loading="lazy" className="tomb-popup-photo" />}
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
  const mapRef = useRef(null);
  const mapsRef = useRef(null);
  const clustererRef = useRef(null);
  const infoRef = useRef(null);
  // Gốc React để vẽ nội dung popup — popup của Google Maps nhận phần tử DOM chứ không nhận
  // phần tử React, nên phải tự dựng một cây React nhỏ vào trong đó.
  const popupHostRef = useRef(null);
  const popupRootRef = useRef(null);
  const [ready, setReady] = useState(false);

  // Giữ callback trong ref để trình xử lý bấm ghim luôn gọi bản mới nhất mà không phải
  // dựng lại toàn bộ ghim mỗi lần component cha render.
  const onViewProfileRef = useRef(onViewProfile);
  onViewProfileRef.current = onViewProfile;

  const handleMapReady = useCallback((map, maps) => {
    mapRef.current = map;
    mapsRef.current = maps;
    infoRef.current = new maps.InfoWindow({ maxWidth: 300 });
    popupHostRef.current = document.createElement('div');
    popupRootRef.current = createRoot(popupHostRef.current);
    setReady(true);
  }, []);

  const openPopup = useCallback((marker, content) => {
    popupRootRef.current.render(content);
    infoRef.current.setContent(popupHostRef.current);
    infoRef.current.open({ anchor: marker, map: mapRef.current });
  }, []);

  // Dựng lại toàn bộ ghim mỗi khi dữ liệu đổi.
  useEffect(() => {
    if (!ready) return undefined;
    const map = mapRef.current;
    const maps = mapsRef.current;
    const markers = [];

    sites.forEach(s => {
      const marker = new maps.Marker({
        position: { lat: s.latitude, lng: s.longitude },
        icon: svgMarkerIcon(maps, siteSvg(s.members.length), { width: 46, height: 50, anchorX: 23, anchorY: 48 }),
        title: `${s.name} · ${s.members.length} người`,
      });
      marker.addListener('click', () => openPopup(marker, <SitePopupCard site={s} onViewProfile={id => onViewProfileRef.current(id)} />));
      markers.push(marker);
    });

    singles.forEach(t => {
      const marker = new maps.Marker({
        position: { lat: t.latitude, lng: t.longitude },
        icon: svgMarkerIcon(maps, TOMB_PIN_SVG, { width: 34, height: 44, anchorX: 17, anchorY: 44 }),
        title: t.member?.name || 'Không rõ',
      });
      marker.addListener('click', () => openPopup(marker, <TombPopupCard tomb={t} onViewProfile={id => onViewProfileRef.current(id)} />));
      markers.push(marker);
    });

    clustererRef.current = new MarkerClusterer({ map, markers });

    // Đưa bản đồ về vừa khít tất cả các ghim; một ghim duy nhất thì fitBounds sẽ phóng
    // sát tối đa nên phải tự đặt lại mức phóng cho dễ nhìn.
    if (markers.length > 0) {
      const bounds = new maps.LatLngBounds();
      markers.forEach(m => bounds.extend(m.getPosition()));
      map.fitBounds(bounds, 60);
      if (markers.length === 1) {
        maps.event.addListenerOnce(map, 'idle', () => { if (map.getZoom() > 16) map.setZoom(16); });
      }
    }

    return () => {
      infoRef.current?.close();
      clustererRef.current?.clearMarkers();
      clustererRef.current = null;
      markers.forEach(m => m.setMap(null));
    };
  }, [ready, sites, singles, openPopup]);

  // Dọn gốc React của popup khi component bị gỡ — làm ở effect riêng vì nó chỉ nên chạy
  // đúng một lần lúc gỡ, không phải mỗi lần dữ liệu ghim thay đổi.
  useEffect(() => () => {
    const root = popupRootRef.current;
    if (root) setTimeout(() => root.unmount(), 0);
  }, []);

  return (
    <GoogleMapCanvas
      className="tomb-map-wrap"
      options={{ center: { lat: center[0], lng: center[1] }, zoom }}
      onMapReady={handleMapReady}
    />
  );
}

export default TombMap;
