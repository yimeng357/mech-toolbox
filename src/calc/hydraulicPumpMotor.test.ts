import { describe, it, expect } from 'vitest';
// 解析格式化数字(去除千分位逗号)
const num = (s: string) => Number(String(s).replace(/[^0-9.eE+-]/g, ''));

import { calcHydraulicPumpMotor, HYDRAULIC_PUMP_MOTOR_DEFAULTS } from './hydraulicPumpMotor';

describe('液压泵与电机匹配计算', () => {
  it('已知参数计算排量/功率/电机等级', () => {
    // p=210bar, Q=40L/min, n=1450rpm, ηv=0.95, ηt=0.88, km=1.15
    const o = calcHydraulicPumpMotor({ pressure: 210, flow: 40, rpm: 1450, etaV: 0.95, etaT: 0.88, km: 1.15 }, { digits: 2 });
    expect(o.ok).toBe(true);
    const r = o.result!;
    // Vg = 40000/(1450*0.95) = 29.04
    expect(num(r.results[0].value)).toBeCloseTo(29.04, 1);
    // Phyd = 210*40/600 = 14
    expect(num(r.results[1].value)).toBeCloseTo(14, 1);
    // Pshaft = 14/0.88 = 15.91
    expect(num(r.results[2].value)).toBeCloseTo(15.91, 1);
    // T = 9550*15.91/1450 = 104.8
    expect(num(r.results[3].value)).toBeCloseTo(104.8, 0);
    // Pmotor = 15.91*1.15 = 18.30 → 标准 18.5 kW(第一个 ≥ 18.3 的等级)
    expect(num(r.results[4].value)).toBeCloseTo(18.3, 1);
    expect(r.results[5].value).toBe('18.5');
    // 吸油管 d = 4.61*√40 = 29.16
    expect(num(r.results[6].value)).toBeCloseTo(29.16, 1);
    // 高压管 d = 4.61*√(40/4.5) = 13.75
    expect(num(r.results[7].value)).toBeCloseTo(13.75, 1);
  });

  it('小功率情形取最小标准电机 0.75 kW', () => {
    const o = calcHydraulicPumpMotor({ pressure: 100, flow: 5, rpm: 1450, etaV: 0.9, etaT: 0.85, km: 1.2 }, { digits: 2 });
    expect(o.ok).toBe(true);
    const r = o.result!;
    // Phyd = 100*5/600 = 0.833; Pshaft = 0.98; Pmotor = 1.176 → 1.5 kW
    expect(num(r.results[5].value)).toBeCloseTo(1.5, 1);
  });

  it('异常输入给出字段级错误', () => {
    expect(calcHydraulicPumpMotor({ pressure: 0, flow: 40, rpm: 1450, etaV: 0.95, etaT: 0.88, km: 1.15 }).fieldErrors?.pressure).toBeTruthy();
    expect(calcHydraulicPumpMotor({ pressure: 210, flow: -1, rpm: 1450, etaV: 0.95, etaT: 0.88, km: 1.15 }).fieldErrors?.flow).toBeTruthy();
    expect(calcHydraulicPumpMotor({ pressure: 210, flow: 40, rpm: 1450, etaV: 1.5, etaT: 0.88, km: 1.15 }).fieldErrors?.etaV).toBeTruthy();
    expect(calcHydraulicPumpMotor({ pressure: 210, flow: 40, rpm: 1450, etaV: 0.95, etaT: 0.88, km: 0 }).ok).toBe(false);
  });

  it('默认参数可计算', () => {
    const o = calcHydraulicPumpMotor(HYDRAULIC_PUMP_MOTOR_DEFAULTS);
    expect(o.ok).toBe(true);
  });
});
