// 液压蓄能器容积计算
// 按气体多变过程计算所需公称容积:
//   V0 = ΔV / [ (p0/p1)^(1/n) − (p0/p2)^(1/n) ]
//   n = 1.4 绝热(快速充放), 1.0 等温(缓慢)
//   充气压力 p0 = 0.9 × p1(蓄能/泄漏补偿), 0.75 × p1(冲击吸收)
//   最高充放比 p2/p0 ≤ 4.0(皮囊式推荐),超出需警示
import type { CalcOption, CalcOutcome } from '../types';
import { fmtNum } from '../lib/format';

export type AccumulatorMode = 'EMERGENCY_POWER' | 'LEAK_COMPENSATION' | 'SHOCK_ABSORPTION';
export type AccumulatorProcess = 'ADIABATIC' | 'ISOTHERMAL';

export interface AccumulatorInput {
  mode: AccumulatorMode;
  deltaV: number | null;   // 有效释放油量 ΔV, L
  p2: number | null;       // 最高工作压力 p2, bar
  p1: number | null;       // 最低工作压力 p1, bar
  processType: AccumulatorProcess;
  tempFillC?: number | null;   // 充气时环境温度, ℃(默认 20)
  tempWorkC?: number | null;   // 工作环境温度, ℃(默认 20)
}

export const ACCUMULATOR_DEFAULTS: AccumulatorInput = {
  mode: 'EMERGENCY_POWER',
  deltaV: 5,
  p2: 200,
  p1: 100,
  processType: 'ADIABATIC',
  tempFillC: 20,
  tempWorkC: 20,
};

/** 工业标准皮囊蓄能器公称容积(L) */
const STANDARD_ACCUMULATOR_SIZES_L = [
  0.63, 1.0, 1.6, 2.5, 4.0, 6.3, 10.0, 16.0, 20.0, 25.0, 32.0, 40.0, 50.0, 63.0, 100.0,
];

export function calcAccumulator(input: AccumulatorInput, opt: CalcOption = { digits: 2 }): CalcOutcome {
  const { mode, deltaV: dV, p2, p1, processType = 'ADIABATIC' } = input;
  const tempFillC = input.tempFillC ?? 20;
  const tempWorkC = input.tempWorkC ?? 20;
  const fe: Record<string, string> = {};

  if (dV == null || Number.isNaN(dV)) fe.deltaV = '请输入有效释放油量';
  else if (dV <= 0) fe.deltaV = '释放油量必须大于 0';
  if (p2 == null || Number.isNaN(p2)) fe.p2 = '请输入最高压力';
  else if (p2 <= 0) fe.p2 = '压力必须大于 0';
  if (p1 == null || Number.isNaN(p1)) fe.p1 = '请输入最低压力';
  else if (p1 <= 0) fe.p1 = '压力必须大于 0';
  if (!fe.p1 && !fe.p2 && p1 != null && p2 != null && p1 >= p2) fe.p1 = '最低压力 p1 必须小于最高压力 p2';
  if (Number.isNaN(tempFillC) || tempFillC < -40 || tempFillC > 120) fe.tempFillC = '温度应在 -40~120 ℃ 之间';
  if (Number.isNaN(tempWorkC) || tempWorkC < -40 || tempWorkC > 120) fe.tempWorkC = '温度应在 -40~120 ℃ 之间';

  if (Object.keys(fe).length) return { ok: false, fieldErrors: fe };

  const dVv = dV as number;
  const p2v = p2 as number;
  const p1v = p1 as number;
  const n = processType === 'ADIABATIC' ? 1.4 : 1.0;

  const fmt = (x: number) => fmtNum(x, opt.digits);

  const p0Factor = mode === 'SHOCK_ABSORPTION' ? 0.75 : 0.9;
  const p0 = p1v * p0Factor;
  const term1 = Math.pow(p0 / p1v, 1 / n);
  const term2 = Math.pow(p0 / p2v, 1 / n);
  const V0 = dVv / (term1 - term2);
  const ratio = p2v / p0;
  const safe = ratio <= 4.0;
  const stdVol = STANDARD_ACCUMULATOR_SIZES_L.find((v) => v >= V0) ?? V0;

  // 温度修正(理想气体等容换算):现场充气压力按充气/工作温差折算
  const tDiff = Math.abs(tempFillC - tempWorkC);
  const p0FillTemp = tDiff > 0.05 ? p0 * ((273.15 + tempFillC) / (273.15 + tempWorkC)) : null;

  const modeName =
    mode === 'EMERGENCY_POWER' ? '应急动力' : mode === 'LEAK_COMPENSATION' ? '泄漏补偿' : '冲击吸收';

  const steps = [
    `工作模式: ${modeName}${processType === 'ADIABATIC' ? ' · 绝热快速释放 (n=1.4)' : ' · 等温慢速释放 (n=1.0)'}`,
    `充气压力设定 p0 = ${fmt(p0Factor)} × p1 = ${fmt(p0Factor)} × ${fmt(p1v)} = ${fmt(p0)} bar`,
    `有效释放油量 ΔV = ${fmt(dVv)} L`,
    `多变方程计算: V0 = ΔV / [ (p0/p1)^(1/n) − (p0/p2)^(1/n) ] = ${fmt(dVv)} / (${fmt(term1)} − ${fmt(term2)}) = ${fmt(V0)} L`,
    `最高充放比 p2/p0 = ${fmt(p2v)} / ${fmt(p0)} = ${fmt(ratio)} (皮囊式推荐 ≤ 4.0: ${safe ? '合格' : '警告: 膨胀比过大'})`,
    `推荐选用工业标准公称容积: ${fmt(stdVol)} L`,
    ...(p0FillTemp != null
      ? [`温度修正:工作温度下需保证 p₀=${fmt(p0)} bar,现场 ${fmt(tempFillC)}℃ 充气时应充至 p₀′ = p₀ × (273+T充)/(273+T工) = ${fmt(p0FillTemp)} bar`]
      : []),
  ];

  return {
    ok: true,
    result: {
      formula: 'V₀ = ΔV / [ (p₀/p₁)^(1/n) − (p₀/p₂)^(1/n) ]',
      formulaAlt: 'n = 1.4 绝热(快速)/ 1.0 等温(缓慢);p₀ = 0.9·p₁(蓄能)或 0.75·p₁(缓冲)',
      steps,
      results: [
        { label: '所需理论容积 V0', value: fmt(V0), unit: 'L' },
        { label: '充气压力 p0', value: fmt(p0), unit: 'bar' },
        { label: '推荐公称容积', value: fmt(stdVol), unit: 'L', primary: true },
        { label: '最高充放比 p2/p0', value: fmt(ratio), unit: '—', tone: safe ? 'ok' : 'bad' },
        ...(p0FillTemp != null
          ? [{ label: `现场充气值(${fmt(tempFillC)}℃)`, value: fmt(p0FillTemp), unit: 'bar' }]
          : []),
      ],
      note: `皮囊式蓄能器充放比建议 ≤ 4.0(最高不超过 10);氮气预充压力不得低于系统最低压力。${p0FillTemp != null ? '冬夏温差会使皮囊压力漂移可达 10% 以上,务必按现场温度折算充气值。' : ''}以上为初步计算,应按 GB/T 2352 等标准选型。`,
      disclaimer: true,
    },
  };
}

/** 生成可复制的结果文本 */
export function accumulatorCopyText(input: AccumulatorInput, digits = 2): string {
  const fmt = (n: number) => fmtNum(n, digits);
  const o = calcAccumulator(input, { digits });
  if (!o.result) return '';
  const r = o.result;
  const modeName =
    input.mode === 'EMERGENCY_POWER' ? '应急动力' : input.mode === 'LEAK_COMPENSATION' ? '泄漏补偿' : '冲击吸收';
  return [
    '【液压蓄能器容积计算】',
    `工作模式: ${modeName}`,
    `有效释放油量 ΔV = ${fmt(input.deltaV ?? 0)} L`,
    `最高压力 p2 = ${fmt(input.p2 ?? 0)} bar`,
    `最低压力 p1 = ${fmt(input.p1 ?? 0)} bar`,
    `气体过程: ${input.processType === 'ADIABATIC' ? '绝热 (n=1.4)' : '等温 (n=1.0)'}`,
    `充气/工作温度: ${fmt(input.tempFillC ?? 20)} / ${fmt(input.tempWorkC ?? 20)} ℃`,
    '',
    `公式: ${r.formula}`,
    '',
    ...r.steps.map((s, i) => `${i + 1}. ${s}`),
    '',
    ...r.results.map((x) => `${x.label}: ${x.value}${x.unit ? ' ' + x.unit : ''}`),
  ].join('\n');
}
