// Crisp Vector SVG Icon Pack replacing inconsistent OS emojis across HUD, Shop, Training, and Profile

const SVGS = {
  coin: (sz) => `<svg viewBox="0 0 24 24" width="${sz}" height="${sz}" class="ca-ico" aria-hidden="true">
    <defs><linearGradient id="cg_${sz}" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#fde047"/><stop offset="100%" stop-color="#d97706"/></linearGradient></defs>
    <circle cx="12" cy="12" r="10" fill="url(#cg_${sz})" stroke="#fef08a" stroke-width="1.4"/>
    <circle cx="12" cy="12" r="7" fill="none" stroke="#92400e" stroke-width="1.2" opacity="0.6"/>
    <path d="M12 7.2L13.4 10.3L16.8 10.7L14.2 13L14.9 16.4L12 14.7L9.1 16.4L9.8 13L7.2 10.7L10.6 10.3Z" fill="#78350f"/>
  </svg>`,
  skill: (sz) => `<svg viewBox="0 0 24 24" width="${sz}" height="${sz}" class="ca-ico" aria-hidden="true">
    <defs><linearGradient id="sg_${sz}" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#c084fc"/><stop offset="100%" stop-color="#38bdf8"/></linearGradient></defs>
    <path d="M12 2L14.8 9.2L22 12L14.8 14.8L12 22L9.2 14.8L2 12L9.2 9.2Z" fill="url(#sg_${sz})" stroke="#f3e8ff" stroke-width="1.2"/>
  </svg>`,
  ticket: (sz) => `<svg viewBox="0 0 24 24" width="${sz}" height="${sz}" class="ca-ico" aria-hidden="true">
    <path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4V7z" fill="#0ea5e9" stroke="#bae6fd" stroke-width="1.4"/>
    <line x1="9" y1="7.5" x2="9" y2="16.5" stroke="#082f49" stroke-width="1.6" stroke-dasharray="2.5 2"/>
    <circle cx="14.5" cy="12" r="2.2" fill="#fde047"/>
  </svg>`,
  energy: (sz) => `<svg viewBox="0 0 24 24" width="${sz}" height="${sz}" class="ca-ico" aria-hidden="true">
    <path d="M13 2L4 14h7l-1 8 10-12h-7l0-8z" fill="#34d399" stroke="#a7f3d0" stroke-width="1.2" stroke-linejoin="round"/>
  </svg>`,
  trophy: (sz) => `<svg viewBox="0 0 24 24" width="${sz}" height="${sz}" class="ca-ico" aria-hidden="true">
    <path d="M6 4h12v5a6 6 0 0 1-12 0V4z" fill="#f59e0b" stroke="#fde68a" stroke-width="1.3"/>
    <path d="M6 6H3v2a4 4 0 0 0 3 3.9M18 6h3v2a4 4 0 0 1-3 3.9" fill="none" stroke="#fbbf24" stroke-width="1.5"/>
    <rect x="10.5" y="15" width="3" height="4" fill="#fbbf24"/>
    <rect x="7" y="19" width="10" height="2.5" rx="1" fill="#fde047"/>
  </svg>`,
  rep: (sz) => `<svg viewBox="0 0 24 24" width="${sz}" height="${sz}" class="ca-ico" aria-hidden="true">
    <path d="M12 2l7 3v6c0 5-3.2 9.4-7 11-3.8-1.6-7-6-7-11V5l7-3z" fill="#0284c7" stroke="#7dd3fc" stroke-width="1.3"/>
    <path d="M9 12l2 2 4-4" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`
};

export function caIcon(name, size = 16) {
  const fn = SVGS[name];
  return fn ? fn(size) : '';
}
