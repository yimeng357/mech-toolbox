// 电机选型与惯量匹配计算
// 负载惯量折算(均折算到电机轴):
//   滚珠丝杠: JL = m·(Pb/2π)² / i²
//   同步带/齿条: JL = m·r² / i²
//   回转工作台: JL = Jtable / i²(输入的质量按台面转动惯量 kg·cm² 理解)
// 稳态扭矩 TL,加速扭矩 Ta = J·α,峰值扭矩 Tpeak = TL + Ta
// 惯量比 JL/Jm 评价: ≤3 优 / ≤10 良 / ≤20 中 / >20 差
// 功率 P = TL × ω,按 1.5 倍裕量圆整到标准伺服电机功率等级
import type { CalcOption, CalcOutcome } from '../types';
import { fmtNum } from '../lib/format';

export type MechanismType = 'BALL_SCREW' | 'TIMING_BELT' | 'ROTARY_TABLE' | 'RACK_PINION';

export interface MotorSizingInput {
  mechanism: MechanismType;
  mass: number | null;        // 移动质量 m, kg(回转台:台面惯量 kg·cm²)
  speed: number | null;       // 最大速度 v, m/s(回转台:最大转速 rpm)
  accelTime: number | null;   // 加速时间 ta, s
  leadDia: number | null;     // 丝杠导程 / 带轮节径 Pb·d, mm(回转台:台面直径 d, mm)
  gearRatio: number | null;   // 减速比 i(≥ 1)
  mu: number | null;          // 摩擦系数 μ
  fExt: number | null;        // 外部阻力 F, N
  eta: number | null;         // 机械效率 η
  Jm: number | null;          // 电机转子惯量 Jm, kg·cm²(可空)
}

export const MOTOR_SIZING_DEFAULTS: MotorSizingInput = {
  mechanism: 'BALL_SCREW',
  mass: 100,
  speed: 1,
  accelTime: 0.3,
  leadDia: 20,
  gearRatio: 1,
  mu: 0.02,
  fExt: 0,
  eta: 0.85,
  Jm: 10,
};

/** 标准伺服电机功率等级(W) */
const STANDARD_SERVO_WATT = [100, 200, 400, 750, 1000, 1500, 2000, 3000, 5000];

export function calcMotorSizing(input: MotorSizingInput, opt: CalcOption = { digits: 2 }): CalcOutcome {
  const {
    mechanism, mass: m, speed: v, accelTime: ta, leadDia: dim,
    gearRatio: i = 1, mu = 0.02, fExt = 0, eta = 0.85, Jm,
  } = input;
  const fe: Record<string, string> = {};

  if (m == null || Number.isNaN(m)) fe.mass = '请输入移动质量';
  else if (m <= 0) fe.mass = '质量必须大于 0';
  if (v == null || Number.isNaN(v)) fe.speed = '请输入最大速度';
  else if (v <= 0) fe.speed = '速度必须大于 0';
  if (ta == null || Number.isNaN(ta)) fe.accelTime = '请输入加速时间';
  else if (ta <= 0) fe.accelTime = '加速时间必须大于 0';
  if (dim == null || Number.isNaN(dim)) fe.leadDia = '请输入导程 / 节径';
  else if (dim <= 0) fe.leadDia = '导程 / 节径必须大于 0';
  if (i != null && (Number.isNaN(i) || i < 1)) fe.gearRatio = '减速比必须 ≥ 1';
  if (mu != null && (Number.isNaN(mu) || mu < 0)) fe.mu = '摩擦系数不能为负';
  if (fExt != null && Number.isNaN(fExt)) fe.fExt = '外部阻力无效';
  if (eta != null && (Number.isNaN(eta) || eta <= 0 || eta > 1)) fe.eta = '机械效率应在 0~1 之间';
  if (Jm != null && (Number.isNaN(Jm) || Jm <= 0)) fe.Jm = '电机惯量必须大于 0';

  if (Object.keys(fe).length) return { ok: false, fieldErrors: fe };

  const mv = m as number;
  const vv = v as number;
  const tav = ta as number;
  const dimv = dim as number;
  const iv = i ?? 1;
  const muV = mu ?? 0.02;
  const fExtV = fExt ?? 0;
  const etaV = eta ?? 0.85;

  const fmt = (n: number) => fmtNum(n, opt.digits);

  let JL = 0;
  let motorSpeedRpm = 0;
  const steps: string[] = [];

  if (mechanism === 'BALL_SCREW') {
    const leadM = dimv / 1000;
    JL = (mv * Math.pow(leadM / (2 * Math.PI), 2) * 10000) / (iv * iv);
    motorSpeedRpm = (vv / leadM) * 60 * iv;
    steps.push(`滚珠丝杠机构: 导程 Pb = ${fmt(dimv)} mm, 折算负载惯量 JL = m·(Pb/2π)² / i² = ${fmt(JL)} kg·cm²`);
  } else if (mechanism === 'TIMING_BELT' || mechanism === 'RACK_PINION') {
    const rM = dimv / 2000;
    JL = (mv * Math.pow(rM, 2) * 10000) / (iv * iv);
    motorSpeedRpm = (vv / (Math.PI * (dimv / 1000))) * 60 * iv;
    steps.push(`${mechanism === 'TIMING_BELT' ? '同步带' : '齿轮齿条'}机构: 节圆半径 r = ${fmt(dimv / 2)} mm, 折算负载惯量 JL = m·r² / i² = ${fmt(JL)} kg·cm²`);
  } else {
    JL = mv / (iv * iv);
    motorSpeedRpm = vv * iv;
    steps.push(`回转工作台机构: 折算负载惯量 JL = Jtable / i² = ${fmt(JL)} kg·cm² (输入质量按台面惯量 kg·cm² 计)`);
  }

  steps.push(`电机最高运行转速 n_motor = ${fmt(motorSpeedRpm)} rpm`);

  const fFriction = muV * mv * 9.81;
  const fTotalLinear = fExtV + fFriction;
  steps.push(`导轨摩擦力 Ff = μ·m·g = ${fmt(muV)} × ${fmt(mv)} × 9.81 = ${fmt(fFriction)} N, 总稳态阻力 F = ${fmt(fTotalLinear)} N`);

  const constantSpeedTorqueNm = mechanism === 'BALL_SCREW'
    ? (fTotalLinear * (dimv / 1000)) / (2 * Math.PI * iv * etaV)
    : (fTotalLinear * (dimv / 2000)) / (iv * etaV);
  steps.push(`电机轴稳态负载扭矩 TL = ${fmt(constantSpeedTorqueNm)} N·m`);

  const omega = (2 * Math.PI * motorSpeedRpm) / 60;
  const JTotalEstimate = Jm ? (JL + Jm) * 1e-4 : JL * 1.5 * 1e-4;
  const accelerationTorqueNm = (JTotalEstimate * omega) / tav;
  const peakTorqueNm = constantSpeedTorqueNm + accelerationTorqueNm;

  steps.push(`加速角加速度 α = ω / ta = ${fmt(omega / tav)} rad/s²`);
  steps.push(`加速动态扭矩 Ta = J·α = ${fmt(accelerationTorqueNm)} N·m`);
  steps.push(`所需峰值启动扭矩 Tpeak = TL + Ta = ${fmt(peakTorqueNm)} N·m`);

  const requiredPowerKw = (constantSpeedTorqueNm * omega) / 1000;
  steps.push(`稳态运转功率 P = TL × ω = ${fmt(requiredPowerKw * 1000)} W`);

  const requiredWattWithMargin = requiredPowerKw * 1000 * 1.5;
  const recommendedMotorPowerW = STANDARD_SERVO_WATT.find((w) => w >= requiredWattWithMargin) ?? STANDARD_SERVO_WATT[STANDARD_SERVO_WATT.length - 1];
  steps.push(`按 1.5 倍裕量圆整,推荐伺服电机功率: ${recommendedMotorPowerW} W`);

  let inertiaRatio: number | undefined;
  let inertiaRating: 'EXCELLENT' | 'GOOD' | 'HIGH' | 'CRITICAL' = 'GOOD';
  if (Jm && Jm > 0) {
    inertiaRatio = JL / Jm;
    if (inertiaRatio <= 3) inertiaRating = 'EXCELLENT';
    else if (inertiaRatio <= 10) inertiaRating = 'GOOD';
    else if (inertiaRatio <= 20) inertiaRating = 'HIGH';
    else inertiaRating = 'CRITICAL';
    steps.push(`惯量比 JL / Jm = ${fmt(inertiaRatio)} (评价: ${inertiaRating})`);
  }

  const results = [
    { label: '负载惯量 JL', value: fmt(JL), unit: 'kg·cm²' },
    ...(inertiaRatio !== undefined
      ? [{ label: '惯量比 JL/Jm', value: fmt(inertiaRatio), unit: '—', tone: (inertiaRatio <= 10 ? 'ok' : inertiaRatio <= 20 ? 'warn' : 'bad') as 'ok' | 'warn' | 'bad' }]
      : []),
    { label: '电机转速 n', value: fmt(motorSpeedRpm), unit: 'rpm' },
    { label: '稳态扭矩 TL', value: fmt(constantSpeedTorqueNm), unit: 'N·m' },
    { label: '加速扭矩 Ta', value: fmt(accelerationTorqueNm), unit: 'N·m' },
    { label: '峰值扭矩 Tpeak', value: fmt(peakTorqueNm), unit: 'N·m', primary: true },
    { label: '稳态功率 P', value: fmt(requiredPowerKw * 1000), unit: 'W' },
    { label: '推荐电机功率', value: fmt(recommendedMotorPowerW), unit: 'W' },
    ...(inertiaRatio !== undefined
      ? [{ label: '惯量匹配评价', value: inertiaRating === 'EXCELLENT' ? '优(≤3)' : inertiaRating === 'GOOD' ? '良(≤10)' : inertiaRating === 'HIGH' ? '中(≤20)' : '差(>20)', tone: (inertiaRatio <= 10 ? 'ok' : inertiaRatio <= 20 ? 'warn' : 'bad') as 'ok' | 'warn' | 'bad' }]
      : []),
  ];

  return {
    ok: true,
    result: {
      formula: 'JL = m·(Pb/2π)²/i² 或 m·r²/i² · Tpeak = TL + J·α',
      formulaAlt: '惯量比 JL/Jm ≤ 10 为宜;功率按 1.5 倍裕量取标准等级',
      steps,
      results,
      note: '回转台模式下「移动质量」按台面转动惯量 (kg·cm²)、「最大速度」按台面转速 (rpm) 输入。以上为初步选型,实际应按伺服电机样本校核峰值扭矩与惯量匹配。',
      disclaimer: true,
    },
  };
}

/** 生成可复制的结果文本 */
export function motorSizingCopyText(input: MotorSizingInput, digits = 2): string {
  const fmt = (n: number) => fmtNum(n, digits);
  const o = calcMotorSizing(input, { digits });
  if (!o.result) return '';
  const r = o.result;
  const mechName =
    input.mechanism === 'BALL_SCREW' ? '滚珠丝杠' : input.mechanism === 'TIMING_BELT' ? '同步带' : input.mechanism === 'RACK_PINION' ? '齿轮齿条' : '回转工作台';
  return [
    '【电机选型与惯量匹配】',
    `机构类型: ${mechName}`,
    `移动质量 m = ${fmt(input.mass ?? 0)} kg`,
    `最大速度 v = ${fmt(input.speed ?? 0)} m/s`,
    `加速时间 ta = ${fmt(input.accelTime ?? 0)} s`,
    `导程 / 节径 = ${fmt(input.leadDia ?? 0)} mm`,
    `减速比 i = ${fmt(input.gearRatio ?? 1)}`,
    `摩擦系数 μ = ${fmt(input.mu ?? 0.02)}`,
    input.fExt ? `外部阻力 F = ${fmt(input.fExt)} N` : '',
    input.Jm ? `电机转子惯量 Jm = ${fmt(input.Jm)} kg·cm²` : '',
    '',
    `公式: ${r.formula}`,
    '',
    ...r.steps.map((s, i) => `${i + 1}. ${s}`),
    '',
    ...r.results.map((x) => `${x.label}: ${x.value}${x.unit ? ' ' + x.unit : ''}`),
  ].join('\n');
}
