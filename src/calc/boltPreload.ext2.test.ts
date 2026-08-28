// 螺栓预紧扩展测试:摩擦系数分解 / 分散度 / 交变载荷残余夹紧
import { describe, it, expect } from 'vitest';
import { calcBolt, kFromFriction } from './boltPreload';

const BASE = { spec: 'M10', d: 10, pitch: 1.5, grade: '8.8', torque: 47, k: 0.2 };

describe('螺栓预紧·扩展参数', () => {
  it('不传新参数时与旧行为一致', () => {
    const o = calcBolt(BASE);
    expect(o.ok).toBe(true);
    const f = o.result!.results.find((r) => r.label === '预紧力 F')!;
    expect(Number(f.value.replace(/,/g, ''))).toBeCloseTo(23500, -2); // 47/(0.2*0.01) = 23500 N
  });

  it('kFromFriction:与手填经验值趋势一致', () => {
    const k = kFromFriction(10, 1.5, 0.15);
    expect(k).toBeGreaterThan(0.15);
    expect(k).toBeLessThan(0.18); // 0.024 + 0.935×0.15 = 0.164
    const kDry = kFromFriction(10, 1.5, 0.2); // 干态更高
    expect(kDry).toBeGreaterThan(k);
  });

  it('摩擦系数模式:K 由 μ 计算且预紧力与手填同 K 时一致', () => {
    const mu = 0.15;
    const kv = kFromFriction(10, 1.5, mu);
    const a = calcBolt({ ...BASE, useFriction: true, muThread: mu });
    const b = calcBolt({ ...BASE, k: kv });
    expect(a.ok && b.ok).toBe(true);
    expect(a.result!.results[0].value).toBe(b.result!.results[0].value);
    expect(a.result!.steps.join(' ')).toContain('μ螺纹');
  });

  it('自定义分散度 ±15% 改变分散范围', () => {
    const a = calcBolt({ ...BASE, scatterPct: 15 });
    const range = a.result!.results.find((r) => r.label.includes('分散范围'))!;
    expect(range.label).toContain('15');
    const [lo, hi] = range.value.split('~').map((s) => Number(s.replace(/,/g, '')));
    expect(hi / lo).toBeCloseTo(1.15 / 0.85, 2); // (1+0.15)/(1-0.15) = 1.353
  });

  it('交变载荷:残余夹紧力与应力幅计算', () => {
    const o = calcBolt({ ...BASE, axialFatigueLoad: 5000 });
    expect(o.ok).toBe(true);
    const dFb = o.result!.results.find((r) => r.label === '螺栓拉力增幅 ΔFb');
    const clamp = o.result!.results.find((r) => r.label === '最低残余夹紧力');
    const sigmaA = o.result!.results.find((r) => r.label === '螺栓应力幅 σa');
    expect(dFb).toBeDefined();
    // ΔFb = 0.25 × 5000 = 1250 N
    expect(Number(dFb!.value.replace(/,/g, ''))).toBeCloseTo(1250, 0);
    expect(clamp).toBeDefined();
    expect(sigmaA).toBeDefined();
  });

  it('交变载荷过大时残余夹紧力报警', () => {
    const o = calcBolt({ ...BASE, scatterPct: 30, axialFatigueLoad: 40000 });
    expect(o.ok).toBe(true);
    const clamp = o.result!.results.find((r) => r.label === '最低残余夹紧力')!;
    // F = 23500, Fmin = 23500×0.7 = 16450 < ΔFb = 10000? 不至负;加大到 40000 → ΔFb=10000 < 16450 仍为正
    // 用更极端:torque 降低
    const o2 = calcBolt({ ...BASE, torque: 10, scatterPct: 30, axialFatigueLoad: 40000 });
    const clamp2 = o2.result!.results.find((r) => r.label === '最低残余夹紧力')!;
    expect(clamp2.tone).toBe('bad');
    expect(clamp).toBeDefined();
  });
});
