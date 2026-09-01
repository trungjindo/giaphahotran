import React, { useContext, useEffect, useMemo, useState } from 'react';
import { AppContext } from '../store';
import { apiRequest } from '../api';
import { solarToLunar, lunarAnniversaryToSolar, todayParts, canChiYear } from '../utils/lunar';

const emptyForm = {
  title: '', description: '', location: '', chiId: '',
  calendar: 'am', day: '', month: '', year: '',
};

// Quản lý LỊCH GIA TỘC: các việc họ có ngày cụ thể (giỗ tổ, ngày tế họ, họp mặt...).
// Khác mục "Hoạt Động Dòng Họ" cũ ở chỗ có NGÀY/THÁNG và ghi rõ theo lịch âm hay dương,
// nhờ vậy mới lên được lịch và nhắc trước được.
const AdminClanEvents = () => {
  const { token } = useContext(AppContext);
  const [events, setEvents] = useState([]);
  const [chiList, setChiList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const today = useMemo(() => todayParts(), []);

  const load = () => {
    setIsLoading(true);
    apiRequest('clan_events.php')
      .then(setEvents)
      .catch(err => setError(err.message))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    load();
    apiRequest('chi.php').then(setChiList).catch(() => {});
  }, []);

  const maxDay = form.calendar === 'am' ? 30 : 31;

  // Xem trước: sự kiện này năm nay rơi vào ngày nào của lịch còn lại.
  const preview = useMemo(() => {
    const d = Number(form.day);
    const m = Number(form.month);
    if (!d || !m || d < 1 || d > maxDay || m < 1 || m > 12) return null;
    if (form.calendar === 'am') {
      const s = lunarAnniversaryToSolar(d, m, Number(form.year) || today.year);
      return s ? `Năm ${s.year}: rơi vào ${s.day}/${s.month}/${s.year} dương lịch` : null;
    }
    const y = Number(form.year) || today.year;
    const l = solarToLunar(d, m, y);
    return `Năm ${y}: nhằm ngày ${l.day}/${l.month}${l.leap ? ' (nhuận)' : ''} âm lịch, năm ${canChiYear(l.year)}`;
  }, [form.calendar, form.day, form.month, form.year, maxDay, today.year]);

  const resetForm = () => { setForm(emptyForm); setEditingId(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return alert('Vui lòng nhập tên sự kiện.');
    const d = Number(form.day);
    const m = Number(form.month);
    if (!d || d < 1 || d > maxDay) return alert(`Ngày phải từ 1 đến ${maxDay}.`);
    if (!m || m < 1 || m > 12) return alert('Tháng phải từ 1 đến 12.');

    const body = {
      title: form.title.trim(),
      description: form.description,
      location: form.location,
      chiId: form.chiId === '' ? null : Number(form.chiId),
      calendar: form.calendar,
      day: d,
      month: m,
      year: form.year === '' ? null : Number(form.year),
    };

    try {
      if (editingId) {
        await apiRequest(`clan_events.php?id=${editingId}`, { method: 'PUT', body, token });
        alert('Cập nhật sự kiện thành công!');
      } else {
        await apiRequest('clan_events.php', { method: 'POST', body, token });
        alert('Thêm sự kiện vào Lịch Gia Tộc thành công!');
      }
      resetForm();
      load();
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  const handleEdit = (ev) => {
    setEditingId(ev.id);
    setForm({
      title: ev.title,
      description: ev.description || '',
      location: ev.location || '',
      chiId: ev.chiId === null ? '' : String(ev.chiId),
      calendar: ev.calendar,
      day: String(ev.day),
      month: String(ev.month),
      year: ev.year === null ? '' : String(ev.year),
    });
  };

  const handleDelete = async (ev) => {
    if (!window.confirm(`Xóa sự kiện "${ev.title}" khỏi Lịch Gia Tộc?`)) return;
    try {
      await apiRequest(`clan_events.php?id=${ev.id}`, { method: 'DELETE', token });
      if (editingId === ev.id) resetForm();
      load();
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: '30px' }}>
        <h3>{editingId ? 'Cập Nhật Sự Kiện' : 'Thêm Sự Kiện Vào Lịch Gia Tộc'}</h3>
        <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontSize: '0.9rem' }}>
          Những việc họ có ngày cụ thể: giỗ tổ, ngày tế họ, họp mặt đầu xuân, khánh thành nhà thờ...
          Sự kiện sẽ hiện trên <strong>Lịch Gia Tộc</strong> ở trang chủ và trong lịch cá nhân của con cháu.
        </p>

        <form onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Tên Sự Kiện *</label>
              <input
                type="text" className="input-control" style={{ width: '100%' }}
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="VD: Giỗ Tổ dòng họ Trần Đình, Ngày tế họ hàng năm"
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Ngày Diễn Ra Tính Theo Lịch *</label>
              <div className="calendar-kind-modes">
                <label className={form.calendar === 'am' ? 'is-active' : ''}>
                  <input
                    type="radio" name="event-calendar"
                    checked={form.calendar === 'am'}
                    onChange={() => setForm({ ...form, calendar: 'am' })}
                  />
                  <span>
                    <strong>Âm lịch</strong>
                    <small>Giỗ tổ, tế họ, rằm — đa số việc họ dùng lịch này</small>
                  </span>
                </label>
                <label className={form.calendar === 'duong' ? 'is-active' : ''}>
                  <input
                    type="radio" name="event-calendar"
                    checked={form.calendar === 'duong'}
                    onChange={() => setForm({ ...form, calendar: 'duong' })}
                  />
                  <span>
                    <strong>Dương lịch</strong>
                    <small>Họp mặt, khánh thành — theo ngày dương thông thường</small>
                  </span>
                </label>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Ngày *</label>
              <input
                type="number" min="1" max={maxDay} className="input-control" style={{ width: '100%' }}
                value={form.day}
                onChange={e => setForm({ ...form, day: e.target.value })}
                placeholder={`1 - ${maxDay}`}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Tháng *</label>
              <input
                type="number" min="1" max="12" className="input-control" style={{ width: '100%' }}
                value={form.month}
                onChange={e => setForm({ ...form, month: e.target.value })}
                placeholder="1 - 12"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Năm</label>
              <input
                type="number" className="input-control" style={{ width: '100%' }}
                value={form.year}
                onChange={e => setForm({ ...form, year: e.target.value })}
                placeholder="Để trống = lặp lại hằng năm"
              />
              <small style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                Để trống với việc năm nào cũng làm (giỗ tổ, tế họ). Điền năm nếu chỉ diễn ra một lần.
              </small>
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Thuộc Chi</label>
              <select
                className="select-control" style={{ width: '100%' }}
                value={form.chiId}
                onChange={e => setForm({ ...form, chiId: e.target.value })}
              >
                <option value="">-- Việc chung của cả họ --</option>
                {chiList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {preview && (
              <div style={{ gridColumn: '1 / -1' }}>
                <div className="calendar-preview">{preview}</div>
              </div>
            )}

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Địa Điểm</label>
              <input
                type="text" className="input-control" style={{ width: '100%' }}
                value={form.location}
                onChange={e => setForm({ ...form, location: e.target.value })}
                placeholder="VD: Nhà thờ họ Trần Đình"
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Mô Tả</label>
              <textarea
                className="input-control"
                style={{ width: '100%', minHeight: '80px', resize: 'vertical', fontFamily: 'inherit' }}
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Chương trình, giờ giấc, lưu ý cho con cháu..."
              />
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              {editingId && <button type="button" onClick={resetForm} style={{ padding: '10px 20px', background: '#ccc', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>Hủy Bỏ</button>}
              <button type="submit" className="btn-primary">{editingId ? 'Cập Nhật' : 'Thêm Sự Kiện'}</button>
            </div>
          </div>
        </form>
      </div>

      <div className="card">
        <h3>Sự Kiện Trong Lịch Gia Tộc ({events.length})</h3>
        {isLoading ? <p>Đang tải...</p> : error ? <p style={{ color: '#B03A3A' }}>{error}</p> : (
          <div style={{ overflowX: 'auto', marginTop: '20px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '820px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                  <th style={{ padding: '12px' }}>Tên Sự Kiện</th>
                  <th style={{ padding: '12px' }}>Ngày</th>
                  <th style={{ padding: '12px' }}>Năm nay nhằm ngày</th>
                  <th style={{ padding: '12px' }}>Phạm Vi</th>
                  <th style={{ padding: '12px' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {events.map(ev => {
                  const solarThisYear = ev.calendar === 'am'
                    ? lunarAnniversaryToSolar(ev.day, ev.month, ev.year || today.year)
                    : { day: ev.day, month: ev.month, year: ev.year || today.year };
                  return (
                    <tr key={ev.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px' }}>
                        <strong>{ev.title}</strong>
                        {ev.location && <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{ev.location}</div>}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span className={ev.calendar === 'am' ? 'badge badge-lunar' : 'badge badge-gold'}>
                          {ev.day}/{ev.month} {ev.calendar === 'am' ? 'ÂL' : 'DL'}
                        </span>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 3 }}>
                          {ev.year ? `Chỉ năm ${ev.year}` : 'Lặp hằng năm'}
                        </div>
                      </td>
                      <td style={{ padding: '12px', fontSize: '0.85rem' }}>
                        {solarThisYear ? `${solarThisYear.day}/${solarThisYear.month}/${solarThisYear.year}` : '—'}
                      </td>
                      <td style={{ padding: '12px' }}>{ev.chiName || <em style={{ color: 'var(--text-secondary)' }}>Cả họ</em>}</td>
                      <td style={{ padding: '12px' }}>
                        <button onClick={() => handleEdit(ev)} style={{ padding: '5px 10px', background: '#3498db', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', marginRight: '5px' }}>Sửa</button>
                        <button onClick={() => handleDelete(ev)} style={{ padding: '5px 10px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>Xóa</button>
                      </td>
                    </tr>
                  );
                })}
                {events.length === 0 && (
                  <tr><td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    Chưa có sự kiện nào. Thêm sự kiện đầu tiên ở form phía trên.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminClanEvents;
