// 高压孔口临界节流与微泄漏计算
// 临界压力比判定 + 音速/亚音速流量 + 喷射反推力
import type { CalcOption, CalcOutcome } from '../types';
import { fmtNum } from '../lib/format';

export type ChokedFlowGasType = 'NITROGEN' | 'AIR' | 'HYDROGEN' | 'HELIUM';

export interface ChokedFlowInput {
  upstreamPressureBar: number;   // 上游高压压力 P1 (bar)
  upstreamTemperatureC: number;  // 上游气体温度 T1 (°C)
  orificeDiameterMm: number;     // 节流小孔直径 / 泄漏孔径 d0 (mm)
  downstreamPressureBar?: number;// 下游背压 P2 (bar, 默认 1.013 bar)
  dischargeCoefficient?: number; // 流量系数 Cd (锐边孔取 0.62, 喷嘴取 0.90)
  gasType?: ChokedFlowGasType;
}

export const CHOKED_FLOW_DEFAULTS: ChokedFlowInput = {
  upstreamPressureBar: 350,
  upstreamTemperatureC: 20,
  orificeDiameterMm: 0.5,
  downstreamPressureBar: 1.013,
  dischargeCoefficient: 0.62,
  gasType: 'NITROGEN',
};

export function calcChokedFlow(input: ChokedFlowInput, opt: CalcOption = { digits: 2 }): CalcOutcome {
  const {
    upstreamPressureBar: p1Bar,
    upstreamTemperatureC: T1_C,
    orificeDiameterMm: d0,
    downstreamPressureBar: p2Bar = 1.013,
    dischargeCoefficient: Cd = 0.62,
    gasType = 'NITROGEN',
  } = input;

  const fe: Record<string, string> = {};
  if (p1Bar <= 0) fe.upstreamPressureBar = '上游压力必须大于 0';
  if (d0 <= 0) fe.orificeDiameterMm = '孔径必须大于 0';
  if (p2Bar <= 0) fe.downstreamPressureBar = '下游背压必须大于 0';
  if (p1Bar <= p2Bar) fe.upstreamPressureBar = '上游压力必须大于下游压力';

  if (Object.keys(fe).length) return { ok: false, fieldErrors: fe };

  const fmt = (n: number) => fmtNum(n, opt.digits);
  const steps: string[] = [];

  const kMap: Record<string, number> = { NITROGEN: 1.4, AIR: 1.4, HYDROGEN: 1.41, HELIUM: 1.66 };
  const molarMassMap: Record<string, number> = { NITROGEN: 0.028013, AIR: 0.02896, HYDROGEN: 0.002016, HELIUM: 0.004003 };

  const k = kMap[gasType] || 1.4;
  const M = molarMassMap[gasType] || 0.028;
  const R = 8.31446;
  const T1_K = T1_C + 273.15;

  const P1 = p1Bar * 1e5; // Pa
  const P2 = p2Bar * 1e5; // Pa
  const A = (Math.PI / 4) * Math.pow(d0 * 1e-3, 2); // m²

  const gasNames: Record<string, string> = {
    NITROGEN: '氮气', AIR: '空气', HYDROGEN: '氢气', HELIUM: '氦气',
  };

  // 1. 临界压力比判定
  const criticalRatio = Math.pow(2 / (k + 1), k / (k - 1));
  const criticalPressureBar = p1Bar * criticalRatio;
  const isChoked = p2Bar / p1Bar <= criticalRatio;

  steps.push(`介质: ${gasNames[gasType] || gasType}, 比热比 k = ${k}, 上游 P1 = ${fmt(p1Bar)} bar, 下游 P2 = ${fmt(p2Bar)} bar`);
  steps.push(`临界压力比 r_crit = [2/(k+1)]^(k/(k-1)) = ${fmt(criticalRatio)}，临界压力 Pcrit = ${fmt(criticalPressureBar)} bar`);
  steps.push(`流态判定: P2/P1 = ${fmt(p2Bar / p1Bar)} ${isChoked ? '≤ r_crit，处于【音速临界流 Choked Flow】' : '> r_crit，处于【亚音速节流流】'}`);

  // 2. 质量流量计算
  let massFlowKgS = 0;
  if (isChoked) {
    // 临界音速流方程
    const bracket = Math.pow(2 / (k + 1), (k + 1) / (k - 1));
    massFlowKgS = Cd * A * P1 * Math.sqrt((k * M) / (R * T1_K) * bracket);
  } else {
    // 亚音速气动流方程
    const pr = P2 / P1;
    const term = (2 * k) / (k - 1) * (Math.pow(pr, 2 / k) - Math.pow(pr, (k + 1) / k));
    massFlowKgS = Cd * A * P1 * Math.sqrt((M / (R * T1_K)) * term);
  }

  const massFlowKgH = massFlowKgS * 3600;
  const rhoStandard = (1.013e5 * M) / (R * 273.15);
  const flowNm3H = massFlowKgH / rhoStandard;
  const flowNlMin = (flowNm3H * 1000) / 60;

  steps.push(`孔口截面积 A = ${fmt(A * 1e6)} mm² (d0 = ${fmt(d0)} mm, Cd = ${Cd})`);
  steps.push(`瞬时泄出质量流量 qm = ${fmt(massFlowKgS)} kg/s (${fmt(massFlowKgH)} kg/h)`);
  steps.push(`折合标况体积流量 QN = ${fmt(flowNlMin)} NL/min (${fmt(flowNm3H)} Nm³/h)`);

  // 3. 喷射反推力估算
  const soundSpeed = Math.sqrt((k * R * T1_K) / M);
  const jetReactionForceN = massFlowKgS * soundSpeed + (criticalPressureBar * 1e5 - P2) * A;
  steps.push(`气体喷射反作用推力 F_thrust ≈ ${fmt(jetReactionForceN)} N`);

  const results = [
    { label: '标况体积排量 QN', value: fmt(flowNlMin), unit: 'NL/min', primary: true },
    { label: '小时泄漏质量', value: fmt(massFlowKgH), unit: 'kg/h' },
    { label: '喷射反推力 F', value: fmt(jetReactionForceN), unit: 'N' },
    { label: '临界背压 Pcrit', value: fmt(criticalPressureBar), unit: 'bar' },
  ];

  return {
    ok: true,
    result: {
      formula: 'qm = Cd·A·P1·√[(k·M/(R·T1))·(2/(k+1))^((k+1)/(k-1))]',
      formulaAlt: isChoked ? '音速临界流: qm = Cd·A·P1·√[(k·M/(R·T1))·(2/(k+1))^((k+1)/(k-1))]' : '亚音速流: qm = Cd·A·P1·√[(M/(R·T1))·(2k/(k-1))·(P2/P1)^(2/k)·(1-(P2/P1)^((k-1)/k))]',
      steps,
      results,
      note: isChoked ? '达到音速临界排气上限，流量与背压无关。' : '背压较高，流速未达音速。',
      disclaimer: true,
    },
  };
}

export function chokedFlowCopyText(input: ChokedFlowInput, digits = 2): string {
  const fmt = (n: number) => fmtNum(n, digits);
  const o = calcChokedFlow(input, { digits });
  if (!o.result) return '';
  const r = o.result;
  const gasNames: Record<string, string> = {
    NITROGEN: '氮气', AIR: '空气', HYDROGEN: '氢气', HELIUM: '氦气',
  };
  return [
    '【高压孔口临界节流与微泄漏】',
    `上游压力 P1 = ${fmt(input.upstreamPressureBar)} bar`,
    `上游温度 T1 = ${fmt(input.upstreamTemperatureC)} °C`,
    `孔径 d0 = ${fmt(input.orificeDiameterMm)} mm`,
    `下游背压 P2 = ${fmt(input.downstreamPressureBar || 1.013)} bar`,
    `介质: ${gasNames[input.gasType || 'NITROGEN']}`,
    '',
    `公式: ${r.formula}`,
    '',
    ...r.steps.map((s, i) => `${i + 1}. ${s}`),
    '',
    ...r.results.map((x) => `${x.label}: ${x.value}${x.unit ? ' ' + x.unit : ''}`),
  ].join('\n');
}
