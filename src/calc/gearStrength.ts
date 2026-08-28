// 直齿圆柱齿轮接触/弯曲强度校核(GB/T 3480 选型级简化)
// 接触强度:σH = ZE·ZH·√[Ft/(b·d1)·(u+1)/u] ≤ [σH]
//   Ft = 2T/d1(小轮扭矩), ZE 弹性系数(钢-钢 189.8 √MPa), ZH 节点区域系数(标准齿 α=20° 取 2.5)
// 弯曲强度:σF = Ft/(b·m)·YFa·YSa ≤ [σF]
//   YFa 齿形系数 / YSa 应力修正系数按齿数 z 拟合(标准齿)
//   载荷系数 K = KA·Kv·Kβ(工况/动载/分布综合,选型级取 1.3~2.0)
// 注:简化式未含螺旋角(斜齿 β=0)、端面重合度、寿命系数/润滑修正;重要齿轮按 GB/T 3480 精确校核。
import type { CalcOption, CalcOutcome } from '../types';
import { fmtNum } from '../lib/format';

export interface GearStrengthInput {
  torqueNm: number | null;        // 小轮传递扭矩 T1, N·m
  teethPinion: number | null;     // 小轮齿数 z1
  teethGear: number | null;       // 大轮齿数 z2
  moduleMm: number | null;        // 模数 m, mm
  faceWidthMm: number | null;     // 齿宽 b, mm
  loadFactor?: number | null;     // 载荷系数 K(默认 1.6)
  sigmaHAllow?: number | null;    // 许用接触应力 [σH], MPa
  sigmaFAllow?: number | null;    // 许用弯曲应力 [σF], MPa
  hardness?: string | null;       // 齿面硬度类型(提示用)
}

export const GEAR_STRENGTH_DEFAULTS: GearStrengthInput = {
  torqueNm: 100,
  teethPinion: 20,
  teethGear: 40,
  moduleMm: 3,
  faceWidthMm: 50,
  loadFactor: 1.6,
  sigmaHAllow: 550,
  sigmaFAllow: 300,
  hardness: '硬齿面',
};

/** 齿形系数 YFa(标准齿 α=20°,按齿数拟合) */
export function gearYFa(z: number): number {
  if (z < 17) return 2.97 - 0.015 * (17 - z);
  return 2.97 - (2.97 - 2.18) * Math.min(1, Math.log10(z / 17) / Math.log10(100 / 17));
}

/** 应力修正系数 YSa(标准齿) */
export function gearYSa(z: number): number {
  if (z < 17) return 1.52 + 0.02 * (17 - z);
  return 1.52 + (1.88 - 1.52) * Math.min(1, Math.log10(z / 17) / Math.log10(100 / 17));
}

export function calcGearStrength(input: GearStrengthInput, opt: CalcOption = { digits: 2 }): CalcOutcome {
  const {
    torqueNm: T, teethPinion: z1, teethGear: z2, moduleMm: m, faceWidthMm: b,
    loadFactor: K, sigmaHAllow: sH, sigmaFAllow: sF,
  } = input;
  const fe: Record<string, string> = {};

  if (T == null || Number.isNaN(T) || T <= 0) fe.torqueNm = '请输入小轮扭矩';
  if (z1 == null || Number.isNaN(z1) || z1 < 5) fe.teethPinion = '请输入小轮齿数(≥5)';
  if (z2 == null || Number.isNaN(z2) || z2 < z1! * 0.2) fe.teethGear = '大轮齿数无效';
  if (m == null || Number.isNaN(m) || m <= 0) fe.moduleMm = '请输入模数';
  if (b == null || Number.isNaN(b) || b <= 0) fe.faceWidthMm = '请输入齿宽';
  if (K != null && (Number.isNaN(K) || K < 1 || K > 3)) fe.loadFactor = '载荷系数应在 1~3 之间';
  if (Object.keys(fe).length) return { ok: false, fieldErrors: fe };

  const Tv = T as number;
  const z1v = z1 as number;
  const z2v = z2 as number;
  const mv = m as number;
  const bv = b as number;
  const Kv = K ?? 1.6;
  const fmt = (n: number) => fmtNum(n, opt.digits);

  const d1 = mv * z1v;                       // 小轮分度圆直径 mm
  const u = z2v / z1v;                       // 齿数比
  const Ft = (2 * Tv * 1000) / d1;           // 圆周力 N
  const KA = Kv;

  // 接触应力(钢-钢,ZH=2.5 标准齿)
  const ZE = 189.8;
  const ZH = 2.5;
  const sigmaH = ZE * ZH * Math.sqrt((Ft / (bv * d1)) * ((u + 1) / u) * KA);

  // 弯曲应力(按小轮,危险截面)
  const YFa = gearYFa(z1v);
  const YSa = gearYSa(z1v);
  const sigmaF = (Ft / (bv * mv)) * YFa * YSa * KA;

  // 大轮弯曲(材料相同时通常由小轮控制,但齿形系数不同仍各算)
  const YFa2 = gearYFa(z2v);
  const YSa2 = gearYSa(z2v);
  const sigmaF2 = (Ft / (bv * mv)) * YFa2 * YSa2 * KA;

  const sHv = sH ?? 550;
  const sFv = sF ?? 300;
  const hOk = sigmaH <= sHv;
  const fOk = Math.max(sigmaF, sigmaF2) <= sFv;

  const steps = [
    `小轮分度圆 d1 = m·z1 = ${fmt(mv)} × ${fmt(z1v)} = ${fmt(d1)} mm,齿数比 u = ${fmt(u)}`,
    `圆周力 Ft = 2T/d1 = 2 × ${fmt(Tv * 1000)} / ${fmt(d1)} = ${fmt(Ft)} N`,
    `接触应力:σH = 189.8 × 2.5 × √[Ft/(b·d1)·(u+1)/u·K] = ${fmt(sigmaH)} MPa`,
    `许用接触应力 [σH] = ${fmt(sHv)} MPa → ${hOk ? '满足 ✓' : '不满足 ✗(需增大 m/b 或换更好的材料)'}`,
    `齿形系数 YFa(z1=${fmt(z1v)}) = ${fmt(YFa)},YSa = ${fmt(YSa)}`,
    `弯曲应力(小轮):σF = Ft/(b·m)·YFa·YSa·K = ${fmt(sigmaF)} MPa`,
    `弯曲应力(大轮):σF2 = ${fmt(sigmaF2)} MPa(YFa=${fmt(YFa2)}, YSa=${fmt(YSa2)})`,
    `许用弯曲应力 [σF] = ${fmt(sFv)} MPa → ${fOk ? '满足 ✓' : '不满足 ✗'}`,
    `中心距 a = m(z1+z2)/2 = ${fmt((mv * (z1v + z2v)) / 2)} mm`,
  ];

  const overall: 'ok' | 'warn' | 'bad' = hOk && fOk ? 'ok' : 'bad';

  return {
    ok: true,
    result: {
      formula: 'σH = ZE·ZH·√[Ft/(b·d1)·(u+1)/u·K] ≤ [σH]',
      formulaAlt: 'σF = Ft/(b·m)·YFa·YSa·K ≤ [σF] · Ft = 2T/d1',
      steps,
      results: [
        { label: '小轮分度圆 d1', value: fmt(d1), unit: 'mm' },
        { label: '圆周力 Ft', value: fmt(Ft), unit: 'N' },
        { label: '接触应力 σH', value: fmt(sigmaH), unit: `MPa(许用 ${fmt(sHv)})`, tone: hOk ? 'ok' : 'bad' },
        { label: '弯曲应力 σF(大小轮大值)', value: fmt(Math.max(sigmaF, sigmaF2)), unit: `MPa(许用 ${fmt(sFv)})`, tone: fOk ? 'ok' : 'bad' },
        { label: '中心距 a', value: fmt((mv * (z1v + z2v)) / 2), unit: 'mm' },
        { label: '强度判定', value: hOk && fOk ? '接触与弯曲均满足' : hOk ? '弯曲不足,需增大模数' : '接触不足,需增大直径/齿宽或提高齿面硬度', tone: overall, primary: true },
      ],
      note: '选型级简化:标准直齿(α=20°, β=0)、钢-钢配对、载荷系数 K 为综合经验值。未计入寿命系数 ZN/YNT、润滑与点蚀修正;闭式软齿面齿轮通常由接触强度控制,硬齿面由弯曲强度控制;重要齿轮按 GB/T 3480 精确校核。',
      disclaimer: true,
    },
  };
}

export function gearStrengthCopyText(input: GearStrengthInput, digits = 2): string {
  const o = calcGearStrength(input, { digits });
  if (!o.result) return '';
  const r = o.result;
  return [
    '【直齿圆柱齿轮强度校核】',
    `m=${input.moduleMm} · z1=${input.teethPinion} · z2=${input.teethGear} · b=${input.faceWidthMm} mm · T1=${input.torqueNm} N·m`,
    '',
    ...r.steps.map((s, i) => `${i + 1}. ${s}`),
    '',
    ...r.results.map((x) => `${x.label}: ${x.value}${x.unit ? ' ' + x.unit : ''}`),
  ].join('\n');
}
