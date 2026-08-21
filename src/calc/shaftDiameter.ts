// 轴径计算(按扭转强度)
// 公式:τ_max = T / W_p ≤ [τ] ,实心圆轴 W_p = (π/16)·d³
//       → d ≥ ³√(16·T / (π·[τ]))
// 若由功率计算扭矩:T = 9550 × P / n  (P 为 kW,n 为 rpm,T 为 N·m)
import type { CalcOption, CalcOutcome } from '../types';
import { fmtNum } from '../lib/format';

export interface ShaftInput {
  mode: 'torque' | 'power';
  torque: number | null;   // N·m
  power: number | null;    // kW
  speed: number | null;    // rpm
  tau: number | null;      // 许用扭应力 MPa
  safety: number | null;   // 安全系数
}

export const SHAFT_DEFAULTS: ShaftInput = {
  mode: 'torque',
  torque: 200,
  power: null,
  speed: null,
  tau: 30,
  safety: 1.5,
};

/** 常用标准轴径系列(优先取上一档) */
export const STD_SHAFT_DIAMETERS = [
  6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 25, 28, 30, 32, 35, 36, 38, 40, 42,
  45, 48, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 110, 120, 130, 140,
  150, 160, 180, 200, 220, 240, 260, 280, 300,
];

export function roundUpToStandard(d: number): number {
  for (const s of STD_SHAFT_DIAMETERS) {
    if (s >= d) return s;
  }
  return d;
}

export function calcShaft(input: ShaftInput, opt: CalcOption = { digits: 2 }): CalcOutcome {
  const { mode, torque, power, speed, tau, safety } = input;
  const fe: Record<string, string> = {};

  if (mode === 'torque') {
    if (torque == null || Number.isNaN(torque)) fe.torque = '请输入扭矩';
    else if (torque < 0) fe.torque = '扭矩不能为负';
  } else {
    if (power == null || Number.isNaN(power)) fe.power = '请输入功率';
    else if (power <= 0) fe.power = '功率必须大于 0';
    if (speed == null || Number.isNaN(speed)) fe.speed = '请输入转速';
    else if (speed <= 0) fe.speed = '转速必须大于 0';
  }
  if (tau == null || Number.isNaN(tau)) fe.tau = '请输入许用扭应力';
  else if (tau <= 0) fe.tau = '许用应力必须大于 0';
  if (safety == null || Number.isNaN(safety)) fe.safety = '请输入安全系数';
  else if (safety < 1) fe.safety = '安全系数不应小于 1';
  if (Object.keys(fe).length) return { ok: false, fieldErrors: fe };

  // 扭矩来源
  let T = 0; // N·m
  let torqueNote = '';
  if (mode === 'torque') {
    T = torque as number;
    torqueNote = `已知扭矩 T = ${fmtNum(T, opt.digits)} N·m`;
  } else {
    T = (9549.3 * (power as number)) / (speed as number);
    torqueNote = `T = 9550·P/n = 9550 × ${fmtNum(power as number, opt.digits)} / ${fmtNum(speed as number, opt.digits)} = ${fmtNum(T, opt.digits)} N·m`;
  }

  const Tmm = T * 1000;             // N·mm
  const tauDesign = (tau as number) / (safety as number); // MPa
  const dMin = Math.cbrt((16 * Tmm) / (Math.PI * tauDesign)); // mm
  const dRec = roundUpToStandard(dMin);
  const tauActual = (16 * Tmm) / (Math.PI * Math.pow(dRec, 3)); // MPa

  const fmt = (n: number) => fmtNum(n, opt.digits);

  const steps = [
    torqueNote,
    `[τ]设计 = [τ] / S = ${fmt(tau as number)} / ${fmt(safety as number)} = ${fmt(tauDesign)} MPa`,
    `W_p = (π/16)·d³,由 τ = T/W_p ≤ [τ] 得:d ≥ ³√(16·T/(π·[τ]))`,
    `d_min = ³√(16 × ${fmt(Tmm)} / (π × ${fmt(tauDesign)})) = ${fmt(dMin)} mm`,
    `取标准直径 d = ${fmt(dRec)} mm(≥ ${fmt(dMin)} mm)`,
    `校核:τ = 16T/(π·d³) = ${fmt(tauActual)} MPa ≤ ${fmt(tauDesign)} MPa ✓`,
  ];

  return {
    ok: true,
    result: {
      formula: 'd ≥ ³√(16·T / (π·[τ]设计)) ,其中 [τ]设计 = [τ]/S',
      formulaAlt: 'τ_max = 16·T/(π·d³) ≤ [τ];T = 9550·P/n (kW·rpm→N·m)',
      steps,
      results: [
        { label: '设计扭矩 T', value: fmt(T), unit: 'N·m' },
        { label: '许用扭应力 [τ]设计', value: fmt(tauDesign), unit: 'MPa' },
        { label: '最小轴径 d_min', value: fmt(dMin), unit: 'mm', primary: true },
        { label: '推荐轴径(标准系列)', value: fmt(dRec), unit: 'mm', primary: true },
        { label: '实际最大扭应力 τ', value: fmt(tauActual), unit: 'MPa' },
      ],
      note: '本计算仅按纯扭转强度确定直径,未计弯矩、键槽削弱、轴肩应力集中与疲劳。承受弯曲的轴应按弯扭合成(第三或第四强度理论)校核;高速轴还应校核临界转速。',
      disclaimer: true,
    },
  };
}

export function shaftCopyText(input: ShaftInput, digits = 2): string {
  const fmt = (n: number) => fmtNum(n, digits);
  const o = calcShaft(input, { digits });
  if (!o.result) return '';
  const r = o.result;
  return [
    '【轴径计算(扭转强度)】',
    `计算方式: ${input.mode === 'torque' ? '已知扭矩' : '已知功率+转速'}`,
    ...(input.mode === 'torque'
      ? [`扭矩 T = ${fmt(input.torque ?? 0)} N·m`]
      : [`功率 P = ${fmt(input.power ?? 0)} kW,转速 n = ${fmt(input.speed ?? 0)} rpm`]),
    `许用扭应力 [τ] = ${fmt(input.tau ?? 0)} MPa,安全系数 S = ${fmt(input.safety ?? 0)}`,
    '',
    `公式: ${r.formula}`,
    '',
    ...r.steps.map((s, i) => `${i + 1}. ${s}`),
    '',
    ...r.results.map((x) => `${x.label}: ${x.value}${x.unit ? ' ' + x.unit : ''}`),
  ].join('\n');
}
