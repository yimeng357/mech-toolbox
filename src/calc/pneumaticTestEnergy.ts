// 气压试验爆破能量与安全防护距离计算
// ASME PCC-2 Article 501 绝热膨胀能量 + TNT 当量 + 安全距离
import type { CalcOption, CalcOutcome } from '../types';
import { fmtNum } from '../lib/format';

export type PneumaticGasType = 'NITROGEN' | 'AIR' | 'HELIUM' | 'HYDROGEN';

export interface PneumaticTestEnergyInput {
  testVolumeLiter: number;      // 试压系统内部总容积 V (L)
  testPressureBar: number;      // 气压试验压力 P (bar)
  gasType?: PneumaticGasType;   // 气体类型
  ambientPressureBar?: number;  // 大气压 (默认 1.013 bar)
}

export const PNEUMATIC_TEST_DEFAULTS: PneumaticTestEnergyInput = {
  testVolumeLiter: 50,
  testPressureBar: 350,
  gasType: 'NITROGEN',
  ambientPressureBar: 1.013,
};

export function calcPneumaticTestEnergy(input: PneumaticTestEnergyInput, opt: CalcOption = { digits: 2 }): CalcOutcome {
  const {
    testVolumeLiter: V,
    testPressureBar: pBar,
    gasType = 'NITROGEN',
    ambientPressureBar: pAmbBar = 1.013,
  } = input;

  const fe: Record<string, string> = {};
  if (V <= 0) fe.testVolumeLiter = '试压容积必须大于 0';
  if (pBar <= 0) fe.testPressureBar = '试验压力必须大于 0';

  if (Object.keys(fe).length) return { ok: false, fieldErrors: fe };

  const fmt = (n: number) => fmtNum(n, opt.digits);
  const steps: string[] = [];

  // 比热比 k = Cp / Cv
  const kMap: Record<string, number> = {
    NITROGEN: 1.4,
    AIR: 1.4,
    HELIUM: 1.66,
    HYDROGEN: 1.41,
  };
  const k = kMap[gasType] || 1.4;

  const P1_Pa = (pBar + pAmbBar) * 1e5; // 绝对压力 Pa
  const Pa_Pa = pAmbBar * 1e5;
  const VM3 = V * 1e-3;

  const gasNames: Record<string, string> = {
    NITROGEN: '氮气',
    AIR: '压缩空气',
    HELIUM: '氦气',
    HYDROGEN: '氢气',
  };

  steps.push(`试验介质: ${gasNames[gasType] || gasType} (绝热比热比 k = ${k})`);
  steps.push(`试验绝对压力 P1 = ${fmt(P1_Pa / 1e5)} bar(a), 容积 V = ${fmt(V)} L (${fmt(VM3)} m³)`);

  // ASME PCC-2 Article 501 绝热膨胀能量公式 (Brode 方程)
  const exponent = (k - 1) / k;
  const pressureRatio = Pa_Pa / P1_Pa;
  const storedEnergyJoules = ((P1_Pa * VM3) / (k - 1)) * (1 - Math.pow(pressureRatio, exponent));
  const storedEnergyKj = storedEnergyJoules / 1000;

  steps.push(`Brode 绝热膨胀储能公式计算: E = [P1·V / (k-1)] × [1 - (Pa/P1)^((k-1)/k)]`);
  steps.push(`计算得出高压气体总膨胀储能 E = ${fmt(storedEnergyKj)} kJ (${fmt(storedEnergyJoules)} J)`);

  // 折算 TNT 当量 (1 kg TNT = 4.6 × 10^6 J)
  const tntEquivalentKg = storedEnergyJoules / 4.6e6;
  steps.push(`TNT 爆炸当量折算 (1 kg TNT = 4.6 MJ): MTNT = ${fmt(tntEquivalentKg)} kg TNT (${fmt(tntEquivalentKg * 1000)} 克 TNT)`);

  // ASME PCC-2 Table 501-1 安全人员隔离距离
  const scaledFactorPersonnel = 24.0;
  const scaledFactorBuilding = 10.0;
  const safeDistancePersonnelM = Math.max(3.0, scaledFactorPersonnel * Math.pow(2 * tntEquivalentKg, 1 / 3));
  const safeDistanceBuildingM = Math.max(2.0, scaledFactorBuilding * Math.pow(2 * tntEquivalentKg, 1 / 3));

  steps.push(`根据 ASME PCC-2 规范计算安全防护边界:`);
  steps.push(`人员无防护安全隔离距离 R_personnel ≥ ${fmt(safeDistancePersonnelM)} 米`);
  steps.push(`轻质设备/建筑安全距离 R_building ≥ ${fmt(safeDistanceBuildingM)} 米`);

  const results = [
    { label: '人员安全隔离距离', value: fmt(safeDistancePersonnelM), unit: 'm', primary: true },
    { label: '气体总膨胀能 E', value: fmt(storedEnergyKj), unit: 'kJ' },
    { label: '折合 TNT 当量', value: fmt(tntEquivalentKg * 1000), unit: 'g TNT' },
    { label: '建筑设备防护距离', value: fmt(safeDistanceBuildingM), unit: 'm' },
  ];

  return {
    ok: true,
    result: {
      formula: 'E = [P1·V/(k-1)] × [1-(Pa/P1)^((k-1)/k)]',
      formulaAlt: 'MTNT = E / (4.6×10⁶) · R = λ·MTNT^(1/3)',
      steps,
      results,
      note: `高风险气压试验: 需在半径 ${fmt(safeDistancePersonnelM)}m 内清场隔离。`,
      disclaimer: true,
    },
  };
}

export function pneumaticTestEnergyCopyText(input: PneumaticTestEnergyInput, digits = 2): string {
  const fmt = (n: number) => fmtNum(n, digits);
  const o = calcPneumaticTestEnergy(input, { digits });
  if (!o.result) return '';
  const r = o.result;
  const gasNames: Record<string, string> = {
    NITROGEN: '氮气', AIR: '压缩空气', HELIUM: '氦气', HYDROGEN: '氢气',
  };
  return [
    '【气压试验爆破储能与安全距离】',
    `试压容积 V = ${fmt(input.testVolumeLiter)} L`,
    `试验压力 P = ${fmt(input.testPressureBar)} bar`,
    `试验介质: ${gasNames[input.gasType || 'NITROGEN']}`,
    '',
    `公式: ${r.formula}`,
    '',
    ...r.steps.map((s, i) => `${i + 1}. ${s}`),
    '',
    ...r.results.map((x) => `${x.label}: ${x.value}${x.unit ? ' ' + x.unit : ''}`),
  ].join('\n');
}
