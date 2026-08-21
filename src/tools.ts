// 工具元数据(导航、卡片、最近使用等共用)
import type { ToolId } from './types';
import { IconPiston, IconBolt, IconShaft, IconFlange, IconVessel, type IconProps } from './components/icons';

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
];

export function getTool(id: ToolId): ToolMeta {
  return TOOLS.find((t) => t.id === id) ?? TOOLS[0];
}
