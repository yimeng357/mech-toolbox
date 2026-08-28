// 螺栓预紧力计算
// 标准扭矩-预紧力关系(工程常用简化公式):
//   T = K × F × d   →   F = T / (K × d)
// 其中 K 为扭矩系数(拧紧系数,综合螺纹与支承面摩擦),无润滑钢制约 0.20,润滑 0.12~0.15
// 螺纹应力面积(ISO 公制):A_s = (π/4)·(d - 0.9382·P)2
// 轴向应力:σ = F / A_s
import type { CalcOption, CalcOutcome } from '../types';
import { fmtNum } from '../lib/format';

export interface BoltInput {
  spec: string;            // 螺栓规格标识
  d: number | null;        // 公称直径 mm
  pitch: number | null;    // 螺距 mm
  grade: string;           // 强度等级
  torque: number | null;   // 拧紧扭矩 N·m
  k: number | null;        // 扭矩系数 K(与 μ 分解模式二选一)
  useFriction?: boolean;   // true:由 μ 螺纹/μ支承 计算 K(VDI 2230 简化式)
  muThread?: number | null;  // 螺纹摩擦系数 μ(useFriction 时必填,钢-钢干态约 0.10~0.18)
  muHead?: number | null;    // 支承面摩擦系数(默认同 μ)
  scatterPct?: number | null; // 预紧力分散度 ±%(默认 25;扭矩法典型 20~30)
  axialFatigueLoad?: number | null; // 外部交变轴向载荷 Fa, N(可选,残余夹紧/应力幅评估)
}

export const BOLT_DEFAULTS: BoltInput = {
  spec: 'M10',
  d: 10,
  pitch: 1.5,
  grade: '8.8',
  torque: 47,
  k: 0.2,
};

/** 标准公制粗牙螺纹表 */
export const METRIC_BOLTS: Array<{ spec: string; d: number; pitch: number }> = [
  { spec: 'M6', d: 6, pitch: 1.0 },
  { spec: 'M8', d: 8, pitch: 1.25 },
  { spec: 'M10', d: 10, pitch: 1.5 },
  { spec: 'M12', d: 12, pitch: 1.75 },
  { spec: 'M14', d: 14, pitch: 2.0 },
  { spec: 'M16', d: 16, pitch: 2.0 },
  { spec: 'M18', d: 18, pitch: 2.5 },
  { spec: 'M20', d: 20, pitch: 2.5 },
  { spec: 'M22', d: 22, pitch: 2.5 },
  { spec: 'M24', d: 24, pitch: 3.0 },
  { spec: 'M27', d: 27, pitch: 3.0 },
  { spec: 'M30', d: 30, pitch: 3.5 },
  { spec: 'M36', d: 36, pitch: 4.0 },
];

/** 常用强度等级:屈服强度 σs MPa */
export const BOLT_GRADES: Array<{ id: string; yield: number; label: string }> = [
  { id: '4.6', yield: 240, label: '4.6 (R_e=240 MPa)' },
  { id: '5.8', yield: 400, label: '5.8 (R_e=400 MPa)' },
  { id: '8.8', yield: 640, label: '8.8 (R_e=640 MPa)' },
  { id: '9.8', yield: 720, label: '9.8 (R_e=720 MPa)' },
  { id: '10.9', yield: 940, label: '10.9 (R_e=940 MPa)' },
  { id: '12.9', yield: 1100, label: '12.9 (R_e=1100 MPa)' },
];

export function getGrade(id: string): number | null {
  const g = BOLT_GRADES.find((x) => x.id === id);
  return g ? g.yield : null;
}

/** 计算螺纹应力面积(mm2) */
export function stressArea(d: number, pitch: number): number {
  return (Math.PI / 4) * Math.pow(d - 0.9382 * pitch, 2);
}

/** VDI 2230 简化:由摩擦系数计算扭矩系数 K
 *  完整式 K = (0.16·P + 0.5·μ·d2 + 0.5·μK·Dkm)/d,工程简化取 d2≈0.92d、Dkm≈0.95d:
 *  K ≈ 0.16·P/d + 0.46·μ + 0.475·μK */
export function kFromFriction(d: number, pitch: number, mu: number, muHead?: number): number {
  const mh = muHead ?? mu;
  return 0.16 * (pitch / d) + 0.46 * mu + 0.475 * mh;
}

export function calcBolt(input: BoltInput, opt: CalcOption = { digits: 2 }): CalcOutcome {
  const { d, pitch, grade, torque, k, useFriction, muThread, muHead, scatterPct, axialFatigueLoad } = input;
  const fe: Record<string, string> = {};

  if (d == null || Number.isNaN(d) || d <= 0) fe.d = '请输入公称直径';
  if (pitch == null || Number.isNaN(pitch) || pitch <= 0) fe.pitch = '请输入螺距';
  if (torque == null || Number.isNaN(torque) || torque < 0) fe.torque = '请输入拧紧扭矩';
  const frictionMode = !!useFriction;
  let Kv = 0;
  if (frictionMode) {
    if (muThread == null || Number.isNaN(muThread) || muThread <= 0 || muThread >= 0.5) fe.muThread = '螺纹摩擦系数应在 0~0.5 之间';
    if (muHead != null && (Number.isNaN(muHead) || muHead <= 0 || muHead >= 0.5)) fe.muHead = '支承面摩擦系数应在 0~0.5 之间';
    if (!fe.muThread) Kv = kFromFriction(d as number, pitch as number, muThread as number, muHead ?? undefined);
  } else {
    if (k == null || Number.isNaN(k) || k <= 0) fe.k = '扭矩系数必须大于 0';
    else if (k > 1) fe.k = '扭矩系数超出合理范围(通常 0.1~0.5)';
    Kv = k as number;
  }
  if (scatterPct != null && (Number.isNaN(scatterPct) || scatterPct < 5 || scatterPct > 50)) fe.scatterPct = '分散度应在 5~50% 之间';
  if (axialFatigueLoad != null && (Number.isNaN(axialFatigueLoad) || axialFatigueLoad < 0)) fe.axialFatigueLoad = '交变载荷不能为负';
  if (Object.keys(fe).length) return { ok: false, fieldErrors: fe };

  const D = d as number;
  const P = pitch as number;
  const T = torque as number; // N·m
  const K = Kv;
  const sigmaS = getGrade(grade) ?? 640;

  const Tmm = T * 1000;          // N·mm
  const F = Tmm / (K * D);       // N 预紧力
  const As = stressArea(D, P);   // mm2
  const sigma = F / As;          // MPa
  const util = (sigma / sigmaS) * 100;

  // 扭矩法预紧分散度(默认 ±25%,可调):K 波动所致,利用率上限推荐 ≤70%,严苛工况 ≤60%
  const sc = (scatterPct ?? 25) / 100;
  const verdict =
    util <= 70
      ? '安全裕度合理(利用率 ≤70% σs,扭矩法推荐上限)'
      : util <= 90
        ? `偏高:考虑 ±${(sc * 100).toFixed(0)}% 预紧分散,存在超拧风险,不建议承受交变载荷`
        : '危险:接近或超过屈服,必须降低扭矩或加大规格';
  const verdictTone: 'ok' | 'warn' | 'bad' = util <= 70 ? 'ok' : util <= 90 ? 'warn' : 'bad';
  const fMin = F * (1 - sc);
  const fMax = F * (1 + sc);

  const fmt = (n: number) => fmtNum(n, opt.digits);

  // 交变外载下的残余夹紧趋势评估(简化:夹紧力随外载波动 ΔFb ≈ Φ·Fa,Φ 刚度比取 0.25)
  const fatigue = axialFatigueLoad != null && axialFatigueLoad > 0
    ? (() => {
        const phi = 0.25; // 螺栓刚度/总刚度比的工程近似
        const dFb = phi * axialFatigueLoad;
        const clampMin = fMin - dFb;
        const sigmaA = dFb / As;
        const okClamp = clampMin > 0;
        return { phi, dFb, clampMin, sigmaA, okClamp };
      })()
    : null;

  const stepsExtra: string[] = [];
  if (frictionMode) {
    stepsExtra.push(`K = 0.16·P/d + 0.46·μ + 0.475·μK = 0.16×${fmt(P / D)} + 0.46×${fmt(muThread as number)} + 0.475×${fmt((muHead ?? muThread) as number)} = ${fmt(K)}`);
  }
  if (fatigue) {
    stepsExtra.push(`交变外载 Fa = ${fmt(axialFatigueLoad as number)} N: 螺栓拉力增幅 ΔFb = Φ·Fa = 0.25×${fmt(axialFatigueLoad as number)} = ${fmt(fatigue.dFb)} N(Φ 刚度比取 0.25)`);
    stepsExtra.push(`最不利分散下最低残余夹紧力 = Fmin − ΔFb = ${fmt(fMin)} − ${fmt(fatigue.dFb)} = ${fmt(fatigue.clampMin)} N ${fatigue.okClamp ? '(> 0,不松脱)' : '(≤ 0,有松脱风险!)'}`);
    stepsExtra.push(`螺栓应力幅 σa = ΔFb/A_s = ${fmt(fatigue.sigmaA)} MPa(应力幅越低疲劳寿命越长)`);
  }

  return {
    ok: true,
    result: {
      formula: 'T = K × F × d   →   F = T / (K·d)',
      formulaAlt: frictionMode
        ? 'K = 0.16·P/d + 0.46·μ + 0.475·μK(VDI 2230 简化) · σ = F/A_s'
        : 'σ = F / A_s;A_s = (π/4)·(d − 0.9382·P)²',
      steps: [
        ...(frictionMode
          ? [`摩擦系数模式: μ螺纹 = ${fmt(muThread as number)}, μ支承 = ${fmt((muHead ?? muThread) as number)}`]
          : [`K = ${fmt(K)}(手填)`]),
        `F = T / (K·d) = ${fmt(Tmm)} / (${fmt(K)} × ${fmt(D)}) = ${fmt(F)} N`,
        `A_s = (π/4)·(d − 0.9382·P)² = (π/4)·(${fmt(D)} − 0.9382×${fmt(P)})² = ${fmt(As)} mm²`,
        `σ = F / A_s = ${fmt(F)} / ${fmt(As)} = ${fmt(sigma)} MPa`,
        `强度等级 ${grade}:屈服强度 σs = ${fmt(sigmaS)} MPa,应力利用率 = ${fmt(util)}%`,
        `考虑 K 值波动,预紧力分散范围 ≈ ±${((sc * 100).toFixed(0))}%:${fmt(fMin)} ~ ${fmt(fMax)} N`,
        ...stepsExtra,
      ],
      results: [
        { label: '预紧力 F', value: fmt(F), unit: 'N', primary: true },
        { label: '预紧力 F', value: fmt(F / 1000), unit: 'kN' },
        { label: '螺纹应力面积 A_s', value: fmt(As), unit: 'mm2' },
        { label: '螺栓轴向应力 σ', value: fmt(sigma), unit: 'MPa' },
        { label: '应力利用率', value: `${fmt(util)}%`, unit: '(vs σs)', tone: verdictTone },
        { label: `预紧力分散范围(±${((sc * 100).toFixed(0))}%)`, value: `${fmt(fMin / 1000)} ~ ${fmt(fMax / 1000)}`, unit: 'kN' },
        ...(fatigue ? [
          { label: '螺栓拉力增幅 ΔFb', value: fmt(fatigue.dFb), unit: 'N' },
          { label: '最低残余夹紧力', value: fmt(fatigue.clampMin), unit: 'N', tone: (fatigue.okClamp ? 'ok' : 'bad') as 'ok' | 'bad' },
          { label: '螺栓应力幅 σa', value: fmt(fatigue.sigmaA), unit: 'MPa' },
        ] : []),
        { label: '安全判断', value: verdict, tone: verdictTone },
      ],
      note: `扭矩系数 K 的取值对结果影响很大:K 随螺纹与支承面润滑状态在约 0.1~0.3 之间波动。无润滑钢制螺栓可取 0.20,润滑或涂油可取 0.12~0.15。精确设计请参照 GB/T 16823.2、VDI 2230 等方法。`,
      disclaimer: true,
    },
  };
}

export function boltCopyText(input: BoltInput, digits = 2): string {
  const fmt = (n: number) => fmtNum(n, digits);
  const o = calcBolt(input, { digits });
  if (!o.result) return '';
  const r = o.result;
  return [
    '【螺栓预紧力计算】',
    `螺栓规格 ${input.spec}(公称直径 d = ${fmt(input.d ?? 0)} mm,螺距 P = ${fmt(input.pitch ?? 0)} mm)`,
    `强度等级: ${input.grade}`,
    `拧紧扭矩 T = ${fmt(input.torque ?? 0)} N·m`,
    `扭矩系数 K = ${fmt(input.k ?? 0)}`,
    '',
    `公式: ${r.formula}`,
    `    ${r.formulaAlt ?? ''}`,
    '',
    ...r.steps.map((s, i) => `${i + 1}. ${s}`),
    '',
    ...r.results.map((x) => `${x.label}: ${x.value}${x.unit ? ' ' + x.unit : ''}`),
  ].join('\n');
}
