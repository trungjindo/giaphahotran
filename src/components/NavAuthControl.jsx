import React, { useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { AppContext } from '../store';
import FamilyVerifyForm from './FamilyVerifyForm';

const UserIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const Chevron = () => (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

// Lối vào xác thực đặt ngay trên MENU ĐẦU TRANG.
//
// Trước đây chỉ có 1 liên kết đăng nhập nằm tận chân trang, còn ô xác thực con cháu thì chỉ
// hiện ra khi người dùng đã lỡ bấm vào một trang bị chặn — nghĩa là phải gặp rào cản rồi mới
// biết đường đi tiếp. Nay nút luôn ở chỗ dễ thấy nhất, và cho biết luôn mình đang là ai.
//
// Ba trạng thái:
//   - Chưa ai đăng nhập  -> nút mở hộp thoại xác thực (kèm lối sang đăng nhập quản trị viên)
//   - Con cháu đã xác thực -> hiện tên, bấm ra có nút Thoát
//   - Quản trị viên đã đăng nhập -> hiện tên, bấm ra có lối vào Khu Quản Trị và Đăng xuất
const NavAuthControl = ({ onNavigate }) => {
  const {
    isAuthenticated, user, logout,
    viewerMember, clearFamilyVerification,
  } = useContext(AppContext);

  const [menuOpen, setMenuOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const wrapRef = useRef(null);

  // Bấm ra ngoài hoặc bấm Esc thì đóng menu thả xuống.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDown = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setMenuOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [menuOpen]);

  const close = () => { setMenuOpen(false); onNavigate?.(); };

  // Quản trị viên đăng nhập cũng được coi là người trong họ, nên phải xét trước trạng thái
  // "con cháu đã xác thực" — nếu không sẽ hiện nhầm thành người xem thường.
  const signedInAs = isAuthenticated
    ? { name: user?.username || 'Quản trị viên', kind: 'admin' }
    : viewerMember
      ? { name: viewerMember.name, kind: 'viewer' }
      : null;

  if (!signedInAs) {
    return (
      <>
        <button type="button" className="nav-auth-btn" onClick={() => { setDialogOpen(true); onNavigate?.(); }}>
          <UserIcon />
          Đăng nhập / Xác thực
        </button>
        {dialogOpen && <AuthDialog onClose={() => setDialogOpen(false)} />}
      </>
    );
  }

  return (
    <div className="nav-group nav-auth-wrap" ref={wrapRef}>
      <button
        type="button"
        className="nav-auth-btn is-signed-in"
        onClick={() => setMenuOpen(o => !o)}
        aria-expanded={menuOpen}
        aria-haspopup="true"
      >
        <UserIcon />
        <span className="nav-auth-name">{signedInAs.name}</span>
        <Chevron />
      </button>

      <ul className={`nav-dropdown nav-auth-dropdown${menuOpen ? ' is-open' : ''}`}>
        <li className="nav-auth-role">
          {signedInAs.kind === 'admin' ? 'Quản trị viên' : 'Con cháu đã xác thực'}
        </li>
        {signedInAs.kind === 'admin' && (
          <li><Link to="/admin" onClick={close}>Khu Quản Trị</Link></li>
        )}
        <li>
          <button
            type="button"
            className="nav-auth-signout"
            onClick={() => { close(); signedInAs.kind === 'admin' ? logout() : clearFamilyVerification(); }}
          >
            {signedInAs.kind === 'admin' ? 'Đăng xuất' : 'Thoát xác thực'}
          </button>
        </li>
      </ul>
    </div>
  );
};

// Hộp thoại xác thực mở từ menu — dùng lại đúng form của màn hình chắn, kèm lối sang trang
// đăng nhập quản trị viên để hai con đường vào đều nằm cùng một chỗ.
//
// BẮT BUỘC đưa ra thẳng <body> bằng portal: component này nằm bên trong <nav class="navbar">,
// mà navbar có backdrop-filter. Thuộc tính đó biến navbar thành "containing block" cho mọi
// phần tử position:fixed bên trong nó — nghĩa là lớp phủ toàn màn hình sẽ bị co lại đúng
// bằng chiều cao thanh menu (~75px), và hộp thoại cao hơn thế sẽ bị đẩy vọt lên trên, mất
// hẳn phần tiêu đề và câu hỏi đầu tiên. Render ở body thì lớp phủ mới phủ đúng cả màn hình.
const AuthDialog = ({ onClose }) => createPortal(
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal-content auth-dialog" onClick={e => e.stopPropagation()}>
      <div className="auth-dialog-header">
        <button className="close-btn" onClick={onClose} aria-label="Đóng">✕</button>
        <h2>Xác thực con cháu dòng họ</h2>
        <p>Thông tin gia phả, lăng mộ, tài sản và thu chi là việc riêng của dòng họ Trần Đình.</p>
      </div>

      <div className="auth-dialog-body">
        <p className="auth-dialog-intro">
          Xác thực bằng 3 thông tin dưới đây — chỉ cần làm <strong>1 lần</strong>, máy sẽ ghi nhớ trong 30 ngày.
        </p>

        <FamilyVerifyForm onVerified={onClose} />

        <hr />

        <p className="auth-dialog-foot">
          Là quản trị viên?{' '}
          <Link to="/login" onClick={onClose}>Đăng nhập tại đây</Link>.
          <br />
          Chưa có tên trong gia phả hoặc không xác thực được? Vui lòng liên hệ quản trị viên dòng họ.
        </p>
      </div>
    </div>
  </div>,
  document.body
);

export default NavAuthControl;
