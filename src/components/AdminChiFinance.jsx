import React, { useContext, useEffect, useMemo, useState } from 'react';
import { AppContext } from '../store';
import { apiRequest, apiUpload } from '../api';
import { INCOME_CATEGORIES, formatCurrency, computeFinanceSummary, getAvailableYears, getYear } from '../utils/finance';

const MAX_UPLOAD_MB = 10;
const DEFAULT_FINANCE = { openingBalance: 0, transactions: [] };

// Thu chi riêng của 1 Chi — dùng lại đúng logic tính toán (danh mục, thực tế/dự kiến,
// minh chứng, cân đối theo năm) như thu chi dòng họ lớn, chỉ khác nguồn lưu dữ liệu.
const AdminChiFinance = ({ chiId, chiName }) => {
  const { token } = useContext(AppContext);
  const [financeData, setFinanceDataState] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const emptyTx = { date: '', type: 'Thu', category: INCOME_CATEGORIES[0], amount: '', description: '', person: '', proof: '', status: 'actual' };
  const [newTx, setNewTx] = useState(emptyTx);
  const [editingTxId, setEditingTxId] = useState(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [txYearFilter, setTxYearFilter] = useState('all');

  const loadFinance = () => {
    setIsLoading(true);
    apiRequest('chi_finance.php', { params: { chiId } })
      .then(data => setFinanceDataState(data ?? DEFAULT_FINANCE))
      .catch(err => setError(err.message))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { loadFinance(); }, [chiId]);

  const saveFinance = async (next) => {
    setFinanceDataState(next);
    try {
      await apiRequest('chi_finance.php', { method: 'POST', body: next, token, params: { chiId } });
    } catch (err) {
      alert(`Lỗi lưu dữ liệu lên máy chủ: ${err.message}\nVui lòng thử lại.`);
    }
  };

  const financeYears = useMemo(() => financeData ? getAvailableYears(financeData) : [new Date().getFullYear()], [financeData]);
  const [financeYear, setFinanceYear] = useState(null);
  const effectiveYear = financeYear ?? financeYears[0];
  const financeSummary = useMemo(
    () => computeFinanceSummary(financeData || DEFAULT_FINANCE, effectiveYear),
    [financeData, effectiveYear]
  );

  if (isLoading) return <p>Đang tải dữ liệu thu chi...</p>;
  if (error) return <p style={{ color: '#c0392b' }}>{error}</p>;

  const handleSubmitTransaction = (e) => {
    e.preventDefault();
    if (!newTx.date || !newTx.amount || !newTx.description || !newTx.person) return alert("Vui lòng điền đủ thông tin");

    const amount = parseInt(newTx.amount);
    const payload = { ...newTx, amount };
    if (payload.type !== 'Thu') delete payload.category;

    if (editingTxId) {
      saveFinance({
        ...financeData,
        transactions: financeData.transactions.map(tx => tx.id === editingTxId ? { ...tx, ...payload } : tx)
      });
      setEditingTxId(null);
      alert("Cập nhật giao dịch thành công!");
    } else {
      const newTransaction = { id: Date.now(), ...payload };
      saveFinance({ ...financeData, transactions: [newTransaction, ...financeData.transactions] });
      alert("Thêm giao dịch thành công!");
    }
    setNewTx(emptyTx);
  };

  const handleEditTransaction = (tx) => {
    setEditingTxId(tx.id);
    setNewTx({
      date: tx.date, type: tx.type, category: tx.category || INCOME_CATEGORIES[0],
      amount: String(tx.amount), description: tx.description, person: tx.person,
      proof: tx.proof || '', status: tx.status || 'actual'
    });
  };

  const handleCancelEditTx = () => {
    setEditingTxId(null);
    setNewTx(emptyTx);
  };

  const handleDeleteTransaction = (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa giao dịch này không?")) return;
    saveFinance({ ...financeData, transactions: financeData.transactions.filter(t => t.id !== id) });
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

  const visibleTransactions = (financeData.transactions || [])
    .filter(tx => txYearFilter === 'all' || getYear(tx.date) === txYearFilter)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  return (
    <div>
      <div className="card" style={{ marginBottom: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <h3 style={{ margin: 0 }}>Tổng Quan Ngân Sách — {chiName}</h3>
          <select value={effectiveYear} onChange={e => setFinanceYear(Number(e.target.value))} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
            {financeYears.map(y => <option key={y} value={y}>Năm {y}</option>)}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginTop: '20px' }}>
          <div style={{ background: 'var(--bg-color)', borderRadius: '8px', padding: '15px' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Tồn Quỹ Hiện Tại</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>{formatCurrency(financeSummary.currentFund)}</div>
          </div>
          <div style={{ background: 'var(--bg-color)', borderRadius: '8px', padding: '15px' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Thu Thực Tế ({effectiveYear})</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#27ae60' }}>{formatCurrency(financeSummary.totalActualIncome)}</div>
          </div>
          <div style={{ background: 'var(--bg-color)', borderRadius: '8px', padding: '15px' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Chi Thực Tế ({effectiveYear})</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#c0392b' }}>{formatCurrency(financeSummary.totalActualExpense)}</div>
          </div>
          <div style={{ background: 'var(--bg-color)', borderRadius: '8px', padding: '15px' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Dự Kiến Cuối Năm {effectiveYear}</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>{formatCurrency(financeSummary.projectedYearEndBalance)}</div>
          </div>
        </div>

        <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <label style={{ fontWeight: 'bold' }}>Tồn dư đầu kỳ (trước giao dịch đầu tiên):</label>
          <input
            type="number"
            value={financeData.openingBalance}
            onChange={e => saveFinance({ ...financeData, openingBalance: parseInt(e.target.value) || 0 })}
            style={{ padding: '8px 10px', borderRadius: '4px', border: '1px solid var(--border-color)', width: '200px' }}
          />
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
            <label style={{ display: 'block', marginBottom: '5px' }}>Minh Chứng Giao Dịch</label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input type="text" value={newTx.proof} onChange={e => setNewTx({...newTx, proof: e.target.value})} placeholder="URL ảnh hóa đơn/chứng từ..." style={{ flex: 1, minWidth: '200px', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
              <label style={{ background: 'var(--primary-color)', color: 'white', padding: '10px 15px', borderRadius: '4px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {uploadingProof ? 'Đang tải...' : 'Tải Ảnh Lên'}
                <input type="file" accept="image/*" style={{ display: 'none' }} disabled={uploadingProof} onChange={e => handleUploadProof(e.target.files[0])} />
              </label>
            </div>
            {newTx.proof && (
              <div style={{ marginTop: '10px' }}>
                <img src={newTx.proof} alt="Xem trước minh chứng" style={{ maxHeight: '120px', borderRadius: '6px', border: '1px solid var(--border-color)' }} />
              </div>
            )}
          </div>
          <div style={{ gridColumn: '1 / -1', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            {editingTxId && <button type="button" onClick={handleCancelEditTx} style={{ padding: '10px 20px', background: '#ccc', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Hủy Bỏ</button>}
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
                    <span style={{ padding: '4px 8px', borderRadius: '4px', background: tx.type === 'Thu' ? '#e8f5e9' : '#ffebee', color: tx.type === 'Thu' ? '#2e7d32' : '#c62828', fontWeight: '500' }}>{tx.type}</span>
                  </td>
                  <td style={{ padding: '15px', fontSize: '0.85rem' }}>
                    {tx.type === 'Thu' && <div>{tx.category || '—'}</div>}
                    <span style={{ color: tx.status === 'planned' ? '#d1a93e' : '#7f8c8d' }}>{tx.status === 'planned' ? 'Dự kiến' : 'Đã thực hiện'}</span>
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
    </div>
  );
};

export default AdminChiFinance;
