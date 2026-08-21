import { describe, it, expect } from 'vitest';
// 解析格式化数字(去除千分位逗号)
const num = (s: string) => Number(String(s).replace(/[^0-9.eE+-]/g, ''));

import { calcBolt, stressArea, getGrade, METRIC_BOLTS } from './boltPreload';

describe('螺栓预紧力计算', () => {
  it('M10 8.8 47N·m K=0.2:预紧力 23500 N', () => {
    const o = calcBolt({ spec: 'M10', d: 10, pitch: 1.5, grade: '8.8', torque: 47, k: 0.2 }, { digits: 2 });
    expect(o.ok).toBe(true);
    const r = o.result!;
    // F = 47000/(0.2*10) = 23500 N
    expect(num(r.results[0].value)).toBeCloseTo(23500, 0);
    // A_s ≈ 58.0
    expect(num(r.results[2].value)).toBeCloseTo(58.0, 1);
    // σ = 23500/58 = 405.2
    expect(num(r.results[3].value)).toBeCloseTo(405.2, 0);
    // 利用率 = 63.3%
    expect(num(r.results[4].value)).toBeCloseTo(63.3, 0);
  });

  it('扭矩越大应力越大', () => {
    const a = calcBolt({ spec: 'M10', d: 10, pitch: 1.5, grade: '8.8', torque: 30, k: 0.2 });
    const b = calcBolt({ spec: 'M10', d: 10, pitch: 1.5, grade: '8.8', torque: 60, k: 0.2 });
    const fa = num(a.result!.results[0].value);
    const fb = num(b.result!.results[0].value);
    expect(fb).toBeGreaterThan(fa);
  });

  it('高强度等级许用屈服更高', () => {
    const a = calcBolt({ spec: 'M10', d: 10, pitch: 1.5, grade: '8.8', torque: 60, k: 0.2 });
    const b = calcBolt({ spec: 'M10', d: 10, pitch: 1.5, grade: '12.9', torque: 60, k: 0.2 });
    const ua = num(a.result!.results[4].value);
    const ub = num(b.result!.results[4].value);
    expect(ub).toBeLessThan(ua);
  });

  it('应力面积公式正确(M16 ≈ 157 mm²)', () => {
    expect(stressArea(16, 2)).toBeCloseTo(157, 0);
    expect(stressArea(20, 2.5)).toBeCloseTo(245, 0);
  });

  it('强度等级表数值正确', () => {
    expect(getGrade('8.8')).toBe(640);
    expect(getGrade('10.9')).toBe(940);
    expect(getGrade('12.9')).toBe(1100);
  });

  it('异常输入给出错误', () => {
    expect(calcBolt({ spec: 'M10', d: 0, pitch: 1.5, grade: '8.8', torque: 47, k: 0.2 }).fieldErrors?.d).toBeTruthy();
    expect(calcBolt({ spec: 'M10', d: 10, pitch: 1.5, grade: '8.8', torque: -5, k: 0.2 }).fieldErrors?.torque).toBeTruthy();
    expect(calcBolt({ spec: 'M10', d: 10, pitch: 1.5, grade: '8.8', torque: 47, k: 0 }).fieldErrors?.k).toBeTruthy();
  });

  it('标准规格表非空且直径递增', () => {
    expect(METRIC_BOLTS.length).toBeGreaterThan(5);
    for (let i = 1; i < METRIC_BOLTS.length; i++) {
      expect(METRIC_BOLTS[i].d).toBeGreaterThan(METRIC_BOLTS[i - 1].d);
    }
  });
});
