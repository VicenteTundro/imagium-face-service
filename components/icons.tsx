type P = { size?: number; className?: string };
const base = (size = 16) => ({
  width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
  strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true, style: { flexShrink: 0 },
});
export const Sol = ({ size = 18, className }: P) => (
  <svg {...base(size)} className={className}><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6" /></svg>
);
export const Lua = ({ size = 18, className }: P) => (
  <svg {...base(size)} className={className}><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /></svg>
);
export const Lupa = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></svg>
);
export const Mais = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}><path d="M12 5v14M5 12h14" /></svg>
);
export const Pino = ({ size = 15, className = "ic-pin" }: P) => (
  <svg {...base(size)} className={className}><path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z" /><circle cx="12" cy="10" r="2.3" /></svg>
);
export const Pessoas = ({ size = 15, className = "ic-ppl" }: P) => (
  <svg {...base(size)} className={className}><circle cx="9" cy="8.5" r="3.2" /><path d="M3 19.5c.6-3.3 3-5.2 6-5.2s5.4 1.9 6 5.2" /><path d="M15.5 5.6a3 3 0 0 1 0 5.8M17.5 14.6c2 .6 3.2 2.3 3.5 4.9" /></svg>
);
export const Camera = ({ size = 15, className = "ic-cam" }: P) => (
  <svg {...base(size)} className={className}><path d="M4 8h3l1.6-2.4h6.8L17 8h3v11H4z" /><circle cx="12" cy="13.3" r="3.4" /></svg>
);
export const Escudo = ({ size = 13, className }: P) => (
  <svg {...base(size)} className={className}><path d="M12 3l7 3v5.5c0 4.3-3 7.8-7 9.5-4-1.7-7-5.2-7-9.5V6z" /></svg>
);
export const Pausa = ({ size = 13, className }: P) => (
  <svg {...base(size)} className={className}><path d="M9 6v12M15 6v12" /></svg>
);
export const Bloqueio = ({ size = 13, className }: P) => (
  <svg {...base(size)} className={className}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
);
export const Xis = ({ size = 13, className }: P) => (
  <svg {...base(size)} className={className}><path d="M6 6l12 12M18 6L6 18" /></svg>
);
export const Relogio = ({ size = 14, className }: P) => (
  <svg {...base(size)} className={className}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>
);
export const Zap = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}><path d="M4 20l1.3-4A8.5 8.5 0 1 1 8 18.8z" /><path d="M9 9.5c.3 2.4 2.1 4.3 4.5 4.8l1.2-1.1 1.8.9-.5 1.6c-3.4.2-7.3-3.6-7.1-7l1.6-.5.9 1.8z" /></svg>
);
export const Download = ({ size = 15, className }: P) => (
  <svg {...base(size)} className={className}><path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 20h14" /></svg>
);
export const Lapis = ({ size = 15, className }: P) => (
  <svg {...base(size)} className={className}><path d="M4 20l1-4.5L15.5 5a2 2 0 0 1 3 3L8 18.5z" /></svg>
);
