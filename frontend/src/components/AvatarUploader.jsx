import React, { useState } from 'react';
import { Upload, User, RefreshCw, X, Check } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const PRESET_NAMES = {
  wizard: { en: "Wisdom Wizard", vi: "Pháp Sư Tri Thức", zh: "智慧法师" },
  knight: { en: "Focus Knight", vi: "Hiệp Sĩ Tập Trung", zh: "专注骑士" },
  owl: { en: "Night Owl Scholar", vi: "Cú Đêm Học Nốt", zh: "夜猫学霸" },
  cat_gamer: { en: "Academic Cat", vi: "Mèo Học Thuật", zh: "学术猫" },
  ninja: { en: "Pomodoro Ninja", vi: "Ninja Pomodoro", zh: "番茄忍者" },
  fox_reader: { en: "Scholar Fox", vi: "Cáo Đọc Sách", zh: "学者狐" },
  cyber_student: { en: "Cyber Student", vi: "Cyberpunk Scholar", zh: "赛博学生" },
  astro_pup: { en: "Astro XP", vi: "Phi Hành Gia XP", zh: "XP 宇航员" },
  dragon_master: { en: "Spirit Dragon Master", vi: "Chủ Nhân Linh Thú", zh: "灵兽驯养师" },
  smart_bear: { en: "Wise Bear", vi: "Gấu Thông Thái", zh: "智慧熊" },
  anime_sage: { en: "Anime Sage", vi: "Hiền Triết Anime", zh: "动漫贤者" },
  pioneer: { en: "Study Pioneer", vi: "Tiên Phong Học Tập", zh: "学习先锋" },
};

const CARTOON_PRESETS = [
  { id: 'wizard', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=WizardMind&backgroundColor=b6e3f4' },
  { id: 'knight', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=FocusKnight&backgroundColor=ffdfbf' },
  { id: 'owl', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=NightOwlStudy&backgroundColor=c0aede' },
  { id: 'cat_gamer', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=GamerCat&backgroundColor=ffd5dc' },
  { id: 'ninja', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=PomoNinja&backgroundColor=d1d4f9' },
  { id: 'fox_reader', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=FoxScholar&backgroundColor=b6e3f4' },
  { id: 'cyber_student', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=CyberStudent&backgroundColor=ffdfbf' },
  { id: 'astro_pup', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=AstroXP&backgroundColor=c0aede' },
  { id: 'dragon_master', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=DragonScholar&backgroundColor=d1d4f9' },
  { id: 'smart_bear', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=SmartBear&backgroundColor=ffd5dc' },
  { id: 'anime_sage', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=AnimeSage&backgroundColor=b6e3f4' },
  { id: 'pioneer', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=PioneerXP&backgroundColor=ffdfbf' },
];

const DICEBEAR_STYLES = [
  { id: 'adventurer' },
  { id: 'bottts' },
  { id: 'lorelei' },
  { id: 'avataaars' },
];

const DICEBEAR_NAMES = {
  adventurer: { en: "Adventurer", vi: "Phiêu Lưu (Adventurer)", zh: "冒险家" },
  bottts: { en: "Cartoon Robot (Bottts)", vi: "Robot Hoạt Hình (Bottts)", zh: "卡通机器人" },
  lorelei: { en: "Anime / Manga (Lorelei)", vi: "Anime / Manga (Lorelei)", zh: "动漫 / 漫画" },
  avataaars: { en: "Modern Avatars (Avataaars)", vi: "Giao Diện Hiện Đại (Avataaars)", zh: "现代头像" },
};

export default function AvatarUploader({ currentAvatarUrl, onUploadFile, onSelectPreset, isLoading }) {
  const { language, t } = useLanguage();
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'preset' | 'dicebear'
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [diceStyle, setDiceStyle] = useState('adventurer');
  const [diceSeed, setDiceSeed] = useState('StudyXP_' + Math.floor(Math.random() * 1000));
  const [dragActive, setDragActive] = useState(false);

  // Compress image on client canvas before sending
  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 400;
          const MAX_HEIGHT = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            },
            'image/jpeg',
            0.85
          );
        };
      };
    });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      const compressed = await compressImage(file);
      setSelectedFile(compressed);
      setPreviewUrl(URL.createObjectURL(compressed));
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const compressed = await compressImage(file);
      setSelectedFile(compressed);
      setPreviewUrl(URL.createObjectURL(compressed));
    }
  };

  const handleConfirmUpload = () => {
    if (selectedFile) {
      onUploadFile(selectedFile);
    }
  };

  const generateRandomSeed = () => {
    setDiceSeed('StudyXP_' + Math.floor(Math.random() * 10000));
  };

  const diceBearUrl = `https://api.dicebear.com/7.x/${diceStyle}/svg?seed=${encodeURIComponent(diceSeed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;

  const getFullAvatarUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    const backendOrigin = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:8080';
    return `${backendOrigin}${url}`;
  };

  const displayAvatar = previewUrl || getFullAvatarUrl(currentAvatarUrl);

  return (
    <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-3xl p-6 shadow-xl">
      <div className="flex flex-col md:flex-row items-center gap-6 mb-6">
        {/* Avatar Display Frame */}
        <div className="relative group">
          <div className="w-28 h-28 rounded-full ring-4 ring-indigo-500/30 p-1 bg-slate-950 overflow-hidden shadow-2xl flex items-center justify-center">
            {displayAvatar ? (
              <img
                src={displayAvatar}
                alt="Avatar"
                className="w-full h-full object-cover rounded-full"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = `https://api.dicebear.com/7.x/bottts/svg?seed=UserFallback`;
                }}
              />
            ) : (
              <div className="w-full h-full rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white">
                <User className="w-12 h-12" />
              </div>
            )}
          </div>
          {previewUrl && (
            <button
              onClick={() => {
                setPreviewUrl(null);
                setSelectedFile(null);
              }}
              className="absolute -top-1 -right-1 bg-rose-500 hover:bg-rose-600 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-md transition-all cursor-pointer"
              title={t('avatar_cancel_tooltip')}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex-1 text-center md:text-left">
          <h3 className="text-lg font-bold text-slate-100 mb-1">{t('avatar_title')}</h3>
          <p className="text-slate-400 text-sm mb-3">
            {t('avatar_desc')}
          </p>

          {/* Navigation Tabs */}
          <div className="inline-flex p-1 bg-slate-950 border border-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              {t('avatar_tab_upload')}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preset')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'preset'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              {t('avatar_tab_preset')}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('dicebear')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'dicebear'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              {t('avatar_tab_generator')}
            </button>
          </div>
        </div>
      </div>

      {/* Tab 1: Upload File */}
      {activeTab === 'upload' && (
        <div className="space-y-4">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
              dragActive
                ? 'border-indigo-500 bg-indigo-500/10'
                : 'border-slate-800 hover:border-slate-600 bg-slate-950/50'
            }`}
          >
            <input
              type="file"
              id="avatar-file-input"
              accept="image/png, image/jpeg, image/webp, image/gif"
              onChange={handleFileChange}
              className="hidden"
            />
            <label htmlFor="avatar-file-input" className="cursor-pointer flex flex-col items-center justify-center">
              <Upload className="w-8 h-8 text-indigo-500 mb-2" />
              <p className="text-slate-100 text-sm font-semibold">
                {selectedFile ? selectedFile.name : t('avatar_drag_drop')}
              </p>
              <p className="text-slate-400 text-xs mt-1">
                {t('avatar_support_formats')}
              </p>
            </label>
          </div>

          {selectedFile && (
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  setPreviewUrl(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-slate-100 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all cursor-pointer"
              >
                {t('avatar_btn_cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmUpload}
                disabled={isLoading}
                className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {isLoading ? t('profile_saving') : t('avatar_btn_save')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Cartoon RPG Presets */}
      {activeTab === 'preset' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-400">{t('avatar_preset_subtitle')}</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {CARTOON_PRESETS.map((preset) => {
              const presetName = PRESET_NAMES[preset.id]?.[language] || PRESET_NAMES[preset.id]?.['en'] || preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onSelectPreset(preset.url)}
                  disabled={isLoading}
                  className="group relative p-2 bg-slate-950/60 hover:bg-indigo-950/40 border border-slate-800 hover:border-indigo-500/60 rounded-2xl transition-all flex flex-col items-center gap-1.5 text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <div className="w-14 h-14 rounded-full overflow-hidden bg-slate-950 p-0.5 border border-slate-800 group-hover:scale-105 transition-transform">
                    <img src={preset.url} alt={presetName} className="w-full h-full object-cover rounded-full" />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-300 group-hover:text-indigo-400 line-clamp-1">
                    {presetName}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 3: DiceBear Random Generator */}
      {activeTab === 'dicebear' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">{t('avatar_gen_style')}</label>
              <select
                value={diceStyle}
                onChange={(e) => setDiceStyle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {DICEBEAR_STYLES.map((style) => {
                  const styleName = DICEBEAR_NAMES[style.id]?.[language] || DICEBEAR_NAMES[style.id]?.['en'] || style.id;
                  return (
                    <option key={style.id} value={style.id}>
                      {styleName}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">{t('avatar_gen_seed')}</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={diceSeed}
                  onChange={(e) => setDiceSeed(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={generateRandomSeed}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5"
                  title={t('avatar_gen_btn')}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{t('avatar_gen_btn')}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-3">
              <img src={diceBearUrl} alt="Generated Avatar" className="w-12 h-12 rounded-full bg-slate-950 border border-slate-800" />
              <span className="text-xs text-slate-300 font-medium">{t('avatar_gen_preview')}</span>
            </div>
            <button
              type="button"
              onClick={() => onSelectPreset(diceBearUrl)}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg transition-all cursor-pointer"
            >
              {t('avatar_gen_use')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
