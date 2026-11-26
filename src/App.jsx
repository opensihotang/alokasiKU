import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { STORAGE_KEY, INTERNAL_DEFAULT_INCOME, buildDefaultState, formatIDR, formatDateID, getTodayISO, calculateItemMetrics, validateAppState } from './data.js';
import './styles.css';
import { StatusBadge, Modal } from './components/Common.jsx';
import {
  LayoutDashboard,
  ListChecks,
  History,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Wallet,
  CreditCard,
  TrendingUp,
  Download,
  Upload,
  RotateCcw,
  FileSpreadsheet,
  Pencil,
  Trash2,
  Check,
  Calendar,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  FolderOpen,
  ArrowUpRight,
  Clock
} from 'lucide-react';


// ============================================================================
// MAIN APPLICATION COMPONENT
// ============================================================================
export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'items' | 'history'

  // Core Application State (initialized from LocalStorage with validation)
  const [appState, setAppState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (validateAppState(parsed)) {
          return {
            ...parsed,
            _internalIncome: parsed._internalIncome || { ...INTERNAL_DEFAULT_INCOME }
          };
        }
      }
    } catch (err) {
      console.error('Gagal memuat data dari LocalStorage:', err);
    }
    return buildDefaultState();
  });

  // Auto-save Status Indicator
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saving' | 'saved'
  const [lastSavedTime, setLastSavedTime] = useState(() =>
    new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  );

  // Toast Notification State
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  const showToast = (message, type = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 3400);
  };

  // Auto-save Effect to LocalStorage
  useEffect(() => {
    setSaveStatus('saving');
    const timer = setTimeout(() => {
      try {
        const payload = {
          ...appState,
          updatedAt: new Date().toISOString()
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        setSaveStatus('saved');
        setLastSavedTime(
          new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        );
      } catch (e) {
        console.error('Auto-save error:', e);
        showToast('Gagal menyimpan otomatis ke browser.', 'error');
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [appState]);

  // ==========================================================================
  // COMPUTED METRICS & AGGREGATIONS (PURE BUSINESS LOGIC)
  // ==========================================================================
  const computedItems = useMemo(() => {
    return appState.items.map((item) => ({
      ...item,
      metrics: calculateItemMetrics(item)
    }));
  }, [appState.items]);

  const summary = useMemo(() => {
    const totalTarget = computedItems.reduce((sum, i) => sum + i.metrics.target, 0);
    const totalPaid = computedItems.reduce((sum, i) => sum + i.metrics.paid, 0);
    const totalRemaining = totalTarget - totalPaid;
    const exactPercentage =
      totalTarget > 0 ? Math.min(100, (totalPaid / totalTarget) * 100) : totalPaid > 0 ? 100 : 0;
    const roundedPercentage = Math.round(exactPercentage);

    const countLunas = computedItems.filter((i) => i.metrics.status === 'Lunas').length;
    const countSebagian = computedItems.filter((i) => i.metrics.status === 'Sebagian').length;
    const countBelum = computedItems.filter((i) => i.metrics.status === 'Belum Lunas').length;

    let overallStatus = 'Belum Lunas';
    if (totalPaid >= totalTarget && totalTarget > 0) {
      overallStatus = 'Lunas';
    } else if (totalPaid > 0) {
      overallStatus = 'Sebagian';
    }

    return {
      totalTarget,
      totalPaid,
      totalRemaining,
      exactPercentage: Number(exactPercentage.toFixed(1)),
      roundedPercentage,
      overallStatus,
      countLunas,
      countSebagian,
      countBelum,
      totalItems: computedItems.length
    };
  }, [computedItems]);

  // Category Breakdown for Dashboard Visualization
  const categoryBreakdown = useMemo(() => {
    const map = new Map();
    computedItems.forEach((item) => {
      const cat = item.category || 'Lainnya';
      const existing = map.get(cat) || { category: cat, target: 0, paid: 0, count: 0 };
      existing.target += item.metrics.target;
      existing.paid += item.metrics.paid;
      existing.count += 1;
      map.set(cat, existing);
    });

    return Array.from(map.values())
      .map((c) => {
        const remaining = c.target - c.paid;
        const progress = c.target > 0 ? Math.min(100, Math.round((c.paid / c.target) * 100)) : 0;
        return { ...c, remaining, progress };
      })
      .sort((a, b) => b.target - a.target);
  }, [computedItems]);

  // All Payment History flattened and sorted newest first
  const allPayments = useMemo(() => {
    const list = [];
    computedItems.forEach((item) => {
      (item.payments || []).forEach((pay) => {
        list.push({
          ...pay,
          itemId: item.id,
          itemName: item.name,
          category: item.category,
          itemStatus: item.metrics.status
        });
      });
    });

    return list.sort((a, b) => {
      if (b.date !== a.date) return b.date.localeCompare(a.date);
      return b.id.localeCompare(a.id);
    });
  }, [computedItems]);

  const uniqueCategories = useMemo(() => {
    const set = new Set(appState.items.map((i) => i.category));
    return Array.from(set);
  }, [appState.items]);

  // ==========================================================================
  // FILTER STATES FOR POS TAGIHAN & HISTORI PEMBAYARAN
  // ==========================================================================
  const [itemSearch, setItemSearch] = useState('');
  const [itemStatusFilter, setItemStatusFilter] = useState('Semua');
  const [itemCategoryFilter, setItemCategoryFilter] = useState('Semua');

  const filteredItems = useMemo(() => {
    return computedItems.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
        item.category.toLowerCase().includes(itemSearch.toLowerCase()) ||
        (item.notes && item.notes.toLowerCase().includes(itemSearch.toLowerCase()));
      const matchesStatus =
        itemStatusFilter === 'Semua' || item.metrics.status === itemStatusFilter;
      const matchesCategory =
        itemCategoryFilter === 'Semua' || item.category === itemCategoryFilter;
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [computedItems, itemSearch, itemStatusFilter, itemCategoryFilter]);

  const [historySearch, setHistorySearch] = useState('');
  const [historyCategoryFilter, setHistoryCategoryFilter] = useState('Semua');

  const filteredPayments = useMemo(() => {
    return allPayments.filter((p) => {
      const matchesSearch =
        p.itemName.toLowerCase().includes(historySearch.toLowerCase()) ||
        p.category.toLowerCase().includes(historySearch.toLowerCase()) ||
        (p.note && p.note.toLowerCase().includes(historySearch.toLowerCase()));
      const matchesCat =
        historyCategoryFilter === 'Semua' || p.category === historyCategoryFilter;
      return matchesSearch && matchesCat;
    });
  }, [allPayments, historySearch, historyCategoryFilter]);

  // ==========================================================================
  // MODAL STATES & CRUD HANDLERS
  // ==========================================================================
  // 1. Add / Edit Payment Modal
  const [paymentModal, setPaymentModal] = useState({
    open: false,
    mode: 'add', // 'add' | 'edit'
    itemId: '',
    paymentId: '',
    date: getTodayISO(),
    amount: '',
    note: ''
  });

  const openAddPaymentModal = (preselectedItemId = '') => {
    const defaultItem =
      preselectedItemId ||
      (computedItems.find((i) => i.metrics.remaining > 0)?.id ?? computedItems[0]?.id ?? '');
    setPaymentModal({
      open: true,
      mode: 'add',
      itemId: defaultItem,
      paymentId: '',
      date: getTodayISO(),
      amount: '',
      note: ''
    });
  };

  const openEditPaymentModal = (payment) => {
    setPaymentModal({
      open: true,
      mode: 'edit',
      itemId: payment.itemId,
      paymentId: payment.id,
      date: payment.date,
      amount: String(payment.amount),
      note: payment.note || ''
    });
  };

  const handleSavePayment = (e) => {
    e.preventDefault();
    const numericAmount = Number(paymentModal.amount);
    if (!paymentModal.itemId) {
      showToast('Pilih pos tagihan terlebih dahulu.', 'error');
      return;
    }
    if (isNaN(numericAmount) || numericAmount <= 0) {
      showToast('Nominal pembayaran harus lebih dari Rp 0.', 'error');
      return;
    }
    if (!paymentModal.date) {
      showToast('Tanggal pembayaran wajib diisi.', 'error');
      return;
    }

    setAppState((prev) => {
      const updatedItems = prev.items.map((item) => {
        if (item.id !== paymentModal.itemId) return item;

        if (paymentModal.mode === 'add') {
          const newPay = {
            id: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            date: paymentModal.date,
            amount: numericAmount,
            note: paymentModal.note.trim()
          };
          return {
            ...item,
            payments: [...item.payments, newPay]
          };
        } else {
          return {
            ...item,
            payments: item.payments.map((p) =>
              p.id === paymentModal.paymentId
                ? {
                    ...p,
                    date: paymentModal.date,
                    amount: numericAmount,
                    note: paymentModal.note.trim()
                  }
                : p
            )
          };
        }
      });

      return { ...prev, items: updatedItems };
    });

    setPaymentModal((prev) => ({ ...prev, open: false }));
    showToast(
      paymentModal.mode === 'add'
        ? 'Pembayaran baru berhasil dicatat!'
        : 'Data pembayaran berhasil diperbarui!'
    );
  };

  // 2. Add / Edit Allocation Item Modal
  const [itemModal, setItemModal] = useState({
    open: false,
    mode: 'add', // 'add' | 'edit'
    itemId: '',
    category: '',
    customCategory: '',
    name: '',
    target: '',
    notes: ''
  });

  const openAddItemModal = () => {
    setItemModal({
      open: true,
      mode: 'add',
      itemId: '',
      category: uniqueCategories[0] || 'Belanja Dapur',
      customCategory: '',
      name: '',
      target: '',
      notes: ''
    });
  };

  const openEditItemModal = (item) => {
    setItemModal({
      open: true,
      mode: 'edit',
      itemId: item.id,
      category: item.category,
      customCategory: '',
      name: item.name,
      target: String(item.target),
      notes: item.notes || ''
    });
  };

  const handleSaveItem = (e) => {
    e.preventDefault();
    const finalCategory =
      itemModal.category === '__custom__'
        ? itemModal.customCategory.trim()
        : itemModal.category.trim();
    const numericTarget = Number(itemModal.target);

    if (!finalCategory) {
      showToast('Kategori pos wajib diisi.', 'error');
      return;
    }
    if (!itemModal.name.trim()) {
      showToast('Nama pos tagihan wajib diisi.', 'error');
      return;
    }
    if (isNaN(numericTarget) || numericTarget <= 0) {
      showToast('Target anggaran harus lebih dari Rp 0.', 'error');
      return;
    }

    setAppState((prev) => {
      if (itemModal.mode === 'add') {
        const newItem = {
          id: `item-${Date.now()}`,
          category: finalCategory,
          name: itemModal.name.trim(),
          target: numericTarget,
          notes: itemModal.notes.trim(),
          payments: []
        };
        return { ...prev, items: [...prev.items, newItem] };
      } else {
        return {
          ...prev,
          items: prev.items.map((item) =>
            item.id === itemModal.itemId
              ? {
                  ...item,
                  category: finalCategory,
                  name: itemModal.name.trim(),
                  target: numericTarget,
                  notes: itemModal.notes.trim()
                }
              : item
          )
        };
      }
    });

    setItemModal((prev) => ({ ...prev, open: false }));
    showToast(
      itemModal.mode === 'add'
        ? 'Pos tagihan baru berhasil ditambahkan!'
        : 'Pos tagihan berhasil diperbarui!'
    );
  };

  // 3. Confirmation Dialog Modal (Delete Payment, Delete Item, Reset Data, Import JSON)
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    message: '',
    confirmLabel: 'Konfirmasi',
    variant: 'danger', // 'danger' | 'primary'
    onConfirm: null
  });

  const closeConfirmDialog = () =>
    setConfirmDialog((prev) => ({ ...prev, open: false, onConfirm: null }));

  const requestDeletePayment = (payment) => {
    setConfirmDialog({
      open: true,
      title: 'Hapus Riwayat Pembayaran?',
      message: `Anda akan menghapus pembayaran sebesar ${formatIDR(payment.amount)} untuk "${payment.itemName}" (${formatDateID(payment.date)}). Kalkulasi sisa tagihan akan otomatis diperbarui.`,
      confirmLabel: 'Ya, Hapus Pembayaran',
      variant: 'danger',
      onConfirm: () => {
        setAppState((prev) => ({
          ...prev,
          items: prev.items.map((item) =>
            item.id === payment.itemId
              ? { ...item, payments: item.payments.filter((p) => p.id !== payment.id) }
              : item
          )
        }));
        closeConfirmDialog();
        showToast('Riwayat pembayaran berhasil dihapus.');
      }
    });
  };

  const requestDeleteItem = (item) => {
    setConfirmDialog({
      open: true,
      title: 'Hapus Pos Tagihan?',
      message: `Pos "${item.category} - ${item.name}" beserta seluruh riwayat pembayarannya akan dihapus permanen. Lanjutkan?`,
      confirmLabel: 'Ya, Hapus Pos',
      variant: 'danger',
      onConfirm: () => {
        setAppState((prev) => ({
          ...prev,
          items: prev.items.filter((i) => i.id !== item.id)
        }));
        closeConfirmDialog();
        showToast('Pos tagihan berhasil dihapus.');
      }
    });
  };

  const requestResetData = () => {
    setConfirmDialog({
      open: true,
      title: 'Reset Data ke Awal?',
      message:
        'Seluruh perubahan dan histori pembayaran tambahan akan dihapus, dan data akan dikembalikan ke 27 pos default awal Excel. Tindakan ini tidak dapat dibatalkan.',
      confirmLabel: 'Reset Sekarang',
      variant: 'danger',
      onConfirm: () => {
        const fresh = buildDefaultState();
        setAppState(fresh);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
        closeConfirmDialog();
        showToast('Data berhasil di-reset ke pengaturan awal.');
      }
    });
  };

  // ==========================================================================
  // JSON EXPORT & IMPORT HANDLERS
  // ==========================================================================
  const fileInputRef = useRef(null);

  const handleExportJSON = () => {
    try {
      const exportPayload = {
        ...appState,
        exportedAt: new Date().toISOString()
      };
      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Backup_Alokasi_Rumah_Tangga_${getTodayISO()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('File backup JSON berhasil diunduh!');
    } catch (err) {
      console.error(err);
      showToast('Gagal mengekspor data JSON.', 'error');
    }
  };

  const handleFileImportChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (!validateAppState(parsed)) {
          showToast('Struktur file JSON tidak valid atau rusak.', 'error');
          return;
        }

        setConfirmDialog({
          open: true,
          title: 'Konfirmasi Import Data JSON',
          message: `File backup valid ditemukan (${parsed.items.length} pos tagihan). Data saat ini akan ditimpa sepenuhnya dengan data dari file JSON ini. Lanjutkan?`,
          confirmLabel: 'Timpa & Import Data',
          variant: 'primary',
          onConfirm: () => {
            setAppState({
              version: parsed.version || '1.0',
              updatedAt: new Date().toISOString(),
              _internalIncome: parsed._internalIncome || { ...INTERNAL_DEFAULT_INCOME },
              items: parsed.items
            });
            closeConfirmDialog();
            showToast('Data JSON berhasil di-import & disimpan!');
          }
        });
      } catch {
        showToast('File bukan format JSON yang valid.', 'error');
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  // ==========================================================================
  // EXCEL (.XLSX) EXPORT HANDLER USING SHEETJS
  // ==========================================================================
  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // ----------------------------------------------------------------------
      // SHEET 1: Ringkasan & Pos Tagihan
      // ----------------------------------------------------------------------
      const sheet1Rows = [
        ['LAPORAN PEMBUKUAN & PROGRES ALOKASI RUMAH TANGGA'],
        [`Tanggal Cetak: ${formatDateID(getTodayISO())}`],
        [],
        ['RINGKASAN PROGRES PEMBAYARAN', 'NILAI'],
        ['Total Tagihan / Anggaran', summary.totalTarget],
        ['Total Pembayaran Terbayar', summary.totalPaid],
        ['Sisa Pembayaran', summary.totalRemaining],
        ['Persentase Progres Keseluruhan', `${summary.exactPercentage}%`],
        ['Status Keseluruhan', summary.overallStatus],
        [],
        [
          'No',
          'Kategori Pos',
          'Nama Pos / Tagihan',
          'Target Anggaran (Rp)',
          'Sudah Dibayar (Rp)',
          'Sisa Pembayaran (Rp)',
          'Progres (%)',
          'Status Pembayaran',
          'Catatan'
        ]
      ];

      computedItems.forEach((item, index) => {
        sheet1Rows.push([
          index + 1,
          item.category,
          item.name,
          item.metrics.target,
          item.metrics.paid,
          item.metrics.remaining,
          `${item.metrics.exactProgress}%`,
          item.metrics.status,
          item.notes || '-'
        ]);
      });

      // Total Row at Bottom
      sheet1Rows.push([
        '',
        'TOTAL KESELURUHAN',
        '',
        summary.totalTarget,
        summary.totalPaid,
        summary.totalRemaining,
        `${summary.exactPercentage}%`,
        summary.overallStatus,
        ''
      ]);

      const ws1 = XLSX.utils.aoa_to_sheet(sheet1Rows);

      // Apply currency formatting (Rp #,##0) & column widths on Sheet 1
      ws1['!cols'] = [
        { wch: 6 },
        { wch: 22 },
        { wch: 36 },
        { wch: 22 },
        { wch: 22 },
        { wch: 22 },
        { wch: 14 },
        { wch: 18 },
        { wch: 26 }
      ];

      // Format Summary currency cells (B5:B7)
      ['B5', 'B6', 'B7'].forEach((cellRef) => {
        if (ws1[cellRef]) ws1[cellRef].z = '"Rp "#,##0';
      });

      // Format Table currency columns (D, E, F from row 12 downwards)
      const startRow = 12;
      const endRow = startRow + computedItems.length;
      for (let r = startRow; r <= endRow; r++) {
        ['D', 'E', 'F'].forEach((col) => {
          const ref = `${col}${r}`;
          if (ws1[ref] && typeof ws1[ref].v === 'number') {
            ws1[ref].z = '"Rp "#,##0';
          }
        });
      }

      XLSX.utils.book_append_sheet(wb, ws1, 'Ringkasan & Pos Tagihan');

      // ----------------------------------------------------------------------
      // SHEET 2: Histori Pembayaran
      // ----------------------------------------------------------------------
      const sheet2Rows = [
        ['DETAIL HISTORI TRANSAKSI PEMBAYARAN'],
        [`Total Transaksi Tercatat: ${allPayments.length} transaksi`],
        [],
        [
          'No',
          'Tanggal Pembayaran',
          'Kategori Pos',
          'Nama Pos Tagihan',
          'Nominal Pembayaran (Rp)',
          'Status Pos Saat Ini',
          'Catatan Pembayaran'
        ]
      ];

      allPayments.forEach((pay, idx) => {
        sheet2Rows.push([
          idx + 1,
          formatDateID(pay.date),
          pay.category,
          pay.itemName,
          pay.amount,
          pay.itemStatus,
          pay.note || '-'
        ]);
      });

      const ws2 = XLSX.utils.aoa_to_sheet(sheet2Rows);
      ws2['!cols'] = [
        { wch: 6 },
        { wch: 20 },
        { wch: 22 },
        { wch: 36 },
        { wch: 24 },
        { wch: 20 },
        { wch: 32 }
      ];

      for (let r = 5; r < 5 + allPayments.length; r++) {
        const ref = `E${r}`;
        if (ws2[ref] && typeof ws2[ref].v === 'number') {
          ws2[ref].z = '"Rp "#,##0';
        }
      }

      XLSX.utils.book_append_sheet(wb, ws2, 'Histori Pembayaran');

      // Write and trigger download
      XLSX.writeFile(wb, `Laporan_Pembayaran_Rumah_Tangga_${getTodayISO()}.xlsx`);
      showToast('Laporan Excel (.xlsx) berhasil diunduh!');
    } catch (err) {
      console.error('Excel export error:', err);
      showToast('Terjadi kesalahan saat membuat file Excel.', 'error');
    }
  };

  // Helper to get selected item inside payment modal for quick "Bayar Penuh Sisa"
  const selectedModalItem = useMemo(() => {
    return computedItems.find((i) => i.id === paymentModal.itemId) || null;
  }, [computedItems, paymentModal.itemId]);

  // ==========================================================================
  // RENDER UI
  // ==========================================================================
  return (
    <div className="app-shell min-h-screen bg-[#FFFDFD] text-[#1E1B24] flex flex-col font-sans selection:bg-pink-200 selection:text-[#1E1B24]">
      {/* Hidden File Input for JSON Import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleFileImportChange}
      />

      {/* ====================================================================
          TOP NAVIGATION HEADER
      ==================================================================== */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-pink-100/90 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="app-header-row flex flex-wrap items-center justify-between gap-3 py-3.5">
            {/* Brand Identity */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#EC4899] to-[#2A2438] flex items-center justify-center text-white shadow-md shadow-pink-200">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-[#1E1B24]">
                    AlokasiKu
                  </h1>
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#FDF2F8] text-[#EC4899] border border-pink-200/70">
                    <ShieldCheck className="w-3 h-3" />
                    {saveStatus === 'saving' ? 'Menyimpan...' : `Tersimpan (${lastSavedTime})`}
                  </span>
                </div>
                <p className="text-xs text-[#2A2438]/65">
                  Pemantauan Progres Tagihan & Alokasi Rumah Tangga
                </p>
              </div>
            </div>

            {/* Primary Action Buttons (Export Excel, Backup JSON, Quick Pay) */}
            <div className="header-actions flex items-center gap-2 flex-wrap">
              <button
                onClick={handleExportExcel}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/80 transition-all cursor-pointer"
                title="Unduh Laporan Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span className="hidden md:inline">Export Excel</span>
              </button>

              <div className="inline-flex items-center rounded-xl border border-pink-200/80 bg-[#FDF2F8]/60 p-0.5">
                <button
                  onClick={handleExportJSON}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#2A2438] hover:bg-white hover:text-[#EC4899] transition-all cursor-pointer"
                  title="Backup Data ke JSON"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden lg:inline">Backup</span>
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#2A2438] hover:bg-white hover:text-[#EC4899] transition-all cursor-pointer"
                  title="Restore / Import Data dari JSON"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span className="hidden lg:inline">Import</span>
                </button>
                <button
                  onClick={requestResetData}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-600 hover:bg-white transition-all cursor-pointer"
                  title="Reset ke Data Awal Excel"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                onClick={() => openAddPaymentModal()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-[#EC4899] to-[#DB2777] hover:from-[#DB2777] hover:to-[#BE185D] shadow-md shadow-pink-200/80 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Catat Pembayaran</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="app-tabs flex items-center gap-1 sm:gap-2 -mb-px overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'border-[#EC4899] text-[#EC4899] bg-[#FDF2F8]/50'
                  : 'border-transparent text-[#2A2438]/70 hover:text-[#1E1B24] hover:border-pink-200'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard Progres
            </button>

            <button
              onClick={() => setActiveTab('items')}
              className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'items'
                  ? 'border-[#EC4899] text-[#EC4899] bg-[#FDF2F8]/50'
                  : 'border-transparent text-[#2A2438]/70 hover:text-[#1E1B24] hover:border-pink-200'
              }`}
            >
              <ListChecks className="w-4 h-4" />
              Daftar Pos Tagihan
              <span className="px-2 py-0.5 text-[11px] rounded-full bg-pink-100 text-[#EC4899]">
                {summary.totalItems}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'history'
                  ? 'border-[#EC4899] text-[#EC4899] bg-[#FDF2F8]/50'
                  : 'border-transparent text-[#2A2438]/70 hover:text-[#1E1B24] hover:border-pink-200'
              }`}
            >
              <History className="w-4 h-4" />
              Histori Pembayaran
              <span className="px-2 py-0.5 text-[11px] rounded-full bg-pink-100 text-[#EC4899]">
                {allPayments.length}
              </span>
            </button>
          </nav>
        </div>
      </header>

      {/* ====================================================================
          MAIN CONTENT AREA
      ==================================================================== */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* ------------------------------------------------------------------
            TAB 1: DASHBOARD UTAMA
        ------------------------------------------------------------------ */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* 4 KPI SUMMARY CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Total Tagihan */}
              <div className="bg-white rounded-2xl p-5 border border-pink-100 shadow-xs hover:shadow-md hover:border-pink-200 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#2A2438]/60">
                    Total Tagihan
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-[#FDF2F8] text-[#EC4899] flex items-center justify-center">
                    <Wallet className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-extrabold text-[#1E1B24]">
                  {formatIDR(summary.totalTarget)}
                </div>
                <p className="text-xs text-[#2A2438]/60 mt-1.5">
                  Dari {summary.totalItems} pos alokasi bulanan
                </p>
              </div>

              {/* Card 2: Total Pembayaran */}
              <div className="bg-white rounded-2xl p-5 border border-pink-100 shadow-xs hover:shadow-md hover:border-pink-200 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#2A2438]/60">
                    Sudah Dibayar
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <CreditCard className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-extrabold text-emerald-700">
                  {formatIDR(summary.totalPaid)}
                </div>
                <p className="text-xs text-[#2A2438]/60 mt-1.5">
                  {summary.countLunas} pos lunas, {summary.countSebagian} sebagian
                </p>
              </div>

              {/* Card 3: Sisa Pembayaran */}
              <div className="bg-white rounded-2xl p-5 border border-pink-100 shadow-xs hover:shadow-md hover:border-pink-200 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#2A2438]/60">
                    Sisa Pembayaran
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div
                  className={`text-xl sm:text-2xl font-extrabold ${
                    summary.totalRemaining > 0 ? 'text-rose-600' : 'text-emerald-600'
                  }`}
                >
                  {formatIDR(Math.max(0, summary.totalRemaining))}
                </div>
                <p className="text-xs text-[#2A2438]/60 mt-1.5">
                  {summary.totalRemaining > 0
                    ? `${summary.countSebagian + summary.countBelum} pos menunggu pelunasan`
                    : 'Seluruh tagihan telah terpenuhi!'}
                </p>
              </div>

              {/* Card 4: Progres & Status Keseluruhan */}
              <div className="bg-gradient-to-br from-[#2A2438] to-[#1E1B24] rounded-2xl p-5 text-white shadow-md">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-pink-200/80">
                    Progres Keseluruhan
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-white/10 text-pink-300 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-2xl sm:text-3xl font-extrabold text-white">
                    {summary.exactPercentage}%
                  </span>
                  <StatusBadge status={summary.overallStatus} />
                </div>
                <div className="w-full h-2 bg-white/15 rounded-full overflow-hidden mt-3">
                  <div
                    className="h-full bg-gradient-to-r from-[#F472B6] to-[#EC4899] rounded-full transition-all duration-500"
                    style={{ width: `${summary.roundedPercentage}%` }}
                  />
                </div>
              </div>
            </div>

            {/* OVERALL INTERACTIVE PROGRESS & STATUS SUMMARY BANNER */}
            <div className="bg-white rounded-2xl p-6 border border-pink-100 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-[#1E1B24]">
                    Status Realisasi Pembayaran Bulanan
                  </h2>
                  <p className="text-xs sm:text-sm text-[#2A2438]/65">
                    Pantau rasio pelunasan seluruh pos alokasi rumah tangga secara real-time
                  </p>
                </div>

                {/* Status Pills Summary */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      setItemStatusFilter('Lunas');
                      setActiveTab('items');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/70 transition-colors cursor-pointer"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Lunas: {summary.countLunas}
                  </button>
                  <button
                    onClick={() => {
                      setItemStatusFilter('Sebagian');
                      setActiveTab('items');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200/70 transition-colors cursor-pointer"
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    Sebagian: {summary.countSebagian}
                  </button>
                  <button
                    onClick={() => {
                      setItemStatusFilter('Belum Lunas');
                      setActiveTab('items');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/70 transition-colors cursor-pointer"
                  >
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    Belum Lunas: {summary.countBelum}
                  </button>
                </div>
              </div>

              {/* Large Progress Bar */}
              <div className="relative w-full h-5 bg-[#FDF2F8] rounded-full overflow-hidden border border-pink-200/60 p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#F472B6] via-[#EC4899] to-[#2A2438] transition-all duration-700 flex items-center justify-end pr-2.5"
                  style={{ width: `${Math.max(6, summary.roundedPercentage)}%` }}
                >
                  <span className="text-[10px] font-bold text-white drop-shadow-xs">
                    {summary.exactPercentage}%
                  </span>
                </div>
              </div>

              {/* Actionable Unpaid / Partial Alert Strip if any remaining */}
              {summary.totalRemaining > 0 && (
                <div className="mt-4 pt-4 border-t border-pink-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 text-xs sm:text-sm text-[#2A2438]/80">
                    <span className="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                    <span>
                      Masih terdapat sisa pembayaran sebesar{' '}
                      <strong className="text-[#1E1B24]">{formatIDR(summary.totalRemaining)}</strong>{' '}
                      yang belum dilunasi.
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setItemStatusFilter('Sebagian');
                      setActiveTab('items');
                    }}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#EC4899] hover:text-[#BE185D] transition-colors cursor-pointer"
                  >
                    Lihat Pos Belum Lunas
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* TWO-COLUMN DASHBOARD GRID: CATEGORY BREAKDOWN & RECENT PAYMENTS */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column (7 cols): Progres per Kategori Pos */}
              <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-pink-100 shadow-xs flex flex-col">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-base font-bold text-[#1E1B24]">
                      Progres per Kategori Pos
                    </h3>
                    <p className="text-xs text-[#2A2438]/60">
                      Ringkasan realisasi pembayaran berdasarkan kelompok kebutuhan
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('items')}
                    className="text-xs font-semibold text-[#EC4899] hover:underline cursor-pointer"
                  >
                    Semua Pos →
                  </button>
                </div>

                <div className="space-y-4 overflow-y-auto max-h-[420px] pr-1">
                  {categoryBreakdown.map((cat) => (
                    <div
                      key={cat.category}
                      onClick={() => {
                        setItemCategoryFilter(cat.category);
                        setItemStatusFilter('Semua');
                        setActiveTab('items');
                      }}
                      className="group p-3.5 rounded-xl border border-pink-100/80 hover:border-pink-300 bg-[#FFFDFD] hover:bg-[#FDF2F8]/50 transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#1E1B24] group-hover:text-[#EC4899] transition-colors">
                            {cat.category}
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded-md bg-pink-50 text-[#2A2438]/70">
                            {cat.count} pos
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-[#1E1B24]">
                            {formatIDR(cat.paid)}
                          </span>
                          <span className="text-xs text-[#2A2438]/55">
                            {' '}
                            / {formatIDR(cat.target)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-pink-100/80 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              cat.progress === 100
                                ? 'bg-emerald-500'
                                : cat.progress > 0
                                ? 'bg-[#EC4899]'
                                : 'bg-rose-300'
                            }`}
                            style={{ width: `${cat.progress}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold w-10 text-right text-[#2A2438]/80">
                          {cat.progress}%
                        </span>
                      </div>

                      {cat.remaining > 0 && (
                        <div className="mt-1.5 text-[11px] text-rose-600 font-medium">
                          Sisa belum terbayar: {formatIDR(cat.remaining)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column (5 cols): Histori Pembayaran Terbaru */}
              <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-pink-100 shadow-xs flex flex-col">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-base font-bold text-[#1E1B24]">
                      Histori Pembayaran Terbaru
                    </h3>
                    <p className="text-xs text-[#2A2438]/60">
                      Catatan transaksi pembayaran terakhir
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('history')}
                    className="text-xs font-semibold text-[#EC4899] hover:underline cursor-pointer"
                  >
                    Semua ({allPayments.length}) →
                  </button>
                </div>

                {allPayments.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-10 text-[#2A2438]/50">
                    <History className="w-10 h-10 mb-2 text-pink-200" />
                    <p className="text-sm font-medium">Belum ada riwayat pembayaran</p>
                  </div>
                ) : (
                  <div className="space-y-3 overflow-y-auto max-h-[420px] pr-1">
                    {allPayments.slice(0, 8).map((pay) => (
                      <div
                        key={pay.id}
                        className="p-3.5 rounded-xl border border-pink-100/80 bg-[#FFFDFD] hover:bg-[#FDF2F8]/40 transition-colors flex items-start justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#EC4899]">
                            <Calendar className="w-3 h-3" />
                            <span>{formatDateID(pay.date)}</span>
                            <span>•</span>
                            <span className="truncate">{pay.category}</span>
                          </div>
                          <p className="text-sm font-bold text-[#1E1B24] truncate mt-0.5">
                            {pay.itemName}
                          </p>
                          {pay.note && (
                            <p className="text-xs text-[#2A2438]/60 truncate mt-0.5">
                              “{pay.note}”
                            </p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="inline-block text-sm font-extrabold text-emerald-700">
                            +{formatIDR(pay.amount)}
                          </span>
                          <div className="mt-1">
                            <StatusBadge status={pay.itemStatus} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------
            TAB 2: MANAJEMEN POS TAGIHAN & PROGRES PEMBAYARAN
        ------------------------------------------------------------------ */}
        {activeTab === 'items' && (
          <div className="space-y-5">
            {/* Filter & Action Toolbar */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-pink-100 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-[#1E1B24]">
                    Daftar Pos Tagihan & Alokasi
                  </h2>
                  <p className="text-xs text-[#2A2438]/65">
                    Kelola target anggaran, lakukan pembayaran cepat, atau perbarui status pos
                  </p>
                </div>

                <button
                  onClick={openAddItemModal}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-[#2A2438] hover:bg-[#1E1B24] shadow-xs transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-pink-300" />
                  Tambah Pos Tagihan
                </button>
              </div>

              {/* Search & Filter Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-pink-100/70">
                {/* Search Input */}
                <div className="sm:col-span-5 relative">
                  <Search className="w-4 h-4 text-[#2A2438]/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                    placeholder="Cari nama pos, kategori, atau catatan..."
                    className="w-full pl-10 pr-4 py-2 text-sm bg-[#FFFDFD] border border-pink-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EC4899]/30 focus:border-[#EC4899]"
                  />
                </div>

                {/* Category Filter */}
                <div className="sm:col-span-3 relative">
                  <FolderOpen className="w-4 h-4 text-[#2A2438]/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <select
                    value={itemCategoryFilter}
                    onChange={(e) => setItemCategoryFilter(e.target.value)}
                    className="w-full pl-10 pr-8 py-2 text-sm bg-[#FFFDFD] border border-pink-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EC4899]/30 focus:border-[#EC4899] appearance-none"
                  >
                    <option value="Semua">Semua Kategori</option>
                    {uniqueCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Filter Pills */}
                <div className="sm:col-span-4 flex items-center gap-1.5 overflow-x-auto">
                  {['Semua', 'Belum Lunas', 'Sebagian', 'Lunas'].map((st) => (
                    <button
                      key={st}
                      onClick={() => setItemStatusFilter(st)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                        itemStatusFilter === st
                          ? 'bg-[#EC4899] text-white shadow-xs'
                          : 'bg-[#FDF2F8] text-[#2A2438]/75 hover:bg-pink-100'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Responsive Table (Desktop) & Cards (Mobile) */}
            {filteredItems.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 border border-pink-100 text-center">
                <Filter className="w-10 h-10 text-pink-200 mx-auto mb-3" />
                <h3 className="text-base font-bold text-[#1E1B24]">Tidak ada pos ditemukan</h3>
                <p className="text-xs text-[#2A2438]/60 mt-1">
                  Coba ubah kata kunci pencarian atau filter status di atas.
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden lg:block bg-white rounded-2xl border border-pink-100 shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#FDF2F8]/80 border-b border-pink-100 text-[11px] font-bold uppercase tracking-wider text-[#2A2438]/70">
                          <th className="py-3.5 px-4">Kategori & Pos Tagihan</th>
                          <th className="py-3.5 px-4 text-right">Target Tagihan</th>
                          <th className="py-3.5 px-4 text-right">Terbayar</th>
                          <th className="py-3.5 px-4 text-right">Sisa</th>
                          <th className="py-3.5 px-4 w-44">Progres</th>
                          <th className="py-3.5 px-4 text-center">Status</th>
                          <th className="py-3.5 px-4 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-pink-100/70 text-sm">
                        {filteredItems.map((item) => (
                          <tr
                            key={item.id}
                            className="hover:bg-[#FDF2F8]/40 transition-colors group"
                          >
                            <td className="py-3.5 px-4">
                              <span className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded-md bg-pink-50 text-[#EC4899] mb-1">
                                {item.category}
                              </span>
                              <div className="font-bold text-[#1E1B24]">{item.name}</div>
                              {item.notes && (
                                <div className="text-xs text-[#2A2438]/55 mt-0.5">
                                  Catatan: {item.notes}
                                </div>
                              )}
                            </td>

                            <td className="py-3.5 px-4 text-right font-semibold text-[#1E1B24] whitespace-nowrap">
                              {formatIDR(item.metrics.target)}
                            </td>

                            <td className="py-3.5 px-4 text-right font-bold text-emerald-700 whitespace-nowrap">
                              {formatIDR(item.metrics.paid)}
                            </td>

                            <td
                              className={`py-3.5 px-4 text-right font-bold whitespace-nowrap ${
                                item.metrics.remaining > 0 ? 'text-rose-600' : 'text-[#2A2438]/40'
                              }`}
                            >
                              {formatIDR(Math.max(0, item.metrics.remaining))}
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className="flex-1 h-2 bg-pink-100 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-300 ${
                                      item.metrics.status === 'Lunas'
                                        ? 'bg-emerald-500'
                                        : item.metrics.status === 'Sebagian'
                                        ? 'bg-amber-500'
                                        : 'bg-rose-400'
                                    }`}
                                    style={{ width: `${item.metrics.progress}%` }}
                                  />
                                </div>
                                <span className="text-xs font-bold text-[#2A2438]/75 w-9 text-right">
                                  {item.metrics.progress}%
                                </span>
                              </div>
                            </td>

                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              <StatusBadge status={item.metrics.status} />
                            </td>

                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <div className="inline-flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => openAddPaymentModal(item.id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#FDF2F8] text-[#EC4899] hover:bg-[#EC4899] hover:text-white border border-pink-200 transition-colors cursor-pointer"
                                  title="Catat Pembayaran untuk Pos Ini"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  Bayar
                                </button>
                                <button
                                  onClick={() => openEditItemModal(item)}
                                  className="p-1.5 rounded-lg text-[#2A2438]/60 hover:text-[#1E1B24] hover:bg-pink-100/70 transition-colors cursor-pointer"
                                  title="Edit Pos Tagihan"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => requestDeleteItem(item)}
                                  className="p-1.5 rounded-lg text-rose-500/75 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Hapus Pos Tagihan"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      {/* Table Footer Summary */}
                      <tfoot>
                        <tr className="bg-[#2A2438] text-white text-xs sm:text-sm font-bold">
                          <td className="py-3.5 px-4">
                            TOTAL ({filteredItems.length} pos ditampilkan)
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {formatIDR(
                              filteredItems.reduce((s, i) => s + i.metrics.target, 0)
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right text-emerald-300">
                            {formatIDR(filteredItems.reduce((s, i) => s + i.metrics.paid, 0))}
                          </td>
                          <td className="py-3.5 px-4 text-right text-pink-300">
                            {formatIDR(
                              filteredItems.reduce(
                                (s, i) => s + Math.max(0, i.metrics.remaining),
                                0
                              )
                            )}
                          </td>
                          <td colSpan={3} className="py-3.5 px-4 text-right text-pink-200/80">
                            Progres Keseluruhan: {summary.exactPercentage}%
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Mobile & Tablet Card Grid View */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:hidden">
                  {filteredItems.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white rounded-2xl p-4 border border-pink-100 shadow-xs flex flex-col justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded-md bg-pink-50 text-[#EC4899]">
                              {item.category}
                            </span>
                            <h3 className="font-bold text-base text-[#1E1B24] mt-1">
                              {item.name}
                            </h3>
                          </div>
                          <StatusBadge status={item.metrics.status} />
                        </div>

                        {item.notes && (
                          <p className="text-xs text-[#2A2438]/60 mt-1">Catatan: {item.notes}</p>
                        )}

                        <div className="mobile-metrics grid grid-cols-3 gap-2 mt-3 p-2.5 rounded-xl bg-[#FFFDFD] border border-pink-100/80 text-xs">
                          <div>
                            <span className="text-[#2A2438]/55 block">Target</span>
                            <span className="font-bold text-[#1E1B24]">
                              {formatIDR(item.metrics.target)}
                            </span>
                          </div>
                          <div>
                            <span className="text-[#2A2438]/55 block">Terbayar</span>
                            <span className="font-bold text-emerald-700">
                              {formatIDR(item.metrics.paid)}
                            </span>
                          </div>
                          <div>
                            <span className="text-[#2A2438]/55 block">Sisa</span>
                            <span
                              className={`font-bold ${
                                item.metrics.remaining > 0 ? 'text-rose-600' : 'text-[#2A2438]/40'
                              }`}
                            >
                              {formatIDR(Math.max(0, item.metrics.remaining))}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 mt-3">
                          <div className="flex-1 h-2 bg-pink-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                item.metrics.status === 'Lunas'
                                  ? 'bg-emerald-500'
                                  : item.metrics.status === 'Sebagian'
                                  ? 'bg-amber-500'
                                  : 'bg-rose-400'
                              }`}
                              style={{ width: `${item.metrics.progress}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-[#2A2438]/75">
                            {item.metrics.progress}%
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2.5 border-t border-pink-100/70">
                        <button
                          onClick={() => openAddPaymentModal(item.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#EC4899] text-white hover:bg-[#DB2777] transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Catat Bayar
                        </button>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditItemModal(item)}
                            className="p-2 rounded-lg text-[#2A2438]/65 hover:bg-pink-50"
                            aria-label="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => requestDeleteItem(item)}
                            className="p-2 rounded-lg text-rose-600 hover:bg-rose-50"
                            aria-label="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------
            TAB 3: MANAJEMEN HISTORI PEMBAYARAN
        ------------------------------------------------------------------ */}
        {activeTab === 'history' && (
          <div className="space-y-5">
            {/* Header & Filter Bar */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-pink-100 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-[#1E1B24]">
                    Histori Transaksi Pembayaran
                  </h2>
                  <p className="text-xs text-[#2A2438]/65">
                    Seluruh riwayat pembayaran bertanggal. Edit atau hapus akan otomatis menghitung ulang saldo pos terkait.
                  </p>
                </div>

                <button
                  onClick={() => openAddPaymentModal()}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-[#EC4899] to-[#DB2777] shadow-xs transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Tambah Pembayaran
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-pink-100/70">
                <div className="sm:col-span-7 relative">
                  <Search className="w-4 h-4 text-[#2A2438]/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Cari nama pos tagihan atau catatan pembayaran..."
                    className="w-full pl-10 pr-4 py-2 text-sm bg-[#FFFDFD] border border-pink-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EC4899]/30 focus:border-[#EC4899]"
                  />
                </div>

                <div className="sm:col-span-5 relative">
                  <FolderOpen className="w-4 h-4 text-[#2A2438]/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <select
                    value={historyCategoryFilter}
                    onChange={(e) => setHistoryCategoryFilter(e.target.value)}
                    className="w-full pl-10 pr-8 py-2 text-sm bg-[#FFFDFD] border border-pink-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EC4899]/30 focus:border-[#EC4899] appearance-none"
                  >
                    <option value="Semua">Semua Kategori Pos</option>
                    {uniqueCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Payment History List */}
            {filteredPayments.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 border border-pink-100 text-center">
                <History className="w-10 h-10 text-pink-200 mx-auto mb-3" />
                <h3 className="text-base font-bold text-[#1E1B24]">
                  Tidak ada histori pembayaran ditemukan
                </h3>
                <p className="text-xs text-[#2A2438]/60 mt-1">
                  Silakan catat pembayaran baru atau sesuaikan filter pencarian.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-pink-100 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#FDF2F8]/80 border-b border-pink-100 text-[11px] font-bold uppercase tracking-wider text-[#2A2438]/70">
                        <th className="py-3.5 px-4">Tanggal</th>
                        <th className="py-3.5 px-4">Pos Tagihan</th>
                        <th className="py-3.5 px-4">Catatan</th>
                        <th className="py-3.5 px-4 text-right">Nominal Bayar</th>
                        <th className="py-3.5 px-4 text-center">Status Pos</th>
                        <th className="py-3.5 px-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-pink-100/70 text-sm">
                      {filteredPayments.map((pay) => (
                        <tr
                          key={pay.id}
                          className="hover:bg-[#FDF2F8]/40 transition-colors"
                        >
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5 font-semibold text-[#2A2438]">
                              <Calendar className="w-3.5 h-3.5 text-[#EC4899]" />
                              {formatDateID(pay.date)}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="text-[11px] font-semibold text-[#EC4899] block">
                              {pay.category}
                            </span>
                            <span className="font-bold text-[#1E1B24]">{pay.itemName}</span>
                          </td>
                          <td className="py-3.5 px-4 text-xs text-[#2A2438]/70 max-w-xs truncate">
                            {pay.note || '-'}
                          </td>
                          <td className="py-3.5 px-4 text-right font-extrabold text-emerald-700 whitespace-nowrap">
                            {formatIDR(pay.amount)}
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <StatusBadge status={pay.itemStatus} />
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1">
                              <button
                                onClick={() => openEditPaymentModal(pay)}
                                className="p-1.5 rounded-lg text-[#2A2438]/65 hover:text-[#1E1B24] hover:bg-pink-100/70 transition-colors cursor-pointer"
                                title="Edit Transaksi"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => requestDeletePayment(pay)}
                                className="p-1.5 rounded-lg text-rose-500/80 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Hapus Transaksi"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ====================================================================
          FOOTER
      ==================================================================== */}
      <footer className="border-t border-pink-100 bg-white py-4 px-4 sm:px-6 lg:px-8 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#2A2438]/60">
          <span>
            AlokasiKu — Pembukuan & Pemantauan Progres Pembayaran Rumah Tangga
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#EC4899]" />
            100% Penyimpanan Lokal Otomatis (Browser LocalStorage)
          </span>
        </div>
      </footer>

      {/* ====================================================================
          MODAL 1: CATAT / EDIT PEMBAYARAN
      ==================================================================== */}
      <Modal
        isOpen={paymentModal.open}
        onClose={() => setPaymentModal((prev) => ({ ...prev, open: false }))}
        title={paymentModal.mode === 'add' ? 'Catat Pembayaran Baru' : 'Edit Data Pembayaran'}
        subtitle="Kalkulasi sisa tagihan dan status akan langsung diperbarui otomatis"
      >
        <form onSubmit={handleSavePayment} className="space-y-4">
          {/* Select Pos Tagihan */}
          <div>
            <label className="block text-xs font-bold text-[#1E1B24] mb-1.5">
              Pilih Pos Tagihan
            </label>
            <select
              value={paymentModal.itemId}
              disabled={paymentModal.mode === 'edit'}
              onChange={(e) =>
                setPaymentModal((prev) => ({ ...prev, itemId: e.target.value, amount: '' }))
              }
              className="w-full px-3.5 py-2.5 text-sm bg-[#FFFDFD] border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EC4899]/30 focus:border-[#EC4899] disabled:bg-gray-100 disabled:text-gray-500"
            >
              {computedItems.map((item) => (
                <option key={item.id} value={item.id}>
                  [{item.category}] {item.name} — Sisa:{' '}
                  {formatIDR(Math.max(0, item.metrics.remaining))}
                </option>
              ))}
            </select>
          </div>

          {/* Selected Pos Quick Info Box */}
          {selectedModalItem && (
            <div className="p-3 rounded-xl bg-[#FDF2F8] border border-pink-200/70 flex items-center justify-between text-xs">
              <div>
                <span className="text-[#2A2438]/70 block">Sisa Tagihan Saat Ini:</span>
                <span className="font-extrabold text-sm text-[#1E1B24]">
                  {formatIDR(Math.max(0, selectedModalItem.metrics.remaining))}
                </span>
              </div>
              {paymentModal.mode === 'add' && selectedModalItem.metrics.remaining > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setPaymentModal((prev) => ({
                      ...prev,
                      amount: String(selectedModalItem.metrics.remaining)
                    }))
                  }
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold bg-white text-[#EC4899] border border-pink-200 hover:bg-[#EC4899] hover:text-white transition-colors cursor-pointer"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  Bayar Penuh Sisa
                </button>
              )}
            </div>
          )}

          {/* Nominal Pembayaran (IDR) */}
          <div>
            <label className="block text-xs font-bold text-[#1E1B24] mb-1.5">
              Nominal Pembayaran (Rp)
            </label>
            <input
              type="number"
              min="1"
              step="any"
              required
              value={paymentModal.amount}
              onChange={(e) => setPaymentModal((prev) => ({ ...prev, amount: e.target.value }))}
              placeholder="Contoh: 150000"
              className="w-full px-3.5 py-2.5 text-sm font-semibold bg-[#FFFDFD] border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EC4899]/30 focus:border-[#EC4899]"
            />
            {Number(paymentModal.amount) > 0 && (
              <p className="text-[11px] font-semibold text-emerald-700 mt-1">
                Terbaca: {formatIDR(Number(paymentModal.amount))}
              </p>
            )}
          </div>

          {/* Tanggal Pembayaran */}
          <div>
            <label className="block text-xs font-bold text-[#1E1B24] mb-1.5">
              Tanggal Pembayaran
            </label>
            <input
              type="date"
              required
              value={paymentModal.date}
              onChange={(e) => setPaymentModal((prev) => ({ ...prev, date: e.target.value }))}
              className="w-full px-3.5 py-2.5 text-sm bg-[#FFFDFD] border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EC4899]/30 focus:border-[#EC4899]"
            />
          </div>

          {/* Catatan Opsional */}
          <div>
            <label className="block text-xs font-bold text-[#1E1B24] mb-1.5">
              Catatan Pembayaran (Opsional)
            </label>
            <input
              type="text"
              value={paymentModal.note}
              onChange={(e) => setPaymentModal((prev) => ({ ...prev, note: e.target.value }))}
              placeholder="Contoh: Transfer BCA / Sudah di beli"
              className="w-full px-3.5 py-2.5 text-sm bg-[#FFFDFD] border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EC4899]/30 focus:border-[#EC4899]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-pink-100">
            <button
              type="button"
              onClick={() => setPaymentModal((prev) => ({ ...prev, open: false }))}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#2A2438]/70 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#EC4899] to-[#DB2777] hover:from-[#DB2777] hover:to-[#BE185D] shadow-sm transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              Simpan Pembayaran
            </button>
          </div>
        </form>
      </Modal>

      {/* ====================================================================
          MODAL 2: TAMBAH / EDIT POS TAGIHAN
      ==================================================================== */}
      <Modal
        isOpen={itemModal.open}
        onClose={() => setItemModal((prev) => ({ ...prev, open: false }))}
        title={itemModal.mode === 'add' ? 'Tambah Pos Tagihan Baru' : 'Edit Pos Tagihan'}
        subtitle="Atur kategori pos, nama tagihan, dan target anggaran bulanan"
      >
        <form onSubmit={handleSaveItem} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#1E1B24] mb-1.5">
              Kategori Pos
            </label>
            <select
              value={itemModal.category}
              onChange={(e) => setItemModal((prev) => ({ ...prev, category: e.target.value }))}
              className="w-full px-3.5 py-2.5 text-sm bg-[#FFFDFD] border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EC4899]/30 focus:border-[#EC4899]"
            >
              {uniqueCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
              <option value="__custom__">+ Buat Kategori Baru...</option>
            </select>
          </div>

          {itemModal.category === '__custom__' && (
            <div>
              <label className="block text-xs font-bold text-[#1E1B24] mb-1.5">
                Nama Kategori Baru
              </label>
              <input
                type="text"
                required
                value={itemModal.customCategory}
                onChange={(e) =>
                  setItemModal((prev) => ({ ...prev, customCategory: e.target.value }))
                }
                placeholder="Contoh: Internet & WiFi"
                className="w-full px-3.5 py-2.5 text-sm bg-[#FFFDFD] border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EC4899]/30 focus:border-[#EC4899]"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#1E1B24] mb-1.5">
              Nama Pos / Tagihan
            </label>
            <input
              type="text"
              required
              value={itemModal.name}
              onChange={(e) => setItemModal((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Contoh: Tagihan Air PDAM"
              className="w-full px-3.5 py-2.5 text-sm bg-[#FFFDFD] border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EC4899]/30 focus:border-[#EC4899]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1E1B24] mb-1.5">
              Target Anggaran / Tagihan (Rp)
            </label>
            <input
              type="number"
              min="1"
              step="any"
              required
              value={itemModal.target}
              onChange={(e) => setItemModal((prev) => ({ ...prev, target: e.target.value }))}
              placeholder="Contoh: 250000"
              className="w-full px-3.5 py-2.5 text-sm font-semibold bg-[#FFFDFD] border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EC4899]/30 focus:border-[#EC4899]"
            />
            {Number(itemModal.target) > 0 && (
              <p className="text-[11px] font-semibold text-[#EC4899] mt-1">
                Terbaca: {formatIDR(Number(itemModal.target))}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1E1B24] mb-1.5">
              Catatan Pos (Opsional)
            </label>
            <input
              type="text"
              value={itemModal.notes}
              onChange={(e) => setItemModal((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Contoh: Jatuh tempo tanggal 20"
              className="w-full px-3.5 py-2.5 text-sm bg-[#FFFDFD] border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EC4899]/30 focus:border-[#EC4899]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-pink-100">
            <button
              type="button"
              onClick={() => setItemModal((prev) => ({ ...prev, open: false }))}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#2A2438]/70 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#2A2438] hover:bg-[#1E1B24] shadow-sm transition-all cursor-pointer"
            >
              <Check className="w-4 h-4 text-pink-300" />
              {itemModal.mode === 'add' ? 'Tambah Pos' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ====================================================================
          MODAL 3: DIALOG KONFIRMASI (HAPUS, RESET, IMPORT JSON)
      ==================================================================== */}
      <Modal
        isOpen={confirmDialog.open}
        onClose={closeConfirmDialog}
        title={confirmDialog.title}
        maxWidth="max-w-sm"
      >
        <p className="text-sm text-[#2A2438]/80 leading-relaxed">{confirmDialog.message}</p>
        <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-pink-100">
          <button
            type="button"
            onClick={closeConfirmDialog}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[#2A2438]/75 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={confirmDialog.onConfirm}
            className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition-all cursor-pointer ${
              confirmDialog.variant === 'danger'
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-[#EC4899] hover:bg-[#DB2777]'
            }`}
          >
            {confirmDialog.confirmLabel}
          </button>
        </div>
      </Modal>

      {/* ====================================================================
          FLOATING TOAST NOTIFICATION
      ==================================================================== */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm animate-bounce-once">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border text-xs sm:text-sm font-semibold ${
              toast.type === 'error'
                ? 'bg-rose-950 text-white border-rose-800'
                : 'bg-[#1E1B24] text-white border-pink-500/30'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-pink-400 flex-shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
