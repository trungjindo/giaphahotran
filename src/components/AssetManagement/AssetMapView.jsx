import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import GoogleMapCanvas from '../GoogleMapCanvas';
import { VIETNAM_CENTER, VIETNAM_ZOOM, svgMarkerIcon } from '../../utils/googleMaps';
import { getAssetCategory, getAssetStatus } from '../../utils/asset';

// Ghim màu khác nhau theo loại tài sản (dùng màu category.color từ utils/asset.js).
const assetPinSvg = (category) => `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="40" viewBox="0 0 34 44">
  <path d="M17 0C7.6 0 0 7.6 0 17c0 12 17 27 17 27s17-15 17-27C34 7.6 26.4 0 17 0z" fill="${category.color}" stroke="#F5E9D6" stroke-width="1.5"/>
  <circle cx="17" cy="17" r="10" fill="white"/>
  <text x="17" y="21.5" text-anchor="middle" font-size="12">${category.icon}</text>
</svg>`;

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

  const mapRef = useRef(null);
  const mapsRef = useRef(null);
  const clustererRef = useRef(null);
  const infoRef = useRef(null);
  // Popup của Google Maps nhận phần tử DOM, không nhận phần tử React — nên dựng sẵn một
  // gốc React nhỏ để vẽ thẻ thông tin vào đó.
  const popupHostRef = useRef(null);
  const popupRootRef = useRef(null);
  const [ready, setReady] = useState(false);

  const onViewDetailRef = useRef(onViewDetail);
  onViewDetailRef.current = onViewDetail;

  const handleMapReady = useCallback((map, maps) => {
    mapRef.current = map;
    mapsRef.current = maps;
    infoRef.current = new maps.InfoWindow({ maxWidth: 300 });
    popupHostRef.current = document.createElement('div');
    popupRootRef.current = createRoot(popupHostRef.current);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return undefined;
    const map = mapRef.current;
    const maps = mapsRef.current;

    const markers = located.map(a => {
      const category = getAssetCategory(a.category);
      const marker = new maps.Marker({
        position: { lat: a.latitude, lng: a.longitude },
        icon: svgMarkerIcon(maps, assetPinSvg(category), { width: 30, height: 40, anchorX: 15, anchorY: 40 }),
        title: [a.name, a.custodian].filter(Boolean).join(' · '),
      });
      marker.addListener('click', () => {
        popupRootRef.current.render(
          <AssetPopupCard asset={a} onViewDetail={x => onViewDetailRef.current(x)} />
        );
        infoRef.current.setContent(popupHostRef.current);
        infoRef.current.open({ anchor: marker, map });
      });
      return marker;
    });

    clustererRef.current = new MarkerClusterer({ map, markers });

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
  }, [ready, located]);

  useEffect(() => () => {
    const root = popupRootRef.current;
    if (root) setTimeout(() => root.unmount(), 0);
  }, []);

  return (
    <div className="tomb-map-wrap asset-map-wrap">
      <GoogleMapCanvas
        style={{ height: '100%', width: '100%' }}
        options={{ center: VIETNAM_CENTER, zoom: VIETNAM_ZOOM }}
        onMapReady={handleMapReady}
      />
      {located.length === 0 && (
        <div className="asset-map-empty-hint">Chưa có tài sản nào được gắn tọa độ GPS để hiển thị trên bản đồ.</div>
      )}
    </div>
  );
};

export default AssetMapView;
