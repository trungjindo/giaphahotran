import React, { useState, useContext, useRef, useMemo } from 'react';
import { AppContext } from '../store';
import * as XLSX from 'xlsx';
import { flattenFamily, EDUCATION_LEVELS, buildFamilyCodeMap } from '../utils/family';
import { getAvatarPlaceholder } from '../utils/avatar';
import { apiUpload } from '../api';

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
  const [targetParentId, setTargetParentId] = useState(null);
  const [parentInputValue, setParentInputValue] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState(emptyFormData);

  // 1. Flatten Tree for Table & Excel
  const flatList = familyData ? flattenFamily(familyData) : [];
  const codeMap = useMemo(() => familyData ? buildFamilyCodeMap(familyData) : {}, [familyData]);

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

  const handleParentInputChange = (value) => {
    setParentInputValue(value);
    const found = parentLabelToMember.get(value);
    if (found) {
      setTargetParentId(found.id);
      setFormData(fd => ({ ...fd, generation: found.generation + 1 }));
    } else {
      setTargetParentId('');
    }
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
      "Vợ/Chồng": member.spouse || "",
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
            spouse: row["Vợ/Chồng"] || "",
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

  const recursiveAdd = (node, parentId, newNode) => {
    if (node.id === parentId) {
      if (!node.children) node.children = [];
      node.children.push(newNode);
      return true;
    }
    if (node.children) {
      for (let child of node.children) {
        if (recursiveAdd(child, parentId, newNode)) return true;
      }
    }
    return false;
  };

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

  // 4. Form Handlers
  // parent = null khi mở từ nút "+ Thêm Thành Viên Mới" ở đầu trang — người dùng sẽ tự tìm và
  // chọn cha/mẹ ngay trong form. parent = 1 thành viên cụ thể khi mở từ nút "+ Thêm con" trên
  // 1 dòng trong bảng — đã biết sẵn cha/mẹ nên điền sẵn luôn.
  const openAddModal = (parent) => {
    setModalMode('add');
    setTargetParentId(parent ? parent.id : '');
    setParentInputValue(parent ? formatParentLabel(parent) : '');
    setFormData({
      ...emptyFormData,
      id: 'gen_' + Date.now(),
      generation: parent ? parent.generation + 1 : 1
    });
    setIsModalOpen(true);
  };

  const openEditModal = (member) => {
    setModalMode('edit');
    setFormData({
      ...emptyFormData,
      ...member,
      achievementsStr: member.achievements ? member.achievements.join(';') : ''
    });
    setIsModalOpen(true);
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

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.name) return alert("Vui lòng nhập họ tên!");
    if (modalMode === 'add' && !targetParentId) return alert("Vui lòng chọn cha/mẹ (người sinh ra thành viên này) trước khi lưu!");

    const achArray = formData.achievementsStr.split(';').map(s => s.trim()).filter(s => s !== '');
    
    const nodeData = {
      ...formData,
      achievements: achArray
    };
    delete nodeData.achievementsStr;
    delete nodeData.parentId;
    delete nodeData.parentName;

    const newTree = deepCopy(familyData);

    if (modalMode === 'add') {
      nodeData.children = [];
      recursiveAdd(newTree, targetParentId, nodeData);
    } else {
      recursiveUpdate(newTree, nodeData.id, nodeData);
    }

    setFamilyData(newTree);
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

            <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {modalMode === 'add' && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Là con của (cha/mẹ) *</label>
                  <input
                    required
                    type="text"
                    list="parent-options"
                    value={parentInputValue}
                    onChange={e => handleParentInputChange(e.target.value)}
                    placeholder="Gõ để tìm kiếm theo tên..."
                    style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                  />
                  <datalist id="parent-options">
                    {flatList.map(m => <option key={m.id} value={formatParentLabel(m)} />)}
                  </datalist>
                  {targetParentId ? (
                    <p style={{ marginTop: '5px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Sẽ được thêm vào Đời {formData.generation}</p>
                  ) : (
                    <p style={{ marginTop: '5px', fontSize: '0.85rem', color: '#e74c3c' }}>Chưa chọn được cha/mẹ hợp lệ — hãy chọn đúng 1 gợi ý trong danh sách.</p>
                  )}
                </div>
              )}

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

              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '10px 20px', background: '#ccc', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Hủy Bỏ</button>
                <button type="submit" className="btn-primary">Lưu Thay Đổi</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFamilyTree;
