import React, { useState } from 'react';
import { apiRequest } from '../api';

// Icon "Nhắn Zalo" cho số Zalo đã bị che trên hồ sơ công khai — cùng cơ chế với
// PhoneRevealButton: số thật chỉ lấy về đúng lúc bấm (api/reveal_phone.php?field=zalo)
// và mở thẳng liên kết zalo.me, không bao giờ hiển thị dạng chữ trên màn hình.
const ZaloRevealButton = ({ memberId, className = '' }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (isLoading || !memberId) return;
    setIsLoading(true);
    // Mở sẵn 1 tab trắng NGAY trong lúc bấm (còn trong "cử chỉ người dùng" đáng tin cậy) —
    // nếu đợi fetch xong rồi mới window.open()/click <a target="_blank"> thì nhiều trình
    // duyệt sẽ âm thầm chặn vì lúc đó không còn được coi là thao tác trực tiếp của người dùng.
    const newTab = window.open('', '_blank', 'noopener,noreferrer');
    try {
      const data = await apiRequest('reveal_phone.php', { params: { memberId, field: 'zalo' } });
      if (data?.value && newTab) {
        const cleaned = data.value.replace(/[\s.\-()]/g, '');
        newTab.location.href = `https://zalo.me/${cleaned}`;
      } else {
        newTab?.close();
      }
    } catch (err) {
      newTab?.close();
      alert('Không thể mở Zalo: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      className={`call-btn ${className}`}
      onClick={handleClick}
      disabled={isLoading}
      aria-label="Nhắn Zalo"
      title="Bấm để nhắn Zalo – số sẽ không hiển thị công khai"
    >
      {isLoading
        ? <span className="btn-icon-spinner" aria-hidden="true" />
        : (
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        )
      }
    </button>
  );
};

export default ZaloRevealButton;
