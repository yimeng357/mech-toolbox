// 法兰螺栓计算(简化的静力估算)
// 由内压产生的总分离力:
//   F = p × A = p × (π/4) × D_g²     (D_g 为垫片/密封直径)
// 单个螺栓需承担的分离载荷:
//   F_b = F / n
// 简化预紧估算:F₀ ≈ F_b(即预紧力 ≥ 分离载荷)
// 螺栓拉应力:σ = F₀ / A_s
// 注意:实际法兰设计需同时考虑垫片预紧(压紧比压)与螺栓预紧,应按 GB/T 150.3、ASME BPVC 等标准校核。
import type { CalcOption, CalcOutcome } from '../types';
import { fmtNum } from '../lib/format';
import { METRIC_BOLTS, stressArea, getGrade } from './boltPreload';

export interface FlangeInput {
  od: number | null;       // 法兰外径 D, mm
  sealD: number | null;    // 密封直径 D_g, mm
  pressure: number | null; // 工作压力 p, MPa
  count: number | null;    // 螺栓数量 n
  spec: string;            // 螺栓规格
  d: number | null;        // 螺栓公称直径 mm
  grade: string;           // 强度等级
}

export const FLANGE_DEFAULTS: FlangeInput = {
  od: 260,
  sealD: 200,
  pressure: 1.6,
  count: 8,
  spec: 'M16',
  d: 16,
  grade: '8.8',
};

export function calcFlange(input: FlangeInput, opt: CalcOption = { digits: 2 }): CalcOutcome {
  const { od, sealD, pressure, count, d, grade } = input;
  const fe: Record<string, string> = {};

  if (od == null || Number.isNaN(od) || od <= 0) fe.od = '请输入法兰外径';
  if (sealD == null || Number.isNaN(sealD) || sealD <= 0) fe.sealD = '请输入密封直径';
  if (pressure == null || Number.isNaN(pressure)) fe.pressure = '请输入工作压力';
  else if (pressure < 0) fe.pressure = '压力不能为负';
  if (count == null || Number.isNaN(count) || count <= 0) fe.count = '请输入螺栓数量';
  else if (!Number.isInteger(count)) fe.count = '螺栓数量应为整数';
  if (d == null || Number.isNaN(d) || d <= 0) fe.d = '请输入螺栓直径';
  if (!fe.od && !fe.sealD && od != null && sealD != null && sealD >= od) {
    fe.sealD = '密封直径应小于法兰外径';
  }
  if (Object.keys(fe).length) return { ok: false, fieldErrors: fe };

  const OD = od as number;
  const DG = sealD as number;
  const P = pressure as number;
  const N = count as number;
  const D = d as number;
  const sigmaS = getGrade(grade) ?? 640;

  const area = (Math.PI / 4) * DG * DG;      // mm²
  const F = P * area;                        // N 总分离力
  const Fb = F / N;                          // N 单螺栓
  const As = stressArea(D, standardPitch(D)); // mm²
  const sigma = Fb / As;                     // MPa
  const util = (sigma / sigmaS) * 100;

  // 螺栓圈直径估算(法兰外径与密封直径的中间),用于校核螺栓是否放得下
  const dbc = (OD + DG) / 2;
  const pitch = dbc > 0 ? (Math.PI * dbc) / N : 0;

  const verdict =
    util <= 80
      ? '单螺栓平均应力裕度合理'
      : util <= 100
        ? '接近屈服强度,建议加大螺栓或增加数量'
        : '超过屈服强度,不安全';
  const verdictTone: 'ok' | 'warn' | 'bad' = util <= 80 ? 'ok' : util <= 100 ? 'warn' : 'bad';

  const fmt = (n: number) => fmtNum(n, opt.digits);

  return {
    ok: true,
    result: {
      formula: 'F = p × (π/4) × D_g²;F_b = F / n;σ = F_b / A_s',
      formulaAlt: `A_s = (π/4)·(d − 0.9382·P)²(${fmt(As)} mm²)`,
      steps: [
        `密封面积 A = (π/4)·D_g² = (π/4)·${fmt(DG)}² = ${fmt(area)} mm²`,
        `总分离力 F = p·A = ${fmt(P)} × ${fmt(area)} = ${fmt(F)} N`,
        `单螺栓分离载荷 F_b = F/n = ${fmt(F)} / ${fmt(N)} = ${fmt(Fb)} N`,
        `简化预紧需求 F₀ ≈ F_b = ${fmt(Fb)} N`,
        `螺栓应力 σ = F_b/A_s = ${fmt(Fb)} / ${fmt(As)} = ${fmt(sigma)} MPa`,
        `强度等级 ${grade}:σs = ${fmt(sigmaS)} MPa,利用率 = ${fmt(util)}%`,
        `估算螺栓圈直径 D_bc ≈ (OD+D_g)/2 = ${fmt(dbc)} mm,相邻螺栓间距 ≈ ${fmt(pitch)} mm`,
      ],
      results: [
        { label: '密封面积 A', value: fmt(area), unit: 'mm²' },
        { label: '总分离力 F', value: fmt(F), unit: 'N', primary: true },
        { label: '总分离力 F', value: fmt(F / 1000), unit: 'kN' },
        { label: '单个螺栓平均载荷 F_b', value: fmt(Fb), unit: 'N', primary: true },
        { label: '螺栓轴向应力 σ(估算)', value: fmt(sigma), unit: 'MPa' },
        { label: '应力利用率', value: `${fmt(util)}%`, unit: '(vs σs)' },
        { label: '受力判断', value: verdict, tone: verdictTone },
      ],
      note: '本计算为简化的静力估算:按内压分离载荷估算了螺栓预紧需求。实际法兰连接还需计入垫片预紧力(压紧比压)、螺栓预紧分散、密封面刚度等,应按 GB/T 150.3 或 ASME BPVC 第 VIII 卷进行设计校核。',
      disclaimer: true,
    },
  };
}

/** 由标准规格取螺距,非标准直径按 d/10 近似 */
function standardPitch(d: number): number {
  const m = METRIC_BOLTS.find((b) => b.d === d);
  if (m) return m.pitch;
  return Math.round(d / 10 * 100) / 100;
}

export function flangeCopyText(input: FlangeInput, digits = 2): string {
  const fmt = (n: number) => fmtNum(n, digits);
  const o = calcFlange(input, { digits });
  if (!o.result) return '';
  const r = o.result;
  return [
    '【法兰螺栓计算】',
    `法兰外径 D = ${fmt(input.od ?? 0)} mm`,
    `密封直径 D_g = ${fmt(input.sealD ?? 0)} mm`,
    `工作压力 p = ${fmt(input.pressure ?? 0)} MPa`,
    `螺栓数量 n = ${fmt(input.count ?? 0)}`,
    `螺栓规格 ${input.spec}(直径 d = ${fmt(input.d ?? 0)} mm),强度等级 ${input.grade}`,
    '',
    `公式: ${r.formula}`,
    '',
    ...r.steps.map((s, i) => `${i + 1}. ${s}`),
    '',
    ...r.results.map((x) => `${x.label}: ${x.value}${x.unit ? ' ' + x.unit : ''}`),
  ].join('\n');
}
