// ISO 极限与配合查询计算(ISO 286)
// 支持公称尺寸 1 ~ 500 mm,孔/轴公差带 IT6~IT9:
//   孔: H / P 基本偏差;轴: h / g / f / k / p 基本偏差
// 配合性质判定:最小间隙 ≥ 0 → 间隙;最大间隙 ≤ 0 → 过盈;其余 → 过渡
// 注:基本偏差与 IT 值按常用尺寸段简化查表,精确值以 ISO 286 标准为准
import type { CalcOption, CalcOutcome } from '../types';
import { fmtNum } from '../lib/format';

export type FitType = 'CLEARANCE' | 'TRANSITION' | 'INTERFERENCE';

export interface IsoToleranceInput {
  nominalDiameterMm: number | null;
  holeGrade: string;
  shaftGrade: string;
}

export const ISO_TOLERANCE_DEFAULTS: IsoToleranceInput = {
  nominalDiameterMm: 30,
  holeGrade: 'H7',
  shaftGrade: 'g6',
};

/** 常用孔公差带选项 */
export const HOLE_GRADE_OPTIONS = ['H6', 'H7', 'H8', 'H9', 'P7'];
/** 常用轴公差带选项 */
export const SHAFT_GRADE_OPTIONS = ['h6', 'g6', 'f7', 'k6', 'p6'];

/** 各尺寸段上限(mm) */
const SIZE_STEPS = [3, 6, 10, 18, 30, 50, 80, 120, 180, 250, 315, 400, 500];

/** IT 公差值表(μm):行 = IT 等级,列对应 SIZE_STEPS */
const IT_TABLE: Record<number, number[]> = {
  6: [6, 8, 9, 11, 13, 16, 19, 22, 25, 29, 32, 36, 40],
  7: [10, 12, 15, 18, 21, 25, 30, 35, 40, 46, 52, 57, 63],
  8: [14, 18, 22, 27, 33, 39, 46, 54, 63, 72, 81, 89, 97],
  9: [25, 30, 36, 43, 52, 62, 74, 87, 100, 115, 130, 140, 155],
};

function getITValue(nominalD: number, itLevel: number): number {
  const row = IT_TABLE[itLevel] ?? IT_TABLE[7];
  const idx = SIZE_STEPS.findIndex((s) => nominalD <= s);
  return row[idx === -1 ? row.length - 1 : idx];
}

function getHoleDeviations(nominalD: number, grade: string): { es: number; ei: number } {
  const match = grade.match(/([A-Z]+)(\d+)/);
  if (!match) return { es: 21, ei: 0 };
  const symbol = match[1];
  const itNum = parseInt(match[2], 10);
  const it = getITValue(nominalD, itNum);

  if (symbol === 'H') {
    return { es: it, ei: 0 };
  }
  if (symbol === 'P') {
    const fundamental = -getITValue(nominalD, 7);
    return { es: fundamental, ei: fundamental - it };
  }
  return { es: it, ei: 0 };
}

function getShaftDeviations(nominalD: number, grade: string): { es: number; ei: number } {
  const match = grade.match(/([a-z]+)(\d+)/);
  if (!match) return { es: 0, ei: -13 };
  const symbol = match[1];
  const itNum = parseInt(match[2], 10);
  const it = getITValue(nominalD, itNum);

  if (symbol === 'h') {
    return { es: 0, ei: -it };
  }
  if (symbol === 'g') {
    const es = nominalD <= 10 ? -4 : nominalD <= 30 ? -7 : -9;
    return { es, ei: es - it };
  }
  if (symbol === 'f') {
    const es = nominalD <= 10 ? -13 : nominalD <= 30 ? -20 : -25;
    return { es, ei: es - it };
  }
  if (symbol === 'k') {
    return { es: it + 2, ei: 2 };
  }
  if (symbol === 'p') {
    const ei = nominalD <= 10 ? 15 : nominalD <= 30 ? 22 : 32;
    return { es: ei + it, ei };
  }
  return { es: 0, ei: -it };
}

export function calcIsoTolerance(input: IsoToleranceInput, opt: CalcOption = { digits: 2 }): CalcOutcome {
  const { nominalDiameterMm: D, holeGrade, shaftGrade } = input;
  const fe: Record<string, string> = {};

  if (D == null || Number.isNaN(D)) fe.nominalDiameterMm = '请输入公称尺寸';
  else if (D <= 0 || D > 500) fe.nominalDiameterMm = '公称尺寸必须在 1 ~ 500 mm 范围内';

  if (Object.keys(fe).length) return { ok: false, fieldErrors: fe };

  const Dv = D as number;
  const fmt = (n: number) => fmtNum(n, opt.digits);

  const holeDev = getHoleDeviations(Dv, holeGrade);
  const shaftDev = getShaftDeviations(Dv, shaftGrade);

  const holeMax = Dv + holeDev.es / 1000;
  const holeMin = Dv + holeDev.ei / 1000;
  const shaftMax = Dv + shaftDev.es / 1000;
  const shaftMin = Dv + shaftDev.ei / 1000;

  const maxGap = holeDev.es - shaftDev.ei;
  const minGap = holeDev.ei - shaftDev.es;

  let fitType: FitType;
  let fitTypeName: string;
  let maxClearanceUm: number | undefined;
  let minClearanceUm: number | undefined;
  let maxInterferenceUm: number | undefined;
  let minInterferenceUm: number | undefined;

  const steps = [
    `公称尺寸: Ф${fmt(Dv)} mm`,
    `孔公差 ${holeGrade}: 上偏差 ES = ${holeDev.es >= 0 ? '+' : ''}${holeDev.es} μm, 下偏差 EI = ${holeDev.ei >= 0 ? '+' : ''}${holeDev.ei} μm (尺寸 ${fmt(holeMin)} ~ ${fmt(holeMax)} mm)`,
    `轴公差 ${shaftGrade}: 上偏差 es = ${shaftDev.es >= 0 ? '+' : ''}${shaftDev.es} μm, 下偏差 ei = ${shaftDev.ei >= 0 ? '+' : ''}${shaftDev.ei} μm (尺寸 ${fmt(shaftMin)} ~ ${fmt(shaftMax)} mm)`,
  ];

  if (minGap >= 0) {
    fitType = 'CLEARANCE';
    fitTypeName = '间隙配合';
    maxClearanceUm = maxGap;
    minClearanceUm = minGap;
    steps.push(`判定为【间隙配合】: 最大间隙 Xmax = ${maxClearanceUm} μm, 最小间隙 Xmin = ${minClearanceUm} μm`);
  } else if (maxGap <= 0) {
    fitType = 'INTERFERENCE';
    fitTypeName = '过盈配合';
    maxInterferenceUm = Math.abs(minGap);
    minInterferenceUm = Math.abs(maxGap);
    steps.push(`判定为【过盈配合】: 最大过盈 Ymax = ${maxInterferenceUm} μm, 最小过盈 Ymin = ${minInterferenceUm} μm`);
  } else {
    fitType = 'TRANSITION';
    fitTypeName = '过渡配合';
    maxClearanceUm = maxGap;
    maxInterferenceUm = Math.abs(minGap);
    steps.push(`判定为【过渡配合】: 最大间隙 Xmax = ${maxClearanceUm} μm, 最大过盈 Ymax = ${maxInterferenceUm} μm`);
  }

  const fitTone: 'ok' | 'warn' | 'bad' | undefined =
    fitType === 'CLEARANCE' ? 'ok' : fitType === 'INTERFERENCE' ? 'warn' : undefined;

  const results = [
    { label: '孔尺寸范围', value: `Ф${fmt(holeMin)} ~ ${fmt(holeMax)}`, unit: 'mm' },
    { label: '轴尺寸范围', value: `Ф${fmt(shaftMin)} ~ ${fmt(shaftMax)}`, unit: 'mm' },
    { label: '配合性质', value: fitTypeName, primary: true },
    ...(maxClearanceUm !== undefined ? [{ label: '最大间隙 Xmax', value: String(maxClearanceUm), unit: 'μm' }] : []),
    ...(minClearanceUm !== undefined ? [{ label: '最小间隙 Xmin', value: String(minClearanceUm), unit: 'μm' }] : []),
    ...(maxInterferenceUm !== undefined ? [{ label: '最大过盈 Ymax', value: String(maxInterferenceUm), unit: 'μm' }] : []),
    ...(minInterferenceUm !== undefined ? [{ label: '最小过盈 Ymin', value: String(minInterferenceUm), unit: 'μm' }] : []),
    {
      label: '孔公差 IT',
      value: String(holeDev.es - holeDev.ei),
      unit: 'μm',
      tone: fitTone,
    },
  ];

  return {
    ok: true,
    result: {
      formula: 'X = ES − ei(最小间隙) / Y = es − EI(过盈) · 按 ISO 286 公差带',
      formulaAlt: '孔公差带大写(H/P),轴公差带小写(h/g/f/k/p);IT6~IT9 常用等级',
      steps,
      results,
      note: '本工具为常用尺寸段简化查表,精确极限偏差应以 ISO 286 / GB/T 1800 标准表为准。',
      disclaimer: true,
    },
  };
}

/** 生成可复制的结果文本 */
export function isoToleranceCopyText(input: IsoToleranceInput, digits = 2): string {
  const fmt = (n: number) => fmtNum(n, digits);
  const o = calcIsoTolerance(input, { digits });
  if (!o.result) return '';
  const r = o.result;
  return [
    '【ISO 公差与配合查询】',
    `公称尺寸: Ф${fmt(input.nominalDiameterMm ?? 0)} mm`,
    `孔公差带: ${input.holeGrade}`,
    `轴公差带: ${input.shaftGrade}`,
    '',
    `公式: ${r.formula}`,
    '',
    ...r.steps.map((s, i) => `${i + 1}. ${s}`),
    '',
    ...r.results.map((x) => `${x.label}: ${x.value}${x.unit ? ' ' + x.unit : ''}`),
  ].join('\n');
}
