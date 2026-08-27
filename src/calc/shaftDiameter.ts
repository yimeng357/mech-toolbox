// 轴径计算(扭转强度 / 可选弯扭合成)
// 基础公式(纯扭转):τ_max = T / W_p ≤ [τ] ,实心圆轴 W_p = (π/16)·d³
//       → d ≥ ³√(16·T / (π·[τ]))
// 若由功率计算扭矩:T = 9550 × P / n  (P 为 kW,n 为 rpm,T 为 N·m)
//
// 工程增强项(均为可选输入):
//   · 键槽削弱系数 K_w:无键槽 1 / 单键槽约 0.85 / 双键槽约 0.75,有效截面系数按 K_w 折减;
//   · 空心轴内外径比 α = di/do,抗扭截面系数按 (1−α⁴) 折减;
//   · 弯矩 M 输入时按第三强度理论弯扭合成(当量弯矩法):
//       Me = √(M² + (α_t·T)²),α_t ≈ 0.6(扭转切应力按脉动循环折算)
//       d ≥ ³√(32·Me / (π·[σb]·K_w·(1−α⁴)))
import type { CalcOption, CalcOutcome } from '../types';
import { fmtNum } from '../lib/format';

export interface ShaftInput {
  mode: 'torque' | 'power';
  torque: number | null;   // N·m
  power: number | null;    // kW
  speed: number | null;    // rpm
  tau: number | null;      // 许用扭应力 MPa
  safety: number | null;   // 安全系数
  bendingMoment?: number | null; // 弯矩 M, N·m(可选,>0 时启用弯扭合成)
  sigmaB?: number | null;        // 许用弯应力 [σ-1b], MPa(可选,M 输入时使用;缺省自动取 60)
  keywayFactor?: number | null;  // 键槽削弱系数 K_w(0<K_w≤1,默认 1)
  hollowRatio?: number | null;   // 空心轴内外径比 α = di/do([0,0.9),默认 0 实心)
}

export const SHAFT_DEFAULTS: ShaftInput = {
  mode: 'torque',
  torque: 200,
  power: null,
  speed: null,
  tau: 30,
  safety: 1.5,
  bendingMoment: null,
  sigmaB: null,
  keywayFactor: 1,
  hollowRatio: 0,
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

/** 扭转切应力按脉动循环折算系数(当量弯矩法) */
const ALPHA_T = 0.6;

export function calcShaft(input: ShaftInput, opt: CalcOption = { digits: 2 }): CalcOutcome {
  const { mode, torque, power, speed, tau, safety } = input;
  const bendingMoment = input.bendingMoment ?? null;
  const sigmaBIn = input.sigmaB ?? null;
  const keywayFactor = input.keywayFactor ?? 1;
  const hollowRatio = input.hollowRatio ?? 0;

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
  if (bendingMoment != null && (Number.isNaN(bendingMoment) || bendingMoment < 0)) fe.bendingMoment = '弯矩不能为负';
  if (sigmaBIn != null && (Number.isNaN(sigmaBIn) || sigmaBIn <= 0)) fe.sigmaB = '许用弯应力必须大于 0';
  if (Number.isNaN(keywayFactor) || keywayFactor <= 0 || keywayFactor > 1) fe.keywayFactor = '键槽系数应在 0~1 之间(无键槽取 1)';
  if (hollowRatio != null && (Number.isNaN(hollowRatio) || hollowRatio < 0 || hollowRatio >= 0.9)) fe.hollowRatio = '内外径比应在 0~0.9 之间';
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

  const fmt = (n: number) => fmtNum(n, opt.digits);
  const Tmm = T * 1000;                                   // N·mm
  const tauDesign = (tau as number) / (safety as number); // MPa
  const Kw = keywayFactor;                                // 键槽削弱系数
  const alphaH = hollowRatio ?? 0;                        // 内外径比
  const hollowTerm = 1 - Math.pow(alphaH, 4);             // 空心折减 (1−α⁴)
  const sigmaBv = sigmaBIn ?? 60;                         // 许用弯应力(缺省 60 MPa,对应常用 45 钢调质脉动弯曲)

  const sectionNote = [
    Kw !== 1 ? `K_w=${fmt(Kw)}` : null,
    alphaH > 0 ? `(1−α⁴)=${fmt(hollowTerm)}` : null,
  ].filter(Boolean).join(' · ');

  // 纯扭转最小轴径
  const dMinTorsion = Math.cbrt((16 * Tmm) / (Math.PI * tauDesign * Kw * hollowTerm)); // mm

  // 弯扭合成(当量弯矩法,第三强度理论)
  let Me: number | null = null;       // N·mm
  let dMinSynthesis: number | null = null;
  if (bendingMoment != null && bendingMoment > 0) {
    const Mmm = bendingMoment * 1000; // N·mm
    Me = Math.sqrt(Mmm * Mmm + Math.pow(ALPHA_T * Tmm, 2));
    dMinSynthesis = Math.cbrt((32 * Me) / (Math.PI * sigmaBv * Kw * hollowTerm));
  }

  const dMin = dMinSynthesis != null ? Math.max(dMinTorsion, dMinSynthesis) : dMinTorsion;
  const dRec = roundUpToStandard(dMin);
  const tauActual = (16 * Tmm) / (Math.PI * Math.pow(dRec, 3) * Kw * hollowTerm); // MPa

  const steps = [
    torqueNote,
    `[τ]设计 = [τ] / S = ${fmt(tau as number)} / ${fmt(safety as number)} = ${fmt(tauDesign)} MPa`,
    ...(sectionNote ? [`截面修正:${sectionNote}(键槽削弱 / 空心轴折减)`] : []),
    `W_p = (π/16)·d³·K_w·(1−α⁴),由 τ = T/W_p ≤ [τ] 得:d ≥ ³√(16·T/(π·[τ]·K_w·(1−α⁴)))`,
    `d_min(扭转) = ³√(16 × ${fmt(Tmm)} / (π × ${fmt(tauDesign)}${sectionNote ? ' × 截面修正' : ''})) = ${fmt(dMinTorsion)} mm`,
    ...(dMinSynthesis != null && Me != null
      ? [
          `弯扭合成:Me = √(M² + (0.6·T)²) = √(${fmt(bendingMoment as number * 1000)}² + (${fmt(ALPHA_T * Tmm)})²) = ${fmt(Me)} N·mm`,
          `d_min(合成,[σb]=${fmt(sigmaBv)} MPa) = ³√(32·Me/(π·[σb]·K_w·(1−α⁴))) = ${fmt(dMinSynthesis)} mm`,
          `取两者较大值:d_min = max(${fmt(dMinTorsion)}, ${fmt(dMinSynthesis)}) = ${fmt(dMin)} mm`,
        ]
      : []),
    `取标准直径 d = ${fmt(dRec)} mm(≥ ${fmt(dMin)} mm)`,
    `校核:τ = 16T/(π·d³·K_w·(1−α⁴)) = ${fmt(tauActual)} MPa ≤ ${fmt(tauDesign)} MPa ✓`,
  ];

  return {
    ok: true,
    result: {
      formula: 'd ≥ ³√(16·T / (π·[τ]设计·K_w·(1−α⁴))) ,其中 [τ]设计 = [τ]/S',
      formulaAlt:
        dMinSynthesis != null
          ? '弯扭合成:Me = √(M²+(0.6T)²),d ≥ ³√(32·Me/(π·[σb]·K_w·(1−α⁴)))'
          : 'τ_max = 16·T/(π·d³·K_w·(1−α⁴)) ≤ [τ];T = 9550·P/n (kW·rpm→N·m)',
      steps,
      results: [
        { label: '设计扭矩 T', value: fmt(T), unit: 'N·m' },
        { label: '许用扭应力 [τ]设计', value: fmt(tauDesign), unit: 'MPa' },
        { label: '最小轴径 d_min', value: fmt(dMin), unit: 'mm', primary: true },
        { label: '推荐轴径(标准系列)', value: fmt(dRec), unit: 'mm', primary: true },
        { label: '实际最大扭应力 τ', value: fmt(tauActual), unit: 'MPa' },
        ...(Me != null && dMinSynthesis != null
          ? [
              { label: '当量弯矩 Me', value: fmt(Me / 1000), unit: 'N·m' },
              { label: `合成最小轴径([σb]=${fmt(sigmaBv)})`, value: fmt(dMinSynthesis), unit: 'mm' },
              { label: '控制工况', value: dMinSynthesis >= dMinTorsion ? '弯扭合成控制' : '扭转控制' },
            ]
          : []),
        ...(sectionNote ? [{ label: '截面修正', value: sectionNote, unit: '' }] : []),
      ],
      note: `已考虑${[
        Kw !== 1 ? '键槽削弱' : null,
        alphaH > 0 ? '空心轴折减' : null,
        dMinSynthesis != null ? '弯扭合成(第三强度理论)' : null,
      ].filter(Boolean).join('、') || ''}。未计轴肩应力集中与疲劳安全系数校核;高速轴还应校核临界转速。许用弯应力缺省 60 MPa(约对应 45 钢调质脉动弯曲),重要轴请按疲劳精确校核。`,
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
    '【轴径计算】',
    `计算方式: ${input.mode === 'torque' ? '已知扭矩' : '已知功率+转速'}`,
    ...(input.mode === 'torque'
      ? [`扭矩 T = ${fmt(input.torque ?? 0)} N·m`]
      : [`功率 P = ${fmt(input.power ?? 0)} kW,转速 n = ${fmt(input.speed ?? 0)} rpm`]),
    ...(input.bendingMoment != null && input.bendingMoment > 0
      ? [`弯矩 M = ${fmt(input.bendingMoment)} N·m,许用弯应力 [σb] = ${fmt(input.sigmaB ?? 60)} MPa`]
      : []),
    `许用扭应力 [τ] = ${fmt(input.tau ?? 0)} MPa,安全系数 S = ${fmt(input.safety ?? 0)}`,
    `键槽削弱系数 K_w = ${fmt(input.keywayFactor ?? 1)},空心轴内外径比 α = ${fmt(input.hollowRatio ?? 0)}`,
    '',
    `公式: ${r.formula}`,
    '',
    ...r.steps.map((s, i) => `${i + 1}. ${s}`),
    '',
    ...r.results.map((x) => `${x.label}: ${x.value}${x.unit ? ' ' + x.unit : ''}`),
  ].join('\n');
}
