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
import { ErrorBoundary } from './components/ErrorBoundary';
import { CylinderForceTool } from './tools/CylinderForceTool';
import { BoltPreloadTool } from './tools/BoltPreloadTool';
import { ShaftDiameterTool } from './tools/ShaftDiameterTool';
import { FlangeBoltTool } from './tools/FlangeBoltTool';
import { VesselTool } from './tools/VesselTool';
import { BeltDriveTool } from './tools/BeltDriveTool';
import { HydraulicPumpMotorTool } from './tools/HydraulicPumpMotorTool';
import { AccumulatorTool } from './tools/AccumulatorTool';
import { PipeLossTool } from './tools/PipeLossTool';
import { CylinderBucklingTool } from './tools/CylinderBucklingTool';
import { IsoToleranceTool } from './tools/IsoToleranceTool';
import { MotorSizingTool } from './tools/MotorSizingTool';
import { LameCylinderTool } from './tools/LameCylinderTool';
import { GasBoosterTool } from './tools/GasBoosterTool';
import { PneumaticTestEnergyTool } from './tools/PneumaticTestEnergyTool';
import { RealGasTool } from './tools/RealGasTool';
import { ChokedFlowTool } from './tools/ChokedFlowTool';
import { BearingLifeTool } from './tools/BearingLifeTool';
import { BallScrewTool } from './tools/BallScrewTool';
import { GearStrengthTool } from './tools/GearStrengthTool';
import { SpringTool } from './tools/SpringTool';
import { WeldTool } from './tools/WeldTool';
import { KeyJointTool } from './tools/KeyJointTool';

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
  belt: { title: '同步带与 V 带', desc: '带传动选型:节线长、中心距、包角与张紧轴力' },
  pump: { title: '液压泵电机匹配', desc: '泵排量、轴功率与标准电机功率等级选型' },
  accumulator: { title: '液压蓄能器', desc: '公称容积、充气压力与压缩比校核' },
  'pipe-loss': { title: '管路压力损失', desc: '沿程与局部压降、流态判定与流速校核' },
  'rod-buckling': { title: '液压缸压杆稳定', desc: '活塞杆柔度、临界失稳力与安全系数校核' },
  tolerance: { title: 'ISO 公差配合', desc: '孔轴极限偏差与配合间隙 / 过盈查询' },
  motor: { title: '电机选型', desc: '负载惯量折算、峰值扭矩与惯量比校核' },
  'lame-cylinder': { title: '厚壁圆筒与爆破压力', desc: 'Lamé 应力分布、初始屈服与 Faupel 爆破压力' },
  'gas-booster': { title: '气动增压器与充气耗时', desc: '失速压力、变背压充气时间积分与驱动耗气量' },
  'pneumatic-energy': { title: '气压试验爆破储能', desc: 'ASME PCC-2 压缩气体膨胀能、TNT 当量与安全距离' },
  'real-gas': { title: '高压真实气体 Z 因子', desc: '200~1000 bar 实际压缩因子、密度与储气质量' },
  'choked-flow': { title: '高压孔口临界节流', desc: '音速临界流判定、孔板排量、微泄漏率与喷射反冲力' },
  bearing: { title: '滚动轴承寿命', desc: '当量动载荷、L10h 寿命与目标寿命反算额定动载荷' },
  'ball-screw': { title: '滚珠丝杠寿命', desc: '工况分段当量载荷、额定/行程寿命与 dn 值限速校核' },
  gear: { title: '齿轮强度', desc: '直齿圆柱齿轮接触/弯曲强度校核(选型级)' },
  spring: { title: '压缩弹簧设计', desc: '刚度、应力、稳定性与压井高度校核' },
  weld: { title: '焊缝强度', desc: '角焊缝/对接焊缝静载承载校核' },
  'key-joint': { title: '键/花键校核', desc: '平键挤压剪切与花键挤压应力校核' },
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
  // 系统主题切换时递增，驱动下方 effectiveDark 重算（useMemo 依赖它才能感知 matchMedia 变化）
  const [systemThemeTick, forceTick] = useState(0);

  const themeMode: ThemeMode = settings.theme;
  const effectiveDark = useMemo(() => {
    if (themeMode === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return themeMode === 'dark';
  }, [themeMode, systemThemeTick]);

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

  // touchUsage 在每次计算时写入 localStorage；回到首页时刷新快照，保证「最近/常用」及时反映
  const [usageVersion, setUsageVersion] = useState(0);
  useEffect(() => {
    if (view === 'dashboard') setUsageVersion((v) => v + 1);
  }, [view]);
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

  // 每个视图单独包裹错误边界:单个视图异常不影响导航与其他功能
  const guarded = (id: ViewName, node: React.ReactElement) => (
    <ErrorBoundary key={id} name={VIEW_TITLES[id]?.title}>{node}</ErrorBoundary>
  );


  return (
    <div className="app">
      <Sidebar view={view} onNavigate={navigate} onToggleTheme={toggleTheme} dark={effectiveDark} />
      <div className="main">
        <TopBar title={v.title} desc={v.desc} dark={effectiveDark} onToggleTheme={toggleTheme} />
        <div className="content">
          <div className="view">
            {view === 'dashboard' && guarded('dashboard',
              <Dashboard
                history={history}
                recentIds={recentIds}
                popularIds={popularIds}
                onOpenTool={openTool}
                onLoadRecord={handleLoadRecord}
                onViewHistory={() => setView('history')}
              />
            )}
            {view === 'cylinder' && guarded('cylinder',
              <CylinderForceTool {...toolProps} preset={restore?.toolId === 'cylinder' ? restore.inputs : null} />,
            )}
            {view === 'bolt' && guarded('bolt', 
              <BoltPreloadTool {...toolProps} preset={restore?.toolId === 'bolt' ? restore.inputs : null} />,
            )}
            {view === 'shaft' && guarded('shaft', 
              <ShaftDiameterTool {...toolProps} preset={restore?.toolId === 'shaft' ? restore.inputs : null} />,
            )}
            {view === 'flange' && guarded('flange', 
              <FlangeBoltTool {...toolProps} preset={restore?.toolId === 'flange' ? restore.inputs : null} />,
            )}
            {view === 'vessel' && guarded('vessel', 
              <VesselTool {...toolProps} preset={restore?.toolId === 'vessel' ? restore.inputs : null} />,
            )}
            {view === 'belt' && guarded('belt', 
              <BeltDriveTool {...toolProps} preset={restore?.toolId === 'belt' ? restore.inputs : null} />,
            )}
            {view === 'pump' && guarded('pump', 
              <HydraulicPumpMotorTool {...toolProps} preset={restore?.toolId === 'pump' ? restore.inputs : null} />,
            )}
            {view === 'accumulator' && guarded('accumulator', 
              <AccumulatorTool {...toolProps} preset={restore?.toolId === 'accumulator' ? restore.inputs : null} />,
            )}
            {view === 'pipe-loss' && guarded('pipe-loss', 
              <PipeLossTool {...toolProps} preset={restore?.toolId === 'pipe-loss' ? restore.inputs : null} />,
            )}
            {view === 'rod-buckling' && guarded('rod-buckling', 
              <CylinderBucklingTool {...toolProps} preset={restore?.toolId === 'rod-buckling' ? restore.inputs : null} />,
            )}
            {view === 'tolerance' && guarded('tolerance', 
              <IsoToleranceTool {...toolProps} preset={restore?.toolId === 'tolerance' ? restore.inputs : null} />,
            )}
            {view === 'motor' && guarded('motor', 
              <MotorSizingTool {...toolProps} preset={restore?.toolId === 'motor' ? restore.inputs : null} />,
            )}
            {view === 'lame-cylinder' && guarded('lame-cylinder', 
              <LameCylinderTool {...toolProps} preset={restore?.toolId === 'lame-cylinder' ? restore.inputs : null} />,
            )}
            {view === 'gas-booster' && guarded('gas-booster', 
              <GasBoosterTool {...toolProps} preset={restore?.toolId === 'gas-booster' ? restore.inputs : null} />,
            )}
            {view === 'pneumatic-energy' && guarded('pneumatic-energy', 
              <PneumaticTestEnergyTool {...toolProps} preset={restore?.toolId === 'pneumatic-energy' ? restore.inputs : null} />,
            )}
            {view === 'real-gas' && guarded('real-gas', 
              <RealGasTool {...toolProps} preset={restore?.toolId === 'real-gas' ? restore.inputs : null} />,
            )}
            {view === 'choked-flow' && guarded('choked-flow',
              <ChokedFlowTool {...toolProps} preset={restore?.toolId === 'choked-flow' ? restore.inputs : null} />,
            )}
            {view === 'bearing' && guarded('bearing',
              <BearingLifeTool {...toolProps} preset={restore?.toolId === 'bearing' ? restore.inputs : null} />,
            )}
            {view === 'ball-screw' && guarded('ball-screw',
              <BallScrewTool {...toolProps} preset={restore?.toolId === 'ball-screw' ? restore.inputs : null} />,
            )}
            {view === 'gear' && guarded('gear',
              <GearStrengthTool {...toolProps} preset={restore?.toolId === 'gear' ? restore.inputs : null} />,
            )}
            {view === 'spring' && guarded('spring',
              <SpringTool {...toolProps} preset={restore?.toolId === 'spring' ? restore.inputs : null} />,
            )}
            {view === 'weld' && guarded('weld',
              <WeldTool {...toolProps} preset={restore?.toolId === 'weld' ? restore.inputs : null} />,
            )}
            {view === 'key-joint' && guarded('key-joint',
              <KeyJointTool {...toolProps} preset={restore?.toolId === 'key-joint' ? restore.inputs : null} />,
            )}
            {view === 'convert' && guarded('convert', <UnitConverter />)}
            {view === 'history' && guarded('history',
              <HistoryView history={history} onDelete={handleDelete} onClear={handleClear} onLoad={handleLoadRecord} />
            )}
            {view === 'settings' && guarded('settings',
              <SettingsView settings={settings} onSettings={saveSettings} onClearHistory={handleClear} />
            )}
          </div>
        </div>
      </div>
      <Toast items={toasts} />
    </div>
  );
}
