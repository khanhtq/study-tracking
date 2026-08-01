import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api';
import { Plus, Edit2, Trash2, CheckCircle2, XCircle, Tag, Clock, CreditCard, RefreshCw, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminPaymentPackages() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modal State for Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    priceVnd: 20000,
    durationDays: 30,
    tagName: '',
    isActive: true,
  });
  const [saving, setSaving] = useState(false);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const data = await adminApi.getPackages();
      setPackages(data || []);
    } catch (err) {
      console.error('Lỗi tải danh sách gói thanh toán:', err);
      setErrorMsg('Không thể tải danh sách gói cước từ hệ thống.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingPackage(null);
    setFormData({
      id: '',
      name: '',
      priceVnd: 20000,
      durationDays: 30,
      tagName: '',
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (pkg) => {
    setEditingPackage(pkg);
    setFormData({
      id: pkg.id,
      name: pkg.name,
      priceVnd: pkg.priceVnd,
      durationDays: pkg.durationDays,
      tagName: pkg.tagName || '',
      isActive: pkg.isActive,
    });
    setIsModalOpen(true);
  };

  const handleToggleActive = async (pkg) => {
    try {
      const updated = { ...pkg, isActive: !pkg.isActive };
      await adminApi.updatePackage(pkg.id, updated);
      setSuccessMsg(`Đã ${!pkg.isActive ? 'kích hoạt' : 'ẩn'} gói ${pkg.name}`);
      fetchPackages();
    } catch (err) {
      console.error('Lỗi đổi trạng thái gói:', err);
      setErrorMsg('Lỗi cập nhật trạng thái gói.');
    }
  };

  const handleDeletePackage = async (id, name) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa hẳn gói "${name}"?`)) return;
    try {
      await adminApi.deletePackage(id);
      setSuccessMsg(`Đã xóa gói ${name}`);
      fetchPackages();
    } catch (err) {
      console.error('Lỗi xóa gói cước:', err);
      setErrorMsg('Không thể xóa gói cước này.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.priceVnd || !formData.durationDays) {
      setErrorMsg('Vui lòng điền đầy đủ các thông tin bắt buộc.');
      return;
    }
    try {
      setSaving(true);
      setErrorMsg('');
      if (editingPackage) {
        await adminApi.updatePackage(editingPackage.id, formData);
        setSuccessMsg(`Đã cập nhật gói ${formData.name}`);
      } else {
        await adminApi.createPackage(formData);
        setSuccessMsg(`Đã tạo gói mới ${formData.name}`);
      }
      setIsModalOpen(false);
      fetchPackages();
    } catch (err) {
      console.error('Lỗi lưu thông tin gói cước:', err);
      setErrorMsg('Lưu thông tin thất bại. Vui lòng kiểm tra lại mã gói trùng lặp.');
    } finally {
      setSaving(false);
    }
  };

  const formatVnd = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel rounded-3xl p-6 border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-400" />
            Quản Lý Gói Thanh Toán VIP
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Điều chỉnh giá tiền, số ngày sử dụng, nhãn khuyến mãi hoặc thêm/bớt các gói cước VIP Premium.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchPackages}
            className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
            title="Tải lại danh sách"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Thêm Gói VIP Mới
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-2xl text-xs flex justify-between items-center shadow-lg">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-400 font-bold ml-2 cursor-pointer">✕</button>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 px-4 py-3 rounded-2xl text-xs flex justify-between items-center shadow-lg">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} className="text-rose-400 font-bold ml-2 cursor-pointer">✕</button>
        </div>
      )}

      {/* Package Grid Cards */}
      {loading ? (
        <div className="flex items-center justify-center p-12 glass-panel rounded-3xl border border-slate-800">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
        </div>
      ) : packages.length === 0 ? (
        <div className="glass-panel rounded-3xl p-8 text-center text-slate-400 border border-slate-800">
          Chưa có gói cước nào trong hệ thống. Bấm nút "Thêm Gói VIP Mới" để tạo gói đầu tiên!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packages.map((pkg) => (
            <motion.div
              key={pkg.id}
              layout
              className={`glass-panel rounded-3xl p-6 border transition-all flex flex-col justify-between relative overflow-hidden ${
                pkg.isActive
                  ? 'border-slate-800 hover:border-indigo-500/40 bg-slate-900/40'
                  : 'border-slate-800/40 bg-slate-950/60 opacity-65'
              }`}
            >
              {/* Top Tag & Status */}
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full font-semibold">
                  ID: {pkg.id}
                </span>

                <div className="flex items-center gap-2">
                  {pkg.tagName && (
                    <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-xs font-bold flex items-center gap-1">
                      <Tag className="w-3 h-3 text-amber-400" />
                      {pkg.tagName}
                    </span>
                  )}
                  <button
                    onClick={() => handleToggleActive(pkg)}
                    className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                      pkg.isActive
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                    }`}
                    title={pkg.isActive ? 'Đang hoạt động (Bấm để ẩn)' : 'Đã ẩn (Bấm để bật)'}
                  >
                    {pkg.isActive ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" /> Active
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3 h-3" /> Disabled
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Package Content */}
              <div className="space-y-3 mb-6">
                <h3 className="text-lg font-bold text-white tracking-tight">{pkg.name}</h3>

                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-purple-300 to-amber-300">
                    {formatVnd(pkg.priceVnd)}
                  </span>
                  <span className="text-xs text-slate-400">/ {pkg.durationDays} ngày</span>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-400 pt-2 border-t border-slate-800/80">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  <span>Thời hạn kích hoạt VIP: <b>{pkg.durationDays} ngày</b></span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-4 border-t border-slate-800/80">
                <button
                  onClick={() => handleOpenEditModal(pkg)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5 text-indigo-400" />
                  Sửa Giá & Chi Tiết
                </button>

                <button
                  onClick={() => handleDeletePackage(pkg.id, pkg.name)}
                  className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all cursor-pointer"
                  title="Xóa gói này"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal Create / Edit Package */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-panel w-full max-w-md rounded-3xl p-6 border border-indigo-500/30 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-indigo-400" />
                  {editingPackage ? 'Chỉnh Sửa Gói VIP' : 'Thêm Gói VIP Mới'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-white font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Mã Gói (ID)</label>
                  <input
                    type="text"
                    disabled={!!editingPackage}
                    value={formData.id}
                    onChange={(e) => setFormData({ ...formData, id: e.target.value.toUpperCase() })}
                    placeholder="VD: 1_MONTH, 6_MONTHS..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 disabled:opacity-50 font-mono"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Mã định danh duy nhất (VD: 1_MONTH, 3_MONTHS, 1_YEAR).</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Tên Hiển Thị Gói *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="VD: Gói VIP Premium 1 Tháng"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Giá Tiền (VNĐ) *</label>
                    <input
                      type="number"
                      min="1000"
                      step="1000"
                      required
                      value={formData.priceVnd}
                      onChange={(e) => setFormData({ ...formData, priceVnd: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Thời Hạn (Ngày) *</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={formData.durationDays}
                      onChange={(e) => setFormData({ ...formData, durationDays: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Nhãn Khuyến Mãi (Tuỳ chọn)</label>
                  <input
                    type="text"
                    value={formData.tagName}
                    onChange={(e) => setFormData({ ...formData, tagName: e.target.value })}
                    placeholder="VD: Phổ biến 🔥, Tiết kiệm 25% ⚡"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="isActiveCheck"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-800 cursor-pointer"
                  />
                  <label htmlFor="isActiveCheck" className="text-xs text-slate-300 font-semibold cursor-pointer">
                    Cho phép hiển thị & thanh toán gói này (Active)
                  </label>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                  >
                    Hủy
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{editingPackage ? 'Lưu Thay Đổi' : 'Tạo Gói Mới'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
