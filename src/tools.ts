// 工具元数据(导航、卡片、最近使用等共用)
import type { ToolId } from './types';
import { IconPiston, IconBolt, IconShaft, IconFlange, IconVessel, IconBelt, IconPump, IconAccumulator, IconTolerance, IconMotor, IconPressure, IconBooster, IconSafety, IconGas, IconFlow, IconPipe, IconColumn, type IconProps } from './components/icons';

export interface ToolMeta {
  id: ToolId;
  name: string;
  desc: string;
  formula: string;
  icon: (p: IconProps) => React.ReactElement;
}

export const TOOLS: ToolMeta[] = [
  {
    id: 'cylinder',
    name: '气缸推力',
    desc: '由缸径、杆径与工作压力计算理论推力/拉力,单位自动换算。',
    formula: 'F = p·(π/4)·D²',
    icon: IconPiston,
  },
  {
    id: 'bolt',
    name: '螺栓预紧力',
    desc: '由拧紧扭矩与扭矩系数估算预紧力,校核螺栓轴向应力。',
    formula: 'T = K·F·d',
    icon: IconBolt,
  },
  {
    id: 'shaft',
    name: '轴径计算',
    desc: '按扭转强度由扭矩/功率、转速与许用应力计算推荐轴径。',
    formula: 'd ≥ ³√(16T/π[τ])',
    icon: IconShaft,
  },
  {
    id: 'flange',
    name: '法兰螺栓',
    desc: '估算内压引起的总分离力与单个螺栓平均载荷及受力。',
    formula: 'F = p·(π/4)·Dg²',
    icon: IconFlange,
  },
  {
    id: 'vessel',
    name: '超高压缸筒',
    desc: '600 MPa 级超高压缸筒设计,双层缩套 / 钢丝缠绕方案与过盈量计算。',
    formula: 'σe ≤ [σ] · 预紧降内壁应力',
    icon: IconVessel,
  },
  {
    id: 'belt',
    name: '同步带与 V 带',
    desc: '带传动选型:节线长、中心距、包角与张紧轴力计算。',
    formula: 'Lp ≈ 2a + (π/2)(d₁+d₂) + (d₂−d₁)²/4a',
    icon: IconBelt,
  },
  {
    id: 'pump',
    name: '液压泵电机匹配',
    desc: '泵排量、轴功率、驱动扭矩与标准电机功率等级选型。',
    formula: 'P = (p·Q) / (600·ηt)',
    icon: IconPump,
  },
  {
    id: 'accumulator',
    name: '液压蓄能器',
    desc: '蓄能器公称容积、充气压力与压缩比校核。',
    formula: 'V₀ = ΔV / [(p₀/p₁)^(1/n) − (p₀/p₂)^(1/n)]',
    icon: IconAccumulator,
  },
  {
    id: 'pipe-loss',
    name: '管路压力损失',
    desc: '沿程阻力与局部损失压降、雷诺数流态判定与流速校核。',
    formula: 'Δp = (λ·L/d + Σζ)·ρv²/2',
    icon: IconPipe,
  },
  {
    id: 'rod-buckling',
    name: '液压缸压杆稳定',
    desc: '活塞杆柔度、临界失稳力校核(欧拉/约翰逊),含端部约束系数。',
    formula: 'Fcr = π²EI/(μL)² · λ = μL/i',
    icon: IconColumn,
  },
  {
    id: 'tolerance',
    name: 'ISO 公差配合',
    desc: 'ISO 286 孔轴极限偏差查询与配合性质(间隙 / 过盈)判定。',
    formula: 'ES/EI · es/ei → X / Y',
    icon: IconTolerance,
  },
  {
    id: 'motor',
    name: '电机选型',
    desc: '丝杠 / 带传动负载惯量折算、峰值扭矩与惯量比校核。',
    formula: 'T = T_L + T_a · JL/Jm',
    icon: IconMotor,
  },
  // 高压系统专属工具
  {
    id: 'lame-cylinder',
    name: '厚壁圆筒与爆破压力',
    desc: '超高压圆筒 Lamé 应力分布、初始屈服与 Faupel 爆破压力。',
    formula: 'σt = Pi·(K²+1)/(K²-1) · σv = √3·K²·Pi/(K²-1)',
    icon: IconPressure,
  },
  {
    id: 'gas-booster',
    name: '气动增压器与充气耗时',
    desc: '气体增压器失速压力、变背压充气时间积分与驱动耗气量。',
    formula: 'Pstall = i·PL + Pin · 充气时间 = ∫dP·V/(Q(P)·1.013)',
    icon: IconBooster,
  },
  {
    id: 'pneumatic-energy',
    name: '气压试验爆破储能与安全距离',
    desc: 'ASME PCC-2 压缩气体膨胀能、TNT 当量与安全隔离半径。',
    formula: 'E = [P1·V/(k-1)] × [1-(Pa/P1)^((k-1)/k)]',
    icon: IconSafety,
  },
  {
    id: 'real-gas',
    name: '高压真实气体 Z 因子与储气量',
    desc: '200~1000 bar 氮气/氢气实际压缩因子、密度与储气质量。',
    formula: 'Z = f(Pr, Tr) · ρ = P·M/(Z·R·T)',
    icon: IconGas,
  },
  {
    id: 'choked-flow',
    name: '高压孔口临界节流与微泄漏',
    desc: '音速临界流判定、孔板排量、微泄漏率与喷射反冲力。',
    formula: 'qm = Cd·A·P1·√[(k·M/(R·T1))·(2/(k+1))^((k+1)/(k-1))]',
    icon: IconFlow,
  },
];

export function getTool(id: ToolId): ToolMeta {
  return TOOLS.find((t) => t.id === id) ?? TOOLS[0];
}

/** 工具按专业方向分组(侧边栏导航与首页卡片共用);ids 必须覆盖全部工具且不重复 */
export interface ToolGroupMeta {
  name: string;
  /** 分组主题色(hex):侧边栏圆点、激活态与首页卡片图标 */
  accent: string;
  /** 主题色低透明度底(卡片图标背景) */
  accentSoft: string;
  /** 主题色辉光(active 阴影 / hover 光晕) */
  accentGlow: string;
  tools: ToolMeta[];
}

export const TOOL_GROUPS: ToolGroupMeta[] = [
  {
    name: '液压系统',
    accent: '#3b82f6',
    accentSoft: 'rgba(59, 130, 246, 0.13)',
    accentGlow: 'rgba(59, 130, 246, 0.42)',
    tools: (['cylinder', 'pump', 'accumulator', 'pipe-loss', 'rod-buckling'] as ToolId[]).map(getTool),
  },
  {
    name: '气动与高压气体',
    accent: '#8b5cf6',
    accentSoft: 'rgba(139, 92, 246, 0.13)',
    accentGlow: 'rgba(139, 92, 246, 0.42)',
    tools: (['gas-booster', 'pneumatic-energy', 'real-gas', 'choked-flow'] as ToolId[]).map(getTool),
  },
  {
    name: '超高压容器',
    accent: '#f43f5e',
    accentSoft: 'rgba(244, 63, 94, 0.12)',
    accentGlow: 'rgba(244, 63, 94, 0.40)',
    tools: (['vessel', 'lame-cylinder'] as ToolId[]).map(getTool),
  },
  {
    name: '结构与连接',
    accent: '#f59e0b',
    accentSoft: 'rgba(245, 158, 11, 0.14)',
    accentGlow: 'rgba(245, 158, 11, 0.40)',
    tools: (['bolt', 'flange', 'shaft', 'tolerance'] as ToolId[]).map(getTool),
  },
  {
    name: '传动与电机',
    accent: '#14b8a6',
    accentSoft: 'rgba(20, 184, 166, 0.14)',
    accentGlow: 'rgba(20, 184, 166, 0.40)',
    tools: (['belt', 'motor'] as ToolId[]).map(getTool),
  },
];
