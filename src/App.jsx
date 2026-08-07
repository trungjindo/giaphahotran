import React, { useState } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import FamilyTreePage from './pages/FamilyTreePage';
import Finance from './pages/Finance';
import NewsGallery from './pages/NewsGallery';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="app-container">
      {/* Navbar */}
      <nav className="navbar">
        <div className="nav-container">
          <Link to="/" className="brand">
            <span className="brand-logo">TĐ</span>
            <span className="brand-text">Trần Đình</span>
          </Link>
          
          <div className={`nav-links ${isMenuOpen ? 'active' : ''}`}>
            <Link to="/" onClick={() => setIsMenuOpen(false)}>Trang Chủ</Link>
            <Link to="/gia-pha" onClick={() => setIsMenuOpen(false)}>Gia Phả</Link>
            <Link to="/thu-chi" onClick={() => setIsMenuOpen(false)}>Quản Lý Thu Chi</Link>
            <Link to="/tin-tuc" onClick={() => setIsMenuOpen(false)}>Tin Tức & Hoạt Động</Link>
          </div>

          <button className="mobile-menu-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>
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
          <Route path="/gia-pha" element={<FamilyTreePage />} />
          <Route path="/thu-chi" element={<Finance />} />
          <Route path="/tin-tuc" element={<NewsGallery />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="footer" style={{ position: 'relative' }}>
        <p>&copy; {new Date().getFullYear()} Dòng Họ Trần Đình. Lưu giữ cội nguồn.</p>
        <Link to="/login" style={{ position: 'absolute', bottom: '15px', right: '20px', color: 'rgba(255,255,255,0.5)' }}>
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0110 0v4"></path>
          </svg>
        </Link>
      </footer>
    </div>
  );
}

export default App;
