import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getAssetCategory, getAssetStatus } from '../../utils/asset';

const VIETNAM_CENTER = [16.0, 106.0];
const iconCache = {};

// Ghim màu khác nhau theo loại tài sản (dùng màu category.color từ utils/asset.js).
function assetIcon(category) {
  if (iconCache[category.value]) return iconCache[category.value];
  const icon = L.divIcon({
    className: 'asset-marker-icon',
    html: `
      <svg width="30" height="40" viewBox="0 0 34 44" xmlns="http://www.w3.org/2000/svg">
        <path d="M17 0C7.6 0 0 7.6 0 17c0 12 17 27 17 27s17-15 17-27C34 7.6 26.4 0 17 0z" fill="${category.color}" stroke="#F5E9D6" stroke-width="1.5"/>
        <circle cx="17" cy="17" r="10" fill="white"/>
        <text x="17" y="21.5" text-anchor="middle" font-size="12">${category.icon}</text>
      </svg>
    `,
    iconSize: [30, 40],
    iconAnchor: [15, 40],
    popupAnchor: [0, -36],
  });
  iconCache[category.value] = icon;
  return icon;
}

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

const AssetPopupCard = ({ asset, onViewDetail }) => {
  const category = getAssetCategory(asset.category);
  const status = getAssetStatus(asset.status);
  return (
    <div className="tomb-popup-card">
      {asset.images?.[0] && <img src={asset.images[0]} alt={asset.name} loading="lazy" className="tomb-popup-photo" />}
      <div className="tomb-popup-body">
        <div className="tomb-popup-name">{category.icon} {asset.name}</div>
        <div className="tomb-popup-meta">
          <span className="badge" style={{ background: status.color, color: 'white' }}>{status.label}</span>
        </div>
        {asset.description && <p className="tomb-popup-desc">{asset.description}</p>}
        <div className="tomb-popup-actions">
          <button className="btn-primary" style={{ padding: '7px 14px', fontSize: '0.85rem' }} onClick={() => onViewDetail(asset)}>
            Xem chi tiết
          </button>
          <a href={directionsUrl(asset.latitude, asset.longitude)} target="_blank" rel="noopener noreferrer" className="tomb-directions-btn">
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

const AssetMapView = ({ assets, onViewDetail }) => {
  const located = useMemo(() => assets.filter(a => a.latitude != null && a.longitude != null), [assets]);

  const bounds = useMemo(() => {
    if (located.length === 0) return null;
    const lats = located.map(a => a.latitude);
    const lngs = located.map(a => a.longitude);
    return [
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)],
    ];
  }, [located]);

  return (
    <div className="tomb-map-wrap asset-map-wrap">
      <MapContainer
        center={bounds ? undefined : VIETNAM_CENTER}
        zoom={bounds ? undefined : 5.5}
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
          {located.map(a => {
            const category = getAssetCategory(a.category);
            return (
              <Marker key={a.id} position={[a.latitude, a.longitude]} icon={assetIcon(category)}>
                <Tooltip direction="top" offset={[0, -34]} opacity={1}>
                  <span className="tomb-hover-tip-name">{a.name}</span>
                  {a.custodian && <span> · {a.custodian}</span>}
                </Tooltip>
                <Popup minWidth={230} maxWidth={260}>
                  <AssetPopupCard asset={a} onViewDetail={onViewDetail} />
                </Popup>
              </Marker>
            );
          })}
        </MarkerClusterGroup>
      </MapContainer>
      {located.length === 0 && (
        <div className="asset-map-empty-hint">Chưa có tài sản nào được gắn tọa độ GPS để hiển thị trên bản đồ.</div>
      )}
    </div>
  );
};

export default AssetMapView;
