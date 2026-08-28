// ISO 极限与配合查询计算(ISO 286-1 / GB/T 1800.1)
// 支持公称尺寸 1 ~ 500 mm,公差等级 IT5 ~ IT12:
//   孔: G F H JS K M N P R S T U;轴: c d f g h js k m n p r s t u
// 实现:IT 公差值为标准表;基本偏差采用 ISO 286-1 附录公式计算(尺寸段几何平均 D),
//   孔 K~U 按等级 ≤IT7/8 时加 δ = ITn − IT(n−1) 修正(保证 P7/h6 ≡ H7/p6 等等效配合性质),
//   与标准查表值可能存在 ±2 μm 级偏差,重要场合以标准表为准。
// 配合性质判定:最小间隙 ≥ 0 → 间隙;最大间隙 ≤ 0 → 过盈;其余 → 过渡。
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
export const HOLE_GRADE_OPTIONS = ['H6', 'H7', 'H8', 'H9', 'F7', 'G7', 'JS7', 'K7', 'M7', 'N7', 'P7', 'R7', 'S7', 'U7'];
/** 常用轴公差带选项 */
export const SHAFT_GRADE_OPTIONS = ['h5', 'h6', 'g5', 'g6', 'f7', 'js6', 'k6', 'm6', 'n6', 'p6', 'r6', 's6', 'u6', 'd9', 'c11'];

/** 典型应用场景 → 推荐配合速选 */
export interface FitScenario { key: string; name: string; hole: string; shaft: string; desc: string }
export const FIT_SCENARIOS: FitScenario[] = [
  { key: 'slide-precise', name: '精密滑动(H7/h6)', hole: 'H7', shaft: 'h6', desc: '最小间隙 0,定位销、滑动导轨、低速轴' },
  { key: 'slide-run', name: '正常滑动(H7/f7)', hole: 'H7', shaft: 'f7', desc: '中等运转间隙,齿轮箱滑动轴承、泵轴' },
  { key: 'free-run', name: '自由转动(H8/d9)', hole: 'H8', shaft: 'd9', desc: '大间隙,高温高速、多尘环境、宽松装配' },
  { key: 'trans-key', name: '过渡定位(H7/k6)', hole: 'H7', shaft: 'k6', desc: '键/销定位、联轴器、轴承内圈配合' },
  { key: 'trans-tight', name: '过渡偏紧(H7/n6)', hole: 'H7', shaft: 'n6', desc: '定位要求高、很少拆卸的过渡连接' },
  { key: 'press-light', name: '轻压过盈(H7/p6)', hole: 'H7', shaft: 'p6', desc: '轻压定位、传递小扭矩(加键)' },
  { key: 'press-mid', name: '中压过盈(H7/s6)', hole: 'H7', shaft: 's6', desc: '中等过盈,压装或热套,传递中等扭矩' },
  { key: 'press-heavy', name: '重压/热套(H7/u6)', hole: 'H7', shaft: 'u6', desc: '大过盈,热套装配,靠摩擦传扭不可拆' },
];

/** 各尺寸段上限(mm) */
const SIZE_STEPS = [3, 6, 10, 18, 30, 50, 80, 120, 180, 250, 315, 400, 500];

/** IT 公差值表(μm):行 = IT 等级,列对应 SIZE_STEPS */
const IT_TABLE: Record<number, number[]> = {
  5: [4, 5, 6, 8, 9, 11, 13, 15, 18, 20, 23, 25, 27],
  6: [6, 8, 9, 11, 13, 16, 19, 22, 25, 29, 32, 36, 40],
  7: [10, 12, 15, 18, 21, 25, 30, 35, 40, 46, 52, 57, 63],
  8: [14, 18, 22, 27, 33, 39, 46, 54, 63, 72, 81, 89, 97],
  9: [25, 30, 36, 43, 52, 62, 74, 87, 100, 115, 130, 140, 155],
  10: [40, 48, 58, 70, 84, 100, 120, 140, 160, 185, 210, 230, 250],
  11: [60, 75, 90, 110, 130, 160, 190, 220, 250, 290, 320, 360, 400],
  12: [100, 120, 150, 180, 210, 250, 300, 350, 400, 460, 520, 570, 630],
};

/** 尺寸段几何平均直径(mm) */
function stepGeoMean(nominalD: number): number {
  const idx = SIZE_STEPS.findIndex((s) => nominalD <= s);
  const upper = SIZE_STEPS[idx === -1 ? SIZE_STEPS.length - 1 : idx];
  const lower = idx === 0 || idx === -1 ? 1 : SIZE_STEPS[idx - 1];
  if (nominalD <= 3) return Math.sqrt(1 * 3);
  return Math.sqrt(lower * upper);
}

export function getITValue(nominalD: number, itLevel: number): number {
  const row = IT_TABLE[itLevel] ?? IT_TABLE[7];
  const idx = SIZE_STEPS.findIndex((s) => nominalD <= s);
  return row[idx === -1 ? row.length - 1 : idx];
}

const r0 = (x: number) => Math.round(x);

/** 轴基本偏差(ISO 286-1 附录公式):返回 ei(下偏差,μm),es = ei + IT */
function shaftFundamentalEi(nominalD: number, symbol: string, it: number): number | null {
  const D = stepGeoMean(nominalD);
  switch (symbol) {
    case 'c': return r0(nominalD <= 40 ? -52 * Math.pow(D, 0.2) : -(95 + 0.8 * D));
    case 'd': return r0(-16 * Math.pow(D, 0.44));
    case 'f': return r0(-5.5 * Math.pow(D, 0.41));
    case 'g': return r0(-2.5 * Math.pow(D, 0.34));
    case 'h': return 0;
    case 'js': return 0; // 特殊处理:对称分布 es = +IT/2
    case 'k': return nominalD <= 3 ? 0 : r0(0.6 * Math.cbrt(D));
    case 'm': return r0(getITValue(nominalD, 7) - getITValue(nominalD, 6));
    case 'n': return r0(5 * Math.pow(D, 0.34));
    case 'p': return getITValue(nominalD, 7) + (nominalD <= 3 ? 0 : 1);
    case 'r': {
      const p = shaftFundamentalEi(nominalD, 'p', it)!;
      const s = shaftFundamentalEi(nominalD, 's', it)!;
      return r0(Math.sqrt(p * s));
    }
    case 's': return nominalD <= 50
      ? getITValue(nominalD, 8) + r0(0.1 * D)
      : getITValue(nominalD, 7) + r0(0.4 * D);
    case 't': return nominalD <= 24 ? null : getITValue(nominalD, 7) + r0(0.63 * D);
    case 'u': return getITValue(nominalD, 7) + r0(D);
    default: return null;
  }
}

/** 轴公差带 → { es, ei } (μm),导出供测试/高级查询
 *  c/d/f/g/h: 上偏差 es 为基本偏差(负或零), es = 基本偏差, ei = es − IT;
 *  k/m/n/p/r/s/t/u: 下偏差 ei 为基本偏差(正), es = ei + IT;
 *  js: 对称 ±IT/2 */
export function getShaftDeviations(nominalD: number, grade: string): { es: number; ei: number } {
  const match = grade.match(/([a-z]+)(\d+)/);
  if (!match) return { es: 0, ei: -13 };
  const symbol = match[1];
  const itNum = parseInt(match[2], 10);
  const it = getITValue(nominalD, itNum);
  if (symbol === 'js') return { es: it / 2, ei: -it / 2 };
  const fund = shaftFundamentalEi(nominalD, symbol, it);
  if (fund == null) return { es: 0, ei: -it };
  if (fund <= 0) return { es: fund, ei: fund - it };
  return { es: fund + it, ei: fund };
}

/** 孔公差带 → { es, ei } (μm),导出供测试/高级查询
 *  规则:G/F 为 g/f 的镜像;K~U 按公式取 −ei(同字母轴) + δ,
 *  δ = ITn − IT(n−1)(K/M/N ≤ IT8,P~U ≤ IT7;粗于该等级 δ = 0),
 *  保证 P7/h6 ≡ H7/p6 等同名配合的等效性。 */
export function getHoleDeviations(nominalD: number, grade: string): { es: number; ei: number } {
  const match = grade.match(/([A-Z]+)(\d+)/);
  if (!match) return { es: 21, ei: 0 };
  const symbol = match[1];
  const itNum = parseInt(match[2], 10);
  const it = getITValue(nominalD, itNum);

  if (symbol === 'H') return { es: it, ei: 0 };
  if (symbol === 'JS') return { es: it / 2, ei: -it / 2 };
  if (symbol === 'G') return { es: 0, ei: -r0(-2.5 * Math.pow(stepGeoMean(nominalD), 0.34)) };
  if (symbol === 'F') return { es: 0, ei: -r0(-5.5 * Math.pow(stepGeoMean(nominalD), 0.41)) };

  const mirrorMap: Record<string, string> = { K: 'k', M: 'm', N: 'n', P: 'p', R: 'r', S: 's', T: 't', U: 'u' };
  const shaftSym = mirrorMap[symbol];
  if (!shaftSym) return { es: it, ei: 0 };

  const tIdx = shaftSym === 't' ? 24 : null;
  if (tIdx != null && nominalD <= tIdx) return { es: it, ei: 0 }; // t 仅用于 >24 mm

  const eiShaft = shaftFundamentalEi(nominalD, shaftSym, it);
  if (eiShaft == null) return { es: it, ei: 0 };

  const useDelta = (['K', 'M', 'N'].includes(symbol) && itNum <= 8)
    || (['P', 'R', 'S', 'T', 'U'].includes(symbol) && itNum <= 7);
  const delta = useDelta ? getITValue(nominalD, itNum) - getITValue(nominalD, itNum - 1) : 0;
  const es = -(eiShaft) + delta;
  return { es, ei: es - it };
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
      formula: 'X = ES ? ei(最小间隙) / Y = es ? EI(过盈) · 按 ISO 286 公差带',
      formulaAlt: '孔大写(G F H JS K M N P R S T U),轴小写(c d f g h js k m n p r s t u);IT5~IT12',
      steps,
      results,
      note: '公差值为标准表;基本偏差按 ISO 286-1 附录公式计算并圆整,与标准查表值可能有 ±2 μm 级差异,重要配合以标准表为准。同名配合满足等效性(P7/h6 ≡ H7/p6 等)。',
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
