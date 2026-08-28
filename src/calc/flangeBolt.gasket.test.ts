// 法兰螺栓·垫片两工况校核测试
import { describe, it, expect } from 'vitest';
import { calcFlange, GASKET_CLASSES } from './flangeBolt';

const BASE = {
  od: 260, sealD: 200, pressure: 1.6, count: 8,
  spec: 'M16', d: 16, grade: '8.8',
};

describe('法兰螺栓·垫片 m/y 两工况', () => {
  it('不选垫片时保持旧行为', () => {
    const o = calcFlange({ ...BASE, gasketClass: '' });
    expect(o.ok).toBe(true);
    expect(o.result!.results.find((r) => r.label === '预紧工况总力 Wm2')).toBeUndefined();
  });

  it('垫片库数据有效', () => {
    expect(GASKET_CLASSES.length).toBeGreaterThanOrEqual(8);
    for (const g of GASKET_CLASSES) {
      expect(g.m).toBeGreaterThan(0);
      expect(g.y).toBeGreaterThan(0);
    }
    // 缠绕垫 m=3.0 / y=69
    const spiral = GASKET_CLASSES.find((g) => g.key === 'spiral-ss')!;
    expect(spiral.m).toBe(3.0);
    expect(spiral.y).toBe(69);
  });

  it('选垫片后输出两工况与控制工况', () => {
    const o = calcFlange({ ...BASE, gasketClass: 'spiral-ss' });
    expect(o.ok).toBe(true);
    const wm2 = o.result!.results.find((r) => r.label === '预紧工况总力 Wm2');
    const wm1 = o.result!.results.find((r) => r.label === '操作工况总力 Wm1');
    expect(wm2).toBeDefined();
    expect(wm1).toBeDefined();
    const steps = o.result!.steps.join(' ');
    expect(steps).toContain('预紧工况 Wm2');
    expect(steps).toContain('控制工况');
  });

  it('Wm2 = π·b·DG·y 手工验算', () => {
    const o = calcFlange({ ...BASE, gasketClass: 'spiral-ss' });
    // b = 200/4 = 50; Wm2 = π×50×200×69 = 2168k N
    const wm2 = Number(o.result!.results.find((r) => r.label === '预紧工况总力 Wm2')!.value.replace(/,/g, ''));
    expect(wm2).toBeGreaterThan(2100);
    expect(wm2).toBeLessThan(2250);
  });

  it('预紧工况/操作工况谁控制取决于 y 与 p', () => {
    // 低压 + 大 y → 预紧控制;高压 + 小 y → 操作控制
    const oLow = calcFlange({ ...BASE, pressure: 0.3, gasketClass: 'spiral-ss' });
    expect(oLow.result!.steps.join(' ')).toContain('预紧压紧工况控制');
    const oHigh = calcFlange({ ...BASE, pressure: 5, gasketClass: 'rubber-hard' });
    expect(oHigh.result!.steps.join(' ')).toContain('操作密封工况控制');
  });
});
