import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import {
  Wallet, CheckCircle2, Clock, Plus, Pencil, Trash2, Download, Upload,
  RotateCcw, Search, Calendar, CreditCard, Sparkles, X, Check, AlertCircle,
  FileSpreadsheet, ChevronDown, ChevronUp, Receipt, Cloud, CloudOff, Share2, RefreshCw
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from './supabaseClient';

const STORAGE_KEY = 'alokasiku_household_v1';
const ROOM_STORAGE_KEY = 'alokasiku_room_id';

const INITIAL_DATA = {
  version: '1.0',
  period: 'Bulanan',
  hiddenIncomeData: {
    sources: [
      { id: 'inc-1', name: 'Gaji Suami / Utama', planned: 10500000, actual: 10500000 },
      { id: 'inc-2', name: 'Gaji Istri / Tambahan', planned: 5000000, actual: 5000000 },
      { id: 'inc-3', name: 'Bonus', planned: 0, actual: 0 },
    ],
  },
  allocations: [
    { id: 'item-1', category: 'Belanja Dapur', name: 'Belanja Dapur & Sembako week 1', target: 500000, notes: '', payments: [{ id: 'p-1', date: '2026-11-01', amount: 500000, note: 'Pembayaran penuh' }] },
    { id: 'item-2', category: 'Belanja Dapur', name: 'Belanja Dapur & Sembako week 2', target: 500000, notes: '', payments: [{ id: 'p-2', date: '2026-11-08', amount: 500000, note: 'Pembayaran penuh' }] },
    { id: 'item-3', category: 'Belanja Dapur', name: 'Belanja Dapur & Sembako week 3', target: 500000, notes: '', payments: [{ id: 'p-3', date: '2026-11-15', amount: 500000, note: 'Pembayaran penuh' }] },
    { id: 'item-4', category: 'Belanja Dapur', name: 'Belanja Dapur & Sembako week 4', target: 500000, notes: '', payments: [{ id: 'p-4', date: '2026-11-22', amount: 500000, note: 'Pembayaran penuh' }] },
    { id: 'item-5', category: 'Belanja Dapur', name: 'Belanja Dapur & Sembako week 5', target: 500000, notes: '', payments: [{ id: 'p-5', date: '2026-11-25', amount: 500000, note: 'Pembayaran penuh' }] },
    { id: 'item-6', category: 'Beras', name: 'Beras Q1', target: 170000, notes: 'Sudah Di Beli', payments: [{ id: 'p-6', date: '2026-11-02', amount: 170000, note: 'Sudah Di Beli' }] },
    { id: 'item-7', category: 'Beras', name: 'Beras Q2', target: 170000, notes: '', payments: [{ id: 'p-7', date: '2026-11-16', amount: 170000, note: 'Pembayaran penuh' }] },
    { id: 'item-8', category: 'Minum', name: 'isi ulang 4/week, le minerale 2/week', target: 320000, notes: '', payments: [{ id: 'p-8', date: '2026-11-03', amount: 320000, note: 'Alokasi bulanan' }] },
    { id: 'item-9', category: 'Gas', name: 'Gas', target: 46000, notes: '', payments: [{ id: 'p-9', date: '2026-11-04', amount: 46000, note: 'Isi ulang gas' }] },
    { id: 'item-10', category: 'Laundry', name: '4/week', target: 280000, notes: '', payments: [{ id: 'p-10', date: '2026-11-05', amount: 280000, note: 'Laundry bulanan' }] },
    { id: 'item-11', category: 'Minyak dll', name: 'Minyak, gula, penyedap, dll', target: 150000, notes: '', payments: [{ id: 'p-11', date: '2026-11-05', amount: 150000, note: 'Belanja bumbu' }] },
    { id: 'item-12', category: 'Cicilan', name: 'Rumah', target: 1500000, notes: '', payments: [{ id: 'p-12', date: '2026-11-05', amount: 1500000, note: 'Cicilan rumah' }] },
    { id: 'item-13', category: 'Cicilan', name: 'lain-lain', target: 1000000, notes: '', payments: [{ id: 'p-13', date: '2026-11-05', amount: 1000000, note: 'Cicilan lain-lain' }] },
    { id: 'item-14', category: 'Listrik', name: 'Listrik', target: 400000, notes: 'Baru Isi 50.000', payments: [{ id: 'p-14', date: '2026-11-10', amount: 50000, note: 'Baru Isi 50.000' }] },
    { id: 'item-15', category: 'E-money', name: 'Suami', target: 355000, notes: 'Baru Isi 100.000', payments: [{ id: 'p-15', date: '2026-11-10', amount: 100000, note: 'Baru Isi 100.000' }] },
    { id: 'item-16', category: 'E-money', name: 'Istri', target: 150000, notes: 'Sudah Di Isi', payments: [{ id: 'p-16', date: '2026-11-03', amount: 150000, note: 'Sudah Di Isi' }] },
    { id: 'item-17', category: 'Parkir', name: 'Suami', target: 115000, notes: '', payments: [{ id: 'p-17', date: '2026-11-06', amount: 115000, note: 'Parkir bulanan' }] },
    { id: 'item-18', category: 'Parkir', name: 'Istri', target: 465000, notes: '', payments: [{ id: 'p-18', date: '2026-11-06', amount: 465000, note: 'Parkir bulanan' }] },
    { id: 'item-19', category: 'Orang Tua', name: 'Suami', target: 1000000, notes: 'Sudah Di Transfer', payments: [{ id: 'p-19', date: '2026-11-01', amount: 1000000, note: 'Sudah Di Transfer' }] },
    { id: 'item-20', category: 'Orang Tua', name: 'Istri', target: 1000000, notes: '', payments: [{ id: 'p-20', date: '2026-11-01', amount: 1000000, note: 'Transfer orang tua' }] },
    { id: 'item-21', category: 'Bensin', name: 'Suami', target: 280000, notes: '', payments: [{ id: 'p-21', date: '2026-11-07', amount: 280000, note: 'Bensin' }] },
    { id: 'item-22', category: 'Bensin', name: 'Istri', target: 100000, notes: '', payments: [{ id: 'p-22', date: '2026-11-07', amount: 100000, note: 'Bensin' }] },
    { id: 'item-23', category: 'Arisan', name: 'SRO', target: 250000, notes: '', payments: [{ id: 'p-23', date: '2026-11-07', amount: 250000, note: 'Setoran arisan SRO' }] },
    { id: 'item-24', category: 'Arisan', name: 'TDB', target: 165000, notes: '', payments: [{ id: 'p-24', date: '2026-11-14', amount: 165000, note: 'Setoran arisan TDB' }] },
    { id: 'item-25', category: 'Pegangan', name: 'Suami', target: 400000, notes: '', payments: [{ id: 'p-25', date: '2026-11-01', amount: 400000, note: 'Pegangan bulanan' }] },
    { id: 'item-26', category: 'Pegangan', name: 'Istri/Biaya Tak Terduga', target: 2000000, notes: '', payments: [{ id: 'p-26', date: '2026-11-01', amount: 2000000, note: 'Pegangan & dana tak terduga' }] },
    { id: 'item-27', category: 'Pampers & Vitamin', name: 'Anak', target: 500000, notes: '', payments: [{ id: 'p-27', date: '2026-11-04', amount: 500000, note: 'Kebutuhan anak' }] },
  ],
};

const createFreshInitialData = () => JSON.parse(JSON.stringify(INITIAL_DATA));

const formatIDR = (val) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(val) || 0);

const formatDateID = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

const validateAppData = (parsed) => {
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.allocations)) return false;
  return parsed.allocations.every(
    (item) =>
      typeof item.id === 'string' &&
      typeof item.category === 'string' &&
      typeof item.name === 'string' &&
      typeof item.target === 'number' &&
      Array.isArray(item.payments)
  );
};

const getInitialRoomId = () => {
  const params = new URLSearchParams(window.location.search);
  const urlRoom = params.get('room');
  if (urlRoom && urlRoom.trim()) {
    const clean = urlRoom.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '');
    localStorage.setItem(ROOM_STORAGE_KEY, clean);
    return clean;
  }
  return localStorage.getItem(ROOM_STORAGE_KEY) || 'keluarga-open';
};

export default function App() {
  const [roomId, setRoomId] = useState(getInitialRoomId);
  const [syncStatus, setSyncStatus] = useState(isSupabaseConfigured ? 'connecting' : 'local-only');
  const skipNextCloudPush = useRef(false);

  const [appData, setAppData] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (validateAppData(parsed)) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return createFreshInitialData();
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [expandedRow, setExpandedRow] = useState(null);
  const [toast, setToast] = useState(null);

  // Modals
  const [payModal, setPayModal] = useState({ open: false, itemId: '', editPayment: null });
  const [itemModal, setItemModal] = useState({ open: false, editItem: null });
  const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', onConfirm: null });
  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [roomInput, setRoomInput] = useState(roomId);
  const fileInputRef = useRef(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // Sinkronisasi URL query parameter ?room=...
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('room', roomId);
    window.history.replaceState({}, '', url.toString());
    localStorage.setItem(ROOM_STORAGE_KEY, roomId);
  }, [roomId]);

  // Fungsi ambil data terbaru dari Supabase (saat buka halaman / refresh)
  const fetchFromSupabase = useCallback(
    async (notify = false) => {
      if (!isSupabaseConfigured || !supabase) {
        setSyncStatus('local-only');
        return;
      }

      setSyncStatus('connecting');
      const { data, error } = await supabase
        .from('household_allocations')
        .select('data')
        .eq('id', roomId)
        .maybeSingle();

      if (error) {
        console.error('Supabase fetch error:', error);
        setSyncStatus('error');
        if (notify) showToast(`Gagal memuat cloud: ${error.message}`, 'error');
        return;
      }

      if (data && validateAppData(data.data)) {
        skipNextCloudPush.current = true;
        setAppData(data.data);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data.data));
        setSyncStatus('synced');
        if (notify) showToast('Data terbaru berhasil dimuat');
      } else {
        const { error: upsertErr } = await supabase
          .from('household_allocations')
          .upsert({ id: roomId, data: appData, updated_at: new Date().toISOString() });
        if (upsertErr) {
          console.error('Supabase initial upsert error:', upsertErr);
          setSyncStatus('error');
        } else {
          setSyncStatus('synced');
        }
      }
    },
    [roomId, showToast]
  );

  // Load awal saat aplikasi dibuka atau kode ruang berubah
  useEffect(() => {
    fetchFromSupabase(false);
  }, [fetchFromSupabase]);

  // Auto-save ke LocalStorage & Supabase setiap kali user mengubah data
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
    } catch (e) {
      console.error('LocalStorage save failed:', e);
    }

    if (skipNextCloudPush.current) {
      skipNextCloudPush.current = false;
      return;
    }

    if (!isSupabaseConfigured || !supabase) return;

    const pushToCloud = async () => {
      setSyncStatus('syncing');
      const { error } = await supabase
        .from('household_allocations')
        .upsert({ id: roomId, data: appData, updated_at: new Date().toISOString() });

      if (error) {
        console.error('Supabase upsert error:', error);
        setSyncStatus('error');
        showToast(`Gagal simpan ke cloud: ${error.message}`, 'error');
      } else {
        setSyncStatus('synced');
      }
    };

    pushToCloud();
  }, [appData, roomId, showToast]);

  // Enrich items dengan formula Excel: Sisa = Target - Realisasi
  const enrichedItems = useMemo(() => {
    return appData.allocations.map((item) => {
      const paid = item.payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const remaining = Math.max(0, item.target - paid);
      const overpaid = paid > item.target ? paid - item.target : 0;
      const pct = item.target > 0 ? Math.min(100, Math.round((paid / item.target) * 1000) / 10) : 100;
      let status = 'Belum Lunas';
      if (paid >= item.target && item.target > 0) status = 'Lunas';
      else if (paid > 0) status = 'Sebagian';
      return { ...item, paid, remaining, overpaid, pct, status };
    });
  }, [appData.allocations]);

  const summary = useMemo(() => {
    const totalTagihan = enrichedItems.reduce((s, i) => s + i.target, 0);
    const totalTerbayar = enrichedItems.reduce((s, i) => s + i.paid, 0);
    const sisaPembayaran = enrichedItems.reduce((s, i) => s + (i.target - i.paid), 0);
    const progressPct = totalTagihan > 0 ? Math.min(100, Math.round((totalTerbayar / totalTagihan) * 1000) / 10) : 0;
    const lunasCount = enrichedItems.filter((i) => i.status === 'Lunas').length;
    const overallStatus =
      totalTerbayar >= totalTagihan && totalTagihan > 0
        ? 'Lunas'
        : totalTerbayar > 0
        ? 'Sebagian'
        : 'Belum Lunas';
    return { totalTagihan, totalTerbayar, sisaPembayaran, progressPct, lunasCount, totalCount: enrichedItems.length, overallStatus };
  }, [enrichedItems]);

  const allPayments = useMemo(() => {
    const list = [];
    enrichedItems.forEach((item) => {
      item.payments.forEach((p) => {
        list.push({
          ...p,
          itemId: item.id,
          category: item.category,
          itemName: item.name,
          itemStatus: item.status,
        });
      });
    });
    return list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [enrichedItems]);

  const categoryBreakdown = useMemo(() => {
    const map = {};
    enrichedItems.forEach((item) => {
      if (!map[item.category]) map[item.category] = { category: item.category, target: 0, paid: 0 };
      map[item.category].target += item.target;
      map[item.category].paid += item.paid;
    });
    return Object.values(map).map((c) => ({
      ...c,
      remaining: Math.max(0, c.target - c.paid),
      pct: c.target > 0 ? Math.min(100, Math.round((c.paid / c.target) * 100)) : 100,
    }));
  }, [enrichedItems]);

  const filteredItems = useMemo(() => {
    return enrichedItems.filter((item) => {
      const matchSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === 'ALL' || item.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [enrichedItems, searchQuery, statusFilter]);

  // Share Link Room
  const handleCopyShareLink = async () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(roomId)}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast('Link berbagi disalin! Buka link ini di perangkat lain.');
    } catch {
      showToast(`Salin link ini: ${shareUrl}`);
    }
  };

  // CRUD Pembayaran
  const handleSavePayment = (itemId, paymentData, editPaymentId = null) => {
    setAppData((prev) => ({
      ...prev,
      allocations: prev.allocations.map((item) => {
        if (item.id !== itemId) return item;
        const updatedPayments = editPaymentId
          ? item.payments.map((p) => (p.id === editPaymentId ? { ...p, ...paymentData } : p))
          : [...item.payments, { id: `pay-${Date.now()}`, ...paymentData }];
        return { ...item, payments: updatedPayments };
      }),
    }));
    setPayModal({ open: false, itemId: '', editPayment: null });
    showToast(editPaymentId ? 'Data pembayaran diperbarui' : 'Pembayaran baru dicatat');
  };

  const handleDeletePayment = (itemId, paymentId) => {
    setConfirmModal({
      open: true,
      title: 'Hapus Histori Pembayaran?',
      message: 'Nominal pembayaran ini akan dihapus dan sisa tagihan akan otomatis dihitung ulang.',
      onConfirm: () => {
        setAppData((prev) => ({
          ...prev,
          allocations: prev.allocations.map((item) =>
            item.id === itemId ? { ...item, payments: item.payments.filter((p) => p.id !== paymentId) } : item
          ),
        }));
        setConfirmModal({ open: false });
        showToast('Pembayaran dihapus');
      },
    });
  };

  // CRUD Pos Tagihan
  const handleSaveItem = (formData, editId = null) => {
    setAppData((prev) => {
      if (editId) {
        return {
          ...prev,
          allocations: prev.allocations.map((item) =>
            item.id === editId ? { ...item, ...formData, target: Number(formData.target) } : item
          ),
        };
      }
      const newItem = {
        id: `item-${Date.now()}`,
        category: formData.category.trim(),
        name: formData.name.trim(),
        target: Number(formData.target),
        notes: formData.notes || '',
        payments: [],
      };
      return { ...prev, allocations: [...prev.allocations, newItem] };
    });
    setItemModal({ open: false, editItem: null });
    showToast(editId ? 'Pos alokasi diperbarui' : 'Pos alokasi baru ditambahkan');
  };

  const handleDeleteItem = (itemId, itemName) => {
    setConfirmModal({
      open: true,
      title: `Hapus Pos "${itemName}"?`,
      message: 'Seluruh histori pembayaran pada pos ini juga akan dihapus.',
      onConfirm: () => {
        setAppData((prev) => ({
          ...prev,
          allocations: prev.allocations.filter((i) => i.id !== itemId),
        }));
        setConfirmModal({ open: false });
        showToast('Pos alokasi dihapus');
      },
    });
  };

  // JSON Export & Import
  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(appData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-alokasi-${roomId}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Backup JSON berhasil diunduh');
  };

  const handleImportJSONFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target.result);
        if (!validateAppData(parsed)) {
          showToast('Struktur file JSON tidak valid!', 'error');
          return;
        }
        setConfirmModal({
          open: true,
          title: 'Timpa Data Saat Ini?',
          message: `File "${file.name}" berisi ${parsed.allocations.length} pos alokasi. Data lama akan digantikan.`,
          onConfirm: () => {
            setAppData(parsed);
            setConfirmModal({ open: false });
            showToast('Data JSON berhasil dipulihkan');
          },
        });
      } catch {
        showToast('Gagal membaca file JSON', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Excel Export (.xlsx)
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    const summaryRows = [
      ['LAPORAN RINGKASAN PEMBAYARAN & ALOKASI RUMAH TANGGA'],
      ['Kode Ruang', roomId],
      ['Tanggal Cetak', formatDateID(new Date().toISOString().slice(0, 10))],
      [],
      ['Keterangan', 'Nilai'],
      ['Total Tagihan / Alokasi', summary.totalTagihan],
      ['Total Pembayaran Terlaksana', summary.totalTerbayar],
      ['Sisa Pembayaran', summary.sisaPembayaran],
      ['Persentase Progres (%)', `${summary.progressPct}%`],
      ['Status Keseluruhan', summary.overallStatus],
      [],
      ['DETAIL ALOKASI PER POS'],
      ['Kategori Pos', 'Nama Pos / Tagihan', 'Target Anggaran (Rp)', 'Realisasi Aktual (Rp)', 'Sisa Anggaran (Rp)', 'Progres (%)', 'Status'],
      ...enrichedItems.map((i) => [
        i.category,
        i.name,
        i.target,
        i.paid,
        i.target - i.paid,
        `${i.pct}%`,
        i.status,
      ]),
      ['TOTAL', '', summary.totalTagihan, summary.totalTerbayar, summary.sisaPembayaran, `${summary.progressPct}%`, summary.overallStatus],
    ];

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    wsSummary['!cols'] = [{ wch: 22 }, { wch: 36 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 14 }, { wch: 16 }];
    for (let r = 6; r <= 8; r++) {
      if (wsSummary[`B${r}`]) wsSummary[`B${r}`].z = '"Rp"#,##0';
    }
    for (let r = 14; r <= 14 + enrichedItems.length; r++) {
      ['C', 'D', 'E'].forEach((col) => {
        if (wsSummary[`${col}${r}`]) wsSummary[`${col}${r}`].z = '"Rp"#,##0';
      });
    }

    const historyRows = [
      ['HISTORI TRANSAKSI PEMBAYARAN'],
      [],
      ['Tanggal Pembayaran', 'Kategori Pos', 'Nama Pos / Tagihan', 'Nominal Pembayaran (Rp)', 'Status Pos', 'Catatan'],
      ...allPayments.map((p) => [
        formatDateID(p.date),
        p.category,
        p.itemName,
        Number(p.amount) || 0,
        p.itemStatus,
        p.note || '-',
      ]),
    ];

    const wsHistory = XLSX.utils.aoa_to_sheet(historyRows);
    wsHistory['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 34 }, { wch: 24 }, { wch: 16 }, { wch: 28 }];
    for (let r = 4; r <= 3 + allPayments.length; r++) {
      if (wsHistory[`D${r}`]) wsHistory[`D${r}`].z = '"Rp"#,##0';
    }

    XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan & Alokasi');
    XLSX.utils.book_append_sheet(wb, wsHistory, 'Histori Pembayaran');
    XLSX.writeFile(wb, `Laporan-Alokasi-${roomId}-${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast('Laporan Excel (.xlsx) berhasil diunduh');
  };

  // Reset Data ke Awal (Local + Cloud)
  const handleResetData = () => {
    setConfirmModal({
      open: true,
      title: 'Reset Seluruh Data?',
      message: 'Semua perubahan pada ruang ini akan dikembalikan ke data awal.',
      onConfirm: async () => {
        const freshData = createFreshInitialData();
        localStorage.removeItem(STORAGE_KEY);
        setExpandedRow(null);
        setSearchQuery('');
        setStatusFilter('ALL');
        setConfirmModal({ open: false });

        // Hindari double push dari useEffect karena langsung kita simpan eksplisit ke cloud
        skipNextCloudPush.current = true;
        setAppData(freshData);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(freshData));

        if (isSupabaseConfigured && supabase) {
          setSyncStatus('syncing');
          const { error } = await supabase
            .from('household_allocations')
            .upsert({ id: roomId, data: freshData, updated_at: new Date().toISOString() });

          if (error) {
            console.error('Supabase reset error:', error);
            setSyncStatus('error');
            showToast(`Reset lokal berhasil, tapi gagal ke cloud: ${error.message}`, 'error');
            return;
          }
          setSyncStatus('synced');
        }

        showToast('Data berhasil dikembalikan ke pengaturan awal');
      },
    });
  };

  const StatusBadge = ({ status }) => {
    const styles = {
      Lunas: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      Sebagian: 'bg-pink-50 text-pink-700 border-pink-200',
      'Belum Lunas': 'bg-slate-100 text-slate-700 border-slate-200',
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[status] || styles['Belum Lunas']}`}>
        {status}
      </span>
    );
  };

  const SyncBadge = () => {
    if (syncStatus === 'synced') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
          <Cloud className="w-3.5 h-3.5" /> Cloud ({roomId})
        </span>
      );
    }
    if (syncStatus === 'syncing' || syncStatus === 'connecting') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-pink-500/20 text-pink-200 border border-pink-400/30">
          <Cloud className="w-3.5 h-3.5 animate-pulse" /> Menyimpan...
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-200 border border-amber-400/30">
        <CloudOff className="w-3.5 h-3.5" /> Mode Lokal
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#FFF8FA] text-[#1E1B24] font-sans pb-16">
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg bg-[#1E1B24] text-white text-sm border border-pink-500/30">
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4 text-rose-400" /> : <Check className="w-4 h-4 text-pink-400" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#1E1B24] text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-400 to-rose-600 flex items-center justify-center shadow-inner">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight leading-none">AlokasiKu</h1>
                <SyncBadge />
              </div>
              <p className="text-[11px] text-pink-200/80 mt-0.5 hidden sm:block">Monitoring Progres Pembayaran Rumah Tangga</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {isSupabaseConfigured && (
              <button
                type="button"
                onClick={() => fetchFromSupabase(true)}
                title="Muat Ulang Data Terbaru dari Cloud"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/20 text-pink-100 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-pink-300 ${syncStatus === 'connecting' ? 'animate-spin' : ''}`} />
                <span className="hidden lg:inline">Refresh</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleCopyShareLink}
              title="Salin Link Ruang"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/20 text-pink-100 transition"
            >
              <Share2 className="w-3.5 h-3.5 text-pink-300" />
              <span className="hidden md:inline">Bagikan</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setRoomInput(roomId);
                setRoomModalOpen(true);
              }}
              title="Ganti Kode Ruang"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/20 text-pink-100 transition"
            >
              <span>Ruang</span>
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/20 text-pink-100 transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-pink-300" />
              <span className="hidden md:inline">Excel</span>
            </button>
            <button
              type="button"
              onClick={handleExportJSON}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/20 text-pink-100 transition"
            >
              <Download className="w-3.5 h-3.5 text-pink-300" />
              <span className="hidden md:inline">Backup</span>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/20 text-pink-100 transition"
            >
              <Upload className="w-3.5 h-3.5 text-pink-300" />
              <span className="hidden md:inline">Restore</span>
            </button>
            <input ref={fileInputRef} type="file" accept=".json" onChange={handleImportJSONFile} className="hidden" />
            <button
              type="button"
              onClick={() => setPayModal({ open: true, itemId: enrichedItems.find((i) => i.remaining > 0)?.id || enrichedItems[0]?.id || '', editPayment: null })}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Catat Bayar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex p-1 rounded-xl bg-pink-100/70 border border-pink-200/60">
            {[
              { id: 'dashboard', label: 'Dashboard' },
              { id: 'allocations', label: `Pos Tagihan (${enrichedItems.length})` },
              { id: 'history', label: `Histori (${allPayments.length})` },
            ].map((tab) => (
              <button
                type="button"
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition ${
                  activeTab === tab.id
                    ? 'bg-[#1E1B24] text-white shadow-sm'
                    : 'text-[#1E1B24]/70 hover:text-[#1E1B24]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleResetData}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Data Awal
          </button>
        </div>

        {/* KPI Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-pink-100 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Tagihan</span>
              <div className="w-8 h-8 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold text-[#1E1B24]">{formatIDR(summary.totalTagihan)}</p>
            <p className="mt-1 text-xs text-slate-500">{summary.totalCount} pos alokasi bulanan</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-pink-100 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Sudah Dibayar</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold text-emerald-600">{formatIDR(summary.totalTerbayar)}</p>
            <p className="mt-1 text-xs text-slate-500">{summary.lunasCount} dari {summary.totalCount} pos lunas</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-pink-100 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Sisa Pembayaran</span>
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold text-rose-600">{formatIDR(summary.sisaPembayaran)}</p>
            <p className="mt-1 text-xs text-slate-500">Target belum terealisasi</p>
          </div>

          <div className="bg-[#1E1B24] text-white rounded-2xl p-5 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-pink-200/80">Progres Pelunasan</span>
              <StatusBadge status={summary.overallStatus} />
            </div>
            <div className="mt-3">
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-2xl font-bold text-white">{summary.progressPct}%</span>
                <span className="text-xs text-pink-200/70">Terealisasi</span>
              </div>
              <div className="w-full h-2.5 bg-white/15 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-pink-400 to-rose-500 rounded-full transition-all duration-500"
                  style={{ width: `${summary.progressPct}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-pink-100 shadow-sm p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-[#1E1B24]">Progres per Kategori Pos</h2>
                  <p className="text-xs text-slate-500">Perbandingan realisasi aktual terhadap target anggaran</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('allocations')}
                  className="text-xs font-semibold text-pink-600 hover:text-pink-700"
                >
                  Lihat Semua Pos →
                </button>
              </div>
              <div className="space-y-4 max-h-[430px] overflow-y-auto pr-1">
                {categoryBreakdown.map((cat) => (
                  <div key={cat.category} className="p-3.5 rounded-xl bg-[#FFF8FA] border border-pink-100/80">
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="font-semibold text-[#1E1B24]">{cat.category}</span>
                      <div className="text-right">
                        <span className="font-bold text-[#1E1B24]">{formatIDR(cat.paid)}</span>
                        <span className="text-slate-400 text-xs"> / {formatIDR(cat.target)}</span>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-pink-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          cat.pct >= 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-pink-400 to-rose-500'
                        }`}
                        style={{ width: `${cat.pct}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-1.5 text-[11px] text-slate-500">
                      <span>{cat.pct}% selesai</span>
                      <span>{cat.remaining > 0 ? `Sisa ${formatIDR(cat.remaining)}` : 'Lunas'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-pink-100 shadow-sm p-5">
                <h2 className="text-base font-bold text-[#1E1B24] mb-1">Perlu Dilunasi</h2>
                <p className="text-xs text-slate-500 mb-3">Pos dengan sisa tagihan belum dibayar</p>
                {enrichedItems.filter((i) => i.remaining > 0).length === 0 ? (
                  <div className="p-4 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-medium text-center">
                    Semua pos alokasi bulan ini sudah lunas!
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {enrichedItems
                      .filter((i) => i.remaining > 0)
                      .map((item) => (
                        <div key={item.id} className="p-3 rounded-xl border border-pink-100 bg-[#FFF8FA] flex items-center justify-between gap-2">
                          <div>
                            <p className="text-xs font-semibold text-[#1E1B24]">{item.category} — {item.name}</p>
                            <p className="text-xs text-rose-600 font-bold mt-0.5">Sisa: {formatIDR(item.remaining)}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setPayModal({ open: true, itemId: item.id, editPayment: null })}
                            className="px-2.5 py-1.5 rounded-lg bg-[#1E1B24] text-white text-xs font-semibold hover:bg-pink-600 transition shrink-0"
                          >
                            Bayar
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-pink-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-bold text-[#1E1B24]">Pembayaran Terbaru</h2>
                  <button type="button" onClick={() => setActiveTab('history')} className="text-xs font-semibold text-pink-600">
                    Semua →
                  </button>
                </div>
                <div className="space-y-2.5">
                  {allPayments.slice(0, 5).map((p) => (
                    <div key={p.id} className="flex items-center justify-between py-2 border-b border-pink-50 last:border-0">
                      <div>
                        <p className="text-xs font-semibold text-[#1E1B24]">{p.category} ({p.itemName})</p>
                        <p className="text-[11px] text-slate-400">{formatDateID(p.date)}</p>
                      </div>
                      <span className="text-xs font-bold text-emerald-600">+{formatIDR(p.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ALLOCATIONS TAB */}
        {activeTab === 'allocations' && (
          <section className="bg-white rounded-2xl border border-pink-100 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-pink-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 flex-1">
                <div className="relative flex-1 min-w-[200px] max-w-xs">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari kategori atau nama pos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-pink-200 focus:outline-none focus:ring-2 focus:ring-pink-400 bg-[#FFF8FA]"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 text-xs sm:text-sm rounded-xl border border-pink-200 bg-[#FFF8FA] focus:outline-none focus:ring-2 focus:ring-pink-400"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="Lunas">Lunas</option>
                  <option value="Sebagian">Sebagian</option>
                  <option value="Belum Lunas">Belum Lunas</option>
                </select>
              </div>
              <button
                type="button"
                onClick={() => setItemModal({ open: true, editItem: null })}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-[#1E1B24] text-white hover:bg-pink-600 transition"
              >
                <Plus className="w-4 h-4" />
                Tambah Pos Baru
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#FFF8FA] border-b border-pink-100 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-4">Kategori & Nama Pos</th>
                    <th className="py-3.5 px-4 text-right">Target Anggaran</th>
                    <th className="py-3.5 px-4 text-right">Sudah Dibayar</th>
                    <th className="py-3.5 px-4 text-right">Sisa Tagihan</th>
                    <th className="py-3.5 px-4 w-36">Progres</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pink-50 text-xs sm:text-sm">
                  {filteredItems.map((item) => (
                    <React.Fragment key={item.id}>
                      <tr className="hover:bg-pink-50/40 transition">
                        <td className="py-3.5 px-4">
                          <span className="text-[11px] font-semibold text-pink-600 uppercase">{item.category}</span>
                          <p className="font-semibold text-[#1E1B24]">{item.name}</p>
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium">{formatIDR(item.target)}</td>
                        <td className="py-3.5 px-4 text-right font-semibold text-emerald-600">{formatIDR(item.paid)}</td>
                        <td className="py-3.5 px-4 text-right font-semibold text-rose-600">{formatIDR(item.remaining)}</td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-full h-2 bg-pink-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${item.pct >= 100 ? 'bg-emerald-500' : 'bg-pink-500'}`}
                                style={{ width: `${item.pct}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-slate-600 w-10 text-right">{item.pct}%</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <StatusBadge status={item.status} />
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setPayModal({ open: true, itemId: item.id, editPayment: null })}
                              title="Tambah Pembayaran"
                              className="px-2.5 py-1 rounded-lg bg-pink-100 text-pink-700 hover:bg-pink-200 text-xs font-semibold transition"
                            >
                              + Bayar
                            </button>
                            <button
                              type="button"
                              onClick={() => setExpandedRow(expandedRow === item.id ? null : item.id)}
                              title="Lihat Riwayat Pos"
                              className="p-1.5 rounded-lg text-slate-500 hover:bg-pink-100 transition"
                            >
                              {expandedRow === item.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => setItemModal({ open: true, editItem: item })}
                              title="Edit Pos"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-[#1E1B24] hover:bg-slate-100 transition"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item.id, item.name)}
                              title="Hapus Pos"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedRow === item.id && (
                        <tr className="bg-[#FFF8FA]">
                          <td colSpan={7} className="px-6 py-3">
                            <p className="text-xs font-bold text-[#1E1B24] mb-2">Riwayat Pembayaran ({item.payments.length}):</p>
                            {item.payments.length === 0 ? (
                              <p className="text-xs text-slate-400">Belum ada transaksi pembayaran pada pos ini.</p>
                            ) : (
                              <div className="space-y-1.5">
                                {item.payments.map((p) => (
                                  <div key={p.id} className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-pink-100 text-xs">
                                    <div className="flex items-center gap-3">
                                      <span className="font-medium text-slate-500">{formatDateID(p.date)}</span>
                                      <span className="font-bold text-emerald-600">{formatIDR(p.amount)}</span>
                                      {p.note && <span className="text-slate-400">— {p.note}</span>}
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => setPayModal({ open: true, itemId: item.id, editPayment: p })}
                                        className="p-1 text-slate-500 hover:text-[#1E1B24]"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeletePayment(item.id, p.id)}
                                        className="p-1 text-slate-400 hover:text-rose-600"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <section className="bg-white rounded-2xl border border-pink-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-pink-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#1E1B24]">Riwayat Semua Pembayaran</h2>
                <p className="text-xs text-slate-500">Diurutkan berdasarkan tanggal transaksi terbaru</p>
              </div>
              <button
                type="button"
                onClick={() => setPayModal({ open: true, itemId: enrichedItems[0]?.id || '', editPayment: null })}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-pink-500 text-white hover:bg-pink-600 transition"
              >
                <Plus className="w-4 h-4" />
                Input Pembayaran
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#FFF8FA] border-b border-pink-100 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-4">Tanggal</th>
                    <th className="py-3.5 px-4">Pos Alokasi</th>
                    <th className="py-3.5 px-4">Catatan</th>
                    <th className="py-3.5 px-4 text-right">Nominal</th>
                    <th className="py-3.5 px-4">Status Pos</th>
                    <th className="py-3.5 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pink-50 text-xs sm:text-sm">
                  {allPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-pink-50/40">
                      <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-pink-400" />
                          {formatDateID(p.date)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-[11px] font-semibold text-pink-600 uppercase">{p.category}</span>
                        <p className="font-semibold text-[#1E1B24]">{p.itemName}</p>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">{p.note || '-'}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-600">{formatIDR(p.amount)}</td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={p.itemStatus} />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setPayModal({ open: true, itemId: p.itemId, editPayment: p })}
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePayment(p.itemId, p.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>

      {/* PAYMENT MODAL */}
      {payModal.open && (
        <PaymentModal
          items={enrichedItems}
          initialItemId={payModal.itemId}
          editPayment={payModal.editPayment}
          onClose={() => setPayModal({ open: false, itemId: '', editPayment: null })}
          onSave={handleSavePayment}
        />
      )}

      {/* ITEM MODAL */}
      {itemModal.open && (
        <AllocationItemModal
          editItem={itemModal.editItem}
          onClose={() => setItemModal({ open: false, editItem: null })}
          onSave={handleSaveItem}
        />
      )}

      {/* ROOM SYNC MODAL */}
      {roomModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-pink-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-[#1E1B24]">Kode Ruang Cloud</h3>
              <button type="button" onClick={() => setRoomModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Gunakan kode ruang yang sama di semua perangkat atau browser agar data yang disimpan langsung terbaca saat dibuka/di-refresh.
            </p>
            <input
              type="text"
              value={roomInput}
              onChange={(e) => setRoomInput(e.target.value)}
              placeholder="Contoh: keluarga-open"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-pink-200 bg-[#FFF8FA] mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRoomModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  const clean = roomInput.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '');
                  if (clean) {
                    setRoomId(clean);
                    setRoomModalOpen(false);
                    showToast(`Beralih ke ruang: ${clean}`);
                  }
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#1E1B24] text-white hover:bg-pink-600"
              >
                Terapkan Ruang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL */}
      {confirmModal.open && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-pink-100">
            <h3 className="text-base font-bold text-[#1E1B24]">{confirmModal.title}</h3>
            <p className="text-sm text-slate-600 mt-2">{confirmModal.message}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmModal({ open: false })}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700"
              >
                Ya, Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PaymentModal({ items, initialItemId, editPayment, onClose, onSave }) {
  const [itemId, setItemId] = useState(initialItemId || items[0]?.id || '');
  const [amount, setAmount] = useState(editPayment ? String(editPayment.amount) : '');
  const [date, setDate] = useState(editPayment?.date || new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState(editPayment?.note || '');
  const [error, setError] = useState('');

  const selectedItem = items.find((i) => i.id === itemId);

  const handleSubmit = (e) => {
    e.preventDefault();
    const num = Number(amount);
    if (!itemId) return setError('Pilih pos tagihan terlebih dahulu.');
    if (!num || num <= 0) return setError('Nominal pembayaran harus lebih dari Rp 0.');
    if (!date) return setError('Tanggal pembayaran wajib diisi.');
    onSave(itemId, { amount: num, date, note: note.trim() }, editPayment?.id || null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-pink-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-pink-500" />
            <h3 className="text-base font-bold text-[#1E1B24]">
              {editPayment ? 'Edit Pembayaran' : 'Catat Pembayaran Baru'}
            </h3>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Pos Alokasi / Tagihan</label>
            <select
              value={itemId}
              disabled={Boolean(editPayment)}
              onChange={(e) => setItemId(e.target.value)}
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-pink-200 bg-[#FFF8FA] focus:outline-none focus:ring-2 focus:ring-pink-400"
            >
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.category} — {i.name} (Sisa: {formatIDR(i.remaining)})
                </option>
              ))}
            </select>
          </div>

          {selectedItem && !editPayment && selectedItem.remaining > 0 && (
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-pink-50 border border-pink-100 text-xs">
              <span className="text-slate-600">Sisa tagihan pos ini: <strong>{formatIDR(selectedItem.remaining)}</strong></span>
              <button
                type="button"
                onClick={() => setAmount(String(selectedItem.remaining))}
                className="font-bold text-pink-600 hover:underline"
              >
                Bayar Penuh Sisa
              </button>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Nominal Pembayaran (Rp)</label>
            <input
              type="number"
              min="1"
              step="any"
              placeholder="Contoh: 150000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-pink-200 bg-[#FFF8FA] focus:outline-none focus:ring-2 focus:ring-pink-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Tanggal Pembayaran</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-pink-200 bg-[#FFF8FA] focus:outline-none focus:ring-2 focus:ring-pink-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Catatan (Opsional)</label>
            <input
              type="text"
              placeholder="Contoh: Transfer m-banking / Top up"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-pink-200 bg-[#FFF8FA] focus:outline-none focus:ring-2 focus:ring-pink-400"
            />
          </div>

          {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}

          <div className="pt-2 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100">
              Batal
            </button>
            <button type="submit" className="px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:from-pink-600 hover:to-rose-600">
              Simpan Pembayaran
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AllocationItemModal({ editItem, onClose, onSave }) {
  const [category, setCategory] = useState(editItem?.category || '');
  const [name, setName] = useState(editItem?.name || '');
  const [target, setTarget] = useState(editItem ? String(editItem.target) : '');
  const [notes, setNotes] = useState(editItem?.notes || '');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!category.trim() || !name.trim()) return setError('Kategori dan nama pos wajib diisi.');
    if (!Number(target) || Number(target) <= 0) return setError('Target anggaran harus lebih dari Rp 0.');
    onSave({ category, name, target: Number(target), notes }, editItem?.id || null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-pink-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-pink-500" />
            <h3 className="text-base font-bold text-[#1E1B24]">
              {editItem ? 'Edit Pos Alokasi' : 'Tambah Pos Alokasi Baru'}
            </h3>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Kategori Pos</label>
            <input
              type="text"
              placeholder="Contoh: Listrik / Wi-Fi / Cicilan"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-pink-200 bg-[#FFF8FA] focus:outline-none focus:ring-2 focus:ring-pink-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Pos / Tagihan</label>
            <input
              type="text"
              placeholder="Contoh: Wi-Fi Rumah Bulanan"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-pink-200 bg-[#FFF8FA] focus:outline-none focus:ring-2 focus:ring-pink-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Target Anggaran (Rp)</label>
            <input
              type="number"
              min="1"
              placeholder="Contoh: 350000"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-pink-200 bg-[#FFF8FA] focus:outline-none focus:ring-2 focus:ring-pink-400"
            />
          </div>

          {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}

          <div className="pt-2 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100">
              Batal
            </button>
            <button type="submit" className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#1E1B24] text-white hover:bg-pink-600">
              Simpan Pos
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}