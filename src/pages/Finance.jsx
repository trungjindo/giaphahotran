import React, { useContext } from 'react';
import { AppContext } from '../store';

function Finance() {
  const { financeData } = useContext(AppContext);

  const formatCurrency = (amount) => {
    return amount.toLocaleString('vi-VN') + ' VNĐ';
  };

  return (
    <div className="container">
      <h2 style={{ textAlign: 'center', marginBottom: '40px' }}>Quản Lý Thu Chi</h2>
      
      <div className="card" style={{ textAlign: 'center', marginBottom: '40px', background: 'linear-gradient(135deg, var(--secondary-color), var(--secondary-light))', color: '#000' }}>
        <h3 style={{ color: '#000', marginBottom: '10px' }}>Tổng Quỹ Hiện Tại</h3>
        <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>
          {formatCurrency(financeData.totalFund)}
        </div>
      </div>

      <div className="card">
        <h3>Lịch Sử Giao Dịch</h3>
        <div style={{ overflowX: 'auto', marginTop: '20px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                <th style={{ padding: '15px' }}>Ngày</th>
                <th style={{ padding: '15px' }}>Loại</th>
                <th style={{ padding: '15px' }}>Số Tiền</th>
                <th style={{ padding: '15px' }}>Nội Dung</th>
                <th style={{ padding: '15px' }}>Người Giao Dịch</th>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Finance;
