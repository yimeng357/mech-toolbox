// 简洁的线条图标集(Feather 风格)

export interface IconProps {
  size?: number;
  className?: string;
}

function Svg({ size, className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      className={className}
      width={size ?? 18}
      height={size ?? 18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export const IconHome = (p: IconProps) => (
  <Svg {...p}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.8V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.8" /></Svg>
);

export const IconPiston = (p: IconProps) => (
  <Svg {...p}><path d="M8 6.5a4.5 4.5 0 0 1 8 0" /><path d="M8 6.5v11a4.5 4.5 0 0 0 8 0v-11" /><path d="M12 3v2M12 14v8" /></Svg>
);

export const IconBolt = (p: IconProps) => (
  <Svg {...p}><polygon points="8,3 16,3 19,8 16,13 8,13 5,8" /><rect x="10.7" y="13" width="2.6" height="8" rx="1" /></Svg>
);

export const IconShaft = (p: IconProps) => (
  <Svg {...p}><path d="M4 11V8a1 1 0 0 1 1-1h4" /><path d="M9 7h5a1 1 0 0 1 1 1v3" /><path d="M15 11h3a1 1 0 0 1 1 1v8" /><path d="M4 11v9M8 20h12" /></Svg>
);

export const IconFlange = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /><circle cx="12" cy="4.5" r="1.1" /><circle cx="12" cy="19.5" r="1.1" /><circle cx="4.5" cy="12" r="1.1" /><circle cx="19.5" cy="12" r="1.1" /></Svg>
);

export const IconVessel = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="2.2" /></Svg>
);

export const IconRuler = (p: IconProps) => (
  <Svg {...p}><path d="M4 20 20 4" /><path d="M8 18l1.6-3.7M12 14l1.6-3.7M16 10l1.6-3.7" /></Svg>
);

export const IconClock = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></Svg>
);

export const IconGear = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="3.2" /><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.2 5.2l2.1 2.1M16.7 16.7l2.1 2.1M18.8 5.2l-2.1 2.1M7.3 16.7l-2.1 2.1" /></Svg>
);

export const IconCopy = (p: IconProps) => (
  <Svg {...p}><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></Svg>
);

export const IconSave = (p: IconProps) => (
  <Svg {...p}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" /><path d="M17 21v-8H7v8M7 3v5h8" /></Svg>
);

export const IconRotate = (p: IconProps) => (
  <Svg {...p}><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></Svg>
);

export const IconSun = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></Svg>
);

export const IconMoon = (p: IconProps) => (
  <Svg {...p}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" /></Svg>
);

export const IconTrash = (p: IconProps) => (
  <Svg {...p}><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6" /></Svg>
);

export const IconCalc = (p: IconProps) => (
  <Svg {...p}><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 7h8M8 11.5h.01M12 11.5h.01M16 11.5h.01M8 15.5h.01M12 15.5h.01M16 15.5h.01" /></Svg>
);

export const IconArrowRight = (p: IconProps) => (
  <Svg {...p}><path d="m9 18 6-6-6-6" /></Svg>
);

export const IconSwap = (p: IconProps) => (
  <Svg {...p}><path d="M8 4v14M8 18l-4-4M8 18l4-4" /><path d="M16 20V6M16 6l-4 4M16 6l4 4" /></Svg>
);
