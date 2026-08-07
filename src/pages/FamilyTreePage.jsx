import React, { useState, useContext, useRef } from 'react';
import { AppContext } from '../store';

// Lấy danh sách con cái
const getChildrenNames = (children) => {
  if (!children || children.length === 0) return 'Chưa có thông tin';
  return children.map(c => c.name).join(', ');
};

const TreeNode = ({ node, onSelect }) => {
  // Mặc định chỉ mở rộng 2 đời đầu, các đời sau sẽ bị ẩn đi để tiết kiệm không gian
  const [isExpanded, setIsExpanded] = useState(node.generation < 2); 
  const hasChildren = node.children && node.children.length > 0;

  const isMain = node.isMainLineage;
  const isAlive = node.isAlive;
  
  const borderColor = isMain ? 'var(--primary-color)' : '#7f8c8d';
  const avatarBorder = isAlive ? '#2ecc71' : '#95a5a6';

  return (
    <div className="tree-node-wrapper">
      <div 
        className="tree-node" 
        style={{ borderColor: borderColor }}
      >
        <div 
          className="node-content" 
          onClick={() => onSelect(node)}
          title="Bấm để xem hồ sơ"
        >
          <div className="node-avatar-container">
            <img 
              src={node.avatar || 'https://via.placeholder.com/150'} 
              alt={node.name}
              className="node-avatar-img"
              style={{ 
                border: `2px solid ${avatarBorder}`,
                filter: isAlive ? 'none' : 'grayscale(100%)'
              }}
            />
          </div>
          <div className="node-info">
            <h4 style={{ color: isMain ? 'var(--primary-color)' : 'var(--text-primary)' }}>{node.name}</h4>
            <span className="generation">Đời {node.generation}</span>
          </div>
        </div>
        
        {hasChildren && (
          <button 
            className="expand-btn" 
            onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
            title={isExpanded ? "Thu gọn nhánh" : "Mở rộng nhánh"}
          >
            {isExpanded ? '−' : '+'}
          </button>
        )}
      </div>
      
      {hasChildren && isExpanded && (
        <div className="tree-children">
          {node.children.map(child => (
            <TreeNode key={child.id} node={child} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
};

function FamilyTreePage() {
  const { familyData } = useContext(AppContext);
  const [selectedMember, setSelectedMember] = useState(null);
  
  // Trạng thái cho tính năng Zoom và Pan (Kéo thả)
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.15, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.15, 0.3));
  const handleResetZoom = () => setZoom(1);

  // Logic kéo thả để di chuyển cây gia phả
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setStartX(e.pageX - containerRef.current.offsetLeft);
    setStartY(e.pageY - containerRef.current.offsetTop);
    setScrollLeft(containerRef.current.scrollLeft);
    setScrollTop(containerRef.current.scrollTop);
  };
  const handleMouseLeave = () => setIsDragging(false);
  const handleMouseUp = () => setIsDragging(false);
  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - containerRef.current.offsetLeft;
    const y = e.pageY - containerRef.current.offsetTop;
    const walkX = (x - startX) * 1.5; 
    const walkY = (y - startY) * 1.5;
    containerRef.current.scrollLeft = scrollLeft - walkX;
    containerRef.current.scrollTop = scrollTop - walkY;
  };

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)', padding: '20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '15px' }}>
        <h2 style={{ marginBottom: '5px' }}>Sơ Đồ Gia Phả</h2>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', fontSize: '0.9rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
             <span style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid var(--primary-color)', borderRadius: '3px' }}></span> Nhánh đích tôn
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
             <span style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid #2ecc71', borderRadius: '50%' }}></span> Đang sống
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
             <span style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid #95a5a6', borderRadius: '50%', filter: 'grayscale(100%)' }}></span> Đã mất
          </span>
        </div>
      </div>

      <div className="tree-toolbar">
        <button className="btn-icon" onClick={handleZoomOut} title="Thu nhỏ">➖</button>
        <span style={{ fontWeight: 'bold', width: '50px', textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
        <button className="btn-icon" onClick={handleZoomIn} title="Phóng to">➕</button>
        <button className="btn-icon" onClick={handleResetZoom} title="Mặc định" style={{ marginLeft: '10px' }}>🔄</button>
        <span style={{ marginLeft: '15px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          💡 Dùng chuột nhấn giữ và kéo để di chuyển sơ đồ
        </span>
      </div>

      <div 
        className="tree-scroll-container" 
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
      >
        <div 
          className="tree-scale-wrapper" 
          style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
        >
          <div className="tree-container">
            {familyData ? <TreeNode node={familyData} onSelect={setSelectedMember} /> : <p>Không có dữ liệu</p>}
          </div>
        </div>
      </div>

      <style>{`
        .tree-toolbar {
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--surface-color);
          padding: 10px;
          border-radius: 8px;
          box-shadow: var(--shadow-sm);
          margin-bottom: 15px;
          gap: 5px;
        }

        .btn-icon {
          background: #f1f2f6;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 1rem;
        }

        .btn-icon:hover {
          background: #dfe4ea;
        }

        .tree-scroll-container {
          flex: 1;
          overflow: auto;
          background: var(--surface-color);
          border-radius: 12px;
          box-shadow: var(--shadow-sm);
          padding: 20px;
          position: relative;
          cursor: grab;
        }

        .tree-scroll-container:active {
          cursor: grabbing;
        }

        .tree-scale-wrapper {
          transition: transform 0.3s ease;
          min-width: 100%;
          display: flex;
          justify-content: center;
        }

        .tree-container {
          display: flex;
          justify-content: center;
          min-width: max-content;
          padding: 20px;
        }
        
        .tree-node-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          margin: 0 10px; /* Thu gọn khoảng cách ngang */
        }
        
        .tree-node {
          background: white;
          border: 2px solid;
          border-radius: 8px;
          padding: 10px 15px; /* Thu gọn padding */
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          z-index: 2;
          min-width: 120px; /* Thu gọn chiều rộng */
          box-shadow: 0 2px 5px rgba(0,0,0,0.05);
        }

        .node-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
        }
        
        .node-content:hover .node-avatar-img {
          transform: scale(1.05);
        }
        
        .node-avatar-container {
          margin-bottom: 8px;
        }

        .node-avatar-img {
          width: 50px; /* Avatar nhỏ lại */
          height: 50px;
          border-radius: 50%;
          object-fit: cover;
          background: var(--bg-color);
          transition: transform 0.2s;
        }
        
        .node-info h4 {
          margin: 0;
          font-family: var(--font-serif);
          font-size: 1rem; /* Chữ nhỏ lại */
          font-weight: 700;
          text-align: center;
        }
        
        .generation {
          font-size: 0.75rem;
          color: var(--text-secondary);
          background: var(--bg-color);
          padding: 2px 6px;
          border-radius: 10px;
          margin-top: 4px;
          display: inline-block;
          text-align: center;
        }

        .expand-btn {
          margin-top: 8px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 1px solid var(--border-color);
          background: white;
          color: var(--text-primary);
          font-weight: bold;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          line-height: 1;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          transition: all 0.2s;
        }

        .expand-btn:hover {
          background: var(--bg-color);
          transform: scale(1.1);
        }
        
        .tree-children {
          display: flex;
          margin-top: 25px; /* Giảm khoảng cách dọc */
          position: relative;
        }
        
        /* Cập nhật đường kẻ mỏng và ngắn hơn */
        .tree-children::before {
          content: '';
          position: absolute;
          top: -15px;
          left: 50%;
          width: 0;
          height: 15px;
          border-left: 1.5px solid var(--border-color);
        }
        
        .tree-node-wrapper::before {
          content: '';
          position: absolute;
          top: -15px;
          left: 50%;
          width: 0;
          height: 15px;
          border-left: 1.5px solid var(--border-color);
        }
        
        .tree-children .tree-node-wrapper:first-child::after {
          content: '';
          position: absolute;
          top: -15px;
          left: 50%;
          width: 50%;
          height: 1.5px;
          background: var(--border-color);
        }
        
        .tree-children .tree-node-wrapper:last-child::after {
          content: '';
          position: absolute;
          top: -15px;
          right: 50%;
          width: 50%;
          height: 1.5px;
          background: var(--border-color);
        }
        
        .tree-children .tree-node-wrapper:not(:first-child):not(:last-child)::after {
          content: '';
          position: absolute;
          top: -15px;
          left: 0;
          width: 100%;
          height: 1.5px;
          background: var(--border-color);
        }
        
        .tree-children .tree-node-wrapper:first-child:last-child::after {
          display: none;
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed; 
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.6); 
          backdrop-filter: blur(5px);
          display: flex; 
          align-items: center; 
          justify-content: center;
          z-index: 2000; 
          padding: 20px;
        }

        .modal-content {
          max-width: 700px; 
          width: 100%; 
          position: relative;
          background: white;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: var(--shadow-lg);
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-header {
          background: linear-gradient(135deg, var(--primary-color), var(--primary-light));
          padding: 30px 20px;
          color: white;
          text-align: center;
          position: relative;
        }

        .modal-avatar {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          border: 4px solid white;
          object-fit: cover;
          margin-top: -80px;
          box-shadow: var(--shadow-md);
          background: white;
        }

        .close-btn {
          position: absolute;
          top: 15px; 
          right: 20px; 
          background: rgba(255,255,255,0.2); 
          border: none; 
          color: white;
          width: 35px;
          height: 35px;
          border-radius: 50%;
          font-size: 1.2rem; 
          cursor: pointer;
          transition: background 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .close-btn:hover {
          background: rgba(255,255,255,0.4);
        }

        .achievements-box {
          background: linear-gradient(135deg, #fff9c4, #fff59d);
          border-left: 5px solid var(--secondary-color);
          padding: 20px;
          border-radius: 8px;
          margin-top: 25px;
          box-shadow: var(--shadow-sm);
        }

        .achievements-box h3 {
          color: #d35400;
          margin-top: 0;
          display: flex;
          align-items: center;
          gap: 10px;
        }
      `}</style>

      {/* Member Profile Modal */}
      {selectedMember && (
        <div className="modal-overlay" onClick={() => setSelectedMember(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <button className="close-btn" onClick={() => setSelectedMember(null)}>✕</button>
              <div style={{ height: '40px' }}></div>
            </div>

            <div style={{ padding: '0 30px 30px', textAlign: 'center' }}>
              <img 
                src={selectedMember.avatar || 'https://via.placeholder.com/150'} 
                alt={selectedMember.name} 
                className="modal-avatar"
                style={{ filter: selectedMember.isAlive ? 'none' : 'grayscale(100%)' }}
              />
              <h2 style={{ margin: '15px 0 5px', fontFamily: 'var(--font-serif)', color: 'var(--primary-color)' }}>
                {selectedMember.name}
              </h2>
              <span className="generation" style={{ display: 'inline-block', marginBottom: '25px', padding: '5px 15px', fontSize: '0.9rem' }}>Đời thứ {selectedMember.generation}</span>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', textAlign: 'left', background: 'var(--bg-color)', padding: '20px', borderRadius: '8px' }}>
                <div><strong>Năm sinh:</strong> {selectedMember.birthDate || 'Chưa rõ'}</div>
                <div><strong>Tình trạng:</strong> {selectedMember.isAlive ? <span style={{color: '#27ae60', fontWeight: 'bold'}}>Đang sống</span> : <span style={{color: '#7f8c8d'}}>Đã mất ({selectedMember.deathDate || 'Chưa rõ'})</span>}</div>
                <div><strong>Nơi ở/Quê quán:</strong> {selectedMember.location || 'Chưa rõ'}</div>
                <div><strong>Nghề nghiệp:</strong> {selectedMember.occupation || 'Chưa rõ'}</div>
                <div style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--border-color)', paddingTop: '15px' }}>
                  <strong>Phu nhân / Phu quân:</strong> {selectedMember.spouse || 'Chưa rõ'}
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <strong>Con cái:</strong> {getChildrenNames(selectedMember.children)}
                </div>
              </div>
              
              {selectedMember.description && (
                <div style={{ marginTop: '25px', textAlign: 'left', lineHeight: '1.7', color: 'var(--text-primary)' }}>
                  <h3 style={{ borderBottom: '2px solid var(--primary-light)', display: 'inline-block', paddingBottom: '5px', marginBottom: '15px' }}>Tiểu sử</h3>
                  <p>{selectedMember.description}</p>
                </div>
              )}
              
              {selectedMember.achievements && selectedMember.achievements.length > 0 && (
                <div className="achievements-box" style={{ textAlign: 'left' }}>
                  <h3>🏆 Thành Tựu Nổi Bật</h3>
                  <p style={{ fontStyle: 'italic', color: '#555', marginBottom: '15px' }}>Tấm gương sáng cho con cháu dòng họ noi theo:</p>
                  <ul style={{ paddingLeft: '25px', listStyleType: 'square', lineHeight: '1.8', fontSize: '1.05rem', fontWeight: '500' }}>
                    {selectedMember.achievements.map((ach, idx) => <li key={idx}>{ach}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FamilyTreePage;
