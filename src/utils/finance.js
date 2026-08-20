// Tiện ích tính toán thu chi: phân loại nguồn thu, cân đối ngân sách theo năm.

export const INCOME_CATEGORIES = [
  'Thu quỹ (đóng góp định kỳ)',
  'Ủng hộ',
  'Nguồn khác (lãi ngân hàng...)'
];

export const formatCurrency = (amount) => (amount || 0).toLocaleString('vi-VN') + ' VNĐ';

export const getYear = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d.getFullYear();
};

const sum = (arr) => arr.reduce((s, t) => s + (t.amount || 0), 0);

// financeData = { openingBalance, transactions: [{ id, date, type: 'Thu'|'Chi', category, amount, description, person, proof, status: 'actual'|'planned' }] }
export const computeFinanceSummary = (financeData, year = new Date().getFullYear()) => {
  // financeData có thể là null khi người xem chưa được quyền đọc dữ liệu thu chi (khách chưa
  // xác thực là con cháu trong họ) — trả về số liệu rỗng thay vì để cả trang lỗi trắng.
  const openingBalance = financeData?.openingBalance || 0;
  const transactions = financeData?.transactions || [];

  // Quỹ hiện tại (toàn thời gian, không phụ thuộc năm đang xem) chỉ tính giao dịch đã thực hiện
  const allActualIncome = transactions.filter(t => t.type === 'Thu' && t.status !== 'planned');
  const allActualExpense = transactions.filter(t => t.type === 'Chi' && t.status !== 'planned');
  const currentFund = openingBalance + sum(allActualIncome) - sum(allActualExpense);

  const yearTx = transactions.filter(t => getYear(t.date) === year);

  const actualIncome = yearTx.filter(t => t.type === 'Thu' && t.status !== 'planned');
  const plannedIncome = yearTx.filter(t => t.type === 'Thu' && t.status === 'planned');
  const actualExpense = yearTx.filter(t => t.type === 'Chi' && t.status !== 'planned');
  const plannedExpense = yearTx.filter(t => t.type === 'Chi' && t.status === 'planned');

  const incomeByCategory = {};
  INCOME_CATEGORIES.forEach(c => { incomeByCategory[c] = 0; });
  actualIncome.forEach(t => {
    const cat = t.category && INCOME_CATEGORIES.includes(t.category) ? t.category : 'Nguồn khác (lãi ngân hàng...)';
    incomeByCategory[cat] = (incomeByCategory[cat] || 0) + t.amount;
  });

  const totalActualIncome = sum(actualIncome);
  const totalPlannedIncomeRemaining = sum(plannedIncome);
  const totalActualExpense = sum(actualExpense);
  const totalPlannedExpenseRemaining = sum(plannedExpense);

  const projectedYearEndIncome = totalActualIncome + totalPlannedIncomeRemaining;
  const projectedYearEndExpense = totalActualExpense + totalPlannedExpenseRemaining;

  // Quỹ hiện tại đã bao gồm các giao dịch thực tế của năm nay -> cộng thêm phần dự kiến còn lại để ra dự kiến cuối năm
  const projectedYearEndBalance = currentFund + totalPlannedIncomeRemaining - totalPlannedExpenseRemaining;

  return {
    year,
    openingBalance,
    currentFund,
    incomeByCategory,
    totalActualIncome,
    totalPlannedIncomeRemaining,
    projectedYearEndIncome,
    totalActualExpense,
    totalPlannedExpenseRemaining,
    projectedYearEndExpense,
    projectedYearEndBalance,
    actualIncomeList: actualIncome,
    actualExpenseList: actualExpense,
    plannedIncomeList: plannedIncome,
    plannedExpenseList: plannedExpense
  };
};

export const getAvailableYears = (financeData) => {
  const years = new Set();
  (financeData.transactions || []).forEach(t => {
    const y = getYear(t.date);
    if (y) years.add(y);
  });
  years.add(new Date().getFullYear());
  return [...years].sort((a, b) => b - a);
};
