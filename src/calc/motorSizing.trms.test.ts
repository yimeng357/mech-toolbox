// 电机选型 Trms 发热校核测试
import { describe, it, expect } from 'vitest';
import { calcMotorSizing } from './motorSizing';

function num(s: string): number {
  return Number(String(s).replace(/[^0-9.\-eE]/g, ''));
}

const BASE = {
  mechanism: 'BALL_SCREW' as const, mass: 100, speed: 1, accelTime: 0.3,
  leadDia: 20, gearRatio: 1, mu: 0.02, fExt: 0, eta: 0.85, Jm: 10,
};

describe('电机选型·Trms 发热校核', () => {
  it('不填循环时间时不输出 Trms(向后兼容)', () => {
    const o = calcMotorSizing(BASE);
    expect(o.ok).toBe(true);
    const trms = o.result!.results.find((r) => r.label === '有效扭矩 Trms');
    expect(trms).toBeUndefined();
    expect(o.result!.steps.join(' ')).not.toContain('Trms');
  });

  it('连续运转(tc = t_run)时 Trms 介于 TL 与 Tpeak 之间', () => {
    const o = calcMotorSizing({ ...BASE, dutyTime: 2, dutyRunTime: 2 });
    expect(o.ok).toBe(true);
    const tl = num(o.result!.results.find((r) => r.label === '稳态扭矩 TL')!.value);
    const tp = num(o.result!.results.find((r) => r.label === '峰值扭矩 Tpeak')!.value);
    const trms = num(o.result!.results.find((r) => r.label === '有效扭矩 Trms')!.value);
    expect(trms).toBeGreaterThan(tl);
    expect(trms).toBeLessThan(tp);
    // 手工验算:Trms = √[(Tpeak²·ta/3 + TL²·(t_run-ta)) / tc]
    const expected = Math.sqrt((tp ** 2 * 0.3) / 3 / 2 + (tl ** 2 * 1.7) / 2);
    expect(trms).toBeCloseTo(expected, 2);
  });

  it('占空比 50% 时 Trms 显著低于连续运转', () => {
    const cont = calcMotorSizing({ ...BASE, dutyTime: 2, dutyRunTime: 2 });
    const half = calcMotorSizing({ ...BASE, dutyTime: 4, dutyRunTime: 2 });
    const c = num(cont.result!.results.find((r) => r.label === '有效扭矩 Trms')!.value);
    const h = num(half.result!.results.find((r) => r.label === '有效扭矩 Trms')!.value);
    expect(h).toBeLessThan(c);
    expect(h).toBeCloseTo(c / Math.SQRT2, 1); // 纯运行段占空比减半 → RMS 降为 1/√2
  });

  it('运动时间超过循环时间返回字段错误', () => {
    const o = calcMotorSizing({ ...BASE, dutyTime: 1, dutyRunTime: 2 });
    expect(o.ok).toBe(false);
    if (o.ok) return;
    expect(o.fieldErrors?.dutyRunTime).toBeDefined();
  });
});
