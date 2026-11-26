// Exact Excel Business Logic per Item
export const calculateItemMetrics = (item) => {
  const target = Math.max(0, Number(item.target) || 0);
  const paid = (item.payments || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const remaining = target - paid; // Formula Excel: =C12-D12
  const exactProgress = target > 0 ? Math.min(100, (paid / target) * 100) : paid > 0 ? 100 : 0;
  const progress = target > 0 ? Math.min(100, Math.round((paid / target) * 100)) : paid > 0 ? 100 : 0;

  let status = 'Belum Lunas';
  if (paid >= target && target > 0) {
    status = 'Lunas';
  } else if (paid > 0 && paid < target) {
    status = 'Sebagian';
  } else if (paid === 0) {
    status = 'Belum Lunas';
  }

  return {
    target,
    paid,
    remaining,
    progress,
    exactProgress: Number(exactProgress.toFixed(1)),
    status
  };
};

// Validate loaded or imported state structure
export const validateAppState = (data) => {
  if (!data || typeof data !== 'object') return false;
  if (!Array.isArray(data.items)) return false;

  for (const item of data.items) {
    if (
      typeof item.id !== 'string' ||
      typeof item.category !== 'string' ||
      typeof item.name !== 'string' ||
      typeof item.target !== 'number' ||
      isNaN(item.target) ||
      item.target < 0 ||
      !Array.isArray(item.payments)
    ) {
      return false;
    }

    for (const pay of item.payments) {
      if (
        typeof pay.id !== 'string' ||
        typeof pay.date !== 'string' ||
        typeof pay.amount !== 'number' ||
        isNaN(pay.amount) ||
        pay.amount < 0
      ) {
        return false;
      }
    }
  }
  return true;
};
