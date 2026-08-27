// 轴径计算扩展参数测试:键槽削弱 / 空心轴 / 弯扭合成
import { describe, it, expect } from 'vitest';
import { calcShaft } from './shaftDiameter';

function num(s: string): number {
  return Number(String(s).replace(/[^0-9.\-eE]/g, ''));
}

const BASE = { mode: 'torque' as const, torque: 200, power: null, speed: null, tau: 30, safety: 1.5 };

describe('轴径计算·扩展参数', () => {
  it('键槽削弱使所需轴径增大', () => {
    const plain = calcShaft({ ...BASE });
    const keyed = calcShaft({ ...BASE, keywayFactor: 0.85 });
    expect(num(plain.result!.results[2].value)).toBeCloseTo(37.08, 1);
    expect(num(keyed.result!.results[2].value)).toBeGreaterThan(num(plain.result!.results[2].value));
  });

  it('空心轴折减使所需轴径增大', () => {
    const solid = calcShaft({ ...BASE });
    const hollow = calcShaft({ ...BASE, hollowRatio: 0.5 });
    // (1−0.5⁴)=0.9375,d 增大约 2.2%
    expect(num(hollow.result!.results[2].value)).toBeGreaterThan(num(solid.result!.results[2].value));
  });

  it('默认参数下结果与纯扭转完全一致', () => {
    const a = calcShaft({ ...BASE });
    const b = calcShaft({ ...BASE, keywayFactor: 1, hollowRatio: 0, bendingMoment: null });
    expect(a.result!.results.map((r) => r.value + r.unit)).toEqual(b.result!.results.map((r) => r.value + r.unit));
  });

  it('弯扭合成:大弯矩时由合成工况控制', () => {
    const o = calcShaft({ ...BASE, bendingMoment: 600 }, { digits: 2 });
    const dMin = num(o.result!.results[2].value);
    // Me = √(600000² + (0.6×200000)²) ≈ 611882 N·mm → d ≈ 47.03 mm > 扭转 37.08 mm
    expect(dMin).toBeCloseTo(47.03, 1);
    const ctrl = o.result!.results.find((r) => r.label === '控制工况');
    expect(ctrl?.value).toBe('弯扭合成控制');
    // 推荐标准直径 ≥ 47.03 → 48
    expect(num(o.result!.results[3].value)).toBe(48);
  });

  it('小弯矩时扭转仍控制,不改变结果方向', () => {
    const o = calcShaft({ ...BASE, bendingMoment: 50 }, { digits: 2 });
    expect(o.result!.results.find((r) => r.label === '控制工况')?.value).toBe('扭转控制');
    expect(num(o.result!.results[2].value)).toBeCloseTo(37.08, 1);
  });

  it('新参数越界给出字段错误', () => {
    expect(calcShaft({ ...BASE, keywayFactor: 1.2 }).fieldErrors?.keywayFactor).toBeTruthy();
    expect(calcShaft({ ...BASE, hollowRatio: 0.95 }).fieldErrors?.hollowRatio).toBeTruthy();
    expect(calcShaft({ ...BASE, bendingMoment: -5 }).fieldErrors?.bendingMoment).toBeTruthy();
  });
});
