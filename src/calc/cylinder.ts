// 气缸推力计算
// 公式(标准气缸理论力计算):
//   推力(伸出) F1 = p × A1 = p × (π/4) × D²
//   拉力(缩回) F2 = p × A2 = p × (π/4) × (D² − d²)
// 单位:D、d [mm],p [MPa],面积 [mm²],力 [N](1 MPa = 1 N/mm²)
import type { CalcOption, CalcOutcome } from '../types';
import { fmtNum } from '../lib/format';

export interface CylinderInput {
  bore: number | null;   // 缸径 D, mm
  rod: number | null;    // 杆径 d, mm
  pressure: number | null; // 工作压力 p, MPa
  direction: 'push' | 'pull';
  efficiency?: number | null;  // 机械效率 η(0~1],默认 0.9(含摩擦与背压损失)
  loadForce?: number | null;   // 外部负载 F_L, N(可选,用于负载率校核)
}

/** 标准缸径系列 GB/T 2348 */
export const STD_BORES = [8, 10, 12, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 320, 400, 500];

export function roundUpToStdBore(d: number): number {
  for (const s of STD_BORES) if (s >= d) return s;
  return d;
}

export const CYLINDER_DEFAULTS: CylinderInput = {
  bore: 100,
  rod: 32,
  pressure: 0.8,
  direction: 'push',
  efficiency: 0.9,
  loadForce: null,
};

const PI4 = Math.PI / 4;

export function calcCylinder(input: CylinderInput, opt: CalcOption = { digits: 2 }): CalcOutcome {
  const { bore, rod, pressure, direction } = input;
  const efficiency = input.efficiency ?? 0.9;
  const loadForce = input.loadForce ?? null;
  const fe: Record<string, string> = {};

  if (bore == null || Number.isNaN(bore)) fe.bore = '请输入缸径';
  else if (bore <= 0) fe.bore = '缸径必须大于 0';
  if (rod == null || Number.isNaN(rod)) fe.rod = '请输入杆径';
  else if (rod < 0) fe.rod = '杆径不能为负';
  if (pressure == null || Number.isNaN(pressure)) fe.pressure = '请输入工作压力';
  else if (pressure < 0) fe.pressure = '压力不能为负';
  if (efficiency != null && (Number.isNaN(efficiency) || efficiency <= 0 || efficiency > 1)) fe.efficiency = '机械效率应在 0~1 之间';
  if (loadForce != null && (Number.isNaN(loadForce) || loadForce < 0)) fe.loadForce = '负载不能为负';

  if (!fe.bore && !fe.rod && bore != null && rod != null && rod >= bore) {
    fe.rod = '杆径必须小于缸径';
  }
  if (Object.keys(fe).length) return { ok: false, fieldErrors: fe };

  const D = bore as number;
  const d = rod as number;
  const p = pressure as number;

  const a1 = PI4 * D * D;                    // mm² 活塞有效面积
  const a2 = PI4 * (D * D - d * d);          // mm² 环形有效面积
  const fPush = p * a1;                      // N
  const fPull = p * a2;                      // N

  const fmt = (n: number) => fmtNum(n, opt.digits);

  const steps = [
    `A₁ = (π/4)·D² = (π/4)·${fmt(D)}² = ${fmt(a1)} mm²`,
    `A₂ = (π/4)·(D²−d²) = (π/4)·(${fmt(D * D)} − ${fmt(d * d)}) = ${fmt(a2)} mm²`,
    direction === 'push'
      ? `F₁ = p·A₁ = ${fmt(p)} × ${fmt(a1)} = ${fmt(fPush)} N`
      : `F₂ = p·A₂ = ${fmt(p)} × ${fmt(a2)} = ${fmt(fPull)} N`,
  ];

  const fTheory = direction === 'push' ? fPush : fPull;
  const fActual = fTheory * efficiency;   // 计效率后的实际输出力
  const stdBore = roundUpToStdBore(D);     // 标准缸径系列推荐
  const loadRatio = loadForce != null && loadForce > 0 ? loadForce / fActual : null;
  const ratioTone: 'ok' | 'warn' | 'bad' | undefined =
    loadRatio == null ? undefined : loadRatio <= 0.5 ? 'ok' : loadRatio <= 0.7 ? 'warn' : 'bad';

  const extraSteps: string[] = [
    `实际输出力 F_act = F × η = ${fmt(fTheory)} × ${fmt(efficiency)} = ${fmt(fActual)} N`,
    `标准缸径系列推荐: Φ${fmt(stdBore)} mm(≥ 当前输入 ${fmt(D)} mm,GB/T 2348)`,
  ];
  if (loadRatio != null) {
    extraSteps.push(
      `负载率 β = F_L / F_act = ${fmt(loadForce as number)} / ${fmt(fActual)} = ${fmt(loadRatio * 100)}%(${ratioTone === 'ok' ? '≤50% 裕度充足' : ratioTone === 'warn' ? '50%~70% 可用,动态载荷慎用' : '>70% 易爬行/推力不足'})`,
    );
  }

  return {
    ok: true,
    result: {
      formula:
        direction === 'push'
          ? 'F₁ = p × A₁ = p × (π/4) × D²'
          : 'F₂ = p × A₂ = p × (π/4) × (D² − d²)',
      formulaAlt: '1 MPa = 1 N/mm²;A 的单位为 mm²,故 F 直接为 N;实际输出力 = 理论力 × η',
      steps: [...steps, ...extraSteps],
      results: [
        { label: '活塞有效面积 A₁', value: fmt(a1), unit: 'mm²' },
        { label: '环形有效面积 A₂', value: fmt(a2), unit: 'mm²' },
        {
          label: direction === 'push' ? '理论推力 F₁(伸出)' : '理论拉力 F₂(缩回)',
          value: fmt(direction === 'push' ? fPush : fPull),
          unit: 'N',
          primary: true,
        },
        {
          label: '折算(kN)',
          value: fmt((direction === 'push' ? fPush : fPull) / 1000),
          unit: 'kN',
        },
        direction === 'push'
          ? { label: '参考·回程拉力 F₂', value: fmt(fPull), unit: 'N' }
          : { label: '参考·伸出推力 F₁', value: fmt(fPush), unit: 'N' },
        { label: `实际输出力(η=${fmt(efficiency)})`, value: fmt(fActual), unit: 'N' },
        { label: '标准缸径系列推荐', value: `Φ${fmt(stdBore)}`, unit: 'mm' },
        ...(loadRatio != null
          ? [{ label: '负载率 β', value: `${fmt(loadRatio * 100)}%`, unit: `(vs ${fmt(loadForce as number)} N)`, tone: ratioTone }]
          : []),
      ],
      note: `理论力未计背压,已按机械效率 η=${fmt(efficiency)} 折算实际输出力。气动负载率建议 ≤70%(动态载荷 ≤50%),过高易爬行。标准缸径按 GB/T 2348 圆整。`,
      disclaimer: true,
    },
  };
}

/** 生成可复制的结果文本 */
export function cylinderCopyText(input: CylinderInput, digits = 2): string {
  const fmt = (n: number) => fmtNum(n, digits);
  const o = calcCylinder(input, { digits });
  if (!o.result) return '';
  const r = o.result;
  return [
    '【气缸推力计算】',
    `缸径 D = ${fmt(input.bore ?? 0)} mm`,
    `杆径 d = ${fmt(input.rod ?? 0)} mm`,
    `工作压力 p = ${fmt(input.pressure ?? 0)} MPa`,
    `方向: ${input.direction === 'push' ? '推出' : '缩回'}`,
    `机械效率 η = ${fmt(input.efficiency ?? 0.9)}`,
    ...(input.loadForce != null && input.loadForce > 0 ? [`外部负载 F_L = ${fmt(input.loadForce)} N`] : []),
    '',
    `公式: ${r.formula}`,
    '',
    ...r.steps.map((s, i) => `${i + 1}. ${s}`),
    '',
    ...r.results.map((x) => `${x.label}: ${x.value}${x.unit ? ' ' + x.unit : ''}`),
  ].join('\n');
}
