import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AppContext } from '../store';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useContext(AppContext);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const result = await login(username, password);
      if (result.ok) {
        navigate('/admin');
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Không thể kết nối tới máy chủ. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <div className="card" style={{ maxWidth: '400px', width: '100%', padding: '40px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>Đăng Nhập Quản Trị</h2>

        {error && <div style={{ color: 'white', background: '#e74c3c', padding: '10px', borderRadius: '4px', marginBottom: '20px', textAlign: 'center' }}>{error}</div>}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Tên đăng nhập</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}
              required
            />
          </div>
          <button type="submit" className="btn-primary" style={{ marginTop: '10px', padding: '12px' }} disabled={isSubmitting}>
            {isSubmitting ? 'Đang đăng nhập...' : 'Đăng Nhập'}
          </button>
        </form>

        <hr style={{ margin: '24px 0 16px', border: 'none', borderTop: '1px solid var(--border-color)' }} />

        {/* Không có chức năng tự đặt lại mật khẩu qua email: hệ thống không thu thập email của
            tài khoản quản trị, và một luồng "quên mật khẩu" tự động lại chính là đường tấn
            công dễ nhất vào khu quản trị. Việc cấp lại được làm trực tiếp bởi quản trị viên. */}
        <details>
          <summary style={{ cursor: 'pointer', fontWeight: 600, color: 'var(--primary-color)' }}>
            Quên mật khẩu?
          </summary>
          <p style={{ marginTop: '10px', fontSize: '0.9rem', lineHeight: 1.7, color: 'var(--text-secondary)' }}>
            Vì lý do an toàn, hệ thống không tự đặt lại mật khẩu qua email. Vui lòng
            <strong> liên hệ trực tiếp Quản trị viên dòng họ </strong>
            để được cấp lại mật khẩu mới.
            <br /><br />
            Sau khi được cấp lại, mọi phiên đăng nhập cũ của tài khoản sẽ bị đăng xuất — nếu
            trước đó có người khác đang dùng tài khoản của bạn thì họ cũng sẽ bị đẩy ra.
          </p>
        </details>

        <p style={{ marginTop: '16px', fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Là con cháu trong dòng họ nhưng không có tài khoản? Bạn không cần đăng nhập —
          hãy vào <Link to="/gia-pha" style={{ color: 'var(--primary-color)', fontWeight: 600 }}>Gia Phả</Link> và
          xác thực bằng họ tên và ngày tế họ.
        </p>
      </div>
    </div>
  );
}

export default Login;
