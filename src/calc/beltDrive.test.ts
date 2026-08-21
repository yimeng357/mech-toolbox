import { describe, it, expect } from 'vitest';
// 解析格式化数字(去除千分位逗号)
const num = (s: string) => Number(String(s).replace(/[^0-9.eE+-]/g, ''));

import { calcBeltDrive, BELT_DRIVE_DEFAULTS } from './beltDrive';

describe('同步带与 V 带传动计算', () => {
  it('同步带:已知参数计算节线长/中心距/包角', () => {
    // P=1.5, n1=1450, i=2, d1=60, pb=5, a0=300, KA=1.2
    const o = calcBeltDrive({ beltType: 'TIMING', powerKw: 1.5, speedRpm: 1450, ratio: 2, d1: 60, pitch: 5, a0: 300, serviceFactor: 1.2 }, { digits: 2 });
    expect(o.ok).toBe(true);
    const r = o.result!;
    // Pd = 1.8
    expect(num(r.results[0].value)).toBeCloseTo(1.8, 1);
    // n2 = 725
    expect(num(r.results[1].value)).toBeCloseTo(725, 0);
    // d2 = 120
    expect(num(r.results[2].value)).toBeCloseTo(120, 1);
    // Z = round(885.74/5) = 177
    expect(r.results[3].value).toBe('177');
    // Lp = 177*5 = 885
    expect(num(r.results[4].value)).toBeCloseTo(885, 0);
    // 实际中心距 ≈ 299.6
    expect(num(r.results[5].value)).toBeCloseTo(299.6, 0);
    // 包角 ≈ 168.5
    expect(num(r.results[6].value)).toBeCloseTo(168.5, 0);
    // 带速 v = π*60*1450/60000 ≈ 4.56
    expect(num(r.results[7].value)).toBeCloseTo(4.56, 1);
    // 有效圆周力 Fe = 1800/4.56 ≈ 395.2
    expect(num(r.results[8].value)).toBeCloseTo(395.2, 0);
    // 啮合齿数
    expect(r.results[10].value).toBe('17');
  });

  it('V 带:不含齿数,轴力系数取 2.2', () => {
    const o = calcBeltDrive({ beltType: 'V_BELT', powerKw: 1.5, speedRpm: 1450, ratio: 2, d1: 60, pitch: 5, a0: 300, serviceFactor: 1.2 }, { digits: 2 });
    expect(o.ok).toBe(true);
    const r = o.result!;
    // 无齿数行
    expect(r.results.some((x) => x.label === '同步带齿数 Z')).toBe(false);
    // 轴作用力 = Fe * 2.2 * sin(α/2) > 同步带情形
    const fr = r.results[r.results.length - 1];
    expect(fr.label).toBe('轴作用力 Fr');
    // Fr = Fe × 2.2 × sin(α/2) ≈ 865 N
    expect(num(fr.value)).toBeCloseTo(865, 0);
  });

  it('异常输入给出字段级错误', () => {
    expect(calcBeltDrive({ beltType: 'TIMING', powerKw: 0, speedRpm: 1450, ratio: 2, d1: 60, pitch: 5, a0: 300, serviceFactor: 1.2 }).fieldErrors?.powerKw).toBeTruthy();
    expect(calcBeltDrive({ beltType: 'TIMING', powerKw: 1.5, speedRpm: 1450, ratio: 0, d1: 60, pitch: 5, a0: 300, serviceFactor: 1.2 }).fieldErrors?.ratio).toBeTruthy();
    expect(calcBeltDrive({ beltType: 'TIMING', powerKw: 1.5, speedRpm: 1450, ratio: 2, d1: 60, pitch: 0, a0: 300, serviceFactor: 1.2 }).fieldErrors?.pitch).toBeTruthy();
    expect(calcBeltDrive({ beltType: 'TIMING', powerKw: 1.5, speedRpm: 1450, ratio: 2, d1: 60, pitch: 5, a0: -1, serviceFactor: 1.2 }).ok).toBe(false);
  });

  it('默认参数可计算', () => {
    const o = calcBeltDrive(BELT_DRIVE_DEFAULTS);
    expect(o.ok).toBe(true);
  });
});
