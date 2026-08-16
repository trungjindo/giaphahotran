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

// Mã định danh phả hệ theo hệ thống d'Aboville: gốc = "1", con thứ k của một người
// mang mã "<mã cha>.<k>" (đánh số theo thứ tự khai báo). Giúp tra cứu, đối chiếu
// nhanh vị trí một người trong cây mà không cần mở rộng toàn bộ sơ đồ.
export const buildFamilyCodeMap = (node, prefix = '1') => {
  const map = {};
  if (!node) return map;
  map[node.id] = prefix;
  if (node.children) {
    node.children.forEach((child, idx) => {
      Object.assign(map, buildFamilyCodeMap(child, `${prefix}.${idx + 1}`));
    });
  }
  return map;
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

// Danh sách đầy đủ từng thành viên kèm Cha/Mẹ suy ra từ người cha/mẹ trong cây (huyết thống)
// và vợ/chồng ghi trên hồ sơ người đó, cùng mã định danh và danh sách tên các con.
export const buildDescendantList = (root) => {
  if (!root) return [];
  const flat = flattenFamily(root);
  const codeMap = buildFamilyCodeMap(root);
  const byId = Object.fromEntries(flat.map(m => [m.id, m]));

  return flat.map(m => {
    const parent = byId[m.parentId];
    let father = '';
    let mother = '';
    let fatherId = null;
    let motherId = null;
    if (parent) {
      // Chỉ người cha/mẹ TRÙNG VỚI nút cha trong cây (parent) mới có hồ sơ riêng để bấm vào —
      // người còn lại chỉ là tên vợ/chồng ghi chú trên hồ sơ (spouse), không phải 1 nút trong
      // cây nên không có ID/hồ sơ để liên kết tới.
      if (parent.gender === 'Nữ') {
        mother = parent.name;
        motherId = parent.id;
        father = parent.spouse || '';
      } else {
        father = parent.name;
        fatherId = parent.id;
        mother = parent.spouse || '';
      }
    }

    // Ông/Bà: cha/mẹ của người cha/mẹ (nút cha) trong cây — dùng chung "Ông/Bà" không phân biệt
    // nội/ngoại, giống cách utils/family.js#describeRelationship đang xử lý bậc cách 2 đời.
    const grandparentNode = parent ? byId[parent.parentId] : null;
    const grandparent = grandparentNode ? { id: grandparentNode.id, name: grandparentNode.name } : null;

    // Anh/Chị/Em ruột: các con khác của cùng 1 cha/mẹ (nút cha trong cây), trừ chính mình.
    const siblings = parent
      ? (parent.children || []).filter(c => c.id !== m.id).map(c => ({ id: c.id, name: c.name }))
      : [];

    // Cháu: con của các con.
    const grandchildren = (m.children || []).flatMap(
      c => (c.children || []).map(gc => ({ id: gc.id, name: gc.name }))
    );

    return {
      ...m,
      code: codeMap[m.id] || '',
      father,
      mother,
      fatherId,
      motherId,
      grandparent,
      siblings,
      grandchildren,
      childrenNames: (m.children || []).map(c => c.name).join(', ')
    };
  });
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

// Xác định quan hệ xưng hô giữa 2 người bất kỳ trong cây, dựa trên tổ tiên chung gần nhất
// (lowest common ancestor) và khoảng cách đời từ mỗi người tới tổ tiên đó. Chỉ áp dụng cho
// quan hệ huyết thống theo nhánh cha/con đã lưu trong cây (vợ/chồng chỉ là tên ghi chú trên
// hồ sơ, không phải node riêng nên không so sánh được qua hàm này).
const genderTerm = (gender, maleTerm, femaleTerm, fallback) => {
  if (gender === 'Nam') return maleTerm;
  if (gender === 'Nữ') return femaleTerm;
  return fallback ?? maleTerm;
};

export const describeRelationship = (idA, idB, root) => {
  if (!root || !idA || !idB || idA === idB) return null;
  const flat = flattenFamily(root);
  const byId = Object.fromEntries(flat.map(m => [m.id, m]));
  const memberA = byId[idA];
  const memberB = byId[idB];
  if (!memberA || !memberB) return null;

  const parentOf = Object.fromEntries(flat.map(m => [m.id, m.parentId || null]));
  const chainOf = (id) => {
    const chain = [];
    let cur = id;
    while (cur) { chain.push(cur); cur = parentOf[cur] || null; }
    return chain;
  };

  const chainA = chainOf(idA);
  const chainB = chainOf(idB);
  const indexInB = new Map(chainB.map((id, i) => [id, i]));

  let lcaId = null, depthA = -1, depthB = -1;
  for (let i = 0; i < chainA.length; i++) {
    if (indexInB.has(chainA[i])) { lcaId = chainA[i]; depthA = i; depthB = indexInB.get(chainA[i]); break; }
  }
  if (lcaId === null) return null; // không tìm được tổ tiên chung (không nên xảy ra với 1 cây duy nhất)

  const lca = byId[lcaId];
  const genGap = Math.abs(depthA - depthB);
  const aIsCloserToLca = depthA <= depthB;

  let aCallsB, bCallsA, relationLabel;

  if (genGap === 0) {
    const isSiblings = depthA === 1 && depthB === 1;
    const qualifier = isSiblings ? 'ruột' : 'họ';
    const bothHaveBirth = memberA.birthDate && memberB.birthDate;
    if (bothHaveBirth) {
      const aIsOlder = new Date(memberA.birthDate) <= new Date(memberB.birthDate);
      const olderTerm = genderTerm((aIsOlder ? memberA : memberB).gender, 'Anh', 'Chị');
      aCallsB = aIsOlder ? 'Em' : olderTerm;
      bCallsA = aIsOlder ? olderTerm : 'Em';
      relationLabel = `${olderTerm} em ${qualifier}`;
    } else {
      aCallsB = `Anh/Chị/Em ${qualifier}`;
      bCallsA = `Anh/Chị/Em ${qualifier}`;
      relationLabel = `Anh/chị em ${qualifier} (chưa rõ ai lớn tuổi hơn do thiếu ngày sinh)`;
    }
  } else if (genGap === 1) {
    const elderMember = aIsCloserToLca ? memberA : memberB;
    const youngerId = aIsCloserToLca ? idB : idA;
    const isDirectParentChild = Math.min(depthA, depthB) === 0;
    if (isDirectParentChild) {
      const term = genderTerm(elderMember.gender, 'Cha', 'Mẹ');
      relationLabel = `${term} - Con`;
      if (aIsCloserToLca) { aCallsB = 'Con'; bCallsA = term; } else { bCallsA = 'Con'; aCallsB = term; }
    } else {
      const youngerChain = chainOf(youngerId);
      const youngerParent = byId[youngerChain[Math.max(depthA, depthB) - 1]];
      let term;
      if (youngerParent?.birthDate && elderMember.birthDate) {
        term = new Date(elderMember.birthDate) < new Date(youngerParent.birthDate)
          ? 'Bác'
          : genderTerm(elderMember.gender, 'Chú', 'Cô');
      } else {
        term = genderTerm(elderMember.gender, 'Chú/Bác', 'Cô/Bác');
      }
      relationLabel = `${term} - Cháu`;
      if (aIsCloserToLca) { aCallsB = 'Cháu'; bCallsA = term; } else { bCallsA = 'Cháu'; aCallsB = term; }
    }
  } else if (genGap === 2) {
    const elderMember = aIsCloserToLca ? memberA : memberB;
    const isDirect = Math.min(depthA, depthB) === 0;
    const term = genderTerm(elderMember.gender, 'Ông', 'Bà');
    relationLabel = isDirect ? `${term} - Cháu` : `${term} (vai trên, cách 2 đời) - Cháu`;
    if (aIsCloserToLca) { aCallsB = 'Cháu'; bCallsA = term; } else { bCallsA = 'Cháu'; aCallsB = term; }
  } else if (genGap === 3) {
    const elderMember = aIsCloserToLca ? memberA : memberB;
    const term = genderTerm(elderMember.gender, 'Cụ ông', 'Cụ bà', 'Cụ');
    relationLabel = `${term} - Chắt`;
    if (aIsCloserToLca) { aCallsB = 'Chắt'; bCallsA = term; } else { bCallsA = 'Chắt'; aCallsB = term; }
  } else {
    relationLabel = `Vai trên cách ${genGap} đời - Vai dưới cách ${genGap} đời`;
    if (aIsCloserToLca) { aCallsB = `Vai dưới (cách ${genGap} đời)`; bCallsA = `Vai trên (cách ${genGap} đời)`; }
    else { bCallsA = `Vai dưới (cách ${genGap} đời)`; aCallsB = `Vai trên (cách ${genGap} đời)`; }
  }

  return { lca, genGap, relationLabel, aCallsB, bCallsA };
};
