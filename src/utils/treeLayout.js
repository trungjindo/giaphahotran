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

// sortedGenerations: number[] đã sắp tăng dần; rowsMap: Map<gen, node[]> đã sắp theo thứ tự
// trái-phải cuối cùng (anh cả bên trái + Chi 1 trước Chi 2, xem FamilyTreePage); edges: các cặp
// cha-con ĐANG HIỂN THỊ.
//
// Cách xếp: mỗi ô KHÔNG còn xếp tuần tự từ mép trái của hàng nữa (bản cũ), mà mỗi người CHA
// được đặt CHÍNH GIỮA các con của mình (thuật toán cây "tidy" kinh điển: lá xếp lần lượt theo
// thứ tự duyệt sâu, cha = trung điểm của con đầu và con út). Bản cũ xếp từng hàng độc lập nên
// 1 người cha có thể nằm rất xa các con của mình, và vì MỌI đường nối trong cùng 1 khoảng đời
// đều bẻ ngang ở cùng một cao độ, các đoạn ngang đó chồng lên nhau thành một vệt dài — nhìn
// không ra con nào của cha nào. Khi cha đã nằm ngay trên các con, mỗi đoạn ngang chỉ còn trải
// đúng bề ngang của 1 gia đình, và các gia đình chiếm những khoảng x tách rời nhau nên không
// thể chồng lấn.
export function computeTreeLayout(sortedGenerations, rowsMap, edges = []) {
  const nodesById = new Map(); // id -> { x, y, node }
  const rowYById = new Map();  // generation -> y
  const STEP = CARD_WIDTH + CARD_GAP;

  const yByGeneration = new Map();
  sortedGenerations.forEach((gen, rowIndex) => {
    const y = rowIndex * ROW_HEIGHT;
    yByGeneration.set(gen, y);
    rowYById.set(gen, y);
  });

  // Thứ tự trái-phải đã chốt ở tầng trên: dùng làm thứ tự duyệt các con, để phép xếp cây giữ
  // đúng quy ước anh cả bên trái và Chi 1 trước Chi 2.
  const rankById = new Map();
  const nodeById = new Map();
  sortedGenerations.forEach(gen => {
    (rowsMap.get(gen) || []).forEach((node, index) => {
      rankById.set(node.id, index);
      nodeById.set(node.id, { node, gen });
    });
  });

  const childIdsByParent = new Map();
  const idsThatAreChildren = new Set();
  edges.forEach(({ parentId, childId }) => {
    if (!nodeById.has(parentId) || !nodeById.has(childId)) return;
    if (!childIdsByParent.has(parentId)) childIdsByParent.set(parentId, []);
    childIdsByParent.get(parentId).push(childId);
    idsThatAreChildren.add(childId);
  });
  childIdsByParent.forEach(list => {
    list.sort((a, b) => (rankById.get(a) ?? 0) - (rankById.get(b) ?? 0));
  });

  // Gốc = ô không phải con của ô nào đang hiển thị (bình thường chỉ có Thủy tổ, nhưng vẫn xử lý
  // nhiều gốc để phòng trường hợp dữ liệu lọc/khuyết cạnh).
  const rootIds = [];
  sortedGenerations.forEach(gen => {
    (rowsMap.get(gen) || []).forEach(node => {
      if (!idsThatAreChildren.has(node.id)) rootIds.push(node.id);
    });
  });

  const xById = new Map();
  let nextLeafX = 0;
  // Duyệt bằng ngăn xếp thay vì đệ quy: cây gia phả có thể sâu tuỳ ý theo dữ liệu thực tế, không
  // nên phụ thuộc vào giới hạn ngăn xếp lời gọi hàm.
  const layoutSubtree = (startId) => {
    const stack = [{ id: startId, visited: false }];
    while (stack.length > 0) {
      const frame = stack.pop();
      const children = childIdsByParent.get(frame.id) || [];
      if (children.length === 0) {
        xById.set(frame.id, nextLeafX);
        nextLeafX += STEP;
        continue;
      }
      if (frame.visited) {
        const firstX = xById.get(children[0]);
        const lastX = xById.get(children[children.length - 1]);
        xById.set(frame.id, (firstX + lastX) / 2);
        continue;
      }
      // Đẩy lại chính mình (đã đánh dấu) xuống dưới các con, để tính trung điểm SAU khi con xong.
      stack.push({ id: frame.id, visited: true });
      for (let i = children.length - 1; i >= 0; i--) stack.push({ id: children[i], visited: false });
    }
  };
  rootIds.forEach(layoutSubtree);

  let totalWidth = 0;
  nodeById.forEach(({ node, gen }, id) => {
    const x = xById.get(id) ?? 0;
    nodesById.set(id, { x, y: yByGeneration.get(gen) ?? 0, node });
    totalWidth = Math.max(totalWidth, x + CARD_WIDTH);
  });

  return {
    nodesById,
    rowYById,
    totalWidth: Math.max(totalWidth - CARD_WIDTH, 0),
    totalHeight: sortedGenerations.length * ROW_HEIGHT,
  };
}
