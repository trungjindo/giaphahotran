import React, { useContext, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AppContext } from '../store';
import AdminFamilyTree from '../components/AdminFamilyTree';

function AdminDashboard() {
  const { isAuthenticated, logout, financeData, setFinanceData, newsData, setNewsData } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState('family'); // Default to family management

  // Form states for Finance
  const emptyTx = { date: '', type: 'Thu', amount: '', description: '', person: '' };
  const [newTx, setNewTx] = useState(emptyTx);
  const [editingTxId, setEditingTxId] = useState(null);

  // Form states for News
  const emptyNews = { title: '', date: '', content: '', image: '' };
  const [newNews, setNewNews] = useState(emptyNews);
  const [editingNewsId, setEditingNewsId] = useState(null);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const formatCurrency = (amount) => amount.toLocaleString('vi-VN') + ' VNĐ';

  const handleSubmitTransaction = (e) => {
    e.preventDefault();
    if(!newTx.date || !newTx.amount || !newTx.description || !newTx.person) return alert("Vui lòng điền đủ thông tin");

    const amount = parseInt(newTx.amount);

    if (editingTxId) {
      setFinanceData(prev => {
        const oldTx = prev.transactions.find(tx => tx.id === editingTxId);
        const oldEffect = oldTx.type === 'Thu' ? oldTx.amount : -oldTx.amount;
        const newEffect = newTx.type === 'Thu' ? amount : -amount;
        return {
          ...prev,
          totalFund: prev.totalFund - oldEffect + newEffect,
          transactions: prev.transactions.map(tx => tx.id === editingTxId ? { ...tx, ...newTx, amount } : tx)
        };
      });
      setEditingTxId(null);
      alert("Cập nhật giao dịch thành công!");
    } else {
      const newTransaction = { id: Date.now(), ...newTx, amount };
      setFinanceData(prev => ({
        ...prev,
        totalFund: prev.totalFund + (newTx.type === 'Thu' ? amount : -amount),
        transactions: [newTransaction, ...prev.transactions]
      }));
      alert("Thêm giao dịch thành công!");
    }

    setNewTx(emptyTx);
  };

  const handleEditTransaction = (tx) => {
    setEditingTxId(tx.id);
    setNewTx({ date: tx.date, type: tx.type, amount: String(tx.amount), description: tx.description, person: tx.person });
  };

  const handleCancelEditTx = () => {
    setEditingTxId(null);
    setNewTx(emptyTx);
  };

  const handleDeleteTransaction = (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa giao dịch này không?")) return;
    setFinanceData(prev => {
      const tx = prev.transactions.find(t => t.id === id);
      const effect = tx.type === 'Thu' ? tx.amount : -tx.amount;
      return {
        ...prev,
        totalFund: prev.totalFund - effect,
        transactions: prev.transactions.filter(t => t.id !== id)
      };
    });
    if (editingTxId === id) handleCancelEditTx();
  };

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
            className={`btn-primary ${activeTab === 'family' ? '' : 'inactive-tab'}`}
            style={{ background: activeTab === 'family' ? 'var(--primary-color)' : 'transparent', color: activeTab === 'family' ? 'white' : 'var(--text-primary)', boxShadow: 'none' }}
          >
            Quản Lý Gia Phả
          </button>
          <button 
            onClick={() => setActiveTab('finance')} 
            className={`btn-primary ${activeTab === 'finance' ? '' : 'inactive-tab'}`}
            style={{ background: activeTab === 'finance' ? 'var(--primary-color)' : 'transparent', color: activeTab === 'finance' ? 'white' : 'var(--text-primary)', boxShadow: 'none' }}
          >
            Quản Lý Thu Chi
          </button>
          <button 
            onClick={() => setActiveTab('news')} 
            className={`btn-primary ${activeTab === 'news' ? '' : 'inactive-tab'}`}
            style={{ background: activeTab === 'news' ? 'var(--primary-color)' : 'transparent', color: activeTab === 'news' ? 'white' : 'var(--text-primary)', boxShadow: 'none' }}
          >
            Quản Lý Tin Tức
          </button>
        </div>
      </div>

      {activeTab === 'family' && (
        <AdminFamilyTree />
      )}

      {activeTab === 'finance' && (
        <>
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
              <div style={{ gridColumn: '1 / -1', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                {editingTxId && (
                  <button type="button" onClick={handleCancelEditTx} style={{ padding: '10px 20px', background: '#ccc', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Hủy Bỏ</button>
                )}
                <button type="submit" className="btn-primary">{editingTxId ? 'Cập Nhật' : 'Lưu Giao Dịch'}</button>
              </div>
            </form>
          </div>

          <div className="card">
            <h3>Lịch Sử Giao Dịch ({financeData.transactions.length})</h3>
            <div style={{ overflowX: 'auto', marginTop: '20px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                    <th style={{ padding: '15px' }}>Ngày</th>
                    <th style={{ padding: '15px' }}>Loại</th>
                    <th style={{ padding: '15px' }}>Số Tiền</th>
                    <th style={{ padding: '15px' }}>Nội Dung</th>
                    <th style={{ padding: '15px' }}>Người Giao Dịch</th>
                    <th style={{ padding: '15px' }}>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {financeData.transactions.map((tx) => (
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
                      <td style={{ padding: '15px', fontWeight: 'bold' }}>{formatCurrency(tx.amount)}</td>
                      <td style={{ padding: '15px' }}>{tx.description}</td>
                      <td style={{ padding: '15px' }}>{tx.person}</td>
                      <td style={{ padding: '15px' }}>
                        <button onClick={() => handleEditTransaction(tx)} style={{ padding: '5px 10px', background: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '5px' }}>Sửa</button>
                        <button onClick={() => handleDeleteTransaction(tx.id)} style={{ padding: '5px 10px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Xóa</button>
                      </td>
                    </tr>
                  ))}
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
                      const fd = new FormData();
                      fd.append('image', file);
                      fd.append('type', 'news');
                      try {
                        const res = await fetch('http://localhost:3001/api/upload', { method: 'POST', body: fd });
                        const data = await res.json();
                        if(data.success) {
                          setNewNews({...newNews, image: data.url});
                          alert('Tải ảnh thành công!');
                        } else {
                          alert('Lỗi: ' + data.error);
                        }
                      } catch(err) {
                        alert('Lỗi kết nối Server Tải ảnh!');
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
    </div>
  );
}

export default AdminDashboard;
