import React, { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../api';
import { computeFinanceSummary, formatCurrency, getAvailableYears } from '../utils/finance';

const DEFAULT_FINANCE = { openingBalance: 0, transactions: [] };

function ChiPublic() {
  const [chiList, setChiList] = useState([]);
  const [selectedChiId, setSelectedChiId] = useState(null);
  const [financeData, setFinanceData] = useState(null);
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiRequest('chi.php')
      .then(list => {
        setChiList(list);
        if (list.length > 0) setSelectedChiId(list[0].id);
        else setIsLoading(false);
      })
      .catch(err => { setError(err.message); setIsLoading(false); });
  }, []);

  useEffect(() => {
    if (selectedChiId === null) return;
    setIsLoading(true);
    Promise.all([
      apiRequest('chi_finance.php', { params: { chiId: selectedChiId } }),
      apiRequest('activities.php', { params: { chiId: selectedChiId } })
    ])
      .then(([finance, acts]) => {
        setFinanceData(finance ?? DEFAULT_FINANCE);
        setActivities(acts);
      })
      .catch(err => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [selectedChiId]);

  const years = useMemo(() => financeData ? getAvailableYears(financeData) : [new Date().getFullYear()], [financeData]);
  const [year, setYear] = useState(null);
  const effectiveYear = year ?? years[0];
  const summary = useMemo(
    () => computeFinanceSummary(financeData || DEFAULT_FINANCE, effectiveYear),
    [financeData, effectiveYear]
  );
  const selectedChi = chiList.find(c => c.id === selectedChiId);
  const activitiesForYear = activities.filter(a => a.year === effectiveYear);

  if (chiList.length === 0 && !isLoading) {
    return (
      <div className="container">
        <div className="section-header">
          <span className="section-eyebrow">Dòng Họ Trần Đình</span>
          <h2>Các Chi Trong Dòng Họ</h2>
        </div>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Dòng họ chưa thiết lập chi nào.</p>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="section-header">
        <span className="section-eyebrow">Dòng Họ Trần Đình</span>
        <h2>Các Chi Trong Dòng Họ</h2>
        <p>Hoạt động và thu chi riêng của từng chi, công khai minh bạch với toàn thể con cháu.</p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '30px', flexWrap: 'wrap' }}>
        <select className="select-control" value={selectedChiId ?? ''} onChange={e => setSelectedChiId(Number(e.target.value))}>
          {chiList.map(c => <option key={c.id} value={c.id}>{c.name} ({c.memberCount} thành viên)</option>)}
        </select>
        {years.length > 0 && (
          <select className="select-control" value={effectiveYear} onChange={e => setYear(Number(e.target.value))}>
            {years.map(y => <option key={y} value={y}>Năm {y}</option>)}
          </select>
        )}
      </div>

      {error && <p style={{ color: '#c0392b', textAlign: 'center' }}>{error}</p>}
      {isLoading ? <p style={{ textAlign: 'center' }}>Đang tải...</p> : selectedChi && (
        <>
          <div className="card" style={{ marginBottom: '30px' }}>
            <h3>{selectedChi.name}</h3>
            <p style={{ color: 'var(--text-secondary)' }}>
              Gốc chi: <strong>{selectedChi.rootMemberName}</strong> · {selectedChi.memberCount} thành viên
              {selectedChi.description && <> · {selectedChi.description}</>}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
            <div className="card">
              <h4 style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Tồn Quỹ Hiện Tại</h4>
              <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: 'var(--primary-color)', marginTop: '8px' }}>{formatCurrency(summary.currentFund)}</div>
            </div>
            <div className="card">
              <h4 style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Thu Thực Tế ({effectiveYear})</h4>
              <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#1E8449', marginTop: '8px' }}>{formatCurrency(summary.totalActualIncome)}</div>
            </div>
            <div className="card">
              <h4 style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Chi Thực Tế ({effectiveYear})</h4>
              <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#B03A3A', marginTop: '8px' }}>{formatCurrency(summary.totalActualExpense)}</div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: '30px' }}>
            <h3>Hoạt Động Năm {effectiveYear}</h3>
            {activitiesForYear.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', marginTop: '15px' }}>Chưa có hoạt động nào được ghi nhận trong năm này.</p>
            ) : (
              <ul style={{ marginTop: '15px', paddingLeft: '20px', lineHeight: '1.9' }}>
                {activitiesForYear.map(a => (
                  <li key={a.id}>
                    <strong>{a.title}</strong>{a.description && <> — {a.description}</>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card">
            <h3>Lịch Sử Giao Dịch Đã Thực Hiện ({effectiveYear})</h3>
            <div style={{ overflowX: 'auto', marginTop: '20px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                    <th style={{ padding: '12px' }}>Ngày</th>
                    <th style={{ padding: '12px' }}>Loại</th>
                    <th style={{ padding: '12px' }}>Số Tiền</th>
                    <th style={{ padding: '12px' }}>Nội Dung</th>
                    <th style={{ padding: '12px' }}>Người Giao Dịch</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.actualIncomeList.concat(summary.actualExpenseList)
                    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
                    .map(tx => (
                      <tr key={tx.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '12px' }}>{tx.date}</td>
                        <td style={{ padding: '12px' }}>
                          <span className={`badge ${tx.type === 'Thu' ? 'badge-green' : 'badge-red'}`}>{tx.type}</span>
                        </td>
                        <td style={{ padding: '12px', fontWeight: 'bold' }}>{formatCurrency(tx.amount)}</td>
                        <td style={{ padding: '12px' }}>{tx.description}</td>
                        <td style={{ padding: '12px' }}>{tx.person}</td>
                      </tr>
                    ))}
                  {summary.actualIncomeList.length === 0 && summary.actualExpenseList.length === 0 && (
                    <tr><td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>Chưa có giao dịch nào trong năm {effectiveYear}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ChiPublic;
