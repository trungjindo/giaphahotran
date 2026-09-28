import React, { useEffect, useState } from 'react';
import { searchPlaces } from '../utils/googleMaps';

// Ô tìm địa chỉ có gợi ý — dùng Google Places/Geocoding (xem utils/googleMaps.js).
//
// Có 2 cách dùng, cùng dẫn tới việc ghim vị trí lên bản đồ:
// Gõ địa chỉ rồi bấm Enter (hoặc nút kính lúp) để tìm. Kết quả khớp nhất được chọn sẵn để
// bản đồ bay tới và đánh dấu luôn, danh sách vẫn mở để đổi sang kết quả khác nếu chưa đúng.
//
// Cố ý KHÔNG tự tìm trong lúc gõ: mỗi lượt tìm là một lượt gọi Google có tính phí, nên chỉ
// gọi khi người dùng thật sự yêu cầu.
//
// initialValue: điền sẵn địa chỉ đã lưu khi mở form ở chế độ SỬA. Chỉ dùng làm giá trị khởi
// tạo — muốn nạp lại giá trị khác cho bản ghi khác thì truyền prop "key" khác từ bên ngoài.
const AddressAutocomplete = ({ onSelect, placeholder = 'Tìm địa chỉ...', className = '', initialValue = '' }) => {
  const [query, setQuery] = useState(initialValue);
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [highlight, setHighlight] = useState(-1);

  const runSearch = async (text) => {
    const q = text.trim();
    if (q.length < 3) return [];
    setIsLoading(true);
    setNotFound(false);
    try {
      const list = await searchPlaces(q);
      setResults(list);
      setIsOpen(true);
      setHighlight(-1);
      setNotFound(list.length === 0);
      return list;
    } catch {
      setResults([]);
      setNotFound(true);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // KHÔNG tự tìm trong lúc gõ.
  //
  // Trước đây cứ ngừng gõ 0,5 giây là gọi Google một lần, nên nhập xong một địa chỉ dài có
  // thể tốn dăm bảy lượt gọi tính phí trong khi người dùng chỉ cần đúng 1 kết quả. Giờ chỉ
  // tìm khi người dùng CHỦ ĐỘNG yêu cầu — bấm Enter hoặc nút kính lúp.
  useEffect(() => {
    // Gõ lại thì kết quả cũ không còn đúng nữa, dọn đi cho khỏi chọn nhầm.
    setResults([]);
    setNotFound(false);
    setIsOpen(false);
  }, [query]);

  const handleSelect = (result) => {
    setQuery(result.label);
    setIsOpen(false);
    setResults([]);
    setNotFound(false);
    onSelect({ lat: result.lat, lng: result.lng, label: result.label });
  };

  // Enter / bấm nút kính lúp: tìm ngay và ghim luôn kết quả khớp nhất, khỏi phải đợi rồi bấm.
  const searchAndPick = async () => {
    if (query.trim().length < 3) return;
    const list = await runSearch(query);
    if (list.length > 0) handleSelect(list[0]);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Đang tô sáng 1 dòng gợi ý thì chọn đúng dòng đó, ngược lại tìm mới và lấy kết quả đầu.
      if (isOpen && highlight >= 0 && results[highlight]) handleSelect(results[highlight]);
      else searchAndPick();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (results.length > 0) { setIsOpen(true); setHighlight(h => Math.min(h + 1, results.length - 1)); }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight(h => Math.max(h - 1, 0));
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className={`address-autocomplete ${className}`}>
      <div className="address-autocomplete-field">
        <input
          type="text"
          className="input-control"
          value={query}
          onChange={e => { setQuery(e.target.value); setHighlight(-1); }}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
        />
        {isLoading && <span className="address-autocomplete-spinner" aria-hidden="true" />}
        <button
          type="button"
          className="address-autocomplete-search"
          onMouseDown={e => e.preventDefault()}
          onClick={searchAndPick}
          // KHÔNG khóa nút theo isLoading: isLoading bật lên ngay khi vừa gõ (trong lúc chờ
          // debounce), tức là nút sẽ bị khóa đúng vào lúc người dùng muốn bấm. Bấm giữa chừng
          // là hợp lệ — searchAndPick() hủy debounce đang chờ rồi tìm ngay.
          disabled={query.trim().length < 3}
          title="Tìm địa chỉ và đánh dấu trên bản đồ"
          aria-label="Tìm địa chỉ và đánh dấu trên bản đồ"
        >
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <line x1="16.5" y1="16.5" x2="21" y2="21" />
          </svg>
        </button>
      </div>

      {isOpen && results.length > 0 && (
        <ul className="address-autocomplete-results">
          {results.map((r, idx) => (
            <li key={idx}>
              <button
                type="button"
                className={idx === highlight ? 'is-highlighted' : ''}
                onMouseDown={e => e.preventDefault()}
                onMouseEnter={() => setHighlight(idx)}
                onClick={() => handleSelect(r)}
              >
                {r.label}
              </button>
            </li>
          ))}
        </ul>
      )}

      {notFound && !isLoading && (
        <div className="address-autocomplete-notfound">
          Không tìm thấy địa chỉ này. Thử gõ ngắn gọn hơn (VD: "Nghĩa trang Vị Hoàng, Nam Định"),
          hoặc bấm thẳng lên bản đồ để đặt ghim.
        </div>
      )}
    </div>
  );
};

export default AddressAutocomplete;
