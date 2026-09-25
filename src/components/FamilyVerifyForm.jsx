import React, { useContext, useState } from 'react';
import { AppContext } from '../store';

// Form xác thực con cháu — 3 thông tin mà người ngoài không có: họ tên của mình, họ tên cha,
// và ngày tế họ hàng năm.
//
// Tách riêng khỏi FamilyVerifyGate để dùng được ở HAI nơi mà không chép lại: màn hình chắn
// trước các trang riêng của dòng họ, và hộp thoại mở từ nút trên menu đầu trang.
//
// Lưu ý: việc chặn thật nằm ở PHÍA MÁY CHỦ (các API trả 401 khi chưa xác thực) — form này
// chỉ là phần giao diện của cùng cơ chế đó, không phải lớp bảo vệ duy nhất.
const inputStyle = {
  width: '100%', padding: '11px 12px', borderRadius: '6px',
  border: '1px solid var(--border-color)', boxSizing: 'border-box', fontSize: '1rem',
};

const FamilyVerifyForm = ({ onVerified }) => {
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
      if (result.ok) onVerified?.();
      else setError(result.error);
    } catch (err) {
      setError(err.message || 'Không kết nối được máy chủ. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
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
  );
};

export default FamilyVerifyForm;
