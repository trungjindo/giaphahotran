import React, { useEffect, useRef, useState } from 'react';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

// Ô tìm địa chỉ có gợi ý — dùng Nominatim (OpenStreetMap), miễn phí và không cần API key,
// thay cho Google Places (yêu cầu tài khoản Google Cloud + bật thanh toán).
// initialValue: điền sẵn địa chỉ đã lưu khi mở form ở chế độ SỬA. Chỉ dùng làm giá trị khởi
// tạo — muốn nạp lại giá trị khác cho bản ghi khác thì truyền prop "key" khác từ bên ngoài.
const AddressAutocomplete = ({ onSelect, placeholder = 'Tìm địa chỉ...', className = '', initialValue = '' }) => {
  const [query, setQuery] = useState(initialValue);
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef(null);
  // Bỏ qua lần tìm đầu tiên khi ô được điền sẵn initialValue — nếu không, mở form Sửa lên là
  // dropdown gợi ý tự bung ra dù người dùng chưa gõ gì.
  const skipNextSearchRef = useRef(Boolean(initialValue));

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
      return;
    }

    setIsLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const url = `${NOMINATIM_URL}?format=json&q=${encodeURIComponent(query.trim())}&limit=5&accept-language=vi`;
        const res = await fetch(url);
        const data = await res.json();
        setResults(Array.isArray(data) ? data : []);
        setIsOpen(true);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 500);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const handleSelect = (result) => {
    skipNextSearchRef.current = true;
    setQuery(result.display_name);
    setIsOpen(false);
    setResults([]);
    onSelect({ lat: parseFloat(result.lat), lng: parseFloat(result.lon), label: result.display_name });
  };

  return (
    <div className={`address-autocomplete ${className}`}>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          className="input-control"
          style={{ width: '100%' }}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 150)}
          placeholder={placeholder}
          autoComplete="off"
        />
        {isLoading && <span className="address-autocomplete-spinner" aria-hidden="true" />}
      </div>

      {isOpen && results.length > 0 && (
        <ul className="address-autocomplete-results">
          {results.map((r, idx) => (
            <li key={r.place_id ?? idx}>
              <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => handleSelect(r)}>
                {r.display_name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AddressAutocomplete;
