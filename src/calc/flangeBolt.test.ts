import { describe, it, expect } from 'vitest';
// 解析格式化数字(去除千分位逗号)
const num = (s: string) => Number(String(s).replace(/[^0-9.eE+-]/g, ''));

import { calcFlange } from './flangeBolt';

describe('法兰螺栓计算', () => {
  it('Dg=200,p=1.6MPa,n=8 → 总力 50.27kN,单螺栓 6.28kN', () => {
    const o = calcFlange({ od: 260, sealD: 200, pressure: 1.6, count: 8, spec: 'M16', d: 16, grade: '8.8' }, { digits: 2 });
    expect(o.ok).toBe(true);
    const r = o.result!;
    // A = π/4*200² = 31415.93 mm²
    expect(num(r.results[0].value)).toBeCloseTo(31415.93, 1);
    // F = 1.6 * 31415.93 = 50265.48 N
    expect(num(r.results[1].value)).toBeCloseTo(50265.48, 0);
    // kN
    expect(num(r.results[2].value)).toBeCloseTo(50.27, 1);
    // F_b = 6283.19
    expect(num(r.results[3].value)).toBeCloseTo(6283.19, 0);
  });

  it('螺栓数量越多单螺栓载荷越小', () => {
    const a = calcFlange({ od: 260, sealD: 200, pressure: 1.6, count: 4, spec: 'M16', d: 16, grade: '8.8' });
    const b = calcFlange({ od: 260, sealD: 200, pressure: 1.6, count: 12, spec: 'M16', d: 16, grade: '8.8' });
    const fa = num(a.result!.results[3].value);
    const fb = num(b.result!.results[3].value);
    expect(fb).toBeLessThan(fa);
  });

  it('压力越大总力越大', () => {
    const a = calcFlange({ od: 260, sealD: 200, pressure: 1.0, count: 8, spec: 'M16', d: 16, grade: '8.8' });
    const b = calcFlange({ od: 260, sealD: 200, pressure: 2.5, count: 8, spec: 'M16', d: 16, grade: '8.8' });
    expect(num(b.result!.results[1].value)).toBeGreaterThan(num(a.result!.results[1].value));
  });

  it('异常输入给出错误', () => {
    expect(calcFlange({ od: 260, sealD: 200, pressure: 1.6, count: 0, spec: 'M16', d: 16, grade: '8.8' }).fieldErrors?.count).toBeTruthy();
    expect(calcFlange({ od: 260, sealD: 200, pressure: 1.6, count: 8.5, spec: 'M16', d: 16, grade: '8.8' }).fieldErrors?.count).toBeTruthy();
    expect(calcFlange({ od: 200, sealD: 260, pressure: 1.6, count: 8, spec: 'M16', d: 16, grade: '8.8' }).fieldErrors?.sealD).toBeTruthy();
    expect(calcFlange({ od: 260, sealD: 200, pressure: -1, count: 8, spec: 'M16', d: 16, grade: '8.8' }).fieldErrors?.pressure).toBeTruthy();
  });
});
