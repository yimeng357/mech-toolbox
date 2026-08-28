// 平键/花键连接校核(GB/T 1095 平键 + 渐开线花键简化)
// 平键:工作面挤压应力 σp = 4T/(d·h·L)(h 键高, L 键长, d 轴径;双键按 1.5 键计)
//   剪切:τ = 2T/(d·b·L)(b 键宽)
// 渐开线花键(简化按矩形花键等效):σp = 2T/(ψ·z·h·l·Dm)(ψ 载荷不均匀系数, z 齿数, h 齿工作高, l 工作长度, Dm 平均直径)
import type { CalcOption, CalcOutcome } from '../types';
import { fmtNum } from '../lib/format';

export type KeyType = 'FLAT_KEY' | 'SPLINE';

export interface KeyInput {
  keyType: KeyType;                 // 键类型
  torqueNm: number | null;          // 传递扭矩 T, N·m
  shaftDiaMm: number | null;        // 轴径 d, mm
  // 平键参数
  keyWidthMm?: number | null;       // 键宽 b, mm
  keyHeightMm?: number | null;      // 键高 h, mm
  keyLengthMm?: number | null;      // 键长 L, mm
  keyCount?: number | null;         // 键数量(双键取 2,按 1.5 键折算)
  // 花键参数
  splineTeeth?: number | null;      // 齿数 z
  splineWorkHeightMm?: number | null; // 齿工作高 h, mm(≈ 模数)
  splineLengthMm?: number | null;   // 工作长度 l, mm
  splineUnevenFactor?: number | null; // 载荷不均匀系数 ψ(默认 0.7)
  allowablePressureMpa?: number | null; // 许用挤压应力 [σp], MPa(默认 100,动连接 50)
}

export const KEY_DEFAULTS: KeyInput = {
  keyType: 'FLAT_KEY',
  torqueNm: 300,
  shaftDiaMm: 40,
  keyWidthMm: 12,
  keyHeightMm: 8,
  keyLengthMm: 56,
  keyCount: 1,
  splineTeeth: 20,
  splineWorkHeightMm: 2.5,
  splineLengthMm: 40,
  splineUnevenFactor: 0.7,
  allowablePressureMpa: 100,
};

export function calcKey(input: KeyInput, opt: CalcOption = { digits: 2 }): CalcOutcome {
  const {
    keyType, torqueNm: T, shaftDiaMm: d,
    keyWidthMm: b, keyHeightMm: h, keyLengthMm: L, keyCount,
    splineTeeth: z, splineWorkHeightMm: sh, splineLengthMm: sl, splineUnevenFactor: psi,
    allowablePressureMpa: sigmaPAllow,
  } = input;
  const fe: Record<string, string> = {};

  if (T == null || Number.isNaN(T) || T <= 0) fe.torqueNm = '请输入传递扭矩';
  if (d == null || Number.isNaN(d) || d <= 0) fe.shaftDiaMm = '请输入轴径';
  if (keyType === 'FLAT_KEY') {
    if (b == null || Number.isNaN(b) || b <= 0) fe.keyWidthMm = '平键需填键宽';
    if (h == null || Number.isNaN(h) || h <= 0) fe.keyHeightMm = '平键需填键高';
    if (L == null || Number.isNaN(L) || L <= 0) fe.keyLengthMm = '平键需填键长';
  } else {
    if (z == null || Number.isNaN(z) || z <= 0) fe.splineTeeth = '花键需填齿数';
    if (sh == null || Number.isNaN(sh) || sh <= 0) fe.splineWorkHeightMm = '花键需填齿工作高';
    if (sl == null || Number.isNaN(sl) || sl <= 0) fe.splineLengthMm = '花键需填工作长度';
  }
  if (Object.keys(fe).length) return { ok: false, fieldErrors: fe };

  const Tv = T as number;
  const dv = d as number;
  const sigmaAv = sigmaPAllow ?? 100;
  const fmt = (x: number) => fmtNum(x, opt.digits);

  const steps: string[] = [];
  const results: Array<{ label: string; value: string; unit?: string; primary?: boolean; tone?: 'ok' | 'warn' | 'bad' }> = [];

  let sigmaP = 0;
  let pass = false;
  if (keyType === 'FLAT_KEY') {
    const bv = b as number;
    const hv = h as number;
    const Lv = L as number;
    const nEff = (keyCount ?? 1) >= 2 ? 1.5 : 1; // 双键按 1.5 键折算
    const Tmm = Tv * 1000;
    sigmaP = (4 * Tmm) / (dv * hv * Lv * nEff);
    const tau = (2 * Tmm) / (dv * bv * Lv * nEff);
    const tauAllow = sigmaAv * 0.6; // 键剪切许用经验:约 0.6×挤压许用
    pass = sigmaP <= sigmaAv && tau <= tauAllow;
    steps.push(
      `平键连接(单键按全载,双键按 1.5 键折算):有效键数 n = ${fmt(nEff)}`,
      `挤压应力 σp = 4T/(d·h·L·n) = 4×${fmt(Tmm)}/(${fmt(dv)}×${fmt(hv)}×${fmt(Lv)}×${fmt(nEff)}) = ${fmt(sigmaP)} MPa`,
      `剪切应力 τ = 2T/(d·b·L·n) = 2×${fmt(Tmm)}/(${fmt(dv)}×${fmt(bv)}×${fmt(Lv)}×${fmt(nEff)}) = ${fmt(tau)} MPa(许用 ≈ ${fmt(tauAllow)} MPa)`,
      `判定:σp = ${fmt(sigmaP)} ${pass ? '≤' : '>'} [σp] = ${fmt(sigmaAv)} MPa → ${pass ? '满足 ✓' : '不满足 ✗(加大键长/双键/换花键)'}`,
    );
    results.push(
      { label: '挤压应力 σp', value: fmt(sigmaP), unit: `MPa(许用 ${fmt(sigmaAv)})`, primary: true, tone: pass ? 'ok' : 'bad' },
      { label: '剪切应力 τ', value: fmt(tau), unit: `MPa(许用 ${fmt(tauAllow)})`, tone: pass ? 'ok' : 'bad' },
      { label: '有效键数(双键按 1.5)', value: fmt(nEff), unit: '—' },
    );
  } else {
    const zv = z as number;
    const shv = sh as number;
    const slv = sl as number;
    const psiv = psi ?? 0.7;
    const Dm = dv + shv; // 平均直径 ≈ 分度圆
    const Tmm = Tv * 1000;
    sigmaP = (2 * Tmm) / (psiv * zv * shv * slv * Dm);
    pass = sigmaP <= sigmaAv;
    steps.push(
      `渐开线花键(简化):平均直径 Dm ≈ d + h = ${fmt(Dm)} mm,载荷不均匀系数 ψ = ${fmt(psiv)}`,
      `挤压应力 σp = 2T/(ψ·z·h·l·Dm) = 2×${fmt(Tmm)}/(${fmt(psiv)}×${fmt(zv)}×${fmt(shv)}×${fmt(slv)}×${fmt(Dm)}) = ${fmt(sigmaP)} MPa`,
      `判定:σp = ${fmt(sigmaP)} ${pass ? '≤' : '>'} [σp] = ${fmt(sigmaAv)} MPa → ${pass ? '满足 ✓' : '不满足 ✗(加大齿宽/模数或齿数)'}`,
    );
    results.push(
      { label: '挤压应力 σp', value: fmt(sigmaP), unit: `MPa(许用 ${fmt(sigmaAv)})`, primary: true, tone: pass ? 'ok' : 'bad' },
      { label: '平均直径 Dm', value: fmt(Dm), unit: 'mm' },
    );
  }
  results.push({ label: '判定', value: pass ? '满足' : '不满足', tone: pass ? 'ok' : 'bad' });

  return {
    ok: true,
    result: {
      formula: keyType === 'FLAT_KEY'
        ? 'σp = 4T/(d·h·L·n) ≤ [σp] · τ = 2T/(d·b·L·n)'
        : 'σp = 2T/(ψ·z·h·l·Dm) ≤ [σp]',
      formulaAlt: '双键按 1.5 键折算;动连接许用应力取静连接一半左右',
      steps,
      results,
      note: '平键尺寸应同时符合 GB/T 1095/1096 轴槽标准(键宽/键高随轴径段);花键为选型级简化,精确计算按 GB/T 3478 花键标准考虑齿根弯曲与剪切。[σp] 静连接钢-钢约 100~150 MPa,动连接(滑移)约 40~60 MPa。',
      disclaimer: true,
    },
  };
}

export function keyCopyText(input: KeyInput, digits = 2): string {
  const o = calcKey(input, { digits });
  if (!o.result) return '';
  const r = o.result;
  return [
    '【键/花键连接校核】',
    `类型: ${input.keyType === 'FLAT_KEY' ? '平键' : '花键'} · T = ${input.torqueNm} N·m · d = ${input.shaftDiaMm} mm`,
    '',
    ...r.steps.map((s, i) => `${i + 1}. ${s}`),
    '',
    ...r.results.map((x) => `${x.label}: ${x.value}${x.unit ? ' ' + x.unit : ''}`),
  ].join('\n');
}
