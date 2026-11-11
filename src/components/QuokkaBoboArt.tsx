import React, { useId } from 'react';

const FUR = '#C99661';
const INK = '#171210';
const BOBO_WHITE = '#FFFFFF';
const WOOD_STOOL = '#785634';
const CUP_RED = '#C83D33';
const BUTTER = '#F2CA62';

function CrayonFilterDef({ id, scale = 1.9 }: { id: string; scale?: number }) {
  return (
    <defs>
      <filter id={id} x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.62"
          numOctaves="4"
          seed="7"
          result="noise"
        />
        <feDisplacementMap
          in="SourceGraphic"
          in2="noise"
          scale={Math.min(2.1, scale)}
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
    </defs>
  );
}

/**
 * 99% Gold-Standard Dinotaeng Hero Illustration Banner (Quokka holding passport & ticket + BOBO on wooden stool holding retro mic + Marsh)
 */
export const HeroTravelBanner: React.FC<{
  className?: string;
}> = ({ className = 'w-32 h-22' }) => {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-[#DDD7C9] bg-[#D5D0C3] shadow-sm select-none shrink-0 ${className}`}
      aria-hidden="true"
    >
      <img
        src="./assets/hero-bobo-travel.webp?v=1"
        alt="Quokka & BOBO Travel Translator"
        loading="eager"
        decoding="async"
        className="w-full h-full object-cover object-center"
      />
    </div>
  );
};

/**
 * 99% Gold-Standard Vector Crayon Mini Mascot Duo Badge (100% borderless crayon texture, mouthless Quokka + ω smile BOBO)
 */
export const QuokkaBoboTravelBadge: React.FC<{
  recording?: boolean;
  className?: string;
}> = ({ recording = false, className = 'w-14 h-12' }) => {
  const rawId = useId().replace(/:/g, '');
  const filterId = `dt-travel-${rawId}`;

  return (
    <svg
      viewBox="0 0 120 96"
      className={`select-none shrink-0 ${className}`}
      aria-hidden="true"
    >
      <CrayonFilterDef id={filterId} scale={1.9} />
      <rect width="120" height="96" rx="22" fill="#D8D3C5" />
      {recording && (
        <circle
          cx="88"
          cy="24"
          r="10"
          fill={CUP_RED}
          opacity="0.22"
          className="animate-ping"
        />
      )}
      <g filter={`url(#${filterId})`}>
        {/* Bare Caramel Quokka continuous mochi head+body silhouette with close-set crown ears */}
        <path
          d="M 36 27
             C 32 15, 18 18, 21 31
             C 15 38, 14 53, 20 62
             C 17 72, 18 84, 25 87
             C 32 89, 43 89, 50 87
             C 57 84, 56 72, 52 62
             C 58 53, 57 38, 51 31
             C 54 18, 40 15, 36 27 Z"
          fill={FUR}
        />
        <circle cx="31.5" cy="37.5" r="2.1" fill={INK} />
        <circle cx="40.5" cy="37.5" r="2.1" fill={INK} />
        <ellipse cx="36" cy="46" rx="4.6" ry="5.5" fill={INK} />
        {/* Vintage red passport & butter yellow boarding pass */}
        <rect x="29" y="57" width="14" height="17" rx="2" fill={CUP_RED} />
        <rect x="31.5" y="53" width="9" height="6" rx="1.5" fill={BUTTER} />
        <circle cx="28" cy="65" r="3.4" fill={INK} />
        <circle cx="44" cy="65" r="3.4" fill={INK} />
        <ellipse
          cx="23"
          cy="86"
          rx="3.4"
          ry="7.5"
          transform="rotate(-22 23 86)"
          fill={INK}
        />
        <ellipse
          cx="49"
          cy="86"
          rx="3.4"
          ry="7.5"
          transform="rotate(22 49 86)"
          fill={INK}
        />

        {/* Wooden stool + Pure White BOBO holding retro microphone */}
        <rect x="70" y="76" width="34" height="5" rx="2" fill={WOOD_STOOL} />
        <rect x="74" y="80" width="5" height="11" rx="1.5" fill={WOOD_STOOL} />
        <rect x="95" y="80" width="5" height="11" rx="1.5" fill={WOOD_STOOL} />
        <path
          d="M 78 35
             C 71 30, 67 37, 72 44
             C 68 51, 68 65, 76 74
             C 81 77, 93 77, 98 74
             C 106 65, 106 51, 102 44
             C 107 37, 103 30, 96 35
             C 90 34, 84 34, 78 35 Z"
          fill={BOBO_WHITE}
        />
        <circle cx="83" cy="45" r="1.9" fill={INK} />
        <circle cx="91" cy="45" r="1.9" fill={INK} />
        <path
          d="M 87 48.5 L 87 51.5 M 82.6 51.4 Q 84.8 54.4 87 51.4 Q 89.2 54.4 91.4 51.4"
          fill="none"
          stroke={INK}
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Retro handheld mic */}
        <rect
          x="81"
          y="59"
          width="3.6"
          height="10"
          rx="1.8"
          transform="rotate(-15 83 64)"
          fill={BUTTER}
        />
        <circle cx="81" cy="57" r="4.2" fill={CUP_RED} />

        {/* Marsh companion */}
        <rect x="57" y="74" width="11" height="10" rx="3" fill={BOBO_WHITE} />
        <circle cx="60.5" cy="78" r="0.9" fill={INK} />
        <circle cx="64.5" cy="78" r="0.9" fill={INK} />
        <path
          d="M 60.8 80.5 Q 62.5 82 64.2 80.5"
          fill="none"
          stroke={INK}
          strokeWidth="1"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
};
