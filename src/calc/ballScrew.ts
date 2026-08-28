// 滚珠丝杠副寿命校核
// 当量载荷/当量转速(分段工况加权):
//   Pm = [(P1³·n1·t1 + P2³·n2·t2 + ...) / (n1·t1 + n2·t2 + ...)]^(1/3)   (滚珠丝杠取 1/3 次方)
//   nm = (n1·t1 + n2·t2 + ...) / (t1 + t2 + ...)
// 额定寿命:
//   L10 = (Ca / Pm)^3  (百万转)    L10h = 10^6 / (60·nm) · L10 (小时)
//   行程寿命:L10s = L10 × Pb / 10^3 (km 行程,即百万转×导程)
// dn 值校核:nm·dm ≤ 70000(油润滑)/ 50000(脂润滑)限转速
// 传动效率与驱动扭矩(升程):T = Fa·Pb / (2π·η)
// 注:未计入接触角/预压对刚度与寿命的影响;往复短行程应按当量行程载荷换算。
import type { CalcOption, CalcOutcome } from '../types';
import { fmtNum } from '../lib/format';

export interface BallScrewSegment {
  axialLoadN: number;  // 该段轴向载荷 Fa, N(受压为正)
  rpm: number;         // 该段转速, rpm
  ratio: number;       // 该段时间占比(0~1,所有段合计 = 1)
}

export interface BallScrewInput {
  dynamicLoadRatingN: number | null; // 额定动载荷 Ca, N(样本值)
  leadMm: number | null;             // 导程 Pb, mm
  rootDiaMm: number | null;          // 丝杠底径 d2, mm(dn 校核与临界转速参考)
  segments: Array<BallScrewSegment>; // 工况分段(2~4 段)
  targetLifeHours?: number | null;   // 目标寿命 Lh, h(可选,反算所需 Ca)
  lubrication?: 'GREASE' | 'OIL';    // 润滑方式(dn 限值,默认 GREASE)
  efficiency?: number | null;        // 传动效率 η(默认 0.9)
  meanFactor?: number | null;        // 载荷波动补充系数 fw(默认 1.2,覆盖冲击与波动)
}

export const BALL_SCREW_DEFAULTS: BallScrewInput = {
  dynamicLoadRatingN: 28500,
  leadMm: 10,
  rootDiaMm: 21.5,
  segments: [
    { axialLoadN: 4200, rpm: 300, ratio: 0.2 },
    { axialLoadN: 1500, rpm: 900, ratio: 0.5 },
    { axialLoadN: 300, rpm: 1500, ratio: 0.3 },
  ],
  targetLifeHours: 20000,
  lubrication: 'GREASE',
  efficiency: 0.9,
  meanFactor: 1.2,
};

/** dn 值限值(rpm·mm) */
export const DN_LIMITS = { GREASE: 50000, OIL: 70000 } as const;

export function calcBallScrew(input: BallScrewInput, opt: CalcOption = { digits: 2 }): CalcOutcome {
  const {
    dynamicLoadRatingN: Ca, leadMm: Pb, rootDiaMm: d2,
    segments, targetLifeHours: Lh, lubrication = 'GREASE',
    efficiency: eta, meanFactor: fw,
  } = input;
  const fe: Record<string, string> = {};

  if (Ca == null || Number.isNaN(Ca) || Ca <= 0) fe.dynamicLoadRatingN = '请输入额定动载荷 Ca';
  if (Pb == null || Number.isNaN(Pb) || Pb <= 0) fe.leadMm = '请输入导程';
  if (d2 != null && (Number.isNaN(d2) || d2 <= 0)) fe.rootDiaMm = '底径必须大于 0';

  const segs = (segments ?? []).filter((s) => s && (s.axialLoadN !== 0 || s.rpm !== 0) && s.ratio > 0);
  if (segs.length === 0) fe.segments = '请至少填写一个工况段(载荷/转速/占比)';
  else {
    const ratioSum = segs.reduce((a, s) => a + (Number.isNaN(s.ratio) ? 0 : s.ratio), 0);
    if (Math.abs(ratioSum - 1) > 0.05) fe.segments = `各段时间占比之和应为 1(当前 ${ratioSum.toFixed(2)})`;
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      if (Number.isNaN(s.axialLoadN) || s.axialLoadN < 0) fe.segments = `第 ${i + 1} 段载荷无效`;
      if (Number.isNaN(s.rpm) || s.rpm < 0) fe.segments = `第 ${i + 1} 段转速无效`;
    }
  }
  if (eta != null && (Number.isNaN(eta) || eta <= 0 || eta > 1)) fe.efficiency = '效率应在 0~1 之间';
  if (fw != null && (Number.isNaN(fw) || fw < 1)) fe.meanFactor = '波动系数应 ≥ 1';

  if (Object.keys(fe).length) return { ok: false, fieldErrors: fe };

  const Cav = Ca as number;
  const Pbv = Pb as number;
  const fwV = fw ?? 1.2;
  const etaV = eta ?? 0.9;
  const fmt = (n: number) => fmtNum(n, opt.digits);

  // 当量载荷 / 当量转速
  let sumP3nt = 0;
  let sumNt = 0;
  let maxSegLoad = 0;
  for (const s of segs) {
    sumP3nt += Math.pow(s.axialLoadN, 3) * s.rpm * s.ratio;
    sumNt += s.rpm * s.ratio;
    if (s.axialLoadN > maxSegLoad) maxSegLoad = s.axialLoadN;
  }
  const Pm = Math.pow(sumP3nt / Math.max(sumNt, 1e-9), 1 / 3) * fwV;
  const nm = sumNt;
  const steps: string[] = [
    `工况分段(${segs.length} 段):${segs.map((s, i) => `Fa${i + 1}=${fmt(s.axialLoadN)}N@${fmt(s.rpm)}rpm×${s.ratio}`).join(', ')}`,
    `当量转速 nm = Σ(ni·ti) = ${fmt(nm)} rpm`,
    `当量载荷 Pm = (Σ(Pi³·ni·ti)/Σ(ni·ti))^(1/3) × fw(${fmt(fwV)}) = ${fmt(Pm)} N`,
  ];

  // 寿命
  const L10 = Math.pow(Cav / Pm, 3);          // 百万转
  const L10h = nm > 0 ? (1e6 / (60 * nm)) * L10 : Infinity;
  steps.push(`L10 = (Ca/Pm)³ = (${fmt(Cav)}/${fmt(Pm)})³ = ${fmt(L10)} 百万转`);
  if (nm > 0) {
    steps.push(`L10h = 10^6/(60×${fmt(nm)}) × ${fmt(L10)} = ${fmt(L10h)} 小时`);
  }
  const travelKm = L10 * Pbv / 1000;
  steps.push(`行程寿命 L10s = L10 × Pb = ${fmt(L10)} × ${fmt(Pbv)} mm = ${fmt(travelKm)} km`);

  const results: Array<{ label: string; value: string; unit?: string; primary?: boolean; tone?: 'ok' | 'warn' | 'bad' }> = [
    { label: '当量载荷 Pm', value: fmt(Pm), unit: 'N' },
    { label: '当量转速 nm', value: fmt(nm), unit: 'rpm' },
    { label: '额定寿命 L10', value: fmt(L10), unit: '百万转' },
    { label: '额定寿命 L10h', value: fmt(L10h), unit: 'h', primary: true },
    { label: '行程寿命', value: fmt(travelKm), unit: 'km' },
  ];

  // 目标寿命反算
  let lifeTone: 'ok' | 'warn' | 'bad' | undefined;
  if (Lh != null && !Number.isNaN(Lh) && Lh > 0 && nm > 0) {
    const revs = (60 * nm * Lh) / 1e6; // 百万转
    const CaReq = Pm * Math.pow(revs, 1 / 3);
    const margin = L10h / Lh;
    lifeTone = margin >= 1 ? 'ok' : margin >= 0.8 ? 'warn' : 'bad';
    steps.push(`目标 ${fmt(Lh)} h:所需 Ca = Pm·(60·nm·Lh/10^6)^(1/3) = ${fmt(CaReq)} N,寿命富余 ${fmt(margin)}×`);
    results.push(
      { label: `Lh=${fmt(Lh)}h 所需 Ca`, value: fmt(CaReq), unit: 'N' },
      { label: '寿命富余', value: fmt(margin), unit: '×', tone: lifeTone },
    );
  }

  // dn 值校核
  if (d2 != null && nm > 0) {
    const dn = nm * d2;
    const dnLimit = DN_LIMITS[lubrication];
    const dnOk = dn <= dnLimit;
    steps.push(`dn 值 = nm·d2 = ${fmt(nm)} × ${fmt(d2)} = ${fmt(dn)} rpm·mm(${lubrication === 'GREASE' ? '脂' : '油'}润滑限值 ${fmt(dnLimit)}) ${dnOk ? '✓' : '✗ 超限,需降速/换油润滑/减小导程'}`);
    results.push({ label: 'dn 值校核', value: fmt(dn), unit: `rpm·mm(限 ${fmt(dnLimit)})`, tone: dnOk ? 'ok' : 'bad' });
  }

  // 最大段载荷驱动扭矩(升程)
  const driveTorque = (maxSegLoad * Pbv / 1000) / (2 * Math.PI * etaV) * 1000; // N·mm → N·m 换算:Fa·Pb/(2πη), N·mm
  steps.push(`最大段载荷 ${fmt(maxSegLoad)} N 的升程驱动扭矩 T = Fa·Pb/(2π·η) = ${fmt(driveTorque / 1000)} N·m`);

  results.push({ label: '最大段驱动扭矩', value: fmt(driveTorque / 1000), unit: 'N·m' });

  return {
    ok: true,
    result: {
      formula: 'Pm = (ΣPi³·ni·ti/Σni·ti)^(1/3) · L10 = (Ca/Pm)³ · L10h = 10^6/(60·nm)·L10',
      formulaAlt: '行程寿命 = L10×Pb;dn = nm·d2 ≤ 限值;T = Fa·Pb/(2π·η)',
      steps,
      results,
      note: '额定动载荷 Ca 取厂家样本值(不同厂家定义可能含预压差异);fw 波动系数覆盖冲击/振动,平稳机构可降到 1.1;未计温升与临界转速,高速长行程应另做压杆稳定与临界转速校核(可用「液压缸压杆稳定」工具估算)。',
      disclaimer: true,
    },
  };
}

export function ballScrewCopyText(input: BallScrewInput, digits = 2): string {
  const o = calcBallScrew(input, { digits });
  if (!o.result) return '';
  const r = o.result;
  return [
    '【滚珠丝杠副寿命校核】',
    `Ca = ${input.dynamicLoadRatingN ?? '—'} N · Pb = ${input.leadMm ?? '—'} mm · d2 = ${input.rootDiaMm ?? '—'} mm`,
    `工况:${(input.segments ?? []).map((s) => `Fa${s.axialLoadN}N@${s.rpm}rpm×${s.ratio}`).join(', ')}`,
    '',
    ...r.steps.map((s, i) => `${i + 1}. ${s}`),
    '',
    ...r.results.map((x) => `${x.label}: ${x.value}${x.unit ? ' ' + x.unit : ''}`),
  ].join('\n');
}
