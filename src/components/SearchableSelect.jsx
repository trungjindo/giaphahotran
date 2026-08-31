import React, { useEffect, useMemo, useRef, useState } from 'react';
import { matchesSearch, matchScore } from '../utils/text';

// Ô "chọn 1 mục" có GÕ ĐỂ TÌM — thay cho <select> thường khi danh sách dài (danh sách người
// đã mất trong cây gia phả, danh sách lăng...). Với <select> thường, người dùng phải cuộn tay
// qua hàng trăm dòng mới thấy người cần chọn.
// Tìm không phân biệt dấu và hoa/thường (xem utils/text.js).
//
// options: [{ value, label, sublabel? , keywords? }]
//   - label    : dòng chính hiện trong danh sách và trong ô sau khi chọn
//   - sublabel : dòng phụ mờ bên dưới (mã định danh, đời, số người trong lăng...)
//   - keywords : chuỗi phụ cũng được đem đi so khớp dù không hiện ra
const SearchableSelect = ({
  options,
  value,
  onChange,
  placeholder = 'Gõ để tìm...',
  emptyText = 'Không tìm thấy mục nào phù hợp.',
  disabled = false,
  id,
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef(null);
  const listRef = useRef(null);

  const selected = useMemo(
    () => options.find(o => String(o.value) === String(value)) || null,
    [options, value]
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const hits = options.filter(o => matchesSearch(`${o.label} ${o.sublabel || ''} ${o.keywords || ''}`, query));
    // Xếp hạng để mục khớp sát nhất nổi lên đầu: gõ "tran dinh a" phải cho "Trần Đình A"
    // đứng trước "Trần Đình Khởi" (vốn cũng khớp vì chữ "a" nằm trong "tran").
    // Giữ nguyên thứ tự gốc giữa các mục cùng điểm (sort của JS là sort ổn định).
    return hits
      .map((o, i) => ({ o, i, score: matchScore(o.label, query) }))
      .sort((a, b) => a.score - b.score || a.i - b.i)
      .map(x => x.o);
  }, [options, query]);

  // Đóng danh sách khi bấm ra ngoài. Dùng "mousedown" thay vì "click" để danh sách đóng
  // ngay khi vừa nhấn chuột, không đợi tới lúc nhả chuột.
  useEffect(() => {
    if (!isOpen) return;
    const onDocDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, [isOpen]);

  // Giữ mục đang được tô sáng luôn nằm trong vùng nhìn thấy khi di chuyển bằng phím mũi tên.
  useEffect(() => {
    if (!isOpen || !listRef.current) return;
    const el = listRef.current.children[highlight];
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [highlight, isOpen]);

  const open = () => { if (!disabled) { setIsOpen(true); setQuery(''); setHighlight(0); } };

  const choose = (opt) => {
    onChange(opt ? opt.value : '');
    setIsOpen(false);
    setQuery('');
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') { e.preventDefault(); open(); }
      return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight(h => Math.min(h + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight(h => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (filtered[highlight]) choose(filtered[highlight]); }
    else if (e.key === 'Escape') { setIsOpen(false); setQuery(''); }
  };

  return (
    <div className="searchable-select" ref={wrapRef}>
      <div className="searchable-select-field">
        <input
          id={id}
          type="text"
          className="input-control"
          style={{ width: '100%' }}
          // Khi đang mở: ô là chỗ gõ từ khóa. Khi đã đóng: ô hiển thị mục đang chọn.
          value={isOpen ? query : (selected ? selected.label : '')}
          onChange={e => { setQuery(e.target.value); setHighlight(0); if (!isOpen) setIsOpen(true); }}
          onFocus={open}
          onKeyDown={handleKeyDown}
          placeholder={selected && !isOpen ? selected.label : placeholder}
          autoComplete="off"
          disabled={disabled}
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={id ? `${id}-listbox` : undefined}
        />
        {selected && !disabled && (
          <button
            type="button"
            className="searchable-select-clear"
            onClick={() => choose(null)}
            aria-label="Bỏ chọn"
            title="Bỏ chọn"
          >
            ✕
          </button>
        )}
      </div>

      {isOpen && (
        <ul className="searchable-select-list" id={id ? `${id}-listbox` : undefined} role="listbox" ref={listRef}>
          {filtered.map((o, idx) => (
            <li key={o.value} role="option" aria-selected={String(o.value) === String(value)}>
              <button
                type="button"
                className={idx === highlight ? 'is-highlighted' : ''}
                // onMouseDown chặn mất focus của ô input trước khi onClick kịp chạy.
                onMouseDown={e => e.preventDefault()}
                onMouseEnter={() => setHighlight(idx)}
                onClick={() => choose(o)}
              >
                <span className="searchable-select-label">{o.label}</span>
                {o.sublabel && <span className="searchable-select-sublabel">{o.sublabel}</span>}
              </button>
            </li>
          ))}
          {filtered.length === 0 && <li className="searchable-select-empty">{emptyText}</li>}
        </ul>
      )}
    </div>
  );
};

export default SearchableSelect;
