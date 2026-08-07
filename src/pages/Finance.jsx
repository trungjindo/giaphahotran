import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from '../store';
import { computeFinanceSummary, getAvailableYears, formatCurrency } from '../utils/finance';

const SummaryCard = ({ title, value, subtitle, color, background }) => (
  <div className="card" style={{ background: background || 'var(--surface-color)' }}>
    <h4 style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{title}</h4>
    <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: color || 'var(--primary-color)', margin: '8px 0 4px' }}>
      {value}
    </div>
    {subtitle && <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{subtitle}</div>}
  </div>
);

const TxRow = ({ tx }) => (
  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
    <td style={{ padding: '12px' }}>{tx.date}</td>
    <td style={{ padding: '12px' }}>
      <span style={{
        padding: '4px 8px', borderRadius: '4px',
        background: tx.type === 'Thu' ? '#e8f5e9' : '#ffebee',
        color: tx.type === 'Thu' ? '#2e7d32' : '#c62828',
        fontWeight: '500'
      }}>
        {tx.type}
      </span>
    </td>
    <td style={{ padding: '12px' }}>{tx.type === 'Thu' ? (tx.category || '—') : '—'}</td>
    <td style={{ padding: '12px', fontWeight: 'bold' }}>{formatCurrency(tx.amount)}</td>
    <td style={{ padding: '12px' }}>{tx.description}</td>
    <td style={{ padding: '12px' }}>{tx.person}</td>
    <td style={{ padding: '12px' }}>
      {tx.proof ? (
        <a href={tx.proof} target="_blank" rel="noopener noreferrer" title="Xem minh chứng cỡ đầy đủ">
          <img src={tx.proof} alt="Minh chứng" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
        </a>
      ) : '—'}
    </td>
  </tr>
);

function Finance() {
  const { financeData } = useContext(AppContext);
  const years = useMemo(() => getAvailableYears(financeData), [financeData]);
  const [year, setYear] = useState(years[0]);
  const summary = useMemo(() => computeFinanceSummary(financeData, year), [financeData, year]);

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginBottom: '40px', flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0 }}>Quản Lý Thu Chi</h2>
        <select value={year} onChange={e => setYear(Number(e.target.value))} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
          {years.map(y => <option key={y} value={y}>Năm {y}</option>)}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '20px' }}>
        <SummaryCard
          title="Tồn Quỹ Hiện Tại"
          value={formatCurrency(summary.currentFund)}
          subtitle="Tồn dư đầu kỳ + thu thực tế − chi thực tế"
          background="linear-gradient(135deg, var(--secondary-color), var(--secondary-light))"
          color="#000"
        />
        <SummaryCard title={`Tổng Thu Thực Tế (${year})`} value={formatCurrency(summary.totalActualIncome)} color="#27ae60" />
        <SummaryCard title={`Tổng Chi Thực Tế (${year})`} value={formatCurrency(summary.totalActualExpense)} color="#c0392b" />
        <SummaryCard
          title={`Dự Kiến Cân Đối Cuối Năm ${year}`}
          value={formatCurrency(summary.projectedYearEndBalance)}
          subtitle={`Thu dự kiến cả năm ${formatCurrency(summary.projectedYearEndIncome)} − Chi dự kiến cả năm ${formatCurrency(summary.projectedYearEndExpense)}`}
        />
      </div>

      <div className="card" style={{ marginBottom: '20px' }}>
        <h3>Cơ Cấu Nguồn Thu ({year})</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px', marginTop: '15px' }}>
          {Object.entries(summary.incomeByCategory).map(([cat, amount]) => (
            <div key={cat} style={{ background: 'var(--bg-color)', borderRadius: '8px', padding: '15px' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{cat}</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#27ae60' }}>{formatCurrency(amount)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginBottom: '40px', background: 'linear-gradient(135deg, var(--primary-color), var(--primary-light))', color: 'white' }}>
        <h3 style={{ color: 'white' }}>Dự Trù Ngân Sách Năm {year + 1}</h3>
        <p style={{ color: 'rgba(255,255,255,0.9)', marginTop: '10px' }}>
          Tồn quỹ dự kiến chuyển sang năm {year + 1} (tồn dư đầu kỳ cho năm tiếp theo), tính từ tồn quỹ hiện tại cộng các khoản thu/chi dự kiến còn lại trong năm {year}:
        </p>
        <div style={{ fontSize: '2.2rem', fontWeight: 'bold', marginTop: '10px' }}>
          {formatCurrency(summary.projectedYearEndBalance)}
        </div>
      </div>

      {summary.plannedIncomeList.length > 0 || summary.plannedExpenseList.length > 0 ? (
        <div className="card" style={{ marginBottom: '40px' }}>
          <h3>Các Khoản Dự Kiến Sắp Tới ({year})</h3>
          <div style={{ overflowX: 'auto', marginTop: '20px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                  <th style={{ padding: '12px' }}>Ngày dự kiến</th>
                  <th style={{ padding: '12px' }}>Loại</th>
                  <th style={{ padding: '12px' }}>Danh mục</th>
                  <th style={{ padding: '12px' }}>Số Tiền</th>
                  <th style={{ padding: '12px' }}>Nội Dung</th>
                  <th style={{ padding: '12px' }}>Người Liên Quan</th>
                  <th style={{ padding: '12px' }}>Chứng Từ</th>
                </tr>
              </thead>
              <tbody>
                {[...summary.plannedIncomeList, ...summary.plannedExpenseList]
                  .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
                  .map(tx => <TxRow key={tx.id} tx={tx} />)}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <div className="card">
        <h3>Lịch Sử Giao Dịch Đã Thực Hiện ({year})</h3>
        <div style={{ overflowX: 'auto', marginTop: '20px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                <th style={{ padding: '12px' }}>Ngày</th>
                <th style={{ padding: '12px' }}>Loại</th>
                <th style={{ padding: '12px' }}>Danh mục</th>
                <th style={{ padding: '12px' }}>Số Tiền</th>
                <th style={{ padding: '12px' }}>Nội Dung</th>
                <th style={{ padding: '12px' }}>Người Giao Dịch</th>
                <th style={{ padding: '12px' }}>Chứng Từ</th>
              </tr>
            </thead>
            <tbody>
              {[...summary.actualIncomeList, ...summary.actualExpenseList]
                .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
                .map(tx => <TxRow key={tx.id} tx={tx} />)}
              {summary.actualIncomeList.length === 0 && summary.actualExpenseList.length === 0 && (
                <tr><td colSpan={7} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>Chưa có giao dịch nào trong năm {year}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Finance;
