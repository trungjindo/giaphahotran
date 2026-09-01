import React, { useState, useContext, useEffect, useRef } from 'react';
import { Routes, Route, Link, NavLink, useLocation } from 'react-router-dom';
import { AppContext } from './store';
import OceanScene from './components/OceanScene';
import ContactAdminBox from './components/ContactAdminBox';
import PromoBannerRail from './components/PromoBannerRail';

const LOGO_SRC = '/media/brand/logo-icon.png';
const LogoMark = ({ size = 44, className = '' }) => (
  <img src={LOGO_SRC} alt="Biểu tượng dòng họ Trần Đình" width={size} height={size} className={className} style={{ display: 'block', borderRadius: '50%' }} />
);
import Home from './pages/Home';
import About from './pages/About';
import FamilyTreePage from './pages/FamilyTreePage';
import DescendantList from './pages/DescendantList';
import Finance from './pages/Finance';
import NewsGallery from './pages/NewsGallery';
import Gallery from './pages/Gallery';
import ChiPublic from './pages/ChiPublic';
import TombMapPage from './pages/TombMapPage';
import AssetsPublicPage from './pages/AssetsPublicPage';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import FamilyVerifyGate from './components/FamilyVerifyGate';
import FamilyCalendarModal from './components/FamilyCalendarModal';
import { OPEN_FAMILY_CALENDAR } from './utils/appEvents';

// Các trang chứa dữ liệu riêng của dòng họ. Máy chủ đã chặn sẵn (API trả 401 nếu chưa xác
// thực) — bọc thêm ở đây để hiện màn hình xác thực thay vì để trang trống/lỗi khó hiểu.
function FamilyOnly({ pageName, children }) {
  const { isFamilyVerified } = useContext(AppContext);
  if (!isFamilyVerified) return <FamilyVerifyGate pageName={pageName} />;
  return children;
}

const NAV_ITEMS = [
  { to: '/', label: 'Trang Chủ', end: true },
  { to: '/gioi-thieu', label: 'Giới Thiệu' },
  { to: '/gia-pha', label: 'Gia Phả' },
  { to: '/danh-sach', label: 'Danh Sách Con Cháu' },
  { to: '/ban-do-lang-mo', label: 'Bản Đồ Lăng Mộ' },
  { to: '/tai-san', label: 'Tài Sản Dòng Họ' },
  { to: '/thu-chi', label: 'Quản Lý Thu Chi' },
  { to: '/cac-chi', label: 'Các Chi' },
  { to: '/tin-tuc', label: 'Tin Tức & Hoạt Động' },
  { to: '/thu-vien', label: 'Thư Viện Ảnh' },
];

// Menu trên cùng gom 10 mục thành 4 nhóm cho đỡ chật (chân trang vẫn liệt kê phẳng đủ 10 mục
// như cũ). Tra theo đường dẫn từ NAV_ITEMS để nhãn/đường dẫn chỉ khai báo ở đúng một chỗ —
// thêm mục mới vào NAV_ITEMS mà quên xếp nhóm thì nó vẫn hiện ở chân trang, không mất hẳn.
const byPath = Object.fromEntries(NAV_ITEMS.map(i => [i.to, i]));
const NAV_GROUPS = [
  { kind: 'link', ...byPath['/'] },
  { kind: 'group', label: 'Phả Hệ', items: ['/gia-pha', '/danh-sach', '/cac-chi'].map(x => byPath[x]) },
  { kind: 'group', label: 'Dòng Họ', items: ['/gioi-thieu', '/ban-do-lang-mo', '/tai-san', '/thu-chi'].map(x => byPath[x]) },
  { kind: 'group', label: 'Tin Tức', items: ['/tin-tuc', '/thu-vien'].map(x => byPath[x]) },
];

function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const { isLoading, loadError, isFamilyVerified } = useContext(AppContext);
  const menuButtonRef = useRef(null);
  const footerRef = useRef(null);
  // Sơ đồ gia phả tự vẽ thành popup toàn màn hình (xem FamilyTreePage.jsx) — không render
  // navbar/banner quảng cáo/footer lúc này, để tránh chúng vẫn "ẩn phía sau" nhưng vẫn bấm
  // Tab tới được (rò rỉ khả năng tiếp cận) dù đã bị che khuất trực quan bởi overlay.
  // Chỉ ẩn navbar/footer khi sơ đồ THẬT SỰ được vẽ. Nếu khách chưa xác thực, trang này hiện
  // màn hình xác thực bình thường — vẫn phải có thanh điều hướng để họ đi tiếp chỗ khác,
  // nếu không sẽ bị kẹt ở một trang trống không có lối ra.
  const { pathname } = useLocation();
  const isTreePopup = pathname === '/gia-pha' && isFamilyVerified;

  useEffect(() => {
    if (!isMenuOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isMenuOpen]);

  // Bấm ra ngoài hoặc bấm Esc thì đóng menu xổ đang mở.
  useEffect(() => {
    if (openGroup === null) return;
    const onDown = (e) => { if (!e.target.closest('.nav-group')) setOpenGroup(null); };
    const onKey = (e) => { if (e.key === 'Escape') setOpenGroup(null); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [openGroup]);

  // Trang chủ phát sự kiện để mở đúng hộp thoại lịch duy nhất này.
  useEffect(() => {
    const open = () => setCalendarOpen(true);
    window.addEventListener(OPEN_FAMILY_CALENDAR, open);
    return () => window.removeEventListener(OPEN_FAMILY_CALENDAR, open);
  }, []);

  if (loadError) {
    return (
      <div className="app-status-screen">
        <LogoMark size={56} />
        <div className="app-status-error">
          <h2>Không thể kết nối máy chủ</h2>
          <p style={{ marginTop: '8px' }}>{loadError}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="app-status-screen">
        <LogoMark size={56} className="app-status-logo" />
        <p>Đang tải dữ liệu...</p>
      </div>
    );
  }

  const closeMenu = () => { setIsMenuOpen(false); setOpenGroup(null); };

  return (
    <div className="app-container">
      {/* Banner quảng cáo dọc 2 bên trang web (doanh nghiệp/dịch vụ thành viên) — chỉ hiện
          trên màn hình rất rộng để không bao giờ chồng lấn nội dung chính (max-width 1280px). */}
      {!isTreePopup && <PromoBannerRail footerRef={footerRef} />}

      {/* Navbar */}
      {!isTreePopup && <nav className="navbar">
        <div className="nav-container">
          <Link to="/" className="brand" onClick={closeMenu}>
            <LogoMark size={44} />
            <span className="brand-text-group">
              <span className="brand-text">Trần Đình</span>
              <span className="brand-tagline">Gia Phả Dòng Họ</span>
            </span>
          </Link>

          <ul className={`nav-links ${isMenuOpen ? 'active' : ''}`} id="primary-navigation">
            {NAV_GROUPS.map(group => (
              group.kind === 'link' ? (
                <li key={group.to}>
                  <NavLink
                    to={group.to}
                    end={group.end}
                    onClick={closeMenu}
                    className={({ isActive }) => (isActive ? 'active' : undefined)}
                  >
                    {group.label}
                  </NavLink>
                </li>
              ) : (
                <li key={group.label} className="nav-group">
                  <button
                    type="button"
                    className={`nav-group-btn${group.items.some(i => i.to === pathname) ? ' active' : ''}`}
                    onClick={() => setOpenGroup(g => (g === group.label ? null : group.label))}
                    aria-expanded={openGroup === group.label}
                    aria-haspopup="true"
                  >
                    {group.label}
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                  <ul className={`nav-dropdown${openGroup === group.label ? ' is-open' : ''}`}>
                    {group.items.map(item => (
                      <li key={item.to}>
                        <NavLink
                          to={item.to}
                          end={item.end}
                          onClick={closeMenu}
                          className={({ isActive }) => (isActive ? 'active' : undefined)}
                        >
                          {item.label}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </li>
              )
            ))}

            <li className="nav-calendar-item">
              <button
                type="button"
                className="nav-calendar-btn"
                onClick={() => { closeMenu(); setCalendarOpen(true); }}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
                  <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
                </svg>
                Lịch Gia Tộc
              </button>
            </li>
          </ul>

          <button
            ref={menuButtonRef}
            className="mobile-menu-btn"
            onClick={() => setIsMenuOpen(o => !o)}
            aria-expanded={isMenuOpen}
            aria-controls="primary-navigation"
            aria-label={isMenuOpen ? 'Đóng menu' : 'Mở menu'}
          >
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
              {isMenuOpen ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : (
                <path d="M3 12h18M3 6h18M3 18h18" />
              )}
            </svg>
          </button>
        </div>
      </nav>}

      {/* Main Content */}
      <main className={isTreePopup ? undefined : 'main-content'}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/gioi-thieu" element={<About />} />
          <Route path="/gia-pha" element={<FamilyOnly pageName="Sơ đồ gia phả"><FamilyTreePage /></FamilyOnly>} />
          <Route path="/danh-sach" element={<FamilyOnly pageName="Danh sách con cháu"><DescendantList /></FamilyOnly>} />
          <Route path="/ban-do-lang-mo" element={<FamilyOnly pageName="Bản đồ lăng mộ"><TombMapPage /></FamilyOnly>} />
          <Route path="/tai-san" element={<FamilyOnly pageName="Tài sản dòng họ"><AssetsPublicPage /></FamilyOnly>} />
          <Route path="/thu-chi" element={<FamilyOnly pageName="Quản lý thu chi"><Finance /></FamilyOnly>} />
          <Route path="/cac-chi" element={<FamilyOnly pageName="Các chi trong dòng họ"><ChiPublic /></FamilyOnly>} />
          <Route path="/tin-tuc" element={<NewsGallery />} />
          <Route path="/thu-vien" element={<Gallery />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </main>

      {/* Footer */}
      {!isTreePopup && <footer className="footer" ref={footerRef}>
        <OceanScene variant="pattern" className="footer-pattern" />
        <div className="footer-inner">
          <div className="footer-brand">
            <LogoMark size={40} className="footer-logo" />
            <div>
              <p className="footer-brand-name">Dòng Họ Trần Đình</p>
              <p className="footer-tagline">"Mộc bản thủy nguyên" — Cây có cội, nước có nguồn</p>
            </div>
          </div>

          <nav className="footer-links" aria-label="Liên kết nhanh">
            {NAV_ITEMS.map(item => (
              <Link key={item.to} to={item.to}>{item.label}</Link>
            ))}
          </nav>

          <ContactAdminBox />
        </div>

        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Dòng Họ Trần Đình. Lưu giữ cội nguồn.</p>
          <Link to="/login" className="footer-login-link">Đăng Nhập Quản Trị Viên</Link>
        </div>
      </footer>}

      {calendarOpen && <FamilyCalendarModal onClose={() => setCalendarOpen(false)} />}
    </div>
  );
}

export default App;
