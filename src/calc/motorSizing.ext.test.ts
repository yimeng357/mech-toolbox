// 电机选型扩展参数测试:附加外部惯量 / S 曲线加速修正
import { describe, it, expect } from 'vitest';
import { calcMotorSizing } from './motorSizing';

function num(s: string): number {
  return Number(String(s).replace(/[^0-9.\-eE]/g, ''));
}

const BASE = {
  mechanism: 'BALL_SCREW' as const, mass: 100, speed: 1, accelTime: 0.3,
  leadDia: 20, gearRatio: 1, mu: 0.02, fExt: 0, eta: 0.85, Jm: 10,
};

describe('电机选型·扩展参数', () => {
  it('不传新参数时与旧行为完全一致', () => {
    const a = calcMotorSizing(BASE);
    const b = calcMotorSizing({ ...BASE, jExt: 0, motionCurve: 'TRAPEZOID' });
    expect(a.result!.results.map((r) => r.value)).toEqual(b.result!.results.map((r) => r.value));
    // 基准:JL = 10.13 kg·cm²,Tpeak ≈ 2.18 N·m
    expect(num(a.result!.results[0].value)).toBeCloseTo(10.13, 1);
  });

  it('附加外部惯量计入总惯量与惯量比', () => {
    const plain = calcMotorSizing(BASE);
    const withExt = calcMotorSizing({ ...BASE, jExt: 40 });
    // 总惯量 50.13 vs 机构惯量 10.13
    expect(num(withExt.result!.results[0].value)).toBeCloseTo(50.13, 1);
    // 惯量比 5.01 vs 2.01(results[1])
    expect(num(withExt.result!.results[1].value)).toBeGreaterThan(num(plain.result!.results[1].value));
    // 末尾出现"附加外部惯量"行
    const extRow = withExt.result!.results.find((r) => r.label === '其中·附加外部惯量');
    expect(extRow).toBeTruthy();
    expect(num(extRow!.value)).toBeCloseTo(40, 1);
  });

  it('S 曲线使加速扭矩 ×1.3,峰值扭矩相应增大', () => {
    const trap = calcMotorSizing(BASE);
    const scurve = calcMotorSizing({ ...BASE, motionCurve: 'S_CURVE' });
    const taTrap = num(trap.result!.results.find((r) => r.label === '加速扭矩 Ta')!.value);
    const taS = num(scurve.result!.results.find((r) => r.label === '加速扭矩 Ta')!.value);
    expect(taS / taTrap).toBeCloseTo(1.3, 1);
    expect(scurve.result!.results.some((r) => r.label === '运动曲线')).toBe(true);
  });

  it('附加惯量为负给出字段错误', () => {
    expect(calcMotorSizing({ ...BASE, jExt: -1 }).fieldErrors?.jExt).toBeTruthy();
  });
});
