// 气缸推力扩展参数测试:机械效率 / 负载率校核 / 标准缸径圆整
import { describe, it, expect } from 'vitest';
import { calcCylinder, roundUpToStdBore } from './cylinder';

function num(s: string): number {
  return Number(String(s).replace(/[^0-9.\-eE]/g, ''));
}

describe('气缸推力·扩展参数', () => {
  it('机械效率折算实际输出力', () => {
    const o = calcCylinder({ bore: 100, rod: 32, pressure: 0.8, direction: 'push', efficiency: 0.8 }, { digits: 2 });
    expect(o.ok).toBe(true);
    const theory = num(o.result!.results[2].value);   // 理论力行不变
    const actual = num(o.result!.results[5].value);   // 实际输出力行
    expect(theory).toBeCloseTo(6283.19, 1);
    expect(actual).toBeCloseTo(theory * 0.8, 1);
  });

  it('标准缸径系列向上圆整', () => {
    expect(roundUpToStdBore(70)).toBe(80);
    expect(roundUpToStdBore(100)).toBe(100);
    expect(roundUpToStdBore(33)).toBe(40);
    const o = calcCylinder({ bore: 70, rod: 30, pressure: 0.8, direction: 'push' }, { digits: 2 });
    expect(o.result!.results[6].value).toContain('80');
  });

  it('负载率校核:轻载 ok / 超载 bad', () => {
    // β = 5000/(6283.19×0.8) ≈ 99% → bad
    const heavy = calcCylinder({ bore: 100, rod: 32, pressure: 0.8, direction: 'push', efficiency: 0.8, loadForce: 5000 }, { digits: 2 });
    const betaRow = heavy.result!.results.find((r) => r.label === '负载率 β');
    expect(betaRow).toBeTruthy();
    expect(num(betaRow!.value)).toBeGreaterThan(70);
    expect(betaRow!.tone).toBe('bad');

    // β = 1000/(6283.19×0.9) ≈ 17.7% → ok
    const light = calcCylinder({ bore: 100, rod: 32, pressure: 0.8, direction: 'push', loadForce: 1000 }, { digits: 2 });
    expect(light.result!.results.find((r) => r.label === '负载率 β')!.tone).toBe('ok');
  });

  it('效率越界给出字段错误', () => {
    expect(calcCylinder({ bore: 100, rod: 32, pressure: 0.8, direction: 'push', efficiency: 1.5 }).fieldErrors?.efficiency).toBeTruthy();
    expect(calcCylinder({ bore: 100, rod: 32, pressure: 0.8, direction: 'push', loadForce: -1 }).fieldErrors?.loadForce).toBeTruthy();
  });
});
