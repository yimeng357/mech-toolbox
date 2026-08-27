import { describe, it, expect } from 'vitest';
// 解析格式化数字(去除千分位逗号)
const num = (s: string) => Number(String(s).replace(/[^0-9.eE+-]/g, ''));

import { calcBeltDrive, BELT_DRIVE_DEFAULTS, TIMING_SECTIONS, V_BELT_SECTIONS, contactAngleFactor } from './beltDrive';

describe('同步带与 V 带传动计算', () => {
  it('同步带:已知参数计算节线长/中心距/包角(无带型,手填节距)', () => {
    // P=1.5, n1=1450, i=2, d1=60, pb=5, a0=300, KA=1.2
    const o = calcBeltDrive({ beltType: 'TIMING', powerKw: 1.5, speedRpm: 1450, ratio: 2, d1: 60, pitch: 5, a0: 300, serviceFactor: 1.2 }, { digits: 2 });
    expect(o.ok).toBe(true);
    const r = o.result!;
    expect(num(r.results[0].value)).toBeCloseTo(1.8, 1);   // Pd
    expect(num(r.results[1].value)).toBeCloseTo(725, 0);   // n2
    expect(num(r.results[2].value)).toBeCloseTo(120, 1);   // d2
    expect(r.results[3].value).toBe('177');                 // Z
    expect(num(r.results[4].value)).toBeCloseTo(885, 0);   // Lp
    expect(num(r.results[5].value)).toBeCloseTo(299.6, 0); // a
    expect(num(r.results[6].value)).toBeCloseTo(168.5, 0); // α1
    expect(num(r.results[7].value)).toBeCloseTo(4.56, 1);  // v
    expect(num(r.results[8].value)).toBeCloseTo(395.2, 0); // Fe
    expect(r.results[10].value).toBe('17');                 // zm
    // 未选带型:无容量校核行,中心距为主结果
    expect(r.results.some((x) => x.label.includes('许用功率'))).toBe(false);
    expect(r.results.find((x) => x.label === '实际中心距 a')!.primary).toBe(true);
  });

  it('同步带 XL 容量校核:基准宽 9.652mm 许用功率与利用率', () => {
    // XL: pb=5.08, d1=60 → z1 = round(π·60/5.08) = 37 齿
    const o = calcBeltDrive({
      beltType: 'TIMING', powerKw: 1.5, speedRpm: 1450, ratio: 2, d1: 60, a0: 300, serviceFactor: 1.2,
      timingSection: 'XL', beltWidthMm: 9.652, pitch: 5.08,
    }, { digits: 2 });
    expect(o.ok).toBe(true);
    const r = o.result!;
    // Zc = 60×1.45/25.4 = 3.425
    // Pr = 0.746×3.425×(0.0916 − 7.07e-5×11.73) = 0.2319 kW
    const pr = r.results.find((x) => x.label.includes('基准宽额定功率'))!;
    expect(num(pr.value)).toBeCloseTo(0.232, 2);
    // 宽度系数 1.0,啮合齿数 zm:z1=round(π·60/5.08)=37, α1≈168.6 → zm=17 → 系数 1.0
    const rated = r.results.find((x) => x.label.includes('许用功率'))!;
    expect(num(rated.value)).toBeCloseTo(0.232, 2);
    // 利用率 = 1.8/0.232 ≈ 7.76 → 超容量
    const util = r.results.find((x) => x.label.includes('利用率'))!;
    expect(num(util.value)).toBeGreaterThan(1);
    expect(util.tone).toBe('bad');
  });

  it('同步带 H 宽度 50.8mm:容量校核含宽度系数 0.63', () => {
    // H: pb=12.7, d1=60, n1=1450 → Zc = 60×1.45/25.4 = 3.425
    const o = calcBeltDrive({
      beltType: 'TIMING', powerKw: 3, speedRpm: 1450, ratio: 2, d1: 60, a0: 400, serviceFactor: 1.3,
      timingSection: 'H', beltWidthMm: 50.8, pitch: 12.7,
    }, { digits: 2 });
    expect(o.ok).toBe(true);
    const r = o.result!;
    // Pr = 0.746×3.425×(3.73 − 1.41e-3×11.73) = 0.746×3.425×3.7135 = 9.485 kW
    // 宽度系数 0.63 → [P] ≈ 5.98 kW;Pd = 3.9 → 利用率 ≈ 0.65
    const rated = r.results.find((x) => x.label.includes('许用功率'))!;
    expect(num(rated.value)).toBeCloseTo(5.98, 1);
    const util = r.results.find((x) => x.label.includes('利用率'))!;
    expect(num(util.value)).toBeCloseTo(0.65, 1);
    expect(util.tone).toBe('ok');
  });

  it('V 带 SPZ 容量校核:单根许用功率与推荐根数', () => {
    // d1=90, n1=1440 → SPZ 基本额定功率 1.85 kW(表值)
    const o = calcBeltDrive({
      beltType: 'V_BELT', powerKw: 3, speedRpm: 1440, ratio: 2, d1: 90, pitch: null, a0: 400, serviceFactor: 1.2,
      vBeltSection: 'SPZ',
    }, { digits: 2 });
    expect(o.ok).toBe(true);
    const r = o.result!;
    // α1 ≈ 174.3° → Kα ≈ 1 − 0.003×5.7 ≈ 0.983;Lp≈1095 → KL ≈ 0.90+
    // P1 = 1.85×Kα×KL;N = ceil(3.6/P1)
    const per = r.results.find((x) => x.label.includes('单根许用功率'))!;
    expect(num(per.value)).toBeCloseTo(1.65, 1);
    const cnt = r.results.find((x) => x.label.includes('根数'))!;
    expect(cnt.value).toBe('3');
    const rated = r.results.find((x) => x.label.includes('许用传递功率'))!;
    expect(num(rated.value)).toBeCloseTo(4.95, 1);
  });

  it('V 带 SPZ 最小直径拦截:d1=63 可算,小于最小直径报错', () => {
    const okCase = calcBeltDrive({ beltType: 'V_BELT', powerKw: 1, speedRpm: 1440, ratio: 2, d1: 63, pitch: null, a0: 300, serviceFactor: 1.2, vBeltSection: 'SPZ' });
    expect(okCase.ok).toBe(true);
    const badCase = calcBeltDrive({ beltType: 'V_BELT', powerKw: 1, speedRpm: 1440, ratio: 2, d1: 50, pitch: null, a0: 300, serviceFactor: 1.2, vBeltSection: 'SPZ' });
    expect(badCase.ok).toBe(false);
    expect(badCase.fieldErrors?.d1).toContain('最小');
  });

  it('包角系数:180°→1.00,120°→0.82,中间线性', () => {
    expect(contactAngleFactor(180)).toBeCloseTo(1.0, 6);
    expect(contactAngleFactor(120)).toBeCloseTo(0.82, 6);
    expect(contactAngleFactor(150)).toBeCloseTo(0.91, 6);
  });

  it('V 带带型表与同步带带型表完整性', () => {
    expect(Object.keys(TIMING_SECTIONS).length).toBe(6);
    expect(Object.keys(V_BELT_SECTIONS).length).toBe(4);
    for (const spec of Object.values(TIMING_SECTIONS)) {
      expect(spec.pitchMm).toBeGreaterThan(0);
      expect(spec.widthFactors.length).toBeGreaterThan(0);
    }
  });

  it('异常输入给出字段级错误', () => {
    expect(calcBeltDrive({ beltType: 'TIMING', powerKw: 0, speedRpm: 1450, ratio: 2, d1: 60, pitch: 5, a0: 300, serviceFactor: 1.2 }).fieldErrors?.powerKw).toBeTruthy();
    expect(calcBeltDrive({ beltType: 'TIMING', powerKw: 1.5, speedRpm: 1450, ratio: 0, d1: 60, pitch: 5, a0: 300, serviceFactor: 1.2 }).fieldErrors?.ratio).toBeTruthy();
    expect(calcBeltDrive({ beltType: 'TIMING', powerKw: 1.5, speedRpm: 1450, ratio: 2, d1: 60, pitch: 0, a0: 300, serviceFactor: 1.2 }).fieldErrors?.pitch).toBeTruthy();
    expect(calcBeltDrive({ beltType: 'TIMING', powerKw: 1.5, speedRpm: 1450, ratio: 2, d1: 60, pitch: 5, a0: -1, serviceFactor: 1.2 }).ok).toBe(false);
    // 选了带型但没填带宽
    const noWidth = calcBeltDrive({ beltType: 'TIMING', powerKw: 1.5, speedRpm: 1450, ratio: 2, d1: 60, a0: 300, serviceFactor: 1.2, timingSection: 'XL', beltWidthMm: null, pitch: 5.08 });
    expect(noWidth.fieldErrors?.beltWidthMm).toBeTruthy();
  });

  it('默认参数可计算', () => {
    const o = calcBeltDrive(BELT_DRIVE_DEFAULTS);
    expect(o.ok).toBe(true);
  });
});
