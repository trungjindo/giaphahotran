// Tính toạ độ (x,y) tuyệt đối cho từng ô trong sơ đồ gia phả, thay cho layout flexbox trước
// đây — cần thiết để: (1) trục "Các đời" tính được đúng vị trí Y của từng hàng mà không phải
// đo DOM, (2) mỗi ô có thể tự bọc trong <Virtualize> (react-zoom-pan-pinch) để chỉ mount vào
// DOM khi đang trong khung nhìn, không cần render toàn bộ cây cùng lúc.

export const ROW_HEIGHT = 130;
export const CARD_WIDTH = 90;
export const CARD_GAP = 24;
// Chiều cao ước lượng của 1 thẻ (ô thành viên) — chỉ dùng để tính điểm neo của đường nối
// cha-con (không cần khớp pixel tuyệt đối, đường nối chỉ mang tính minh hoạ quan hệ).
export const CARD_HEIGHT = 86;

// sortedGenerations: number[] đã sắp tăng dần; rowsMap: Map<gen, node[]> đã sắp theo mã định
// danh phả hệ (compareDottedCode) — thứ tự trái-phải trong hàng giữ nguyên như bản flexbox cũ.
export function computeTreeLayout(sortedGenerations, rowsMap) {
  const nodesById = new Map(); // id -> { x, y, node }
  const rowYById = new Map();  // generation -> y
  let totalWidth = 0;

  sortedGenerations.forEach((gen, rowIndex) => {
    const y = rowIndex * ROW_HEIGHT;
    rowYById.set(gen, y);
    let x = 0;
    (rowsMap.get(gen) || []).forEach(node => {
      nodesById.set(node.id, { x, y, node });
      x += CARD_WIDTH + CARD_GAP;
    });
    totalWidth = Math.max(totalWidth, x - CARD_GAP);
  });

  return {
    nodesById,
    rowYById,
    totalWidth: Math.max(totalWidth, 0),
    totalHeight: sortedGenerations.length * ROW_HEIGHT,
  };
}
