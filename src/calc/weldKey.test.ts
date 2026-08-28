import { describe, expect, it } from 'vitest';
import { calcWeld } from './weld';
import { calcKey } from './keyJoint';

describe('焊缝强度校核', () => {
  const BASE = { weldType: 'FILLET' as const, loadN: 50000, legMm: 6, weldLengthMm: 400, allowableMpa: 100 };

  it('角焊缝承载面积 A = 0.7hL = 1680 mm²', () => {
    const o = calcWeld(BASE);
    expect(o.ok).toBe(true);
    const a = Number(o.result!.results.find((r) => r.label === '有效承载面积 A')!.value.replace(/,/g, ''));
    expect(a).toBeCloseTo(0.7 * 6 * 400, 0);
  });

  it('应力 τ = F/A,许用满足判定', () => {
    const o = calcWeld(BASE);
    const tau = Number(o.result!.results.find((r) => r.label === '焊缝应力 τ')!.value.replace(/,/g, ''));
    expect(tau).toBeCloseTo(50000 / 1680, 0); // 29.8 MPa
    expect(o.result!.results[o.result!.results.length - 1].value).toBe('满足');
  });

  it('焊脚太小 → 不满足', () => {
    const o = calcWeld({ ...BASE, legMm: 1 }); // A=280, τ=178>100
    expect(o.result!.results[o.result!.results.length - 1].value).toBe('不满足');
  });

  it('对接焊缝按 t·L 计面积且质量系数折减', () => {
    const o = calcWeld({ weldType: 'BUTT', loadN: 50000, plateThkMm: 10, weldLengthMm: 200, allowableMpa: 100, buttQualityFactor: 0.85 });
    expect(o.ok).toBe(true);
    const a = Number(o.result!.results.find((r) => r.label === '有效承载面积 A')!.value.replace(/,/g, ''));
    expect(a).toBe(2000);
    expect(o.result!.steps.join(' ')).toContain('0.85');
  });
});

describe('键/花键连接校核', () => {
  const BASE = {
    keyType: 'FLAT_KEY' as const, torqueNm: 300, shaftDiaMm: 40,
    keyWidthMm: 12, keyHeightMm: 8, keyLengthMm: 56, keyCount: 1,
    allowablePressureMpa: 100,
  };

  it('平键挤压应力 σp = 4T/(d·h·L) = 4×300000/(40×8×56) = 67 MPa', () => {
    const o = calcKey(BASE);
    expect(o.ok).toBe(true);
    const sp = Number(o.result!.results.find((r) => r.label === '挤压应力 σp')!.value.replace(/,/g, ''));
    expect(sp).toBeCloseTo(67.0, 0);
    expect(sp).toBeLessThanOrEqual(100); // 满足
  });

  it('键长减半 → 挤压应力翻倍且不满足', () => {
    const o = calcKey({ ...BASE, keyLengthMm: 28 });
    const sp = Number(o.result!.results.find((r) => r.label === '挤压应力 σp')!.value.replace(/,/g, ''));
    expect(sp).toBeGreaterThan(100);
    expect(o.result!.results[o.result!.results.length - 1].value).toBe('不满足');
  });

  it('双键按 1.5 键折算:应力降为单键的 2/3', () => {
    const single = calcKey(BASE);
    const doub = calcKey({ ...BASE, keyCount: 2 });
    const s1 = Number(single.result!.results.find((r) => r.label === '挤压应力 σp')!.value.replace(/,/g, ''));
    const s2 = Number(doub.result!.results.find((r) => r.label === '挤压应力 σp')!.value.replace(/,/g, ''));
    expect(s2 / s1).toBeCloseTo(2 / 3, 2);
  });

  it('花键简化计算正常输出', () => {
    const o = calcKey({
      keyType: 'SPLINE', torqueNm: 500, shaftDiaMm: 40,
      splineTeeth: 20, splineWorkHeightMm: 2.5, splineLengthMm: 40,
      splineUnevenFactor: 0.7, allowablePressureMpa: 100,
    });
    expect(o.ok).toBe(true);
    expect(o.result!.results.find((r) => r.label === '挤压应力 σp')).toBeDefined();
    expect(o.result!.steps.join(' ')).toContain('ψ');
  });
});
