import React, { useMemo } from 'react';
import { solarToLunar, lunarAnniversaryToSolar, parseISODate, todayParts, canChiYear } from '../utils/lunar';
import { DEATH_CALENDAR_LUNAR, DEATH_CALENDAR_SOLAR } from '../utils/familyCalendar';

const inputStyle = { width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' };

// Ô nhập NGÀY MẤT có chọn lịch.
//
// Vì sao phải chọn: giỗ các cụ hầu hết tính theo ngày ÂM, và nhiều gia phả cũ vốn đã chép
// ngày mất theo âm lịch. Nếu cứ mặc định coi con số nhập vào là dương lịch rồi tự quy đổi
// thì ngày giỗ hiện trên lịch sẽ sai. Ở đây để người nhập nói rõ con số đó thuộc lịch nào,
// và hệ thống lấy đúng lịch đó làm mốc giỗ hằng năm.
//
// Khi chọn âm lịch KHÔNG dùng được <input type="date">: ngày âm hợp lệ như 30/2 bị trình
// duyệt từ chối vì dương lịch không có ngày đó. Nên tách thành 3 ô ngày / tháng / năm.
const DeathDateField = ({ value, calendar, onChange }) => {
  const isLunar = calendar === DEATH_CALENDAR_LUNAR;
  const parts = parseISODate(value);
  const today = useMemo(() => todayParts(), []);

  const setCalendar = (next) => onChange({ deathDate: value, deathDateCalendar: next });

  const setLunarPart = (key, raw) => {
    const n = raw === '' ? '' : Number(raw);
    const cur = parts || { day: 1, month: 1, year: today.year };
    const next = { ...cur, [key]: n === '' ? cur[key] : n };
    const iso = `${String(next.year).padStart(4, '0')}-${String(next.month).padStart(2, '0')}-${String(next.day).padStart(2, '0')}`;
    onChange({ deathDate: iso, deathDateCalendar: DEATH_CALENDAR_LUNAR });
  };

  // Đối chiếu sang lịch còn lại để người nhập tự kiểm tra lại cho chắc.
  const crossCheck = useMemo(() => {
    if (!parts) return null;
    if (isLunar) {
      const s = lunarAnniversaryToSolar(parts.day, parts.month, parts.year);
      return s
        ? `Ngày ${parts.day}/${parts.month} âm lịch năm ${parts.year} nhằm ngày ${s.day}/${s.month}/${s.year} dương lịch.`
        : null;
    }
    const l = solarToLunar(parts.day, parts.month, parts.year);
    return `Ngày ${parts.day}/${parts.month}/${parts.year} dương lịch nhằm ngày ${l.day}/${l.month}${l.leap ? ' (nhuận)' : ''} âm lịch, năm ${canChiYear(l.year)}.`;
  }, [parts, isLunar]);

  return (
    <div style={{ gridColumn: '1 / -1' }}>
      <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
        Ngày mất (Để trống nếu còn sống)
      </label>

      <div className="calendar-kind-modes" style={{ marginBottom: 12 }}>
        <label className={!isLunar ? 'is-active' : ''}>
          <input
            type="radio" name="death-calendar"
            checked={!isLunar}
            onChange={() => setCalendar(DEATH_CALENDAR_SOLAR)}
          />
          <span>
            <strong>Dương lịch</strong>
            <small>Ngày mất ghi theo lịch tây. Giỗ sẽ lấy đúng ngày/tháng dương này.</small>
          </span>
        </label>
        <label className={isLunar ? 'is-active' : ''}>
          <input
            type="radio" name="death-calendar"
            checked={isLunar}
            onChange={() => setCalendar(DEATH_CALENDAR_LUNAR)}
          />
          <span>
            <strong>Âm lịch</strong>
            <small>Gia phả chép theo ngày ta. Giỗ sẽ lấy đúng ngày/tháng âm này hằng năm.</small>
          </span>
        </label>
      </div>

      {isLunar ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: 10 }}>
          <div>
            <small style={{ color: 'var(--text-secondary)' }}>Ngày âm (1–30)</small>
            <input
              type="number" min="1" max="30" style={inputStyle}
              value={parts ? parts.day : ''}
              onChange={e => setLunarPart('day', e.target.value)}
              placeholder="VD: 20"
            />
          </div>
          <div>
            <small style={{ color: 'var(--text-secondary)' }}>Tháng âm (1–12)</small>
            <input
              type="number" min="1" max="12" style={inputStyle}
              value={parts ? parts.month : ''}
              onChange={e => setLunarPart('month', e.target.value)}
              placeholder="VD: 8"
            />
          </div>
          <div>
            <small style={{ color: 'var(--text-secondary)' }}>Năm mất</small>
            <input
              type="number" style={inputStyle}
              value={parts ? parts.year : ''}
              onChange={e => setLunarPart('year', e.target.value)}
              placeholder="VD: 1998"
            />
          </div>
        </div>
      ) : (
        <input
          type="date" style={inputStyle}
          value={value || ''}
          onChange={e => onChange({ deathDate: e.target.value, deathDateCalendar: DEATH_CALENDAR_SOLAR })}
        />
      )}

      {crossCheck && <div className="calendar-preview" style={{ marginTop: 10 }}>{crossCheck}</div>}

      {!value && (
        <small style={{ display: 'block', marginTop: 8, color: 'var(--text-secondary)' }}>
          Bỏ trống nếu người này còn sống.
        </small>
      )}
    </div>
  );
};

export default DeathDateField;
