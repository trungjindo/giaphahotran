import React, { useContext, useState, useMemo, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { AppContext } from '../store';
import AdminFamilyTree from '../components/AdminFamilyTree';
import AdminChiManager from '../components/AdminChiManager';
import AdminUserManager from '../components/AdminUserManager';
import AdminActivities from '../components/AdminActivities';
import AdminChiFinance from '../components/AdminChiFinance';
import AdminBaiBien from '../components/AdminBaiBien';
import AdminTombs from '../components/AdminTombs';
import { INCOME_CATEGORIES, formatCurrency, computeFinanceSummary, getAvailableYears, getYear } from '../utils/finance';
import { apiUpload, apiRequest } from '../api';

const MAX_UPLOAD_MB = 10;

// Giao diện quản trị thu gọn dành cho chi_admin / dich_ton / bai_bien: chỉ thấy đúng
// 2 mục thuộc phạm vi chi của mình, không thấy gia phả/tin tức/chi khác trong dòng họ.
function ChiScopedDashboard({ chiId, fullName, role, yearAssigned, logout }) {
  const [chiName, setChiName] = useState('');
  const [scopedTab, setScopedTab] = useState('finance');
  const canManageBaiBien = role === 'chi_admin' || role === 'dich_ton';

  useEffect(() => {
    apiRequest('chi.php')
      .then(list => {
        const found = list.find(c => c.id === chiId);
        setChiName(found ? found.name : `Chi #${chiId}`);
      })
      .catch(() => setChiName(`Chi #${chiId}`));
  }, [chiId]);

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h2 style={{ marginBottom: '5px' }}>Quản Trị {chiName}</h2>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Đăng nhập với tư cách: {fullName}</p>
        </div>
        <button onClick={logout} className="btn-primary" style={{ background: '#576574' }}>Đăng Xuất</button>
      </div>

      {role === 'bai_bien' && (
        <div className="card" style={{ marginBottom: '30px', background: '#fff8e1', border: '1px solid #f1c40f' }}>
          {yearAssigned
            ? <p style={{ margin: 0 }}>Bạn đang được phân công làm <strong>bãi biện</strong> phụ trách năm <strong>{yearAssigned}</strong>. Bạn chỉ có thể ghi thu chi/hoạt động của năm này.</p>
            : <p style={{ margin: 0 }}>Bạn hiện chưa được phân công phụ trách năm nào. Vui lòng liên hệ chi trưởng/đích tôn để được phân công.</p>}
        </div>
      )}

      <div className="card" style={{ marginBottom: '30px', padding: '10px' }}>
        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto' }}>
          <button
            onClick={() => setScopedTab('finance')}
            className={`btn-primary ${scopedTab === 'finance' ? '' : 'inactive-tab'}`}
            style={{ background: scopedTab === 'finance' ? 'var(--primary-color)' : 'transparent', color: scopedTab === 'finance' ? 'white' : 'var(--text-primary)', boxShadow: 'none' }}
          >
            Thu Chi Của Chi
          </button>
          <button
            onClick={() => setScopedTab('activities')}
            className={`btn-primary ${scopedTab === 'activities' ? '' : 'inactive-tab'}`}
            style={{ background: scopedTab === 'activities' ? 'var(--primary-color)' : 'transparent', color: scopedTab === 'activities' ? 'white' : 'var(--text-primary)', boxShadow: 'none' }}
          >
            Hoạt Động Của Chi
          </button>
          {canManageBaiBien && (
            <button
              onClick={() => setScopedTab('baibien')}
              className={`btn-primary ${scopedTab === 'baibien' ? '' : 'inactive-tab'}`}
              style={{ background: scopedTab === 'baibien' ? 'var(--primary-color)' : 'transparent', color: scopedTab === 'baibien' ? 'white' : 'var(--text-primary)', boxShadow: 'none' }}
            >
              Bãi Biện
            </button>
          )}
        </div>
      </div>

      {scopedTab === 'finance' && <AdminChiFinance chiId={chiId} chiName={chiName} />}
      {scopedTab === 'activities' && <AdminActivities chiId={chiId} title={chiName} />}
      {scopedTab === 'baibien' && canManageBaiBien && <AdminBaiBien chiId={chiId} title={chiName} />}
    </div>
  );
}

function AdminDashboard() {
  const {
    isAuthenticated, logout, token, role, user, chiId,
    financeData, setFinanceData,
    newsData, setNewsData,
    aboutData, setAboutData,
    bannerData, setBannerData,
    galleryData, setGalleryData,
    contactAdminData, setContactAdminData
  } = useContext(AppContext);
  const isSuperAdmin = role === 'admin' || role === null; // role null: tài khoản cũ trước khi có hệ thống phân quyền
  const isChiScoped = !isSuperAdmin && !!chiId;
  const [activeTab, setActiveTab] = useState('family'); // Default to family management

  // Form states for Finance
  const emptyTx = { date: '', type: 'Thu', category: INCOME_CATEGORIES[0], amount: '', description: '', person: '', proof: '', status: 'actual' };
  const [newTx, setNewTx] = useState(emptyTx);
  const [editingTxId, setEditingTxId] = useState(null);
  const [uploadingProof, setUploadingProof] = useState(false);

  const financeYears = useMemo(() => getAvailableYears(financeData), [financeData]);
  const [financeYear, setFinanceYear] = useState(financeYears[0]);
  const financeSummary = useMemo(() => computeFinanceSummary(financeData, financeYear), [financeData, financeYear]);
  const [txYearFilter, setTxYearFilter] = useState('all');

  // Form states for News
  const emptyNews = { title: '', date: '', content: '', image: '' };
  const [newNews, setNewNews] = useState(emptyNews);
  const [editingNewsId, setEditingNewsId] = useState(null);

  // Form state for About (Giới Thiệu)
  const [aboutForm, setAboutForm] = useState(() => ({
    image: aboutData.image || '',
    content: aboutData.content || '',
    highlightsStr: (aboutData.highlights || []).map(h => `${h.year}|${h.text}`).join('\n')
  }));
  const [uploadingAboutImage, setUploadingAboutImage] = useState(false);

  // Form state cho Liên Hệ Quản Trị (hiển thị ở footer công khai)
  const [contactForm, setContactForm] = useState(() => ({
    name: contactAdminData.name || '',
    email: contactAdminData.email || '',
    phone: contactAdminData.phone || '',
    address: contactAdminData.address || ''
  }));

  // Form states for Banner (Trang chủ)
  const emptyBanner = { url: '', caption: '' };
  const [newBanner, setNewBanner] = useState(emptyBanner);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  // Form states for Gallery (Thư viện ảnh)
  const emptyGalleryPhoto = { url: '', caption: '', date: '' };
  const [newGalleryPhoto, setNewGalleryPhoto] = useState(emptyGalleryPhoto);
  const [uploadingGalleryPhoto, setUploadingGalleryPhoto] = useState(false);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (isChiScoped) {
    return <ChiScopedDashboard chiId={chiId} fullName={user?.fullName} role={role} yearAssigned={user?.yearAssigned} logout={logout} />;
  }

  const handleSubmitTransaction = (e) => {
    e.preventDefault();
    if(!newTx.date || !newTx.amount || !newTx.description || !newTx.person) return alert("Vui lòng điền đủ thông tin");

    const amount = parseInt(newTx.amount);
    const payload = { ...newTx, amount };
    if (payload.type !== 'Thu') delete payload.category;

    if (editingTxId) {
      setFinanceData(prev => ({
        ...prev,
        transactions: prev.transactions.map(tx => tx.id === editingTxId ? { ...tx, ...payload } : tx)
      }));
      setEditingTxId(null);
      alert("Cập nhật giao dịch thành công!");
    } else {
      const newTransaction = { id: Date.now(), ...payload };
      setFinanceData(prev => ({
        ...prev,
        transactions: [newTransaction, ...prev.transactions]
      }));
      alert("Thêm giao dịch thành công!");
    }

    setNewTx(emptyTx);
  };

  const handleEditTransaction = (tx) => {
    setEditingTxId(tx.id);
    setNewTx({
      date: tx.date,
      type: tx.type,
      category: tx.category || INCOME_CATEGORIES[0],
      amount: String(tx.amount),
      description: tx.description,
      person: tx.person,
      proof: tx.proof || '',
      status: tx.status || 'actual'
    });
  };

  const handleCancelEditTx = () => {
    setEditingTxId(null);
    setNewTx(emptyTx);
  };

  const handleDeleteTransaction = (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa giao dịch này không?")) return;
    setFinanceData(prev => ({
      ...prev,
      transactions: prev.transactions.filter(t => t.id !== id)
    }));
    if (editingTxId === id) handleCancelEditTx();
  };

  const handleUploadProof = async (file) => {
    if (!file) return;
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      return alert(`File quá lớn! Vui lòng chọn ảnh dưới ${MAX_UPLOAD_MB}MB.`);
    }
    setUploadingProof(true);
    try {
      const data = await apiUpload(file, 'receipt', token);
      if (data.success) {
        setNewTx(prev => ({ ...prev, proof: data.url }));
        alert('Tải minh chứng thành công!');
      } else {
        alert('Lỗi: ' + data.error);
      }
    } catch (err) {
      alert('Lỗi kết nối Server Tải ảnh: ' + err.message);
    } finally {
      setUploadingProof(false);
    }
  };

  const visibleTransactions = financeData.transactions
    .filter(tx => txYearFilter === 'all' || getYear(tx.date) === txYearFilter)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const handleSubmitNews = (e) => {
    e.preventDefault();
    if(!newNews.title || !newNews.date || !newNews.content) return alert("Vui lòng điền đủ thông tin");

    if (editingNewsId) {
      setNewsData(prev => prev.map(n => n.id === editingNewsId ? {
        ...n,
        ...newNews,
        image: newNews.image || 'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=800&q=80'
      } : n));
      setEditingNewsId(null);
      alert("Cập nhật tin tức thành công!");
    } else {
      const article = {
        id: Date.now(),
        ...newNews,
        image: newNews.image || 'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=800&q=80'
      };
      setNewsData(prev => [article, ...prev]);
      alert("Thêm tin tức thành công!");
    }

    setNewNews(emptyNews);
  };

  const handleEditNews = (article) => {
    setEditingNewsId(article.id);
    setNewNews({ title: article.title, date: article.date, content: article.content, image: article.image });
  };

  const handleCancelEditNews = () => {
    setEditingNewsId(null);
    setNewNews(emptyNews);
  };

  const handleDeleteNews = (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa bài tin tức này không?")) return;
    setNewsData(prev => prev.filter(n => n.id !== id));
    if (editingNewsId === id) handleCancelEditNews();
  };

  const uploadImage = async (file, type, setUploading) => {
    if (!file) return null;
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      alert(`File quá lớn! Vui lòng chọn ảnh dưới ${MAX_UPLOAD_MB}MB.`);
      return null;
    }
    setUploading(true);
    try {
      const data = await apiUpload(file, type, token);
      if (data.success) return data.url;
      alert('Lỗi: ' + data.error);
      return null;
    } catch (err) {
      alert('Lỗi kết nối Server Tải ảnh: ' + err.message);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSaveAbout = (e) => {
    e.preventDefault();
    const highlights = aboutForm.highlightsStr
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        const [year, ...rest] = line.split('|');
        return { year: (year || '').trim(), text: rest.join('|').trim() };
      })
      .filter(h => h.year || h.text);

    setAboutData({ image: aboutForm.image, content: aboutForm.content, highlights });
    alert('Đã lưu nội dung Giới Thiệu!');
  };

  const handleUploadAboutImage = async (file) => {
    const url = await uploadImage(file, 'about', setUploadingAboutImage);
    if (url) setAboutForm(prev => ({ ...prev, image: url }));
  };

  const handleSaveContact = (e) => {
    e.preventDefault();
    setContactAdminData({ ...contactForm });
    alert('Đã lưu thông tin Liên Hệ Quản Trị!');
  };

  const handleAddBanner = (e) => {
    e.preventDefault();
    if (!newBanner.url) return alert('Vui lòng chọn hoặc tải lên một ảnh!');
    setBannerData(prev => [...prev, { id: Date.now(), ...newBanner }]);
    setNewBanner(emptyBanner);
  };

  const handleUploadBanner = async (file) => {
    const url = await uploadImage(file, 'banner', setUploadingBanner);
    if (url) setNewBanner(prev => ({ ...prev, url }));
  };

  const handleDeleteBanner = (id) => {
    if (!window.confirm('Xóa ảnh banner này khỏi trang chủ?')) return;
    setBannerData(prev => prev.filter(b => b.id !== id));
  };

  const handleAddGalleryPhoto = (e) => {
    e.preventDefault();
    if (!newGalleryPhoto.url) return alert('Vui lòng chọn hoặc tải lên một ảnh!');
    setGalleryData(prev => [{ id: Date.now(), ...newGalleryPhoto }, ...prev]);
    setNewGalleryPhoto(emptyGalleryPhoto);
  };

  const handleUploadGalleryPhoto = async (file) => {
    const url = await uploadImage(file, 'gallery', setUploadingGalleryPhoto);
    if (url) setNewGalleryPhoto(prev => ({ ...prev, url }));
  };

  const handleDeleteGalleryPhoto = (id) => {
    if (!window.confirm('Xóa ảnh này khỏi thư viện?')) return;
    setGalleryData(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h2>Khu Vực Quản Trị</h2>
        <button onClick={logout} className="btn-primary" style={{ background: '#576574' }}>Đăng Xuất</button>
      </div>

      <div className="card" style={{ marginBottom: '30px', padding: '10px' }}>
        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto' }}>
          <button 
            onClick={() => setActiveTab('family')} 
            className={`btn-primary tab-btn ${activeTab === 'family' ? '' : 'inactive-tab'}`}
            style={{ background: activeTab === 'family' ? 'var(--primary-color)' : 'transparent', color: activeTab === 'family' ? 'white' : 'var(--text-primary)', boxShadow: 'none' }}
          >
            Quản Lý Gia Phả
          </button>
          <button 
            onClick={() => setActiveTab('finance')} 
            className={`btn-primary tab-btn ${activeTab === 'finance' ? '' : 'inactive-tab'}`}
            style={{ background: activeTab === 'finance' ? 'var(--primary-color)' : 'transparent', color: activeTab === 'finance' ? 'white' : 'var(--text-primary)', boxShadow: 'none' }}
          >
            Quản Lý Thu Chi
          </button>
          <button
            onClick={() => setActiveTab('news')}
            className={`btn-primary tab-btn ${activeTab === 'news' ? '' : 'inactive-tab'}`}
            style={{ background: activeTab === 'news' ? 'var(--primary-color)' : 'transparent', color: activeTab === 'news' ? 'white' : 'var(--text-primary)', boxShadow: 'none' }}
          >
            Quản Lý Tin Tức
          </button>
          <button
            onClick={() => setActiveTab('about')}
            className={`btn-primary tab-btn ${activeTab === 'about' ? '' : 'inactive-tab'}`}
            style={{ background: activeTab === 'about' ? 'var(--primary-color)' : 'transparent', color: activeTab === 'about' ? 'white' : 'var(--text-primary)', boxShadow: 'none' }}
          >
            Giới Thiệu
          </button>
          <button
            onClick={() => setActiveTab('media')}
            className={`btn-primary tab-btn ${activeTab === 'media' ? '' : 'inactive-tab'}`}
            style={{ background: activeTab === 'media' ? 'var(--primary-color)' : 'transparent', color: activeTab === 'media' ? 'white' : 'var(--text-primary)', boxShadow: 'none' }}
          >
            Banner & Thư Viện Ảnh
          </button>
          {isSuperAdmin && (
            <>
              <button
                onClick={() => setActiveTab('activities')}
                className={`btn-primary tab-btn ${activeTab === 'activities' ? '' : 'inactive-tab'}`}
                style={{ background: activeTab === 'activities' ? 'var(--primary-color)' : 'transparent', color: activeTab === 'activities' ? 'white' : 'var(--text-primary)', boxShadow: 'none' }}
              >
                Hoạt Động Dòng Họ
              </button>
              <button
                onClick={() => setActiveTab('baibien')}
                className={`btn-primary tab-btn ${activeTab === 'baibien' ? '' : 'inactive-tab'}`}
                style={{ background: activeTab === 'baibien' ? 'var(--primary-color)' : 'transparent', color: activeTab === 'baibien' ? 'white' : 'var(--text-primary)', boxShadow: 'none' }}
              >
                Bãi Biện Dòng Họ
              </button>
              <button
                onClick={() => setActiveTab('tombs')}
                className={`btn-primary tab-btn ${activeTab === 'tombs' ? '' : 'inactive-tab'}`}
                style={{ background: activeTab === 'tombs' ? 'var(--primary-color)' : 'transparent', color: activeTab === 'tombs' ? 'white' : 'var(--text-primary)', boxShadow: 'none' }}
              >
                Bản Đồ Lăng Mộ
              </button>
              <button
                onClick={() => setActiveTab('chi')}
                className={`btn-primary tab-btn ${activeTab === 'chi' ? '' : 'inactive-tab'}`}
                style={{ background: activeTab === 'chi' ? 'var(--primary-color)' : 'transparent', color: activeTab === 'chi' ? 'white' : 'var(--text-primary)', boxShadow: 'none' }}
              >
                Quản Lý Chi
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`btn-primary tab-btn ${activeTab === 'users' ? '' : 'inactive-tab'}`}
                style={{ background: activeTab === 'users' ? 'var(--primary-color)' : 'transparent', color: activeTab === 'users' ? 'white' : 'var(--text-primary)', boxShadow: 'none' }}
              >
                Quản Lý Tài Khoản
              </button>
            </>
          )}
        </div>
      </div>

      {activeTab === 'family' && (
        <AdminFamilyTree />
      )}

      {activeTab === 'finance' && (
        <>
          <div className="card" style={{ marginBottom: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <h3 style={{ margin: 0 }}>Tổng Quan Ngân Sách</h3>
              <select value={financeYear} onChange={e => setFinanceYear(Number(e.target.value))} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                {financeYears.map(y => <option key={y} value={y}>Năm {y}</option>)}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginTop: '20px' }}>
              <div style={{ background: 'var(--bg-color)', borderRadius: '8px', padding: '15px' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Tồn Quỹ Hiện Tại</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>{formatCurrency(financeSummary.currentFund)}</div>
              </div>
              <div style={{ background: 'var(--bg-color)', borderRadius: '8px', padding: '15px' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Thu Thực Tế ({financeYear})</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#27ae60' }}>{formatCurrency(financeSummary.totalActualIncome)}</div>
              </div>
              <div style={{ background: 'var(--bg-color)', borderRadius: '8px', padding: '15px' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Chi Thực Tế ({financeYear})</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#c0392b' }}>{formatCurrency(financeSummary.totalActualExpense)}</div>
              </div>
              <div style={{ background: 'var(--bg-color)', borderRadius: '8px', padding: '15px' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Dự Kiến Cuối Năm {financeYear}</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>{formatCurrency(financeSummary.projectedYearEndBalance)}</div>
              </div>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <label style={{ fontWeight: 'bold' }}>Tồn dư đầu kỳ (trước giao dịch đầu tiên):</label>
              <input
                type="number"
                value={financeData.openingBalance}
                onChange={e => setFinanceData(prev => ({ ...prev, openingBalance: parseInt(e.target.value) || 0 }))}
                style={{ padding: '8px 10px', borderRadius: '4px', border: '1px solid var(--border-color)', width: '200px' }}
              />
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Dùng làm điểm khởi đầu cộng dồn qua các năm</span>
            </div>
          </div>

          <div className="card" style={{ marginBottom: '30px' }}>
            <h3>{editingTxId ? 'Cập Nhật Giao Dịch' : 'Thêm Giao Dịch Mới'}</h3>
            <form onSubmit={handleSubmitTransaction} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Loại Giao Dịch</label>
                <select value={newTx.type} onChange={e => setNewTx({...newTx, type: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                  <option value="Thu">Thu</option>
                  <option value="Chi">Chi</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Trạng Thái</label>
                <select value={newTx.status} onChange={e => setNewTx({...newTx, status: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                  <option value="actual">Đã thực hiện</option>
                  <option value="planned">Dự kiến (sắp tới)</option>
                </select>
              </div>

              {newTx.type === 'Thu' && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Danh Mục Thu</label>
                  <select value={newTx.category} onChange={e => setNewTx({...newTx, category: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                    {INCOME_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Ngày</label>
                <input type="date" value={newTx.date} onChange={e => setNewTx({...newTx, date: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Số Tiền (VNĐ)</label>
                <input type="number" value={newTx.amount} onChange={e => setNewTx({...newTx, amount: e.target.value})} placeholder="VD: 1000000" style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Người Giao Dịch</label>
                <input type="text" value={newTx.person} onChange={e => setNewTx({...newTx, person: e.target.value})} placeholder="Tên người nộp/nhận" style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Nội Dung Chi Tiết</label>
                <input type="text" value={newTx.description} onChange={e => setNewTx({...newTx, description: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Minh Chứng Giao Dịch (hóa đơn, bill, ảnh chuyển khoản... nếu có)</label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input type="text" value={newTx.proof} onChange={e => setNewTx({...newTx, proof: e.target.value})} placeholder="URL ảnh hóa đơn/chứng từ..." style={{ flex: 1, minWidth: '200px', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
                  <label style={{ background: 'var(--primary-color)', color: 'white', padding: '10px 15px', borderRadius: '4px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    {uploadingProof ? 'Đang tải...' : 'Tải Ảnh Lên'}
                    <input type="file" accept="image/*" style={{ display: 'none' }} disabled={uploadingProof} onChange={e => handleUploadProof(e.target.files[0])} />
                  </label>
                </div>
                <small style={{ color: 'var(--text-secondary)' }}>Ảnh sẽ được lưu vào thư mục lưu trữ trên server. Tối đa {MAX_UPLOAD_MB}MB mỗi lần tải lên.</small>
                {newTx.proof && (
                  <div style={{ marginTop: '10px' }}>
                    <img src={newTx.proof} alt="Xem trước minh chứng" style={{ maxHeight: '120px', borderRadius: '6px', border: '1px solid var(--border-color)' }} />
                  </div>
                )}
              </div>

              <div style={{ gridColumn: '1 / -1', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                {editingTxId && (
                  <button type="button" onClick={handleCancelEditTx} style={{ padding: '10px 20px', background: '#ccc', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Hủy Bỏ</button>
                )}
                <button type="submit" className="btn-primary">{editingTxId ? 'Cập Nhật' : 'Lưu Giao Dịch'}</button>
              </div>
            </form>
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <h3 style={{ margin: 0 }}>Lịch Sử Giao Dịch ({visibleTransactions.length})</h3>
              <select value={txYearFilter} onChange={e => setTxYearFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <option value="all">Tất cả các năm</option>
                {financeYears.map(y => <option key={y} value={y}>Năm {y}</option>)}
              </select>
            </div>
            <div style={{ overflowX: 'auto', marginTop: '20px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                    <th style={{ padding: '15px' }}>Ngày</th>
                    <th style={{ padding: '15px' }}>Loại</th>
                    <th style={{ padding: '15px' }}>Danh mục / Trạng thái</th>
                    <th style={{ padding: '15px' }}>Số Tiền</th>
                    <th style={{ padding: '15px' }}>Nội Dung</th>
                    <th style={{ padding: '15px' }}>Người Giao Dịch</th>
                    <th style={{ padding: '15px' }}>Chứng Từ</th>
                    <th style={{ padding: '15px' }}>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleTransactions.map((tx) => (
                    <tr key={tx.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '15px' }}>{tx.date}</td>
                      <td style={{ padding: '15px' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          background: tx.type === 'Thu' ? '#e8f5e9' : '#ffebee',
                          color: tx.type === 'Thu' ? '#2e7d32' : '#c62828',
                          fontWeight: '500'
                        }}>
                          {tx.type}
                        </span>
                      </td>
                      <td style={{ padding: '15px', fontSize: '0.85rem' }}>
                        {tx.type === 'Thu' && <div>{tx.category || '—'}</div>}
                        <span style={{ color: tx.status === 'planned' ? '#d1a93e' : '#7f8c8d' }}>
                          {tx.status === 'planned' ? 'Dự kiến' : 'Đã thực hiện'}
                        </span>
                      </td>
                      <td style={{ padding: '15px', fontWeight: 'bold' }}>{formatCurrency(tx.amount)}</td>
                      <td style={{ padding: '15px' }}>{tx.description}</td>
                      <td style={{ padding: '15px' }}>{tx.person}</td>
                      <td style={{ padding: '15px' }}>
                        {tx.proof ? (
                          <a href={tx.proof} target="_blank" rel="noopener noreferrer" title="Xem minh chứng cỡ đầy đủ">
                            <img src={tx.proof} alt="Minh chứng" style={{ width: '44px', height: '44px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
                          </a>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '15px' }}>
                        <button onClick={() => handleEditTransaction(tx)} style={{ padding: '5px 10px', background: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '5px' }}>Sửa</button>
                        <button onClick={() => handleDeleteTransaction(tx.id)} style={{ padding: '5px 10px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Xóa</button>
                      </td>
                    </tr>
                  ))}
                  {visibleTransactions.length === 0 && (
                    <tr><td colSpan={8} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>Không có giao dịch nào</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'news' && (
        <>
        <div className="card" style={{ marginBottom: '30px' }}>
          <h3>{editingNewsId ? 'Cập Nhật Tin Tức' : 'Thêm Tin Tức Mới'}</h3>
          <form onSubmit={handleSubmitNews} style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>Tiêu Đề</label>
              <input type="text" value={newNews.title} onChange={e => setNewNews({...newNews, title: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Ngày</label>
                <input type="date" value={newNews.date} onChange={e => setNewNews({...newNews, date: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Hình Ảnh Sự Kiện</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input type="text" value={newNews.image} onChange={e => setNewNews({...newNews, image: e.target.value})} placeholder="URL ảnh..." style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
                  <label style={{ background: 'var(--primary-color)', color: 'white', padding: '10px 15px', borderRadius: '4px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    Tải Ảnh Lên
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async (e) => {
                      const file = e.target.files[0];
                      if(!file) return;
                      try {
                        const data = await apiUpload(file, 'news', token);
                        if(data.success) {
                          setNewNews({...newNews, image: data.url});
                          alert('Tải ảnh thành công!');
                        } else {
                          alert('Lỗi: ' + data.error);
                        }
                      } catch(err) {
                        alert('Lỗi kết nối Server Tải ảnh: ' + err.message);
                      }
                    }} />
                  </label>
                </div>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>Nội Dung</label>
              <textarea value={newNews.content} onChange={e => setNewNews({...newNews, content: e.target.value})} rows="5" style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }}></textarea>
            </div>
            <div style={{ textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              {editingNewsId && (
                <button type="button" onClick={handleCancelEditNews} style={{ padding: '10px 20px', background: '#ccc', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Hủy Bỏ</button>
              )}
              <button type="submit" className="btn-primary">{editingNewsId ? 'Cập Nhật' : 'Lưu Tin Tức'}</button>
            </div>
          </form>
        </div>

        <div className="card">
          <h3>Danh Sách Tin Tức ({newsData.length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
            {newsData.map(article => (
              <div key={article.id} style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                <img src={article.image} alt={article.title} style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 'bold' }}>{article.title}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{article.date}</div>
                </div>
                <div style={{ flexShrink: 0 }}>
                  <button onClick={() => handleEditNews(article)} style={{ padding: '5px 10px', background: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '5px' }}>Sửa</button>
                  <button onClick={() => handleDeleteNews(article.id)} style={{ padding: '5px 10px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Xóa</button>
                </div>
              </div>
            ))}
          </div>
        </div>
        </>
      )}

      {activeTab === 'about' && (
        <div className="card" style={{ border: '2px solid var(--primary-light)' }}>
          <h3>📇 Liên Hệ Quản Trị Website</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '5px' }}>
            Hiển thị ở cuối trang để con cháu liên hệ khi cần hỗ trợ hoặc báo lỗi website. Để trống trường nào thì dòng đó (và icon tương ứng) sẽ tự ẩn.
          </p>
          <form onSubmit={handleSaveContact} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Họ Tên Quản Trị</label>
              <input type="text" className="input-control" style={{ width: '100%' }} value={contactForm.name} onChange={e => setContactForm({ ...contactForm, name: e.target.value })} placeholder="VD: Trần Đình Trung" />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Email Liên Hệ</label>
              <input type="email" className="input-control" style={{ width: '100%' }} value={contactForm.email} onChange={e => setContactForm({ ...contactForm, email: e.target.value })} placeholder="VD: contact@hotrandinh.com" />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Số Điện Thoại</label>
              <input type="text" className="input-control" style={{ width: '100%' }} value={contactForm.phone} onChange={e => setContactForm({ ...contactForm, phone: e.target.value })} placeholder="VD: 0912345678" />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Địa Chỉ Liên Hệ (tùy chọn)</label>
              <input type="text" className="input-control" style={{ width: '100%' }} value={contactForm.address} onChange={e => setContactForm({ ...contactForm, address: e.target.value })} placeholder="VD: Nam Định" />
            </div>
            <div style={{ gridColumn: '1 / -1', textAlign: 'right' }}>
              <button type="submit" className="btn-primary">Lưu Thông Tin Liên Hệ</button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'about' && (
        <div className="card" style={{ marginTop: '30px' }}>
          <h3>Nội Dung Trang Giới Thiệu</h3>
          <form onSubmit={handleSaveAbout} style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Ảnh Đầu Trang</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input type="text" value={aboutForm.image} onChange={e => setAboutForm({...aboutForm, image: e.target.value})} placeholder="URL ảnh..." style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
                <label style={{ background: 'var(--primary-color)', color: 'white', padding: '10px 15px', borderRadius: '4px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {uploadingAboutImage ? 'Đang tải...' : 'Tải Ảnh Lên'}
                  <input type="file" accept="image/*" style={{ display: 'none' }} disabled={uploadingAboutImage} onChange={e => handleUploadAboutImage(e.target.files[0])} />
                </label>
              </div>
              {aboutForm.image && (
                <img src={aboutForm.image} alt="Xem trước" style={{ marginTop: '10px', maxHeight: '150px', borderRadius: '6px', border: '1px solid var(--border-color)' }} />
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Nội Dung Giới Thiệu (mỗi dòng trống là 1 đoạn văn)</label>
              <textarea rows="8" value={aboutForm.content} onChange={e => setAboutForm({...aboutForm, content: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }}></textarea>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Các Mốc Son Lịch Sử (mỗi dòng: Năm|Nội dung)</label>
              <textarea
                rows="5"
                value={aboutForm.highlightsStr}
                onChange={e => setAboutForm({...aboutForm, highlightsStr: e.target.value})}
                placeholder={'VD:\n1850|Cụ Tổ lập nghiệp\n1992|Lập ban liên lạc dòng họ'}
                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
              ></textarea>
            </div>

            <div style={{ textAlign: 'right' }}>
              <button type="submit" className="btn-primary">Lưu Nội Dung</button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'media' && (
        <>
          <div className="card" style={{ marginBottom: '30px' }}>
            <h3>Banner Trang Chủ (Slideshow)</h3>
            <form onSubmit={handleAddBanner} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <input type="text" value={newBanner.url} onChange={e => setNewBanner({...newBanner, url: e.target.value})} placeholder="URL ảnh..." style={{ flex: 1, minWidth: '200px', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
                <label style={{ background: 'var(--primary-color)', color: 'white', padding: '10px 15px', borderRadius: '4px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {uploadingBanner ? 'Đang tải...' : 'Tải Ảnh Lên'}
                  <input type="file" accept="image/*" style={{ display: 'none' }} disabled={uploadingBanner} onChange={e => handleUploadBanner(e.target.files[0])} />
                </label>
              </div>
              <input type="text" value={newBanner.caption} onChange={e => setNewBanner({...newBanner, caption: e.target.value})} placeholder="Chú thích ảnh (tùy chọn)..." style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
              {newBanner.url && <img src={newBanner.url} alt="Xem trước" style={{ maxHeight: '120px', borderRadius: '6px', border: '1px solid var(--border-color)' }} />}
              <div style={{ textAlign: 'right' }}>
                <button type="submit" className="btn-primary">Thêm Vào Banner</button>
              </div>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '25px' }}>
              {bannerData.map(b => (
                <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '10px', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                  <img src={b.url} alt={b.caption} style={{ width: '90px', height: '55px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>{b.caption || <em style={{ color: 'var(--text-secondary)' }}>Không có chú thích</em>}</div>
                  <button onClick={() => handleDeleteBanner(b.id)} style={{ padding: '5px 10px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Xóa</button>
                </div>
              ))}
              {bannerData.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>Chưa có ảnh banner nào.</p>}
            </div>
          </div>

          <div className="card">
            <h3>Thư Viện Ảnh</h3>
            <form onSubmit={handleAddGalleryPhoto} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <input type="text" value={newGalleryPhoto.url} onChange={e => setNewGalleryPhoto({...newGalleryPhoto, url: e.target.value})} placeholder="URL ảnh..." style={{ flex: 1, minWidth: '200px', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
                <label style={{ background: 'var(--primary-color)', color: 'white', padding: '10px 15px', borderRadius: '4px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {uploadingGalleryPhoto ? 'Đang tải...' : 'Tải Ảnh Lên'}
                  <input type="file" accept="image/*" style={{ display: 'none' }} disabled={uploadingGalleryPhoto} onChange={e => handleUploadGalleryPhoto(e.target.files[0])} />
                </label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <input type="text" value={newGalleryPhoto.caption} onChange={e => setNewGalleryPhoto({...newGalleryPhoto, caption: e.target.value})} placeholder="Chú thích ảnh..." style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
                <input type="date" value={newGalleryPhoto.date} onChange={e => setNewGalleryPhoto({...newGalleryPhoto, date: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
              </div>
              {newGalleryPhoto.url && <img src={newGalleryPhoto.url} alt="Xem trước" style={{ maxHeight: '120px', borderRadius: '6px', border: '1px solid var(--border-color)' }} />}
              <div style={{ textAlign: 'right' }}>
                <button type="submit" className="btn-primary">Thêm Vào Thư Viện</button>
              </div>
            </form>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '15px', marginTop: '25px' }}>
              {galleryData.map(photo => (
                <div key={photo.id} style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                  <img src={photo.url} alt={photo.caption} style={{ width: '100%', height: '110px', objectFit: 'cover' }} />
                  <div style={{ padding: '8px' }}>
                    <div style={{ fontSize: '0.85rem' }}>{photo.caption || '—'}</div>
                    <button onClick={() => handleDeleteGalleryPhoto(photo.id)} style={{ marginTop: '6px', width: '100%', padding: '4px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>Xóa</button>
                  </div>
                </div>
              ))}
              {galleryData.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>Chưa có ảnh nào trong thư viện.</p>}
            </div>
          </div>
        </>
      )}

      {activeTab === 'activities' && isSuperAdmin && <AdminActivities chiId={null} title="Dòng Họ" />}
      {activeTab === 'baibien' && isSuperAdmin && <AdminBaiBien chiId={null} title="Dòng Họ" />}
      {activeTab === 'tombs' && isSuperAdmin && <AdminTombs />}
      {activeTab === 'chi' && isSuperAdmin && <AdminChiManager />}
      {activeTab === 'users' && isSuperAdmin && <AdminUserManager />}
    </div>
  );
}

export default AdminDashboard;
