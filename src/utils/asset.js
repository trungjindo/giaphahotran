// Nhãn, màu, icon cho từng loại/tình trạng tài sản — dùng chung cho danh sách, bản đồ, form.

export const ASSET_CATEGORIES = [
  { value: 'dat_dai', label: 'Đất đai', color: '#8B6F3E', icon: '🗺️' },
  { value: 'nha_cua', label: 'Nhà cửa', color: '#0E6FA8', icon: '🏠' },
  { value: 'do_tho', label: 'Đồ thờ', color: '#C0392B', icon: '🕯️' },
  { value: 'le_nghi', label: 'Đồ dùng lễ nghi', color: '#F2C46A', icon: '🎏' },
  { value: 'vat_dung', label: 'Vật dụng', color: '#2FB3C0', icon: '📦' },
  { value: 'gia_tri', label: 'Tài sản giá trị', color: '#8E44AD', icon: '💎' },
  { value: 'khac', label: 'Khác', color: '#7f8c8d', icon: '🔖' },
];

export const ASSET_STATUSES = [
  { value: 'dang_dung', label: 'Đang dùng', color: '#27ae60' },
  { value: 'hu_hong', label: 'Hư hỏng', color: '#B03A3A' },
  { value: 'can_sua', label: 'Cần sửa', color: '#e67e22' },
  { value: 'luu_kho', label: 'Lưu kho', color: '#7f8c8d' },
];

export const getAssetCategory = (value) => ASSET_CATEGORIES.find(c => c.value === value) || ASSET_CATEGORIES[ASSET_CATEGORIES.length - 1];
export const getAssetStatus = (value) => ASSET_STATUSES.find(s => s.value === value) || ASSET_STATUSES[0];

// Khấu hao dự kiến theo đường thẳng (linear depreciation): tuổi tài sản / tuổi thọ dự kiến.
// Trả về null nếu thiếu dữ liệu cần thiết (giá trị, ngày mua, hoặc tuổi thọ dự kiến).
export function calculateDepreciation(estimatedValue, acquiredDate, usefulLifeYears) {
  if (!estimatedValue || !acquiredDate || !usefulLifeYears) return null;
  const acquiredYear = new Date(acquiredDate).getFullYear();
  if (!acquiredYear || isNaN(acquiredYear)) return null;

  const currentYear = new Date().getFullYear();
  const ageYears = Math.max(0, currentYear - acquiredYear);
  const depreciationRate = Math.min(1, ageYears / usefulLifeYears);
  const currentValue = Math.round(estimatedValue * (1 - depreciationRate));
  const expectedReplaceYear = acquiredYear + usefulLifeYears;

  return {
    ageYears,
    depreciationRate,
    depreciationPercent: Math.round(depreciationRate * 100),
    currentValue,
    expectedReplaceYear,
  };
}

export function formatVND(value) {
  if (value === null || value === undefined || value === '') return '—';
  return Number(value).toLocaleString('vi-VN') + ' đ';
}
