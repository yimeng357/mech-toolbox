// 厚壁圆筒拉美应力与爆破压力计算
// Lamé 应力分布 + 端部条件(开口/闭口) + von Mises 屈服 + Faupel 爆破压力
// 闭口端轴向应力 σz = Pi·ri2/(ro2−ri2) = Pi/(K2−1);开口端 σz 仅由外部轴向力产生
import type { CalcOption, CalcOutcome } from '../types';
import { fmtNum } from '../lib/format';

/** 端部条件:OPEN=开口圆筒,CLOSED=闭口圆筒(内压轴向分量由筒壁承担) */
export type LameEndCondition = 'OPEN' | 'CLOSED';

export interface LameCylinderInput {
  internalPressureBar: number; // 内压 Pi (bar)
  innerDiameterMm: number;     // 内径 Di (mm)
  outerDiameterMm: number;     // 外径 Do (mm)
  yieldStrengthMpa: number;    // 材料屈服强度 Re / Rp0.2 (MPa)
  tensileStrengthMpa: number;  // 材料抗拉强度 Rm (MPa)
  endCondition?: LameEndCondition; // 端部条件(默认 CLOSED,高压容器通常闭口)
  axialForceN?: number | null;     // 额外轴向力 F, N(拉为正,可选;开口端计入 σz)
  safetyFactorYield?: number;  // 屈服安全系数 (默认 1.5)
  safetyFactorBurst?: number;  // 爆破安全系数 (默认 2.5)
}

export const LAME_CYLINDER_DEFAULTS: LameCylinderInput = {
  internalPressureBar: 3500,
  innerDiameterMm: 20,
  outerDiameterMm: 50,
  yieldStrengthMpa: 850,
  tensileStrengthMpa: 1050,
  endCondition: 'CLOSED',
  axialForceN: null,
  safetyFactorYield: 1.5,
  safetyFactorBurst: 2.5,
};

/** 内壁三向应力下的 von Mises 等效应力(应力符号:环向/轴向为正,径向为负) */
function vonMises(sigmaT: number, sigmaR: number, sigmaZ: number): number {
  const s1 = sigmaT - sigmaR;
  const s2 = sigmaT - sigmaZ;
  const s3 = sigmaR - sigmaZ;
  return Math.sqrt(0.5 * (s1 * s1 + s2 * s2 + s3 * s3));
}

export function calcLameCylinder(input: LameCylinderInput, opt: CalcOption = { digits: 2 }): CalcOutcome {
  const {
    internalPressureBar: pBar, innerDiameterMm: Di, outerDiameterMm: Do,
    yieldStrengthMpa: Sy, tensileStrengthMpa: Su,
    endCondition: ec = 'CLOSED', axialForceN: Fz,
    safetyFactorYield: Sfy = 1.5, safetyFactorBurst: Sfb = 2.5,
  } = input;

  const fe: Record<string, string> = {};
  if (pBar <= 0) fe.internalPressureBar = '内压必须大于 0';
  if (Di <= 0) fe.innerDiameterMm = '内径必须大于 0';
  if (Do <= Di) fe.outerDiameterMm = '外径必须大于内径';
  if (Sy <= 0) fe.yieldStrengthMpa = '屈服强度必须大于 0';
  if (Su <= 0) fe.tensileStrengthMpa = '抗拉强度必须大于 0';
  if (Sfy <= 0) fe.safetyFactorYield = '屈服安全系数必须大于 0';
  if (Sfb <= 0) fe.safetyFactorBurst = '爆破安全系数必须大于 0';

  if (Object.keys(fe).length) return { ok: false, fieldErrors: fe };

  const fmt = (n: number) => fmtNum(n, opt.digits);
  const steps: string[] = [];
  const Pi = pBar / 10; // bar → MPa (1 MPa = 10 bar)
  const K = Do / Di;
  const t = (Do - Di) / 2;
  const isThickWalled = K > 1.2;

  steps.push(`内径 Di = ${fmt(Di)} mm, 外径 Do = ${fmt(Do)} mm, 壁厚 t = ${fmt(t)} mm`);
  steps.push(`圆筒径比 K = Do / Di = ${fmt(K)} (${isThickWalled ? '属于厚壁圆筒，必须采用 Lamé 理论' : '薄壁圆筒'})`);
  steps.push(`端部条件: ${ec === 'CLOSED' ? '闭口圆筒(内压轴向分量由筒壁承担)' : '开口圆筒(σz 仅由外部轴向力产生)'}`);

  // 1. Lamé 应力计算 (内壁为最大应力点)
  const K2 = K * K;
  const innerHoopStressMpa = Pi * ((K2 + 1) / (K2 - 1));
  const outerHoopStressMpa = Pi * (2 / (K2 - 1));

  steps.push(`内压 Pi = ${fmt(pBar)} bar = ${fmt(Pi)} MPa`);
  steps.push(`内壁环向拉应力 σt,i = Pi × (K2 + 1) / (K2 − 1) = ${fmt(innerHoopStressMpa)} MPa`);
  steps.push(`外壁环向拉应力 σt,o = Pi × 2 / (K2 − 1) = ${fmt(outerHoopStressMpa)} MPa`);
  steps.push(`内壁径向压应力 σr,i = −Pi = −${fmt(Pi)} MPa`);

  // 2. 轴向应力
  let axialStressMpa = 0;
  if (ec === 'CLOSED') {
    axialStressMpa = Pi / (K2 - 1);
    steps.push(`闭口端轴向应力 σz = Pi / (K2 − 1) = ${fmt(axialStressMpa)} MPa`);
  } else if (Fz != null && Fz !== 0) {
    const areaMm2 = (Math.PI / 4) * (Do * Do - Di * Di);
    axialStressMpa = Fz / areaMm2;
    steps.push(`开口端外部轴向力 σz = F / A = ${fmt(Fz)} / ${fmt(areaMm2)} = ${fmt(axialStressMpa)} MPa`);
  } else {
    steps.push('开口端且无外部轴向力: σz = 0');
  }

  // 3. von Mises 屈服等效应力(三向:环向/径向/轴向)
  const innerVonMisesStressMpa = vonMises(innerHoopStressMpa, -Pi, axialStressMpa);
  steps.push(`内壁第四强度理论 (von Mises) 等效应力 σv = √(0.5·[(σt−σr)2+(σt−σz)2+(σr−σz)2]) = ${fmt(innerVonMisesStressMpa)} MPa`);
  if (ec === 'CLOSED') {
    const vmClosedForm = (Math.sqrt(3) * K2 * Pi) / (K2 - 1);
    steps.push(`(闭口端校验: σv = √3·K2·Pi/(K2−1) = ${fmt(vmClosedForm)} MPa,与上式一致)`);
  } else if (Fz == null || Fz === 0) {
    const vmOpenForm = (Pi * Math.sqrt(3 * K2 * K2 + 1)) / (K2 - 1);
    steps.push(`(开口端校验: σv = Pi·√(3K4+1)/(K2−1) = ${fmt(vmOpenForm)} MPa,与上式一致)`);
  }

  // 4. 初始屈服压力 Py(von Mises 解析解,与三向应力数值解一致)
  //    闭口:σv = √3·K2·Pi/(K2−1) → Py = Sy·(K2−1)/(√3·K2)
  //    开口:σv = Pi·√(3K4+1)/(K2−1) → Py = Sy·(K2−1)/√(3K4+1)
  const yieldPressureMpa = ec === 'CLOSED'
    ? (Sy * (K2 - 1)) / (Math.sqrt(3) * K2)
    : (Sy * (K2 - 1)) / Math.sqrt(3 * K2 * K2 + 1);
  const yieldPressureBar = yieldPressureMpa * 10;
  const pyFormula = ec === 'CLOSED' ? 'Sy·(K2−1)/(√3·K2)' : 'Sy·(K2−1)/√(3K4+1)';
  const pyNote = ec === 'CLOSED' ? '闭口,含轴向应力' : '开口';
  steps.push(`初始屈服压力 Py = ${pyFormula} = ${fmt(yieldPressureBar)} bar (${pyNote})`);

  // 5. Faupel 经验爆破压力公式 Pb
  const burstPressureMpa = ((2 * Sy) / Math.sqrt(3)) * (2 - Sy / Su) * Math.log(K);
  const burstPressureBar = burstPressureMpa * 10;
  steps.push(`Faupel 爆破压力 Pb = (2·Sy / √3)·(2 − Sy/Su)·ln(K) = ${fmt(burstPressureBar)} bar`);

  // 6. 最大允许工作压力 MAWP
  const mawpYield = yieldPressureBar / Sfy;
  const mawpBurst = burstPressureBar / Sfb;
  const mawpBar = Math.min(mawpYield, mawpBurst);
  steps.push(`屈服控制 MAWP_y = Py / ${Sfy} = ${fmt(mawpYield)} bar`);
  steps.push(`爆破控制 MAWP_b = Pb / ${Sfb} = ${fmt(mawpBurst)} bar`);
  steps.push(`额定最大允许工作压力 MAWP = ${fmt(mawpBar)} bar`);

  const allowableStress = Sy / Sfy;
  const stressRatio = innerVonMisesStressMpa / allowableStress;

  const results = [
    { label: `内壁等效应力 σv(${ec === 'CLOSED' ? '闭口' : '开口'})`, value: fmt(innerVonMisesStressMpa), unit: 'MPa', primary: true },
    { label: '轴向应力 σz', value: fmt(axialStressMpa), unit: 'MPa' },
    { label: '初始屈服压力 Py', value: fmt(yieldPressureBar), unit: 'bar' },
    { label: 'Faupel 爆破压力 Pb', value: fmt(burstPressureBar), unit: 'bar' },
    { label: '额定工作压力 MAWP', value: fmt(mawpBar), unit: 'bar' },
    {
      label: '应力比 σv / [σ]',
      value: fmt(stressRatio),
      unit: '—',
      tone: (stressRatio <= 1.0 ? 'ok' : 'bad') as 'ok' | 'warn' | 'bad',
    },
  ];

  return {
    ok: true,
    result: {
      formula: 'σt = Pi·(K2+1)/(K2−1) · σz = Pi/(K2−1)(闭口)',
      formulaAlt: `σv = √(0.5·Σ(σi−σj)2) · Pb = (2·Sy/√3)·(2−Sy/Su)·ln(K) · MAWP = min(Py/Sfy, Pb/Sfb)`,
      steps,
      results,
      note: [
        isThickWalled ? '属于厚壁圆筒 (K>1.2)，必须采用 Lamé 理论计算应力分布。' : '属于薄壁圆筒 (K≤1.2)，可简化为均匀应力分布。',
        ec === 'CLOSED' ? '闭口端轴向应力已计入 von Mises 等效应力与屈服压力。' : '开口端 σz=0(或仅外部轴向力),若实际为闭口容器请切换端部条件,否则结果偏保守。',
      ].join(''),
      disclaimer: true,
    },
  };
}

export function lameCylinderCopyText(input: LameCylinderInput, digits = 2): string {
  const fmt = (n: number) => fmtNum(n, digits);
  const o = calcLameCylinder(input, { digits });
  if (!o.result) return '';
  const r = o.result;
  return [
    '【厚壁圆筒拉美应力与爆破压力】',
    `内压 Pi = ${fmt(input.internalPressureBar)} bar`,
    `内径 Di = ${fmt(input.innerDiameterMm)} mm, 外径 Do = ${fmt(input.outerDiameterMm)} mm`,
    `端部条件: ${input.endCondition === 'OPEN' ? '开口圆筒' : '闭口圆筒'}`,
    `屈服强度 Sy = ${fmt(input.yieldStrengthMpa)} MPa, 抗拉强度 Su = ${fmt(input.tensileStrengthMpa)} MPa`,
    '',
    `公式: ${r.formula}`,
    '',
    ...r.steps.map((s, i) => `${i + 1}. ${s}`),
    '',
    ...r.results.map((x) => `${x.label}: ${x.value}${x.unit ? ' ' + x.unit : ''}`),
  ].join('\n');
}
