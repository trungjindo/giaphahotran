import React, { useState, useContext, useRef, useMemo } from 'react';
import { AppContext } from '../store';
import { flattenFamily, buildFamilyCodeMap, buildDescendantList } from '../utils/family';
import MemberProfileModal from '../components/MemberProfileModal';

const matchesFilters = (node, filterProvince, filterRegistered) => {
  if (filterProvince && node.currentProvince !== filterProvince) return false;
  if (filterRegistered === 'yes' && !node.isRegistered) return false;
  if (filterRegistered === 'no' && node.isRegistered) return false;
  return true;
};

const TreeNode = ({ node, onSelect, filterProvince, filterRegistered, codeMap }) => {
  // Mặc định chỉ mở rộng 2 đời đầu, các đời sau sẽ bị ẩn đi để tiết kiệm không gian
  const [isExpanded, setIsExpanded] = useState(node.generation < 2);
  const hasChildren = node.children && node.children.length > 0;

  const isMain = node.isMainLineage;
  const isAlive = node.isAlive;
  const hasActiveFilter = !!filterProvince || !!filterRegistered;
  const isFilterMatch = hasActiveFilter && matchesFilters(node, filterProvince, filterRegistered);

  const borderColor = isMain ? 'var(--primary-color)' : 'var(--text-secondary)';
  const avatarBorder = isAlive ? '#1E8449' : 'var(--text-secondary)';

  return (
    <div className="tree-node-wrapper">
      <div
        className="tree-node"
        style={{
          borderColor: isFilterMatch ? 'var(--secondary-color)' : borderColor,
          boxShadow: isFilterMatch ? '0 0 0 3px rgba(242,196,106,0.4)' : undefined,
          opacity: hasActiveFilter && !isFilterMatch ? 0.4 : 1
        }}
      >
        <div
          className="node-content"
          onClick={() => onSelect(node)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(node); } }}
          role="button"
          tabIndex={0}
          aria-label={`Xem hồ sơ ${node.name}`}
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
            <h4 style={{ color: isMain ? 'var(--primary-color)' : 'var(--text-primary)' }}>
              {node.name} {node.gender === 'Nam' ? '♂' : node.gender === 'Nữ' ? '♀' : ''}
            </h4>
            <span className="generation">Đời {node.generation}</span>
            {codeMap && codeMap[node.id] && (
              <span className="member-code" title="Mã định danh phả hệ">#{codeMap[node.id]}</span>
            )}
          </div>
        </div>

        {hasChildren && (
          <button
            className="expand-btn"
            onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? `Thu gọn nhánh của ${node.name}` : `Mở rộng nhánh của ${node.name}`}
            title={isExpanded ? "Thu gọn nhánh" : "Mở rộng nhánh"}
          >
            {isExpanded ? '−' : '+'}
          </button>
        )}
      </div>

      {hasChildren && isExpanded && (
        <div className="tree-children">
          {node.children.map(child => (
            <TreeNode key={child.id} node={child} onSelect={onSelect} filterProvince={filterProvince} filterRegistered={filterRegistered} codeMap={codeMap} />
          ))}
        </div>
      )}
    </div>
  );
};

function FamilyTreePage() {
  const { familyData } = useContext(AppContext);
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [filterProvince, setFilterProvince] = useState('');
  const [filterRegistered, setFilterRegistered] = useState('');

  const provinceOptions = useMemo(() => {
    const members = flattenFamily(familyData);
    return [...new Set(members.map(m => m.currentProvince).filter(Boolean))].sort();
  }, [familyData]);

  const codeMap = useMemo(() => buildFamilyCodeMap(familyData), [familyData]);

  const descendantList = useMemo(() => buildDescendantList(familyData), [familyData]);
  const selectedMember = useMemo(
    () => descendantList.find(m => m.id === selectedMemberId) || null,
    [descendantList, selectedMemberId]
  );

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
        <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
             <span style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid var(--primary-color)', borderRadius: '3px' }}></span> Nhánh đích tôn
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
             <span style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid #1E8449', borderRadius: '50%' }}></span> Đang sống
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
             <span style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid var(--text-secondary)', borderRadius: '50%' }}></span> Đã mất
          </span>
        </div>
      </div>

      <div className="tree-toolbar">
        <button className="btn-icon" onClick={handleZoomOut} aria-label="Thu nhỏ" title="Thu nhỏ">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round"><path d="M5 12h14" /></svg>
        </button>
        <span style={{ fontWeight: 'bold', width: '50px', textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
        <button className="btn-icon" onClick={handleZoomIn} aria-label="Phóng to" title="Phóng to">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
        </button>
        <button className="btn-icon" onClick={handleResetZoom} aria-label="Về mặc định" title="Mặc định" style={{ marginLeft: '10px' }}>
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 1 3 6.7" /><path d="M3 20v-6h6" /></svg>
        </button>
        <span style={{ marginLeft: '15px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Dùng chuột nhấn giữ và kéo để di chuyển sơ đồ
        </span>
        {provinceOptions.length > 0 && (
          <select
            className="select-control"
            value={filterProvince}
            onChange={e => setFilterProvince(e.target.value)}
            aria-label="Lọc theo khu vực"
            style={{ marginLeft: '15px', padding: '7px 12px' }}
          >
            <option value="">Lọc theo khu vực...</option>
            {provinceOptions.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        )}
        <select
          className="select-control"
          value={filterRegistered}
          onChange={e => setFilterRegistered(e.target.value)}
          aria-label="Lọc theo suất đinh"
          style={{ marginLeft: '10px', padding: '7px 12px' }}
        >
          <option value="">Lọc theo suất đinh...</option>
          <option value="yes">Đã đăng ký</option>
          <option value="no">Chưa đăng ký</option>
        </select>
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
            {familyData ? (
              <TreeNode
                node={familyData}
                onSelect={node => setSelectedMemberId(node.id)}
                filterProvince={filterProvince}
                filterRegistered={filterRegistered}
                codeMap={codeMap}
              />
            ) : <p>Không có dữ liệu</p>}
          </div>
        </div>
      </div>

      <style>{`
        .tree-toolbar {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
          background: var(--surface-color);
          padding: 10px;
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-sm);
          margin-bottom: 15px;
          gap: 5px;
        }

        .btn-icon {
          background: var(--color-sand);
          color: var(--primary-color);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background-color var(--transition-fast), transform var(--transition-micro);
          font-size: 1rem;
        }

        .btn-icon:hover {
          background: var(--accent-teal-light);
          color: white;
        }

        .btn-icon:active {
          transform: scale(0.94);
        }

        .tree-scroll-container {
          flex: 1;
          overflow: auto;
          background: var(--surface-color);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-sm);
          padding: 20px;
          position: relative;
          cursor: grab;
        }

        .tree-scroll-container:active {
          cursor: grabbing;
        }

        .tree-scale-wrapper {
          transition: transform var(--transition-normal);
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
          background: var(--surface-color);
          border: 2px solid;
          border-radius: var(--radius-sm);
          padding: 10px 15px; /* Thu gọn padding */
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          z-index: 2;
          min-width: 120px; /* Thu gọn chiều rộng */
          box-shadow: var(--shadow-sm);
          transition: box-shadow var(--transition-normal);
        }

        .tree-node:hover {
          box-shadow: var(--shadow-md);
        }

        .node-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
          border-radius: var(--radius-sm);
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
          transition: transform var(--transition-fast);
        }
        
        .node-info h4 {
          margin: 0;
          font-family: var(--font-serif);
          font-size: 1rem; /* Chữ nhỏ lại */
          font-weight: 700;
          text-align: center;
        }
        
        .member-code {
          font-size: 0.65rem;
          color: var(--text-secondary);
          font-family: monospace;
          display: block;
          margin-top: 2px;
        }

        .generation {
          font-size: 0.75rem;
          color: var(--primary-color);
          background: var(--color-sand);
          padding: 2px 8px;
          border-radius: var(--radius-pill);
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
          background: var(--surface-color);
          color: var(--text-primary);
          font-weight: bold;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          line-height: 1;
          box-shadow: var(--shadow-sm);
          transition: background-color var(--transition-fast), transform var(--transition-micro);
        }

        .expand-btn:hover {
          background: var(--color-sand);
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
      `}</style>

      <MemberProfileModal member={selectedMember} onClose={() => setSelectedMemberId(null)} />
    </div>
  );
}

export default FamilyTreePage;
