// 液压泵与电机功率匹配计算
//   理论泵排量 Vg = (Q × 1000) / (n × ηv)      mL/rev
//   理论液压功率 Phyd = (p × Q) / 600          kW(p: bar, Q: L/min)
//   泵轴功率 Pshaft = Phyd / ηt
//   驱动扭矩 T = 9550 × Pshaft / n
//   电机功率 Pmotor = Pshaft × km,圆整到标准功率等级
//   管径 d = 4.61 × √(Q/v):吸油流速 ≤ 1.0 m/s,高压流速 ≤ 4.5 m/s
import type { CalcOption, CalcOutcome } from '../types';
import { fmtNum } from '../lib/format';

export interface HydraulicPumpMotorInput {
  pressure: number | null;   // 最高工作压力 p, bar
  flow: number | null;       // 流量 Q, L/min
  rpm: number | null;        // 泵转速 n, rpm
  etaV: number | null;       // 容积效率 ηv
  etaT: number | null;       // 总效率 ηt
  km: number | null;         // 电机功率裕量系数
  // —— NPSH 吸入校核(可选,填写后启用)——
  suctionLiftM?: number | null;      // 吸油高度 Hs, m(泵高于油面为正)
  suctionLossBar?: number | null;    // 吸油管路总压损 Δp_s, bar(可用「管路压力损失」工具算)
  oilVaporBar?: number | null;       // 油液饱和蒸气压 Pv, bar(40℃ 矿物油约 0.0001,常可忽略填 0)
  tankPressureBar?: number | null;   // 油箱液面压力 P0, bar(开式箱 1.013,闭式增压箱填实际值)
  npshRequiredM?: number | null;     // 泵必需汽蚀余量 NPSHr, m(泵样本值,齿轮泵约 0.5~1,叶片泵约 1~2)
}

export const HYDRAULIC_PUMP_MOTOR_DEFAULTS: HydraulicPumpMotorInput = {
  pressure: 210,
  flow: 40,
  rpm: 1450,
  etaV: 0.95,
  etaT: 0.88,
  km: 1.15,
  suctionLiftM: null,
  suctionLossBar: null,
  oilVaporBar: null,
  tankPressureBar: null,
  npshRequiredM: null,
};

/** 标准交流异步电机功率等级(kW) */
const STANDARD_MOTORS_KW = [
  0.75, 1.1, 1.5, 2.2, 3, 4, 5.5, 7.5, 11, 15, 18.5, 22, 30, 37, 45, 55, 75, 90, 110,
];

export function calcHydraulicPumpMotor(input: HydraulicPumpMotorInput, opt: CalcOption = { digits: 2 }): CalcOutcome {
  const { pressure: p, flow: Q, rpm: n, etaV = 0.95, etaT = 0.88, km = 1.15,
    suctionLiftM, suctionLossBar, oilVaporBar, tankPressureBar, npshRequiredM } = input;
  const fe: Record<string, string> = {};

  if (p == null || Number.isNaN(p)) fe.pressure = '请输入工作压力';
  else if (p <= 0) fe.pressure = '压力必须大于 0';
  if (Q == null || Number.isNaN(Q)) fe.flow = '请输入流量';
  else if (Q <= 0) fe.flow = '流量必须大于 0';
  if (n == null || Number.isNaN(n)) fe.rpm = '请输入泵转速';
  else if (n <= 0) fe.rpm = '转速必须大于 0';
  if (etaV != null && (Number.isNaN(etaV) || etaV <= 0 || etaV > 1)) fe.etaV = '容积效率应在 0~1 之间';
  if (etaT != null && (Number.isNaN(etaT) || etaT <= 0 || etaT > 1)) fe.etaT = '总效率应在 0~1 之间';
  if (km != null && (Number.isNaN(km) || km <= 0)) fe.km = '裕量系数必须大于 0';

  if (Object.keys(fe).length) return { ok: false, fieldErrors: fe };

  const P = p as number;
  const Qv = Q as number;
  const nv = n as number;
  const ev = etaV ?? 0.95;
  const et = etaT ?? 0.88;
  const kv = km ?? 1.15;

  const fmt = (x: number) => fmtNum(x, opt.digits);

  const Vg = (Qv * 1000) / (nv * ev);
  const Phyd = (P * Qv) / 600;
  const Pshaft = Phyd / et;
  const T = (9550 * Pshaft) / nv;
  const Pmotor = Pshaft * kv;
  const standardMotorKw = STANDARD_MOTORS_KW.find((kw) => kw >= Pmotor) ?? Pmotor;
  const dSuction = 4.61 * Math.sqrt(Qv / 1.0);
  const dPressure = 4.61 * Math.sqrt(Qv / 4.5);

  // —— NPSH 汽蚀余量校核(可选)——
  // NPSHa = (P0 − Pv)/ρg + v0 − Hs − Δp_s/(ρg)
  // ρg ≈ 0.9 kg/L → 1 bar ≈ 11.1 m 油柱(矿物油 ρ≈900)
  let npshOut: null | { npshaM: number; npshrM: number; marginM: number; pass: boolean } = null;
  const npshEnabled = suctionLiftM != null || suctionLossBar != null || npshRequiredM != null;
  if (npshEnabled) {
    const barToM = 1e5 / (0.9 * 1000 * 9.81); // 1 bar 油柱 ≈ 11.33 m(ρ=900 kg/m³)
    const p0 = tankPressureBar ?? 1.013;
    const pv = oilVaporBar ?? 0.001;
    const dps = suctionLossBar ?? 0;
    const hs = suctionLiftM ?? 0;
    const npshr = npshRequiredM ?? 0;
    const npshaM = (p0 - pv) * barToM - hs - dps * barToM;
    const marginM = npshaM - npshr;
    npshOut = { npshaM, npshrM: npshr, marginM, pass: marginM > 0.3 }; // 安全裕量建议 ≥0.3 m
  }

  const steps = [
    `理论泵排量 Vg = (Q × 1000) / (n × ηv) = (${fmt(Qv)} × 1000) / (${fmt(nv)} × ${fmt(ev)}) = ${fmt(Vg)} mL/rev`,
    `理论液压功率 Phyd = (p × Q) / 600 = (${fmt(P)} × ${fmt(Qv)}) / 600 = ${fmt(Phyd)} kW`,
    `泵轴所需驱动功率 Pshaft = Phyd / ηt = ${fmt(Phyd)} / ${fmt(et)} = ${fmt(Pshaft)} kW`,
    `泵轴驱动扭矩 T = 9550 × Pshaft / n = (9550 × ${fmt(Pshaft)}) / ${fmt(nv)} = ${fmt(T)} N·m`,
    `考虑安全裕量 (×${fmt(kv)}),所需电机功率 Pmotor = ${fmt(Pshaft)} × ${fmt(kv)} = ${fmt(Pmotor)} kW`,
    `推荐选用标准交流异步电机额定功率: ${fmt(standardMotorKw)} kW`,
    `推荐吸油管通径 d ≥ ${fmt(dSuction)} mm (流速 ≤ 1.0 m/s)`,
    `推荐高压油管通径 d ≥ ${fmt(dPressure)} mm (流速 ≤ 4.5 m/s)`,
    ...(npshOut ? [
      `NPSHa(有效汽蚀余量) = (P0 − Pv)/ρg − Hs − Δp_s/ρg = ${fmt(npshOut.npshaM)} m`,
      `NPSHr(必需汽蚀余量,泵样本) = ${fmt(npshOut.npshrM)} m`,
      `汽蚀裕量 = NPSHa − NPSHr = ${fmt(npshOut.marginM)} m ${npshOut.pass ? '≥ 0.3 m ✓ 无气蚀风险' : '< 0.3 m ✗ 有气蚀风险:降低吸高/加大吸油管/缩短吸油段'}`,
    ] : []),
  ];

  return {
    ok: true,
    result: {
      formula: 'Vg = Q×1000/(n·ηv) · Phyd = p·Q/600 · Pshaft = Phyd/ηt',
      formulaAlt: 'P [bar], Q [L/min], n [rpm];T = 9550·P/n 为扭矩与功率、转速的换算',
      steps,
      results: [
        { label: '理论泵排量 Vg', value: fmt(Vg), unit: 'mL/rev' },
        { label: '理论液压功率 Phyd', value: fmt(Phyd), unit: 'kW' },
        { label: '泵轴功率 Pshaft', value: fmt(Pshaft), unit: 'kW' },
        { label: '驱动扭矩 T', value: fmt(T), unit: 'N·m' },
        { label: '所需电机功率 Pmotor', value: fmt(Pmotor), unit: 'kW' },
        { label: '推荐电机功率', value: fmt(standardMotorKw), unit: 'kW', primary: true },
        { label: '吸油管通径 d≥', value: fmt(dSuction), unit: 'mm' },
        { label: '高压油管通径 d≥', value: fmt(dPressure), unit: 'mm' },
        ...(npshOut ? [
          { label: '有效汽蚀余量 NPSHa', value: fmt(npshOut.npshaM), unit: 'm' },
          { label: '汽蚀裕量(NPSHa−NPSHr)', value: fmt(npshOut.marginM), unit: 'm', tone: (npshOut.pass ? 'ok' : 'bad') as 'ok' | 'bad' },
        ] : []),
      ],
      note: `排量为几何排量,选型时应留有一定裕量;电机需校核启动扭矩与过载能力。${npshOut ? 'NPSH 校核按油箱液面压力 − 饱和蒸气压 − 吸高 − 吸油压损估算,安全裕量建议 ≥ 0.3 m;' : '填写吸油高度/压损后可启用 NPSH 汽蚀校核;'}以上为初步计算,应按 GB/T 7935 等标准选取。`,
      disclaimer: true,
    },
  };
}

/** 生成可复制的结果文本 */
export function hydraulicPumpMotorCopyText(input: HydraulicPumpMotorInput, digits = 2): string {
  const fmt = (n: number) => fmtNum(n, digits);
  const o = calcHydraulicPumpMotor(input, { digits });
  if (!o.result) return '';
  const r = o.result;
  return [
    '【液压泵与电机匹配计算】',
    `工作压力 p = ${fmt(input.pressure ?? 0)} bar`,
    `流量 Q = ${fmt(input.flow ?? 0)} L/min`,
    `泵转速 n = ${fmt(input.rpm ?? 0)} rpm`,
    `容积效率 ηv = ${fmt(input.etaV ?? 0.95)}`,
    `总效率 ηt = ${fmt(input.etaT ?? 0.88)}`,
    '',
    `公式: ${r.formula}`,
    '',
    ...r.steps.map((s, i) => `${i + 1}. ${s}`),
    '',
    ...r.results.map((x) => `${x.label}: ${x.value}${x.unit ? ' ' + x.unit : ''}`),
  ].join('\n');
}
