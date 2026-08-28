// 管路损失·管件 ζ 库测试
import { describe, it, expect } from 'vitest';
import { calcPipeLoss, fittingsZetaSum, PIPE_FITTINGS } from './pipeLoss';

describe('管路损失·局部阻力库', () => {
  it('管件表数据有效', () => {
    expect(PIPE_FITTINGS.length).toBeGreaterThanOrEqual(15);
    for (const f of PIPE_FITTINGS) {
      expect(f.key).toBeTruthy();
      expect(f.name).toBeTruthy();
      expect(f.zeta).toBeGreaterThan(0);
    }
  });

  it('fittingsZetaSum 求和与容错', () => {
    expect(fittingsZetaSum(null).sum).toBe(0);
    expect(fittingsZetaSum([]).sum).toBe(0);
    const r = fittingsZetaSum(['elbow90', 'check-valve', '不存在的']);
    expect(r.sum).toBeCloseTo(3.3, 2); // 0.3 + 3.0,未知 key 忽略
    expect(r.parts.length).toBe(2);
  });

  it('管件 ζ 累加到手填 Σζ 上并参与压降计算', () => {
    const base = {
      flowRateLMin: 30, innerDiaMm: 12, lengthM: 0,
      localK: 1, lineType: 'PRESSURE' as const,
    };
    const noFitting = calcPipeLoss(base);
    const withFitting = calcPipeLoss({ ...base, fittings: ['elbow90', 'elbow90'] });
    expect(noFitting.ok && withFitting.ok).toBe(true);
    const p0 = Number(noFitting.result!.results.find((x) => x.label === '局部损失 Δpm')!.value);
    const p2 = Number(withFitting.result!.results.find((x) => x.label === '局部损失 Δpm')!.value);
    // 手填 1 + 两个 90° 弯头 ζ=0.6 → Σζ 1.6 倍压降
    expect(p2 / p0).toBeCloseTo(1.6, 1);
    expect(withFitting.result!.steps.join(' ')).toContain('90° 弯头');
  });

  it('不传管件时与旧行为一致(Σζ = localK)', () => {
    const o = calcPipeLoss({ flowRateLMin: 30, innerDiaMm: 12, lengthM: 5, localK: 2 });
    expect(o.ok).toBe(true);
    const dp = Number(o.result!.results.find((x) => x.label === '总压力损失 Δp')!.value);
    expect(dp).toBeGreaterThan(0);
  });
});
