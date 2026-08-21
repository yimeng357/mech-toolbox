// 左侧导航
import type { ViewName } from '../types';
import { TOOLS } from '../tools';
import {
  IconHome, IconRuler, IconClock, IconGear, IconSun, IconMoon,
} from './icons';

interface Props {
  view: ViewName;
  onNavigate: (v: ViewName) => void;
  onToggleTheme: () => void;
  dark: boolean;
}

export function Sidebar({ view, onNavigate, onToggleTheme, dark }: Props) {
  const nav = (v: ViewName) => onNavigate(v);

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="logo"><IconShaftLogo /></div>
        <div>
          <div className="name">机械工程师工具箱</div>
          <div className="sub">MECH TOOLBOX</div>
        </div>
      </div>

      <div className={view === 'dashboard' ? 'nav-item active' : 'nav-item'} onClick={() => nav('dashboard')}>
        <IconHome size={17} /> <span>首页</span>
      </div>

      <div className="nav-label">机械计算</div>
      {TOOLS.map((t) => {
        const Icon = t.icon;
        const active = view === t.id;
        return (
          <div
            key={t.id}
            className={active ? 'nav-item active' : 'nav-item'}
            onClick={() => nav(t.id)}
          >
            <Icon size={17} /> <span>{t.name}</span>
          </div>
        );
      })}

      <div className="nav-label">工具</div>
      <div className={view === 'convert' ? 'nav-item active' : 'nav-item'} onClick={() => nav('convert')}>
        <IconRuler size={17} /> <span>单位换算</span>
      </div>
      <div className={view === 'history' ? 'nav-item active' : 'nav-item'} onClick={() => nav('history')}>
        <IconClock size={17} /> <span>历史记录</span>
      </div>
      <div className={view === 'settings' ? 'nav-item active' : 'nav-item'} onClick={() => nav('settings')}>
        <IconGear size={17} /> <span>设置</span>
      </div>

      <div className="sidebar-foot">
        <div className="nav-item" onClick={onToggleTheme}>
          {dark ? <IconSun size={16} /> : <IconMoon size={16} />} <span>{dark ? '浅色模式' : '深色模式'}</span>
        </div>
        <div className="ver">v1.0.0 · 数据仅存本地</div>
      </div>
    </aside>
  );
}

function IconShaftLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3.2 2" />
    </svg>
  );
}
