import React, { useState, useContext, useRef, useMemo, useEffect } from 'react';
import { AppContext } from '../store';
import * as XLSX from 'xlsx';
import { flattenFamily, buildDescendantList, EDUCATION_LEVELS, buildFamilyCodeMap } from '../utils/family';
import { getAvatarPlaceholder } from '../utils/avatar';
import { apiUpload, apiRequest } from '../api';
import MemberProfileModal from './MemberProfileModal';

// Các quan hệ có thể chọn khi "Gắn Thành Viên Đã Có" — nhãn dùng chung với mục "Người Thân Liên
// Quan" trong hồ sơ thành viên (Ông/Bà, Cha, Mẹ, Anh/Chị/Em, Con, Cháu) để nhất quán thuật ngữ.
const RELATION_OPTIONS = [
  { value: 'ong_ba', label: 'Ông/Bà' },
  { value: 'cha', label: 'Cha' },
  { value: 'me', label: 'Mẹ' },
  { value: 'anh_chi_em', label: 'Anh/Chị/Em' },
  { value: 'con', label: 'Con' },
  { value: 'chau', label: 'Cháu' },
];

const emptyFormData = {
  id: '',
  name: '',
  avatar: '',
  generation: 1,
  gender: 'Nam',
  birthDate: '',
  deathDate: '',
  isAlive: true,
  isMainLineage: false,
  isRegistered: false,
  spouse: '',
  education: 'Chưa rõ',
  currentProvince: '',
  currentWard: '',
  oldAddress: '',
  phone: '',
  zalo: '',
  occupation: '',
  description: '',
  achievementsStr: ''
};

const AdminFamilyTree = () => {
  const { familyData, setFamilyData, token } = useContext(AppContext);
  const fileInputRef = useRef(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [addSubMode, setAddSubMode] = useState('create'); // 'create' (thành viên mới) hoặc 'attach' (thành viên đã có)
  const [attachRefInputValue, setAttachRefInputValue] = useState('');
  const [attachRefMemberId, setAttachRefMemberId] = useState('');
  const [attachRelation, setAttachRelation] = useState('con'); // ong_ba | cha | me | anh_chi_em | con | chau
  const [attachChildChoiceId, setAttachChildChoiceId] = useState('');
  const [attachChildOrderIndex, setAttachChildOrderIndex] = useState(null); // null = mặc định (cuối cùng)
  const [attachMotherChoice, setAttachMotherChoice] = useState(''); // tên vợ được chọn làm mẹ, khi cha có ≥2 vợ
  const [attachInputValue, setAttachInputValue] = useState('');
  const [attachSelectedId, setAttachSelectedId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingMemberId, setViewingMemberId] = useState(null);
  const [isWifeModalOpen, setIsWifeModalOpen] = useState(false);
  const [wifeRefMemberId, setWifeRefMemberId] = useState('');
  const [wifeName, setWifeName] = useState('');
  const [wifeOrder, setWifeOrder] = useState(1);
  const [childOrder, setChildOrder] = useState([]); // mảng id các con, đúng thứ tự sinh — chỉnh sửa khi Sửa 1 thành viên
  const [heirChildId, setHeirChildId] = useState(''); // id người con được chọn làm đích tôn (hương hỏa đời tiếp), '' = chưa chọn
  const [chiList, setChiList] = useState([]);

  const [formData, setFormData] = useState(emptyFormData);

  useEffect(() => {
    apiRequest('chi.php').then(setChiList).catch(() => {});
  }, []);

  // 1. Flatten Tree for Table & Excel
  const flatList = familyData ? flattenFamily(familyData) : [];
  const codeMap = useMemo(() => familyData ? buildFamilyCodeMap(familyData) : {}, [familyData]);
  const descendantList = useMemo(() => buildDescendantList(familyData), [familyData]);

  const provinceSuggestions = useMemo(
    () => [...new Set(flatList.map(m => m.currentProvince).filter(Boolean))],
    [flatList]
  );
  const wardSuggestions = useMemo(
    () => [...new Set(flatList.map(m => m.currentWard).filter(Boolean))],
    [flatList]
  );

  // Tìm kiếm thành viên trong bảng: theo tên, mã định danh, SĐT, tỉnh/thành, nghề nghiệp.
  const filteredList = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return flatList;
    return flatList.filter(m => (
      (m.name || '').toLowerCase().includes(q) ||
      (codeMap[m.id] || '').toLowerCase().includes(q) ||
      (m.phone || '').includes(q) ||
      (m.currentProvince || '').toLowerCase().includes(q) ||
      (m.occupation || '').toLowerCase().includes(q)
    ));
  }, [flatList, searchTerm, codeMap]);

  // Nhãn hiển thị cho ô chọn "cha/mẹ" khi tạo thành viên mới thủ công — kèm mã định danh để
  // phân biệt các thành viên trùng tên.
  const formatParentLabel = (m) => `${m.name} (Đời ${m.generation}, mã ${codeMap[m.id] || m.id})`;
  const parentLabelToMember = useMemo(() => {
    const map = new Map();
    flatList.forEach(m => map.set(formatParentLabel(m), m));
    return map;
  }, [flatList, codeMap]);

  // Thành viên Đời 11/12 hiện đang ghi "Đã mất" — dùng cho banner dọn dữ liệu 1 lần bên dưới.
  const pendingAliveFix = useMemo(
    () => flatList.filter(m => (m.generation === 11 || m.generation === 12) && !m.isAlive),
    [flatList]
  );

  // Tra cứu nhanh 1 thành viên theo id (bản gốc trong cây, còn nguyên .children lồng nhau) —
  // dùng cho toàn bộ logic tính toán quan hệ bên dưới.
  const memberById = useMemo(() => {
    const map = new Map();
    flatList.forEach(m => map.set(m.id, m));
    return map;
  }, [flatList]);

  const getAncestorIds = (id) => {
    const ids = new Set();
    let current = memberById.get(id);
    while (current && current.parentId) {
      ids.add(current.parentId);
      current = memberById.get(current.parentId);
    }
    return ids;
  };

  const getDescendantIds = (id) => {
    const ids = new Set();
    const node = memberById.get(id);
    const walk = (n) => (n?.children || []).forEach(c => { ids.add(c.id); walk(c); });
    walk(node);
    return ids;
  };

  // Tính vị trí gắn khi X sẽ trở thành CHA/MẸ của childId: X đứng ngang hàng với cha/mẹ HIỆN TẠI
  // của childId (tức làm con của ông/bà của childId), còn childId chuyển thành con của X. Nếu
  // childId hiện không có cha/mẹ (chính là Thủy tổ), hoặc cha/mẹ hiện tại của childId lại chính
  // là Thủy tổ (không có "ông/bà" để X đứng ngang hàng), X sẽ trở thành Thủy Tổ MỚI của cả cây.
  const planInsertAbove = (childId) => {
    const child = memberById.get(childId);
    if (!child) return { mode: 'error', message: 'Không xác định được vị trí liên quan.' };
    if (!child.parentId) return { mode: 'become_root', targetChildId: childId };
    const oldParent = memberById.get(child.parentId);
    if (!oldParent || !oldParent.parentId) return { mode: 'become_root', targetChildId: child.parentId };
    return { mode: 'insert_above', targetChildId: childId, newParentId: oldParent.parentId };
  };

  const attachRefMember = memberById.get(attachRefMemberId) || null;

  // Kế hoạch gắn dựa trên quan hệ đã chọn so với "thành viên tham chiếu" — trả về đủ thông tin để
  // vừa lọc danh sách gợi ý (tránh vòng lặp trong cây) vừa thực hiện thao tác khi xác nhận.
  const attachPlan = useMemo(() => {
    if (!attachRefMember) return null;
    if (attachRelation === 'con') {
      return { mode: 'simple', parentId: attachRefMember.id };
    }
    if (attachRelation === 'anh_chi_em') {
      if (!attachRefMember.parentId) return { mode: 'error', message: `${attachRefMember.name} là Thủy tổ, không có anh/chị/em.` };
      return { mode: 'simple', parentId: attachRefMember.parentId };
    }
    if (attachRelation === 'chau') {
      const children = attachRefMember.children || [];
      if (children.length === 0) return { mode: 'error', message: `${attachRefMember.name} chưa có người con nào để làm cháu qua.` };
      if (children.length === 1) return { mode: 'simple', parentId: children[0].id };
      if (!attachChildChoiceId) return { mode: 'need_child_choice', children };
      return { mode: 'simple', parentId: attachChildChoiceId };
    }
    if (attachRelation === 'cha' || attachRelation === 'me') {
      return planInsertAbove(attachRefMember.id);
    }
    if (attachRelation === 'ong_ba') {
      if (!attachRefMember.parentId) return { mode: 'error', message: `${attachRefMember.name} không có cha/mẹ nên không xác định được ông/bà.` };
      return planInsertAbove(attachRefMember.parentId);
    }
    return { mode: 'error', message: 'Quan hệ không hợp lệ.' };
  }, [attachRefMember, attachRelation, attachChildChoiceId, memberById]);

  // Danh sách thành viên ĐÃ CÓ SẴN trong cây có thể "gắn" theo quan hệ đã chọn — dùng khi 1 người
  // đã được nhập vào hệ thống (VD: lúc import Excel đặt nhầm chỗ, hoặc lúc đó chưa biết rõ quan
  // hệ nên tạm để đâu đó) nhưng giờ muốn di chuyển đúng vị trí, thay vì phải xóa rồi tạo lại từ
  // đầu (mất hết dữ liệu con cháu của người đó). Loại trừ những lựa chọn sẽ tạo vòng lặp vô hạn
  // trong cây — quy tắc khác nhau tuỳ chế độ:
  // - "simple" (Con/Anh Chị Em/Cháu): X sẽ làm con của parentId -> không được chọn parentId hoặc
  //   TỔ TIÊN của parentId (nhưng CON CHÁU của parentId thì được, chỉ là "đôn" lên gần hơn).
  // - "insert_above"/"become_root" (Cha/Mẹ/Ông Bà): X sẽ trở thành CHA/MẸ MỚI của targetChildId
  //   -> không được chọn targetChildId, TỔ TIÊN, hay CON CHÁU của targetChildId (cả 2 chiều đều
  //   tạo vòng lặp vì X vừa là tổ tiên vừa nằm trong chính nhánh đó).
  const attachableMembers = useMemo(() => {
    if (!familyData || !attachPlan) return [];
    if (attachPlan.mode === 'simple') {
      const pid = attachPlan.parentId;
      const anc = getAncestorIds(pid);
      return flatList.filter(m => m.id !== pid && !anc.has(m.id) && m.parentId !== pid);
    }
    if (attachPlan.mode === 'insert_above' || attachPlan.mode === 'become_root') {
      const tid = attachPlan.targetChildId;
      const anc = getAncestorIds(tid);
      const desc = getDescendantIds(tid);
      return flatList.filter(m => m.id !== tid && !anc.has(m.id) && !desc.has(m.id));
    }
    return [];
  }, [flatList, attachPlan, familyData, memberById]);

  const attachLabelToMember = useMemo(() => {
    const map = new Map();
    attachableMembers.forEach(m => map.set(formatParentLabel(m), m));
    return map;
  }, [attachableMembers]);

  const handleAttachInputChange = (value) => {
    setAttachInputValue(value);
    const found = attachLabelToMember.get(value);
    setAttachSelectedId(found ? found.id : '');
  };

  const handleAttachRefInputChange = (value) => {
    setAttachRefInputValue(value);
    const found = parentLabelToMember.get(value);
    setAttachRefMemberId(found ? found.id : '');
    setAttachChildChoiceId('');
    setAttachChildOrderIndex(null);
    setAttachMotherChoice('');
    setAttachInputValue('');
    setAttachSelectedId('');
  };

  const handleRelationChange = (value) => {
    setAttachRelation(value);
    setAttachChildChoiceId('');
    setAttachChildOrderIndex(null);
    setAttachMotherChoice('');
    setAttachInputValue('');
    setAttachSelectedId('');
  };

  const selectedAttachMember = attachableMembers.find(m => m.id === attachSelectedId) || null;

  const countDescendants = (node) => {
    let count = 0;
    (node.children || []).forEach(c => { count += 1 + countDescendants(c); });
    return count;
  };

  // 2. EXCEL EXPORT / IMPORT
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        "ID": "root_1",
        "ParentID (Mã Cha)": "",
        "Họ Tên": "Trần Đình Khởi",
        "Đời": 1,
        "Giới Tính (Nam/Nữ)": "Nam",
        "Tình Trạng (Sống/Mất)": "Mất",
        "Đích Tôn (Có/Không)": "Có",
        "Đã Đăng Ký Suất Đinh (Có/Không)": "Có",
        "Ngày Sinh (YYYY-MM-DD)": "1850-01-01",
        "Ngày Mất (YYYY-MM-DD)": "1920-01-01",
        "Vợ/Chồng": "Nguyễn Thị Hoa",
        "Học Vấn": "Chưa rõ",
        "Nghề Nghiệp": "Hương sư",
        "Tỉnh/Thành Hiện Nay": "Nam Định",
        "Phường/Xã Hiện Nay": "Phường Vị Hoàng",
        "Địa Chỉ Cũ": "Làng Vị Xuyên, phủ Xuân Trường, tỉnh Nam Định (địa danh xưa)",
        "Số Điện Thoại": "",
        "Zalo": "",
        "Tiểu Sử": "Thủy tổ dòng họ",
        "Thành Tựu (cách nhau bởi ;)": "Khai sáng dòng họ",
        "Hình Đại Diện (Link)": "https://..."
      },
      {
        "ID": "gen_2_1",
        "ParentID (Mã Cha)": "root_1",
        "Họ Tên": "Trần Đình A",
        "Đời": 2,
        "Giới Tính (Nam/Nữ)": "Nam",
        "Tình Trạng (Sống/Mất)": "Mất",
        "Đích Tôn (Có/Không)": "Có",
        "Đã Đăng Ký Suất Đinh (Có/Không)": "Có",
        "Ngày Sinh (YYYY-MM-DD)": "1880-03-12",
        "Ngày Mất (YYYY-MM-DD)": "1950-06-20",
        "Vợ/Chồng": "Lê Thị Bích",
        "Học Vấn": "Chưa rõ",
        "Nghề Nghiệp": "Trưởng tộc",
        "Tỉnh/Thành Hiện Nay": "Nam Định",
        "Phường/Xã Hiện Nay": "Phường Vị Hoàng",
        "Địa Chỉ Cũ": "Làng Vị Xuyên, phủ Xuân Trường, tỉnh Nam Định (địa danh xưa)",
        "Số Điện Thoại": "",
        "Zalo": "",
        "Tiểu Sử": "Người xây nhà thờ họ",
        "Thành Tựu (cách nhau bởi ;)": "Đỗ tú tài",
        "Hình Đại Diện (Link)": ""
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template_GiaPha");
    XLSX.writeFile(wb, "Template_NhapLieu_GiaPha.xlsx");
  };

  const handleExportExcel = () => {
    if (!familyData) return alert("Không có dữ liệu để xuất!");
    
    // Chuyển đổi dữ liệu sang định dạng Excel thân thiện
    const excelData = flatList.map(member => ({
      "ID": member.id,
      "ParentID (Mã Cha)": member.parentId || "",
      "Họ Tên": member.name || "",
      "Đời": member.generation || 1,
      "Giới Tính (Nam/Nữ)": member.gender || "",
      "Tình Trạng (Sống/Mất)": member.isAlive ? "Sống" : "Mất",
      "Đích Tôn (Có/Không)": member.isMainLineage ? "Có" : "Không",
      "Đã Đăng Ký Suất Đinh (Có/Không)": member.isRegistered ? "Có" : "Không",
      "Ngày Sinh (YYYY-MM-DD)": member.birthDate || "",
      "Ngày Mất (YYYY-MM-DD)": member.deathDate || "",
      "Vợ/Chồng": member.spouses && member.spouses.length > 0
        ? member.spouses.slice().sort((a, b) => (a.order || 0) - (b.order || 0)).map(s => s.name).join('; ')
        : "",
      "Học Vấn": member.education || "",
      "Nghề Nghiệp": member.occupation || "",
      "Tỉnh/Thành Hiện Nay": member.currentProvince || "",
      "Phường/Xã Hiện Nay": member.currentWard || "",
      "Địa Chỉ Cũ": member.oldAddress || "",
      "Số Điện Thoại": member.phone || "",
      "Zalo": member.zalo || "",
      "Tiểu Sử": member.description || "",
      "Thành Tựu (cách nhau bởi ;)": member.achievements ? member.achievements.join(';') : "",
      "Hình Đại Diện (Link)": member.avatar || ""
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "GiaPha");
    XLSX.writeFile(wb, "DanhSach_GiaPha.xlsx");
  };

  const handleImportClick = () => fileInputRef.current.click();
  
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);

        if (json.length === 0) {
          return alert("File Excel trống!");
        }

        // Tái tạo lại cấu trúc cây từ Flat JSON
        const buildTree = (dataList) => {
          // Chuẩn hóa dữ liệu
          const normalizedList = dataList.map(row => ({
            id: row["ID"] ? row["ID"].toString() : 'gen_' + Date.now() + Math.random(),
            parentId: row["ParentID (Mã Cha)"] ? row["ParentID (Mã Cha)"].toString() : "",
            name: row["Họ Tên"] || "Không tên",
            generation: parseInt(row["Đời"]) || 1,
            gender: row["Giới Tính (Nam/Nữ)"] === "Nữ" ? "Nữ" : (row["Giới Tính (Nam/Nữ)"] === "Nam" ? "Nam" : ""),
            isAlive: row["Tình Trạng (Sống/Mất)"] === "Sống",
            isMainLineage: row["Đích Tôn (Có/Không)"] === "Có",
            isRegistered: row["Đã Đăng Ký Suất Đinh (Có/Không)"] === "Có",
            birthDate: row["Ngày Sinh (YYYY-MM-DD)"] || row["Năm Sinh"] || "",
            deathDate: row["Ngày Mất (YYYY-MM-DD)"] || row["Năm Mất"] || "",
            spouses: row["Vợ/Chồng"]
              ? row["Vợ/Chồng"].toString().split(';').map(s => s.trim()).filter(s => s !== '').map((name, idx) => ({ name, order: idx + 1 }))
              : [],
            education: row["Học Vấn"] || "Chưa rõ",
            occupation: row["Nghề Nghiệp"] || "",
            currentProvince: row["Tỉnh/Thành Hiện Nay"] || row["Nơi Ở"] || "",
            currentWard: row["Phường/Xã Hiện Nay"] || "",
            oldAddress: row["Địa Chỉ Cũ"] || "",
            phone: row["Số Điện Thoại"] ? row["Số Điện Thoại"].toString() : "",
            zalo: row["Zalo"] ? row["Zalo"].toString() : "",
            description: row["Tiểu Sử"] || "",
            achievements: row["Thành Tựu (cách nhau bởi ;)"] ? row["Thành Tựu (cách nhau bởi ;)"].split(';').map(s => s.trim()) : [],
            avatar: row["Hình Đại Diện (Link)"] || "",
            children: []
          }));

          const idMapping = normalizedList.reduce((acc, el, i) => {
            acc[el.id] = i;
            return acc;
          }, {});

          let root = null;
          normalizedList.forEach(el => {
            if (el.parentId === null || el.parentId === "") {
              root = el;
              return;
            }
            const parentEl = normalizedList[idMapping[el.parentId]];
            if (parentEl) {
              parentEl.children = [...(parentEl.children || []), el];
            }
          });

          return root || normalizedList[0];
        };

        const newTree = buildTree(json);
        if (newTree) {
          setFamilyData(newTree);
          alert("Import Excel thành công! Cây gia phả đã được cập nhật.");
        } else {
          alert("Không thể tạo cây gia phả. Vui lòng kiểm tra lại cột ParentID!");
        }
      } catch (err) {
        console.error(err);
        alert("Có lỗi xảy ra khi đọc file Excel!");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = ''; // Reset input
  };

  // 3. Tree Manipulation Functions
  const deepCopy = (obj) => JSON.parse(JSON.stringify(obj));

  const recursiveUpdate = (node, nodeId, updatedData) => {
    if (node.id === nodeId) {
      Object.assign(node, updatedData);
      return true;
    }
    if (node.children) {
      for (let child of node.children) {
        if (recursiveUpdate(child, nodeId, updatedData)) return true;
      }
    }
    return false;
  };

  const recursiveDelete = (node, nodeId) => {
    if (node.children) {
      const index = node.children.findIndex(c => c.id === nodeId);
      if (index !== -1) {
        node.children.splice(index, 1);
        return true;
      }
      for (let child of node.children) {
        if (recursiveDelete(child, nodeId)) return true;
      }
    }
    return false;
  };

  const findNodeById = (node, id) => {
    if (!node) return null;
    if (node.id === id) return node;
    for (const child of node.children || []) {
      const found = findNodeById(child, id);
      if (found) return found;
    }
    return null;
  };

  // Chi là suy ra theo cấu trúc cây (hậu duệ của root_member_id mỗi chi), không phải field lưu
  // trực tiếp trên từng người — tính giống hệt cách FamilyTreePage.jsx đang làm.
  const chiInfoMap = useMemo(() => {
    const infoMap = {};
    if (familyData) {
      chiList.forEach(chi => {
        const rootNode = findNodeById(familyData, chi.rootMemberId);
        if (!rootNode) return;
        flattenFamily(rootNode).forEach(m => { infoMap[m.id] = chi.name; });
      });
    }
    return infoMap;
  }, [familyData, chiList]);

  // Giống recursiveDelete nhưng TRẢ VỀ node vừa gỡ (thay vì chỉ xóa đi) — dùng để "gắn" 1 thành
  // viên đã có sẵn (kèm toàn bộ nhánh con cháu của họ) sang vị trí cha/mẹ khác.
  const recursiveExtract = (node, nodeId) => {
    if (!node.children) return null;
    const index = node.children.findIndex(c => c.id === nodeId);
    if (index !== -1) {
      const [removed] = node.children.splice(index, 1);
      return removed;
    }
    for (const child of node.children) {
      const found = recursiveExtract(child, nodeId);
      if (found) return found;
    }
    return null;
  };

  // Sau khi di chuyển 1 nhánh sang đời khác, phải tính lại "Đời" cho chính người đó VÀ toàn bộ
  // con cháu của họ — nếu không số Đời sẽ sai lệch so với vị trí mới trong cây.
  const recalculateGenerations = (node, generation) => {
    node.generation = generation;
    (node.children || []).forEach(child => recalculateGenerations(child, generation + 1));
  };

  // Chèn 1 con vào ĐÚNG vị trí thứ tự sinh đã chọn (thay vì luôn luôn thêm vào cuối) — dùng khi
  // admin biết rõ "đây là con thứ mấy" thay vì chỉ biết người này chưa từng nhập.
  const insertChildAt = (parentNode, index, node) => {
    if (!parentNode.children) parentNode.children = [];
    const clampedIndex = Math.max(0, Math.min(index, parentNode.children.length));
    parentNode.children.splice(clampedIndex, 0, node);
  };

  // 4. Form Handlers
  // parent = null khi mở từ nút "+ Thêm Thành Viên Mới" ở đầu trang — người dùng sẽ tự tìm và
  // chọn cha/mẹ ngay trong form. parent = 1 thành viên cụ thể khi mở từ nút "+ Thêm con" trên
  // 1 dòng trong bảng, hoặc từ nút "+" cạnh 1 vai vế trong hồ sơ (xem handleOpenAddRelative) —
  // đã biết sẵn thành viên tham chiếu + quan hệ nên điền sẵn luôn.
  const openAddModal = (parent) => {
    setModalMode('add');
    setAddSubMode('create');
    setAttachRefInputValue(parent ? formatParentLabel(parent) : '');
    setAttachRefMemberId(parent ? parent.id : '');
    setAttachRelation('con');
    setAttachChildChoiceId('');
    setAttachChildOrderIndex(null);
    setAttachMotherChoice('');
    setAttachInputValue('');
    setAttachSelectedId('');
    setFormData({
      ...emptyFormData,
      id: 'gen_' + Date.now()
    });
    setIsModalOpen(true);
  };

  // relation/refMember đã biết sẵn khi mở từ nút "+" cạnh 1 vai vế trong hồ sơ (MemberProfileModal).
  const handleOpenAddRelative = (relation, refMember) => {
    if (relation === 'vo') {
      openWifeModal(refMember);
      return;
    }
    setModalMode('add');
    setAddSubMode('create');
    setAttachRefInputValue(formatParentLabel(refMember));
    setAttachRefMemberId(refMember.id);
    setAttachRelation(relation);
    setAttachChildChoiceId('');
    setAttachChildOrderIndex(null);
    setAttachMotherChoice('');
    setAttachInputValue('');
    setAttachSelectedId('');
    setFormData({
      ...emptyFormData,
      id: 'gen_' + Date.now()
    });
    setIsModalOpen(true);
  };

  const openEditModal = (member) => {
    setModalMode('edit');
    setFormData({
      ...emptyFormData,
      ...member,
      spouse: member.spouses?.[0]?.name || '',
      achievementsStr: member.achievements ? member.achievements.join(';') : ''
    });
    setChildOrder((member.children || []).map(c => c.id));
    setHeirChildId((member.children || []).find(c => c.isMainLineage)?.id || '');
    setIsModalOpen(true);
  };

  // Đổi chỗ 1 người con với người liền trước/liền sau trong danh sách — dùng để chỉnh lại ai là
  // con trưởng, con thứ khi nhập thiếu hoặc nhập sai thứ tự lúc đầu.
  const moveChildOrder = (childId, direction) => {
    setChildOrder(prev => {
      const idx = prev.indexOf(childId);
      const swapIdx = idx + direction;
      if (idx === -1 || swapIdx < 0 || swapIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
  };

  // "+ Thêm Vợ" — vợ không phải 1 node trong cây, chỉ là tên + số thứ tự gắn trên hồ sơ chồng.
  const openWifeModal = (refMember) => {
    setWifeRefMemberId(refMember.id);
    setWifeName('');
    setWifeOrder((refMember.spouses?.length || 0) + 1);
    setIsWifeModalOpen(true);
  };

  const handleSaveWife = () => {
    if (!wifeName.trim()) return alert("Vui lòng nhập tên vợ!");
    const newTree = deepCopy(familyData);
    const node = findNodeById(newTree, wifeRefMemberId);
    if (!node) return alert("Không tìm thấy thành viên, vui lòng thử lại!");
    const currentSpouses = Array.isArray(node.spouses) ? node.spouses : (node.spouse ? [{ name: node.spouse, order: 1 }] : []);
    node.spouses = [...currentSpouses, { name: wifeName.trim(), order: Number(wifeOrder) || currentSpouses.length + 1 }];
    delete node.spouse;
    setFamilyData(newTree);
    setIsWifeModalOpen(false);
    alert("Đã thêm vợ vào hồ sơ!");
  };

  const handleDelete = (id, name) => {
    if (id === familyData.id) {
      return alert("Không thể xóa Thủy tổ! Nếu muốn làm lại, hãy sử dụng tính năng Import file trống.");
    }
    if (window.confirm(`Bạn có chắc chắn muốn xóa "${name}" và TOÀN BỘ nhánh con của người này không?`)) {
      const newTree = deepCopy(familyData);
      recursiveDelete(newTree, id);
      setFamilyData(newTree);
      alert("Đã xóa thành công!");
    }
  };

  // Dọn dữ liệu 1 lần cho Đời 11 & 12: đánh dấu "Còn sống" hàng loạt thay vì phải sửa từng
  // người. Banner tự ẩn khi không còn ai ở 2 đời này đang ghi "Đã mất".
  const handleBulkMarkAlive = () => {
    const affectedIds = new Set(pendingAliveFix.map(m => m.id));
    const names = pendingAliveFix.map(m => `- ${m.name} (Đời ${m.generation})`).join('\n');
    if (!window.confirm(`Sẽ đánh dấu ${pendingAliveFix.length} thành viên sau là "Còn sống" (xóa ngày mất nếu có):\n\n${names}\n\nTiếp tục?`)) return;

    const newTree = deepCopy(familyData);
    const walk = (node) => {
      if (affectedIds.has(node.id)) {
        node.isAlive = true;
        node.deathDate = '';
      }
      (node.children || []).forEach(walk);
    };
    walk(newTree);
    setFamilyData(newTree);
    alert(`Đã cập nhật ${pendingAliveFix.length} thành viên thành "Còn sống".`);
  };

  // Gắn 1 thành viên ĐÃ CÓ SẴN (kèm toàn bộ con cháu của họ) làm con của targetParentId, thay vì
  // tạo mới — dùng khi 1 người đã nhập vào hệ thống nhưng đang bị để sai chỗ (VD: lỗi lúc nhập
  // Excel) và giờ muốn di chuyển đúng vị trí mà không mất dữ liệu con cháu của họ.
  const handleAttachExisting = () => {
    if (!attachRefMemberId) return alert("Vui lòng chọn thành viên tham chiếu trước!");
    if (!attachPlan || attachPlan.mode === 'error') return alert(attachPlan?.message || "Không xác định được vị trí gắn.");
    if (attachPlan.mode === 'need_child_choice') return alert('Vui lòng chọn qua người con nào để xác định "Cháu".');
    if (!attachSelectedId) return alert("Vui lòng chọn đúng 1 thành viên có sẵn trong danh sách gợi ý để gắn vào!");

    const descendantCount = selectedAttachMember ? countDescendants(selectedAttachMember) : 0;
    const descendantNote = descendantCount > 0 ? ` (kèm ${descendantCount} người con/cháu của họ)` : '';
    const rootWarning = attachPlan.mode === 'become_root'
      ? `\n\n⚠️ "${selectedAttachMember?.name}" sẽ trở thành THỦY TỔ MỚI của cả dòng họ (do không còn vị trí "ông/bà" phù hợp phía trên).`
      : '';
    if (!window.confirm(`Gắn "${selectedAttachMember?.name}"${descendantNote} vào vị trí đã chọn?${rootWarning}`)) return;

    const newTree = deepCopy(familyData);

    if (attachPlan.mode === 'become_root') {
      const extractedX = recursiveExtract(newTree, attachSelectedId);
      if (!extractedX) return alert("Không tìm thấy thành viên đã chọn, vui lòng thử lại!");
      const oldRoot = attachPlan.targetChildId === newTree.id ? newTree : recursiveExtract(newTree, attachPlan.targetChildId);
      if (!oldRoot) return alert("Không tìm thấy vị trí liên quan, vui lòng thử lại!");
      recalculateGenerations(extractedX, 1);
      extractedX.children = [...(extractedX.children || []), oldRoot];
      recalculateGenerations(oldRoot, 2);
      setFamilyData(extractedX);
    } else if (attachPlan.mode === 'insert_above') {
      const extractedX = recursiveExtract(newTree, attachSelectedId);
      if (!extractedX) return alert("Không tìm thấy thành viên đã chọn, vui lòng thử lại!");
      const extractedTarget = recursiveExtract(newTree, attachPlan.targetChildId);
      if (!extractedTarget) return alert("Không tìm thấy vị trí liên quan, vui lòng thử lại!");
      const newParentNode = findNodeById(newTree, attachPlan.newParentId);
      if (!newParentNode) return alert("Không tìm thấy ông/bà liên quan, vui lòng thử lại!");
      recalculateGenerations(extractedX, newParentNode.generation + 1);
      newParentNode.children = [...(newParentNode.children || []), extractedX];
      extractedX.children = [...(extractedX.children || []), extractedTarget];
      recalculateGenerations(extractedTarget, extractedX.generation + 1);
      setFamilyData(newTree);
    } else {
      const parentNode = findNodeById(newTree, attachPlan.parentId);
      if (!parentNode) return alert("Không tìm thấy vị trí đã chọn, vui lòng thử lại!");
      const extracted = recursiveExtract(newTree, attachSelectedId);
      if (!extracted) return alert("Không tìm thấy thành viên đã chọn, vui lòng thử lại!");
      recalculateGenerations(extracted, parentNode.generation + 1);
      if (attachRelation === 'con') {
        if (attachMotherChoice) {
          if (attachRefMember.gender === 'Nữ') extracted.fatherName = attachMotherChoice;
          else extracted.motherName = attachMotherChoice;
        }
        const orderIndex = attachChildOrderIndex ?? (parentNode.children || []).length;
        insertChildAt(parentNode, orderIndex, extracted);
      } else {
        if (!parentNode.children) parentNode.children = [];
        parentNode.children.push(extracted);
      }
      setFamilyData(newTree);
    }

    setIsModalOpen(false);
    alert("Đã gắn thành viên vào đúng vị trí!");
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.name) return alert("Vui lòng nhập họ tên!");

    if (modalMode === 'edit') {
      const achArray = formData.achievementsStr.split(';').map(s => s.trim()).filter(s => s !== '');
      const existingSpouses = Array.isArray(formData.spouses) ? formData.spouses : [];
      const trimmedSpouse = (formData.spouse || '').trim();
      // Ô "Phu nhân/Phu quân" chỉ sửa được VỢ 1 (tương thích ngược với hồ sơ cũ) — không bao giờ
      // xóa mất Vợ 2, Vợ 3... đã thêm qua "+ Thêm Vợ" dù để trống ô này.
      const spouses = trimmedSpouse
        ? (existingSpouses.length > 0
            ? existingSpouses.map((s, i) => i === 0 ? { ...s, name: trimmedSpouse } : s)
            : [{ name: trimmedSpouse, order: 1 }])
        : existingSpouses;
      const nodeData = { ...formData, achievements: achArray, spouses };
      delete nodeData.achievementsStr;
      delete nodeData.spouse;
      delete nodeData.parentId;
      delete nodeData.parentName;
      // Thứ tự + đích tôn của các con phải áp vào children của node TRONG newTree vừa deep-copy
      // (không dùng formData.children — đó là tham chiếu cũ chụp lúc mở modal Sửa), nên xóa khỏi
      // nodeData để Object.assign không ghi đè nhầm rồi tự tay sắp xếp lại bên dưới.
      delete nodeData.children;
      const newTree = deepCopy(familyData);
      recursiveUpdate(newTree, nodeData.id, nodeData);
      const updatedNode = findNodeById(newTree, nodeData.id);
      if (updatedNode && childOrder.length > 0) {
        const byId = new Map(updatedNode.children.map(c => [c.id, c]));
        updatedNode.children = childOrder.map(id => byId.get(id)).filter(Boolean);
        updatedNode.children.forEach(c => { c.isMainLineage = c.id === heirChildId; });
      }
      setFamilyData(newTree);
      setIsModalOpen(false);
      alert("Lưu thông tin thành công!");
      return;
    }

    // modalMode === 'add', addSubMode === 'create'
    if (!attachRefMemberId) return alert("Vui lòng chọn thành viên tham chiếu trước!");
    if (!attachPlan || attachPlan.mode === 'error') return alert(attachPlan?.message || "Không xác định được vị trí gắn.");
    if (attachPlan.mode === 'need_child_choice') return alert('Vui lòng chọn qua người con nào để xác định "Cháu".');

    const achArray = formData.achievementsStr.split(';').map(s => s.trim()).filter(s => s !== '');
    const trimmedSpouse = (formData.spouse || '').trim();

    const nodeData = {
      ...formData,
      achievements: achArray,
      children: [],
      spouses: trimmedSpouse ? [{ name: trimmedSpouse, order: 1 }] : []
    };
    delete nodeData.achievementsStr;
    delete nodeData.spouse;
    delete nodeData.parentId;
    delete nodeData.parentName;

    if (attachRelation === 'con' && attachMotherChoice) {
      if (attachRefMember.gender === 'Nữ') nodeData.fatherName = attachMotherChoice;
      else nodeData.motherName = attachMotherChoice;
    }

    const newTree = deepCopy(familyData);

    if (attachPlan.mode === 'become_root') {
      const oldRoot = attachPlan.targetChildId === newTree.id ? newTree : recursiveExtract(newTree, attachPlan.targetChildId);
      if (!oldRoot) return alert("Không tìm thấy vị trí liên quan, vui lòng thử lại!");
      recalculateGenerations(nodeData, 1);
      nodeData.children = [oldRoot];
      recalculateGenerations(oldRoot, 2);
      setFamilyData(nodeData);
    } else if (attachPlan.mode === 'insert_above') {
      const extractedTarget = recursiveExtract(newTree, attachPlan.targetChildId);
      if (!extractedTarget) return alert("Không tìm thấy vị trí liên quan, vui lòng thử lại!");
      const newParentNode = findNodeById(newTree, attachPlan.newParentId);
      if (!newParentNode) return alert("Không tìm thấy ông/bà liên quan, vui lòng thử lại!");
      recalculateGenerations(nodeData, newParentNode.generation + 1);
      if (!newParentNode.children) newParentNode.children = [];
      newParentNode.children.push(nodeData);
      nodeData.children = [extractedTarget];
      recalculateGenerations(extractedTarget, nodeData.generation + 1);
      setFamilyData(newTree);
    } else {
      const parentNode = findNodeById(newTree, attachPlan.parentId);
      if (!parentNode) return alert("Không tìm thấy vị trí đã chọn, vui lòng thử lại!");
      nodeData.generation = parentNode.generation + 1;
      if (attachRelation === 'con') {
        const orderIndex = attachChildOrderIndex ?? (parentNode.children || []).length;
        insertChildAt(parentNode, orderIndex, nodeData);
      } else {
        if (!parentNode.children) parentNode.children = [];
        parentNode.children.push(nodeData);
      }
      setFamilyData(newTree);
    }

    setIsModalOpen(false);
    alert("Lưu thông tin thành công!");
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
        <h3>Danh Sách Thành Viên ({flatList.length} người)</h3>
        <div>
          <input type="file" accept=".xlsx, .xls" style={{ display: 'none' }} ref={fileInputRef} onChange={handleFileChange} />
          <button className="btn-primary" onClick={() => openAddModal(null)} style={{ marginRight: '10px', background: 'var(--primary-color)', color: 'white' }}>+ Thêm Thành Viên Mới</button>
          <button className="btn-primary" onClick={handleDownloadTemplate} style={{ marginRight: '10px', background: '#f39c12', color: 'white' }}>Tải Mẫu Excel</button>
          <button className="btn-primary" onClick={handleImportClick} style={{ marginRight: '10px', background: '#34495e', color: 'white' }}>📥 Nhập Excel</button>
          <button className="btn-primary" onClick={handleExportExcel} style={{ background: '#27ae60', color: 'white' }}>📤 Xuất Excel</button>
        </div>
      </div>

      {pendingAliveFix.length > 0 && (
        <div style={{
          background: '#fff8e1', border: '1px solid #f0c14b', borderRadius: '8px',
          padding: '14px 18px', marginBottom: '15px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: '15px', flexWrap: 'wrap'
        }}>
          <span>
            Có <strong>{pendingAliveFix.length}</strong> thành viên Đời 11 &amp; 12 đang ghi "Đã mất" — bấm để đánh dấu tất cả thành "Còn sống".
          </span>
          <button className="btn-primary" onClick={handleBulkMarkAlive} style={{ background: '#f39c12', color: 'white', whiteSpace: 'nowrap' }}>
            Đánh dấu Còn sống (Đời 11 &amp; 12)
          </button>
        </div>
      )}

      <div style={{ marginBottom: '15px', position: 'relative', maxWidth: '400px' }}>
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="🔍 Tìm theo tên, mã ĐD, SĐT, tỉnh/thành, nghề nghiệp..."
          style={{ width: '100%', padding: '10px 36px 10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', boxSizing: 'border-box' }}
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            title="Xóa tìm kiếm"
            style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1rem', color: 'var(--text-secondary)' }}
          >✕</button>
        )}
      </div>

      {searchTerm && (
        <p style={{ marginBottom: '10px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Tìm thấy {filteredList.length} / {flatList.length} thành viên
        </p>
      )}

      <div style={{ overflowX: 'auto', background: 'white', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
          <thead style={{ background: 'var(--surface-color)' }}>
            <tr>
              <th style={{ padding: '15px', borderBottom: '2px solid var(--border-color)' }}>Họ tên</th>
              <th style={{ padding: '15px', borderBottom: '2px solid var(--border-color)' }}>Mã ĐD</th>
              <th style={{ padding: '15px', borderBottom: '2px solid var(--border-color)' }}>Đời</th>
              <th style={{ padding: '15px', borderBottom: '2px solid var(--border-color)' }}>Là con của</th>
              <th style={{ padding: '15px', borderBottom: '2px solid var(--border-color)' }}>Tình trạng</th>
              <th style={{ padding: '15px', borderBottom: '2px solid var(--border-color)' }}>Suất đinh</th>
              <th style={{ padding: '15px', borderBottom: '2px solid var(--border-color)' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredList.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Không tìm thấy thành viên nào phù hợp.
                </td>
              </tr>
            )}
            {filteredList.map(member => (
              <tr key={member.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '12px 15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <img
                    src={member.avatar || getAvatarPlaceholder(member.name)}
                    alt={member.name}
                    style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                    onError={e => { e.target.onerror = null; e.target.src = getAvatarPlaceholder(member.name); }}
                  />
                  <div>
                    <div style={{ fontWeight: 'bold', color: member.isMainLineage ? 'var(--primary-color)' : 'var(--text-primary)' }}>
                      {member.name} {member.isMainLineage && '👑'}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{member.birthDate || '?'} - {member.deathDate || '?'}</div>
                  </div>
                </td>
                <td style={{ padding: '12px 15px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{codeMap[member.id] || '—'}</td>
                <td style={{ padding: '12px 15px' }}>Đời {member.generation}</td>
                <td style={{ padding: '12px 15px', color: 'var(--text-secondary)' }}>{member.parentName}</td>
                <td style={{ padding: '12px 15px' }}>
                  {member.isAlive ? <span style={{ color: '#27ae60' }}>Đang sống</span> : <span style={{ color: '#7f8c8d' }}>Đã mất</span>}
                </td>
                <td style={{ padding: '12px 15px' }}>
                  {member.isRegistered ? (
                    <span style={{ padding: '3px 8px', borderRadius: '10px', background: '#e8f5e9', color: '#2e7d32', fontSize: '0.8rem', fontWeight: '600' }}>Đã ĐK</span>
                  ) : (
                    <span style={{ padding: '3px 8px', borderRadius: '10px', background: '#f5f5f5', color: '#7f8c8d', fontSize: '0.8rem' }}>Chưa ĐK</span>
                  )}
                </td>
                <td style={{ padding: '12px 15px' }}>
                  <button onClick={() => setViewingMemberId(member.id)} style={{ padding: '5px 10px', background: '#8e44ad', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '5px' }}>Xem hồ sơ</button>
                  <button onClick={() => openEditModal(member)} style={{ padding: '5px 10px', background: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '5px' }}>Sửa</button>
                  <button onClick={() => openAddModal(member)} style={{ padding: '5px 10px', background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '5px' }}>+ Thêm con</button>
                  {member.id !== familyData?.id && (
                    <button onClick={() => handleDelete(member.id, member.name)} style={{ padding: '5px 10px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Xóa</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '20px' }}>
          <div className="card" style={{ maxWidth: '800px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginBottom: '20px', borderBottom: '2px solid var(--border-color)', paddingBottom: '10px' }}>
              {modalMode === 'add' ? 'Thêm Thành Viên Mới' : 'Cập Nhật Thông Tin'}
            </h2>

            {modalMode === 'add' && (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                <button
                  type="button"
                  onClick={() => setAddSubMode('create')}
                  className={addSubMode === 'create' ? 'btn-primary' : ''}
                  style={addSubMode === 'create'
                    ? { background: 'var(--primary-color)', color: 'white' }
                    : { background: '#eee', color: 'var(--text-primary)', border: 'none', borderRadius: '4px', padding: '10px 16px', cursor: 'pointer' }}
                >
                  Tạo Thành Viên Mới
                </button>
                <button
                  type="button"
                  onClick={() => setAddSubMode('attach')}
                  className={addSubMode === 'attach' ? 'btn-primary' : ''}
                  style={addSubMode === 'attach'
                    ? { background: 'var(--primary-color)', color: 'white' }
                    : { background: '#eee', color: 'var(--text-primary)', border: 'none', borderRadius: '4px', padding: '10px 16px', cursor: 'pointer' }}
                >
                  Gắn Thành Viên Đã Có
                </button>
              </div>
            )}

            {modalMode === 'add' && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Thành viên tham chiếu *</label>
                  <input
                    type="text"
                    list="ref-options"
                    value={attachRefInputValue}
                    onChange={e => handleAttachRefInputChange(e.target.value)}
                    placeholder="Gõ để tìm kiếm theo tên..."
                    style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)', boxSizing: 'border-box' }}
                  />
                  <datalist id="ref-options">
                    {flatList.map(m => <option key={m.id} value={formatParentLabel(m)} />)}
                  </datalist>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
                    {addSubMode === 'attach'
                      ? `Thành viên sẽ gắn vào là gì của ${attachRefMember ? attachRefMember.name : 'người ở trên'}? *`
                      : `Người mới sẽ tạo là gì của ${attachRefMember ? attachRefMember.name : 'người ở trên'}? *`}
                  </label>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {RELATION_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleRelationChange(opt.value)}
                        style={attachRelation === opt.value
                          ? { background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '4px', padding: '8px 14px', cursor: 'pointer' }
                          : { background: '#eee', color: 'var(--text-primary)', border: 'none', borderRadius: '4px', padding: '8px 14px', cursor: 'pointer' }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {attachPlan?.mode === 'need_child_choice' && (
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Là cháu qua người con nào của {attachRefMember?.name}? *</label>
                    <select
                      value={attachChildChoiceId}
                      onChange={e => { setAttachChildChoiceId(e.target.value); setAttachInputValue(''); setAttachSelectedId(''); }}
                      style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)', boxSizing: 'border-box' }}
                    >
                      <option value="">-- Chọn người con --</option>
                      {attachPlan.children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                )}

                {attachPlan?.mode === 'error' && attachRefMember && (
                  <p style={{ marginBottom: '20px', fontSize: '0.85rem', color: '#e74c3c' }}>{attachPlan.message}</p>
                )}

                {attachRelation === 'con' && attachRefMember && attachRefMember.children && attachRefMember.children.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Con thứ mấy?</label>
                    <select
                      value={attachChildOrderIndex === null ? attachRefMember.children.length : attachChildOrderIndex}
                      onChange={e => setAttachChildOrderIndex(Number(e.target.value))}
                      style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)', boxSizing: 'border-box' }}
                    >
                      {attachRefMember.children.map((c, idx) => (
                        <option key={idx} value={idx}>{idx === 0 ? 'Con đầu' : `Con thứ ${idx + 1}`} (trước {c.name})</option>
                      ))}
                      <option value={attachRefMember.children.length}>{`Con thứ ${attachRefMember.children.length + 1} (út, mặc định)`}</option>
                    </select>
                  </div>
                )}

                {attachRelation === 'con' && attachRefMember && attachRefMember.spouses && attachRefMember.spouses.length > 1 && (
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Con của bà vợ nào?</label>
                    <select
                      value={attachMotherChoice}
                      onChange={e => setAttachMotherChoice(e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)', boxSizing: 'border-box' }}
                    >
                      <option value="">-- Chưa rõ / không chọn --</option>
                      {attachRefMember.spouses.map((s, idx) => (
                        <option key={idx} value={s.name}>{attachRefMember.spouses.length > 1 ? `Vợ ${s.order}: ${s.name}` : s.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {modalMode === 'add' && addSubMode === 'attach' ? (
              <div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Chọn thành viên đã có sẵn *</label>
                  <input
                    type="text"
                    list="attach-options"
                    value={attachInputValue}
                    onChange={e => handleAttachInputChange(e.target.value)}
                    placeholder={attachRefMemberId ? "Gõ để tìm theo tên..." : "Chọn thành viên tham chiếu trước"}
                    disabled={!attachRefMemberId || attachPlan?.mode === 'need_child_choice' || attachPlan?.mode === 'error'}
                    style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)', boxSizing: 'border-box' }}
                  />
                  <datalist id="attach-options">
                    {attachableMembers.map(m => <option key={m.id} value={formatParentLabel(m)} />)}
                  </datalist>
                  {selectedAttachMember ? (
                    <p style={{ marginTop: '5px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Hiện là con của: {selectedAttachMember.parentName}
                      {countDescendants(selectedAttachMember) > 0 && (
                        <> · Có {countDescendants(selectedAttachMember)} người con/cháu sẽ chuyển theo</>
                      )}
                    </p>
                  ) : (
                    <p style={{ marginTop: '5px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Chọn 1 người đã có sẵn trong cây để chuyển đúng vị trí theo quan hệ đã chọn ở trên — dùng khi người đó bị nhập nhầm chỗ trước đây.
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '10px 20px', background: '#ccc', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Hủy Bỏ</button>
                  <button type="button" className="btn-primary" onClick={handleAttachExisting}>Gắn Vào Đây</button>
                </div>
              </div>
            ) : (
            <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Họ và tên *</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
              </div>
              
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Hình Đại Diện</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input type="text" value={formData.avatar} onChange={e => setFormData({...formData, avatar: e.target.value})} placeholder="URL ảnh..." style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
                  <label style={{ background: 'var(--primary-color)', color: 'white', padding: '10px 15px', borderRadius: '4px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    Tải Ảnh Lên
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async (e) => {
                      const file = e.target.files[0];
                      if(!file) return;
                      try {
                        const data = await apiUpload(file, 'avatar', token);
                        if(data.success) {
                          setFormData({...formData, avatar: data.url});
                          alert('Tải ảnh thành công!');
                        } else {
                          alert('Lỗi: ' + data.error);
                        }
                      } catch(err) {
                        alert('Lỗi kết nối Server Tải ảnh: ' + err.message);
                      }
                    }} />
                  </label>
                </div>
              </div>
              
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Giới tính</label>
                <label style={{ marginRight: '15px' }}><input type="radio" checked={formData.gender === 'Nam'} onChange={() => setFormData({...formData, gender: 'Nam'})} /> Nam</label>
                <label><input type="radio" checked={formData.gender === 'Nữ'} onChange={() => setFormData({...formData, gender: 'Nữ'})} /> Nữ</label>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Học vấn</label>
                <select value={formData.education} onChange={e => setFormData({...formData, education: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                  {EDUCATION_LEVELS.map(lv => <option key={lv} value={lv}>{lv}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Ngày sinh</label>
                <input type="date" value={formData.birthDate} onChange={e => setFormData({...formData, birthDate: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Ngày mất (Để trống nếu còn sống)</label>
                <input type="date" value={formData.deathDate} onChange={e => setFormData({...formData, deathDate: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Thuộc nhánh Đích tôn?</label>
                <label style={{ marginRight: '15px' }}><input type="radio" checked={formData.isMainLineage} onChange={() => setFormData({...formData, isMainLineage: true})} /> Có</label>
                <label><input type="radio" checked={!formData.isMainLineage} onChange={() => setFormData({...formData, isMainLineage: false})} /> Không</label>
              </div>

              {modalMode === 'edit' && (
                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Thuộc chi</label>
                  <p style={{ margin: 0, padding: '10px 0', color: 'var(--text-secondary)' }}>
                    {chiInfoMap[formData.id] || 'Dòng chính (chưa gắn vào chi nào)'}
                  </p>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Tình trạng</label>
                <label style={{ marginRight: '15px' }}><input type="radio" checked={formData.isAlive} onChange={() => setFormData({...formData, isAlive: true})} /> Còn sống</label>
                <label><input type="radio" checked={!formData.isAlive} onChange={() => setFormData({...formData, isAlive: false})} /> Đã mất</label>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Đã đăng ký suất đinh trong dòng họ?</label>
                <label style={{ marginRight: '15px' }}><input type="radio" checked={formData.isRegistered} onChange={() => setFormData({...formData, isRegistered: true})} /> Đã đăng ký</label>
                <label><input type="radio" checked={!formData.isRegistered} onChange={() => setFormData({...formData, isRegistered: false})} /> Chưa đăng ký</label>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Phu nhân / Phu quân</label>
                <input type="text" value={formData.spouse} onChange={e => setFormData({...formData, spouse: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Nghề nghiệp</label>
                <input type="text" value={formData.occupation} onChange={e => setFormData({...formData, occupation: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Số điện thoại</label>
                <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="VD: 0912345678" style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Zalo</label>
                <input type="text" value={formData.zalo} onChange={e => setFormData({...formData, zalo: e.target.value})} placeholder="Số Zalo hoặc link" style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Tỉnh/Thành phố (hiện nay)</label>
                <input type="text" list="province-suggestions" value={formData.currentProvince} onChange={e => setFormData({...formData, currentProvince: e.target.value})} placeholder="VD: Nam Định" style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
                <datalist id="province-suggestions">
                  {provinceSuggestions.map(p => <option key={p} value={p} />)}
                </datalist>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Phường/Xã (hiện nay)</label>
                <input type="text" list="ward-suggestions" value={formData.currentWard} onChange={e => setFormData({...formData, currentWard: e.target.value})} placeholder="VD: Phường Vị Hoàng" style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
                <datalist id="ward-suggestions">
                  {wardSuggestions.map(w => <option key={w} value={w} />)}
                </datalist>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Địa chỉ cũ (địa danh ngày xưa, nếu có)</label>
                <input type="text" value={formData.oldAddress} onChange={e => setFormData({...formData, oldAddress: e.target.value})} placeholder="VD: Làng Vị Xuyên, phủ Xuân Trường, tỉnh Nam Định (địa danh xưa)" style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Tiểu sử chi tiết</label>
                <textarea rows="3" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }}></textarea>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Thành tựu nổi bật (Các mục cách nhau bằng dấu chấm phẩy ";")</label>
                <input type="text" value={formData.achievementsStr} onChange={e => setFormData({...formData, achievementsStr: e.target.value})} placeholder="VD: Kỹ sư phần mềm; Đạt giải thưởng..." style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
              </div>

              {modalMode === 'edit' && childOrder.length > 0 && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
                    Thứ tự các con &amp; đích tôn (hương hỏa đời tiếp)
                  </label>
                  <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Dùng mũi tên để sắp lại ai là con trưởng, con thứ. Tick chọn đúng 1 người làm đích tôn — người này sẽ tự động hiện sao ★ trên sơ đồ gia phả.
                  </p>
                  <div style={{ border: '1px solid var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                    {childOrder.map((id, idx) => {
                      const child = formData.children?.find(c => c.id === id);
                      if (!child) return null;
                      const positionLabel = idx === 0 ? 'Con trưởng' : `Con thứ ${idx + 1}${idx === childOrder.length - 1 ? ' (út)' : ''}`;
                      return (
                        <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderBottom: idx < childOrder.length - 1 ? '1px solid var(--border-color)' : 'none', background: idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <button type="button" onClick={() => moveChildOrder(id, -1)} disabled={idx === 0} title="Đưa lên (lớn hơn)" style={{ padding: '2px 6px', cursor: idx === 0 ? 'not-allowed' : 'pointer', opacity: idx === 0 ? 0.4 : 1 }}>▲</button>
                            <button type="button" onClick={() => moveChildOrder(id, 1)} disabled={idx === childOrder.length - 1} title="Đưa xuống (nhỏ hơn)" style={{ padding: '2px 6px', cursor: idx === childOrder.length - 1 ? 'not-allowed' : 'pointer', opacity: idx === childOrder.length - 1 ? 0.4 : 1 }}>▼</button>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 'bold' }}>{child.name} {child.gender ? `(${child.gender})` : ''}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{positionLabel} · {chiInfoMap[id] || 'Dòng chính'}</div>
                          </div>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                            <input
                              type="radio"
                              name="heirChild"
                              checked={heirChildId === id}
                              onChange={() => setHeirChildId(id)}
                            />
                            Đích tôn
                          </label>
                        </div>
                      );
                    })}
                  </div>
                  {heirChildId && (
                    <button type="button" onClick={() => setHeirChildId('')} style={{ marginTop: '6px', padding: '4px 10px', background: '#eee', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>
                      Bỏ chọn đích tôn
                    </button>
                  )}
                </div>
              )}

              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '10px 20px', background: '#ccc', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Hủy Bỏ</button>
                <button type="submit" className="btn-primary">Lưu Thay Đổi</button>
              </div>
            </form>
            )}
          </div>
        </div>
      )}

      {isWifeModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '20px' }}>
          <div className="card" style={{ maxWidth: '420px', width: '100%' }}>
            <h2 style={{ marginBottom: '20px', borderBottom: '2px solid var(--border-color)', paddingBottom: '10px' }}>Thêm Vợ</h2>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Tên vợ *</label>
              <input type="text" value={wifeName} onChange={e => setWifeName(e.target.value)} placeholder="Họ và tên..." style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Vợ thứ mấy?</label>
              <input type="number" min="1" value={wifeOrder} onChange={e => setWifeOrder(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" onClick={() => setIsWifeModalOpen(false)} style={{ padding: '10px 20px', background: '#ccc', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Hủy Bỏ</button>
              <button type="button" className="btn-primary" onClick={handleSaveWife}>Lưu</button>
            </div>
          </div>
        </div>
      )}

      {viewingMemberId && (
        <MemberProfileModal
          member={descendantList.find(m => m.id === viewingMemberId) || null}
          onClose={() => setViewingMemberId(null)}
          onSelectMember={setViewingMemberId}
          onAddRelative={handleOpenAddRelative}
        />
      )}
    </div>
  );
};

export default AdminFamilyTree;
