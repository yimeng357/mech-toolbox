import { describe, it, expect } from 'vitest';
// 解析格式化数字(去除千分位逗号)
const num = (s: string) => Number(String(s).replace(/[^0-9.eE+-]/g, ''));

import { calcMotorSizing, MOTOR_SIZING_DEFAULTS } from './motorSizing';

describe('电机选型与惯量匹配计算', () => {
  it('滚珠丝杠:惯量折算/峰值扭矩/惯量比', () => {
    // m=100kg, v=1m/s, ta=0.3s, Pb=20mm, i=1, μ=0.02, η=0.85, Jm=10 kg·cm²
    const o = calcMotorSizing({ mechanism: 'BALL_SCREW', mass: 100, speed: 1, accelTime: 0.3, leadDia: 20, gearRatio: 1, mu: 0.02, fExt: 0, eta: 0.85, Jm: 10 }, { digits: 2 });
    expect(o.ok).toBe(true);
    const r = o.result!;
    // JL = 100*(0.02/2π)²*10000 = 10.13
    expect(num(r.results[0].value)).toBeCloseTo(10.13, 1);
    // 惯量比 = 10.13/10 = 1.01 → 优
    expect(num(r.results[1].value)).toBeCloseTo(1.01, 1);
    // 电机转速 = (1/0.02)*60 = 3000 rpm
    expect(num(r.results[2].value)).toBeCloseTo(3000, 0);
    // 稳态扭矩 TL = 19.62*0.02/(2π*0.85) = 0.0735
    expect(num(r.results[3].value)).toBeCloseTo(0.073, 1);
    // 峰值扭矩 ≈ 0.0735 + 2.108 = 2.18
    expect(num(r.results[5].value)).toBeCloseTo(2.18, 1);
    // 稳态功率 ≈ 23 W, 推荐 100 W
    expect(r.results[7].value).toBe('100');
  });

  it('同步带机构:惯量按 m·r² 折算', () => {
    // m=50kg, v=1.5m/s, ta=0.5s, d=100mm, i=2
    const o = calcMotorSizing({ mechanism: 'TIMING_BELT', mass: 50, speed: 1.5, accelTime: 0.5, leadDia: 100, gearRatio: 2, mu: 0.02, fExt: 0, eta: 0.9, Jm: 5 }, { digits: 2 });
    expect(o.ok).toBe(true);
    const r = o.result!;
    // r=50mm=0.05m; JL = 50*0.05²*10000/4 = 312.5 kg·cm²
    expect(num(r.results[0].value)).toBeCloseTo(312.5, 0);
    // 电机转速 = (1.5/(π*0.1))*60*2 = 572.96 rpm
    expect(num(r.results[2].value)).toBeCloseTo(573, 0);
  });

  it('回转工作台:质量按台面惯量 kg·cm² 输入', () => {
    // J=80 kg·cm², v=300 rpm, i=10
    const o = calcMotorSizing({ mechanism: 'ROTARY_TABLE', mass: 80, speed: 300, accelTime: 1, leadDia: 300, gearRatio: 10, mu: 0, fExt: 0, eta: 0.9, Jm: 8 }, { digits: 2 });
    expect(o.ok).toBe(true);
    const r = o.result!;
    // JL = 80/100 = 0.8
    expect(num(r.results[0].value)).toBeCloseTo(0.8, 1);
    // 电机转速 = 300*10 = 3000
    expect(num(r.results[2].value)).toBeCloseTo(3000, 0);
  });

  it('惯量比评价分级', () => {
    const high = calcMotorSizing({ mechanism: 'BALL_SCREW', mass: 1000, speed: 1, accelTime: 0.3, leadDia: 20, gearRatio: 1, mu: 0.02, fExt: 0, eta: 0.85, Jm: 5 }, { digits: 2 });
    // JL = 101.3, 比 5 → 20.3 > 20 → 差
    expect(num(high.result!.results[1].value)).toBeGreaterThan(20);
    expect(high.result!.results[8].value).toContain('差');
  });

  it('异常输入给出字段级错误', () => {
    expect(calcMotorSizing({ mechanism: 'BALL_SCREW', mass: 0, speed: 1, accelTime: 0.3, leadDia: 20, gearRatio: 1, mu: 0.02, fExt: 0, eta: 0.85, Jm: 10 }).fieldErrors?.mass).toBeTruthy();
    expect(calcMotorSizing({ mechanism: 'BALL_SCREW', mass: 100, speed: 1, accelTime: 0.3, leadDia: 20, gearRatio: 0.5, mu: 0.02, fExt: 0, eta: 0.85, Jm: 10 }).fieldErrors?.gearRatio).toBeTruthy();
    expect(calcMotorSizing({ mechanism: 'BALL_SCREW', mass: 100, speed: 1, accelTime: 0, leadDia: 20, gearRatio: 1, mu: 0.02, fExt: 0, eta: 0.85, Jm: 10 }).fieldErrors?.accelTime).toBeTruthy();
  });

  it('默认参数可计算', () => {
    const o = calcMotorSizing(MOTOR_SIZING_DEFAULTS);
    expect(o.ok).toBe(true);
  });
});
