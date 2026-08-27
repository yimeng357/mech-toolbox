// 超高压缸筒设计(双层缩套 / 钢丝缠绕 / 自增强 / 多层热套)
// 理论:厚壁圆筒 Lamé 解 + 第四强度理论(Mises) + 预紧(过盈 / 缠绕 / 自增强)降低内壁应力
//
// 关键结论(内壁当量应力随外径比 K = ro/ri 增大而趋近的下限):
//   单层圆筒(无预紧):  σe_min → √3·p ≈ 1.732·p    (K→∞)
//   预紧后(缩套/缠绕): σe_min → p                   (K→∞,当 σθ 与 σz 相等时)
//   自增强后:          σe_min → p                   (K→∞,与缠绕类似)
// 因此:
//   [σ] > √3·p        → 单层即可满足(无需预紧)
//   p < [σ] ≤ √3·p    → 须采用缩套 / 钢丝缠绕 / 自增强等预紧方案
//   [σ] ≤ p           → 任何方案均不可行,须提高材料强度或降低安全系数
//
// 单位:p、σ、E 为 MPa;d、r、Δ 为 mm;MPa·mm 与 N 等价。
import type { CalcOption, CalcOutcome } from '../types';
import { fmtNum } from '../lib/format';

export type VesselMethod = 'shrink' | 'wire' | 'autofrettage' | 'multilayer';

export interface VesselInput {
  method: VesselMethod;
  pressure: number | null;   // 设计压力 p, MPa
  bore: number | null;       // 内径 di, mm
  sigmaS: number | null;     // 筒体(缩套)/内衬(缠绕)/筒体(自增强)材料屈服 σs, MPa
  safety: number | null;     // 筒体/内衬/筒体安全系数 n
  od: number | null;         // 总外径 do, mm
  linerOd: number | null;    // 内衬外径 d1, mm(仅缠绕)
  wireSigmaS: number | null; // 钢丝屈服 σs, MPa(仅缠绕)
  wireSafety: number | null; // 钢丝安全系数(仅缠绕)
  wireDia: number | null;    // 钢丝直径, mm(仅缠绕)
  // 自增强参数
  autofrettageRatio?: number | null; // 过应变深度比 rp/ri(>1),仅自增强
  // 多层热套参数
  layerCount?: number | null;  // 层数(≥2),仅多层热套
  layerSigmaS?: number | null; // 各层屈服强度 σs, MPa(仅多层热套)
  layerSafety?: number | null; // 各层安全系数(仅多层热套)
  layerOd?: string | null;     // 各层外径 d₂,d₃,...(逗号分隔),仅多层热套
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
  autofrettageRatio: 1.5,
  layerCount: 3,
  layerSigmaS: 1000,
  layerSafety: 1.6,
  layerOd: '80,110',
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
  if (method === 'autofrettage') {
    const { autofrettageRatio } = input;
    if (autofrettageRatio == null || Number.isNaN(autofrettageRatio)) fe.autofrettageRatio = '请输入过应变深度比';
    else if (autofrettageRatio <= 1) fe.autofrettageRatio = '过应变深度比必须大于 1';
    else if (autofrettageRatio > 10) fe.autofrettageRatio = '过应变深度比通常 ≤ 5';
  }
  if (method === 'multilayer') {
    const { layerCount, layerSigmaS, layerSafety, layerOd } = input;
    if (layerCount == null || Number.isNaN(layerCount)) fe.layerCount = '请输入层数';
    else if (layerCount < 2) fe.layerCount = '层数至少为 2';
    else if (layerCount > 10) fe.layerCount = '层数通常 ≤ 5';
    if (layerSigmaS == null || Number.isNaN(layerSigmaS)) fe.layerSigmaS = '请输入各层屈服强度';
    else if (layerSigmaS <= 0) fe.layerSigmaS = '屈服强度必须大于 0';
    if (layerSafety == null || Number.isNaN(layerSafety)) fe.layerSafety = '请输入各层安全系数';
    else if (layerSafety < 1) fe.layerSafety = '安全系数不应小于 1';
    if (!layerOd || !String(layerOd).trim()) fe.layerOd = '请输入各层外径(逗号分隔)';
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
  }  // —— 自增强 ——
  if (method === 'autofrettage') {
    const rhoRatio = input.autofrettageRatio as number; // rp/ri
    const K = ro / ri;
    if (rhoRatio >= K) {
      // 过应变比超出外径比 → 全塑性
      return {
        ok: true,
        result: {
          formula: '自增强 σe = √(½[(σθ_res+σθ_p−σz)²+(σz−σr)²+(σr−σθ_res−σθ_p)²]) ≤ [σ]',
          formulaAlt: `过应变深度比 rp/ri=${fmt(rhoRatio)} ≥ K=${fmt(K)},圆筒完全塑性`,
          steps: [
            singleVerdict,
            `外径比 K = ro/ri = ${fmt(K)}`,
            `过应变深度比 rp/ri = ${fmt(rhoRatio)} ≥ K = ${fmt(K)},整个筒壁已塑性屈服`,
            `建议降低过应变深度比或加大外径`,
          ],
          results: [
            { label: '外径比 K', value: fmt(K), unit: '—' },
            { label: '过应变深度比 rp/ri', value: fmt(rhoRatio), unit: '—', tone: 'bad' },
          ],
          note: '过应变深度比不应超过外径比。当 rp/ri ≥ K 时,整个筒壁在自增强过程中完全塑性屈服,卸载后无法建立有效的残余压应力。建议 rp/ri 取 1.2~1.8。',
          disclaimer: true,
        },
      };
    }

    // 自增强压力(根据 Bode 方程近似)
    // p_a = σs/(√3) · ln(rp/ri) + σs/(√3) · (1 - (rp/ro)²) / 2
    // 简化: p_a = σs/√3 · ln(K) · (rp/ri 近似)
    // 实际使用标准公式:
    const rp = ri * rhoRatio;
    const sigYield = sigmaS as number;
    // 完全塑性时的自增强压力
    const pAFull = (sigYield / Math.sqrt(3)) * Math.log(K);
    // 有限塑性(ρ < K): p_a = (σs/√3)·(1 - (ri/rp)²)/2 · (K²-1)/(K²) + (σs/√3)·ln(rp/ri)
    const pA = pAFull * (rhoRatio / K); // 简化近似
    // 残余应力(内壁切向压应力)
    const sigBoreRes = -2 * pA / (K * K - 1);
    // 工作压力下内壁应力
    const sigTHWork = p * (K * K + 1) / (K * K - 1);
    const sigZWork = p / (K * K - 1);
    const sigRWork = -p;
    // 合成
    const sigTHNet = sigTHWork + sigBoreRes;
    const sigBoreNet = mises(sigTHNet, sigZWork, sigRWork);
    const ok = sigBoreNet <= allow;

    // 未自增强时的内壁应力(对比)
    const sigBoreSingle = mises(sigTHWork, sigZWork, sigRWork);

    return {
      ok: true,
      result: {
        formula: '自增强内壁 σe = √(½[(σθ_p+σθ_res−σz)²+(σz−σr)²+(σr−σθ_p−σθ_res)²]) ≤ [σ]',
        formulaAlt: `p_a≈${fmt(pA)} MPa; σθ_res(bore)≈${fmt(sigBoreRes)} MPa; 未自增强时 σe_single=${fmt(sigBoreSingle)} MPa`,
        steps: [
          singleVerdict,
          `外径比 K = ro/ri = ${fmt(K)}`,
          `过应变深度比 rp/ri = ${fmt(rhoRatio)} → rp = ${fmt(rp)} mm`,
          `自增强压力 p_a ≈ ${fmt(pA)} MPa(使内壁至 rp 处发生塑性屈服)`,
          `内壁残余切向压应力 σθ_res ≈ ${fmt(sigBoreRes)} MPa`,
          `工作压力下内壁切向 σθ_p = p·(K²+1)/(K²-1) = ${fmt(sigTHWork)} MPa`,
          `合成内壁切向 σθ_net = σθ_p + σθ_res = ${fmt(sigTHNet)} MPa`,
          `内壁当量 σe = ${fmt(sigBoreNet)} MPa ${ok ? '≤ [σ] ✓' : '> [σ] ⚠'}`,
          `未自增强时内壁当量 σe_single = ${fmt(sigBoreSingle)} MPa(对比:降低 ${fmt((1 - sigBoreNet / sigBoreSingle) * 100)}%)`,
        ],
        results: [
          { label: '内壁合成当量应力 σe', value: fmt(sigBoreNet), unit: 'MPa', primary: true, tone: ok ? 'ok' : 'bad' },
          { label: '许用应力 [σ]', value: fmt(allow), unit: 'MPa' },
          { label: '自增强压力 p_a', value: fmt(pA), unit: 'MPa', primary: true },
          { label: '内壁残余切向应力 σθ_res', value: fmt(sigBoreRes), unit: 'MPa' },
          { label: '未自增强时内壁当量 σe_single', value: fmt(sigBoreSingle), unit: 'MPa' },
          { label: '应力降低百分比', value: fmt((1 - sigBoreNet / sigBoreSingle) * 100), unit: '%', tone: ok ? 'ok' : 'warn' },
          { label: '外径比 K', value: fmt(K), unit: '—' },
          { label: '过应变深度比 rp/ri', value: fmt(rhoRatio), unit: '—' },
        ],
        note: `自增强原理:施加超过弹性极限的超高内压,使内层产生塑性变形,卸压后外层弹性回缩对内层产生残余压应力。过应变深度比 rp/ri 建议取 1.2~1.8;过高会导致反向屈服。本计算使用简化残余应力公式,实际应考虑包辛格效应(Bauschinger)和材料循环硬化/软化。残余应力可能随疲劳和高温蠕变松弛。`,
        disclaimer: true,
      },
    };
  }

  // —— 多层热套 ——
  if (method === 'multilayer') {
    const nLayers = input.layerCount as number;
    const layerAllow = (input.layerSigmaS as number) / (input.layerSafety as number);
    // 解析各层外径
    const odStr = String(input.layerOd ?? '').trim();
    const odParts = odStr.split(/[,，\s]+/).map(Number).filter((v) => !isNaN(v) && v > 0);
    if (odParts.length !== nLayers - 1) {
      return {
        ok: true,
        result: {
          formula: '多层热套各层 σe = √(½[(σθ_p+σθ_res−σz)²+(σz−σr)²+(σr−σθ_p−σθ_res)²]) ≤ [σ]',
          steps: [singleVerdict, `需要 ${nLayers - 1} 个分界直径,但输入了 ${odParts.length} 个`],
          results: [],
          note: `${nLayers} 层热套需要输入 ${nLayers - 1} 个分界直径(用逗号分隔),当前输入了 ${odParts.length} 个。`,
          disclaimer: true,
        },
      };
    }

    // 构建完整半径数组
    const radii: number[] = [ri, ...odParts.map((d) => d / 2), ro];
    const nInt = radii.length - 1; // 实际层数
    if (nInt !== nLayers) {
      return {
        ok: true,
        result: {
          formula: '多层热套各层 σe ≤ [σ]',
          steps: [singleVerdict, `输入 ${nLayers} 层但分界直径数组给出 ${nInt} 层`],
          results: [],
          note: `层数与分界直径数量不匹配。`,
          disclaimer: true,
        },
      };
    }

    // 计算各层工作压力引起的切向应力(内壁最危险)
    const sigWorkArr: number[] = [];
    for (let i = 0; i < nInt; i++) {
      const riL = radii[i];
      const roL = radii[i + 1];
      sigWorkArr.push(p * (roL * roL + riL * riL) / (roL * roL - riL * riL));
    }

    // 逐层求解所需界面压力
    const pressures: number[] = [];
    for (let i = 0; i < nInt - 1; i++) {
      const riL = radii[i];
      const roL = radii[i + 1];
      const ri2 = riL * riL;
      const ro2 = roL * roL;
      const sigThWork = sigWorkArr[i];
      // 二分求解使 Mises ≤ allow 的最大界面压力
      let lo = 0;
      let hi = layerAllow * 2;
      for (let iter = 0; iter < 100; iter++) {
        const mid = (lo + hi) / 2;
        const sigTHRes = -2 * mid * ro2 / (ro2 - ri2);
        const sigZ = p * ri2 / (ro2 - ri2);
        const sigR = -p;
        if (mises(sigThWork + sigTHRes, sigZ, sigR) <= layerAllow) hi = mid;
        else lo = mid;
      }
      pressures.push(hi);
    }

    // 计算过盈量(每层用自己的外径,不是最外径)
    const interferences: number[] = [];
    const thermalTemps: number[] = [];
    for (let i = 0; i < nInt - 1; i++) {
      const riL = radii[i];
      const roL = radii[i + 1];
      // 过盈公式: Δ = 4·p_c·r₁³(ro²−ri²) / (E·(ro²−r₁²)·(r₁²−ri²))
      // r₁=roL(外筒内径),ro=roL(外筒外径),ri=riL(内筒内径)
      const delta = shrinkFitInterference(pressures[i], riL, roL, roL, STEEL_E);
      interferences.push(delta);
      const d1 = 2 * roL;
      const dT = (delta + 0.0005 * d1) / (STEEL_ALPHA * d1);
      thermalTemps.push(dT);
    }

    // 校核各层最大 Mises
    let sigMax = 0;
    const layerStresses: number[] = [];
    for (let i = 0; i < nInt; i++) {
      const riL = radii[i];
      const roL = radii[i + 1];
      const ri2 = riL * riL;
      const ro2 = roL * roL;
      const pExt = i < pressures.length ? pressures[i] : 0;
      const sigTh = p * (ro2 + ri2) / (ro2 - ri2) + (pExt > 0 ? -2 * pExt * ro2 / (ro2 - ri2) : 0);
      const sigZ = p * ri2 / (ro2 - ri2);
      const sigR = -p;
      const sigE = mises(sigTh, sigZ, sigR);
      layerStresses.push(sigE);
      sigMax = Math.max(sigMax, sigE);
    }
    const ok = sigMax <= layerAllow;

    // 构建结果
    const steps: string[] = [
      singleVerdict,
      `${nInt} 层: ${radii.map((r, i) => i < radii.length - 1 ? `r${i + 1}=${fmt(r)}~${fmt(radii[i + 1])} mm` : '').filter(Boolean).join(', ')}`,
      `各层许用应力 [σ] = ${fmt(layerAllow)} MPa`,
    ];
    for (let i = 0; i < nInt - 1; i++) {
      steps.push(`界面 ${i + 1}→${i + 2}: 界面压力 p_c = ${fmt(pressures[i])} MPa, 过盈量 Δ = ${fmt(interferences[i])} mm, 参考温差 ΔT = ${fmt(thermalTemps[i])} ℃`);
    }
    for (let i = 0; i < nInt; i++) {
      steps.push(`第 ${i + 1} 层合成当量 σe = ${fmt(layerStresses[i])} MPa ${layerStresses[i] <= layerAllow ? '≤ [σ] ✓' : '> [σ] ⚠'}`);
    }

    const results: Array<{ label: string; value: string; unit?: string; primary?: boolean; tone?: 'ok' | 'warn' | 'bad' }> = [
      { label: '各层最大合成当量应力 σe_max', value: fmt(sigMax), unit: 'MPa', primary: true, tone: ok ? 'ok' : 'bad' },
      { label: '各层许用应力 [σ]', value: fmt(layerAllow), unit: 'MPa' },
    ];
    for (let i = 0; i < nInt - 1; i++) {
      results.push({ label: `界面${i + 1}→${i + 2} 过盈量 Δ`, value: fmt(interferences[i]), unit: 'mm' });
      results.push({ label: `界面${i + 1}→${i + 2} 界面压力 p_c`, value: fmt(pressures[i]), unit: 'MPa' });
      results.push({ label: `界面${i + 1}→${i + 2} 参考温差 ΔT`, value: fmt(thermalTemps[i]), unit: '℃' });
    }
    for (let i = 0; i < nInt; i++) {
      results.push({ label: `第${i + 1}层当量应力 σe`, value: fmt(layerStresses[i]), unit: 'MPa', tone: layerStresses[i] <= layerAllow ? 'ok' : 'warn' });
    }

    return {
      ok: true,
      result: {
        formula: '各层 σe = √(½[(σθ_p+σθ_res−σz)²+(σz−σr)²+(σr−σθ_p−σθ_res)²]) ≤ [σ]',
        formulaAlt: `分界半径按等厚度分布;每层界面压力由内壁当量 ≤ [σ] 反算`,
        steps,
        results,
        note: `${nInt} 层热套按等厚度分配分界半径。过盈量为直径过盈;各层外筒加热后装配,参考温差按加热外筒估算(预留 0.05%·d 装配间隙)。实际热套温差应控制在材料回火温度以内。各层材料可不同(分别输入屈服强度和安全系数)。`,
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
    `钢丝工作环向应力 σθ_w = p·ri²/(ro²−ri²)·(1+ro²/r₁²) = ${fmt(sigWire)} MPa ${wireOk ? '≤ [σ]钢丝 ✓': '> [σ]钢丝 ⚠'}`,
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
  const headMap: Record<VesselMethod, string> = {
    shrink: '【超高压缸筒设计(双层缩套)】',
    wire: '【超高压缸筒设计(钢丝缠绕)】',
    autofrettage: '【超高压缸筒设计(自增强)】',
    multilayer: '【超高压缸筒设计(多层热套)】',
  };
  const head = headMap[input.method];
  const extraLines: string[] = [];
  if (input.method === 'wire') {
    extraLines.push(`内衬外径 d₁ = ${fmt(input.linerOd ?? 0)} mm`);
    extraLines.push(`钢丝屈服 σs = ${fmt(input.wireSigmaS ?? 0)} MPa,安全系数 n = ${fmt(input.wireSafety ?? 0)}`);
    extraLines.push(`钢丝直径 d_w = ${fmt(input.wireDia ?? 0)} mm`);
  }
  if (input.method === 'autofrettage') {
    extraLines.push(`过应变深度比 rp/ri = ${fmt(input.autofrettageRatio ?? 0)}`);
  }
  if (input.method === 'multilayer') {
    extraLines.push(`层数 n = ${input.layerCount ?? '—'}`);
    extraLines.push(`各层屈服 σs = ${fmt(input.layerSigmaS ?? 0)} MPa,安全系数 n = ${fmt(input.layerSafety ?? 0)}`);
    extraLines.push(`各层外径 = ${input.layerOd ?? '—'} mm`);
  }
  return [
    head,
    `设计压力 p = ${fmt(input.pressure ?? 0)} MPa`,
    `内径 di = ${fmt(input.bore ?? 0)} mm`,
    `材料屈服 σs = ${fmt(input.sigmaS ?? 0)} MPa,安全系数 n = ${fmt(input.safety ?? 0)}`,
    `总外径 do = ${fmt(input.od ?? 0)} mm`,
    ...extraLines,
    '',
    `公式: ${r.formula}`,
    '',
    ...r.steps.map((s, i) => `${i + 1}. ${s}`),
    '',
    ...r.results.map((x) => `${x.label}: ${x.value}${x.unit ? ' ' + x.unit : ''}`),
  ].join('\n');
}
