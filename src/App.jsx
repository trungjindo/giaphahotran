import React, { useState, useContext, useEffect, useRef } from 'react';
import { Routes, Route, Link, NavLink } from 'react-router-dom';
import { AppContext } from './store';
import OceanScene from './components/OceanScene';

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
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';

const NAV_ITEMS = [
  { to: '/', label: 'Trang Chủ', end: true },
  { to: '/gioi-thieu', label: 'Giới Thiệu' },
  { to: '/gia-pha', label: 'Gia Phả' },
  { to: '/danh-sach', label: 'Danh Sách Con Cháu' },
  { to: '/thu-chi', label: 'Quản Lý Thu Chi' },
  { to: '/cac-chi', label: 'Các Chi' },
  { to: '/tin-tuc', label: 'Tin Tức & Hoạt Động' },
  { to: '/thu-vien', label: 'Thư Viện Ảnh' },
];

function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isLoading, loadError } = useContext(AppContext);
  const menuButtonRef = useRef(null);

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

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <div className="app-container">
      {/* Navbar */}
      <nav className="navbar">
        <div className="nav-container">
          <Link to="/" className="brand" onClick={closeMenu}>
            <LogoMark size={44} />
            <span className="brand-text-group">
              <span className="brand-text">Trần Đình</span>
              <span className="brand-tagline">Gia Phả Dòng Họ</span>
            </span>
          </Link>

          <ul className={`nav-links ${isMenuOpen ? 'active' : ''}`} id="primary-navigation">
            {NAV_ITEMS.map(item => (
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
      </nav>

      {/* Main Content */}
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/gioi-thieu" element={<About />} />
          <Route path="/gia-pha" element={<FamilyTreePage />} />
          <Route path="/danh-sach" element={<DescendantList />} />
          <Route path="/thu-chi" element={<Finance />} />
          <Route path="/cac-chi" element={<ChiPublic />} />
          <Route path="/tin-tuc" element={<NewsGallery />} />
          <Route path="/thu-vien" element={<Gallery />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="footer">
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
        </div>

        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Dòng Họ Trần Đình. Lưu giữ cội nguồn.</p>
          <Link to="/login" className="footer-login-link">Đăng Nhập Quản Trị Viên</Link>
        </div>
      </footer>
    </div>
  );
}

export default App;
