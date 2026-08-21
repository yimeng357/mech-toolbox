import { describe, it, expect } from 'vitest';
// 解析格式化数字(去除千分位逗号)
const num = (s: string) => Number(String(s).replace(/[^0-9.eE+-]/g, ''));

import { calcCylinder, CYLINDER_DEFAULTS } from './cylinder';

describe('气缸推力计算', () => {
  it('已知参数计算推力/拉力', () => {
    // D=100, d=32, p=0.8MPa
    const o = calcCylinder({ bore: 100, rod: 32, pressure: 0.8, direction: 'push' }, { digits: 2 });
    expect(o.ok).toBe(true);
    const r = o.result!;
    // A1 = π/4*100² = 7853.98
    expect(num(r.results[0].value)).toBeCloseTo(7853.98, 1);
    // A2 = π/4*(10000-1024) = 7050.44
    expect(num(r.results[1].value)).toBeCloseTo(7049.73, 1);
    // F_push = 0.8*7853.98 = 6283.19 N
    expect(num(r.results[2].value)).toBeCloseTo(6283.19, 1);
    // kN 折算
    expect(num(r.results[3].value)).toBeCloseTo(6.28, 1);
  });

  it('缩回方向用环形面积计算', () => {
    const o = calcCylinder({ bore: 100, rod: 32, pressure: 0.8, direction: 'pull' }, { digits: 2 });
    expect(o.ok).toBe(true);
    const pull = num(o.result!.results[2].value);
    expect(pull).toBeCloseTo(5639.79, 1);
  });

  it('杆径为 0 时推力=拉力', () => {
    const o = calcCylinder({ bore: 50, rod: 0, pressure: 1, direction: 'push' }, { digits: 3 });
    expect(o.ok).toBe(true);
    const push = num(o.result!.results[2].value);
    const o2 = calcCylinder({ bore: 50, rod: 0, pressure: 1, direction: 'pull' }, { digits: 3 });
    const pull = num(o2.result!.results[2].value);
    expect(push).toBeCloseTo(pull, 6);
  });

  it('异常输入给出字段级错误', () => {
    expect(calcCylinder({ bore: 0, rod: 10, pressure: 0.8, direction: 'push' }).fieldErrors?.bore).toBeTruthy();
    expect(calcCylinder({ bore: 100, rod: 120, pressure: 0.8, direction: 'push' }).fieldErrors?.rod).toBeTruthy();
    expect(calcCylinder({ bore: 100, rod: 10, pressure: -1, direction: 'push' }).fieldErrors?.pressure).toBeTruthy();
    expect(calcCylinder({ bore: null, rod: 10, pressure: 0.8, direction: 'push' }).ok).toBe(false);
  });

  it('默认参数可计算', () => {
    const o = calcCylinder(CYLINDER_DEFAULTS);
    expect(o.ok).toBe(true);
  });
});
