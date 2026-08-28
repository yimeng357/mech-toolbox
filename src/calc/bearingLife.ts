// 滚动轴承疲劳寿命计算(ISO 281 / GB/T 6391)
// 理论:基本额定寿命 L10 = (C/P)^ε,球轴承 ε = 3,滚子轴承 ε = 10/3;
//   当量动载荷 P = X·Fr + Y·Fa,当 Fa/(V·Fr) ≤ e 时取 P = Fr(V = 1,内圈旋转);
//   小时寿命 L10h = 10^6 / (60·n) · L10;
//   目标寿命反算所需额定动载荷 Creq = P · (60·n·Lh / 10^6)^(1/ε)。
// 工况修正:温度系数 ft 乘在 C 上(≤120℃ 取 1.0);冲击/载荷性质系数 fd 乘在 P 上。
// 注:未计入可靠性修正 a1 与材料/润滑修正 aXYZ(ISO 281 修正额定寿命),
//     也未做额定静载荷 C0 与最小载荷校核;深沟球轴承 X/Y/e 为典型值,精确值查轴承样本。
import type { CalcOption, CalcOutcome } from '../types';
import { fmtNum } from '../lib/format';

export type BearingKind = 'BALL' | 'ROLLER';

export interface BearingLifeInput {
  kind: BearingKind;                  // 轴承类型:球轴承 / 滚子轴承
  dynamicLoadRatingKn: number | null; // 额定动载荷 C, kN(样本值)
  radialLoadKn: number | null;        // 径向载荷 Fr, kN
  axialLoadKn: number | null;         // 轴向载荷 Fa, kN(纯径向填 0)
  speedRpm: number | null;            // 工作转速 n, rpm
  loadFactor?: number | null;         // 冲击/载荷系数 fd(默认 1.0)
  tempFactor?: number | null;         // 温度系数 ft(默认 1.0)
  targetLifeHours?: number | null;    // 目标寿命 Lh, h(可选,反算所需 C)
  xFactor?: number | null;            // 径向动载荷系数 X(默认 0.56)
  yFactor?: number | null;            // 轴向动载荷系数 Y(默认 1.50)
  eFactor?: number | null;            // 轴向载荷判别系数 e(默认 0.26)
}

export const BEARING_LIFE_DEFAULTS: BearingLifeInput = {
  kind: 'BALL',
  dynamicLoadRatingKn: 32.5,
  radialLoadKn: 5,
  axialLoadKn: 1.5,
  speedRpm: 1450,
  loadFactor: 1.0,
  tempFactor: 1.0,
  targetLifeHours: 20000,
  xFactor: 0.56,
  yFactor: 1.5,
  eFactor: 0.26,
};

export function calcBearingLife(input: BearingLifeInput, opt: CalcOption = { digits: 2 }): CalcOutcome {
  const {
    kind, dynamicLoadRatingKn: C, radialLoadKn: Fr, axialLoadKn: Fa,
    speedRpm: n, loadFactor: fd, tempFactor: ft,
    targetLifeHours: Lh, xFactor: X, yFactor: Y, eFactor: e,
  } = input;
  const fe: Record<string, string> = {};

  if (C == null || Number.isNaN(C) || C <= 0) fe.dynamicLoadRatingKn = '请输入大于 0 的额定动载荷';
  if (Fr == null || Number.isNaN(Fr) || Fr <= 0) fe.radialLoadKn = '请输入大于 0 的径向载荷';
  if (Fa == null || Number.isNaN(Fa) || Fa < 0) fe.axialLoadKn = '轴向载荷不能为负';
  if (n == null || Number.isNaN(n) || n <= 0) fe.speedRpm = '请输入大于 0 的转速';
  if (fd != null && fd <= 0) fe.loadFactor = '载荷系数必须大于 0';
  if (ft != null && ft <= 0) fe.tempFactor = '温度系数必须大于 0';
  if (Object.keys(fe).length) return { ok: false, fieldErrors: fe };

  const Cv = C as number;
  const Frv = Fr as number;
  const Fav = Fa as number;
  const nv = n as number;
  const fdv = fd ?? 1;
  const ftv = ft ?? 1;
  const Xv = X ?? 0.56;
  const Yv = Y ?? 1.5;
  const ev = e ?? 0.26;
  const fmt = (x: number) => fmtNum(x, opt.digits);

  const eps = kind === 'BALL' ? 3 : 10 / 3;
  const ratio = Fav / Frv; // V = 1(内圈旋转)
  const useCombined = ratio > ev;
  const pBase = useCombined ? Xv * Frv + Yv * Fav : Frv;
  const P = fdv * pBase;   // 计入冲击的当量动载荷, kN
  const Ceff = ftv * Cv;   // 计入温度的有效额定动载荷, kN

  const steps: string[] = [
    `轴承类型: ${kind === 'BALL' ? '球轴承(寿命指数 ε = 3)' : '滚子轴承(寿命指数 ε = 10/3)'}`,
    `额定动载荷 C = ${fmt(Cv)} kN, 温度系数 ft = ${ftv}, 有效 C' = ${fmt(Ceff)} kN`,
    `载荷: Fr = ${fmt(Frv)} kN, Fa = ${fmt(Fav)} kN, 冲击系数 fd = ${fdv}`,
    `Fa/Fr = ${fmt(ratio)} ${useCombined ? '>' : '≤'} e = ${ev}, 采用 ${useCombined ? 'P = X·Fr + Y·Fa' : 'P = Fr'}`,
  ];
  if (useCombined) {
    steps.push(`当量动载荷 P = X·Fr + Y·Fa = ${Xv}×${fmt(Frv)} + ${Yv}×${fmt(Fav)} = ${fmt(pBase)} kN, 计入冲击后 P' = fd·P = ${fmt(P)} kN`);
  } else {
    steps.push(`当量动载荷 P = Fr = ${fmt(pBase)} kN, 计入冲击后 P' = fd·P = ${fmt(P)} kN`);
  }

  const L10 = (Ceff / P) ** eps; // 百万转
  steps.push(`L10 = (C'/P')^ε = (${fmt(Ceff)}/${fmt(P)})^${fmt(eps)} = ${fmt(L10)} 百万转`);
  const L10h = (1e6 / (60 * nv)) * L10;
  steps.push(`L10h = 10^6/(60·n) × L10 = 10^6/(60×${fmt(nv)}) × ${fmt(L10)} = ${fmt(L10h)} 小时`);

  let lifeTone: 'ok' | 'warn' | 'bad' | undefined;
  const results: Array<{ label: string; value: string; unit?: string; primary?: boolean; tone?: 'ok' | 'warn' | 'bad' }> = [
    { label: '当量动载荷 P', value: fmt(P), unit: 'kN' },
    { label: '额定寿命 L10', value: fmt(L10), unit: '百万转' },
    { label: '基本额定寿命 L10h', value: fmt(L10h), unit: 'h', primary: true },
  ];

  if (Lh != null && !Number.isNaN(Lh) && Lh > 0) {
    const Creq = P * ((60 * nv * Lh) / 1e6) ** (1 / eps);
    const margin = L10h / Lh;
    lifeTone = margin >= 1 ? 'ok' : margin >= 0.8 ? 'warn' : 'bad';
    steps.push(`目标寿命 Lh = ${fmt(Lh)} h: 所需额定动载荷 Creq = P'·(60·n·Lh/10^6)^(1/ε) = ${fmt(Creq)} kN`);
    results.push(
      { label: `Lh = ${fmt(Lh)} h 所需 C`, value: fmt(Creq), unit: 'kN' },
      { label: '寿命富余 L10h / Lh', value: fmt(margin), unit: '×', tone: lifeTone },
    );
  }

  return {
    ok: true,
    result: {
      formula: 'L10 = (C/P)^ε · L10h = 10^6/(60·n)·L10 (ISO 281)',
      formulaAlt: 'P = X·Fr + Y·Fa(当 Fa/Fr > e);ε 球轴承 3 / 滚子 10/3',
      steps,
      results,
      note: 'X/Y/e 取深沟球轴承典型值(0.56/1.5/0.26),角接触球、圆锥滚子等请按样本填入;未校核额定静载荷 C0、最小载荷与修正寿命 a1·aXYZ。',
      disclaimer: true,
    },
  };
}

/** 生成可复制的结果文本 */
export function bearingLifeCopyText(input: BearingLifeInput, digits = 2): string {
  const fmt = (n: number) => fmtNum(n, digits);
  const o = calcBearingLife(input, { digits });
  if (!o.result) return '';
  const r = o.result;
  return [
    '【滚动轴承寿命计算】',
    `轴承类型: ${input.kind === 'BALL' ? '球轴承' : '滚子轴承'}`,
    `额定动载荷 C = ${fmt(input.dynamicLoadRatingKn ?? 0)} kN`,
    `载荷: Fr = ${fmt(input.radialLoadKn ?? 0)} kN, Fa = ${fmt(input.axialLoadKn ?? 0)} kN`,
    `转速 n = ${fmt(input.speedRpm ?? 0)} rpm`,
    '',
    `公式: ${r.formula}`,
    '',
    ...r.steps.map((s, i) => `${i + 1}. ${s}`),
    '',
    ...r.results.map((x) => `${x.label}: ${x.value}${x.unit ? ' ' + x.unit : ''}`),
  ].join('\n');
}
