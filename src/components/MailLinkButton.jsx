import React from 'react';

const isValidEmail = (email) => !!email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

// Icon gửi email (mailto:) cạnh 1 trường email. Không render gì nếu email rỗng/sai định dạng.
const MailLinkButton = ({ email, className = '' }) => {
  if (!isValidEmail(email)) return null;

  return (
    <a
      href={`mailto:${email.trim()}`}
      className={`mail-link-btn ${className}`}
      aria-label={`Gửi email đến ${email}`}
      title="Gửi email"
    >
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m2 7 10 6 10-6" />
      </svg>
    </a>
  );
};

export default MailLinkButton;
