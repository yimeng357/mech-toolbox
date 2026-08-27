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

  it('常用牌号可检索', () => {
    const s45 = findMaterial('45');
    expect(s45?.sigmaS).toBe(355);
    expect(findMaterial('40Cr')?.sigmaS).toBe(785);
    expect(findMaterial('304')?.sigmaS).toBe(205);
    expect(findMaterial('7075T6')?.density).toBeCloseTo(2.81, 2);
    expect(findMaterial('不存在的牌号')).toBeNull();
    expect(findMaterial(null)).toBeNull();
  });

  it('选择器选项包含手动输入项', () => {
    const opts = materialOptions();
    expect(opts[0].value).toBe('');
    expect(opts.length).toBe(MATERIALS.length + 1);
  });
});
