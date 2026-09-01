// Âm lịch Việt Nam — chuyển đổi qua lại giữa dương lịch và âm lịch, kèm can chi.
//
// Dùng thuật toán thiên văn của Hồ Ngọc Đức (dựa trên Astronomical Algorithms của Jean Meeus),
// tính theo múi giờ +7 — đúng cách Việt Nam đặt lịch, nên KHÁC với âm lịch Trung Quốc ở một
// số năm (VD Tết 1985, 2007). Không dùng bảng tra sẵn nên chạy đúng cho mọi năm, kể cả các
// cụ đời trước mất từ thế kỷ 19.
//
// Vì sao cần: giỗ trong dòng họ tính theo NGÀY ÂM. Muốn biết "hôm nay có phải giỗ cụ nào
// không" thì phải quy ngày dương hôm nay về ngày âm rồi đối chiếu.

const PI = Math.PI;
const TIMEZONE = 7; // Việt Nam

const INT = (d) => Math.floor(d);

// Số ngày Julian của một ngày dương lịch (lịch Gregory, tự lùi về lịch Julius trước 1582).
export function jdFromDate(dd, mm, yy) {
  const a = INT((14 - mm) / 12);
  const y = yy + 4800 - a;
  const m = mm + 12 * a - 3;
  let jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - INT(y / 100) + INT(y / 400) - 32045;
  if (jd < 2299161) {
    jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - 32083;
  }
  return jd;
}

// Ngược lại: từ số ngày Julian ra [ngày, tháng, năm] dương lịch.
export function jdToDate(jd) {
  let a, b, c;
  if (jd > 2299160) {
    a = jd + 32044;
    b = INT((4 * a + 3) / 146097);
    c = a - INT((b * 146097) / 4);
  } else {
    b = 0;
    c = jd + 32082;
  }
  const d = INT((4 * c + 3) / 1461);
  const e = c - INT((1461 * d) / 4);
  const m = INT((5 * e + 2) / 153);
  const day = e - INT((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * INT(m / 10);
  const year = b * 100 + d - 4800 + INT(m / 10);
  return [day, month, year];
}

// Thời điểm điểm sóc (trăng non) thứ k tính từ 1/1/1900, theo ngày Julian.
function newMoon(k) {
  const T = k / 1236.85;
  const T2 = T * T;
  const T3 = T2 * T;
  const dr = PI / 180;
  let Jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
  Jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
  const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
  const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
  const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
  let C1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M);
  C1 = C1 - 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(dr * 2 * Mpr);
  C1 = C1 - 0.0004 * Math.sin(dr * 3 * Mpr);
  C1 = C1 + 0.0104 * Math.sin(dr * 2 * F) - 0.0051 * Math.sin(dr * (M + Mpr));
  C1 = C1 - 0.0074 * Math.sin(dr * (M - Mpr)) + 0.0004 * Math.sin(dr * (2 * F + M));
  C1 = C1 - 0.0004 * Math.sin(dr * (2 * F - M)) - 0.0006 * Math.sin(dr * (2 * F + Mpr));
  C1 = C1 + 0.001 * Math.sin(dr * (2 * F - Mpr)) + 0.0005 * Math.sin(dr * (2 * Mpr + M));
  let deltat;
  if (T < -11) {
    deltat = 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3;
  } else {
    deltat = -0.000278 + 0.000265 * T + 0.000262 * T2;
  }
  return Jd1 + C1 - deltat;
}

// Kinh độ mặt trời (radian) tại một thời điểm Julian.
function sunLongitude(jdn) {
  const T = (jdn - 2451545.0) / 36525;
  const T2 = T * T;
  const dr = PI / 180;
  const M = 357.5291 + 35999.0503 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
  const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
  let DL = (1.9146 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M);
  DL = DL + (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) + 0.00029 * Math.sin(dr * 3 * M);
  let L = L0 + DL;
  L = L * dr;
  L = L - PI * 2 * INT(L / (PI * 2));
  return L;
}

// Kinh độ mặt trời quy về 12 "cung" (0-11) — dùng để xác định tháng 11 âm và tháng nhuận.
function getSunLongitude(dayNumber, timeZone) {
  return INT((sunLongitude(dayNumber - 0.5 - timeZone / 24) / PI) * 6);
}

function getNewMoonDay(k, timeZone) {
  return INT(newMoon(k) + 0.5 + timeZone / 24);
}

// Ngày bắt đầu tháng 11 âm lịch của năm dương yy (tháng chứa đông chí).
function getLunarMonth11(yy, timeZone) {
  const off = jdFromDate(31, 12, yy) - 2415021;
  const k = INT(off / 29.530588853);
  let nm = getNewMoonDay(k, timeZone);
  const sunLong = getSunLongitude(nm, timeZone);
  if (sunLong >= 9) {
    nm = getNewMoonDay(k - 1, timeZone);
  }
  return nm;
}

// Vị trí tháng nhuận trong năm âm lịch nhuận.
function getLeapMonthOffset(a11, timeZone) {
  const k = INT((a11 - 2415021.076998695) / 29.530588853 + 0.5);
  let last = 0;
  let i = 1;
  let arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
  do {
    last = arc;
    i += 1;
    arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
  } while (arc !== last && i < 14);
  return i - 1;
}

// Dương -> Âm. Trả về { day, month, year, leap } (leap = true nếu là tháng nhuận).
export function solarToLunar(dd, mm, yy, timeZone = TIMEZONE) {
  const dayNumber = jdFromDate(dd, mm, yy);
  const k = INT((dayNumber - 2415021.076998695) / 29.530588853);
  let monthStart = getNewMoonDay(k + 1, timeZone);
  if (monthStart > dayNumber) {
    monthStart = getNewMoonDay(k, timeZone);
  }
  let a11 = getLunarMonth11(yy, timeZone);
  let b11 = a11;
  let lunarYear;
  if (a11 >= monthStart) {
    lunarYear = yy;
    a11 = getLunarMonth11(yy - 1, timeZone);
  } else {
    lunarYear = yy + 1;
    b11 = getLunarMonth11(yy + 1, timeZone);
  }
  const lunarDay = dayNumber - monthStart + 1;
  const diff = INT((monthStart - a11) / 29);
  let lunarLeap = 0;
  let lunarMonth = diff + 11;
  if (b11 - a11 > 365) {
    const leapMonthDiff = getLeapMonthOffset(a11, timeZone);
    if (diff >= leapMonthDiff) {
      lunarMonth = diff + 10;
      if (diff === leapMonthDiff) lunarLeap = 1;
    }
  }
  if (lunarMonth > 12) lunarMonth -= 12;
  if (lunarMonth >= 11 && diff < 4) lunarYear -= 1;
  return { day: lunarDay, month: lunarMonth, year: lunarYear, leap: lunarLeap === 1 };
}

// Âm -> Dương. Trả về { day, month, year }, hoặc null nếu ngày âm đó không tồn tại
// (VD đòi tháng nhuận ở một năm không nhuận).
export function lunarToSolar(lunarDay, lunarMonth, lunarYear, lunarLeap = false, timeZone = TIMEZONE) {
  let a11, b11;
  if (lunarMonth < 11) {
    a11 = getLunarMonth11(lunarYear - 1, timeZone);
    b11 = getLunarMonth11(lunarYear, timeZone);
  } else {
    a11 = getLunarMonth11(lunarYear, timeZone);
    b11 = getLunarMonth11(lunarYear + 1, timeZone);
  }
  let off = lunarMonth - 11;
  if (off < 0) off += 12;
  if (b11 - a11 > 365) {
    const leapOff = getLeapMonthOffset(a11, timeZone);
    let leapMonth = leapOff - 2;
    if (leapMonth < 0) leapMonth += 12;
    if (lunarLeap && lunarMonth !== leapMonth) return null;
    if (lunarLeap || off >= leapOff) off += 1;
  }
  const k = INT(0.5 + (a11 - 2415021.076998695) / 29.530588853);
  const monthStart = getNewMoonDay(k + off, timeZone);
  const [day, month, year] = jdToDate(monthStart + lunarDay - 1);
  return { day, month, year };
}

// Số ngày của một tháng âm lịch (29 hoặc 30) — cần để biết tháng thiếu/đủ, và để xử lý
// ngày giỗ mùng 30 rơi vào năm mà tháng đó chỉ có 29 ngày.
export function lunarMonthLength(lunarMonth, lunarYear, lunarLeap = false, timeZone = TIMEZONE) {
  const start = lunarToSolar(1, lunarMonth, lunarYear, lunarLeap, timeZone);
  if (!start) return 0;
  const d30 = lunarToSolar(30, lunarMonth, lunarYear, lunarLeap, timeZone);
  if (!d30) return 29;
  // Nếu "ngày 30" quy ra dương lịch lại rơi đúng 30 ngày sau mùng 1 thì tháng đủ 30 ngày.
  const jdStart = jdFromDate(start.day, start.month, start.year);
  const jd30 = jdFromDate(d30.day, d30.month, d30.year);
  return jd30 - jdStart === 29 ? 30 : 29;
}

export const CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
export const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];

// Can chi của NĂM âm lịch, VD 2026 -> "Bính Ngọ".
export function canChiYear(lunarYear) {
  return `${CAN[(lunarYear + 6) % 10]} ${CHI[(lunarYear + 8) % 12]}`;
}

// Can chi của NGÀY, tính từ số ngày Julian.
export function canChiDay(dd, mm, yy) {
  const jd = jdFromDate(dd, mm, yy);
  return `${CAN[(jd + 9) % 10]} ${CHI[(jd + 1) % 12]}`;
}

// Can chi của THÁNG âm lịch.
export function canChiMonth(lunarMonth, lunarYear) {
  return `${CAN[(lunarYear * 12 + lunarMonth + 3) % 10]} ${CHI[(lunarMonth + 1) % 12]}`;
}

export const WEEKDAY_VN = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

// ---- Tiện ích nhỏ dùng chung cho phần lịch ----

// "2026-09-01" -> { day: 1, month: 9, year: 2026 }. Trả null nếu chuỗi không hợp lệ.
// Cố ý KHÔNG dùng new Date(chuỗi) vì trình duyệt hiểu "2026-09-01" là giờ UTC, ở múi giờ
// Việt Nam sẽ bị lùi thành ngày 31/8 — sai đúng 1 ngày, hỏng cả việc so ngày giỗ.
export function parseISODate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { day, month, year };
}

export function toISODate({ day, month, year }) {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// Ngày hôm nay theo giờ máy người dùng, dạng { day, month, year } (không dính lệch UTC).
export function todayParts(now = new Date()) {
  return { day: now.getDate(), month: now.getMonth() + 1, year: now.getFullYear() };
}

export function formatSolarVN({ day, month, year }) {
  return `${day}/${month}/${year}`;
}

// "15/8" hoặc "15/8 (nhuận)" — cách người Việt đọc ngày âm.
export function formatLunarVN({ day, month, leap }) {
  return `${day}/${month}${leap ? ' (nhuận)' : ''}`;
}

// Năm âm lịch này nhuận tháng mấy? Trả 0 nếu không nhuận.
//
// Không dùng trực tiếp cờ leap của lunarToSolar() được: khi năm KHÔNG nhuận, hàm đó lặng lẽ
// bỏ qua cờ leap và vẫn trả về ngày của tháng thường — nên không thể dùng nó để dò tháng nhuận.
// Ở đây dò bằng chính solarToLunar() (đã đối chiếu đúng với các năm nhuận đã biết của lịch VN:
// 2017/6, 2020/4, 2023/2, 2025/6, 2028/5, 2031/3, 2033/11).
const leapMonthCache = new Map();
export function leapMonthOfLunarYear(lunarYear, timeZone = TIMEZONE) {
  const cacheKey = `${lunarYear}|${timeZone}`;
  if (leapMonthCache.has(cacheKey)) return leapMonthCache.get(cacheKey);

  const start = lunarToSolar(1, 1, lunarYear, false, timeZone);
  let result = 0;
  if (start) {
    const jd0 = jdFromDate(start.day, start.month, start.year);
    for (let i = 0; i < 400; i++) {
      const [d, m, y] = jdToDate(jd0 + i);
      const l = solarToLunar(d, m, y, timeZone);
      if (l.year > lunarYear) break;
      if (l.year === lunarYear && l.leap) { result = l.month; break; }
    }
  }
  leapMonthCache.set(cacheKey, result);
  return result;
}

export function isLeapMonth(lunarMonth, lunarYear, timeZone = TIMEZONE) {
  return leapMonthOfLunarYear(lunarYear, timeZone) === lunarMonth;
}

// Ngày GIỖ (hoặc bất kỳ ngày kỷ niệm âm lịch nào) rơi vào ngày dương lịch nào của một năm âm.
//
// Xử lý hai tình huống thực tế mà chuyển đổi thẳng sẽ ra sai:
//  1. Giỗ ngày 30 nhưng năm nay tháng đó THIẾU (chỉ 29 ngày) — theo lệ thì làm giỗ ngày 29,
//     chứ không đẩy sang mùng 1 tháng sau như phép chuyển đổi thô sẽ làm.
//  2. Người mất vào THÁNG NHUẬN: những năm sau hầu hết không có tháng nhuận đó nữa, nên giỗ
//     được làm vào tháng thường cùng số.
export function lunarAnniversaryToSolar(lunarDay, lunarMonth, lunarYear, timeZone = TIMEZONE) {
  const len = lunarMonthLength(lunarMonth, lunarYear, false, timeZone);
  const day = len > 0 && lunarDay > len ? len : lunarDay;
  return lunarToSolar(day, lunarMonth, lunarYear, false, timeZone);
}
