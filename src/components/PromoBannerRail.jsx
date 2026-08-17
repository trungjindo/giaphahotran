import React, { useEffect, useRef, useState, forwardRef } from 'react';
import { apiRequest } from '../api';

const ROTATE_MS = 7000;
const RAIL_MARGIN = 24;

// Băng quảng cáo dọc 2 bên trang web — nơi các doanh nghiệp/dịch vụ của thành viên trong họ
// được giới thiệu. Vế trái và vế phải luôn hiện 2 banner KHÁC NHAU (khi có ≥2 banner đang bật)
// và cùng xoay vòng đồng bộ mỗi ROTATE_MS, để nhiều thành viên cùng được lên hình lần lượt.
const PromoBannerRail = ({ footerRef }) => {
  const [banners, setBanners] = useState([]);
  const [index, setIndex] = useState(0);
  const leftCardRef = useRef(null);
  const rightCardRef = useRef(null);

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

  // Băng quảng cáo mặc định căn giữa theo chiều dọc màn hình (position: fixed + top: 50%).
  // Nếu cứ giữ nguyên như vậy, lúc cuộn tới cuối trang — khi footer lọt vào giữa khung nhìn —
  // băng sẽ đè lên footer. Effect này tính lại vị trí "top" mỗi khi cuộn/đổi cỡ màn hình: nếu
  // giữ nguyên vị trí căn giữa sẽ khiến mép dưới băng vượt qua mép trên footer, đẩy băng lên
  // vừa đủ để luôn dừng lại trước footer (và không bao giờ chui lên trên navbar cố định).
  useEffect(() => {
    if (banners.length === 0) return;
    const navHeight = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--nav-height')
    ) || 76;

    const updatePosition = () => {
      // Trái/phải có thể cao khác nhau (banner không có mô tả/liên hệ sẽ ngắn hơn) — lấy
      // chiều cao lớn nhất để mép dưới của cả hai bên đều không bao giờ đè lên footer.
      const cardHeight = Math.max(
        leftCardRef.current?.offsetHeight || 0,
        rightCardRef.current?.offsetHeight || 0
      );
      const footerTop = footerRef?.current?.getBoundingClientRect().top ?? Infinity;
      const idealCenter = window.innerHeight / 2;
      const maxCenter = footerTop - RAIL_MARGIN - cardHeight / 2;
      const minCenter = navHeight + RAIL_MARGIN + cardHeight / 2;
      const centerY = Math.max(Math.min(idealCenter, maxCenter), minCenter);
      document.documentElement.style.setProperty('--promo-rail-top', `${centerY}px`);
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition, { passive: true });
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
      document.documentElement.style.removeProperty('--promo-rail-top');
    };
  }, [banners.length, index, footerRef]);

  if (banners.length === 0) return null;

  const left = banners[index % banners.length];
  const right = banners[(index + 1) % banners.length];

  return (
    <>
      <PromoCard ref={leftCardRef} key={`left-${left.id}`} banner={left} side="left" total={banners.length} activeIndex={index % banners.length} />
      {banners.length > 1 && (
        <PromoCard ref={rightCardRef} key={`right-${right.id}`} banner={right} side="right" total={banners.length} activeIndex={(index + 1) % banners.length} />
      )}
    </>
  );
};

const PromoCard = forwardRef(({ banner, side, total, activeIndex }, ref) => {
  const Wrapper = banner.linkUrl ? 'a' : 'div';
  const wrapperProps = banner.linkUrl
    ? { href: banner.linkUrl, target: '_blank', rel: 'noopener noreferrer' }
    : {};

  return (
    <aside ref={ref} className={`promo-rail promo-rail-${side}`} aria-label="Quảng bá doanh nghiệp thành viên dòng họ">
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
});

export default PromoBannerRail;
