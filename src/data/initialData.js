export const STORAGE_KEY = 'household_allocation_tracker_v1';
export const DEFAULT_INIT_DATE = '2026-11-01';

// Internal hidden income state preserved strictly for Excel data schema parity
// NEVER rendered anywhere in UI, charts, or dashboard
export const INTERNAL_DEFAULT_INCOME = {
  gajiSuami: 10500000,
  gajiIstri: 5000000,
  bonus: 0
};

export const RAW_INITIAL_ITEMS = [
  { id: 'item-1', category: 'Belanja Dapur', name: 'Belanja Dapur & Sembako week 1', target: 500000, initialPaid: 500000, note: '' },
  { id: 'item-2', category: 'Belanja Dapur', name: 'Belanja Dapur & Sembako week 2', target: 500000, initialPaid: 500000, note: '' },
  { id: 'item-3', category: 'Belanja Dapur', name: 'Belanja Dapur & Sembako week 3', target: 500000, initialPaid: 500000, note: '' },
  { id: 'item-4', category: 'Belanja Dapur', name: 'Belanja Dapur & Sembako week 4', target: 500000, initialPaid: 500000, note: '' },
  { id: 'item-5', category: 'Belanja Dapur', name: 'Belanja Dapur & Sembako week 5', target: 500000, initialPaid: 500000, note: '' },
  { id: 'item-6', category: 'Beras', name: 'Beras Q1', target: 170000, initialPaid: 170000, note: 'Sudah Di Beli' },
  { id: 'item-7', category: 'Beras', name: 'Beras Q1 (Cadangan / Q2)', target: 170000, initialPaid: 170000, note: '' },
  { id: 'item-8', category: 'Minum', name: 'isi ulang 4/week, le minerale 2/week', target: 320000, initialPaid: 320000, note: '' },
  { id: 'item-9', category: 'Gas', name: 'Gas', target: 46000, initialPaid: 46000, note: '' },
  { id: 'item-10', category: 'Laundry', name: '4/week', target: 280000, initialPaid: 280000, note: '' },
  { id: 'item-11', category: 'Minyak dll', name: 'Minyak, gula, penyedap, dll', target: 150000, initialPaid: 150000, note: '' },
  { id: 'item-12', category: 'Cicilan', name: 'Rumah', target: 1500000, initialPaid: 1500000, note: '' },
  { id: 'item-13', category: 'Cicilan', name: 'lain-lain', target: 1000000, initialPaid: 1000000, note: '' },
  { id: 'item-14', category: 'Listrik', name: 'Listrik', target: 400000, initialPaid: 50000, note: 'Baru Isi 50.000' },
  { id: 'item-15', category: 'E-money', name: 'Suami', target: 355000, initialPaid: 100000, note: 'Baru Isi 100.000' },
  { id: 'item-16', category: 'E-money', name: 'Istri', target: 150000, initialPaid: 150000, note: 'Sudah Di Isi' },
  { id: 'item-17', category: 'Parkir', name: 'Suami', target: 115000, initialPaid: 115000, note: '' },
  { id: 'item-18', category: 'Parkir', name: 'Istri', target: 465000, initialPaid: 465000, note: '' },
  { id: 'item-19', category: 'Orang Tua', name: 'Suami', target: 1000000, initialPaid: 1000000, note: 'Sudah Di Transfer' },
  { id: 'item-20', category: 'Orang Tua', name: 'Istri', target: 1000000, initialPaid: 1000000, note: '' },
  { id: 'item-21', category: 'Bensin', name: 'Suami', target: 280000, initialPaid: 280000, note: '' },
  { id: 'item-22', category: 'Bensin', name: 'Istri', target: 100000, initialPaid: 100000, note: '' },
  { id: 'item-23', category: 'Arisan', name: 'SRO', target: 250000, initialPaid: 250000, note: '' },
  { id: 'item-24', category: 'Arisan', name: 'TDB', target: 165000, initialPaid: 165000, note: '' },
  { id: 'item-25', category: 'Pegangan', name: 'Suami', target: 400000, initialPaid: 400000, note: '' },
  { id: 'item-26', category: 'Pegangan', name: 'Istri/Biaya Tak Terduga', target: 2000000, initialPaid: 2000000, note: '' },
  { id: 'item-27', category: 'Pampers & Vitamin', name: 'Anak', target: 500000, initialPaid: 500000, note: '' }
];

export function buildDefaultState() {
  const items = RAW_INITIAL_ITEMS.map((raw, idx) => {
    const payments =
      raw.initialPaid > 0
        ? [
            {
              id: `pay-init-${idx + 1}`,
              date: DEFAULT_INIT_DATE,
              amount: raw.initialPaid,
              note: raw.note || 'Realisasi awal bulanan'
            }
          ]
        : [];
    return {
      id: raw.id,
      category: raw.category,
      name: raw.name,
      target: raw.target,
      notes: raw.note || '',
      payments
    };
  });

  return {
    version: '1.0',
    updatedAt: new Date().toISOString(),
    _internalIncome: { ...INTERNAL_DEFAULT_INCOME },
    items
  };
}

