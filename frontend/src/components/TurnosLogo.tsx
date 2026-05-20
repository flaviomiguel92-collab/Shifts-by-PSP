import React from 'react';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Path,
  Ellipse,
  Rect,
  Circle,
  Line,
  Text as SvgText,
  G,
  Filter,
  FeGaussianBlur,
  FeMerge,
  FeMergeNode,
  FeDropShadow,
} from 'react-native-svg';

interface TurnosLogoProps {
  size?: number;
}

/**
 * Faithful React Native port of the SVG logo from mockups/login.html.
 * Viewbox 400×460. Filters (glow / drop-shadow) render on web; on native
 * they no-op gracefully and the static art still looks correct.
 */
export function TurnosLogo({ size = 300 }: TurnosLogoProps) {
  const width = size;
  const height = (size * 460) / 400;
  return (
    <Svg width={width} height={height} viewBox="0 0 400 460" fill="none">
      <Defs>
        <LinearGradient id="sFill" x1="200" y1="18" x2="200" y2="372" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor="#0e1c38" />
          <Stop offset="100%" stopColor="#060c1a" />
        </LinearGradient>
        <LinearGradient id="metal" x1="42" y1="18" x2="358" y2="372" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor="#ccdaf0" />
          <Stop offset="18%" stopColor="#6a8ab0" />
          <Stop offset="42%" stopColor="#eaf2ff" />
          <Stop offset="62%" stopColor="#507098" />
          <Stop offset="82%" stopColor="#8aacd0" />
          <Stop offset="100%" stopColor="#bcd0e8" />
        </LinearGradient>
        <LinearGradient id="metal2" x1="52" y1="28" x2="348" y2="360" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor="#a0b8d0" />
          <Stop offset="40%" stopColor="#d8ecff" />
          <Stop offset="100%" stopColor="#6888a8" />
        </LinearGradient>
        <LinearGradient id="chrome" x1="200" y1="388" x2="200" y2="432" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor="#e0eeff" />
          <Stop offset="30%" stopColor="#ffffff" />
          <Stop offset="52%" stopColor="#c0d8f0" />
          <Stop offset="75%" stopColor="#8aaac8" />
          <Stop offset="100%" stopColor="#6080a0" />
        </LinearGradient>
        <LinearGradient id="starG" x1="200" y1="34" x2="200" y2="68" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor="#e8f4ff" />
          <Stop offset="100%" stopColor="#9ab8d8" />
        </LinearGradient>
        <LinearGradient id="calH" x1="155" y1="215" x2="155" y2="238" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor="#4a94ff" />
          <Stop offset="100%" stopColor="#1a5cd8" />
        </LinearGradient>
        <LinearGradient id="calB" x1="200" y1="215" x2="200" y2="295" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor="#e8f0fa" />
          <Stop offset="100%" stopColor="#d0ddf0" />
        </LinearGradient>
        <LinearGradient id="uniform" x1="200" y1="175" x2="200" y2="250" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor="#0e2248" />
          <Stop offset="100%" stopColor="#081428" />
        </LinearGradient>
        <LinearGradient id="laurel" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#7090b0" />
          <Stop offset="100%" stopColor="#405878" />
        </LinearGradient>

        <Filter id="glow" x="-25%" y="-25%" width="150%" height="150%">
          <FeGaussianBlur in="SourceGraphic" stdDeviation="4" result="b" />
          <FeMerge>
            <FeMergeNode in="b" />
            <FeMergeNode in="SourceGraphic" />
          </FeMerge>
        </Filter>
        <Filter id="tsh" x="-5%" y="-20%" width="110%" height="140%">
          <FeDropShadow dx="0" dy="2" stdDeviation="3" floodColor="rgba(0,20,80,0.8)" />
          <FeDropShadow dx="0" dy="0" stdDeviation="8" floodColor="rgba(30,80,200,0.4)" />
        </Filter>
      </Defs>

      {/* Shield outer glow + body + metallic border */}
      <Path
        d="M200,18 L356,78 L356,192 C356,296 200,372 200,372 C200,372 44,296 44,192 L44,78 Z"
        stroke="#1a4ee0"
        strokeWidth={14}
        opacity={0.3}
        filter="url(#glow)"
      />
      <Path
        d="M200,18 L356,78 L356,192 C356,296 200,372 200,372 C200,372 44,296 44,192 L44,78 Z"
        fill="url(#sFill)"
      />
      <Path
        d="M200,18 L356,78 L356,192 C356,296 200,372 200,372 C200,372 44,296 44,192 L44,78 Z"
        stroke="url(#metal)"
        strokeWidth={7}
        fill="none"
      />
      <Path
        d="M200,28 L348,85 L348,191 C348,289 200,362 200,362 C200,362 52,289 52,191 L52,85 Z"
        stroke="#3b82f6"
        strokeWidth={2.5}
        fill="none"
        opacity={0.85}
        filter="url(#glow)"
      />
      <Path
        d="M200,28 L348,85 L348,191 C348,289 200,362 200,362 C200,362 52,289 52,191 L52,85 Z"
        stroke="url(#metal2)"
        strokeWidth={1.5}
        fill="none"
        opacity={0.6}
      />
      <Path
        d="M200,48 L330,100 L330,190 C330,276 200,344 200,344 C200,344 70,276 70,190 L70,100 Z"
        stroke="rgba(80,130,200,0.18)"
        strokeWidth={1}
        fill="none"
      />

      {/* Star */}
      <Path
        d="M200,34 L205,47 L218,47.8 L208.5,56.5 L211.5,69.5 L200,63 L188.5,69.5 L191.5,56.5 L182,47.8 L195,47 Z"
        fill="url(#starG)"
        filter="url(#glow)"
      />

      {/* Laurel — left */}
      <Path
        d="M128,92 C122,122 115,155 114,195 C113,218 116,235 120,248"
        stroke="#4a6080"
        strokeWidth={1.8}
        fill="none"
        strokeLinecap="round"
      />
      <Ellipse cx={113} cy={102} rx={12} ry={5.5} transform="rotate(-42 113 102)" fill="url(#laurel)" opacity={0.9} />
      <Ellipse cx={106} cy={116} rx={12} ry={5.5} transform="rotate(-52 106 116)" fill="url(#laurel)" opacity={0.9} />
      <Ellipse cx={100} cy={131} rx={12} ry={5.5} transform="rotate(-58 100 131)" fill="url(#laurel)" opacity={0.9} />
      <Ellipse cx={97} cy={147} rx={12} ry={5.5} transform="rotate(-62 97 147)" fill="url(#laurel)" opacity={0.9} />
      <Ellipse cx={97} cy={163} rx={12} ry={5.5} transform="rotate(-60 97 163)" fill="url(#laurel)" opacity={0.9} />
      <Ellipse cx={99} cy={179} rx={12} ry={5.5} transform="rotate(-54 99 179)" fill="url(#laurel)" opacity={0.9} />
      <Ellipse cx={104} cy={194} rx={11} ry={5} transform="rotate(-44 104 194)" fill="url(#laurel)" opacity={0.9} />
      <Ellipse cx={111} cy={207} rx={10} ry={4.5} transform="rotate(-32 111 207)" fill="url(#laurel)" opacity={0.85} />
      <Ellipse cx={124} cy={98} rx={9} ry={4} transform="rotate(-22 124 98)" fill="#3a5068" opacity={0.8} />
      <Ellipse cx={120} cy={112} rx={9} ry={4} transform="rotate(-28 120 112)" fill="#3a5068" opacity={0.8} />
      <Ellipse cx={118} cy={127} rx={9} ry={4} transform="rotate(-34 118 127)" fill="#3a5068" opacity={0.8} />
      <Ellipse cx={116} cy={143} rx={9} ry={4} transform="rotate(-38 116 143)" fill="#3a5068" opacity={0.8} />
      <Ellipse cx={116} cy={159} rx={9} ry={4} transform="rotate(-36 116 159)" fill="#3a5068" opacity={0.8} />
      <Ellipse cx={118} cy={174} rx={9} ry={4} transform="rotate(-30 118 174)" fill="#3a5068" opacity={0.8} />
      <Ellipse cx={122} cy={189} rx={8} ry={3.5} transform="rotate(-22 122 189)" fill="#3a5068" opacity={0.8} />

      {/* Laurel — right */}
      <Path
        d="M272,92 C278,122 285,155 286,195 C287,218 284,235 280,248"
        stroke="#4a6080"
        strokeWidth={1.8}
        fill="none"
        strokeLinecap="round"
      />
      <Ellipse cx={287} cy={102} rx={12} ry={5.5} transform="rotate(42 287 102)" fill="url(#laurel)" opacity={0.9} />
      <Ellipse cx={294} cy={116} rx={12} ry={5.5} transform="rotate(52 294 116)" fill="url(#laurel)" opacity={0.9} />
      <Ellipse cx={300} cy={131} rx={12} ry={5.5} transform="rotate(58 300 131)" fill="url(#laurel)" opacity={0.9} />
      <Ellipse cx={303} cy={147} rx={12} ry={5.5} transform="rotate(62 303 147)" fill="url(#laurel)" opacity={0.9} />
      <Ellipse cx={303} cy={163} rx={12} ry={5.5} transform="rotate(60 303 163)" fill="url(#laurel)" opacity={0.9} />
      <Ellipse cx={301} cy={179} rx={12} ry={5.5} transform="rotate(54 301 179)" fill="url(#laurel)" opacity={0.9} />
      <Ellipse cx={296} cy={194} rx={11} ry={5} transform="rotate(44 296 194)" fill="url(#laurel)" opacity={0.9} />
      <Ellipse cx={289} cy={207} rx={10} ry={4.5} transform="rotate(32 289 207)" fill="url(#laurel)" opacity={0.85} />
      <Ellipse cx={276} cy={98} rx={9} ry={4} transform="rotate(22 276 98)" fill="#3a5068" opacity={0.8} />
      <Ellipse cx={280} cy={112} rx={9} ry={4} transform="rotate(28 280 112)" fill="#3a5068" opacity={0.8} />
      <Ellipse cx={282} cy={127} rx={9} ry={4} transform="rotate(34 282 127)" fill="#3a5068" opacity={0.8} />
      <Ellipse cx={284} cy={143} rx={9} ry={4} transform="rotate(38 284 143)" fill="#3a5068" opacity={0.8} />
      <Ellipse cx={284} cy={159} rx={9} ry={4} transform="rotate(36 284 159)" fill="#3a5068" opacity={0.8} />
      <Ellipse cx={282} cy={174} rx={9} ry={4} transform="rotate(30 282 174)" fill="#3a5068" opacity={0.8} />
      <Ellipse cx={278} cy={189} rx={8} ry={3.5} transform="rotate(22 278 189)" fill="#3a5068" opacity={0.8} />

      {/* Officer body + epaulettes */}
      <Path
        d="M148,248 C138,236 133,222 133,207 Q155,196 200,194 Q245,196 267,207 C267,222 262,236 252,248 Z"
        fill="url(#uniform)"
      />
      <Rect x={131} y={206} width={26} height={10} rx={5} fill="#1e3a72" opacity={0.9} />
      <Rect x={243} y={206} width={26} height={10} rx={5} fill="#1e3a72" opacity={0.9} />
      <Line x1={135} y1={209} x2={153} y2={209} stroke="#3060b0" strokeWidth={1.5} opacity={0.7} />
      <Line x1={135} y1={212} x2={153} y2={212} stroke="#3060b0" strokeWidth={1.5} opacity={0.7} />
      <Line x1={247} y1={209} x2={265} y2={209} stroke="#3060b0" strokeWidth={1.5} opacity={0.7} />
      <Line x1={247} y1={212} x2={265} y2={212} stroke="#3060b0" strokeWidth={1.5} opacity={0.7} />
      <Circle cx={200} cy={160} r={32} fill="#0c1a38" />
      <Rect x={192} y={186} width={16} height={12} rx={3} fill="#0c1a38" />
      <Path d="M195,192 L200,210 L205,192 Z" fill="#060e20" />

      {/* Police cap */}
      <Path d="M168,148 Q200,118 232,148 Z" fill="#152248" />
      <Rect x={163} y={147} width={74} height={10} rx={2} fill="#1a2d5a" />
      <Rect x={155} y={155} width={90} height={9} rx={4} fill="#0e1e42" />
      <Rect x={158} y={155} width={84} height={3} rx={2} fill="rgba(80,120,200,0.25)" />
      <Rect x={194} y={131} width={12} height={9} rx={2} fill="#2050a8" />
      <Rect x={197} y={133} width={6} height={5} rx={1} fill="#4080d0" />

      {/* Calendar */}
      <Rect x={152} y={222} width={96} height={78} rx={9} fill="rgba(0,10,40,0.45)" transform="translate(2 4)" />
      <Rect x={152} y={218} width={96} height={78} rx={9} fill="url(#calB)" />
      <Rect x={152} y={218} width={96} height={24} rx={9} fill="url(#calH)" />
      <Rect x={152} y={232} width={96} height={10} fill="url(#calH)" />
      <Rect x={169} y={210} width={10} height={18} rx={5} fill="#0c2060" />
      <Rect x={170} y={211} width={8} height={14} rx={4} fill="#1840a0" opacity={0.7} />
      <Rect x={221} y={210} width={10} height={18} rx={5} fill="#0c2060" />
      <Rect x={222} y={211} width={8} height={14} rx={4} fill="#1840a0" opacity={0.7} />

      {/* Grid */}
      <Rect x={160} y={248} width={11} height={11} rx={2.5} fill="#8898b8" />
      <Rect x={176} y={248} width={11} height={11} rx={2.5} fill="#8898b8" />
      <Rect x={192} y={248} width={11} height={11} rx={2.5} fill="#8898b8" />
      <Rect x={208} y={248} width={11} height={11} rx={2.5} fill="#8898b8" />
      <Rect x={224} y={248} width={11} height={11} rx={2.5} fill="#8898b8" />
      <Rect x={160} y={264} width={11} height={11} rx={2.5} fill="#8898b8" />
      <Rect x={176} y={264} width={11} height={11} rx={2.5} fill="#8898b8" />
      <Rect x={192} y={264} width={11} height={11} rx={2.5} fill="#8898b8" />
      <Rect x={208} y={264} width={11} height={11} rx={2.5} fill="#8898b8" />
      <Rect x={160} y={280} width={11} height={11} rx={2.5} fill="#8898b8" />
      <Rect x={176} y={280} width={11} height={11} rx={2.5} fill="#8898b8" />
      <Rect x={192} y={280} width={11} height={11} rx={2.5} fill="#8898b8" />
      <Path
        d="M210,284 L215.5,291 L228,275"
        stroke="#3b82f6"
        strokeWidth={3.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* TURNOS text */}
      <SvgText
        x={200}
        y={422}
        textAnchor="middle"
        fontFamily="Arial Black, Impact, sans-serif"
        fontSize={56}
        fontWeight="900"
        fill="url(#chrome)"
        letterSpacing={7}
        filter="url(#tsh)"
      >
        TURNOS
      </SvgText>
      <Line x1={74} y1={428} x2={326} y2={428} stroke="url(#metal)" strokeWidth={1.2} opacity={0.55} />
      <SvgText
        x={200}
        y={448}
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontSize={11}
        fill="#4878b8"
        letterSpacing={2.8}
      >
        GESTÃO DE TURNOS PROFISSIONAIS
      </SvgText>

      {/* Mini shield */}
      <Path
        d="M200,462 L208,466 L208,474 C208,480 200,484 200,484 C200,484 192,480 192,474 L192,466 Z"
        fill="#122050"
        stroke="#2a5aaa"
        strokeWidth={1.2}
      />
      <Path
        d="M200,465 L206,468 L206,474 C206,479 200,482 200,482 C200,482 194,479 194,474 L194,468 Z"
        fill="none"
        stroke="#3b82f6"
        strokeWidth={0.8}
        opacity={0.6}
      />
    </Svg>
  );
}
