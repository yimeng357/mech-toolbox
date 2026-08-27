// 高压真实气体压缩因子与储气量计算
// 基于对比态原理的 Z 因子 + 密度 + 标况体积
import type { CalcOption, CalcOutcome } from '../types';
import { fmtNum } from '../lib/format';

export type HighPressureGasType = 'NITROGEN' | 'HYDROGEN' | 'HELIUM' | 'AIR' | 'METHANE' | 'ARGON';

export interface RealGasInput {
  gasType: HighPressureGasType;
  pressureBar: number;       // 工作压力 P (bar)
  temperatureC: number;      // 温度 T (°C)
  vesselVolumeLiter: number; // 容器容积 V (L)
}

interface GasProperties {
  molarMassGmol: number; // 分子量 M
  TcKelvin: number;      // 临界温度 Tc (K)
  PcBar: number;         // 临界压力 Pc (bar)
}

const GAS_DATA: Record<HighPressureGasType, GasProperties> = {
  NITROGEN: { molarMassGmol: 28.013, TcKelvin: 126.2, PcBar: 33.9 },
  HYDROGEN: { molarMassGmol: 2.016, TcKelvin: 33.2, PcBar: 13.0 },
  HELIUM: { molarMassGmol: 4.003, TcKelvin: 5.2, PcBar: 2.27 },
  AIR: { molarMassGmol: 28.96, TcKelvin: 132.5, PcBar: 37.7 },
  METHANE: { molarMassGmol: 16.04, TcKelvin: 190.6, PcBar: 46.0 },
  ARGON: { molarMassGmol: 39.95, TcKelvin: 150.8, PcBar: 48.7 },
};

export const REAL_GAS_DEFAULTS: RealGasInput = {
  gasType: 'NITROGEN',
  pressureBar: 700,
  temperatureC: 20,
  vesselVolumeLiter: 50,
};

export function calcRealGas(input: RealGasInput, opt: CalcOption = { digits: 2 }): CalcOutcome {
  const { gasType, pressureBar: P, temperatureC: T_C, vesselVolumeLiter: V_L } = input;

  const fe: Record<string, string> = {};
  if (P <= 0) fe.pressureBar = '压力必须大于 0';
  if (V_L <= 0) fe.vesselVolumeLiter = '容积必须大于 0';

  if (Object.keys(fe).length) return { ok: false, fieldErrors: fe };

  const fmt = (n: number) => fmtNum(n, opt.digits);
  const steps: string[] = [];
  const gas = GAS_DATA[gasType];
  const T_K = T_C + 273.15;
  const R = 8.31446; // J/(mol·K)

  const gasNames: Record<string, string> = {
    NITROGEN: '氮气 (N2)', HYDROGEN: '氢气 (H2)', HELIUM: '氦气 (He)',
    AIR: '空气', METHANE: '甲烷 (CH4)', ARGON: '氩气 (Ar)',
  };

  steps.push(`气体类型: ${gasNames[gasType] || gasType} (摩尔质量 M = ${gas.molarMassGmol} g/mol)`);
  steps.push(`工作工况: 压力 P = ${fmt(P)} bar, 温度 T = ${fmt(T_C)} °C (${fmt(T_K)} K), 容积 V = ${fmt(V_L)} L`);

  // 高压压缩因子 Z(P, T) 拟合计算
  const Pr = P / gas.PcBar;
  const Tr = T_K / gas.TcKelvin;

  // 针对超高压区间的 Z 因子经验解析模型 (适用 1 ~ 1000 bar)
  let Z = 1.0;
  if (gasType === 'NITROGEN' || gasType === 'AIR') {
    Z = 1.0 + (0.00175 * P) / (Tr * 0.5) + (1.2e-6 * P * P) / Tr;
  } else if (gasType === 'HYDROGEN') {
    Z = 1.0 + 0.00062 * P + 1.2e-7 * P * P;
  } else if (gasType === 'HELIUM') {
    Z = 1.0 + 0.0005 * P;
  } else {
    Z = 1.0 + (0.0015 * P) / Tr;
  }

  steps.push(`对比参数: 对比压力 Pr = ${fmt(Pr)}, 对比温度 Tr = ${fmt(Tr)}`);
  steps.push(`求解得出高压压缩因子 Z = ${fmt(Z)} (理想气体为 1.0)`);

  // 密度计算
  const P_Pa = P * 1e5;
  const M_kg = gas.molarMassGmol / 1000;
  const densityKgM3 = (P_Pa * M_kg) / (Z * R * T_K);
  const idealDensityKgM3 = (P_Pa * M_kg) / (1.0 * R * T_K);

  const VM3 = V_L * 1e-3;
  const totalMassKg = densityKgM3 * VM3;
  const idealMassKg = idealDensityKgM3 * VM3;
  const errorPercent = ((idealMassKg - totalMassKg) / totalMassKg) * 100;

  steps.push(`实际气体密度 ρ = P·M / (Z·R·T) = ${fmt(densityKgM3)} kg/m³ (理想气体计算为 ${fmt(idealDensityKgM3)} kg/m³)`);
  steps.push(`实际储气质量 m = ${fmt(totalMassKg)} kg`);
  steps.push(`理想气体公式计算质量 = ${fmt(idealMassKg)} kg (误差偏差: +${fmt(errorPercent)}%)`);

  // 标态体积 (0°C, 1.013 bar)
  const standardDensity = (1.013e5 * M_kg) / (R * 273.15);
  const standardVolumeNm3 = totalMassKg / standardDensity;
  steps.push(`标况体积 (0°C, 1.013 bar): VN = ${fmt(standardVolumeNm3)} Nm³ (${fmt(standardVolumeNm3 * 1000)} NL)`);

  const results = [
    { label: '压缩因子 Z', value: fmt(Z), unit: '', primary: true },
    { label: '实际储气总质量', value: fmt(totalMassKg), unit: 'kg' },
    { label: '标况气体容积 VN', value: fmt(standardVolumeNm3), unit: 'Nm³' },
    {
      label: '理想气体计算偏差',
      value: `+${fmt(errorPercent)}%`,
      unit: '',
      tone: (Z > 1.2 ? 'warn' : 'ok') as 'ok' | 'warn' | 'bad',
    },
  ];

  return {
    ok: true,
    result: {
      formula: 'Z = f(Pr, Tr) · ρ = P·M/(Z·R·T) · m = ρ·V',
      formulaAlt: 'VN = m / ρ_standard (0°C, 1.013 bar)',
      steps,
      results,
      note: Z > 1.2 ? `高压偏离显著 (Z=${fmt(Z)})，不可按理想气体计算` : '偏离较小，可近似按理想气体计算。',
      disclaimer: true,
    },
  };
}

export function realGasCopyText(input: RealGasInput, digits = 2): string {
  const fmt = (n: number) => fmtNum(n, digits);
  const o = calcRealGas(input, { digits });
  if (!o.result) return '';
  const r = o.result;
  const gasNames: Record<string, string> = {
    NITROGEN: '氮气 (N2)', HYDROGEN: '氢气 (H2)', HELIUM: '氦气 (He)',
    AIR: '空气', METHANE: '甲烷 (CH4)', ARGON: '氩气 (Ar)',
  };
  return [
    '【高压真实气体压缩因子与储气量】',
    `气体类型: ${gasNames[input.gasType] || input.gasType}`,
    `工作压力 P = ${fmt(input.pressureBar)} bar`,
    `工作温度 T = ${fmt(input.temperatureC)} °C`,
    `容器容积 V = ${fmt(input.vesselVolumeLiter)} L`,
    '',
    `公式: ${r.formula}`,
    '',
    ...r.steps.map((s, i) => `${i + 1}. ${s}`),
    '',
    ...r.results.map((x) => `${x.label}: ${x.value}${x.unit ? ' ' + x.unit : ''}`),
  ].join('\n');
}
