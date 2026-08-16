import React, { useEffect, useState } from 'react';
import { apiRequest } from '../api';

const ROTATE_MS = 7000;

// Băng quảng cáo dọc 2 bên trang web — nơi các doanh nghiệp/dịch vụ của thành viên trong họ
// được giới thiệu. Vế trái và vế phải luôn hiện 2 banner KHÁC NHAU (khi có ≥2 banner đang bật)
// và cùng xoay vòng đồng bộ mỗi ROTATE_MS, để nhiều thành viên cùng được lên hình lần lượt.
const PromoBannerRail = () => {
  const [banners, setBanners] = useState([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    apiRequest('promo_banners.php').then(setBanners).catch(() => {});
  }, []);

  useEffect(() => {
    if (banners.length < 2) return;
    const timer = setInterval(() => {
      setIndex(prev => (prev + 1) % banners.length);
    }, ROTATE_MS);
    return () => clearInterval(timer);
  }, [banners.length]);

  if (banners.length === 0) return null;

  const left = banners[index % banners.length];
  const right = banners[(index + 1) % banners.length];

  return (
    <>
      <PromoCard key={`left-${left.id}`} banner={left} side="left" total={banners.length} activeIndex={index % banners.length} />
      {banners.length > 1 && (
        <PromoCard key={`right-${right.id}`} banner={right} side="right" total={banners.length} activeIndex={(index + 1) % banners.length} />
      )}
    </>
  );
};

const PromoCard = ({ banner, side, total, activeIndex }) => {
  const Wrapper = banner.linkUrl ? 'a' : 'div';
  const wrapperProps = banner.linkUrl
    ? { href: banner.linkUrl, target: '_blank', rel: 'noopener noreferrer' }
    : {};

  return (
    <aside className={`promo-rail promo-rail-${side}`} aria-label="Quảng bá doanh nghiệp thành viên dòng họ">
      <Wrapper className="promo-card" {...wrapperProps}>
        <span className="promo-card-eyebrow">Quảng Bá Thành Viên</span>
        <div className="promo-card-image-wrap">
          <img src={banner.image} alt={banner.businessName} className="promo-card-image" loading="lazy" />
        </div>
        <div className="promo-card-body">
          <h4 className="promo-card-name">{banner.businessName}</h4>
          {banner.description && <p className="promo-card-desc">{banner.description}</p>}
          {banner.contactName && <p className="promo-card-contact">Liên hệ: {banner.contactName}</p>}
          {banner.linkUrl && <span className="promo-card-cta">Xem thêm →</span>}
        </div>
      </Wrapper>
      {total > 1 && (
        <div className="promo-card-dots" aria-hidden="true">
          {Array.from({ length: total }).map((_, i) => (
            <span key={i} className={`promo-card-dot ${i === activeIndex ? 'active' : ''}`} />
          ))}
        </div>
      )}
    </aside>
  );
};

export default PromoBannerRail;
