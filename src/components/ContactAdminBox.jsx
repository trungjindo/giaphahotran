import React, { useContext } from 'react';
import { AppContext } from '../store';
import CallButton from './CallButton';
import MailLinkButton from './MailLinkButton';
import MapLinkButton from './MapLinkButton';

// Khối liên hệ gọn nhẹ ở footer để con cháu liên hệ trực tiếp quản trị viên website khi
// cần hỗ trợ/báo lỗi. Tự ẩn hoàn toàn nếu chưa cấu hình gì (xem AdminDashboard > Giới
// Thiệu > Liên Hệ Quản Trị để cập nhật thông tin).
const ContactAdminBox = () => {
  const { contactAdminData } = useContext(AppContext);
  const { name, email, phone, address } = contactAdminData || {};

  if (!name && !email && !phone && !address) return null;

  return (
    <div className="footer-contact">
      <p className="footer-contact-title">Liên Hệ Quản Trị Website</p>
      {name && <p className="footer-contact-name">{name}</p>}

      {email && (
        <div className="footer-contact-row">
          <span className="footer-contact-value">{email}</span>
          <MailLinkButton email={email} className="footer-contact-icon" />
        </div>
      )}

      {phone && (
        <div className="footer-contact-row">
          <span className="footer-contact-value">{phone}</span>
          <CallButton phone={phone} className="footer-contact-icon" />
        </div>
      )}

      {address && (
        <div className="footer-contact-row">
          <span className="footer-contact-value">{address}</span>
          <MapLinkButton address={address} className="footer-contact-icon" />
        </div>
      )}
    </div>
  );
};

export default ContactAdminBox;
