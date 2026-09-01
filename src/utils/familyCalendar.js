// Quy các mốc LẶP LẠI HẰNG NĂM của dòng họ (ngày giỗ, sự kiện họ) về ngày DƯƠNG LỊCH cụ thể
// của một năm, để dựng được Lịch Gia Tộc và trả lời câu "hôm nay có việc gì".
//
// Cái khó: giỗ các cụ tính theo ÂM lịch, nên mỗi năm dương lại rơi vào một ngày khác nhau —
// không thể so ngày/tháng dương như sinh nhật được.

import {
  solarToLunar, jdFromDate, jdToDate, toISODate, parseISODate, lunarAnniversaryToSolar,
} from './lunar';

// Ngày mất được khai theo lịch nào. Dữ liệu cũ không có trường này -> hiểu là dương lịch,
// đúng như cách nó vẫn được nhập từ trước tới nay.
export const DEATH_CALENDAR_SOLAR = 'duong';
export const DEATH_CALENDAR_LUNAR = 'am';

export function deathCalendarOf(member) {
  return member?.deathDateCalendar === DEATH_CALENDAR_LUNAR ? DEATH_CALENDAR_LUNAR : DEATH_CALENDAR_SOLAR;
}

// Ngày giỗ của một người, dưới dạng { calendar, day, month, year }.
// year là năm mất (để tính "giỗ lần thứ mấy"), có thể null nếu dữ liệu cũ chỉ ghi năm.
export function anniversaryOf(member) {
  if (!member || member.isAlive) return null;
  const parts = parseISODate(member.deathDate);
  if (!parts) return null;
  return {
    calendar: deathCalendarOf(member),
    day: parts.day,
    month: parts.month,
    year: parts.year,
  };
}

// Một mốc lặp hằng năm rơi vào (những) ngày dương lịch nào TRONG một năm dương cụ thể.
// Trả về mảng vì một ngày âm lịch có thể xuất hiện 2 lần trong cùng 1 năm dương (hiếm, xảy ra
// với các tháng cuối năm âm), và cũng có thể không xuất hiện lần nào.
export function annualOccurrencesInSolarYear({ calendar, day, month }, solarYear) {
  if (calendar === DEATH_CALENDAR_SOLAR) {
    // 29/2 chỉ có ở năm nhuận dương lịch — năm thường thì làm vào 28/2.
    if (month === 2 && day === 29) {
      const isLeap = (solarYear % 4 === 0 && solarYear % 100 !== 0) || solarYear % 400 === 0;
      return [{ day: isLeap ? 29 : 28, month: 2, year: solarYear }];
    }
    return [{ day, month, year: solarYear }];
  }

  // Âm lịch: cùng một ngày/tháng âm nhưng ở 2 năm âm liền nhau có thể cùng rơi vào năm dương này.
  const out = [];
  for (const lunarYear of [solarYear - 1, solarYear, solarYear + 1]) {
    const s = lunarAnniversaryToSolar(day, month, lunarYear);
    if (s && s.year === solarYear && !out.some(o => o.day === s.day && o.month === s.month)) {
      out.push(s);
    }
  }
  return out;
}

// Sự kiện dòng họ (clan_events) rơi vào ngày dương nào trong năm.
// Sự kiện có year cụ thể thì chỉ tính đúng năm đó; year = null là lặp hằng năm.
export function eventOccurrencesInSolarYear(event, solarYear) {
  if (event.year != null) {
    if (event.calendar === DEATH_CALENDAR_SOLAR) {
      return event.year === solarYear ? [{ day: event.day, month: event.month, year: solarYear }] : [];
    }
    // Sự kiện âm lịch có năm âm cụ thể: quy đúng năm âm đó ra dương lịch.
    const s = lunarAnniversaryToSolar(event.day, event.month, event.year);
    return s && s.year === solarYear ? [s] : [];
  }
  return annualOccurrencesInSolarYear(event, solarYear);
}

// Bảng tra: ngày dương (ISO 'YYYY-MM-DD') -> { gio: [...], events: [...] } cho cả một năm.
// Dựng 1 lần rồi tra nhanh cho ô lịch tháng và cho câu hỏi "hôm nay có gì".
export function buildYearIndex({ members = [], events = [], solarYear }) {
  const index = new Map();
  const bucket = (iso) => {
    if (!index.has(iso)) index.set(iso, { gio: [], events: [] });
    return index.get(iso);
  };

  members.forEach(m => {
    const ann = anniversaryOf(m);
    if (!ann) return;
    annualOccurrencesInSolarYear(ann, solarYear).forEach(s => {
      bucket(toISODate(s)).gio.push({
        member: m,
        calendar: ann.calendar,
        lunarDay: ann.calendar === DEATH_CALENDAR_LUNAR ? ann.day : null,
        lunarMonth: ann.calendar === DEATH_CALENDAR_LUNAR ? ann.month : null,
        deathYear: ann.year,
        // Giỗ lần thứ mấy — chỉ tính được khi biết năm mất.
        ordinal: ann.year ? solarYear - ann.year : null,
      });
    });
  });

  events.forEach(e => {
    eventOccurrencesInSolarYear(e, solarYear).forEach(s => {
      bucket(toISODate(s)).events.push(e);
    });
  });

  return index;
}

export function dayEntry(index, solarParts) {
  return index.get(toISODate(solarParts)) || { gio: [], events: [] };
}

// ---- Lịch tháng ----

// Lưới 6 tuần x 7 ngày bao trọn tháng dương lịch, kèm ngày âm của từng ô.
// Bắt đầu từ Chủ Nhật cho khớp cách người Việt đọc lịch treo tường.
export function buildMonthGrid(solarYear, solarMonth) {
  const firstJd = jdFromDate(1, solarMonth, solarYear);
  // Thứ trong tuần: JD 0 là thứ Hai, nên (jd + 1) % 7 cho 0 = Chủ Nhật.
  const firstWeekday = (firstJd + 1) % 7;
  const startJd = firstJd - firstWeekday;

  const cells = [];
  for (let i = 0; i < 42; i++) {
    const jd = startJd + i;
    const [day, month, year] = jdToDate(jd);
    const lunar = solarToLunar(day, month, year);
    cells.push({
      jd,
      solar: { day, month, year },
      iso: toISODate({ day, month, year }),
      lunar,
      inMonth: month === solarMonth && year === solarYear,
      weekday: (jd + 1) % 7,
    });
  }
  return cells;
}

// ---- Lịch cá nhân ----

// Những ngày quan trọng trong năm liên quan tới MỘT người:
// giỗ của chính họ (nếu đã mất), sinh nhật (nếu còn sống), giỗ của cha/mẹ/ông bà/vợ chồng,
// và toàn bộ việc họ. Sắp theo ngày dương lịch trong năm.
export function personalCalendar({ member, membersById, events = [], solarYear }) {
  if (!member) return [];
  const rows = [];

  const push = (occ, row) => occ.forEach(s => rows.push({ ...row, solar: s, iso: toISODate(s) }));

  const addAnniversary = (person, relation) => {
    if (!person) return;
    const ann = anniversaryOf(person);
    if (!ann) return;
    push(annualOccurrencesInSolarYear(ann, solarYear), {
      kind: 'gio',
      relation,
      person,
      calendar: ann.calendar,
      ordinal: ann.year ? solarYear - ann.year : null,
      title: `Giỗ ${relation ? relation.toLowerCase() + ' ' : ''}${person.name}`,
    });
  };

  // Bản thân
  if (!member.isAlive) {
    addAnniversary(member, '');
  } else {
    const birth = parseISODate(member.birthDate);
    if (birth) {
      push(annualOccurrencesInSolarYear({ calendar: DEATH_CALENDAR_SOLAR, day: birth.day, month: birth.month }, solarYear), {
        kind: 'sinhnhat',
        person: member,
        calendar: DEATH_CALENDAR_SOLAR,
        ordinal: solarYear - birth.year,
        title: `Sinh nhật ${member.name}`,
      });
    }
  }

  // Người thân trực hệ đã mất
  addAnniversary(membersById[member.fatherId], 'Cha');
  addAnniversary(membersById[member.motherId], 'Mẹ');
  const grandparentId = member.grandparent?.id;
  addAnniversary(membersById[grandparentId], 'Ông/Bà');

  // Việc họ
  events.forEach(e => {
    push(eventOccurrencesInSolarYear(e, solarYear), {
      kind: 'sukien',
      event: e,
      calendar: e.calendar,
      title: e.title,
    });
  });

  return rows.sort((a, b) => jdFromDate(a.solar.day, a.solar.month, a.solar.year)
    - jdFromDate(b.solar.day, b.solar.month, b.solar.year));
}

// Các mốc sắp tới kể từ hôm nay (dùng cho phần "nhắc nhở").
export function upcomingFrom(rows, todayParts, limit = 8) {
  const todayJd = jdFromDate(todayParts.day, todayParts.month, todayParts.year);
  return rows
    .filter(r => jdFromDate(r.solar.day, r.solar.month, r.solar.year) >= todayJd)
    .slice(0, limit)
    .map(r => ({
      ...r,
      daysAway: jdFromDate(r.solar.day, r.solar.month, r.solar.year) - todayJd,
    }));
}
