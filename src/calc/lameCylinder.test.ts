import { describe, it, expect } from 'vitest';
const num = (s: string) => Number(String(s).replace(/[^0-9.eE+-]/g, ''));

import { calcLameCylinder, LAME_CYLINDER_DEFAULTS } from './lameCylinder';

describe('厚壁圆筒 Lamé 应力(含端部条件)', () => {
  const base = { ...LAME_CYLINDER_DEFAULTS, endCondition: undefined, axialForceN: null } as const;

  it('开口端(无轴向力):与原公式一致 σv = √3·K²·Pi/(K²−1)', () => {
    // Di=20, Do=50 → K=2.5, K2=6.25;Pi=350 MPa
    // σt,i = 350×7.25/5.25 = 483.33;σz=0;σr=−350
    // σv(open) = Pi·√(3K⁴+1)/(K²−1) = 350×√(117.8125+1)/5.25 = 350×10.8748/5.25 = 724.99
    const o = calcLameCylinder({ ...base, endCondition: 'OPEN' }, { digits: 2 });
    expect(o.ok).toBe(true);
    const r = o.result!;
    const sv = r.results.find((x) => x.label.includes('内壁等效应力'))!;
    expect(num(sv.value)).toBeCloseTo(725.0, 0);
    const sz = r.results.find((x) => x.label === '轴向应力 σz')!;
    expect(num(sz.value)).toBeCloseTo(0, 6);
    // Py(open) = 850×5.25/√117.8125+1... = 850×5.25/10.8748 = 410.4 MPa → 4104 bar
    const py = r.results.find((x) => x.label === '初始屈服压力 Py')!;
    expect(num(py.value)).toBeCloseTo(4104.8, 1);
  });

  it('闭口端:轴向应力计入,屈服压力提高', () => {
    const o = calcLameCylinder({ ...base, endCondition: 'CLOSED' }, { digits: 2 });
    expect(o.ok).toBe(true);
    const r = o.result!;
    // σz = Pi/(K²−1) = 350/5.25 = 66.67 MPa
    const sz = r.results.find((x) => x.label === '轴向应力 σz')!;
    expect(num(sz.value)).toBeCloseTo(66.67, 1);
    // σv(closed) = √3·K²·Pi/(K²−1) = 1.732×6.25×350/5.25 = 721.69
    const sv = r.results.find((x) => x.label.includes('内壁等效应力'))!;
    expect(num(sv.value)).toBeCloseTo(721.7, 0);
    // Py(closed) = 850×5.25/(1.732×6.25) = 412.3 MPa → 4123 bar
    const py = r.results.find((x) => x.label === '初始屈服压力 Py')!;
    expect(num(py.value)).toBeCloseTo(4122.3, 1);
  });

  it('开口端 + 外部轴向力:σz = F/A 计入 von Mises', () => {
    const o = calcLameCylinder({ ...base, endCondition: 'OPEN', axialForceN: 100000 }, { digits: 2 });
    expect(o.ok).toBe(true);
    const r = o.result!;
    // A = π/4×(50²−20²) = 1649.3 mm² → σz = 100000/1649.3 = 60.64 MPa
    const sz = r.results.find((x) => x.label === '轴向应力 σz')!;
    expect(num(sz.value)).toBeCloseTo(60.64, 1);
  });

  it('默认参数(闭口)可计算,且结果包含端部条件说明', () => {
    const o = calcLameCylinder(LAME_CYLINDER_DEFAULTS);
    expect(o.ok).toBe(true);
    expect(o.result!.note).toContain('闭口');
  });

  it('异常输入:外径≤内径报错', () => {
    const o = calcLameCylinder({ ...base, outerDiameterMm: 20, endCondition: 'CLOSED' });
    expect(o.ok).toBe(false);
    expect(o.fieldErrors?.outerDiameterMm).toBeTruthy();
  });
});
