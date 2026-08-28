// 圆柱螺旋压缩弹簧设计计算
// 弹簧刚度:k = G·d⁴/(8·D²·n)(G 切变模量, d 簧丝直径, D 中径, n 有效圈数)
// 井圈数 n2 = n + 支承圈(端部并紧,通常 1.5~2.5)
// 自由高度:H0 = n·t + (n2 + 0.5)·d(端部磨平,t 节距)
// 压井高度:Hb ≈ (n2 + 1.1)·d? 工程近似 (n2+1)·d + 安全余量
// 旋绕比 C = D/d(4~9 合理);曲度系数 K = (4C-1)/(4C-4) + 0.615/C
// 切应力:τ = K·8F·D/(π·d³) ≤ [τ];压缩稳定性:b = H0/D ≤ 2.6(两端固定 3.7~5.3)
import type { CalcOption, CalcOutcome } from '../types';
import { fmtNum } from '../lib/format';

export interface SpringInput {
  wireDiaMm: number | null;      // 簧丝直径 d, mm
  meanDiaMm: number | null;      // 弹簧中径 D, mm
  activeCoils: number | null;    // 有效圈数 n
  endCoils?: number | null;      // 支承圈数 n2(默认 2)
  pitchMm?: number | null;       // 节距 t, mm(默认 = d + 间隙估计)
  shearModulusGPa?: number | null; // 切变模量 G, GPa(钢默认 79)
  allowableStressMpa?: number | null; // 许用切应力 [τ], MPa(油淬火钢丝 II类 ≈ 0.5σb)
  designForceN?: number | null;  // 设计载荷 F, N(校核应力与行程)
}

export const SPRING_DEFAULTS: SpringInput = {
  wireDiaMm: 4,
  meanDiaMm: 25,
  activeCoils: 8,
  endCoils: 2,
  pitchMm: null,
  shearModulusGPa: 79,
  allowableStressMpa: 750,
  designForceN: 500,
};

export function calcSpring(input: SpringInput, opt: CalcOption = { digits: 2 }): CalcOutcome {
  const {
    wireDiaMm: d, meanDiaMm: D, activeCoils: n, endCoils: n2,
    pitchMm: t, shearModulusGPa: G, allowableStressMpa: tauAllow, designForceN: F,
  } = input;
  const fe: Record<string, string> = {};

  if (d == null || Number.isNaN(d) || d <= 0) fe.wireDiaMm = '请输入簧丝直径';
  if (D == null || Number.isNaN(D) || D <= 0) fe.meanDiaMm = '请输入弹簧中径';
  if (d != null && D != null && D <= d) fe.meanDiaMm = '中径应大于簧丝直径';
  if (n == null || Number.isNaN(n) || n < 2) fe.activeCoils = '有效圈数应 ≥ 2';
  if (n2 != null && (Number.isNaN(n2) || n2 < 0 || n2 > 4)) fe.endCoils = '支承圈数应在 0~4 之间';
  if (G != null && (Number.isNaN(G) || G <= 0)) fe.shearModulusGPa = '切变模量无效';
  if (tauAllow != null && (Number.isNaN(tauAllow) || tauAllow <= 0)) fe.allowableStressMpa = '许用切应力无效';
  if (F != null && (Number.isNaN(F) || F < 0)) fe.designForceN = '设计载荷无效';
  if (Object.keys(fe).length) return { ok: false, fieldErrors: fe };

  const dv = d as number;
  const Dv = D as number;
  const nv = n as number;
  const n2v = n2 ?? 2;
  const Gv = (G ?? 79) * 1000; // MPa
  const tauAv = tauAllow ?? 750;
  const fmt = (x: number) => fmtNum(x, opt.digits);

  const k = (Gv * Math.pow(dv, 4)) / (8 * Math.pow(Dv, 3) * nv); // N/mm
  const C = Dv / dv;
  const Kw = (4 * C - 1) / (4 * C - 4) + 0.615 / C;              // 曲度系数
  const tv = t ?? dv * 1.3;                                       // 节距缺省 1.3d
  const H0 = nv * tv + (n2v + 0.5) * dv;
  const Hb = (n2v + 1.1) * dv + nv * dv * 0.05;                   // 压井近似(留 5% 残隙)
  const stability = H0 / Dv;

  const steps = [
    `旋绕比 C = D/d = ${fmt(Dv)}/${fmt(dv)} = ${fmt(C)} ${C >= 4 && C <= 9 ? '(4~9 合理 ✓)' : C < 4 ? '(<4 绕制困难)' : '(>9 易失稳)'}`,
    `曲度系数 K = (4C-1)/(4C-4) + 0.615/C = ${fmt(Kw)}`,
    `弹簧刚度 k = G·d⁴/(8·D²·n) = ${fmt(Gv)}×${fmt(dv)}⁴/(8×${fmt(Dv)}²×${fmt(nv)}) = ${fmt(k)} N/mm`,
    `自由高度 H0 = n·t + (n2+0.5)·d = ${fmt(nv)}×${fmt(tv)} + (${fmt(n2v)}+0.5)×${fmt(dv)} = ${fmt(H0)} mm`,
    `压井高度 Hb ≈ ${fmt(Hb)} mm,工作行程(到压井)≈ ${fmt(H0 - Hb)} mm`,
    `稳定性 b = H0/D = ${fmt(stability)} ${stability <= 2.6 ? '≤ 2.6 ✓ 不需导杆' : stability <= 3.7 ? '(2.6~3.7 建议设导杆)' : '(>3.7 必须设导杆/导套!)'}`,
  ];

  const results: Array<{ label: string; value: string; unit?: string; primary?: boolean; tone?: 'ok' | 'warn' | 'bad' }> = [
    { label: '弹簧刚度 k', value: fmt(k), unit: 'N/mm', primary: true },
    { label: '旋绕比 C', value: fmt(C), unit: '—', tone: C >= 4 && C <= 9 ? 'ok' : 'warn' },
    { label: '曲度系数 K', value: fmt(Kw), unit: '—' },
    { label: '自由高度 H0', value: fmt(H0), unit: 'mm' },
    { label: '压井高度 Hb', value: fmt(Hb), unit: 'mm' },
    { label: '稳定性 b = H0/D', value: fmt(stability), unit: '—', tone: stability <= 2.6 ? 'ok' : 'bad' },
  ];

  if (F != null && F > 0) {
    const tau = (Kw * 8 * F * Dv) / (Math.PI * Math.pow(dv, 3));
    const deflection = F / k;
    const okTau = tau <= tauAv;
    steps.push(`设计载荷 F = ${fmt(F)} N:切应力 τ = K·8F·D/(π·d³) = ${fmt(tau)} MPa ${okTau ? `≤ [τ] ${fmt(tauAv)} ✓` : `> [τ] ${fmt(tauAv)} ✗`}`);
    steps.push(`对应变形量 λ = F/k = ${fmt(deflection)} mm(校核不超过压井行程 ${fmt(H0 - Hb)} mm)`);
    results.push(
      { label: '工作切应力 τ', value: fmt(tau), unit: `MPa(许用 ${fmt(tauAv)})`, tone: okTau ? 'ok' : 'bad' },
      { label: `F 作用变形量 λ`, value: fmt(deflection), unit: 'mm', tone: deflection <= H0 - Hb ? 'ok' : 'bad' },
    );
  }

  return {
    ok: true,
    result: {
      formula: 'k = G·d⁴/(8·D²·n) · τ = K·8F·D/(π·d³) ≤ [τ]',
      formulaAlt: 'K = (4C-1)/(4C-4)+0.615/C · H0 = n·t+(n2+0.5)·d · b = H0/D ≤ 2.6',
      steps,
      results,
      note: '适用于圆截面圆柱螺旋压缩弹簧(冷卷)。[τ] 按材料与载荷循环类型取值:油淬火-回火碳素钢丝静载约 0.5σb,动载降 20~30%;G=79 GPa 为弹簧钢典型值。拉伸弹簧、变刚度塔簧另按手册计算。',
      disclaimer: true,
    },
  };
}

export function springCopyText(input: SpringInput, digits = 2): string {
  const o = calcSpring(input, { digits });
  if (!o.result) return '';
  const r = o.result;
  return [
    '【圆柱螺旋压缩弹簧设计】',
    `d=${input.wireDiaMm} · D=${input.meanDiaMm} · n=${input.activeCoils} · n2=${input.endCoils ?? 2}`,
    '',
    ...r.steps.map((s, i) => `${i + 1}. ${s}`),
    '',
    ...r.results.map((x) => `${x.label}: ${x.value}${x.unit ? ' ' + x.unit : ''}`),
  ].join('\n');
}
