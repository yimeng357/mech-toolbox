import { describe, expect, it } from 'vitest';
import { calcGearStrength, gearYFa } from './gearStrength';
import { calcSpring } from './spring';

describe('齿轮强度·简化校核', () => {
  const BASE = {
    torqueNm: 100, teethPinion: 20, teethGear: 40,
    moduleMm: 3, faceWidthMm: 50, loadFactor: 1.6,
    sigmaHAllow: 550, sigmaFAllow: 300,
  };

  it('几何量正确:d1 = mz1, u = z2/z1, a = m(z1+z2)/2', () => {
    const o = calcGearStrength(BASE);
    expect(o.ok).toBe(true);
    const d1 = Number(o.result!.results[0].value.replace(/,/g, ''));
    expect(d1).toBe(60);
    const a = Number(o.result!.results.find((r) => r.label === '中心距 a')!.value.replace(/,/g, ''));
    expect(a).toBe(90);
  });

  it('圆周力 Ft = 2T/d1 = 2×100000/60 = 3333 N', () => {
    const o = calcGearStrength(BASE);
    const ft = Number(o.result!.results.find((r) => r.label === '圆周力 Ft')!.value.replace(/,/g, ''));
    expect(ft).toBeCloseTo(3333, 0);
  });

  it('模数增大 → 弯曲应力下降', () => {
    const small = calcGearStrength({ ...BASE, moduleMm: 2 });
    const big = calcGearStrength({ ...BASE, moduleMm: 4 });
    const sSmall = Number(small.result!.results.find((r) => r.label.includes('弯曲应力'))!.value.replace(/,/g, ''));
    const sBig = Number(big.result!.results.find((r) => r.label.includes('弯曲应力'))!.value.replace(/,/g, ''));
    expect(sBig).toBeLessThan(sSmall);
  });

  it('齿形系数 YFa 单调:z=17 时约 2.97,z=100 时接近 2.18', () => {
    expect(gearYFa(17)).toBeCloseTo(2.97, 1);
    expect(gearYFa(100)).toBeLessThan(2.3);
    expect(gearYFa(100)).toBeGreaterThan(2.1);
  });

  it('缺许用值时取缺省并正常判定', () => {
    const o = calcGearStrength({ ...BASE, sigmaHAllow: null, sigmaFAllow: null });
    expect(o.ok).toBe(true);
    expect(o.result!.results.find((r) => r.label === '强度判定')).toBeDefined();
  });
});

describe('压缩弹簧设计', () => {
  const BASE = {
    wireDiaMm: 4, meanDiaMm: 25, activeCoils: 8, endCoils: 2,
    shearModulusGPa: 79, allowableStressMpa: 750, designForceN: 500,
  };

  it('刚度手工验算:k = 79000×4⁴/(8×25³×8) = 20.22 N/mm', () => {
    const o = calcSpring(BASE);
    expect(o.ok).toBe(true);
    const k = Number(o.result!.results.find((r) => r.label === '弹簧刚度 k')!.value.replace(/,/g, ''));
    expect(k).toBeCloseTo(20.22, 1);
  });

  it('圈数增加 → 刚度下降', () => {
    const a = calcSpring({ ...BASE, activeCoils: 6 });
    const b = calcSpring({ ...BASE, activeCoils: 12 });
    const ka = Number(a.result!.results.find((r) => r.label === '弹簧刚度 k')!.value.replace(/,/g, ''));
    const kb = Number(b.result!.results.find((r) => r.label === '弹簧刚度 k')!.value.replace(/,/g, ''));
    expect(kb).toBeLessThan(ka);
    expect(ka / kb).toBeCloseTo(2, 1); // 12/6 = 2
  });

  it('旋绕比 C 与曲度系数合理', () => {
    const o = calcSpring(BASE);
    const c = Number(o.result!.results.find((r) => r.label === '旋绕比 C')!.value.replace(/,/g, ''));
    expect(c).toBeCloseTo(6.25, 1);
    const K = Number(o.result!.results.find((r) => r.label === '曲度系数 K')!.value.replace(/,/g, ''));
    expect(K).toBeGreaterThan(1.2);
    expect(K).toBeLessThan(1.3);
  });

  it('高弹簧稳定性报警(b > 2.6)', () => {
    const o = calcSpring({ ...BASE, activeCoils: 30 });
    const b = o.result!.results.find((r) => r.label === '稳定性 b = H0/D')!;
    expect(b.tone).toBe('bad');
  });

  it('设计载荷下应力与变形输出', () => {
    const o = calcSpring(BASE);
    const tau = o.result!.results.find((r) => r.label === '工作切应力 τ');
    const defl = o.result!.results.find((r) => r.label.includes('变形量'));
    expect(tau).toBeDefined();
    expect(defl).toBeDefined();
    // λ = 500/20.22 ≈ 24.7 mm
    expect(Number(defl!.value.replace(/,/g, ''))).toBeCloseTo(24.72, 1);
  });
});
