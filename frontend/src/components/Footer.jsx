import React from 'react';
import { Flame, User, Mail, MapPin } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="border-t border-slate-900 bg-slate-950/90 backdrop-blur-md pt-10 pb-8 mt-20 relative z-10 text-slate-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-8 border-b border-slate-900/80">
          
          {/* Brand Column */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-slate-100 font-bold text-lg">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner">
                <Flame className="w-5 h-5 text-indigo-500" />
              </div>
              <span>Study XP Tracker</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              {t('footer_copyright') || 'Gamified learning application to track study hours, level up XP, and build long-term study habits.'}
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
