import { describe, it, expect } from 'vitest';
// 解析格式化数字(去除千分位逗号)
const num = (s: string) => Number(String(s).replace(/[^0-9.eE+-]/g, ''));

import { calcIsoTolerance, ISO_TOLERANCE_DEFAULTS } from './isoTolerance';

describe('ISO 公差与配合查询计算', () => {
  it('H7/g6 为间隙配合', () => {
    // D=30(30 段): H7 ES=+21/EI=0; g6 es=-7/ei=-20 (IT6=13)
    const o = calcIsoTolerance({ nominalDiameterMm: 30, holeGrade: 'H7', shaftGrade: 'g6' }, { digits: 3 });
    expect(o.ok).toBe(true);
    const r = o.result!;
    expect(r.results[2].value).toBe('间隙配合');
    // Xmax = 21-(-20) = 41, Xmin = 0-(-7) = 7
    expect(num(r.results[3].value)).toBeCloseTo(41, 0);
    expect(num(r.results[4].value)).toBeCloseTo(7, 0);
    // 孔尺寸范围字符串取末段数值 = 30.021
    const rangeNums = r.results[0].value.match(/\d+(?:\.\d+)?/g) ?? [];
    expect(Number(rangeNums[rangeNums.length - 1])).toBeCloseTo(30.021, 2);
  });

  it('H7/k6 为过渡配合', () => {
    // D=30: H7 ES=+21/EI=0; k6 es=15/ei=2
    const o = calcIsoTolerance({ nominalDiameterMm: 30, holeGrade: 'H7', shaftGrade: 'k6' }, { digits: 3 });
    expect(o.ok).toBe(true);
    const r = o.result!;
    expect(r.results[2].value).toBe('过渡配合');
    // Xmax = 21-2 = 19, Ymax = |0-15| = 15
    expect(num(r.results[3].value)).toBeCloseTo(19, 0);
    expect(num(r.results[4].value)).toBeCloseTo(15, 0);
  });

  it('P7/h6 为过盈配合', () => {
    // D=30: P7 es=-21/ei=-42 (基础偏差 -IT7,IT7=21); h6 es=0/ei=-13
    const o = calcIsoTolerance({ nominalDiameterMm: 30, holeGrade: 'P7', shaftGrade: 'h6' }, { digits: 3 });
    expect(o.ok).toBe(true);
    const r = o.result!;
    expect(r.results[2].value).toBe('过盈配合');
    // Ymax = |0-(-42)| = 42, Ymin = |-21-(-13)| = 8
    expect(num(r.results[3].value)).toBeCloseTo(42, 0);
    expect(num(r.results[4].value)).toBeCloseTo(8, 0);
  });

  it('H7/h6 为间隙配合且最小间隙为 0', () => {
    const o = calcIsoTolerance({ nominalDiameterMm: 30, holeGrade: 'H7', shaftGrade: 'h6' }, { digits: 3 });
    expect(o.ok).toBe(true);
    expect(o.result!.results[2].value).toBe('间隙配合');
    expect(num(o.result!.results[4].value)).toBeCloseTo(0, 0);
  });

  it('异常输入给出字段级错误', () => {
    expect(calcIsoTolerance({ nominalDiameterMm: 0, holeGrade: 'H7', shaftGrade: 'g6' }).fieldErrors?.nominalDiameterMm).toBeTruthy();
    expect(calcIsoTolerance({ nominalDiameterMm: 600, holeGrade: 'H7', shaftGrade: 'g6' }).fieldErrors?.nominalDiameterMm).toBeTruthy();
    expect(calcIsoTolerance({ nominalDiameterMm: null, holeGrade: 'H7', shaftGrade: 'g6' }).ok).toBe(false);
  });

  it('默认参数可计算', () => {
    const o = calcIsoTolerance(ISO_TOLERANCE_DEFAULTS);
    expect(o.ok).toBe(true);
  });
});
