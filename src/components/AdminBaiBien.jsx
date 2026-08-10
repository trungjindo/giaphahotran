import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../store';
import { apiRequest } from '../api';

const currentYear = new Date().getFullYear();

// Quản lý phân công & bàn giao "bãi biện" theo năm — dùng chung cho dòng họ lớn (chiId = null)
// và từng chi. Chỉ admin/chi_admin/dich_ton mới thấy được (bãi biện không tự phân công).
const AdminBaiBien = ({ chiId = null, title = 'Dòng Họ' }) => {
  const { token } = useContext(AppContext);
  const [assignments, setAssignments] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [assignYear, setAssignYear] = useState(String(currentYear));
  const [assignUserId, setAssignUserId] = useState('');

  const [transferYear, setTransferYear] = useState(String(currentYear + 1));
  const [transferUserIds, setTransferUserIds] = useState([]);

  const loadData = () => {
    setIsLoading(true);
    Promise.all([
      apiRequest('bai_bien.php', { params: { chiId: chiId ?? 'null' }, token }),
      apiRequest('users.php', { token })
    ])
      .then(([assignmentList, userList]) => {
        setAssignments(assignmentList);
        setCandidates(userList.filter(u => u.role === 'bai_bien' && (u.chiId ?? null) === chiId));
      })
      .catch(err => setError(err.message))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { loadData(); }, [chiId]);

  const activeAssignments = assignments.filter(a => a.status === 'active');

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!assignYear || !assignUserId) return alert('Vui lòng chọn năm và người được phân công.');
    try {
      await apiRequest('bai_bien.php?action=assign', {
        method: 'POST', token,
        body: { chiId, year: Number(assignYear), userId: Number(assignUserId) }
      });
      alert('Phân công thành công!');
      setAssignUserId('');
      loadData();
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  const toggleTransferUser = (id) => {
    setTransferUserIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    if (!transferYear || transferUserIds.length === 0) return alert('Vui lòng nhập năm mới và chọn ít nhất 1 người.');
    if (!window.confirm(`Bàn giao: khóa quyền tất cả bãi biện đang đương nhiệm, gán quyền cho ${transferUserIds.length} người vào năm ${transferYear}?`)) return;
    try {
      await apiRequest('bai_bien.php?action=transfer', {
        method: 'POST', token,
        body: { chiId, year: Number(transferYear), userIds: transferUserIds }
      });
      alert('Bàn giao thành công!');
      setTransferUserIds([]);
      loadData();
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  if (isLoading) return <p>Đang tải...</p>;
  if (error) return <p style={{ color: '#c0392b' }}>{error}</p>;

  return (
    <div>
      <div className="card" style={{ marginBottom: '30px' }}>
        <h3>Đang Phụ Trách — {title}</h3>
        {activeAssignments.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', marginTop: '15px' }}>Chưa có ai được phân công phụ trách.</p>
        ) : (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '15px' }}>
            {activeAssignments.map(a => (
              <span key={a.id} style={{ padding: '8px 16px', borderRadius: '20px', background: '#e8f5e9', color: '#2e7d32', fontWeight: '600' }}>
                {a.userFullName} — Năm {a.year}
              </span>
            ))}
          </div>
        )}
      </div>

      {candidates.length === 0 ? (
        <div className="card" style={{ marginBottom: '30px' }}>
          <p style={{ color: 'var(--text-secondary)' }}>
            Chưa có tài khoản nào mang vai trò "Bãi biện" cho {title}. Vào "Quản Lý Tài Khoản" để tạo tài khoản bãi biện trước.
          </p>
        </div>
      ) : (
        <>
          <div className="card" style={{ marginBottom: '30px' }}>
            <h3>Phân Công Thêm</h3>
            <form onSubmit={handleAssign} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '15px', marginTop: '20px', alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Năm</label>
                <input type="number" value={assignYear} onChange={e => setAssignYear(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Người phụ trách</label>
                <select value={assignUserId} onChange={e => setAssignUserId(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                  <option value="">-- Chọn --</option>
                  {candidates.map(c => <option key={c.id} value={c.id}>{c.fullName}</option>)}
                </select>
              </div>
              <button type="submit" className="btn-primary">Phân Công</button>
            </form>
          </div>

          <div className="card" style={{ marginBottom: '30px' }}>
            <h3>Bàn Giao Sang Năm Mới</h3>
            <p style={{ color: 'var(--text-secondary)', marginTop: '5px' }}>
              Sẽ tự động khóa quyền của tất cả bãi biện đang đương nhiệm và gán quyền cho những người được chọn dưới đây.
            </p>
            <form onSubmit={handleTransfer} style={{ marginTop: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Năm tiếp theo</label>
              <input type="number" value={transferYear} onChange={e => setTransferYear(e.target.value)} style={{ padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)', width: '150px', marginBottom: '15px' }} />
              <div style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Người phụ trách mới (chọn 2 người theo thông lệ)</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '15px' }}>
                {candidates.map(c => (
                  <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input type="checkbox" checked={transferUserIds.includes(c.id)} onChange={() => toggleTransferUser(c.id)} />
                    {c.fullName}
                  </label>
                ))}
              </div>
              <button type="submit" className="btn-primary" style={{ background: '#d1a93e' }}>Thực Hiện Bàn Giao</button>
            </form>
          </div>
        </>
      )}

      <div className="card">
        <h3>Lịch Sử Phân Công ({assignments.length})</h3>
        <div style={{ overflowX: 'auto', marginTop: '20px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                <th style={{ padding: '12px' }}>Năm</th>
                <th style={{ padding: '12px' }}>Người Phụ Trách</th>
                <th style={{ padding: '12px' }}>Trạng Thái</th>
                <th style={{ padding: '12px' }}>Ngày Phân Công</th>
                <th style={{ padding: '12px' }}>Ngày Bàn Giao</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map(a => (
                <tr key={a.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px' }}>{a.year}</td>
                  <td style={{ padding: '12px', fontWeight: 'bold' }}>{a.userFullName}</td>
                  <td style={{ padding: '12px' }}>
                    {a.status === 'active' ? (
                      <span style={{ padding: '3px 8px', borderRadius: '10px', background: '#e8f5e9', color: '#2e7d32', fontSize: '0.8rem' }}>Đang đương nhiệm</span>
                    ) : (
                      <span style={{ padding: '3px 8px', borderRadius: '10px', background: '#f5f5f5', color: '#7f8c8d', fontSize: '0.8rem' }}>Đã bàn giao</span>
                    )}
                  </td>
                  <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{a.assignedAt}</td>
                  <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{a.handedOverAt || '—'}</td>
                </tr>
              ))}
              {assignments.length === 0 && (
                <tr><td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>Chưa có lịch sử phân công.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminBaiBien;
