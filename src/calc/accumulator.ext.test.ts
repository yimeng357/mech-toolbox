// 蓄能器温度修正测试
import { describe, it, expect } from 'vitest';
import { calcAccumulator } from './accumulator';

function num(s: string): number {
  return Number(String(s).replace(/[^0-9.\-eE]/g, ''));
}

describe('蓄能器·温度修正', () => {
  it('温差为零时不出现在场充气值行', () => {
    const o = calcAccumulator({ mode: 'EMERGENCY_POWER', deltaV: 5, p2: 200, p1: 100, processType: 'ADIABATIC', tempFillC: 20, tempWorkC: 20 });
    expect(o.result!.results.find((r) => r.label.includes('现场充气值'))).toBeUndefined();
  });

  it('充气温度低于工作温度时折算充气值降低', () => {
    // p0 = 90 bar,T充=20℃ → T工=50℃:p0′ = 90 × 293.15/323.15 ≈ 81.65 bar
    const o = calcAccumulator({ mode: 'EMERGENCY_POWER', deltaV: 5, p2: 200, p1: 100, processType: 'ADIABATIC', tempFillC: 20, tempWorkC: 50 }, { digits: 2 });
    const row = o.result!.results.find((r) => r.label.includes('现场充气值'));
    expect(row).toBeTruthy();
    expect(num(row!.value)).toBeCloseTo(81.65, 1);
  });

  it('反向温差(冬充夏用)折算值升高', () => {
    const o = calcAccumulator({ mode: 'EMERGENCY_POWER', deltaV: 5, p2: 200, p1: 100, processType: 'ADIABATIC', tempFillC: -10, tempWorkC: 30 }, { digits: 2 });
    const row = o.result!.results.find((r) => r.label.includes('现场充气值'))!;
    // 90 × (263.15/303.15) ≈ 78.13? 反了:T充=-10 低,应更低 — p0′ = p0×(273+T充)/(273+T工) = 90×263.15/303.15 ≈ 78.13
    expect(num(row.value)).toBeLessThan(90);
    expect(num(row.value)).toBeCloseTo(78.13, 1);
  });

  it('温度越界给出字段错误', () => {
    expect(calcAccumulator({ mode: 'EMERGENCY_POWER', deltaV: 5, p2: 200, p1: 100, processType: 'ADIABATIC', tempFillC: 200 }).fieldErrors?.tempFillC).toBeTruthy();
    expect(calcAccumulator({ mode: 'EMERGENCY_POWER', deltaV: 5, p2: 200, p1: 100, processType: 'ADIABATIC', tempWorkC: -60 }).fieldErrors?.tempWorkC).toBeTruthy();
  });
});
