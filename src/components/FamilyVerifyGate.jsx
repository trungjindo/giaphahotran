import React from 'react';
import { Link } from 'react-router-dom';
import FamilyVerifyForm from './FamilyVerifyForm';

// Màn hình chắn trước các trang chứa dữ liệu riêng của dòng họ (gia phả, danh sách con cháu,
// lăng mộ, tài sản, thu chi, các chi). Phần form nằm ở FamilyVerifyForm để dùng chung với
// hộp thoại xác thực mở từ nút trên menu đầu trang.
function FamilyVerifyGate({ pageName }) {
  return (
    <div className="container" style={{ maxWidth: '560px', padding: '30px 20px 60px' }}>
      <div className="card" style={{ padding: '28px' }}>
        <h2 style={{ marginBottom: '6px' }}>Xác thực con cháu dòng họ</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.6 }}>
          {pageName ? <><strong>{pageName}</strong> là thông tin riêng của dòng họ Trần Đình. </> : null}
          Để bảo vệ thông tin cá nhân của con cháu trong họ, phần này chỉ dành cho người trong
          dòng họ. Vui lòng xác thực bằng 3 thông tin dưới đây — chỉ cần làm 1 lần, máy sẽ ghi
          nhớ trong 30 ngày.
        </p>

        <FamilyVerifyForm />

        <hr style={{ margin: '22px 0', border: 'none', borderTop: '1px solid var(--border-color)' }} />

        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Không xác thực được, hoặc chưa có tên trong gia phả? Vui lòng liên hệ quản trị viên
          dòng họ để được hỗ trợ.
          <br />
          Là quản trị viên? <Link to="/login" style={{ color: 'var(--primary-color)', fontWeight: 600 }}>Đăng nhập tại đây</Link>.
        </p>
      </div>
    </div>
  );
}

export default FamilyVerifyGate;
