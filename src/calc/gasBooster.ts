// 气动气体增压器选型与充装时间计算
// 失速压力 + 变背压积分充气时间 + 驱动耗气量
import type { CalcOption, CalcOutcome } from '../types';
import { fmtNum } from '../lib/format';

export interface GasBoosterInput {
  vesselVolumeLiter: number;     // 被充容器容积 V (L)
  supplyPressureBar: number;     // 气源供气压力 Pin (bar)
  targetPressureBar: number;     // 目标充装压力 Ptarget (bar)
  driveAirPressureBar: number;   // 驱动空气压力 PL (bar, 通常 6~8 bar)
  boosterRatio: number;          // 增压器增压比 i (如 15, 30, 75)
  displacementCcPerStroke: number; // 单双冲程理论排量 Vdisp (cc/double-stroke)
  maxCyclesPerMin?: number;      // 最大工作冲程频率 (默认 60 cpm)
}

export const GAS_BOOSTER_DEFAULTS: GasBoosterInput = {
  vesselVolumeLiter: 20,
  supplyPressureBar: 30,
  targetPressureBar: 300,
  driveAirPressureBar: 6.0,
  boosterRatio: 60,
  displacementCcPerStroke: 45,
  maxCyclesPerMin: 60,
};

export function calcGasBooster(input: GasBoosterInput, opt: CalcOption = { digits: 2 }): CalcOutcome {
  const {
    vesselVolumeLiter: V,
    supplyPressureBar: Pin,
    targetPressureBar: Ptarget,
    driveAirPressureBar: PL,
    boosterRatio: ratio,
    displacementCcPerStroke: Vdisp,
    maxCyclesPerMin: cpm = 60,
  } = input;

  const fe: Record<string, string> = {};
  if (V <= 0) fe.vesselVolumeLiter = '容积必须大于 0';
  if (Pin <= 0) fe.supplyPressureBar = '供气压力必须大于 0';
  if (Ptarget <= Pin) fe.targetPressureBar = '目标压力必须大于供气压力';
  if (PL <= 0) fe.driveAirPressureBar = '驱动气压必须大于 0';
  if (ratio <= 0) fe.boosterRatio = '增压比必须大于 0';
  if (Vdisp <= 0) fe.displacementCcPerStroke = '排量必须大于 0';

  if (Object.keys(fe).length) return { ok: false, fieldErrors: fe };

  const fmt = (n: number) => fmtNum(n, opt.digits);
  const steps: string[] = [];

  // 1. 失速压力计算
  const stallPressureBar = ratio * PL + Pin;
  const isFeasible = stallPressureBar >= Ptarget;
  steps.push(`增压器最高输出失速压力 Pstall = i × PL + Pin = ${ratio} × ${fmt(PL)} + ${fmt(Pin)} = ${fmt(stallPressureBar)} bar`);

  if (!isFeasible) {
    steps.push(`警告: 失速压力 (${fmt(stallPressureBar)} bar) 低于目标压力 (${fmt(Ptarget)} bar)，无法打到目标压力！`);
  }

  // 2. 气体充气时间微积分积分求解 (50 段离散积分)
  const stepsCount = 50;
  const dP = (Ptarget - Pin) / stepsCount;
  let totalTimeSec = 0;

  for (let stepIdx = 0; stepIdx < stepsCount; stepIdx++) {
    const currentP = Pin + (stepIdx + 0.5) * dP;
    // 随背压升高的容积效率衰减
    const volEfficiency = Math.max(0.1, 1 - (currentP / Math.max(1, stallPressureBar)) * 0.85);
    // 瞬态标态排量 (NL/s)
    const strokeVolumeLiter = (Vdisp / 1000) * volEfficiency;
    const flowNlPerSec = strokeVolumeLiter * (Pin / 1.013) * (cpm / 60);

    // 充入 dP 所需标态气量 (NL)
    const requiredNl = V * (dP / 1.013);
    const dt = requiredNl / Math.max(0.01, flowNlPerSec);
    totalTimeSec += dt;
  }

  const totalTimeMin = totalTimeSec / 60;
  const totalGasChargedNl = V * ((Ptarget - Pin) / 1.013);
  const averageFlowNlPerMin = totalGasChargedNl / Math.max(0.01, totalTimeMin);

  steps.push(`被充容器容积 V = ${fmt(V)} L，充压压差 ΔP = ${fmt(Ptarget - Pin)} bar`);
  steps.push(`总充入高压气体折合标准容积 VN = ${fmt(totalGasChargedNl)} NL`);
  steps.push(`积分计算充装总耗时: ${fmt(totalTimeMin)} 分钟 (${fmt(totalTimeSec)} 秒)`);
  steps.push(`平均高压排气流量 Qavg ≈ ${fmt(averageFlowNlPerMin)} NL/min`);

  // 3. 驱动空气耗气量计算
  const driveVolumePerStrokeL = (Vdisp / 1000) * ratio;
  const totalStrokes = (totalTimeSec * cpm) / 60;
  const totalDriveAirL = totalStrokes * driveVolumePerStrokeL * ((PL + 1.013) / 1.013);
  const driveAirConsumptionNm3 = totalDriveAirL / 1000;

  steps.push(`总工作循环次数 ≈ ${fmt(totalStrokes)} 次`);
  steps.push(`消耗驱动压缩空气总量 ≈ ${fmt(driveAirConsumptionNm3)} Nm³ (${fmt(PL)} bar 工业压缩空气)`);

  const results = [
    { label: '充装总耗时', value: fmt(totalTimeMin), unit: 'min', primary: true },
    { label: '理论失速压力 Pstall', value: fmt(stallPressureBar), unit: 'bar' },
    { label: '平均排气流量', value: fmt(averageFlowNlPerMin), unit: 'NL/min' },
    { label: '驱动耗气总量', value: fmt(driveAirConsumptionNm3), unit: 'Nm³' },
  ];

  return {
    ok: true,
    result: {
      formula: 'Pstall = i·PL + Pin · 充气时间 = ∫dP·V/(Q(P)·1.013)',
      formulaAlt: '驱动耗气 = 总行程数 × 驱动缸排量 × (PL+Pa)/Pa',
      steps,
      results,
      note: isFeasible
        ? '增压器选型可行，失速压力高于目标压力。'
        : '增压器无法达到目标压力，需提高驱动气压或增大增压比。',
      disclaimer: true,
    },
  };
}

export function gasBoosterCopyText(input: GasBoosterInput, digits = 2): string {
  const fmt = (n: number) => fmtNum(n, digits);
  const o = calcGasBooster(input, { digits });
  if (!o.result) return '';
  const r = o.result;
  return [
    '【气动气体增压器选型与充装时间】',
    `容器容积 V = ${fmt(input.vesselVolumeLiter)} L`,
    `气源压力 Pin = ${fmt(input.supplyPressureBar)} bar`,
    `目标压力 Ptarget = ${fmt(input.targetPressureBar)} bar`,
    `驱动气压 PL = ${fmt(input.driveAirPressureBar)} bar`,
    `增压比 i = ${fmt(input.boosterRatio)}`,
    `排量 Vdisp = ${fmt(input.displacementCcPerStroke)} cc`,
    '',
    `公式: ${r.formula}`,
    '',
    ...r.steps.map((s, i) => `${i + 1}. ${s}`),
    '',
    ...r.results.map((x) => `${x.label}: ${x.value}${x.unit ? ' ' + x.unit : ''}`),
  ].join('\n');
}
