// 管路压力损失计算(达西-魏斯巴赫公式)
//   沿程损失: Δpf = λ·(L/d)·(ρ·v²/2)
//   局部损失: Δpm = Σζ·(ρ·v²/2)
//   流速:     v = Q / A ,A = (π/4)d²
//   雷诺数:   Re = v·d/ν (d、ν 同单位制)
//   摩阻系数 λ:
//     层流 Re<2300 → λ = 64/Re
//     湍流 → Swamee-Jain 显式式 λ = 0.25/[lg(ε/(3.7d)+5.74/Re^0.9)]²
// 单位:Q [L/min], d [mm], L [m], ρ [kg/m³], ν [mm²/s = cSt], Δp [bar]
import type { CalcOption, CalcOutcome } from '../types';
import { fmtNum } from '../lib/format';

export type PipeLineType = 'SUCTION' | 'PRESSURE' | 'RETURN';

export const PIPE_LINE_LABELS: Record<PipeLineType, string> = {
  SUCTION: '吸油管路',
  PRESSURE: '压力管路',
  RETURN: '回油管路',
};

export interface PipeLossInput {
  flowRateLMin: number;        // 体积流量 Q, L/min
  innerDiaMm: number;          // 管道内径 d, mm
  lengthM?: number;            // 管长 L, m(默认 5;只算局部损失可填 0)
  densityKgM3?: number;        // 油液密度 ρ, kg/m³(默认 900,矿物油典型值)
  kinViscCst?: number;         // 运动粘度 ν, mm²/s(默认 46,VG46@40℃)
  roughnessMm?: number;        // 绝对粗糙度 ε, mm(默认 0.0015 冷拔无缝钢管)
  localK?: number;             // 局部阻力系数之和 Σζ(默认 2)
  lineType?: PipeLineType;     // 管路类型(用于流速推荐判定,默认压力管路)
}

export const PIPE_LOSS_DEFAULTS: Required<PipeLossInput> = {
  flowRateLMin: 30,
  innerDiaMm: 12,
  lengthM: 5,
  densityKgM3: 900,
  kinViscCst: 46,
  roughnessMm: 0.0015,
  localK: 2,
  lineType: 'PRESSURE',
};

/** 各类管路的推荐流速上限(m/s):ok 上限 / warn 上限 */
export const VELOCITY_LIMITS: Record<PipeLineType, { okMax: number; warnMax: number; range: string }> = {
  SUCTION: { okMax: 1.5, warnMax: 2.5, range: '推荐 0.5~1.5 m/s(过高易气蚀)' },
  PRESSURE: { okMax: 6, warnMax: 8, range: '推荐 3~6 m/s(高压短管可取大值)' },
  RETURN: { okMax: 4, warnMax: 6, range: '推荐 2~4 m/s' },
};

export function calcPipeLoss(input: PipeLossInput, opt: CalcOption = { digits: 2 }): CalcOutcome {
  const {
    flowRateLMin: Q,
    innerDiaMm: d,
    lengthM: L = PIPE_LOSS_DEFAULTS.lengthM,
    densityKgM3: rho = PIPE_LOSS_DEFAULTS.densityKgM3,
    kinViscCst: nu = PIPE_LOSS_DEFAULTS.kinViscCst,
    roughnessMm: eps = PIPE_LOSS_DEFAULTS.roughnessMm,
    localK: kSum = PIPE_LOSS_DEFAULTS.localK,
    lineType = 'PRESSURE',
  } = input;

  const fe: Record<string, string> = {};
  if (Q == null || Number.isNaN(Q)) fe.flowRateLMin = '请输入流量';
  else if (Q <= 0) fe.flowRateLMin = '流量必须大于 0';
  if (d == null || Number.isNaN(d)) fe.innerDiaMm = '请输入管道内径';
  else if (d <= 0) fe.innerDiaMm = '内径必须大于 0';
  if (L != null && (Number.isNaN(L) || L < 0)) fe.lengthM = '管长不能为负';
  if (rho != null && (Number.isNaN(rho) || rho < 500 || rho > 1500)) fe.densityKgM3 = '密度应在 500~1500 kg/m³';
  if (nu == null || Number.isNaN(nu)) fe.kinViscCst = '请输入运动粘度';
  else if (nu <= 0) fe.kinViscCst = '粘度必须大于 0';
  if (eps != null && (Number.isNaN(eps) || eps < 0)) fe.roughnessMm = '粗糙度不能为负';
  if (kSum != null && (Number.isNaN(kSum) || kSum < 0)) fe.localK = '局部阻力系数不能为负';

  if (Object.keys(fe).length) return { ok: false, fieldErrors: fe };

  const fmt = (n: number) => fmtNum(n, opt.digits);
  const steps: string[] = [];

  // 几何与流速(统一 SI:m、s)
  const areaM2 = (Math.PI / 4) * Math.pow(d / 1000, 2);          // m²
  const qM3s = Q / 60000;                                        // L/min → m³/s
  const v = qM3s / areaM2;                                       // m/s
  steps.push(`流通面积 A = (π/4)·d² = (π/4)×${fmt(d)}² mm² = ${fmt(areaM2 * 1e6)} mm²`);
  steps.push(`平均流速 v = Q/A = ${fmt(Q)} L/min ÷ ${fmt(areaM2 * 1e6)} mm² = ${fmt(v)} m/s`);

  // 雷诺数与流态
  const re = (1000 * v * d) / nu;
  const regime: '层流' | '湍流' | '过渡区' = re < 2300 ? '层流' : re < 4000 ? '过渡区' : '湍流';
  steps.push(`雷诺数 Re = v·d/ν = ${fmt(v)} × ${fmt(d / 1000)} / ${fmt(nu * 1e-6)} = ${fmt(re)} → ${regime}`);

  // 摩阻系数 λ
  let lambda: number;
  if (re < 2300) {
    lambda = 64 / re;
    steps.push(`层流摩阻系数 λ = 64/Re = 64/${fmt(re)} = ${fmt(lambda)}`);
  } else {
    lambda = 0.25 / Math.pow(Math.log10(eps / (3.7 * d) + 5.74 / Math.pow(re, 0.9)), 2);
    steps.push(`Swamee-Jain 公式 λ = 0.25/[lg(ε/(3.7d)+5.74/Re^0.9)]² = ${fmt(lambda)}${re < 4000 ? '(过渡区按此式估算,结果偏保守)' : ''}`);
  }

  // 压力损失(Pa → bar)
  const dynP = (rho * v * v) / 2;                                 // 动压 ρv²/2, Pa
  const dpFriction = lambda * ((L * 1000) / d) * dynP;            // Pa
  const dpLocal = kSum * dynP;                                    // Pa
  const dpTotal = dpFriction + dpLocal;
  if (L > 0) {
    steps.push(`沿程损失 Δpf = λ·(L/d)·ρv²/2 = ${fmt(lambda)} × ${fmt((L * 1000) / d)} × ${fmt(dynP)} = ${fmt(dpFriction / 1e5)} bar`);
  }
  if (kSum > 0) {
    steps.push(`局部损失 Δpm = Σζ·ρv²/2 = ${fmt(kSum)} × ${fmt(dynP)} = ${fmt(dpLocal / 1e5)} bar`);
  }
  steps.push(`总压力损失 Δp = ${fmt(dpFriction / 1e5)} + ${fmt(dpLocal / 1e5)} = ${fmt(dpTotal / 1e5)} bar`);

  // 流速校核(按管路类型)
  const lim = VELOCITY_LIMITS[lineType];
  const vTone: 'ok' | 'warn' | 'bad' = v <= lim.okMax ? 'ok' : v <= lim.warnMax ? 'warn' : 'bad';

  // 压降功耗
  const powerKw = (dpTotal * qM3s) / 1000;

  const results = [
    { label: '总压力损失 Δp', value: fmt(dpTotal / 1e5), unit: 'bar', primary: true },
    { label: `流速校核(${PIPE_LINE_LABELS[lineType]})`, value: fmt(v), unit: `m/s · ${lim.range}`, tone: vTone },
    { label: '流态 / 雷诺数', value: `${regime} Re=${fmt(re)}`, unit: '—', tone: re >= 2300 && re < 4000 ? ('warn' as const) : undefined },
    { label: '摩阻系数 λ', value: fmt(lambda), unit: '—' },
    { label: '沿程损失 Δpf', value: fmt(dpFriction / 1e5), unit: 'bar' },
    { label: '局部损失 Δpm', value: fmt(dpLocal / 1e5), unit: 'bar' },
    { label: '压降功率损耗', value: fmt(powerKw), unit: 'kW' },
  ];

  return {
    ok: true,
    result: {
      formula: 'Δp = (λ·L/d + Σζ)·ρv²/2',
      formulaAlt: 'Re = v·d/ν;λ:层流 64/Re,湍流 Swamee-Jain',
      steps,
      results,
      note: [
        `粘度随油温变化剧烈(冷机启动时损失可达数倍),重要场合应按实际油温取 ν。`,
        lineType === 'SUCTION'
          ? '吸油管路压损直接关系泵吸入真空度——若泵入口真空度超过允许值会发生气蚀,应加大管径或缩短管长。'
          : '系统总压降为各段之和,回油背压过高会增大阀类泄漏与发热。',
        '局部阻力系数参考:90°弯头 0.2~0.5、三通 0.9~1.8、接头 0.1~0.3、单向阀 2~4、换向阀 2~5。',
      ].join(' '),
      disclaimer: true,
    },
  };
}

export function pipeLossCopyText(input: PipeLossInput, digits = 2): string {
  const fmt = (n: number) => fmtNum(n, digits);
  const o = calcPipeLoss(input, { digits });
  if (!o.result) return '';
  const r = o.result;
  return [
    '【管路压力损失】',
    `${PIPE_LINE_LABELS[input.lineType ?? 'PRESSURE']} · Q=${fmt(input.flowRateLMin)} L/min · d=${fmt(input.innerDiaMm)} mm · L=${fmt(input.lengthM ?? 5)} m`,
    `ρ=${fmt(input.densityKgM3 ?? 900)} kg/m³ · ν=${fmt(input.kinViscCst ?? 46)} cSt · Σζ=${fmt(input.localK ?? 2)} · ε=${input.roughnessMm ?? 0.0015} mm`,
    '',
    ...r.steps.map((s, i) => `${i + 1}. ${s}`),
    '',
    ...r.results.map((x) => `${x.label}: ${x.value}${x.unit ? ' ' + x.unit : ''}`),
  ].join('\n');
}
