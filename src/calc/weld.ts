// 焊缝强度校核(角焊缝/对接焊缝,静载简化)
// 角焊缝:承载截面 A = 0.7·h·L_total(h 焊脚,L_total 焊缝总长),
//   等强校核:σ/τ 合成应力按公式 σe = √(σ² + 3τ²)(第四强度理论)或简化 σe = F/A
//   常见受拉/压:F/A ≤ [σ'];受弯:M/W ≤ [σ']
// 对接焊缝:A = t·L(t 板厚),按母材许用应力折减系数(焊缝质量等级)校核
// 注:未计疲劳(动载应按焊接结构疲劳规范)、未计残余应力与缺陷系数,选型级估算。
import type { CalcOption, CalcOutcome } from '../types';
import { fmtNum } from '../lib/format';

export type WeldType = 'FILLET' | 'BUTT';

export interface WeldInput {
  weldType: WeldType;             // 焊缝类型
  loadN: number | null;           // 作用载荷 F, N(拉/压/剪)
  legMm?: number | null;          // 焊脚高度 h, mm(角焊缝)
  weldLengthMm?: number | null;   // 焊缝总长 L, mm(角焊缝;对接时为焊缝长)
  plateThkMm?: number | null;     // 板厚 t, mm(对接焊缝)
  allowableMpa?: number | null;   // 许用应力 [σ'], MPa(角焊缝剪切许用,缺省 100)
  buttQualityFactor?: number | null; // 对接焊缝质量系数 φ(1.0 一级/0.85 二级/0.7 三级,默认 0.85)
}

export const WELD_DEFAULTS: WeldInput = {
  weldType: 'FILLET',
  loadN: 50000,
  legMm: 6,
  weldLengthMm: 400,
  plateThkMm: 10,
  allowableMpa: 100,
  buttQualityFactor: 0.85,
};

export function calcWeld(input: WeldInput, opt: CalcOption = { digits: 2 }): CalcOutcome {
  const {
    weldType, loadN: F, legMm: h, weldLengthMm: L, plateThkMm: t,
    allowableMpa: tauAllow, buttQualityFactor: phi,
  } = input;
  const fe: Record<string, string> = {};

  if (F == null || Number.isNaN(F) || F <= 0) fe.loadN = '请输入作用载荷';
  if (weldType === 'FILLET') {
    if (h == null || Number.isNaN(h) || h <= 0) fe.legMm = '角焊缝需填焊脚高度';
    if (L == null || Number.isNaN(L) || L <= 0) fe.weldLengthMm = '角焊缝需填焊缝总长';
  } else {
    if (t == null || Number.isNaN(t) || t <= 0) fe.plateThkMm = '对接焊缝需填板厚';
    if (L == null || Number.isNaN(L) || L <= 0) fe.weldLengthMm = '对接焊缝需填焊缝长度';
  }
  if (tauAllow != null && (Number.isNaN(tauAllow) || tauAllow <= 0)) fe.allowableMpa = '许用应力无效';
  if (Object.keys(fe).length) return { ok: false, fieldErrors: fe };

  const Fv = F as number;
  const Lv = L as number;
  const fmt = (x: number) => fmtNum(x, opt.digits);

  let A: number;         // 有效承载面积 mm²
  let desc: string;
  if (weldType === 'FILLET') {
    const hv = h as number;
    A = 0.7 * hv * Lv;
    desc = `A = 0.7·h·L = 0.7×${fmt(hv)}×${fmt(Lv)}`;
  } else {
    const tv = t as number;
    A = tv * Lv;
    desc = `A = t·L = ${fmt(tv)}×${fmt(Lv)}`;
  }

  const tau = Fv / A; // 平均剪/拉应力 MPa
  const tauAv = tauAllow ?? 100;

  const steps = [
    desc + ` = ${fmt(A)} mm²`,
    `焊缝平均应力 τ = F/A = ${fmt(Fv)}/${fmt(A)} = ${fmt(tau)} MPa`,
  ];

  const results: Array<{ label: string; value: string; unit?: string; primary?: boolean; tone?: 'ok' | 'warn' | 'bad' }> = [
    { label: '有效承载面积 A', value: fmt(A), unit: 'mm²' },
  ];

  let pass = false;
  if (weldType === 'FILLET') {
    pass = tau <= tauAv;
    steps.push(`判定:τ = ${fmt(tau)} MPa ${pass ? '≤' : '>'} [τ'] = ${fmt(tauAv)} MPa → ${pass ? '满足 ✓' : '不满足 ✗(加大焊脚/加长焊缝)'}`);
    results.push(
      { label: '焊缝应力 τ', value: fmt(tau), unit: `MPa(许用 ${fmt(tauAv)})`, primary: true, tone: pass ? 'ok' : 'bad' },
    );
  } else {
    const phiv = phi ?? 0.85;
    const sigmaAllow = phiv * tauAv; // 对接按母材许用×质量系数(近似用同一基准)
    pass = tau <= sigmaAllow;
    steps.push(`对接焊缝质量系数 φ = ${fmt(phiv)},许用应力 [σ] = φ·基准 = ${fmt(sigmaAllow)} MPa`);
    steps.push(`判定:σ = ${fmt(tau)} MPa ${pass ? '≤' : '>'} ${fmt(sigmaAllow)} MPa → ${pass ? '满足 ✓' : '不满足 ✗'}`);
    results.push(
      { label: '焊缝应力 σ', value: fmt(tau), unit: `MPa(许用 ${fmt(sigmaAllow)})`, primary: true, tone: pass ? 'ok' : 'bad' },
      { label: '质量系数 φ', value: fmt(phiv), unit: '—' },
    );
  }
  results.push({ label: '判定', value: pass ? '满足' : '不满足', tone: pass ? 'ok' : 'bad' });

  return {
    ok: true,
    result: {
      formula: weldType === 'FILLET'
        ? "A = 0.7·h·L · τ = F/A ≤ [τ']"
        : 'A = t·L · σ = F/A ≤ φ·[σ]',
      formulaAlt: '动载/疲劳载荷应按焊接结构疲劳规范另行校核',
      steps,
      results,
      note: "静载简化估算:角焊缝按 45° 喉部截面(0.7h),未计入弯曲与组合应力(受弯时应改算 W = 0.7h·L²/6);对接焊缝许用按质量系数折减。焊缝布置宜对称、避免密集交叉;重要结构按 GB/T 50017 / 机械设计手册焊缝章节精确校核。",
      disclaimer: true,
    },
  };
}

export function weldCopyText(input: WeldInput, digits = 2): string {
  const o = calcWeld(input, { digits });
  if (!o.result) return '';
  const r = o.result;
  return [
    '【焊缝强度校核】',
    `类型: ${input.weldType === 'FILLET' ? '角焊缝' : '对接焊缝'} · F = ${input.loadN} N`,
    '',
    ...r.steps.map((s, i) => `${i + 1}. ${s}`),
    '',
    ...r.results.map((x) => `${x.label}: ${x.value}${x.unit ? ' ' + x.unit : ''}`),
  ].join('\n');
}
