// 应用主组件:导航、主题、设置、历史记录、Toast
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AppSettings, HistoryRecord, ThemeMode, ToolId, ViewName } from './types';
import { DEFAULT_SETTINGS } from './types';
import {
  addHistory, clearHistory as clearHist, listHistory, getUsage,
  recentTools as recent, popularTools as pop, removeHistory,
} from './lib/history';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { Dashboard } from './components/Dashboard';
import { UnitConverter } from './components/UnitConverter';
import { HistoryView } from './components/HistoryView';
import { SettingsView } from './components/SettingsView';
import { Toast } from './components/Toast';
import { CylinderForceTool } from './tools/CylinderForceTool';
import { BoltPreloadTool } from './tools/BoltPreloadTool';
import { ShaftDiameterTool } from './tools/ShaftDiameterTool';
import { FlangeBoltTool } from './tools/FlangeBoltTool';
import { VesselTool } from './tools/VesselTool';

const SETTINGS_KEY = 'mech_settings_v1';

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const s = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...s };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

const VIEW_TITLES: Record<ViewName, { title: string; desc: string }> = {
  dashboard: { title: '首页', desc: '机械工程师日常计算工具箱' },
  cylinder: { title: '气缸推力', desc: '由缸径、杆径与工作压力计算理论推力 / 拉力' },
  bolt: { title: '螺栓预紧力', desc: '由拧紧扭矩估算预紧力并校核螺栓应力' },
  shaft: { title: '轴径计算', desc: '按扭转强度计算推荐轴径(扭矩 / 功率输入)' },
  flange: { title: '法兰螺栓', desc: '估算内压分离力与单个螺栓载荷' },
  vessel: { title: '超高压缸筒', desc: '600 MPa 级缸筒设计:双层缩套 / 钢丝缠绕' },
  convert: { title: '单位换算', desc: '长度 / 压力 / 力 / 扭矩 / 功率 / 质量 / 温度' },
  history: { title: '历史记录', desc: '所有计算结果均保存在浏览器本地' },
  settings: { title: '设置', desc: '主题、小数位数与数据管理' },
};

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [view, setView] = useState<ViewName>('dashboard');
  const [history, setHistory] = useState<HistoryRecord[]>(listHistory);
  const [restore, setRestore] = useState<{ toolId: ToolId; inputs: Record<string, string> } | null>(null);
  const [toasts, setToasts] = useState<Array<{ id: number; text: string }>>([]);
  const [, forceTick] = useState(0);

  const themeMode: ThemeMode = settings.theme;
  const effectiveDark = useMemo(() => {
    if (themeMode === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return themeMode === 'dark';
  }, [themeMode]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', effectiveDark ? 'dark' : 'light');
  }, [effectiveDark]);

  // 跟随系统主题变化
  useEffect(() => {
    if (themeMode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => forceTick((x) => x + 1);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [themeMode]);

  const showToast = useCallback((text: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2200);
  }, []);

  const saveSettings = useCallback((s: AppSettings) => {
    setSettings(s);
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* 忽略 */ }
  }, []);

  const toggleTheme = useCallback(() => {
    const next: ThemeMode = effectiveDark ? 'light' : 'dark';
    saveSettings({ ...settings, theme: next });
  }, [effectiveDark, settings, saveSettings]);

  const navigate = useCallback((v: ViewName) => {
    setView(v);
    if (v !== restore?.toolId) setRestore(null);
  }, [restore]);

  const openTool = useCallback((id: ToolId) => {
    setView(id);
  }, []);



  const handleDelete = useCallback((id: string) => {
    setHistory(removeHistory(id));
  }, []);

  const handleClear = useCallback(() => {
    clearHist();
    setHistory([]);
    showToast('历史记录已清空');
  }, [showToast]);

  const handleLoadRecord = useCallback((r: HistoryRecord) => {
    setRestore({ toolId: r.toolId, inputs: r.inputs });
    setView(r.toolId);
  }, []);

  const handleRestored = useCallback(() => setRestore(null), []);

  // 每次计算成功时 touchUsage 已调用;此处基于 usage 计算最近/常用
  const [usageVersion, setUsageVersion] = useState(0);
  const usage = useMemo(() => getUsage(), [usageVersion]);
  const recentIds = useMemo(() => recent(usage, 4), [usage]);
  const popularIds = useMemo(() => pop(usage, 4), [usage]);

  // 当保存记录时刷新 usage 统计
  const handleSave = useCallback((rec: HistoryRecord) => {
    const list = addHistory(rec);
    setHistory(list);
    setUsageVersion((v) => v + 1);
    showToast('已保存到历史记录');
  }, [showToast]);

  const digits = settings.digits;

  const toolProps = {
    digits,
    preset: null as Record<string, string> | null,
    onRestored: handleRestored,
    onSave: handleSave,
    onToast: showToast,
  };

  const v = VIEW_TITLES[view];

  return (
    <div className="app">
      <Sidebar view={view} onNavigate={navigate} onToggleTheme={toggleTheme} dark={effectiveDark} />
      <div className="main">
        <TopBar title={v.title} desc={v.desc} dark={effectiveDark} onToggleTheme={toggleTheme} />
        <div className="content">
          <div className="view">
            {view === 'dashboard' && (
              <Dashboard
                history={history}
                recentIds={recentIds}
                popularIds={popularIds}
                onOpenTool={openTool}
                onLoadRecord={handleLoadRecord}
                onViewHistory={() => setView('history')}
              />
            )}
            {view === 'cylinder' && (
              <CylinderForceTool {...toolProps} preset={restore?.toolId === 'cylinder' ? restore.inputs : null} />
            )}
            {view === 'bolt' && (
              <BoltPreloadTool {...toolProps} preset={restore?.toolId === 'bolt' ? restore.inputs : null} />
            )}
            {view === 'shaft' && (
              <ShaftDiameterTool {...toolProps} preset={restore?.toolId === 'shaft' ? restore.inputs : null} />
            )}
            {view === 'flange' && (
              <FlangeBoltTool {...toolProps} preset={restore?.toolId === 'flange' ? restore.inputs : null} />
            )}
            {view === 'vessel' && (
              <VesselTool {...toolProps} preset={restore?.toolId === 'vessel' ? restore.inputs : null} />
            )}
            {view === 'convert' && <UnitConverter />}
            {view === 'history' && (
              <HistoryView history={history} onDelete={handleDelete} onClear={handleClear} onLoad={handleLoadRecord} />
            )}
            {view === 'settings' && (
              <SettingsView settings={settings} onSettings={saveSettings} onClearHistory={handleClear} />
            )}
          </div>
        </div>
      </div>
      <Toast items={toasts} />
    </div>
  );
}
