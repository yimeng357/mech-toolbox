// 同步带与 V 带传动计算(几何 + 容量校核)
// 几何部分:机械设计手册带传动章节的简化计算方法:
//   设计功率 Pd = P × KA(工况系数)
//   初算节线长 Lp0 ≈ 2a0 + (π/2)(d1+d2) + (d2−d1)2/(4a0)
//   实际中心距 a = [b + √(b2 − 2(d2−d1)2)] / 4, b = Lp − (π/2)(d1+d2)
//   小带轮包角 α1 = 180° − 57.3°×(d2−d1)/a
//   带速 v = π·d1·n1/60000, 有效圆周力 Fe = 1000·Pd/v
//   轴作用力 Fr ≈ Fe × 系数 × sin(α1/2)(同步带取 1.2、V 带取 2.2,含初张紧)
// 容量校核(同步带):经典梯形齿带额定功率法(Machinery's Handbook / RoyMech 整理)
//   Zc = d1·(n1/1000)/25.4
//   Pr(基准宽) = 0.746·Zc·(a − b·Zc2),XL/L/H/XH/XXH 各有系数
//   [P] = Pr × 宽度系数 × 啮合系数(啮合齿数 6+:1.0 / 5:0.8 / 4:0.6 / 3:0.4 / 2:0.2)
// 容量校核(V 带):BS 3790 窄 V 带 SPZ/SPA/SPB/SPC 单根基本额定功率典型值 + 双线性插值
//   单根许用 P1 = Pb(d1, n1) × Kα × KL,N = Pd / P1
//   Kα = 1 − 0.003·(180−α1)(180°→1.00,120°→0.82 线性),KL 按基准长度分段插值
import type { CalcOption, CalcOutcome } from '../types';
import { fmtNum } from '../lib/format';

export type BeltType = 'TIMING' | 'V_BELT';

/** 同步带带型(经典梯形齿,GB/T 11361 / ISO 5296) */
export type TimingSection = 'MXL' | 'XL' | 'L' | 'H' | 'XH' | 'XXH';

/** V 带带型(窄 V 带,BS 3790 / GB/T 13575.1 基准宽度制) */
export type VBeltSection = 'SPZ' | 'SPA' | 'SPB' | 'SPC';

export interface TimingSectionSpec {
  /** 节距 mm */
  pitchMm: number;
  /** 额定功率公式基准宽度 mm */
  baseWidthMm: number;
  /** Pr = 0.746·Zc·(coefA − coefB·Zc2);MXL 按扭矩法设计,系数为 0 表示不适用 */
  coefA: number;
  coefB: number;
  /** 可用宽度 → 相对基准宽度的宽度系数 */
  widthFactors: Array<{ widthMm: number; factor: number }>;
  /** 最小推荐带轮齿数 */
  minTeeth: number;
}

/** 经典梯形齿同步带参数(额定功率系数来源:Machinery's Handbook 法,RoyMech 整理) */
export const TIMING_SECTIONS: Record<TimingSection, TimingSectionSpec> = {
  MXL: {
    pitchMm: 2.032, baseWidthMm: 6.35, coefA: 0, coefB: 0,
    widthFactors: [{ widthMm: 3.048, factor: 0.43 }, { widthMm: 4.826, factor: 0.73 }, { widthMm: 6.35, factor: 1.0 }],
    minTeeth: 10,
  },
  XL: {
    pitchMm: 5.08, baseWidthMm: 9.652, coefA: 0.0916, coefB: 7.07e-5,
    widthFactors: [{ widthMm: 6.35, factor: 0.62 }, { widthMm: 9.652, factor: 1.0 }],
    minTeeth: 10,
  },
  L: {
    pitchMm: 9.525, baseWidthMm: 25.4, coefA: 0.436, coefB: 3.01e-4,
    widthFactors: [{ widthMm: 12.7, factor: 0.45 }, { widthMm: 19.05, factor: 0.72 }, { widthMm: 25.4, factor: 1.0 }],
    minTeeth: 12,
  },
  H: {
    pitchMm: 12.7, baseWidthMm: 76.2, coefA: 3.73, coefB: 1.41e-3,
    widthFactors: [
      { widthMm: 19.05, factor: 0.21 }, { widthMm: 25.4, factor: 0.29 }, { widthMm: 38.1, factor: 0.45 },
      { widthMm: 50.8, factor: 0.63 }, { widthMm: 76.2, factor: 1.0 },
    ],
    minTeeth: 14,
  },
  XH: {
    pitchMm: 22.225, baseWidthMm: 101.6, coefA: 7.21, coefB: 4.68e-3,
    widthFactors: [{ widthMm: 50.8, factor: 0.45 }, { widthMm: 76.2, factor: 0.72 }, { widthMm: 101.6, factor: 1.0 }],
    minTeeth: 18,
  },
  XXH: {
    pitchMm: 31.75, baseWidthMm: 127, coefA: 11.4, coefB: 7.81e-3,
    widthFactors: [{ widthMm: 50.8, factor: 0.35 }, { widthMm: 76.2, factor: 0.56 }, { widthMm: 101.6, factor: 0.78 }, { widthMm: 127, factor: 1.0 }],
    minTeeth: 22,
  },
};

export interface VBeltSpec {
  /** 节宽 mm */
  pitchWidthMm: number;
  /** 单位长度质量 kg/m */
  massPerM: number;
  /** 最小带轮基准直径 mm */
  minDiaMm: number;
  /** 基准长度 mm(该长度下 KL = 1) */
  refLengthMm: number;
  /** 长度系数锚点 [长度 mm, KL],含端点与基准点,分段线性插值 */
  lengthFactorAnchors: Array<[number, number]>;
  /** 单根基本额定功率锚点表(小带轮包角 180°,轻载),转速节点 960/1440/2880 rpm */
  powerTable: Array<{ diaMm: number; powers: Record<number, number> }>;
}

/** 窄 V 带参数(基本额定功率典型值来源:BS 3790,RoyMech 整理;中间直径行为线性插值锚点) */
export const V_BELT_SECTIONS: Record<VBeltSection, VBeltSpec> = {
  SPZ: {
    pitchWidthMm: 8.5, massPerM: 0.073, minDiaMm: 63, refLengthMm: 1592,
    lengthFactorAnchors: [[630, 0.83], [1592, 1.0], [3550, 1.17]],
    powerTable: [
      { diaMm: 63, powers: { 960: 0.65, 1440: 0.93, 2880: 1.5 } },
      { diaMm: 67, powers: { 960: 0.77, 1440: 1.05, 2880: 1.75 } },
      { diaMm: 90, powers: { 960: 1.35, 1440: 1.85, 2880: 3.1 } },
      { diaMm: 140, powers: { 960: 2.84, 1440: 4.02, 2880: 6.97 } },
    ],
  },
  SPA: {
    pitchWidthMm: 11, massPerM: 0.129, minDiaMm: 90, refLengthMm: 2278,
    lengthFactorAnchors: [[800, 0.82], [2278, 1.0], [4500, 1.12]],
    powerTable: [
      { diaMm: 90, powers: { 960: 1.55, 1440: 2.05, 2880: 3.4 } },
      { diaMm: 100, powers: { 960: 1.92, 1440: 2.61, 2880: 4.12 } },
      { diaMm: 140, powers: { 960: 3.1, 1440: 4.2, 2880: 6.9 } },
      { diaMm: 200, powers: { 960: 5.3, 1440: 7.4, 2880: 9.4 } },
    ],
  },
  SPB: {
    pitchWidthMm: 14, massPerM: 0.19, minDiaMm: 140, refLengthMm: 3204,
    lengthFactorAnchors: [[1260, 0.85], [3204, 1.0], [8000, 1.15]],
    powerTable: [
      { diaMm: 140, powers: { 960: 3.8, 1440: 5.1, 2880: 8.4 } },
      { diaMm: 160, powers: { 960: 4.8, 1440: 6.5, 2880: 10.6 } },
      { diaMm: 224, powers: { 960: 6.3, 1440: 8.6, 2880: 14.5 } },
      { diaMm: 400, powers: { 960: 22.0, 1440: 25.7, 2880: 29.8 } },
    ],
  },
  SPC: {
    pitchWidthMm: 19, massPerM: 0.33, minDiaMm: 224, refLengthMm: 5070,
    lengthFactorAnchors: [[2000, 0.86], [5070, 1.0], [12500, 1.14]],
    powerTable: [
      { diaMm: 224, powers: { 960: 12.7, 1440: 16.6, 2880: 18.5 } },
      { diaMm: 315, powers: { 960: 20.5, 1440: 27.0, 2880: 32.0 } },
      { diaMm: 400, powers: { 960: 32.0, 1440: 42.0, 2880: 50.0 } },
      { diaMm: 560, powers: { 960: 53.3, 1440: 62.7, 2880: 68.0 } },
    ],
  },
};

export interface BeltDriveInput {
  beltType: BeltType;
  powerKw: number | null;      // 传递功率 P, kW
  speedRpm: number | null;     // 主动轮转速 n1, rpm
  ratio: number | null;        // 传动比 i
  d1: number | null;           // 小带轮节径 d1, mm
  pitch: number | null;        // 同步带节距 pb, mm(未选带型时手填;选带型后以带型为准)
  a0: number | null;           // 初定中心距 a0, mm
  serviceFactor: number | null; // 工况系数 KA
  timingSection?: TimingSection;          // 同步带带型(选后启用容量校核)
  beltWidthMm?: number | null;            // 同步带带宽 mm
  vBeltSection?: VBeltSection;            // V 带带型(选后启用容量校核)
  beltCount?: number | null;              // V 带根数(留空自动计算推荐根数)
}

export const BELT_DRIVE_DEFAULTS: BeltDriveInput = {
  beltType: 'TIMING',
  powerKw: 1.5,
  speedRpm: 1450,
  ratio: 2,
  d1: 60,
  pitch: 5,
  a0: 300,
  serviceFactor: 1.2,
  timingSection: 'XL',
  beltWidthMm: 9.652,
  vBeltSection: undefined,
  beltCount: null,
};

/** 同步带宽度系数:锚点间线性插值;低于最小宽度按比例缩小,超过基准宽按线性外插 */
function timingWidthFactor(spec: TimingSectionSpec, widthMm: number): number {
  const pts = spec.widthFactors;
  if (widthMm <= pts[0].widthMm) return (pts[0].factor * widthMm) / pts[0].widthMm;
  for (let i = 1; i < pts.length; i++) {
    if (widthMm <= pts[i].widthMm) {
      const a = pts[i - 1];
      const b = pts[i];
      return a.factor + ((b.factor - a.factor) * (widthMm - a.widthMm)) / (b.widthMm - a.widthMm);
    }
  }
  return Math.min(1.5, widthMm / spec.baseWidthMm); // 超基准宽按线性外插,上限 1.5
}

/** 啮合系数:6 齿及以上 1.0,以下按表递减 */
function meshFactorOf(meshing: number): number {
  if (meshing >= 6) return 1.0;
  if (meshing === 5) return 0.8;
  if (meshing === 4) return 0.6;
  if (meshing === 3) return 0.4;
  return 0.2;
}

/** V 带单根基本额定功率:直径方向插值后再转速方向插值(两端截断) */
function vBeltBasePower(spec: VBeltSpec, d1: number, n1: number): number {
  const rows = spec.powerTable;
  const rpms = [960, 1440, 2880];
  const interpAt = (row: { powers: Record<number, number> }, rpm: number): number => {
    if (rpm <= rpms[0]) return row.powers[rpms[0]];
    if (rpm >= rpms[2]) return row.powers[rpms[2]];
    const lo = rpm < rpms[1] ? rpms[0] : rpms[1];
    const hi = rpm < rpms[1] ? rpms[1] : rpms[2];
    const vLo = row.powers[lo];
    const vHi = row.powers[hi];
    return vLo + ((vHi - vLo) * (rpm - lo)) / (hi - lo);
  };
  let rowA = rows[0];
  let rowB = rows[0];
  for (let i = 1; i < rows.length; i++) {
    if (d1 <= rows[i].diaMm) {
      rowB = rows[i];
      rowA = rows[i - 1];
      break;
    }
    rowA = rows[i];
    rowB = rows[i];
  }
  const atRpm = (rpm: number) =>
    rowA === rowB
      ? interpAt(rowA, rpm)
      : interpAt(rowA, rpm) + ((interpAt(rowB, rpm) - interpAt(rowA, rpm)) * (d1 - rowA.diaMm)) / (rowB.diaMm - rowA.diaMm);
  return atRpm(n1);
}

/** V 带长度系数:锚点分段线性插值(端点截断) */
function vBeltLengthFactor(spec: VBeltSpec, lengthMm: number): number {
  const a = spec.lengthFactorAnchors;
  if (lengthMm <= a[0][0]) return a[0][1];
  for (let i = 1; i < a.length; i++) {
    if (lengthMm <= a[i][0]) {
      const t = (lengthMm - a[i - 1][0]) / (a[i][0] - a[i - 1][0]);
      return a[i - 1][1] + t * (a[i][1] - a[i - 1][1]);
    }
  }
  return a[a.length - 1][1];
}

/** 包角系数(BS 3790 线性:180°→1.00,120°→0.82) */
export function contactAngleFactor(alphaDeg: number): number {
  return 1 - (180 - alphaDeg) * 0.003;
}

export function calcBeltDrive(input: BeltDriveInput, opt: CalcOption = { digits: 2 }): CalcOutcome {
  const {
    beltType, powerKw, speedRpm, ratio, d1, a0, serviceFactor = 1.2,
    timingSection, beltWidthMm, vBeltSection, beltCount,
  } = input;
  const fe: Record<string, string> = {};

  if (powerKw == null || Number.isNaN(powerKw)) fe.powerKw = '请输入传递功率';
  else if (powerKw <= 0) fe.powerKw = '功率必须大于 0';
  if (speedRpm == null || Number.isNaN(speedRpm)) fe.speedRpm = '请输入主动轮转速';
  else if (speedRpm <= 0) fe.speedRpm = '转速必须大于 0';
  if (ratio == null || Number.isNaN(ratio)) fe.ratio = '请输入传动比';
  else if (ratio <= 0) fe.ratio = '传动比必须大于 0';
  if (d1 == null || Number.isNaN(d1)) fe.d1 = '请输入小带轮节径';
  else if (d1 <= 0) fe.d1 = '节径必须大于 0';
  if (a0 == null || Number.isNaN(a0)) fe.a0 = '请输入初定中心距';
  else if (a0 <= 0) fe.a0 = '中心距必须大于 0';
  if (serviceFactor != null && (Number.isNaN(serviceFactor) || serviceFactor <= 0)) fe.serviceFactor = '工况系数必须大于 0';
  if (timingSection && !(timingSection in TIMING_SECTIONS)) fe.timingSection = '未知同步带带型';
  if (beltType === 'TIMING' && timingSection && (beltWidthMm == null || Number.isNaN(beltWidthMm) || beltWidthMm <= 0)) fe.beltWidthMm = '请输入带宽';
  if (vBeltSection && !(vBeltSection in V_BELT_SECTIONS)) fe.vBeltSection = '未知 V 带带型';
  if (beltCount != null && (Number.isNaN(beltCount) || beltCount < 1 || !Number.isInteger(beltCount))) fe.beltCount = '根数须为 ≥ 1 的整数';
  if (beltType === 'V_BELT' && vBeltSection && d1 != null && d1 > 0 && d1 < V_BELT_SECTIONS[vBeltSection].minDiaMm) {
    fe.d1 = `${vBeltSection} 最小带轮直径 ${V_BELT_SECTIONS[vBeltSection].minDiaMm} mm`;
  }
  // 未选带型时保留原手填节距逻辑
  const pitch = timingSection ? TIMING_SECTIONS[timingSection].pitchMm : (input.pitch ?? 5);
  if (beltType === 'TIMING' && !timingSection && (pitch == null || Number.isNaN(pitch) || pitch <= 0)) fe.pitch = '请输入带齿节距';

  if (Object.keys(fe).length) return { ok: false, fieldErrors: fe };

  const P = powerKw as number;
  const n1 = speedRpm as number;
  const i = ratio as number;
  const d1v = d1 as number;
  const pb = pitch;
  const a0v = a0 as number;
  const KA = serviceFactor ?? 1.2;

  const fmt = (n: number) => fmtNum(n, opt.digits);

  const Pd = P * KA;
  const n2 = n1 / i;
  const d2 = d1v * i;
  const approxLp = 2 * a0v + (Math.PI / 2) * (d1v + d2) + Math.pow(d2 - d1v, 2) / (4 * a0v);

  let pitchLength = approxLp;
  let teeth: number | null = null;
  if (beltType === 'TIMING') {
    teeth = Math.round(approxLp / pb);
    pitchLength = teeth * pb;
  }

  const b = pitchLength - (Math.PI / 2) * (d1v + d2);
  const a = (b + Math.sqrt(Math.max(0, b * b - 2 * Math.pow(d2 - d1v, 2)))) / 4;
  const alpha = 180 - ((d2 - d1v) / a) * 57.3;
  const v = (Math.PI * d1v * n1) / 60000;
  const Fe = (1000 * Pd) / Math.max(0.1, v);
  const loadFactor = beltType === 'TIMING' ? 1.2 : 2.2;
  const Fr = Fe * loadFactor * Math.sin((alpha / 2) * Math.PI / 180);

  let meshing: number | null = null;
  let z1: number | null = null;
  if (beltType === 'TIMING') {
    z1 = Math.round((Math.PI * d1v) / pb);
    meshing = Math.floor(z1 * (alpha / 360));
  }

  const steps = [
    `设计功率 Pd = P × KA = ${fmt(P)} × ${fmt(KA)} = ${fmt(Pd)} kW`,
    `从动轮转速 n2 = n1 / i = ${fmt(n1)} / ${fmt(i)} = ${fmt(n2)} rpm`,
    `从动轮节径 d2 = d1 × i = ${fmt(d1v)} × ${fmt(i)} = ${fmt(d2)} mm`,
    `初算节线长度 Lp0 ≈ 2a0 + (π/2)(d1+d2) + (d2−d1)2/(4a0) = ${fmt(approxLp)} mm`,
  ];
  if (beltType === 'TIMING') {
    steps.push(`同步带齿数 Z = round(Lp0 / pb) = round(${fmt(approxLp)} / ${fmt(pb)}) = ${teeth} 齿`);
    steps.push(`标准节线长 Lp = Z × pb = ${fmt(pitchLength)} mm`);
  }
  steps.push(
    `实际安装中心距 a = [b + √(b2 − 2(d2−d1)2)] / 4 = ${fmt(a)} mm`,
    `小带轮包角 α1 = 180° − 57.3°×(d2−d1)/a = ${fmt(alpha)}°`,
    `带线速度 v = π·d1·n1 / 60000 = ${fmt(v)} m/s`,
    `有效圆周力 Fe = 1000·Pd / v = ${fmt(Fe)} N`,
    `轴作用力 Fr ≈ Fe × ${fmt(loadFactor)} × sin(α1/2) = ${fmt(Fr)} N (含初张紧)`,
  );
  if (beltType === 'TIMING' && meshing != null) {
    steps.push(`小轮啮合齿数 zm = z1 × α1/360° = ${meshing} 齿 (建议 ≥ 6)`);
  }

  // ===== 容量校核 =====
  interface CapacityRow { label: string; value: string; unit: string; primary?: boolean; tone?: 'ok' | 'warn' | 'bad' }
  const capRows: CapacityRow[] = [];
  let capNote = '';

  if (beltType === 'TIMING' && timingSection) {
    const spec = TIMING_SECTIONS[timingSection];
    if (spec.coefA > 0 && beltWidthMm != null) {
      const r = n1 / 1000;
      const Zc = (d1v * r) / 25.4;
      const basePr = 0.746 * Zc * (spec.coefA - spec.coefB * Zc * Zc);
      const wf = timingWidthFactor(spec, beltWidthMm);
      const mf = meshFactorOf(meshing ?? 6);
      const rated = basePr * wf * mf; // 选定带宽下的许用功率
      const utilization = Pd / rated;
      steps.push('');
      steps.push(`【容量校核 · ${timingSection} 同步带】`);
      steps.push(`速度因子 Zc = d1·(n1/1000)/25.4 = ${fmt(Zc)}`);
      steps.push(`基准宽 ${fmt(spec.baseWidthMm)} mm 额定功率 Pr = 0.746·Zc·(${spec.coefA} − ${spec.coefB}·Zc2) = ${fmt(basePr)} kW`);
      steps.push(`宽度系数(带宽 ${fmt(beltWidthMm)} mm)= ${fmt(wf)},啮合系数 = ${fmt(mf)}`);
      steps.push(`许用传递功率 [P] = Pr × 宽度系数 × 啮合系数 = ${fmt(rated)} kW`);
      steps.push(`设计功率利用率 Pd/[P] = ${fmt(utilization)}${utilization <= 1 ? ' ≤ 1,容量足够' : ' > 1,需加宽 / 增大带轮或换带型'}`);
      capRows.push({ label: `${timingSection} 基准宽额定功率`, value: fmt(basePr), unit: 'kW' });
      capRows.push({ label: `带宽 ${fmt(beltWidthMm)} mm 许用功率`, value: fmt(rated), unit: 'kW', primary: true });
      capRows.push({
        label: '功率利用率 Pd/[P]', value: fmt(utilization), unit: '—',
        tone: (utilization <= 1 ? 'ok' : 'bad') as 'ok' | 'bad',
      });
      if (z1 != null && z1 < spec.minTeeth) capNote = `注意:小带轮齿数 ${z1} 低于 ${timingSection} 推荐最小值 ${spec.minTeeth}。`;
    } else {
      capNote = 'MXL 带按扭矩法设计,本工具暂不提供其功率容量校核,请按厂商扭矩表选型。';
    }
  }

  if (beltType === 'V_BELT' && vBeltSection) {
    const spec = V_BELT_SECTIONS[vBeltSection];
    const Pb0 = vBeltBasePower(spec, d1v, n1);
    const Ka = contactAngleFactor(alpha);
    const KL = vBeltLengthFactor(spec, pitchLength);
    const per = Pb0 * Ka * KL;
    const count = beltCount ?? Math.max(1, Math.ceil(Pd / per));
    const rated = per * count;
    const utilization = Pd / rated;
    steps.push('');
    steps.push(`【容量校核 · ${vBeltSection} 窄 V 带】`);
    steps.push(`单根基本额定功率 Pb(d1=${fmt(d1v)}, n1=${fmt(n1)}) = ${fmt(Pb0)} kW (包角 180° 基准,典型值插值)`);
    steps.push(`包角系数 Kα = 1 − 0.003×(180−α1) = ${fmt(Ka)},长度系数 KL(Lp=${fmt(pitchLength)}) = ${fmt(KL)}`);
    steps.push(`单根许用功率 P1 = Pb × Kα × KL = ${fmt(per)} kW`);
    if (beltCount == null) steps.push(`推荐根数 N = ceil(Pd / P1) = ceil(${fmt(Pd)} / ${fmt(per)}) = ${count} 根`);
    else steps.push(`给定根数 N = ${count} 根`);
    steps.push(`许用传递功率 [P] = P1 × N = ${fmt(rated)} kW,利用率 Pd/[P] = ${fmt(utilization)}${utilization <= 1 ? ' ≤ 1,容量足够' : ' > 1,需增加根数或换带型'}`);
    capRows.push({ label: `${vBeltSection} 单根许用功率 P1`, value: fmt(per), unit: 'kW' });
    capRows.push({ label: `V 带根数 N`, value: String(count), unit: '根' });
    capRows.push({ label: '许用传递功率 [P]', value: fmt(rated), unit: 'kW', primary: true });
    capRows.push({
      label: '功率利用率 Pd/[P]', value: fmt(utilization), unit: '—',
      tone: (utilization <= 1 ? 'ok' : 'bad') as 'ok' | 'bad',
    });
  }

  const results = [
    { label: '设计功率 Pd', value: fmt(Pd), unit: 'kW' },
    { label: '从动轮转速 n2', value: fmt(n2), unit: 'rpm' },
    { label: '从动轮节径 d2', value: fmt(d2), unit: 'mm' },
    ...(beltType === 'TIMING' && teeth != null ? [{ label: '同步带齿数 Z', value: String(teeth), unit: '齿' }] : []),
    { label: '节线长度 Lp', value: fmt(pitchLength), unit: 'mm' },
    { label: '实际中心距 a', value: fmt(a), unit: 'mm', ...(capRows.length === 0 ? { primary: true } : {}) },
    { label: '小带轮包角 α1', value: fmt(alpha), unit: '°' },
    { label: '带线速度 v', value: fmt(v), unit: 'm/s' },
    { label: '有效圆周力 Fe', value: fmt(Fe), unit: 'N' },
    { label: '轴作用力 Fr', value: fmt(Fr), unit: 'N' },
    ...(beltType === 'TIMING' && meshing != null ? [{ label: '啮合齿数 zm', value: String(meshing), unit: '齿' }] : []),
    ...capRows,
  ];

  const note = [
    '以上为简化工程估算。',
    beltType === 'TIMING' ? '同步带容量按 Machinery\'s Handbook 经典梯形齿额定功率法,啮合齿数建议 ≥ 6。' : 'V 带容量按 BS 3790 窄 V带典型值插值,包角建议 ≥ 120°。',
    capNote,
    '正式选型应按 GB/T 11362 / GB/T 13575.1 及厂商样本校核。',
  ].filter(Boolean).join(' ');

  return {
    ok: true,
    result: {
      formula: 'Lp ≈ 2a + (π/2)(d1+d2) + (d2−d1)2/4a · Fe = 1000·Pd/v',
      formulaAlt: beltType === 'TIMING'
        ? '容量:[P] = 0.746·Zc·(a−b·Zc2) × 宽度系数 × 啮合系数'
        : '容量:N = Pd / (Pb × Kα × KL),Kα = 1 − 0.003·(180−α1)',
      steps,
      results,
      note,
      disclaimer: true,
    },
  };
}

/** 生成可复制的结果文本 */
export function beltDriveCopyText(input: BeltDriveInput, digits = 2): string {
  const fmt = (n: number) => fmtNum(n, digits);
  const o = calcBeltDrive(input, { digits });
  if (!o.result) return '';
  const r = o.result;
  return [
    '【同步带 / V 带传动计算】',
    `带型: ${input.beltType === 'TIMING' ? `同步带${input.timingSection ? ' ' + input.timingSection : ''}` : `V 带${input.vBeltSection ? ' ' + input.vBeltSection : ''}`}`,
    `传递功率 P = ${fmt(input.powerKw ?? 0)} kW`,
    `主动轮转速 n1 = ${fmt(input.speedRpm ?? 0)} rpm`,
    `传动比 i = ${fmt(input.ratio ?? 0)}`,
    `小带轮节径 d1 = ${fmt(input.d1 ?? 0)} mm`,
    input.beltType === 'TIMING' && input.timingSection ? `带宽 = ${fmt(input.beltWidthMm ?? 0)} mm` : null,
    `初定中心距 a0 = ${fmt(input.a0 ?? 0)} mm`,
    '',
    `公式: ${r.formula}`,
    '',
    ...r.steps.map((s, i) => `${i + 1}. ${s}`),
    '',
    ...r.results.map((x) => `${x.label}: ${x.value}${x.unit ? ' ' + x.unit : ''}`),
  ].filter((line) => line !== null).join('\n');
}
