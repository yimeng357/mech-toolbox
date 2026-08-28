// 液压泵 NPSH 汽蚀校核测试
import { describe, it, expect } from 'vitest';
import { calcHydraulicPumpMotor } from './hydraulicPumpMotor';

const BASE = {
  pressure: 210, flow: 40, rpm: 1450,
  etaV: 0.95, etaT: 0.88, km: 1.15,
};

describe('液压泵·NPSH 汽蚀校核', () => {
  it('不填吸入参数时不输出 NPSH(向后兼容)', () => {
    const o = calcHydraulicPumpMotor(BASE);
    expect(o.ok).toBe(true);
    expect(o.result!.results.find((r) => r.label.includes('NPSHa'))).toBeUndefined();
  });

  it('典型工况:开式油箱 + 0.5 m 吸高 + 0.1 bar 压损,NPSHa ≈ 10.8 m', () => {
    const o = calcHydraulicPumpMotor({
      ...BASE,
      suctionLiftM: 0.5, suctionLossBar: 0.1,
      tankPressureBar: 1.013, oilVaporBar: 0.001, npshRequiredM: 1.0,
    });
    expect(o.ok).toBe(true);
    const npsha = Number(o.result!.results.find((r) => r.label === '有效汽蚀余量 NPSHa')!.value.replace(/,/g, ''));
    // (1.013-0.001)×11.35 - 0.5 - 0.1×11.35 ≈ 10.35
    expect(npsha).toBeGreaterThan(9.5);
    expect(npsha).toBeLessThan(11.5);
    const margin = o.result!.results.find((r) => r.label.includes('汽蚀裕量'))!;
    expect(margin.tone).toBe('ok');
  });

  it('高吸高 + 大压损 → 汽蚀裕量报警', () => {
    const o = calcHydraulicPumpMotor({
      ...BASE,
      suctionLiftM: 1.5, suctionLossBar: 0.5,
      tankPressureBar: 1.013, oilVaporBar: 0.001, npshRequiredM: 2.0,
    });
    const margin = o.result!.results.find((r) => r.label.includes('汽蚀裕量'))!;
    // NPSHa = 1.012×11.35 - 1.5 - 0.5×11.35 = 4.83;NPSHr = 2.0 → 裕量 2.83 > 0.3 通过
    // 再加大:吸高 3 m
    const o2 = calcHydraulicPumpMotor({
      ...BASE,
      suctionLiftM: 3, suctionLossBar: 0.8,
      tankPressureBar: 1.013, oilVaporBar: 0.001, npshRequiredM: 2.0,
    });
    const margin2 = o2.result!.results.find((r) => r.label.includes('汽蚀裕量'))!;
    // NPSHa = 1.012×11.35 - 3 - 0.8×11.35 ≈ -0.06 → 必然不通过
    expect(margin2.tone).toBe('bad');
    expect(margin).toBeDefined();
  });

  it('增压油箱改善吸入条件', () => {
    const open = calcHydraulicPumpMotor({ ...BASE, suctionLiftM: 1, suctionLossBar: 0.2, tankPressureBar: 1.013, npshRequiredM: 1.5 });
    const pressurized = calcHydraulicPumpMotor({ ...BASE, suctionLiftM: 1, suctionLossBar: 0.2, tankPressureBar: 2.5, npshRequiredM: 1.5 });
    const m1 = Number(open.result!.results.find((r) => r.label.includes('汽蚀裕量'))!.value.replace(/,/g, ''));
    const m2 = Number(pressurized.result!.results.find((r) => r.label.includes('汽蚀裕量'))!.value.replace(/,/g, ''));
    expect(m2).toBeGreaterThan(m1);
  });
});
