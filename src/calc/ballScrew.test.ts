import { describe, expect, it } from 'vitest';
import { calcBallScrew, BALL_SCREW_DEFAULTS } from './ballScrew';

const BASE = {
  dynamicLoadRatingN: 28500,
  leadMm: 10,
  rootDiaMm: 21.5,
  segments: [
    { axialLoadN: 4200, rpm: 300, ratio: 0.2 },
    { axialLoadN: 1500, rpm: 900, ratio: 0.5 },
    { axialLoadN: 300, rpm: 1500, ratio: 0.3 },
  ],
  lubrication: 'GREASE' as const,
  efficiency: 0.9,
  meanFactor: 1.2,
};

function num(v: string | undefined): number {
  return Number((v ?? '').replace(/,/g, ''));
}

describe('滚珠丝杠寿命校核', () => {
  it('默认参数可计算,L10h 在合理范围', () => {
    const o = calcBallScrew(BALL_SCREW_DEFAULTS);
    expect(o.ok).toBe(true);
    const l10h = o.result!.results.find((r) => r.label === '额定寿命 L10h')!;
    expect(num(l10h.value)).toBeGreaterThan(1000);
  });

  it('当量转速手工验算:nm = Σ(ni·ti)', () => {
    const o = calcBallScrew(BASE);
    const nm = num(o.result!.results.find((r) => r.label === '当量转速 nm')!.value);
    expect(nm).toBeCloseTo(300 * 0.2 + 900 * 0.5 + 1500 * 0.3, 0); // = 960
  });

  it('载荷立方加权:Pm 增大 → 寿命急剧下降', () => {
    const heavy = calcBallScrew({ ...BASE, segments: [{ axialLoadN: 8400, rpm: 960, ratio: 1 }] });
    const light = calcBallScrew({ ...BASE, segments: [{ axialLoadN: 4200, rpm: 960, ratio: 1 }] });
    const lh = num(heavy.result!.results.find((r) => r.label === '额定寿命 L10')!.value);
    const ll = num(light.result!.results.find((r) => r.label === '额定寿命 L10')!.value);
    // 载荷翻倍 → 寿命降为 1/8
    expect(ll / lh).toBeCloseTo(8, 1);
  });

  it('行程寿命 = L10 × Pb / 1000 (km)', () => {
    const o = calcBallScrew({ ...BASE, segments: [{ axialLoadN: 1000, rpm: 100, ratio: 1 }] });
    const l10 = num(o.result!.results.find((r) => r.label === '额定寿命 L10')!.value);
    const travel = num(o.result!.results.find((r) => r.label === '行程寿命')!.value);
    expect(travel).toBeCloseTo((l10 * 10) / 1000, 0);
  });

  it('目标寿命反算所需 Ca', () => {
    const o = calcBallScrew({ ...BASE, targetLifeHours: 50000 });
    const creq = o.result!.results.find((r) => r.label.includes('所需 Ca'));
    expect(creq).toBeDefined();
  });

  it('dn 值校核:超高转速报警', () => {
    const okCase = calcBallScrew({ ...BASE, segments: [{ axialLoadN: 1000, rpm: 1000, ratio: 1 }] });
    const badCase = calcBallScrew({ ...BASE, segments: [{ axialLoadN: 1000, rpm: 8000, ratio: 1 }] });
    expect(okCase.result!.results.find((r) => r.label === 'dn 值校核')!.tone).toBe('ok');
    expect(badCase.result!.results.find((r) => r.label === 'dn 值校核')!.tone).toBe('bad');
  });

  it('占比合计≠1 返回字段错误', () => {
    const o = calcBallScrew({ ...BASE, segments: [{ axialLoadN: 1000, rpm: 100, ratio: 0.5 }] });
    expect(o.ok).toBe(false);
    if (o.ok) return;
    expect(o.fieldErrors?.segments).toBeDefined();
  });
});
