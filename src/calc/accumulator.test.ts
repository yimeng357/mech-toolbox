import { describe, it, expect } from 'vitest';
// 解析格式化数字(去除千分位逗号)
const num = (s: string) => Number(String(s).replace(/[^0-9.eE+-]/g, ''));

import { calcAccumulator, ACCUMULATOR_DEFAULTS } from './accumulator';

describe('液压蓄能器容积计算', () => {
  it('应急动力(绝热):计算理论容积与标准容积', () => {
    // ΔV=5L, p2=200, p1=100, 绝热 n=1.4
    const o = calcAccumulator({ mode: 'EMERGENCY_POWER', deltaV: 5, p2: 200, p1: 100, processType: 'ADIABATIC' }, { digits: 2 });
    expect(o.ok).toBe(true);
    const r = o.result!;
    // p0 = 0.9*100 = 90
    expect(num(r.results[1].value)).toBeCloseTo(90, 1);
    // V0 = 5 / ((90/100)^(1/1.4) - (90/200)^(1/1.4)) ≈ 13.81
    expect(num(r.results[0].value)).toBeCloseTo(13.81, 1);
    // 标准容积 16 L
    expect(r.results[2].value).toBe('16');
    // 充放比 200/90 = 2.22 合格
    expect(num(r.results[3].value)).toBeCloseTo(2.22, 1);
  });

  it('冲击吸收模式:充气压力取 0.75·p1', () => {
    const o = calcAccumulator({ mode: 'SHOCK_ABSORPTION', deltaV: 1, p2: 300, p1: 200, processType: 'ADIABATIC' }, { digits: 2 });
    expect(o.ok).toBe(true);
    const r = o.result!;
    // p0 = 0.75*200 = 150
    expect(num(r.results[1].value)).toBeCloseTo(150, 1);
    // V0 = 1 / ((150/200)^(1/1.4) - (150/300)^(1/1.4)) = 1/(0.8142 - 0.6095) = 4.885
    expect(num(r.results[0].value)).toBeCloseTo(4.89, 1);
  });

  it('绝热快速释放(n=1.4)所需容积大于等温', () => {
    // 快速(绝热)释放时气体得不到热量补充,同样压降所需容积更大
    const adiabatic = calcAccumulator({ mode: 'EMERGENCY_POWER', deltaV: 5, p2: 200, p1: 100, processType: 'ADIABATIC' }, { digits: 2 });
    const isothermal = calcAccumulator({ mode: 'EMERGENCY_POWER', deltaV: 5, p2: 200, p1: 100, processType: 'ISOTHERMAL' }, { digits: 2 });
    const vAd = num(adiabatic.result!.results[0].value);
    const vIs = num(isothermal.result!.results[0].value);
    expect(vAd).toBeGreaterThan(vIs);
  });

  it('异常输入给出字段级错误', () => {
    expect(calcAccumulator({ mode: 'EMERGENCY_POWER', deltaV: 0, p2: 200, p1: 100, processType: 'ADIABATIC' }).fieldErrors?.deltaV).toBeTruthy();
    expect(calcAccumulator({ mode: 'EMERGENCY_POWER', deltaV: 5, p2: 100, p1: 100, processType: 'ADIABATIC' }).fieldErrors?.p1).toBeTruthy();
    expect(calcAccumulator({ mode: 'EMERGENCY_POWER', deltaV: 5, p2: 200, p1: null, processType: 'ADIABATIC' }).ok).toBe(false);
  });

  it('默认参数可计算', () => {
    const o = calcAccumulator(ACCUMULATOR_DEFAULTS);
    expect(o.ok).toBe(true);
  });
});
