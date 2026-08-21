import { describe, it, expect } from 'vitest';
// 解析格式化数字(去除千分位逗号)
const num = (s: string) => Number(String(s).replace(/[^0-9.eE+-]/g, ''));

import {
  calcVessel,
  mises,
  innerSyntheMises,
  requiredInterfacePressure,
  shrinkFitInterference,
  VESSEL_DEFAULTS,
} from './vessel';

describe('Mises 当量应力', () => {
  it('单轴应力等于绝对值', () => {
    expect(mises(100, 0, 0)).toBeCloseTo(100, 6);
    expect(mises(-80, 0, 0)).toBeCloseTo(80, 6);
  });
  it('三轴情形数值正确', () => {
    // σ1=100,σ2=50,σ3=-100
    expect(mises(100, 50, -100)).toBeCloseTo(Math.sqrt(32500), 6);
  });
});

describe('单层圆筒内壁当量应力(Lamé)', () => {
  it('K=3, p=600 → 内壁 Mises = √3·p·K²/(K²-1) = 1169.1 MPa', () => {
    // ri=25, r1 任意(无外压), ro=75
    const s = innerSyntheMises(600, 0, 25, 40, 75);
    expect(s).toBeCloseTo((Math.sqrt(3) * 600 * 9) / 8, 0);
  });
});

describe('界面压力求解与预紧下限', () => {
  it('预紧后内壁当量下限趋近 p(而非 √3·p)', () => {
    // di=50(ri=25), do=125(ro=62.5), 等强度分界 r1=√(ri·ro)
    const ri = 25;
    const ro = 62.5;
    const r1 = Math.sqrt(ri * ro);
    const sol = requiredInterfacePressure(600, ri, r1, ro, 800);
    // minMises = p·K²/(K²-1) = 600·6.25/5.25 = 714.29
    expect(sol.minMises).toBeCloseTo((600 * 6.25) / 5.25, 1);
    expect(sol.feasible).toBe(true);
  });

  it('许用应力 ≤ p 时任何方案不可行', () => {
    const ri = 25;
    const ro = 62.5;
    const r1 = Math.sqrt(ri * ro);
    const sol = requiredInterfacePressure(600, ri, r1, ro, 600); // allow = p
    expect(sol.feasible).toBe(false);
    expect(sol.minMises).toBeGreaterThan(600);
  });
});

describe('缩套过盈量公式', () => {
  it('界面压力越大过盈越大,且为正', () => {
    const ri = 25;
    const ro = 62.5;
    const r1 = Math.sqrt(ri * ro);
    const a = shrinkFitInterference(100, ri, r1, ro);
    const b = shrinkFitInterference(200, ri, r1, ro);
    expect(a).toBeGreaterThan(0);
    expect(b).toBeGreaterThan(a);
  });
});

describe('缩套方案 calcVessel', () => {
  const base = {
    method: 'shrink' as const,
    pressure: 600,
    bore: 50,
    sigmaS: 1200,
    safety: 1.6,
    od: 125,
    linerOd: 62,
    wireSigmaS: 1800,
    wireSafety: 1.5,
    wireDia: 3,
  };

  it('内壁合成应力被压到许用值,过盈量为正', () => {
    const o = calcVessel(base, { digits: 2 });
    expect(o.ok).toBe(true);
    const r = o.result!;
    // [σ] = 1200/1.6 = 750
    expect(num(r.results[1].value)).toBeCloseTo(750, 1);
    // 内壁合成当量 ≈ [σ]
    expect(num(r.results[0].value)).toBeCloseTo(750, 0);
    // 分界直径 d1 = 2√(25·62.5) = 79.06
    expect(num(r.results[2].value)).toBeCloseTo(79.06, 1);
    // 过盈量 > 0
    expect(num(r.results[6].value)).toBeGreaterThan(0);
    expect(r.results[0].tone).toBe('ok');
  });

  it('许用应力 ≤ p 时给出不可行提示', () => {
    const o = calcVessel({ ...base, sigmaS: 900, safety: 1.5 }, { digits: 2 });
    expect(o.ok).toBe(true);
    // allow = 600 = p,不可行 → 结果中第一项 tone bad
    expect(o.result!.results[0].tone).toBe('bad');
  });

  it('单层即可满足时界面压力为 0', () => {
    // 低压 + 高强材料:[σ] > √3·p
    const o = calcVessel({ ...base, pressure: 200, sigmaS: 900, safety: 1.2, od: 80 }, { digits: 2 });
    expect(o.ok).toBe(true);
    // [σ]=750, √3·p=346 → 单层可行,界面压力 0,过盈 0
    expect(num(o.result!.results[5].value)).toBeCloseTo(0, 6);
    expect(num(o.result!.results[6].value)).toBeCloseTo(0, 6);
  });
});

describe('钢丝缠绕方案 calcVessel', () => {
  const base = {
    method: 'wire' as const,
    pressure: 600,
    bore: 50,
    sigmaS: 1200,
    safety: 1.6,
    od: 150,
    linerOd: 62,
    wireSigmaS: 1800,
    wireSafety: 1.5,
    wireDia: 3,
  };

  it('内衬内壁达标,钢丝应力 ≤ 许用,层数正确', () => {
    const o = calcVessel(base, { digits: 2 });
    expect(o.ok).toBe(true);
    const r = o.result!;
    // 内衬内壁合成 ≈ [σ]=750
    expect(num(r.results[0].value)).toBeCloseTo(750, 0);
    // 钢丝工作环向应力:600·625·(1+5625/961)/5000 = 514.0 MPa
    expect(num(r.results[3].value)).toBeCloseTo(514, 0);
    // 钢丝许用 = 1800/1.5 = 1200,满足
    expect(num(r.results[3].value)).toBeLessThan(num(r.results[4].value));
    expect(r.results[3].tone).toBe('ok');
    // 缠绕层数 = ceil((75-31)/3) = 15
    expect(num(r.results[6].value)).toBeCloseTo(15, 0);
  });

  it('钢丝强度不足时钢丝应力标为 bad', () => {
    const o = calcVessel({ ...base, wireSigmaS: 600, wireSafety: 1.2 }, { digits: 2 });
    expect(o.ok).toBe(true);
    expect(o.result!.results[3].tone).toBe('bad');
  });
});

describe('异常输入', () => {
  it('压力/内径/外径校验', () => {
    expect(calcVessel({ ...VESSEL_DEFAULTS, pressure: 0 }).fieldErrors?.pressure).toBeTruthy();
    expect(calcVessel({ ...VESSEL_DEFAULTS, bore: 0 }).fieldErrors?.bore).toBeTruthy();
    expect(calcVessel({ ...VESSEL_DEFAULTS, od: 40 }).fieldErrors?.od).toBeTruthy();
    expect(calcVessel({ ...VESSEL_DEFAULTS, safety: 0.8 }).fieldErrors?.safety).toBeTruthy();
  });

  it('缠绕方案内衬外径 / 钢丝直径校验', () => {
    const w = { ...VESSEL_DEFAULTS, method: 'wire' as const };
    expect(calcVessel({ ...w, linerOd: 40 }).fieldErrors?.linerOd).toBeTruthy();
    expect(calcVessel({ ...w, linerOd: 200 }).fieldErrors?.linerOd).toBeTruthy();
    expect(calcVessel({ ...w, wireDia: 0 }).fieldErrors?.wireDia).toBeTruthy();
  });

  it('默认参数可计算', () => {
    expect(calcVessel(VESSEL_DEFAULTS).ok).toBe(true);
  });
});
