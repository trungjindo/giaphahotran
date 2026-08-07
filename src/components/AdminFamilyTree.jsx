import React, { useState, useContext, useRef } from 'react';
import { AppContext } from '../store';
import * as XLSX from 'xlsx';

const AdminFamilyTree = () => {
  const { familyData, setFamilyData } = useContext(AppContext);
  const fileInputRef = useRef(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [targetParentId, setTargetParentId] = useState(null);
  
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    avatar: '',
    generation: 1,
    birthDate: '',
    deathDate: '',
    isAlive: true,
    isMainLineage: false,
    spouse: '',
    location: '',
    occupation: '',
    description: '',
    achievementsStr: ''
  });

  // 1. Flatten Tree for Table & Excel
  const flattenTree = (node, parentId = "", parentName = "Thủy tổ") => {
    if (!node) return [];
    
    let list = [{ 
      ...node, 
      parentId: parentId,
      parentName: parentName 
    }];

    if (node.children && node.children.length > 0) {
      node.children.forEach(child => {
        list = list.concat(flattenTree(child, node.id, node.name));
      });
    }
    return list;
  };

  const flatList = familyData ? flattenTree(familyData) : [];

  // 2. EXCEL EXPORT / IMPORT
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        "ID": "root_1",
        "ParentID (Mã Cha)": "",
        "Họ Tên": "Trần Đình Khởi",
        "Đời": 1,
        "Tình Trạng (Sống/Mất)": "Mất",
        "Đích Tôn (Có/Không)": "Có",
        "Năm Sinh": "1850",
        "Năm Mất": "1920",
        "Vợ/Chồng": "Nguyễn Thị Hoa",
        "Nghề Nghiệp": "Hương sư",
        "Nơi Ở": "Nam Định",
        "Tiểu Sử": "Thủy tổ dòng họ",
        "Thành Tựu (cách nhau bởi ;)": "Khai sáng dòng họ",
        "Hình Đại Diện (Link)": "https://..."
      },
      {
        "ID": "gen_2_1",
        "ParentID (Mã Cha)": "root_1",
        "Họ Tên": "Trần Đình A",
        "Đời": 2,
        "Tình Trạng (Sống/Mất)": "Mất",
        "Đích Tôn (Có/Không)": "Có",
        "Năm Sinh": "1880",
        "Năm Mất": "1950",
        "Vợ/Chồng": "Lê Thị Bích",
        "Nghề Nghiệp": "Trưởng tộc",
        "Nơi Ở": "Nam Định",
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
      "Tình Trạng (Sống/Mất)": member.isAlive ? "Sống" : "Mất",
      "Đích Tôn (Có/Không)": member.isMainLineage ? "Có" : "Không",
      "Năm Sinh": member.birthDate || "",
      "Năm Mất": member.deathDate || "",
      "Vợ/Chồng": member.spouse || "",
      "Nghề Nghiệp": member.occupation || "",
      "Nơi Ở": member.location || "",
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
            isAlive: row["Tình Trạng (Sống/Mất)"] === "Sống",
            isMainLineage: row["Đích Tôn (Có/Không)"] === "Có",
            birthDate: row["Năm Sinh"] || "",
            deathDate: row["Năm Mất"] || "",
            spouse: row["Vợ/Chồng"] || "",
            occupation: row["Nghề Nghiệp"] || "",
            location: row["Nơi Ở"] || "",
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
  const openAddModal = (parent) => {
    setModalMode('add');
    setTargetParentId(parent.id);
    setFormData({
      id: 'gen_' + Date.now(),
      name: '',
      avatar: '',
      generation: parent.generation + 1,
      birthDate: '',
      deathDate: '',
      isAlive: true,
      isMainLineage: false,
      spouse: '',
      location: '',
      occupation: '',
      description: '',
      achievementsStr: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (member) => {
    setModalMode('edit');
    setFormData({
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

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.name) return alert("Vui lòng nhập họ tên!");

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3>Danh Sách Thành Viên ({flatList.length} người)</h3>
        <div>
          <input type="file" accept=".xlsx, .xls" style={{ display: 'none' }} ref={fileInputRef} onChange={handleFileChange} />
          <button className="btn-primary" onClick={handleDownloadTemplate} style={{ marginRight: '10px', background: '#f39c12', color: 'white' }}>Tải Mẫu Excel</button>
          <button className="btn-primary" onClick={handleImportClick} style={{ marginRight: '10px', background: '#34495e', color: 'white' }}>📥 Nhập Excel</button>
          <button className="btn-primary" onClick={handleExportExcel} style={{ background: '#27ae60', color: 'white' }}>📤 Xuất Excel</button>
        </div>
      </div>

      <div style={{ overflowX: 'auto', background: 'white', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
          <thead style={{ background: 'var(--surface-color)' }}>
            <tr>
              <th style={{ padding: '15px', borderBottom: '2px solid var(--border-color)' }}>Họ tên</th>
              <th style={{ padding: '15px', borderBottom: '2px solid var(--border-color)' }}>Đời</th>
              <th style={{ padding: '15px', borderBottom: '2px solid var(--border-color)' }}>Là con của</th>
              <th style={{ padding: '15px', borderBottom: '2px solid var(--border-color)' }}>Tình trạng</th>
              <th style={{ padding: '15px', borderBottom: '2px solid var(--border-color)' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {flatList.map(member => (
              <tr key={member.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '12px 15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <img src={member.avatar || 'https://via.placeholder.com/150'} alt={member.name} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                  <div>
                    <div style={{ fontWeight: 'bold', color: member.isMainLineage ? 'var(--primary-color)' : 'var(--text-primary)' }}>
                      {member.name} {member.isMainLineage && '👑'}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{member.birthDate || '?'} - {member.deathDate || '?'}</div>
                  </div>
                </td>
                <td style={{ padding: '12px 15px' }}>Đời {member.generation}</td>
                <td style={{ padding: '12px 15px', color: 'var(--text-secondary)' }}>{member.parentName}</td>
                <td style={{ padding: '12px 15px' }}>
                  {member.isAlive ? <span style={{ color: '#27ae60' }}>Đang sống</span> : <span style={{ color: '#7f8c8d' }}>Đã mất</span>}
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
              {modalMode === 'add' ? 'Thêm Người Con Mới' : 'Cập Nhật Thông Tin'}
            </h2>
            
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
                      const fd = new FormData();
                      fd.append('image', file);
                      fd.append('type', 'avatar');
                      try {
                        const res = await fetch('http://localhost:3001/api/upload', { method: 'POST', body: fd });
                        const data = await res.json();
                        if(data.success) {
                          setFormData({...formData, avatar: data.url});
                          alert('Tải ảnh thành công!');
                        } else {
                          alert('Lỗi: ' + data.error);
                        }
                      } catch(err) {
                        alert('Lỗi kết nối Server Tải ảnh!');
                      }
                    }} />
                  </label>
                </div>
              </div>
              
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Năm sinh</label>
                <input type="text" value={formData.birthDate} onChange={e => setFormData({...formData, birthDate: e.target.value})} placeholder="VD: 1990" style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Năm mất (Để trống nếu còn sống)</label>
                <input type="text" value={formData.deathDate} onChange={e => setFormData({...formData, deathDate: e.target.value})} placeholder="VD: 2050" style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
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
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Phu nhân / Phu quân</label>
                <input type="text" value={formData.spouse} onChange={e => setFormData({...formData, spouse: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Nghề nghiệp</label>
                <input type="text" value={formData.occupation} onChange={e => setFormData({...formData, occupation: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Nơi ở / Quê quán</label>
                <input type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
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
