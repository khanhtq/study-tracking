import React, { useState } from 'react';
import { Flame, User, Mail, MapPin, Heart, Copy, Check, QrCode } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function Footer() {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const bankStk = '0946931005';
  const bankName = 'MB Bank';
  const accountHolder = 'TRAN QUOC KHANH';

  const handleCopyStk = () => {
    navigator.clipboard.writeText(bankStk);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <footer className="border-t border-slate-800 bg-slate-950/90 backdrop-blur-md pt-10 pb-8 mt-20 relative z-10 text-slate-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pb-8 border-b border-slate-800/80">
          
          {/* Brand Column */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-slate-100 font-bold text-lg">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner">
                <Flame className="w-5 h-5 text-indigo-500" />
              </div>
              <span>Study XP Tracker</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t('footer_copyright') || 'Ứng dụng gamification hỗ trợ theo dõi thời gian học tập, thăng cấp XP và duy trì thói quen học tập hiệu quả.'}
            </p>
          </div>

          {/* Author Details Column */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              <span>{t('footer_author_title') || 'Thông tin tác giả'}</span>
            </h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-2 text-slate-300">
                <span className="text-slate-500 font-medium">{t('footer_author_name') || 'Tác giả'}:</span>
                <span className="font-semibold text-slate-200">Tran Quoc Khanh</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="text-slate-500 font-medium">{t('footer_contact_email') || 'Email liên hệ'}:</span>
                <a 
                  href="mailto:trankhanh0525@gmail.com" 
                  className="text-slate-300 hover:text-indigo-400 transition-colors underline decoration-slate-700 underline-offset-2"
                >
                  trankhanh0525@gmail.com
                </a>
              </li>
            </ul>
          </div>

          {/* Address Column */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              <span>{t('footer_address') || 'Địa chỉ'}</span>
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed flex items-start gap-2">
              <MapPin className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <span>10/41A, Au Duong Lan St, Chanh Hung ward, Ho Chi Minh City</span>
            </p>
          </div>

          {/* Donate / Support Column */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500/20" />
              <span>{t('footer_donate_title') || 'Ủng hộ phát triển'}</span>
            </h4>
            
            <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2.5 shadow-sm">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-200 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  {bankName}
                </span>
                <button
                  type="button"
                  onClick={() => setShowQr(!showQr)}
                  className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                  title="Xem mã QR chuyển khoản"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>{showQr ? 'Ẩn QR' : 'Mã QR'}</span>
                </button>
              </div>

              {/* QR Dropdown/Modal preview */}
              {showQr && (
                <div className="p-2 rounded-xl bg-white flex flex-col items-center justify-center gap-1 shadow-inner">
                  <img
                    src={`https://img.vietqr.io/image/MB-${bankStk}-compact.png?amount=0&addInfo=Ung%20ho%20Study%20XP%20Tracker&accountName=${encodeURIComponent(accountHolder)}`}
                    alt="VietQR MB Bank"
                    className="w-36 h-36 object-contain"
                  />
                  <span className="text-[10px] font-bold text-slate-900">Quét mã VietQR</span>
                </div>
              )}

              {/* Bank Account Info */}
              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">{t('footer_bank_acc') || 'STK'}:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-slate-100 tracking-wider select-all">{bankStk}</span>
                    <button
                      onClick={handleCopyStk}
                      className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
                      title={copied ? t('footer_copied_stk') : "Sao chép STK"}
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">{t('footer_bank_holder') || 'Chủ TK'}:</span>
                  <span className="font-semibold text-slate-200 text-[11px]">{accountHolder}</span>
                </div>
              </div>

              <p className="text-[10px] text-slate-500 leading-tight pt-1 border-t border-slate-800/80">
                {t('footer_donate_desc') || 'Mọi sự đóng góp đều là nguồn động lực to lớn giúp duy trì máy chủ và phát triển tính năng mới.'}
              </p>
            </div>
          </div>

        </div>

        {/* Bottom copyright */}
        <div className="pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-500">
          <p>© 2026 Study XP Tracker. All rights reserved.</p>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Created by <strong className="text-slate-300">Tran Quoc Khanh</strong></span>
          </div>
        </div>
      </div>
    </footer>
  );
}
