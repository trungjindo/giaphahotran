import React, { useRef, useState } from 'react';
import { TileLayer } from 'react-leaflet';

// Lớp nền bản đồ có NGUỒN DỰ PHÒNG.
//
// Máy chủ ô bản đồ của OpenStreetMap có lúc chậm hoặc bị chặn ở một số nhà mạng Việt Nam.
// Khi đó Leaflet không báo gì cả, chỉ để lại một mảng XÁM trống — đúng hiện tượng đã gặp.
// Ở đây đếm số ô tải hỏng, quá ngưỡng thì tự chuyển sang nguồn khác (Carto, cùng dữ liệu
// OpenStreetMap nhưng khác đường truyền). Người dùng không phải làm gì.
const SOURCES = [
  {
    id: 'osm',
    name: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  {
    id: 'carto',
    name: 'Carto',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
    subdomains: 'abcd',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
];

// Vài ô lẻ tẻ hỏng là chuyện bình thường (ô ở rìa, mất mạng chớp nhoáng). Chỉ coi là nguồn
// hỏng khi hỏng nhiều — nếu không sẽ nhảy nguồn liên tục một cách vô ích.
const ERRORS_BEFORE_SWITCH = 6;

const ResilientTileLayer = ({ onAllSourcesFailed }) => {
  const [index, setIndex] = useState(0);
  // Đếm bằng ref chứ không bằng state: số ô hỏng không cần vẽ lại giao diện, và quan trọng
  // hơn là tránh gọi một hàm đặt state lồng bên trong hàm cập nhật của state khác — React
  // có thể chạy hàm cập nhật nhiều lần, khiến nguồn bị nhảy vọt qua mấy bậc cùng lúc.
  const errorsRef = useRef(0);
  const onFailedRef = useRef(onAllSourcesFailed);
  onFailedRef.current = onAllSourcesFailed;

  const source = SOURCES[index];

  const handleTileError = () => {
    errorsRef.current += 1;
    if (errorsRef.current < ERRORS_BEFORE_SWITCH) return;
    errorsRef.current = 0;
    setIndex(prev => {
      if (prev < SOURCES.length - 1) return prev + 1; // thử nguồn kế tiếp
      onFailedRef.current?.(); // hết nguồn để thử — báo ra ngoài để hiện thông báo
      return prev;
    });
  };

  return (
    // key buộc Leaflet bỏ hẳn lớp cũ và dựng lớp mới khi đổi nguồn, thay vì chỉ đổi URL
    // (đổi URL không xóa các ô hỏng đã nằm sẵn trên bản đồ).
    <TileLayer
      key={source.id}
      url={source.url}
      subdomains={source.subdomains || 'abc'}
      attribution={source.attribution}
      eventHandlers={{ tileerror: handleTileError }}
    />
  );
};

export default ResilientTileLayer;
