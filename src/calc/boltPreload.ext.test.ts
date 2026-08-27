// 螺栓预紧力扩展输出测试:±25% 分散度 / 收紧后的利用率阈值(≤70% ok)
import { describe, it, expect } from 'vitest';
import { calcBolt } from './boltPreload';

function num(s: string): number {
  return Number(String(s).replace(/[^0-9.\-eE]/g, ''));
}

const BASE = { spec: 'M10', d: 10, pitch: 1.5, grade: '8.8', k: 0.2 };

describe('螺栓预紧力·扩展输出', () => {
  it('输出 ±25% 预紧力分散范围', () => {
    const o = calcBolt({ ...BASE, torque: 47 }, { digits: 2 });
    // F = 23500 N → 分散 17.63 ~ 29.38 kN
    const row = o.result!.results.find((r) => r.label.includes('分散范围'));
    expect(row).toBeTruthy();
    const nums = String(row!.value).split('~').map((x) => num(x));
    expect(nums[0]).toBeCloseTo(17.63, 1);
    expect(nums[1]).toBeCloseTo(29.38, 1);
  });

  it('利用率 ≤70% 判定安全', () => {
    const o = calcBolt({ ...BASE, torque: 47 });
    // util ≈ 58%
    expect(o.result!.results.find((r) => r.label === '安全判断')!.value).toContain('70%');
    expect(o.result!.results.find((r) => r.label === '安全判断')!.tone).toBe('ok');
  });

  it('利用率 >90% 判定危险', () => {
    // T=70 → F=35000,σ≈603 MPa,util≈94%
    const o = calcBolt({ ...BASE, torque: 70 });
    const v = o.result!.results.find((r) => r.label === '安全判断')!;
    expect(v.value).toContain('危险');
    expect(v.tone).toBe('bad');
  });
});
