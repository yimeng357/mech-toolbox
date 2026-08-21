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
}

export const CYLINDER_DEFAULTS: CylinderInput = {
  bore: 100,
  rod: 32,
  pressure: 0.8,
  direction: 'push',
};

const PI4 = Math.PI / 4;

export function calcCylinder(input: CylinderInput, opt: CalcOption = { digits: 2 }): CalcOutcome {
  const { bore, rod, pressure, direction } = input;
  const fe: Record<string, string> = {};

  if (bore == null || Number.isNaN(bore)) fe.bore = '请输入缸径';
  else if (bore <= 0) fe.bore = '缸径必须大于 0';
  if (rod == null || Number.isNaN(rod)) fe.rod = '请输入杆径';
  else if (rod < 0) fe.rod = '杆径不能为负';
  if (pressure == null || Number.isNaN(pressure)) fe.pressure = '请输入工作压力';
  else if (pressure < 0) fe.pressure = '压力不能为负';

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

  return {
    ok: true,
    result: {
      formula:
        direction === 'push'
          ? 'F₁ = p × A₁ = p × (π/4) × D²'
          : 'F₂ = p × A₂ = p × (π/4) × (D² − d²)',
      formulaAlt: '1 MPa = 1 N/mm²;A 的单位为 mm²,故 F 直接为 N',
      steps,
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
      ],
      note: '以上为理论力,未计入机械效率与背压。实际输出力应乘以机械效率 η(通常取 0.85~0.95),并考虑排气背压影响。',
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
    '',
    `公式: ${r.formula}`,
    '',
    ...r.steps.map((s, i) => `${i + 1}. ${s}`),
    '',
    ...r.results.map((x) => `${x.label}: ${x.value}${x.unit ? ' ' + x.unit : ''}`),
  ].join('\n');
}
