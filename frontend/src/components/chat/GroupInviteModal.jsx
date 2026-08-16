import React, { useState, useEffect } from 'react';
import { communityChatApi } from '../../api';
import { useLanguage } from '../../context/LanguageContext';
import { X, Link2, Copy, Check, Plus, Trash2, Clock, ShieldCheck, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function GroupInviteModal({ groupId, isOpen, onClose }) {
  const { t } = useLanguage();
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [maxUses, setMaxUses] = useState(50);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    if (isOpen && groupId) {
      loadInvites();
    }
  }, [isOpen, groupId]);

  const loadInvites = async () => {
    try {
      setLoading(true);
      const res = await communityChatApi.getInviteLinks(groupId);
      setInvites(res || []);
    } catch (err) {
      console.error('Lỗi tải danh sách link mời:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvite = async () => {
    try {
      setCreating(true);
      const payload = {
        expiresInDays: expiresInDays > 0 ? expiresInDays : null,
        maxUses: maxUses > 0 ? maxUses : null,
      };
      await communityChatApi.createInviteLink(groupId, payload);
      await loadInvites();
    } catch (err) {
      console.error('Lỗi tạo link mời:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (inviteId) => {
    try {
      await communityChatApi.revokeInviteLink(groupId, inviteId);
      setInvites(prev => prev.filter(i => i.id !== inviteId));
    } catch (err) {
      console.error('Lỗi thu hồi link mời:', err);
    }
  };

  const handleCopyLink = (invite) => {
    const origin = window.location.origin;
    const url = `${origin}/join/${invite.code}`;
    navigator.clipboard.writeText(url);
    setCopiedId(invite.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/40">
            <div className="flex items-center gap-2.5">
              <Link2 className="w-5 h-5 text-indigo-400" />
              <h3 className="text-sm font-bold text-slate-100">{t('invite_link')}</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Create new invite section */}
          <div className="p-4 border-b border-slate-800 bg-slate-950/20 space-y-3">
            <div className="text-xs font-semibold text-slate-300">{t('create_invite_link')}</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 mb-1 block">Thời hạn</label>
                <select
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(Number(e.target.value))}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50"
                >
                  <option value={1}>1 ngày</option>
                  <option value={7}>7 ngày</option>
                  <option value={30}>30 ngày</option>
                  <option value={0}>Vô thời hạn</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] text-slate-400 mb-1 block">Số lượt dùng tối đa</label>
                <select
                  value={maxUses}
                  onChange={(e) => setMaxUses(Number(e.target.value))}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50"
                >
                  <option value={10}>10 lượt</option>
                  <option value={50}>50 lượt</option>
                  <option value={100}>100 lượt</option>
                  <option value={0}>Không giới hạn</option>
                </select>
              </div>
            </div>
            <button
              onClick={handleCreateInvite}
              disabled={creating}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50"
            >
              {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span>{t('create_invite_link')}</span>
            </button>
          </div>

          {/* Active invites list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5 min-h-[200px]">
            <div className="text-xs font-semibold text-slate-400 mb-2">Link mời đang hoạt động</div>
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
              </div>
            ) : invites.length === 0 ? (
              <div className="text-center text-xs text-slate-500 py-8">
                Chưa có link mời nào. Hãy tạo link mời ở trên để chia sẻ cho bạn bè!
              </div>
            ) : (
              invites.map((invite) => {
                const isCopied = copiedId === invite.id;
                return (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800 hover:border-slate-700 transition-all"
                  >
                    <div className="space-y-1 overflow-hidden pr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-indigo-400 tracking-wider">{invite.code}</span>
                        {invite.expiresAt && (
                          <span className="flex items-center gap-1 text-[10px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md">
                            <Clock className="w-2.5 h-2.5" />
                            {new Date(invite.expiresAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        Đã dùng: <span className="text-slate-200 font-semibold">{invite.usedCount}</span> / {invite.maxUses || '∞'}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => handleCopyLink(invite)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          isCopied
                            ? 'bg-emerald-600 text-white'
                            : 'bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600 hover:text-white'
                        }`}
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{isCopied ? t('copied') : t('copy_link')}</span>
                      </button>
                      <button
                        onClick={() => handleRevoke(invite.id)}
                        className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Thu hồi link"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
