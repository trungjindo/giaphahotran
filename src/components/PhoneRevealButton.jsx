import React, { useState } from 'react';
import { apiRequest } from '../api';

// Icon "Gọi điện" cho số điện thoại đã bị che trên hồ sơ công khai. Số thật chỉ được lấy
// về từ server đúng lúc bấm (api/reveal_phone.php) và đưa thẳng vào link tel: — không bao
// giờ được gán vào state hiển thị, nên không xuất hiện dạng chữ đọc được trên màn hình.
const PhoneRevealButton = ({ memberId, className = '' }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (isLoading || !memberId) return;
    setIsLoading(true);
    try {
      const data = await apiRequest('reveal_phone.php', { params: { memberId } });
      if (data?.phone) {
        // Một số trình duyệt chỉ kích hoạt được liên kết giao thức đặc biệt (tel:) khi thẻ
        // <a> thực sự có mặt trong DOM lúc bấm — gắn tạm, click, rồi gỡ ngay, không set số
        // vào bất kỳ state nào nên vẫn không hiển thị dạng chữ trên màn hình.
        const link = document.createElement('a');
        link.href = `tel:${data.phone}`;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      alert('Không thể thực hiện cuộc gọi: ' + err.message);
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
      aria-label="Gọi điện"
      title="Bấm để gọi – số sẽ không hiển thị công khai"
    >
      {isLoading
        ? <span className="btn-icon-spinner" aria-hidden="true" />
        : (
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
        )
      }
    </button>
  );
};

export default PhoneRevealButton;
