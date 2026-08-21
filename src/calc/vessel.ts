// 超高压缸筒设计(双层缩套 / 钢丝缠绕)
// 理论:厚壁圆筒 Lamé 解 + 第四强度理论(Mises) + 预紧(过盈 / 缠绕)降低内壁应力
//
// 关键结论(内壁当量应力随外径比 K = ro/ri 增大而趋近的下限):
//   单层圆筒(无预紧):  σe_min → √3·p ≈ 1.732·p    (K→∞)
//   预紧后(缩套/缠绕): σe_min → p                   (K→∞,当 σθ 与 σz 相等时)
// 因此:
//   [σ] > √3·p        → 单层即可满足(无需预紧)
//   p < [σ] ≤ √3·p    → 必须采用缩套 / 钢丝缠绕等预紧方案
//   [σ] ≤ p           → 任何方案均不可行,须提高材料强度或降低安全系数
//
// 单位:p、σ、E 为 MPa;d、r、Δ 为 mm;MPa·mm 与 N 等价。
import type { CalcOption, CalcOutcome } from '../types';
import { fmtNum } from '../lib/format';

export type VesselMethod = 'shrink' | 'wire';

export interface VesselInput {
  method: VesselMethod;
  pressure: number | null;   // 设计压力 p, MPa
  bore: number | null;       // 内径 di, mm
  sigmaS: number | null;     // 筒体(缩套)/内衬(缠绕)材料屈服 σs, MPa
  safety: number | null;     // 筒体/内衬安全系数 n
  od: number | null;         // 总外径 do, mm
  linerOd: number | null;    // 内衬外径 d1, mm(仅缠绕)
  wireSigmaS: number | null; // 钢丝屈服 σs, MPa(仅缠绕)
  wireSafety: number | null; // 钢丝安全系数(仅缠绕)
  wireDia: number | null;    // 钢丝直径, mm(仅缠绕)
}

export const VESSEL_DEFAULTS: VesselInput = {
  method: 'shrink',
  pressure: 600,
  bore: 50,
  sigmaS: 1200,
  safety: 1.6,
  od: 125,
  linerOd: 62,
  wireSigmaS: 1800,
  wireSafety: 1.5,
  wireDia: 3,
};

/** 钢的弹性模量,MPa(过盈 / 缠绕计算用) */
export const STEEL_E = 210000;
/** 钢线膨胀系数,1/℃(热套温差参考) */
export const STEEL_ALPHA = 11e-6;

/** 第四强度理论(von Mises)当量应力,输入三个主应力 */
export function mises(s1: number, s2: number, s3: number): number {
  return Math.sqrt(0.5 * ((s1 - s2) ** 2 + (s2 - s3) ** 2 + (s3 - s1) ** 2));
}

/**
 * 组合筒(内半径 ri,分界半径 r1,外半径 ro)受内压 p;
 * 内筒(ri→r1)额外受外压 pExt(缩套界面压力 / 钢丝缠绕外压)。
 * 返回内壁合成当量应力(Mises,闭端含轴向应力)。
 */
export function innerSyntheMises(
  p: number,
  pExt: number,
  ri: number,
  r1: number,
  ro: number,
): number {
  const ro2 = ro * ro;
  const ri2 = ri * ri;
  const r12 = r1 * r1;
  // 内压 p 作用于整个组合筒引起的内壁切向 / 轴向应力
  const sigThetaP = (p * (ro2 + ri2)) / (ro2 - ri2);
  const sigZ = (p * ri2) / (ro2 - ri2);
  // 外压 pExt 作用于内筒(ri→r1)引起的内壁切向压应力
  const sigThetaExt = pExt > 0 ? (-2 * pExt * r12) / (r12 - ri2) : 0;
  const sigTheta = sigThetaP + sigThetaExt;
  const sigR = -p; // 内壁径向应力 = 内压(外压对内壁径向无贡献)
  return mises(sigTheta, sigZ, sigR);
}

export interface InterfaceSolution {
  feasible: boolean;
  /** 所需界面压力(使内壁当量 ≤ 许用),不可行时为极小值点 */
  pExt: number;
  /** 该结构能达到的内壁最小当量应力 */
  minMises: number;
}

/**
 * 求使内壁合成当量应力降到 allow 所需的最小界面压力(缩套 p_c / 缠绕 p_w)。
 * 内壁当量应力随 pExt 先降后升(过盈过大时压应力绝对值反而使当量回升),
 * 下降段终点在合成 σθ = σz 处;若该点仍 > allow,则结构不可行。
 */
export function requiredInterfacePressure(
  p: number,
  ri: number,
  r1: number,
  ro: number,
  allow: number,
): InterfaceSolution {
  const ro2 = ro * ro;
  const ri2 = ri * ri;
  const r12 = r1 * r1;
  const sigThetaP = (p * (ro2 + ri2)) / (ro2 - ri2);
  const sigZ = (p * ri2) / (ro2 - ri2);
  const k = (2 * r12) / (r12 - ri2); // 每单位 pExt 产生的内壁切向压应力幅
  const pStar = Math.max(0, (sigThetaP - sigZ) / k); // σθ = σz 处,内壁当量最小
  const minMises = innerSyntheMises(p, pStar, ri, r1, ro);
  if (minMises > allow) return { feasible: false, pExt: pStar, minMises };
  const f0 = innerSyntheMises(p, 0, ri, r1, ro);
  if (f0 <= allow) return { feasible: true, pExt: 0, minMises: f0 };
  // 下降段二分求根
  let lo = 0;
  let hi = pStar;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (innerSyntheMises(p, mid, ri, r1, ro) <= allow) hi = mid;
    else lo = mid;
  }
  return { feasible: true, pExt: hi, minMises };
}

/**
 * 双层缩套(同材料 E)直径过盈量 Δ,由界面压力 p_c 反算。
 * Δ = 4·p_c·r1³·(ro²−ri²) / (E·(ro²−r1²)·(r1²−ri²))
 * 返回直径过盈,mm。
 */
export function shrinkFitInterference(
  p_c: number,
  ri: number,
  r1: number,
  ro: number,
  E = STEEL_E,
): number {
  const num = 4 * p_c * r1 * r1 * r1 * (ro * ro - ri * ri);
  const den = E * (ro * ro - r1 * r1) * (r1 * r1 - ri * ri);
  return num / den;
}

export function calcVessel(input: VesselInput, opt: CalcOption = { digits: 2 }): CalcOutcome {
  const { method, pressure, bore, sigmaS, safety, od } = input;
  const fe: Record<string, string> = {};

  if (pressure == null || Number.isNaN(pressure)) fe.pressure = '请输入设计压力';
  else if (pressure <= 0) fe.pressure = '压力必须大于 0';
  if (bore == null || Number.isNaN(bore)) fe.bore = '请输入内径';
  else if (bore <= 0) fe.bore = '内径必须大于 0';
  if (sigmaS == null || Number.isNaN(sigmaS)) fe.sigmaS = '请输入材料屈服强度';
  else if (sigmaS <= 0) fe.sigmaS = '屈服强度必须大于 0';
  if (safety == null || Number.isNaN(safety)) fe.safety = '请输入安全系数';
  else if (safety < 1) fe.safety = '安全系数不应小于 1';
  if (od == null || Number.isNaN(od)) fe.od = '请输入总外径';
  else if (od <= (bore ?? 0)) fe.od = '外径必须大于内径';

  if (method === 'wire') {
    const { linerOd, wireSigmaS, wireSafety, wireDia } = input;
    if (linerOd == null || Number.isNaN(linerOd)) fe.linerOd = '请输入内衬外径';
    else if (linerOd <= (bore ?? 0)) fe.linerOd = '内衬外径必须大于内径';
    else if (linerOd >= (od ?? 0)) fe.linerOd = '内衬外径必须小于总外径';
    if (wireSigmaS == null || Number.isNaN(wireSigmaS)) fe.wireSigmaS = '请输入钢丝屈服强度';
    else if (wireSigmaS <= 0) fe.wireSigmaS = '屈服强度必须大于 0';
    if (wireSafety == null || Number.isNaN(wireSafety)) fe.wireSafety = '请输入钢丝安全系数';
    else if (wireSafety < 1) fe.wireSafety = '安全系数不应小于 1';
    if (wireDia == null || Number.isNaN(wireDia)) fe.wireDia = '请输入钢丝直径';
    else if (wireDia <= 0) fe.wireDia = '钢丝直径必须大于 0';
  }

  if (Object.keys(fe).length) return { ok: false, fieldErrors: fe };

  const p = pressure as number;
  const ri = (bore as number) / 2;
  const ro = (od as number) / 2;
  const allow = (sigmaS as number) / (safety as number);
  const fmt = (n: number) => fmtNum(n, opt.digits);
  const limitSingle = Math.sqrt(3) * p; // 单层(无预紧)内壁当量下限

  // 单层可行性判定(两种方案共用)
  const singleVerdict =
    allow > limitSingle
      ? `[σ]=${fmt(allow)} MPa > √3·p=${fmt(limitSingle)} MPa,单层圆筒即可满足,无需预紧`
      : allow > p
        ? `[σ]=${fmt(allow)} MPa 介于 p 与 √3·p 之间,单层不可行,须采用预紧方案`
        : `[σ]=${fmt(allow)} MPa ≤ p=${fmt(p)} MPa,即使无限加厚也无法满足,须提高材料强度或降低安全系数`;

  if (method === 'shrink') {
    const r1 = Math.sqrt(ri * ro); // 等强度分界半径
    const sol = requiredInterfacePressure(p, ri, r1, ro, allow);

    if (!sol.feasible) {
      return {
        ok: true,
        result: {
          formula: '缩套筒内壁 σe = √(½[(σθ−σz)²+(σz−σr)²+(σr−σθ)²]) ≤ [σ]',
          formulaAlt: `预紧后内壁当量下限为 p=${fmt(p)} MPa,当前结构最小可达 ${fmt(sol.minMises)} MPa`,
          steps: [
            singleVerdict,
            `分界半径 r₁ = √(ri·ro) = ${fmt(r1)} mm,分界直径 d₁ = ${fmt(2 * r1)} mm`,
            `该结构内壁当量应力最小值 = ${fmt(sol.minMises)} MPa(在 σθ=σz 时)`,
            `σe_min = ${fmt(sol.minMises)} MPa > [σ] = ${fmt(allow)} MPa,当前外径 / 材料无法满足`,
          ],
          results: [
            { label: '内壁最小当量应力 σe_min', value: fmt(sol.minMises), unit: 'MPa', tone: 'bad' },
            { label: '许用应力 [σ]', value: fmt(allow), unit: 'MPa' },
            { label: '所需界面压力 p_c', value: '—', unit: 'MPa' },
            { label: '直径过盈量 Δ', value: '—', unit: 'mm' },
          ],
          note: `该结构在许用应力 ${fmt(allow)} MPa 下无解:即使界面压力取到使内壁应力最小的点,内壁当量应力仍达 ${fmt(sol.minMises)} MPa。请加大总外径 do、提高材料屈服强度 σs,或放宽安全系数。`,
          disclaimer: true,
        },
      };
    }

    const p_c = sol.pExt;
    const sig = innerSyntheMises(p, p_c, ri, r1, ro);
    const delta = shrinkFitInterference(p_c, ri, r1, ro);
    const d1 = 2 * r1;

    // 外筒内壁校核(受内压 p_c,r1→ro)
    const ro2 = ro * ro;
    const r12 = r1 * r1;
    const sigThO = (p_c * (ro2 + r12)) / (ro2 - r12);
    const sigZO = (p_c * r12) / (ro2 - r12);
    const sigO = mises(sigThO, sigZO, -p_c);
    const outerOk = sigO <= allow;

    // 参考热套温差(加热外筒,预留装配间隙取 0.05%·d1)
    const dT = (delta + 0.0005 * d1) / (STEEL_ALPHA * d1);

    const steps = [
      singleVerdict,
      `分界半径 r₁ = √(ri·ro) = √(${fmt(ri)}×${fmt(ro)}) = ${fmt(r1)} mm(等强度,分界直径 d₁=${fmt(d1)} mm)`,
      `内压引起的组合筒内壁切向 σθ_p = p·(ro²+ri²)/(ro²−ri²) = ${fmt((p * (ro2 + ri * ri)) / (ro2 - ri * ri))} MPa`,
      `所需界面压力 p_c = ${fmt(p_c)} MPa(使内壁合成当量应力降到 [σ]=${fmt(allow)} MPa)`,
      `直径过盈量 Δ = 4·p_c·r₁³(ro²−ri²)/(E(ro²−r₁²)(r₁²−ri²)) = ${fmt(delta)} mm`,
      `内壁合成当量应力 σe = ${fmt(sig)} MPa ≤ [σ]=${fmt(allow)} MPa ✓`,
      `外筒内壁当量应力 σe_o = ${fmt(sigO)} MPa ${outerOk ? '≤ [σ] ✓' : '> [σ] ⚠'}`,
    ];

    return {
      ok: true,
      result: {
        formula: '缩套筒内壁 σe = √(½[(σθ−σz)²+(σz−σr)²+(σr−σθ)²]) ≤ [σ]',
        formulaAlt: `分界半径 r₁=√(ri·ro);直径过盈 Δ = 4·p_c·r₁³(ro²−ri²)/(E(ro²−r₁²)(r₁²−ri²))`,
        steps,
        results: [
          { label: '内壁合成当量应力 σe', value: fmt(sig), unit: 'MPa', primary: true, tone: 'ok' },
          { label: '许用应力 [σ]', value: fmt(allow), unit: 'MPa' },
          { label: '分界直径 d₁', value: fmt(d1), unit: 'mm' },
          { label: '内筒壁厚 t₁', value: fmt(r1 - ri), unit: 'mm' },
          { label: '外筒壁厚 t₂', value: fmt(ro - r1), unit: 'mm' },
          { label: '所需界面压力 p_c', value: fmt(p_c), unit: 'MPa' },
          { label: '直径过盈量 Δ', value: fmt(delta), unit: 'mm', primary: true },
          { label: '外筒内壁当量应力 σe_o', value: fmt(sigO), unit: 'MPa', tone: outerOk ? 'ok' : 'warn' },
          { label: '参考热套温差 ΔT', value: fmt(dT), unit: '℃' },
        ],
        note: `过盈量为直径过盈,加工时内筒外径取 d₁+Δ、外筒内径取 d₁。参考热套温差按加热外筒估算(预留 0.05%·d₁ 装配间隙),实际应控制在材料回火温度以内,必要时改用冷缩内筒或液压胀形。外筒内壁为外筒最危险处,已一并校核。`,
        disclaimer: true,
      },
    };
  }

  // —— 钢丝缠绕 ——
  const r1 = (input.linerOd as number) / 2;
  const allowWire = (input.wireSigmaS as number) / (input.wireSafety as number);
  const sol = requiredInterfacePressure(p, ri, r1, ro, allow);

  if (!sol.feasible) {
    return {
      ok: true,
      result: {
        formula: '内衬内壁 σe = √(½[(σθ−σz)²+(σz−σr)²+(σr−σθ)²]) ≤ [σ]内衬',
        formulaAlt: `预紧后内壁当量下限为 p=${fmt(p)} MPa,当前结构最小可达 ${fmt(sol.minMises)} MPa`,
        steps: [
          singleVerdict,
          `内衬外径 d₁=${fmt(2 * r1)} mm,缠绕外径 do=${fmt(2 * ro)} mm`,
          `该结构内衬内壁当量应力最小值 = ${fmt(sol.minMises)} MPa`,
          `σe_min = ${fmt(sol.minMises)} MPa > [σ]内衬 = ${fmt(allow)} MPa,无法满足`,
        ],
        results: [
          { label: '内衬内壁最小当量应力', value: fmt(sol.minMises), unit: 'MPa', tone: 'bad' },
          { label: '内衬许用应力 [σ]', value: fmt(allow), unit: 'MPa' },
        ],
        note: `该结构在内衬许用应力 ${fmt(allow)} MPa 下无解。请加大缠绕外径 do、提高内衬材料强度,或放宽安全系数。`,
        disclaimer: true,
      },
    };
  }

  const p_w = sol.pExt;
  const sigLiner = innerSyntheMises(p, p_w, ri, r1, ro);
  // 钢丝工作环向应力:组合筒受内压 p,在 r=r1 处(钢丝层内壁,最危险)的切向应力
  const ro2 = ro * ro;
  const ri2 = ri * ri;
  const r12 = r1 * r1;
  const sigWire = (p * ri2 * (1 + ro2 / r12)) / (ro2 - ri2);
  const wireOk = sigWire <= allowWire;
  const thick = ro - r1; // 缠绕层径向厚度
  const layers = Math.ceil(thick / (input.wireDia as number));

  const steps = [
    singleVerdict,
    `内衬外径 d₁=${fmt(2 * r1)} mm,缠绕外径 do=${fmt(2 * ro)} mm`,
    `所需缠绕预紧界面压力 p_w = ${fmt(p_w)} MPa(使内衬内壁当量降到 [σ]内衬=${fmt(allow)} MPa)`,
    `内衬内壁合成当量应力 σe = ${fmt(sigLiner)} MPa ≤ [σ]内衬=${fmt(allow)} MPa ✓`,
    `钢丝工作环向应力 σθ_w = p·ri²/(ro²−ri²)·(1+ro²/r₁²) = ${fmt(sigWire)} MPa ${wireOk ? '≤ [σ]钢丝 ✓' : '> [σ]钢丝 ⚠'}`,
    `缠绕层厚度 t = ro−r₁ = ${fmt(thick)} mm,层数 N = ⌈t/d_w⌉ = ${fmt(layers)} 层`,
  ];

  return {
    ok: true,
    result: {
      formula: '内衬内壁 σe = √(½[(σθ−σz)²+(σz−σr)²+(σr−σθ)²]) ≤ [σ]内衬',
      formulaAlt: `钢丝工作环向应力 σθ_w = p·ri²/(ro²−ri²)·(1+ro²/r₁²) ≤ [σ]钢丝`,
      steps,
      results: [
        { label: '内衬内壁合成当量应力 σe', value: fmt(sigLiner), unit: 'MPa', primary: true, tone: 'ok' },
        { label: '内衬许用应力 [σ]', value: fmt(allow), unit: 'MPa' },
        { label: '缠绕预紧界面压力 p_w', value: fmt(p_w), unit: 'MPa' },
        { label: '钢丝工作环向应力 σθ_w', value: fmt(sigWire), unit: 'MPa', tone: wireOk ? 'ok' : 'bad' },
        { label: '钢丝许用应力 [σ]钢丝', value: fmt(allowWire), unit: 'MPa' },
        { label: '缠绕层厚度 t', value: fmt(thick), unit: 'mm' },
        { label: '缠绕层数 N', value: fmt(layers), unit: '层', primary: true },
        { label: '钢丝直径 d_w', value: fmt(input.wireDia as number), unit: 'mm' },
      ],
      note: `钢丝按等强度分段缠绕预紧(内层预紧力大、外层小),使内衬内壁在工作压力下处于较低应力。本计算钢丝应力为工作压力引起的环向应力,未叠加预紧残余应力,实际钢丝峰值应力应结合缠绕工艺逐层校核;钢丝许用应力取钢丝屈服强度 / 安全系数,建议安全系数 ≥ 1.5。缠绕层为最内层钢丝最危险。`,
      disclaimer: true,
    },
  };
}

/** 生成可复制的结果文本 */
export function vesselCopyText(input: VesselInput, digits = 2): string {
  const fmt = (n: number) => fmtNum(n, digits);
  const o = calcVessel(input, { digits });
  if (!o.result) return '';
  const r = o.result;
  const head = input.method === 'shrink' ? '【超高压缸筒设计(双层缩套)】' : '【超高压缸筒设计(钢丝缠绕)】';
  return [
    head,
    `设计压力 p = ${fmt(input.pressure ?? 0)} MPa`,
    `内径 di = ${fmt(input.bore ?? 0)} mm`,
    `材料屈服 σs = ${fmt(input.sigmaS ?? 0)} MPa,安全系数 n = ${fmt(input.safety ?? 0)}`,
    `总外径 do = ${fmt(input.od ?? 0)} mm`,
    ...(input.method === 'wire'
      ? [
          `内衬外径 d₁ = ${fmt(input.linerOd ?? 0)} mm`,
          `钢丝屈服 σs = ${fmt(input.wireSigmaS ?? 0)} MPa,安全系数 n = ${fmt(input.wireSafety ?? 0)}`,
          `钢丝直径 d_w = ${fmt(input.wireDia ?? 0)} mm`,
        ]
      : []),
    '',
    `公式: ${r.formula}`,
    '',
    ...r.steps.map((s, i) => `${i + 1}. ${s}`),
    '',
    ...r.results.map((x) => `${x.label}: ${x.value}${x.unit ? ' ' + x.unit : ''}`),
  ].join('\n');
}
