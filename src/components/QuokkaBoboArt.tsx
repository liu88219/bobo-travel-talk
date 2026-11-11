import React from 'react';

const FUR = '#C99661';
const FUR_ARM = '#9C6B3B';
const INK = '#171210';
const BOBO_WHITE = '#FFFFFF';
const STOOL_TOP = '#6C4C2E';
const STOOL_LEG = '#785634';
const BUTTER = '#F2CA62';
const RED_STAMP = '#C83D33';

/**
 * Header 雙吉祥物徽章：100% 對齊韓國 Dinotaeng V2 黃金標準 (quokka_bobo_v2_gold_standard.png)
 * - 帶乾粉彩毛邊濾鏡 (feTurbulence + feDisplacementMap)
 * - 左：裸身焦糖矮袋鼠 Quokka（雙耳 V 字微靠無深色耳溝線、小圓眼間距偏近、圓潤黑豆鼻、100% 無嘴巴、小黑手捧紅護照與奶油黃登機證、外八黑腳掌）
 * - 中：微笑棉花糖 Marsh 疊疊樂
 * - 右：坐在深棕木頭矮凳上的純白無邊框雲朵 BOBO（小巧耳突起、圓黑眼＋一筆連貫黑鼻頭 ω 微笑嘴、舉手拿復古小麥克風）
 */
export const QuokkaBoboTravelBadge: React.FC<{
  className?: string;
  recording?: boolean;
}> = ({ className = 'w-12 h-10', recording = false }) => {
  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-2xl border border-[#DDD7C9] bg-[#D8D3C5] overflow-hidden shadow-sm select-none shrink-0 ${className}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 136 102" className="w-full h-full">
        <defs>
          <filter id="bobo-pastel-edge" x="-8%" y="-8%" width="116%" height="116%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.45"
              numOctaves="3"
              seed="7"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="2.1"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>

        <rect width="136" height="102" fill="#D8D3C5" />

        {/* Recording pulse ring when active */}
        {recording && (
          <circle
            cx="104"
            cy="42"
            r="26"
            fill="none"
            stroke={RED_STAMP}
            strokeWidth="2.5"
            strokeDasharray="4 3"
            opacity="0.75"
          />
        )}

        {/* ==================== LEFT: QUOKKA (100% Bare Caramel Fur, Lumpy Pear Silhouette, Mouthless) ==================== */}
        <g filter="url(#bobo-pastel-edge)">
          {/* Authentic lumpy pear silhouette with ears meeting at V-notch (36, 21) and zero internal ear stroke */}
          <path
            d="M 28 30
               C 16 30 13 12 24 11
               C 31 11 35 17 36 21
               C 37 17 41 11 48 11
               C 59 12 56 30 44 30
               C 55 34 57 46 52 53
               C 58 61 61 78 58 91
               C 52 96 20 96 14 91
               C 11 78 14 61 20 53
               C 15 46 17 34 28 30 Z"
            fill={FUR}
          />
        </g>

        {/* Close-set tiny hand-drawn black dot eyes */}
        <circle cx="31.5" cy="35" r="2.2" fill={INK} />
        <circle cx="40.5" cy="35" r="2.2" fill={INK} />

        {/* Chunky round-oval black bean nose (strictly mouthless!) */}
        <ellipse cx="36" cy="45" rx="5.1" ry="6" fill={INK} />

        {/* Outward-angled flat black foot pads (\ /) */}
        <rect
          x="19"
          y="80"
          width="5.6"
          height="15"
          rx="2.8"
          transform="rotate(-17 21.8 87.5)"
          fill={INK}
        />
        <rect
          x="48"
          y="80"
          width="5.6"
          height="15"
          rx="2.8"
          transform="rotate(19 50.8 87.5)"
          fill={INK}
        />

        {/* Vintage red Passport + Butter Yellow Boarding Pass on Quokka's chest */}
        <g transform="rotate(-7 36 67)">
          {/* Butter yellow boarding pass slip peeking out */}
          <rect
            x="29.5"
            y="54.5"
            width="12"
            height="10"
            rx="1.8"
            fill={BUTTER}
          />
          {/* Vintage red passport cover */}
          <rect
            x="27.5"
            y="59"
            width="16"
            height="19.5"
            rx="2.4"
            fill={RED_STAMP}
          />
          {/* Minimalist cream globe emblem */}
          <circle
            cx="35.5"
            cy="68.8"
            r="3.8"
            fill="none"
            stroke="#FAF8F3"
            strokeWidth="1.1"
          />
          <ellipse
            cx="35.5"
            cy="68.8"
            rx="1.8"
            ry="3.8"
            fill="none"
            stroke="#FAF8F3"
            strokeWidth="0.9"
          />
          <line
            x1="31.7"
            y1="68.8"
            x2="39.3"
            y2="68.8"
            stroke="#FAF8F3"
            strokeWidth="0.9"
          />
        </g>

        {/* Short gentle brown arm curves + tiny black mitten paws holding passport */}
        <path
          d="M 21 63 Q 24 65 27 67"
          stroke={FUR_ARM}
          strokeWidth="1.9"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M 51 62 Q 48 64 44 66"
          stroke={FUR_ARM}
          strokeWidth="1.9"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="27.5" cy="68" r="3.4" fill={INK} />
        <circle cx="44" cy="66.5" r="3.4" fill={INK} />

        {/* ==================== CENTER: MARSHMALLOW TOWER ==================== */}
        <g filter="url(#bobo-pastel-edge)">
          <rect x="64" y="81" width="12" height="11" rx="2.5" fill={BOBO_WHITE} />
          <rect x="64.5" y="71" width="11" height="10.5" rx="2.4" fill={BOBO_WHITE} />
          <rect x="64" y="61" width="11.5" height="10.5" rx="2.4" fill={BOBO_WHITE} />
        </g>
        {/* Tiny Marsh smiley faces */}
        <circle cx="68.2" cy="65.5" r="0.9" fill={INK} />
        <circle cx="71.4" cy="65.5" r="0.9" fill={INK} />
        <path
          d="M 67.6 67.5 Q 69.8 69.4 72 67.5"
          fill="none"
          stroke={INK}
          strokeWidth="1.1"
          strokeLinecap="round"
        />
        <circle cx="68.4" cy="85.5" r="0.9" fill={INK} />
        <circle cx="71.6" cy="85.5" r="0.9" fill={INK} />
        <path
          d="M 67.8 87.5 Q 70 89.4 72.2 87.5"
          fill="none"
          stroke={INK}
          strokeWidth="1.1"
          strokeLinecap="round"
        />

        {/* ==================== RIGHT: WOODEN STOOL & BORDERLESS CLOUD BOBO ==================== */}
        <g filter="url(#bobo-pastel-edge)">
          {/* Brown wooden stool */}
          <rect x="83" y="72" width="42" height="6.2" rx="2.2" fill={STOOL_TOP} />
          <rect x="87" y="77" width="6.5" height="17" rx="1.6" fill={STOOL_LEG} />
          <rect x="114.5" y="77" width="6.5" height="17" rx="1.6" fill={STOOL_LEG} />

          {/* Pure white borderless cloud BOBO body with small top ear-bumps (ZERO gray arm strokes) */}
          <path
            d="M 94 33
               C 86 32 85 21 92 21
               C 96 21 98 25 99 27
               C 101 26 105 26 107 27
               C 108 25 110 21 114 21
               C 121 21 120 32 112 33
               C 120 38 122 47 119 55
               C 124 58 125 65 119 69
               C 117 73 109 75 104 74
               C 99 75 90 74 89 69
               C 87 63 88 57 89 53
               C 82 49 78 42 82 37
               C 85 34 90 38 94 33 Z"
            fill={BOBO_WHITE}
          />
        </g>

        {/* Retro handheld microphone in BOBO's raised left paw */}
        <g transform="rotate(-18 81 36)">
          <rect x="78.5" y="34" width="4.4" height="11" rx="2" fill={BUTTER} />
          <circle cx="80.7" cy="31.5" r="4.3" fill={RED_STAMP} />
          <line
            x1="76.8"
            y1="31.5"
            x2="84.6"
            y2="31.5"
            stroke={BUTTER}
            strokeWidth="1.1"
          />
        </g>

        {/* BOBO face: two round black dot eyes + connected black nose tip & upturned ω smile */}
        <circle cx="98.5" cy="41.5" r="2.1" fill={INK} />
        <circle cx="107.5" cy="41.5" r="2.1" fill={INK} />
        <ellipse cx="103" cy="46.5" rx="2.1" ry="1.5" fill={INK} />
        <path
          d="M 103 46.8 L 103 49.4 M 98.3 49.2 Q 100.6 52.3 103 49.4 Q 105.4 52.3 107.7 49.2"
          fill="none"
          stroke={INK}
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

/**
 * 頁首旅行橫幅插畫：正宗韓系 Dinotaeng V2 油性粉彩質感 (hero-bobo-travel.webp)
 */
export const HeroTravelBanner: React.FC<{ className?: string }> = ({
  className = 'w-36 h-24',
}) => {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-[#DDD7C9] bg-[#D8D3C5] shadow-sm select-none shrink-0 ${className}`}
      aria-hidden="true"
    >
      <img
        src="./assets/hero-bobo-travel.webp?v=3"
        alt="Quokka & BOBO 出國旅行翻譯小幫手"
        loading="eager"
        decoding="async"
        className="w-full h-full object-cover object-center"
      />
    </div>
  );
};
