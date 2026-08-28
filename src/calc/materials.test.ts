// 材料数据库测试
import { describe, it, expect } from 'vitest';
import { MATERIALS, findMaterial, materialOptions } from './materials';

describe('材料数据库', () => {
  it('数据完整且关键数值有效', () => {
    expect(MATERIALS.length).toBeGreaterThanOrEqual(15);
    for (const m of MATERIALS) {
      expect(m.sigmaS).toBeGreaterThan(0);
      expect(m.sigmaB).toBeGreaterThanOrEqual(m.sigmaS);
      expect(m.eGPa).toBeGreaterThan(0);
      expect(m.density).toBeGreaterThan(0);
    }
  });

  it('常用牌号可检索(45 钢分正火/调质双状态)', () => {
    const s45N = findMaterial('45N');
    const s45T = findMaterial('45T');
    expect(s45N?.sigmaS).toBe(295);
    expect(s45T?.sigmaS).toBe(355);
    // 调质态疲劳极限高于正火态
    expect((s45T?.sigmaNeg1 ?? 0)).toBeGreaterThan(s45N?.sigmaNeg1 ?? 0);
    expect(findMaterial('40Cr')?.sigmaS).toBe(785);
    expect(findMaterial('304')?.sigmaS).toBe(205);
    expect(findMaterial('7075T6')?.density).toBeCloseTo(2.81, 2);
    expect(findMaterial('不存在的牌号')).toBeNull();
    expect(findMaterial(null)).toBeNull();
  });

  it('疲劳极限与硬度字段可用', () => {
    for (const m of MATERIALS) {
      expect(m.sigmaNeg1).toBeGreaterThan(0);
      expect(m.hardnessHb).toBeGreaterThan(0);
      // σ-1 合理性:应在 0.25σb ~ 0.55σb 区间(钢典型 ≈0.43)
      expect(m.sigmaNeg1! / m.sigmaB).toBeGreaterThan(0.25);
      expect(m.sigmaNeg1! / m.sigmaB).toBeLessThan(0.55);
    }
  });

  it('选择器选项包含手动输入项', () => {
    const opts = materialOptions();
    expect(opts[0].value).toBe('');
    expect(opts.length).toBe(MATERIALS.length + 1);
  });
});
