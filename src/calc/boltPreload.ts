// 螺栓预紧力计算
// 标准扭矩-预紧力关系(工程常用简化公式):
//   T = K × F × d   →   F = T / (K × d)
// 其中 K 为扭矩系数(拧紧系数,综合螺纹与支承面摩擦),无润滑钢制约 0.20,润滑 0.12~0.15
// 螺纹应力面积(ISO 公制):A_s = (π/4)·(d − 0.9382·P)²
// 轴向应力:σ = F / A_s
import type { CalcOption, CalcOutcome } from '../types';
import { fmtNum } from '../lib/format';

export interface BoltInput {
  spec: string;            // 螺栓规格标识
  d: number | null;        // 公称直径 mm
  pitch: number | null;    // 螺距 mm
  grade: string;           // 强度等级
  torque: number | null;   // 拧紧扭矩 N·m
  k: number | null;        // 扭矩系数 K
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

/** 计算螺纹应力面积(mm²) */
export function stressArea(d: number, pitch: number): number {
  return (Math.PI / 4) * Math.pow(d - 0.9382 * pitch, 2);
}

export function calcBolt(input: BoltInput, opt: CalcOption = { digits: 2 }): CalcOutcome {
  const { d, pitch, grade, torque, k } = input;
  const fe: Record<string, string> = {};

  if (d == null || Number.isNaN(d) || d <= 0) fe.d = '请输入公称直径';
  if (pitch == null || Number.isNaN(pitch) || pitch <= 0) fe.pitch = '请输入螺距';
  if (torque == null || Number.isNaN(torque) || torque < 0) fe.torque = '请输入拧紧扭矩';
  if (k == null || Number.isNaN(k) || k <= 0) fe.k = '扭矩系数必须大于 0';
  else if (k > 1) fe.k = '扭矩系数超出合理范围(通常 0.1~0.5)';
  if (Object.keys(fe).length) return { ok: false, fieldErrors: fe };

  const D = d as number;
  const P = pitch as number;
  const T = torque as number; // N·m
  const K = k as number;
  const sigmaS = getGrade(grade) ?? 640;

  const Tmm = T * 1000;          // N·mm
  const F = Tmm / (K * D);       // N 预紧力
  const As = stressArea(D, P);   // mm²
  const sigma = F / As;          // MPa
  const util = (sigma / sigmaS) * 100;

  // 扭矩法预紧分散度约 ±25%(K 波动所致),利用率上限推荐 ≤70%,严苛工况 ≤60%
  const verdict =
    util <= 70
      ? '安全裕度合理(利用率 ≤70% σs,扭矩法推荐上限)'
      : util <= 90
        ? '偏高:考虑 ±25% 预紧分散,存在超拧风险,不建议承受交变载荷'
        : '危险:接近或超过屈服,必须降低扭矩或加大规格';
  const verdictTone: 'ok' | 'warn' | 'bad' = util <= 70 ? 'ok' : util <= 90 ? 'warn' : 'bad';
  const fMin = F * 0.75;
  const fMax = F * 1.25;

  const fmt = (n: number) => fmtNum(n, opt.digits);

  return {
    ok: true,
    result: {
      formula: 'T = K × F × d   →   F = T / (K·d)',
      formulaAlt: 'σ = F / A_s;A_s = (π/4)·(d − 0.9382·P)²',
      steps: [
        `F = T / (K·d) = ${fmt(Tmm)} / (${fmt(K)} × ${fmt(D)}) = ${fmt(F)} N`,
        `A_s = (π/4)·(d − 0.9382·P)² = (π/4)·(${fmt(D)} − 0.9382×${fmt(P)})² = ${fmt(As)} mm²`,
        `σ = F / A_s = ${fmt(F)} / ${fmt(As)} = ${fmt(sigma)} MPa`,
        `强度等级 ${grade}:屈服强度 σs = ${fmt(sigmaS)} MPa,应力利用率 = ${fmt(util)}%`,
        `考虑 K 值波动,预紧力分散范围 ≈ ±25%:${fmt(fMin)} ~ ${fmt(fMax)} N`,
      ],
      results: [
        { label: '预紧力 F', value: fmt(F), unit: 'N', primary: true },
        { label: '预紧力 F', value: fmt(F / 1000), unit: 'kN' },
        { label: '螺纹应力面积 A_s', value: fmt(As), unit: 'mm²' },
        { label: '螺栓轴向应力 σ', value: fmt(sigma), unit: 'MPa' },
        { label: '应力利用率', value: `${fmt(util)}%`, unit: '(vs σs)', tone: verdictTone },
        { label: '预紧力分散范围(±25%)', value: `${fmt(fMin / 1000)} ~ ${fmt(fMax / 1000)}`, unit: 'kN' },
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
    `　　　 ${r.formulaAlt ?? ''}`,
    '',
    ...r.steps.map((s, i) => `${i + 1}. ${s}`),
    '',
    ...r.results.map((x) => `${x.label}: ${x.value}${x.unit ? ' ' + x.unit : ''}`),
  ].join('\n');
}
