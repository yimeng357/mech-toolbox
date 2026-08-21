// 顶部栏
import { IconSun, IconMoon } from './icons';

interface Props {
  title: string;
  desc?: string;
  dark: boolean;
  onToggleTheme: () => void;
}

export function TopBar({ title, desc, dark, onToggleTheme }: Props) {
  return (
    <header className="topbar">
      <div>
        <div className="title">{title}</div>
        {desc && <div className="desc">{desc}</div>}
      </div>
      <div className="right">
        <button className="btn ghost small" onClick={onToggleTheme} title="切换主题">
          {dark ? <IconSun size={15} /> : <IconMoon size={15} />} {dark ? '浅色' : '深色'}
        </button>
      </div>
    </header>
  );
}
