// Các tiện ích dùng chung để xử lý cây gia phả: làm phẳng dữ liệu, tính tuổi, thống kê.

export const EDUCATION_LEVELS = [
  'Chưa rõ',
  'Tiểu học',
  'THCS',
  'THPT',
  'Trung cấp',
  'Cao đẳng',
  'Đại học',
  'Thạc sĩ',
  'Tiến sĩ',
  'Khác'
];

export const getMaxGeneration = (node) => {
  if (!node) return 0;
  let max = node.generation || 1;
  if (node.children) {
    node.children.forEach(child => {
      const childMax = getMaxGeneration(child);
      if (childMax > max) max = childMax;
    });
  }
  return max;
};

export const flattenFamily = (node, parentId = '', parentName = 'Thủy tổ') => {
  if (!node) return [];
  let list = [{ ...node, parentId, parentName }];
  if (node.children && node.children.length > 0) {
    node.children.forEach(child => {
      list = list.concat(flattenFamily(child, node.id, node.name));
    });
  }
  return list;
};

// birthDate/deathDate dạng 'YYYY-MM-DD'. Dữ liệu cũ chỉ có năm sẽ không parse được -> trả về null.
export const calculateAge = (birthDate, deathDate, isAlive) => {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) return null;

  const end = (isAlive || !deathDate) ? new Date() : new Date(deathDate);
  if (isNaN(end.getTime())) return null;

  let age = end.getFullYear() - birth.getFullYear();
  const monthDiff = end.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && end.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
};

export const formatDateVN = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr; // dữ liệu cũ chỉ có năm -> hiển thị nguyên văn
  return d.toLocaleDateString('vi-VN');
};

const AGE_BRACKETS = [
  { label: '< 18 tuổi', min: 0, max: 17 },
  { label: '18 - 30 tuổi', min: 18, max: 30 },
  { label: '31 - 50 tuổi', min: 31, max: 50 },
  { label: '51 - 70 tuổi', min: 51, max: 70 },
  { label: '> 70 tuổi', min: 71, max: Infinity }
];

export const computeFamilyStats = (familyData) => {
  const members = flattenFamily(familyData);
  const total = members.length;
  const alive = members.filter(m => m.isAlive).length;
  const deceased = total - alive;

  const genderCounts = { 'Nam': 0, 'Nữ': 0, 'Chưa rõ': 0 };
  const inLawCounts = { 'Con dâu': 0, 'Con rể': 0 };
  const educationCounts = {};
  const regionCounts = {};
  const ageBrackets = AGE_BRACKETS.map(b => ({ ...b, count: 0 }));

  members.forEach(m => {
    if (m.gender === 'Nam') genderCounts['Nam']++;
    else if (m.gender === 'Nữ') genderCounts['Nữ']++;
    else genderCounts['Chưa rõ']++;

    if (m.spouse && m.spouse.trim()) {
      if (m.gender === 'Nam') inLawCounts['Con dâu']++;
      else if (m.gender === 'Nữ') inLawCounts['Con rể']++;
    }

    const edu = (m.education && m.education.trim()) ? m.education.trim() : 'Chưa rõ';
    educationCounts[edu] = (educationCounts[edu] || 0) + 1;

    const region = (m.currentProvince && m.currentProvince.trim()) ? m.currentProvince.trim() : 'Chưa rõ';
    regionCounts[region] = (regionCounts[region] || 0) + 1;

    const age = calculateAge(m.birthDate, m.deathDate, m.isAlive);
    if (age !== null) {
      const bracket = ageBrackets.find(b => age >= b.min && age <= b.max);
      if (bracket) bracket.count++;
    }
  });

  return { total, alive, deceased, genderCounts, inLawCounts, educationCounts, regionCounts, ageBrackets };
};
