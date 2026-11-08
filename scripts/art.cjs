'use strict';
/*
 * Vector placeholder artwork for the demo catalogue. Each drawing fits a 400x400 box.
 * Replace with real product photos via Admin -> Products (uploads are converted to WebP).
 */

let uid = 0;
const id = (p) => `${p}${++uid}`;

function lin(gid, stops, x2 = 0, y2 = 1) {
  return `<linearGradient id="${gid}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops
    .map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`;
}

const shadow = (cx = 200, cy = 360, rx = 120) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="12" fill="#0a2a66" opacity=".12"/>`;

const DRAW = {
  phone({ color = '#8a8580', accent = '#5b5752', cam = 'square' }) {
    const g = id('ph');
    const lens = (x, y, r = 17) =>
      `<circle cx="${x}" cy="${y}" r="${r}" fill="#1b1d22" stroke="${accent}" stroke-width="4"/><circle cx="${x}" cy="${y}" r="${r * 0.5}" fill="#2c3550"/><circle cx="${x - r * 0.25}" cy="${y - r * 0.25}" r="${r * 0.18}" fill="#8fa8ff" opacity=".7"/>`;
    const cams = cam === 'square'
      ? `<rect x="138" y="62" width="98" height="98" rx="26" fill="${accent}" opacity=".55"/>${lens(165, 89)}${lens(165, 133)}${lens(209, 111)}<circle cx="213" cy="79" r="5" fill="#ddd"/>`
      : `${lens(158, 88, 15)}${lens(158, 128, 15)}${lens(158, 168, 15)}<circle cx="190" cy="88" r="5" fill="#ddd"/>`;
    return `<defs>${lin(g, [[0, color], [0.5, accent], [1, color]], 1, 1)}</defs>${shadow(200, 370, 90)}
      <rect x="120" y="40" width="160" height="320" rx="34" fill="${accent}"/>
      <rect x="125" y="45" width="150" height="310" rx="30" fill="url(#${g})"/>
      <rect x="125" y="45" width="150" height="310" rx="30" fill="#fff" opacity=".08"/>${cams}
      <rect x="117" y="120" width="4" height="34" rx="2" fill="${accent}"/><rect x="279" y="140" width="4" height="54" rx="2" fill="${accent}"/>`;
  },

  earbuds({ color = '#f4f6fa' }) {
    const g = id('eb');
    return `<defs>${lin(g, [[0, '#ffffff'], [1, '#d9dee8']])}</defs>${shadow(200, 352, 110)}
      <rect x="110" y="180" width="180" height="160" rx="54" fill="url(#${g})" stroke="#c0c7d6" stroke-width="2"/>
      <path d="M112 232h176" stroke="#c0c7d6" stroke-width="2"/><rect x="190" y="252" width="20" height="8" rx="4" fill="#9aa3b5"/>
      <g fill="${color}" stroke="#c0c7d6" stroke-width="2"><ellipse cx="160" cy="120" rx="30" ry="34"/><rect x="148" y="130" width="22" height="70" rx="11"/>
      <ellipse cx="244" cy="110" rx="30" ry="34"/><rect x="232" y="120" width="22" height="70" rx="11"/></g>
      <ellipse cx="160" cy="112" rx="12" ry="10" fill="#2b2f38"/><ellipse cx="244" cy="102" rx="12" ry="10" fill="#2b2f38"/>`;
  },

  headphones({ color = '#2b2f38', accent = '#4a5060' }) {
    const g = id('hp');
    return `<defs>${lin(g, [[0, accent], [1, color]])}</defs>${shadow(200, 368, 120)}
      <path d="M95 230 C95 90 305 90 305 230" fill="none" stroke="${color}" stroke-width="22" stroke-linecap="round"/>
      <path d="M110 200 C120 110 280 110 290 200" fill="none" stroke="${accent}" stroke-width="8" stroke-linecap="round"/>
      <rect x="62" y="210" width="76" height="130" rx="34" fill="url(#${g})"/><rect x="262" y="210" width="76" height="130" rx="34" fill="url(#${g})"/>
      <rect x="120" y="226" width="22" height="98" rx="10" fill="${color}"/><rect x="258" y="226" width="22" height="98" rx="10" fill="${color}"/>
      <rect x="76" y="240" width="10" height="40" rx="5" fill="#fff" opacity=".18"/>`;
  },

  console({ color = '#14161b' }) {
    const g = id('cs');
    return `<defs>${lin(g, [[0, '#2a2e36'], [1, color]], 1, 0)}</defs>${shadow(200, 372, 110)}
      <path d="M130 70 L270 70 L270 360 L130 360 Z" fill="url(#${g})"/><path d="M130 70 L160 50 L300 50 L270 70 Z" fill="#30343d"/>
      <path d="M270 70 L300 50 L300 340 L270 360 Z" fill="#0d0f13"/>
      <ellipse cx="215" cy="60" rx="46" ry="10" fill="#0a0b0e"/><ellipse cx="215" cy="60" rx="34" ry="6" fill="#1e7a3a" opacity=".55"/>
      <circle cx="148" cy="90" r="5" fill="#e8ecf3"/><rect x="140" y="300" width="22" height="6" rx="3" fill="#444a55"/>`;
  },

  laptop({ screen = '#1e63ff', color = '#c0c7d6' }) {
    const g = id('lp');
    const s = id('ls');
    return `<defs>${lin(g, [[0, '#eef1f6'], [1, color]])}${lin(s, [[0, '#0a2a66'], [0.6, screen], [1, '#7fb0ff']], 1, 1)}</defs>${shadow(200, 340, 170)}
      <rect x="80" y="90" width="240" height="160" rx="10" fill="#1f2937"/><rect x="88" y="98" width="224" height="144" rx="4" fill="url(#${s})"/>
      <path d="M100 230 C160 150 240 210 300 120 L312 120 L312 242 L88 242 Z" fill="#fff" opacity=".12"/>
      <path d="M50 256 L350 256 L330 290 L70 290 Z" fill="url(#${g})"/><rect x="170" y="258" width="60" height="6" rx="3" fill="#9aa3b5"/>`;
  },

  mouse({ color = '#1b1d22', accent = '#1e63ff' }) {
    return `${shadow(200, 360, 80)}
      <path d="M200 60 C270 60 285 140 285 220 C285 300 250 350 200 350 C150 350 115 300 115 220 C115 140 130 60 200 60 Z" fill="${color}"/>
      <path d="M200 60 L200 170" stroke="#3a3f4a" stroke-width="4"/><rect x="190" y="100" width="20" height="44" rx="10" fill="#3a3f4a"/>
      <path d="M128 230 C140 290 170 330 200 335 C230 330 260 290 272 230" fill="none" stroke="${accent}" stroke-width="5" opacity=".9"/>
      <path d="M118 170 L128 150 L128 220 Z" fill="#3a3f4a"/>`;
  },

  keyboard({ color = '#1b1d22', accent = '#1e63ff' }) {
    let keys = '';
    for (let r = 0; r < 4; r++) for (let c = 0; c < 12; c++) {
      keys += `<rect x="${62 + c * 23.5 + r * 4}" y="${170 + r * 26}" width="19" height="20" rx="3" fill="#2b2f38"/>`;
    }
    return `${shadow(200, 300, 170)}<path d="M50 160 L350 160 L370 290 L30 290 Z" fill="${color}"/>${keys}
      <rect x="110" y="276" width="160" height="8" rx="3" fill="#2b2f38"/><path d="M40 285 L360 285" stroke="${accent}" stroke-width="4" opacity=".8"/>`;
  },

  charger({ color = '#f4f6fa' }) {
    return `${shadow(200, 340, 80)}
      <rect x="168" y="50" width="14" height="60" rx="3" fill="#b5bccb"/><rect x="218" y="50" width="14" height="60" rx="3" fill="#b5bccb"/>
      <rect x="120" y="100" width="160" height="230" rx="34" fill="${color}" stroke="#c0c7d6" stroke-width="2"/>
      <rect x="182" y="290" width="36" height="14" rx="7" fill="#2b2f38"/><text x="200" y="215" font-family="Segoe UI,Arial" font-size="26" font-weight="700" text-anchor="middle" fill="#9aa3b5">65W</text>`;
  },

  cable({ color = '#f4f6fa' }) {
    return `${shadow(200, 350, 120)}
      <path d="M90 300 C40 200 140 120 200 170 C260 220 360 160 300 90" fill="none" stroke="${color}" stroke-width="14" stroke-linecap="round"/>
      <path d="M90 300 C40 200 140 120 200 170 C260 220 360 160 300 90" fill="none" stroke="#c0c7d6" stroke-width="2" opacity=".6"/>
      <rect x="70" y="295" width="40" height="56" rx="10" fill="#e3e7ef" stroke="#c0c7d6" stroke-width="2"/><rect x="80" y="345" width="20" height="16" rx="4" fill="#9aa3b5"/>
      <rect x="282" y="40" width="40" height="56" rx="10" fill="#e3e7ef" stroke="#c0c7d6" stroke-width="2" transform="rotate(20 302 68)"/>`;
  },

  case({ color = '#0a2a66' }) {
    return `${shadow(200, 370, 90)}
      <rect x="120" y="40" width="160" height="320" rx="38" fill="${color}"/><rect x="132" y="52" width="136" height="296" rx="30" fill="#000" opacity=".12"/>
      <rect x="140" y="64" width="90" height="90" rx="24" fill="#f2f5fa"/><rect x="140" y="64" width="90" height="90" rx="24" fill="none" stroke="#000" stroke-opacity=".2" stroke-width="3"/>
      <circle cx="200" cy="230" r="34" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="5"/>`;
  },

  protector() {
    const g = id('pr');
    return `<defs>${lin(g, [[0, '#ffffff'], [0.5, '#dfe8ff'], [1, '#ffffff']], 1, 1)}</defs>${shadow(210, 370, 90)}
      <rect x="140" y="50" width="160" height="320" rx="30" fill="#c0c7d6" opacity=".5"/>
      <rect x="110" y="30" width="160" height="320" rx="30" fill="url(#${g})" stroke="#9aa3b5" stroke-width="2"/>
      <path d="M140 60 L180 60 L120 200 L120 120 Z" fill="#fff" opacity=".9"/><rect x="170" y="44" width="40" height="8" rx="4" fill="#9aa3b5"/>`;
  },

  gamepad({ color = '#f4f6fa', accent = '#1e63ff' }) {
    return `${shadow(200, 330, 140)}
      <path d="M120 130 L280 130 C330 130 360 190 365 260 C370 320 330 330 300 290 L270 250 L130 250 L100 290 C70 330 30 320 35 260 C40 190 70 130 120 130 Z" fill="${color}" stroke="#c0c7d6" stroke-width="2"/>
      <path d="M100 175 v50 M75 200 h50" stroke="#2b2f38" stroke-width="16" stroke-linecap="round"/>
      <circle cx="300" cy="175" r="10" fill="${accent}"/><circle cx="325" cy="200" r="10" fill="#e5484d"/><circle cx="275" cy="200" r="10" fill="#f5a524"/><circle cx="300" cy="225" r="10" fill="#30a46c"/>
      <circle cx="160" cy="230" r="22" fill="#2b2f38"/><circle cx="240" cy="230" r="22" fill="#2b2f38"/>`;
  },

  watch({ color = '#1b1d22', accent = '#1e63ff' }) {
    return `${shadow(200, 370, 70)}
      <rect x="160" y="20" width="80" height="110" rx="20" fill="${color}" opacity=".85"/><rect x="160" y="270" width="80" height="110" rx="20" fill="${color}" opacity=".85"/>
      <rect x="125" y="110" width="150" height="180" rx="42" fill="#2b2f38"/><rect x="137" y="122" width="126" height="156" rx="32" fill="#0b0d12"/>
      <circle cx="200" cy="200" r="46" fill="none" stroke="${accent}" stroke-width="10" stroke-dasharray="220 300" transform="rotate(-90 200 200)"/>
      <text x="200" y="210" font-family="Segoe UI,Arial" font-size="26" font-weight="700" text-anchor="middle" fill="#fff">10:09</text><rect x="275" y="170" width="10" height="34" rx="4" fill="#4a5060"/>`;
  },

  tablet({ screen = '#1e63ff' }) {
    const s = id('tb');
    return `<defs>${lin(s, [[0, '#0a2a66'], [1, screen]], 1, 1)}</defs>${shadow(200, 372, 130)}
      <rect x="70" y="50" width="260" height="310" rx="24" fill="#2b2f38"/><rect x="82" y="62" width="236" height="286" rx="14" fill="url(#${s})"/>
      <circle cx="200" cy="205" r="60" fill="#fff" opacity=".08"/>`;
  },

  speaker({ color = '#1b1d22', accent = '#1e63ff' }) {
    return `${shadow(200, 370, 80)}<rect x="130" y="60" width="140" height="300" rx="60" fill="${color}"/>
      <circle cx="200" cy="160" r="40" fill="#2b2f38"/><circle cx="200" cy="270" r="40" fill="#2b2f38"/>
      <circle cx="200" cy="160" r="16" fill="${accent}" opacity=".7"/><circle cx="200" cy="270" r="16" fill="${accent}" opacity=".7"/>`;
  },

  tools() {
    return `${shadow(200, 360, 130)}
      <rect x="150" y="60" width="100" height="200" rx="18" fill="#2b2f38"/><rect x="160" y="70" width="80" height="170" rx="10" fill="#1e63ff" opacity=".85"/>
      <path d="M90 300 L190 200" stroke="#c0c7d6" stroke-width="14" stroke-linecap="round"/><rect x="60" y="290" width="40" height="70" rx="10" fill="#1e63ff" transform="rotate(45 80 325)"/>
      <path d="M320 120 L250 290" stroke="#9aa3b5" stroke-width="10" stroke-linecap="round"/><circle cx="320" cy="115" r="22" fill="none" stroke="#9aa3b5" stroke-width="10"/>`;
  },
};

function svg(kind, opts = {}, size = 400) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="${size}" height="${size}">${DRAW[kind](opts)}</svg>`;
}

function hero() {
  const bg = id('hb');
  const glow = id('hg');
  const place = (kind, opts, x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})">${DRAW[kind](opts)}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 560" width="800" height="560">
  <defs>${lin(bg, [[0, '#0a2a66'], [1, '#04122e']], 1, 1)}
    <radialGradient id="${glow}" cx=".55" cy=".5" r=".5"><stop offset="0" stop-color="#1e63ff" stop-opacity=".75"/><stop offset="1" stop-color="#1e63ff" stop-opacity="0"/></radialGradient></defs>
  <rect width="800" height="560" fill="url(#${bg})"/><circle cx="440" cy="270" r="300" fill="url(#${glow})"/>
  <path d="M0 470 C200 420 520 520 800 430" stroke="#1e63ff" stroke-opacity=".5" stroke-width="2" fill="none"/>
  ${place('laptop', { screen: '#1e63ff' }, 360, 110, 1.05)}
  ${place('headphones', { color: '#1b1d22', accent: '#3a3f4a' }, 40, 120, 0.95)}
  ${place('phone', { color: '#8a8580', accent: '#5b5752' }, 200, 30, 1.25)}
  ${place('earbuds', {}, 360, 340, 0.55)}
  ${place('gamepad', { color: '#f4f6fa' }, 570, 330, 0.6)}
</svg>`;
}

function about() {
  const bg = id('ab');
  const shelf = (y) => `<rect x="40" y="${y}" width="720" height="10" rx="3" fill="#c0c7d6" opacity=".35"/>`;
  let items = '';
  const kinds = ['phone', 'headphones', 'earbuds', 'mouse', 'phone', 'charger', 'gamepad', 'case'];
  kinds.forEach((k, i) => { items += `<g transform="translate(${60 + i * 88} 70) scale(.2)">${DRAW[k]({})}</g>`; });
  kinds.reverse().forEach((k, i) => { items += `<g transform="translate(${60 + i * 88} 170) scale(.2)">${DRAW[k]({ color: '#0a2a66' })}</g>`; });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500">
  <defs>${lin(bg, [[0, '#0a2a66'], [1, '#04122e']], 1, 1)}</defs><rect width="800" height="500" fill="url(#${bg})"/>
  ${shelf(150)}${shelf(250)}${items}
  <rect x="80" y="300" width="640" height="150" rx="16" fill="#fff" opacity=".06"/>
  <rect x="260" y="330" width="280" height="90" rx="14" fill="#1e63ff"/>
  <text x="400" y="385" font-family="Segoe UI,Arial" font-size="40" font-style="italic" font-weight="800" text-anchor="middle" fill="#fff">startech</text>
</svg>`;
}

module.exports = { svg, hero, about };
