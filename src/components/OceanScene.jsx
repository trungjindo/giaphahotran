import React, { useId } from 'react';

// Nền minh họa tông đại dương lấy cảm hứng biển Quỳnh Lập: trời hoàng hôn,
// biển gợn sóng, dải cát, bóng dừa và thuyền thúng.
// variant="hero": cảnh nhiều lớp (gradient + noise) tạo chiều sâu gần giống ảnh,
//   dùng làm nền cho khối hero lớn.
// variant="pattern": họa tiết sóng/dừa/thuyền lặp lại, mờ nhẹ, dùng cho footer
//   hoặc dải phân cách giữa các section.
function OceanScene({ variant = 'hero', className = '' }) {
  const uid = useId().replace(/:/g, '');

  if (variant === 'pattern') {
    const patternId = `oceanPattern-${uid}`;
    return (
      <svg
        className={className}
        width="100%" height="100%"
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <pattern id={patternId} patternUnits="userSpaceOnUse" width="220" height="150" patternTransform="translate(0,0)">
            <path d="M0 96c14-14 28-14 42 0s28 14 42 0 28-14 42 0 28 14 42 0 28-14 42 0"
              fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" opacity="0.55" />
            <path d="M0 118c14-14 28-14 42 0s28 14 42 0 28-14 42 0 28 14 42 0 28-14 42 0"
              fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" opacity="0.3" />
            {/* dừa nhỏ */}
            <g stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.45">
              <path d="M28 90c-1.2-5 0-9 2.6-12" />
              <path d="M30.6 78c-3-2.6-5.8-1.7-7.3 0.8" />
              <path d="M30.6 78c2.2-2.4 4.8-2.4 7.2-0.8" />
            </g>
            {/* thuyền thúng nhỏ */}
            <path d="M150 92c0 2.6 3.6 4.4 7.2 4.4s7.2-1.8 7.2-4.4"
              fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>
    );
  }

  const skyId = `oceanSky-${uid}`;
  const seaId = `oceanSea-${uid}`;
  const sunId = `oceanSun-${uid}`;
  const sandId = `oceanSand-${uid}`;
  const grainId = `oceanGrain-${uid}`;
  const blurId = `oceanBlur-${uid}`;

  return (
    <svg
      className={className}
      width="100%" height="100%"
      viewBox="0 0 1440 640"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={skyId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0A5480" />
          <stop offset="45%" stopColor="#0E6FA8" />
          <stop offset="78%" stopColor="#2FB3C0" />
          <stop offset="100%" stopColor="#F2C46A" />
        </linearGradient>
        <radialGradient id={sunId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FCE7B8" stopOpacity="0.95" />
          <stop offset="55%" stopColor="#F2C46A" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#F2C46A" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={seaId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2FB3C0" />
          <stop offset="35%" stopColor="#0E6FA8" />
          <stop offset="100%" stopColor="#0A4E75" />
        </linearGradient>
        <linearGradient id={sandId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F5E9D6" />
          <stop offset="100%" stopColor="#E7D3AC" />
        </linearGradient>
        <filter id={blurId} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
        <filter id={grainId}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" result="noise" />
          <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.05 0" />
        </filter>
      </defs>

      {/* Bầu trời hoàng hôn */}
      <rect x="0" y="0" width="1440" height="640" fill={`url(#${skyId})`} />

      {/* Ánh mặt trời mờ phía chân trời */}
      <circle cx="980" cy="330" r="170" fill={`url(#${sunId})`} filter={`url(#${blurId})`} />

      {/* Bờ biển xa mờ */}
      <path d="M0 350c220-24 480-24 720 4s500 26 720-2v40H0z" fill="#08324A" opacity="0.28" />

      {/* Mặt biển */}
      <path d="M0 360c240-18 480 20 720 6s480-30 720 4v270H0z" fill={`url(#${seaId})`} />

      {/* Gợn sóng trên mặt biển */}
      <g className="ocean-wave-anim" opacity="0.5">
        <path d="M-100 420c120-26 240-26 360 0s240 26 360 0 240-26 360 0 240 26 360 0 120-26 240-26"
          fill="none" stroke="#F5E9D6" strokeWidth="5" strokeLinecap="round" opacity="0.35" />
        <path d="M-100 470c120-22 240-22 360 0s240 22 360 0 240-22 360 0 240 22 360 0 120-22 240-22"
          fill="none" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" opacity="0.25" />
      </g>

      {/* Dải cát */}
      <path d="M0 560c260-30 420 30 720 10s470-40 720 6v64H0z" fill={`url(#${sandId})`} />
      <path d="M0 566c260-26 420 26 720 8s470-34 720 6" fill="none" stroke="#0A4E75" strokeOpacity="0.12" strokeWidth="6" />

      {/* Dừa bên trái (cận cảnh) */}
      <g fill="#0A2C40" opacity="0.82">
        <path d="M150 600c-4-58 8-102 34-138" stroke="#0A2C40" strokeWidth="10" fill="none" strokeLinecap="round" />
        <path d="M184 462c-34-30-70-24-92 6 30-6 60 0 92 10z" />
        <path d="M184 462c-10-40 8-72 46-88-14 34-16 62-6 92z" />
        <path d="M184 462c30-26 64-22 88 4-32-2-60 6-88 12z" />
        <path d="M184 462c22-34 54-44 90-36-24 18-42 38-50 62z" />
      </g>

      {/* Thuyền thúng giữa khung */}
      <g transform="translate(700,540)" fill="#0A2C40" opacity="0.85">
        <path d="M-46 0c0 15 20 26 46 26s46-11 46-26c0-3-2-6-6-6h-80c-4 0-6 3-6 6z" />
        <line x1="-6" y1="-34" x2="24" y2="-2" stroke="#0A2C40" strokeWidth="5" strokeLinecap="round" />
      </g>

      {/* Dừa bên phải (nhỏ hơn, xa hơn) */}
      <g fill="#0A2C40" opacity="0.6">
        <path d="M1260 590c-3-40 5-70 24-96" stroke="#0A2C40" strokeWidth="7" fill="none" strokeLinecap="round" />
        <path d="M1284 494c-24-20-48-16-64 4 20-4 42 0 64 8z" />
        <path d="M1284 494c-6-28 6-50 32-60-10 24-12 42-4 64z" />
        <path d="M1284 494c20-18 44-15 60 3-22-1-42 5-60 9z" />
      </g>

      {/* Hạt sạn nhẹ để bớt phẳng, tạo cảm giác gần ảnh thật */}
      <rect x="0" y="0" width="1440" height="640" filter={`url(#${grainId})`} opacity="0.6" />
    </svg>
  );
}

export default OceanScene;
