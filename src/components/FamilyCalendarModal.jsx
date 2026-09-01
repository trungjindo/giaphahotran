import React, { useContext, useEffect, useMemo, useState } from 'react';
import { AppContext } from '../store';
import { apiRequest } from '../api';
import { buildDescendantList } from '../utils/family';
import {
  solarToLunar, canChiYear, canChiDay, canChiMonth, WEEKDAY_VN,
  todayParts, toISODate, jdFromDate, jdToDate, leapMonthOfLunarYear,
} from '../utils/lunar';
import {
  buildYearIndex, dayEntry, buildMonthGrid, personalCalendar, upcomingFrom,
  DEATH_CALENDAR_LUNAR,
} from '../utils/familyCalendar';
import MemberProfileModal from './MemberProfileModal';
import SearchableSelect from './SearchableSelect';

const MONTH_NAMES = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

// Một ô trong lưới lịch tháng: ngày dương ở trên (to), ngày âm ở dưới (nhỏ).
// Ngày âm được tô đỏ nổi bật khi hôm đó có giỗ tính theo âm lịch — vì giỗ là việc tính
// theo ngày âm, nhìn vào phải thấy ngay con số âm lịch nào mới là mốc.
const DayCell = ({ cell, entry, isToday, isSelected, onSelect }) => {
  const gioAm = entry.gio.filter(g => g.calendar === DEATH_CALENDAR_LUNAR);
  const gioDuong = entry.gio.filter(g => g.calendar !== DEATH_CALENDAR_LUNAR);
  const hasAnything = entry.gio.length > 0 || entry.events.length > 0;
  const lunarIsTheMark = gioAm.length > 0 || entry.events.some(e => e.calendar === 'am');

  const classes = [
    'fcal-cell',
    cell.inMonth ? '' : 'is-outside',
    isToday ? 'is-today' : '',
    isSelected ? 'is-selected' : '',
    cell.weekday === 0 ? 'is-sunday' : '',
  ].filter(Boolean).join(' ');

  return (
    <button type="button" className={classes} onClick={() => onSelect(cell)}>
      <span className="fcal-cell-solar">{cell.solar.day}</span>
      <span className={`fcal-cell-lunar${lunarIsTheMark ? ' is-marked' : ''}`}>
        {cell.lunar.day === 1 ? `${cell.lunar.day}/${cell.lunar.month}` : cell.lunar.day}
        {cell.lunar.leap ? 'N' : ''}
      </span>
      {hasAnything && (
        <span className="fcal-cell-dots">
          {gioAm.length + gioDuong.length > 0 && <i className="fcal-dot is-gio" />}
          {entry.events.length > 0 && <i className="fcal-dot is-event" />}
        </span>
      )}
    </button>
  );
};

// Khối mô tả một ngày: dương lịch, âm lịch, can chi, việc trong ngày.
const DaySummary = ({ parts, entry, onOpenMember, compact = false }) => {
  const lunar = solarToLunar(parts.day, parts.month, parts.year);
  const weekday = WEEKDAY_VN[(jdFromDate(parts.day, parts.month, parts.year) + 1) % 7];

  return (
    <div className={`fcal-summary${compact ? ' is-compact' : ''}`}>
      <div className="fcal-summary-dates">
        <div className="fcal-summary-solar">
          <span className="fcal-summary-weekday">{weekday}</span>
          <strong>{parts.day}</strong>
          <span className="fcal-summary-solar-rest">tháng {parts.month} năm {parts.year}</span>
          <span className="fcal-summary-tag">Dương lịch</span>
        </div>
        <div className="fcal-summary-lunar">
          <strong>{lunar.day}/{lunar.month}{lunar.leap ? ' (nhuận)' : ''}</strong>
          <span className="fcal-summary-lunar-rest">
            năm {canChiYear(lunar.year)} · tháng {canChiMonth(lunar.month, lunar.year)} · ngày {canChiDay(parts.day, parts.month, parts.year)}
          </span>
          <span className="fcal-summary-tag is-lunar">Âm lịch</span>
        </div>
      </div>

      {entry.gio.length === 0 && entry.events.length === 0 ? (
        <p className="fcal-empty">Ngày này không có giỗ hay việc họ nào được ghi nhận.</p>
      ) : (
        <div className="fcal-day-lists">
          {entry.gio.length > 0 && (
            <div className="fcal-block is-gio">
              <h4>Ngày giỗ ({entry.gio.length})</h4>
              <ul>
                {entry.gio.map((g, i) => (
                  <li key={`${g.member.id}-${i}`}>
                    <button type="button" className="fcal-person" onClick={() => onOpenMember(g.member.id)}>
                      <span className="fcal-person-name">{g.member.name}</span>
                      <span className="fcal-person-meta">
                        {g.member.code ? `#${g.member.code} · ` : ''}
                        Đời {g.member.generation}
                        {g.ordinal ? ` · Giỗ lần thứ ${g.ordinal}` : ''}
                        {g.calendar === DEATH_CALENDAR_LUNAR
                          ? ` · mất ${g.lunarDay}/${g.lunarMonth} âm lịch`
                          : ' · theo dương lịch'}
                      </span>
                      <span className="fcal-person-go">Xem hồ sơ →</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {entry.events.length > 0 && (
            <div className="fcal-block is-event">
              <h4>Việc họ ({entry.events.length})</h4>
              <ul>
                {entry.events.map(e => (
                  <li key={e.id}>
                    <div className="fcal-event-title">{e.title}</div>
                    <div className="fcal-event-meta">
                      {e.calendar === 'am' ? `${e.day}/${e.month} âm lịch` : `${e.day}/${e.month} dương lịch`}
                      {e.chiName ? ` · ${e.chiName}` : ' · Cả họ'}
                      {e.location ? ` · ${e.location}` : ''}
                    </div>
                    {e.description && <p className="fcal-event-desc">{e.description}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const FamilyCalendarModal = ({ onClose }) => {
  const { familyData, viewerMember } = useContext(AppContext);
  const [tab, setTab] = useState('today');
  const [events, setEvents] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [openMemberId, setOpenMemberId] = useState(null);

  const today = useMemo(() => todayParts(), []);
  const [viewYear, setViewYear] = useState(today.year);
  const [viewMonth, setViewMonth] = useState(today.month);
  const [selectedIso, setSelectedIso] = useState(toISODate(today));
  const [personId, setPersonId] = useState(viewerMember?.id || '');

  useEffect(() => {
    apiRequest('clan_events.php')
      .then(setEvents)
      .catch(err => setLoadError(err.message));
  }, []);

  const descendantList = useMemo(() => buildDescendantList(familyData), [familyData]);
  const membersById = useMemo(
    () => Object.fromEntries(descendantList.map(m => [m.id, m])),
    [descendantList]
  );

  // Bảng tra cả năm, dựng lại khi đổi năm đang xem hoặc khi dữ liệu thay đổi.
  const yearIndex = useMemo(
    () => buildYearIndex({ members: descendantList, events, solarYear: viewYear }),
    [descendantList, events, viewYear]
  );
  const todayIndex = useMemo(
    () => (viewYear === today.year
      ? yearIndex
      : buildYearIndex({ members: descendantList, events, solarYear: today.year })),
    [yearIndex, viewYear, today.year, descendantList, events]
  );

  const grid = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);
  const todayIso = toISODate(today);

  const selectedParts = useMemo(() => {
    const [y, m, d] = selectedIso.split('-').map(Number);
    return { day: d, month: m, year: y };
  }, [selectedIso]);

  const shiftMonth = (delta) => {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    setViewMonth(m);
    setViewYear(y);
  };

  const goToday = () => {
    setViewYear(today.year);
    setViewMonth(today.month);
    setSelectedIso(todayIso);
  };

  const personOptions = useMemo(() => descendantList.map(m => ({
    value: m.id,
    label: m.name,
    sublabel: [m.code ? `#${m.code}` : null, `Đời ${m.generation}`, m.isAlive ? 'Đang sống' : 'Đã mất']
      .filter(Boolean).join(' · '),
    keywords: m.code || '',
  })), [descendantList]);

  const person = membersById[personId] || null;
  const personalRows = useMemo(
    () => personalCalendar({ member: person, membersById, events, solarYear: today.year }),
    [person, membersById, events, today.year]
  );
  const personalUpcoming = useMemo(
    () => upcomingFrom(personalRows, today, 10),
    [personalRows, today]
  );

  const lunarToday = solarToLunar(today.day, today.month, today.year);
  const leapThisYear = leapMonthOfLunarYear(lunarToday.year);

  const openMember = (id) => setOpenMemberId(id);
  const selectedMember = membersById[openMemberId] || null;

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content fcal-modal" onClick={e => e.stopPropagation()}>
          <div className="fcal-header">
            <button className="close-btn" onClick={onClose} aria-label="Đóng">✕</button>
            <h2>Lịch Gia Tộc</h2>
            <p>Ngày dương, ngày âm, việc họ và ngày giỗ của dòng họ Trần Đình</p>
          </div>

          <div className="fcal-tabs">
            <button type="button" className={tab === 'today' ? 'is-active' : ''} onClick={() => setTab('today')}>Hôm Nay</button>
            <button type="button" className={tab === 'month' ? 'is-active' : ''} onClick={() => setTab('month')}>Lịch Tháng</button>
            <button type="button" className={tab === 'personal' ? 'is-active' : ''} onClick={() => setTab('personal')}>Lịch Cá Nhân</button>
          </div>

          <div className="fcal-body">
            {loadError && (
              <p className="fcal-warn">
                Chưa tải được việc họ: {loadError} — phần ngày âm/dương và ngày giỗ vẫn hiển thị bình thường.
              </p>
            )}

            {tab === 'today' && (
              <>
                <DaySummary parts={today} entry={dayEntry(todayIndex, today)} onOpenMember={openMember} />
                {leapThisYear > 0 && (
                  <p className="fcal-note">
                    Năm {canChiYear(lunarToday.year)} nhuận tháng {leapThisYear} âm lịch.
                  </p>
                )}

                <h3 className="fcal-section-title">Sắp tới trong dòng họ</h3>
                <UpcomingList
                  rows={upcomingFrom(
                    buildAllRows(todayIndex, today.year),
                    today,
                    8
                  )}
                  onOpenMember={openMember}
                />
              </>
            )}

            {tab === 'month' && (
              <>
                <div className="fcal-monthbar">
                  <button type="button" onClick={() => shiftMonth(-1)} aria-label="Tháng trước">‹</button>
                  <div className="fcal-monthbar-label">
                    <strong>{MONTH_NAMES[viewMonth - 1]} năm {viewYear}</strong>
                    <span>{canChiYear(solarToLunar(15, viewMonth, viewYear).year)}</span>
                  </div>
                  <button type="button" onClick={() => shiftMonth(1)} aria-label="Tháng sau">›</button>
                  <button type="button" className="fcal-today-btn" onClick={goToday}>Hôm nay</button>
                </div>

                <div className="fcal-weekdays">
                  {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(d => <span key={d}>{d}</span>)}
                </div>
                <div className="fcal-grid">
                  {grid.map(cell => (
                    <DayCell
                      key={cell.iso}
                      cell={cell}
                      entry={dayEntry(yearIndex, cell.solar)}
                      isToday={cell.iso === todayIso}
                      isSelected={cell.iso === selectedIso}
                      onSelect={c => setSelectedIso(c.iso)}
                    />
                  ))}
                </div>
                <div className="fcal-legend">
                  <span><i className="fcal-dot is-gio" /> Ngày giỗ</span>
                  <span><i className="fcal-dot is-event" /> Việc họ</span>
                  <span><i className="fcal-swatch" /> Số đỏ là ngày âm lịch có giỗ/việc họ</span>
                </div>

                <DaySummary
                  parts={selectedParts}
                  entry={dayEntry(yearIndex, selectedParts)}
                  onOpenMember={openMember}
                  compact
                />
              </>
            )}

            {tab === 'personal' && (
              <>
                <p className="fcal-intro">
                  Chọn một người để xem những ngày quan trọng trong năm liên quan tới người đó:
                  giỗ của chính họ hoặc của cha, mẹ, ông bà, sinh nhật, và các việc chung của dòng họ.
                </p>
                <SearchableSelect
                  id="fcal-person"
                  options={personOptions}
                  value={personId}
                  onChange={setPersonId}
                  placeholder="Gõ tên để tìm người trong gia phả..."
                  emptyText="Không tìm thấy ai khớp với từ khóa."
                />

                {!person ? (
                  <p className="fcal-empty" style={{ marginTop: 16 }}>Chưa chọn người nào.</p>
                ) : (
                  <>
                    <div className="fcal-person-head">
                      <div>
                        <strong>{person.name}</strong>
                        <span> · Đời {person.generation}{person.code ? ` · #${person.code}` : ''}</span>
                      </div>
                      <button type="button" className="btn-primary" style={{ padding: '7px 14px', fontSize: '0.85rem' }} onClick={() => openMember(person.id)}>
                        Xem hồ sơ
                      </button>
                    </div>

                    <h3 className="fcal-section-title">Nhắc nhở — sắp tới</h3>
                    <UpcomingList rows={personalUpcoming} onOpenMember={openMember} />

                    <h3 className="fcal-section-title">Toàn bộ mốc trong năm {today.year} ({personalRows.length})</h3>
                    <ul className="fcal-rows">
                      {personalRows.map((r, i) => (
                        <li key={i} className={`fcal-row is-${r.kind}`}>
                          <span className="fcal-row-date">
                            <strong>{r.solar.day}/{r.solar.month}</strong>
                            <small>{(() => { const l = solarToLunar(r.solar.day, r.solar.month, r.solar.year); return `${l.day}/${l.month} ÂL`; })()}</small>
                          </span>
                          <span className="fcal-row-main">
                            <span className="fcal-row-title">{r.title}</span>
                            <span className="fcal-row-meta">
                              {r.kind === 'gio' && (r.calendar === DEATH_CALENDAR_LUNAR ? 'Giỗ theo âm lịch' : 'Giỗ theo dương lịch')}
                              {r.kind === 'sinhnhat' && (r.ordinal ? `Tròn ${r.ordinal} tuổi` : 'Sinh nhật')}
                              {r.kind === 'sukien' && (r.calendar === 'am' ? 'Việc họ · âm lịch' : 'Việc họ · dương lịch')}
                              {r.kind === 'gio' && r.ordinal ? ` · lần thứ ${r.ordinal}` : ''}
                            </span>
                          </span>
                          {r.person && (
                            <button type="button" className="fcal-row-link" onClick={() => openMember(r.person.id)}>Hồ sơ →</button>
                          )}
                        </li>
                      ))}
                    </ul>
                    {personalRows.length === 0 && <p className="fcal-empty">Chưa có mốc nào ghi nhận được cho người này.</p>}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Hồ sơ chi tiết mở ĐÈ lên lịch (khai báo sau nên được vẽ trên), đóng lại thì quay về lịch. */}
      <MemberProfileModal
        member={selectedMember}
        onClose={() => setOpenMemberId(null)}
        onSelectMember={setOpenMemberId}
      />
    </>
  );
};

// Gom mọi mốc của cả họ trong 1 năm thành danh sách phẳng để lọc "sắp tới".
function buildAllRows(index, solarYear) {
  const rows = [];
  index.forEach((entry, iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    const solar = { day: d, month: m, year: y };
    entry.gio.forEach(g => rows.push({
      solar, iso, kind: 'gio', person: g.member, calendar: g.calendar, ordinal: g.ordinal,
      title: `Giỗ ${g.member.name}`,
    }));
    entry.events.forEach(e => rows.push({
      solar, iso, kind: 'sukien', event: e, calendar: e.calendar, title: e.title,
    }));
  });
  return rows.sort((a, b) => a.iso.localeCompare(b.iso));
}

const UpcomingList = ({ rows, onOpenMember }) => {
  if (rows.length === 0) return <p className="fcal-empty">Không còn mốc nào từ nay tới hết năm.</p>;
  return (
    <ul className="fcal-upcoming">
      {rows.map((r, i) => {
        const l = solarToLunar(r.solar.day, r.solar.month, r.solar.year);
        return (
          <li key={i}>
            <span className="fcal-up-when">
              {r.daysAway === 0 ? <strong className="is-today-badge">Hôm nay</strong>
                : r.daysAway === 1 ? <strong>Ngày mai</strong>
                : <strong>Còn {r.daysAway} ngày</strong>}
              <small>{r.solar.day}/{r.solar.month} DL · {l.day}/{l.month} ÂL</small>
            </span>
            <span className="fcal-up-main">
              <span className={`fcal-up-kind is-${r.kind}`}>{r.kind === 'gio' ? 'Giỗ' : r.kind === 'sinhnhat' ? 'Sinh nhật' : 'Việc họ'}</span>
              <span className="fcal-up-title">{r.title}</span>
            </span>
            {r.person && onOpenMember && (
              <button type="button" className="fcal-row-link" onClick={() => onOpenMember(r.person.id)}>Hồ sơ →</button>
            )}
          </li>
        );
      })}
    </ul>
  );
};

export default FamilyCalendarModal;
