import React, { useContext, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { AppContext } from '../store';
import { buildDescendantList, getMaxGeneration } from '../utils/family';
import MemberProfileModal from '../components/MemberProfileModal';
import CompareMembersModal from '../components/CompareMembersModal';

function DescendantList() {
  const { familyData } = useContext(AppContext);
  const [search, setSearch] = useState('');
  const [genFilter, setGenFilter] = useState('');
  const [registeredFilter, setRegisteredFilter] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [showCompare, setShowCompare] = useState(false);

  const fullList = useMemo(() => buildDescendantList(familyData), [familyData]);
  const maxGeneration = useMemo(() => getMaxGeneration(familyData), [familyData]);
  const selectedMember = useMemo(
    () => fullList.find(m => m.id === selectedMemberId) || null,
    [fullList, selectedMemberId]
  );

  const filteredList = useMemo(() => {
    return fullList.filter(m => {
      if (search && !m.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
      if (genFilter && m.generation !== Number(genFilter)) return false;
      if (registeredFilter === 'yes' && !m.isRegistered) return false;
      if (registeredFilter === 'no' && m.isRegistered) return false;
      return true;
    }).sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
  }, [fullList, search, genFilter, registeredFilter]);

  const handleExportExcel = () => {
    const excelData = filteredList.map(m => ({
      "Mã ĐD": m.code,
      "Họ Tên": m.name,
      "Giới Tính": m.gender || "",
      "Đời": m.generation,
      "Cha": m.father,
      "Mẹ": m.mother,
      "Vợ/Chồng": m.spouse || "",
      "Các Con": m.childrenNames,
      "Ngày Sinh": m.birthDate || "",
      "Ngày Mất": m.deathDate || "",
      "Tình Trạng": m.isAlive ? "Sống" : "Mất",
      "Đã Đăng Ký Suất Đinh": m.isRegistered ? "Có" : "Không",
      "Học Vấn": m.education || "",
      "Nghề Nghiệp": m.occupation || "",
      "Tỉnh/Thành Hiện Nay": m.currentProvince || "",
      "Phường/Xã Hiện Nay": m.currentWard || "",
      "Số Điện Thoại": m.phone || "",
      "Zalo": m.zalo || ""
    }));
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DanhSachConChau");
    XLSX.writeFile(wb, "DanhSach_ConChau_QuaCacDoi.xlsx");
  };

  return (
    <div className="container">
      <div className="section-header">
        <span className="section-eyebrow">Dòng Họ Trần Đình</span>
        <h2>Danh Sách Con Cháu Qua Các Đời</h2>
        <p>Tổng hợp đầy đủ {fullList.length} thành viên, kèm cha mẹ, mã định danh và trạng thái đăng ký suất đinh trong dòng họ.</p>
      </div>

      <div className="card" style={{ marginBottom: '25px' }}>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm theo họ tên..."
            className="input-control"
            style={{ flex: 1, minWidth: '200px' }}
          />
          <select className="select-control" value={genFilter} onChange={e => setGenFilter(e.target.value)}>
            <option value="">Tất cả các đời</option>
            {Array.from({ length: maxGeneration }, (_, i) => i + 1).map(g => (
              <option key={g} value={g}>Đời {g}</option>
            ))}
          </select>
          <select className="select-control" value={registeredFilter} onChange={e => setRegisteredFilter(e.target.value)}>
            <option value="">Tất cả suất đinh</option>
            <option value="yes">Đã đăng ký</option>
            <option value="no">Chưa đăng ký</option>
          </select>
          <button className="btn-primary" onClick={handleExportExcel} style={{ background: '#1E8449', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v12" /><path d="M7 10l5 5 5-5" /><path d="M4 21h16" />
            </svg>
            Xuất Excel
          </button>
          <button className="btn-primary" onClick={() => setShowCompare(true)} style={{ background: 'var(--accent-teal)', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 3v18M7 3v18M3 8h4M17 8h4M3 16h4M17 16h4" />
            </svg>
            So Sánh 2 Người
          </button>
        </div>
      </div>

      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
            <thead style={{ background: 'var(--surface-color)' }}>
              <tr>
                <th style={{ padding: '12px 15px', borderBottom: '2px solid var(--border-color)' }}>Mã ĐD</th>
                <th style={{ padding: '12px 15px', borderBottom: '2px solid var(--border-color)' }}>Họ Tên</th>
                <th style={{ padding: '12px 15px', borderBottom: '2px solid var(--border-color)' }}>Đời</th>
                <th style={{ padding: '12px 15px', borderBottom: '2px solid var(--border-color)' }}>Cha</th>
                <th style={{ padding: '12px 15px', borderBottom: '2px solid var(--border-color)' }}>Mẹ</th>
                <th style={{ padding: '12px 15px', borderBottom: '2px solid var(--border-color)' }}>Các Con</th>
                <th style={{ padding: '12px 15px', borderBottom: '2px solid var(--border-color)' }}>Tình Trạng</th>
                <th style={{ padding: '12px 15px', borderBottom: '2px solid var(--border-color)' }}>Suất Đinh</th>
                <th style={{ padding: '12px 15px', borderBottom: '2px solid var(--border-color)' }}></th>
              </tr>
            </thead>
            <tbody>
              {filteredList.map(m => (
                <tr key={m.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px 15px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{m.code}</td>
                  <td style={{ padding: '12px 15px', fontWeight: 'bold', color: m.isMainLineage ? 'var(--primary-color)' : 'var(--text-primary)' }}>
                    {m.name} {m.gender === 'Nam' ? '♂' : m.gender === 'Nữ' ? '♀' : ''}
                  </td>
                  <td style={{ padding: '12px 15px' }}>Đời {m.generation}</td>
                  <td style={{ padding: '12px 15px', color: 'var(--text-secondary)' }}>{m.father || '—'}</td>
                  <td style={{ padding: '12px 15px', color: 'var(--text-secondary)' }}>{m.mother || '—'}</td>
                  <td style={{ padding: '12px 15px', color: 'var(--text-secondary)' }}>{m.childrenNames || '—'}</td>
                  <td style={{ padding: '12px 15px' }}>
                    {m.isAlive ? <span className="badge badge-green">Đang sống</span> : <span className="badge badge-gray">Đã mất</span>}
                  </td>
                  <td style={{ padding: '12px 15px' }}>
                    {m.isRegistered ? (
                      <span className="badge badge-green">Đã ĐK</span>
                    ) : (
                      <span className="badge badge-gray">Chưa ĐK</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 15px' }}>
                    <button
                      onClick={() => setSelectedMemberId(m.id)}
                      style={{ padding: '6px 12px', background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 500, transition: 'background-color var(--transition-fast), transform var(--transition-micro)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-light)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'var(--primary-color)'}
                    >
                      Xem hồ sơ
                    </button>
                  </td>
                </tr>
              ))}
              {filteredList.length === 0 && (
                <tr><td colSpan={9} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>Không tìm thấy thành viên phù hợp</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <MemberProfileModal member={selectedMember} onClose={() => setSelectedMemberId(null)} />
      {showCompare && <CompareMembersModal onClose={() => setShowCompare(false)} />}
    </div>
  );
}

export default DescendantList;
