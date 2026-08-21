// 同步带与 V 带传动计算
// 依据机械设计手册带传动章节的简化计算方法:
//   设计功率 Pd = P × KA(工况系数)
//   初算节线长 Lp0 ≈ 2a0 + (π/2)(d1+d2) + (d2−d1)²/(4a0)
//   实际中心距 a = [b + √(b² − 2(d2−d1)²)] / 4, b = Lp − (π/2)(d1+d2)
//   小带轮包角 α1 = 180° − 57.3°×(d2−d1)/a
//   带速 v = π·d1·n1/60000, 有效圆周力 Fe = 1000·Pd/v
//   轴作用力 Fr ≈ Fe × 系数 × sin(α1/2)(同步带取 1.2、V 带取 2.2,含初张紧)
import type { CalcOption, CalcOutcome } from '../types';
import { fmtNum } from '../lib/format';

export type BeltType = 'TIMING' | 'V_BELT';

export interface BeltDriveInput {
  beltType: BeltType;
  powerKw: number | null;      // 传递功率 P, kW
  speedRpm: number | null;     // 主动轮转速 n1, rpm
  ratio: number | null;        // 传动比 i
  d1: number | null;           // 小带轮节径 d1, mm
  pitch: number | null;        // 同步带节距 pb, mm(仅同步带)
  a0: number | null;           // 初定中心距 a0, mm
  serviceFactor: number | null; // 工况系数 KA
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
};

export function calcBeltDrive(input: BeltDriveInput, opt: CalcOption = { digits: 2 }): CalcOutcome {
  const { beltType, powerKw, speedRpm, ratio, d1, pitch = 5, a0, serviceFactor = 1.2 } = input;
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
  if (beltType === 'TIMING' && (pitch == null || Number.isNaN(pitch) || pitch <= 0)) fe.pitch = '请输入带齿节距';
  if (serviceFactor != null && (Number.isNaN(serviceFactor) || serviceFactor <= 0)) fe.serviceFactor = '工况系数必须大于 0';

  if (Object.keys(fe).length) return { ok: false, fieldErrors: fe };

  const P = powerKw as number;
  const n1 = speedRpm as number;
  const i = ratio as number;
  const d1v = d1 as number;
  const pb = pitch ?? 5;
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
  if (beltType === 'TIMING') {
    const z1 = Math.round((Math.PI * d1v) / pb);
    meshing = Math.floor(z1 * (alpha / 360));
  }

  const steps = [
    `设计功率 Pd = P × KA = ${fmt(P)} × ${fmt(KA)} = ${fmt(Pd)} kW`,
    `从动轮转速 n2 = n1 / i = ${fmt(n1)} / ${fmt(i)} = ${fmt(n2)} rpm`,
    `从动轮节径 d2 = d1 × i = ${fmt(d1v)} × ${fmt(i)} = ${fmt(d2)} mm`,
    `初算节线长度 Lp0 ≈ 2a0 + (π/2)(d1+d2) + (d2−d1)²/(4a0) = ${fmt(approxLp)} mm`,
  ];
  if (beltType === 'TIMING') {
    steps.push(`同步带齿数 Z = round(Lp0 / pb) = round(${fmt(approxLp)} / ${fmt(pb)}) = ${teeth} 齿`);
    steps.push(`标准节线长 Lp = Z × pb = ${fmt(pitchLength)} mm`);
  }
  steps.push(
    `实际安装中心距 a = [b + √(b² − 2(d2−d1)²)] / 4 = ${fmt(a)} mm`,
    `小带轮包角 α1 = 180° − 57.3°×(d2−d1)/a = ${fmt(alpha)}°`,
    `带线速度 v = π·d1·n1 / 60000 = ${fmt(v)} m/s`,
    `有效圆周力 Fe = 1000·Pd / v = ${fmt(Fe)} N`,
    `轴作用力 Fr ≈ Fe × ${fmt(loadFactor)} × sin(α1/2) = ${fmt(Fr)} N (含初张紧)`,
  );
  if (beltType === 'TIMING' && meshing != null) {
    steps.push(`小轮啮合齿数 zm = z1 × α1/360° = ${meshing} 齿 (建议 ≥ 6)`);
  }

  const results = [
    { label: '设计功率 Pd', value: fmt(Pd), unit: 'kW' },
    { label: '从动轮转速 n2', value: fmt(n2), unit: 'rpm' },
    { label: '从动轮节径 d2', value: fmt(d2), unit: 'mm' },
    ...(beltType === 'TIMING' && teeth != null ? [{ label: '同步带齿数 Z', value: String(teeth), unit: '齿' }] : []),
    { label: '节线长度 Lp', value: fmt(pitchLength), unit: 'mm' },
    { label: '实际中心距 a', value: fmt(a), unit: 'mm', primary: true },
    { label: '小带轮包角 α1', value: fmt(alpha), unit: '°' },
    { label: '带线速度 v', value: fmt(v), unit: 'm/s' },
    { label: '有效圆周力 Fe', value: fmt(Fe), unit: 'N' },
    { label: '轴作用力 Fr', value: fmt(Fr), unit: 'N' },
    ...(beltType === 'TIMING' && meshing != null ? [{ label: '啮合齿数 zm', value: String(meshing), unit: '齿' }] : []),
  ];

  return {
    ok: true,
    result: {
      formula: beltType === 'TIMING'
        ? 'Lp ≈ 2a + (π/2)(d₁+d₂) + (d₂−d₁)²/4a · Fe = 1000·Pd/v'
        : 'Lp ≈ 2a + (π/2)(d₁+d₂) + (d₂−d₁)²/4a · Fe = 1000·Pd/v',
      formulaAlt: '工况系数 KA 按载荷性质取 1.0~1.5;同步带需按标准节线长圆整齿数',
      steps,
      results,
      note: '以上为简化静力估算。同步带啮合齿数建议 ≥ 6,V 带包角建议 ≥ 120°,实际选型应按 GB/T 11362 / GB/T 11544 等标准校核。',
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
    `带型: ${input.beltType === 'TIMING' ? '同步带' : 'V 带'}`,
    `传递功率 P = ${fmt(input.powerKw ?? 0)} kW`,
    `主动轮转速 n1 = ${fmt(input.speedRpm ?? 0)} rpm`,
    `传动比 i = ${fmt(input.ratio ?? 0)}`,
    `小带轮节径 d1 = ${fmt(input.d1 ?? 0)} mm`,
    input.beltType === 'TIMING' ? `节距 pb = ${fmt(input.pitch ?? 5)} mm` : '',
    `初定中心距 a0 = ${fmt(input.a0 ?? 0)} mm`,
    '',
    `公式: ${r.formula}`,
    '',
    ...r.steps.map((s, i) => `${i + 1}. ${s}`),
    '',
    ...r.results.map((x) => `${x.label}: ${x.value}${x.unit ? ' ' + x.unit : ''}`),
  ].join('\n');
}
