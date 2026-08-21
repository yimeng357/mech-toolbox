import { describe, it, expect } from 'vitest';
// 解析格式化数字(去除千分位逗号)
const num = (s: string) => Number(String(s).replace(/[^0-9.eE+-]/g, ''));

import { calcShaft, roundUpToStandard } from './shaftDiameter';

describe('轴径计算', () => {
  it('T=200 N·m,[τ]=30, S=1.5 → d_min≈37.05,取 38(标准系列)', () => {
    const o = calcShaft({ mode: 'torque', torque: 200, power: null, speed: null, tau: 30, safety: 1.5 }, { digits: 2 });
    expect(o.ok).toBe(true);
    const r = o.result!;
    // [τ]设计 = 20 MPa
    expect(num(r.results[1].value)).toBeCloseTo(20, 2);
    // d = (16*200000/(π*20))^(1/3) = (509295.8...)^(1/3)? 计算:(3200000/62.8319)=50929.6,开立方=37.05
    expect(num(r.results[2].value)).toBeCloseTo(37.05, 0);
    expect(num(r.results[3].value)).toBeCloseTo(38, 0);
  });

  it('功率+转速换算扭矩', () => {
    // P=10kW, n=955rpm → T ≈ 100 N·m
    const o = calcShaft({ mode: 'power', torque: null, power: 10, speed: 955, tau: 40, safety: 1.0 }, { digits: 2 });
    expect(o.ok).toBe(true);
    expect(num(o.result!.results[0].value)).toBeCloseTo(100, 0);
  });

  it('安全系数越小轴径越小', () => {
    const a = calcShaft({ mode: 'torque', torque: 200, power: null, speed: null, tau: 30, safety: 2 });
    const b = calcShaft({ mode: 'torque', torque: 200, power: null, speed: null, tau: 30, safety: 1 });
    const da = num(a.result!.results[2].value);
    const db = num(b.result!.results[2].value);
    expect(da).toBeGreaterThan(db);
  });

  it('标准直径向上取整', () => {
    expect(roundUpToStandard(37.05)).toBe(38);
    expect(roundUpToStandard(20.1)).toBe(22);
    expect(roundUpToStandard(42)).toBe(42);
  });

  it('异常输入给出错误', () => {
    expect(calcShaft({ mode: 'torque', torque: -5, power: null, speed: null, tau: 30, safety: 1.5 }).fieldErrors?.torque).toBeTruthy();
    expect(calcShaft({ mode: 'power', torque: null, power: 0, speed: 100, tau: 30, safety: 1.5 }).fieldErrors?.power).toBeTruthy();
    expect(calcShaft({ mode: 'power', torque: null, power: 10, speed: 0, tau: 30, safety: 1.5 }).fieldErrors?.speed).toBeTruthy();
    expect(calcShaft({ mode: 'torque', torque: 200, power: null, speed: null, tau: 0, safety: 1.5 }).fieldErrors?.tau).toBeTruthy();
    expect(calcShaft({ mode: 'torque', torque: 200, power: null, speed: null, tau: 30, safety: 0.5 }).fieldErrors?.safety).toBeTruthy();
  });
});
