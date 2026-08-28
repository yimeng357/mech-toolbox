// 轴径·疲劳安全系数法校核测试
import { describe, it, expect } from 'vitest';
import { calcShaft } from './shaftDiameter';

const BASE = {
  mode: 'torque' as const,
  torque: 200, power: null, speed: null,
  tau: 30, safety: 1.5,
  bendingMoment: 150,
  keywayFactor: 1, hollowRatio: 0,
};

describe('轴径·疲劳安全系数校核', () => {
  it('不启用疲劳校核时无 S 输出(向后兼容)', () => {
    const o = calcShaft(BASE);
    expect(o.ok).toBe(true);
    expect(o.result!.results.find((r) => r.label === '疲劳安全系数 S')).toBeUndefined();
  });

  it('启用但缺 σ-1 时返回字段错误', () => {
    const o = calcShaft({ ...BASE, fatigueCheck: true });
    expect(o.ok).toBe(false);
    if (o.ok) return;
    expect(o.fieldErrors?.sigmaNeg1).toBeDefined();
  });

  it('启用疲劳校核:输出 S 且 45 钢调质(σ-1=258)下大概率通过', () => {
    const o = calcShaft({
      ...BASE, fatigueCheck: true, sigmaNeg1: 258, sigmaBm: 600,
      Ksigma: 1.8, surfaceFactor: 0.9,
    });
    expect(o.ok).toBe(true);
    const s = o.result!.results.find((r) => r.label === '疲劳安全系数 S');
    expect(s).toBeDefined();
    const sv = Number(s!.value.replace(/,/g, ''));
    expect(sv).toBeGreaterThan(0);
    const steps = o.result!.steps.join(' ');
    expect(steps).toContain('疲劳校核');
    // S 必须与 tone 一致
    if (sv >= 1.5) expect(s!.tone).toBe('ok');
    else expect(s!.tone).toBe('bad');
  });

  it('应力集中系数增大 → S 下降', () => {
    const a = calcShaft({ ...BASE, fatigueCheck: true, sigmaNeg1: 258, Ksigma: 1.5 });
    const b = calcShaft({ ...BASE, fatigueCheck: true, sigmaNeg1: 258, Ksigma: 2.5 });
    const sa = Number(a.result!.results.find((r) => r.label === '疲劳安全系数 S')!.value.replace(/,/g, ''));
    const sb = Number(b.result!.results.find((r) => r.label === '疲劳安全系数 S')!.value.replace(/,/g, ''));
    expect(sb).toBeLessThan(sa);
  });

  it('弯矩为 0 时启用疲劳也不输出(无弯曲截面无法校核)', () => {
    const o = calcShaft({ ...BASE, bendingMoment: 0, fatigueCheck: true, sigmaNeg1: 258 });
    expect(o.ok).toBe(true);
    expect(o.result!.results.find((r) => r.label === '疲劳安全系数 S')).toBeUndefined();
  });
});
