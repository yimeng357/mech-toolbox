// 设置页
import type { AppSettings, ThemeMode } from '../types';

interface Props {
  settings: AppSettings;
  onSettings: (s: AppSettings) => void;
  onClearHistory: () => void;
}

const THEMES: Array<{ value: ThemeMode; label: string }> = [
  { value: 'dark', label: '深色模式' },
  { value: 'light', label: '浅色模式' },
  { value: 'system', label: '跟随系统' },
];

export function SettingsView({ settings, onSettings, onClearHistory }: Props) {
  return (
    <div className="card card-pad" style={{ maxWidth: 620 }}>
      <div className="result-title">界面</div>
      <div className="set-row">
        <div>
          <div className="lb">主题</div>
          <div className="ds">深色更贴近 CAD/工程软件;浅色适合明亮环境</div>
        </div>
        <div className="seg">
          {THEMES.map((t) => (
            <button
              key={t.value}
              className={settings.theme === t.value ? 'active' : ''}
              onClick={() => onSettings({ ...settings, theme: t.value })}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="result-title" style={{ marginTop: 8 }}>计算</div>
      <div className="set-row">
        <div>
          <div className="lb">结果小数位数</div>
          <div className="ds">显示计算结果时保留的小数位数</div>
        </div>
        <div className="seg">
          {[0, 1, 2, 3, 4].map((d) => (
            <button
              key={d}
              className={settings.digits === d ? 'active' : ''}
              onClick={() => onSettings({ ...settings, digits: d })}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <div className="result-title" style={{ marginTop: 8 }}>数据</div>
      <div className="set-row">
        <div>
          <div className="lb">清空历史记录</div>
          <div className="ds">删除浏览器本地保存的所有计算记录(不可恢复)</div>
        </div>
        <button className="btn ghost small" onClick={onClearHistory}>清空</button>
      </div>

      <div className="note-box">
        本工具箱所有计算数据均保存在浏览器本地(localStorage),不上传任何数据。
        计算结果为工程简化估算,实际设计请按相关标准(GB/T、ISO、ASME 等)校核。
      </div>
    </div>
  );
}
