import React, { useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppContext } from '../store';

// Màn hình chắn trước các trang chứa dữ liệu riêng của dòng họ (gia phả, danh sách con cháu,
// lăng mộ, tài sản, thu chi, các chi). Người trong họ tự chứng minh bằng 3 thông tin mà
// người ngoài không có: họ tên của mình, họ tên cha, và ngày tế họ hàng năm.
//
// Lưu ý: việc chặn thật nằm ở PHÍA MÁY CHỦ (các API đã trả 401 khi chưa xác thực) — màn hình
// này chỉ là phần giao diện của cùng cơ chế đó, không phải là lớp bảo vệ duy nhất.
function FamilyVerifyGate({ pageName }) {
  const { verifyFamily } = useContext(AppContext);
  const [fullName, setFullName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [teHoDay, setTeHoDay] = useState('');
  const [teHoMonth, setTeHoMonth] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!fullName.trim() || !fatherName.trim() || !teHoDay || !teHoMonth) {
      setError('Vui lòng điền đầy đủ cả 3 thông tin.');
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await verifyFamily({
        fullName: fullName.trim(),
        fatherName: fatherName.trim(),
        teHoDay: Number(teHoDay),
        teHoMonth: Number(teHoMonth),
      });
      if (!result.ok) setError(result.error);
    } catch (err) {
      setError(err.message || 'Không kết nối được máy chủ. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '11px 12px', borderRadius: '6px',
    border: '1px solid var(--border-color)', boxSizing: 'border-box', fontSize: '1rem',
  };

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

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>
              1. Họ và tên của bạn <span style={{ color: '#c0392b' }}>*</span>
            </label>
            <input
              type="text" value={fullName} onChange={e => setFullName(e.target.value)}
              placeholder="VD: Trần Đình Trung" style={inputStyle} autoComplete="off"
            />
            <p style={{ margin: '5px 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Gõ có dấu hay không dấu đều được.
            </p>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>
              2. Họ và tên cha của bạn <span style={{ color: '#c0392b' }}>*</span>
            </label>
            <input
              type="text" value={fatherName} onChange={e => setFatherName(e.target.value)}
              placeholder="VD: Trần Đình Trường" style={inputStyle} autoComplete="off"
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>
              3. Ngày tế họ hàng năm (âm lịch) <span style={{ color: '#c0392b' }}>*</span>
            </label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Ngày</span>
              <select value={teHoDay} onChange={e => setTeHoDay(e.target.value)} style={{ ...inputStyle, width: 'auto', flex: 1 }}>
                <option value="">--</option>
                {Array.from({ length: 30 }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <span style={{ color: 'var(--text-secondary)' }}>tháng</span>
              <select value={teHoMonth} onChange={e => setTeHoMonth(e.target.value)} style={{ ...inputStyle, width: 'auto', flex: 1 }}>
                <option value="">--</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          {error && (
            <p style={{
              marginBottom: '16px', padding: '10px 12px', borderRadius: '6px',
              background: '#fdecea', color: '#b03a3a', fontSize: '0.9rem'
            }}>
              {error}
            </p>
          )}

          <button type="submit" className="btn-primary" disabled={isSubmitting} style={{ width: '100%', padding: '12px' }}>
            {isSubmitting ? 'Đang kiểm tra...' : 'Xác thực để xem'}
          </button>
        </form>

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
