import { describe, expect, it } from 'vitest';
import { calcBearingLife } from './bearingLife';

const base = {
  kind: 'BALL' as const,
  dynamicLoadRatingKn: 32.5,
  radialLoadKn: 5,
  axialLoadKn: 1.5,
  speedRpm: 1450,
};

/** 取结果数值(去掉千分位) */
function num(v: string | undefined): number {
  return Number((v ?? '').replace(/,/g, ''));
}

describe('calcBearingLife', () => {
  it('计算球轴承基本寿命(纯径向, Fa/Fr ≤ e 取 P = Fr)', () => {
    const o = calcBearingLife({ ...base, axialLoadKn: 0 });
    expect(o.ok).toBe(true);
    if (!o.ok || !o.result) return;
    // P = 5 kN, C = 32.5 → L10 = 6.5^3 = 274.6 百万转
    // L10h = 1e6/(60*1450) * 274.6 = 3156.6 h
    const l10 = o.result.results.find((r) => r.label === '额定寿命 L10');
    const l10h = o.result.results.find((r) => r.label === '基本额定寿命 L10h');
    expect(num(l10?.value)).toBeGreaterThan(270);
    expect(num(l10?.value)).toBeLessThan(280);
    expect(num(l10h?.value)).toBeGreaterThan(3100);
    expect(num(l10h?.value)).toBeLessThan(3200);
  });

  it('轴向载荷超过 e 时采用 P = X·Fr + Y·Fa', () => {
    const o = calcBearingLife({ ...base, axialLoadKn: 4 });
    expect(o.ok).toBe(true);
    if (!o.ok || !o.result) return;
    // Fa/Fr = 0.8 > e=0.26 → P = 0.56*5 + 1.5*4 = 8.8 kN
    const p = o.result.results.find((r) => r.label === '当量动载荷 P');
    expect(num(p?.value)).toBeGreaterThan(8.7);
    expect(num(p?.value)).toBeLessThan(8.9);
    expect(o.result.steps.join(' ')).toContain('P = X·Fr + Y·Fa');
  });

  it('滚子轴承使用 ε = 10/3 寿命指数', () => {
    const o = calcBearingLife({ ...base, kind: 'ROLLER' });
    expect(o.ok).toBe(true);
    if (!o.ok || !o.result) return;
    // L10 = 6.5^(10/3) ≈ 495.8
    const l10 = o.result.results.find((r) => r.label === '额定寿命 L10');
    expect(num(l10?.value)).toBeGreaterThan(480);
    expect(num(l10?.value)).toBeLessThan(510);
  });

  it('目标寿命反算所需额定动载荷 Creq', () => {
    const o = calcBearingLife({ ...base, targetLifeHours: 20000 });
    expect(o.ok).toBe(true);
    if (!o.ok || !o.result) return;
    const creq = o.result.results.find((r) => r.label.includes('所需 C'));
    expect(creq).toBeDefined();
    // 当前寿命约 3157h,目标 20000h → Creq 必然大于 C = 32.5
    expect(num(creq?.value)).toBeGreaterThan(32.5);
  });

  it('冲击系数 fd 与温度系数 ft 修正', () => {
    // fd=2、纯径向 → P = 5×2 = 10 kN
    const o1 = calcBearingLife({ ...base, axialLoadKn: 0, loadFactor: 2 });
    const o2 = calcBearingLife({ ...base, tempFactor: 0.9 });
    expect(o1.ok && o2.ok).toBe(true);
    if (!o1.ok || !o2.ok || !o1.result || !o2.result) return;
    // fd=2 → P = 5×2 = 10 kN
    const p1 = o1.result.results.find((r) => r.label === '当量动载荷 P');
    expect(num(p1?.value)).toBeGreaterThan(9.9);
    expect(num(p1?.value)).toBeLessThan(10.1);
    // ft=0.9 → 有效 C = 29.25 → 寿命 < 274.6
    const l10_2 = o2.result.results.find((r) => r.label === '额定寿命 L10');
    expect(num(l10_2?.value)).toBeLessThan(274.6);
  });

  it('非法输入返回字段错误', () => {
    const o = calcBearingLife({ ...base, radialLoadKn: 0 });
    expect(o.ok).toBe(false);
    if (o.ok) return;
    expect(o.fieldErrors?.radialLoadKn).toBeDefined();
  });
});
