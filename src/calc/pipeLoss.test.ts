// 管路压力损失模块测试(手算基准值)
import { describe, expect, it } from 'vitest';
import { calcPipeLoss, pipeLossCopyText } from './pipeLoss';

const num = (r: { results: Array<{ label: string; value: string }> }, labelPrefix: string) => {
  const row = r.results.find((x) => x.label.startsWith(labelPrefix));
  return Number(String(row?.value ?? '').replace(/,/g, ''));
};

describe('管路压力损失', () => {
  it('层流工况:Q=40,d=12,L=5m,ν=46cSt → Re=1537.7,Δp≈3.02 bar', () => {
    const o = calcPipeLoss({ flowRateLMin: 40, innerDiaMm: 12, lengthM: 5, densityKgM3: 900, kinViscCst: 46, localK: 2, lineType: 'PRESSURE' }, { digits: 4 });
    expect(o.ok).toBe(true);
    const r = o.result!;

    // 流速 v = 40/60000 / (π/4·0.012²) = 5.8946 m/s
    expect(num(r, '流速校核')).toBeCloseTo(5.8946, 2);
    const regimeRow = r.results.find((x) => x.label.startsWith('流态'))!;
    expect(regimeRow.value).toContain('层流');
    expect(regimeRow.value).toContain('1,537');

    // λ = 64/Re
    expect(num(r, '摩阻系数')).toBeCloseTo(64 / 1537.73, 4);
    // Δpf = λ·(L/d)·ρv²/2 ≈ 2.711 bar
    expect(num(r, '沿程损失')).toBeCloseTo(2.7113, 1);
    // Δpm = 2·ρv²/2 ≈ 0.313 bar
    expect(num(r, '局部损失')).toBeCloseTo(0.31272, 1);
    // 总压降
    expect(Number(String(r.results[0].value).replace(/,/g, ''))).toBeCloseTo(3.0241, 1);
    // 功耗 ≈ 0.202 kW
    expect(num(r, '压降功率')).toBeCloseTo(0.2016, 1);
  });

  it('湍流光滑管:Q=60,d=16,L=3m,ν=15cSt,ε=0 → Swamee-Jain λ≈0.03717,Δp≈0.76 bar', () => {
    const o = calcPipeLoss({ flowRateLMin: 60, innerDiaMm: 16, lengthM: 3, densityKgM3: 880, kinViscCst: 15, roughnessMm: 0, localK: 0, lineType: 'PRESSURE' }, { digits: 3 });
    expect(o.ok).toBe(true);
    const r = o.result!;
    const regimeRow = r.results.find((x) => x.label.startsWith('流态'))!;
    expect(regimeRow.value).toContain('湍流');
    // Re = 5305
    expect(regimeRow.value).toContain('5,305');
    expect(num(r, '摩阻系数')).toBeCloseTo(0.037173, 3);
    // Δpf = λ·187.5·(880·v²/2),v=4.9736 → ≈0.759 bar
    expect(Number(String(r.results[0].value).replace(/,/g, ''))).toBeCloseTo(0.7587, 1);
    expect(num(r, '局部损失')).toBeCloseTo(0, 3);
  });

  it('吸油管路流速超标判定:v>1.5 报警', () => {
    // Q=20 L/min, d=10mm → v = (20/60000)/(7.854e-5) = 4.244 m/s,吸油管路明显过高
    const o = calcPipeLoss({ flowRateLMin: 20, innerDiaMm: 10, lengthM: 1, kinViscCst: 46, localK: 0, lineType: 'SUCTION' }, { digits: 2 });
    const vRow = o.result!.results.find((x) => x.label.startsWith('流速校核'))!;
    expect(vRow.tone === 'warn' || vRow.tone === 'bad').toBe(true);
  });

  it('参数校验', () => {
    expect(calcPipeLoss({ flowRateLMin: 0, innerDiaMm: 12 }).fieldErrors?.flowRateLMin).toBeTruthy();
    expect(calcPipeLoss({ flowRateLMin: 30, innerDiaMm: -1 }).fieldErrors?.innerDiaMm).toBeTruthy();
    expect(calcPipeLoss({ flowRateLMin: 30, innerDiaMm: 12, kinViscCst: 0 }).fieldErrors?.kinViscCst).toBeTruthy();
    expect(calcPipeLoss({ flowRateLMin: 30, innerDiaMm: 12, densityKgM3: 200 }).fieldErrors?.densityKgM3).toBeTruthy();
    expect(calcPipeLoss({ flowRateLMin: 30, innerDiaMm: 12, roughnessMm: -1 }).fieldErrors?.roughnessMm).toBeTruthy();
    expect(calcPipeLoss({ flowRateLMin: 30, innerDiaMm: 12, localK: -2 }).fieldErrors?.localK).toBeTruthy();
    expect(calcPipeLoss({ flowRateLMin: null as unknown as number, innerDiaMm: 12 }).ok).toBe(false);
  });

  it('复制文本包含关键结果', () => {
    const txt = pipeLossCopyText({ flowRateLMin: 40, innerDiaMm: 12, lengthM: 5 }, 2);
    expect(txt).toContain('【管路压力损失】');
    expect(txt).toContain('总压力损失');
  });
});
