import React from 'react';

// Chấp nhận số bắt đầu bằng 0 hoặc +84, 9-10 chữ số sau đó, cho phép khoảng trắng/dấu
// chấm/gạch ngang/ngoặc khi hiển thị (sẽ được loại bỏ trước khi validate và khi tạo link).
const isValidPhone = (phone) => {
  if (!phone) return false;
  const cleaned = phone.replace(/[\s.\-()]/g, '');
  return /^(\+84|0)\d{9,10}$/.test(cleaned);
};

// Icon gọi điện trực tiếp (tel:) cạnh số điện thoại. Không render gì nếu số không hợp lệ.
const CallButton = ({ phone, className = '' }) => {
  if (!isValidPhone(phone)) return null;
  const cleaned = phone.replace(/[\s.\-()]/g, '');

  return (
    <a
      href={`tel:${cleaned}`}
      className={`call-btn ${className}`}
      aria-label={`Gọi điện đến ${phone}`}
      title="Gọi điện"
    >
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
      </svg>
    </a>
  );
};

export default CallButton;
