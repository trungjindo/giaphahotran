import React, { useEffect, useRef, useState } from 'react';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

// Ô tìm địa chỉ có gợi ý — dùng Nominatim (OpenStreetMap), miễn phí và không cần API key,
// thay cho Google Places (yêu cầu tài khoản Google Cloud + bật thanh toán).
//
// Có 2 cách dùng, cùng dẫn tới việc ghim vị trí lên bản đồ:
//   1. Gõ rồi ĐỢI danh sách gợi ý hiện ra, bấm chọn 1 dòng.
//   2. Gõ rồi bấm Enter (hoặc bấm nút kính lúp) — tìm NGAY, không phải đợi, và tự chọn
//      kết quả khớp nhất để bản đồ bay tới và đánh dấu luôn. Danh sách vẫn mở để đổi sang
//      kết quả khác nếu chọn nhầm.
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
  const debounceRef = useRef(null);
  // Bỏ qua lần tìm đầu tiên khi ô được điền sẵn initialValue — nếu không, mở form Sửa lên là
  // dropdown gợi ý tự bung ra dù người dùng chưa gõ gì.
  const skipNextSearchRef = useRef(Boolean(initialValue));

  const runSearch = async (text) => {
    const q = text.trim();
    if (q.length < 3) return [];
    setIsLoading(true);
    setNotFound(false);
    try {
      const url = `${NOMINATIM_URL}?format=json&q=${encodeURIComponent(q)}&limit=5&accept-language=vi`;
      const res = await fetch(url);
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
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

  // Gợi ý theo từng chữ đang gõ (có độ trễ để không gọi API liên tục).
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    // Bỏ qua 1 lần tìm kiếm ngay sau khi người dùng vừa CHỌN 1 gợi ý (query được set
    // theo lập trình từ handleSelect) — nếu không, effect này sẽ tự tìm lại đúng địa chỉ
    // vừa chọn và bật dropdown mở lại ngay sau khi đã đóng.
    if (skipNextSearchRef.current) {
      skipNextSearchRef.current = false;
      return;
    }

    if (query.trim().length < 3) {
      setResults([]);
      setIsLoading(false);
      setNotFound(false);
      return;
    }

    setIsLoading(true);
    debounceRef.current = setTimeout(() => { runSearch(query); }, 500);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const handleSelect = (result) => {
    skipNextSearchRef.current = true;
    setQuery(result.display_name);
    setIsOpen(false);
    setResults([]);
    setNotFound(false);
    onSelect({ lat: parseFloat(result.lat), lng: parseFloat(result.lon), label: result.display_name });
  };

  // Enter / bấm nút kính lúp: tìm ngay và ghim luôn kết quả khớp nhất, khỏi phải đợi rồi bấm.
  const searchAndPick = async () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
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
            <li key={r.place_id ?? idx}>
              <button
                type="button"
                className={idx === highlight ? 'is-highlighted' : ''}
                onMouseDown={e => e.preventDefault()}
                onMouseEnter={() => setHighlight(idx)}
                onClick={() => handleSelect(r)}
              >
                {r.display_name}
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
