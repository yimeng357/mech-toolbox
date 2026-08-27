// 液压缸活塞杆压杆稳定模块测试(手算基准值)
import { describe, expect, it } from 'vitest';
import { calcRodBuckling, rodBucklingCopyText } from './cylinderBuckling';

const num = (r: { results: Array<{ label: string; value: string }> }, labelPrefix: string) => {
  const row = r.results.find((x) => x.label.startsWith(labelPrefix));
  return Number(String(row?.value ?? '').replace(/,/g, ''));
};

describe('液压缸压杆稳定', () => {
  it('大柔度杆(欧拉):d=45,L=2000,两端铰接,E=206GPa → Fcr≈102.3 kN,安全系数不足', () => {
    const o = calcRodBuckling({ rodDiaMm: 45, effLenMm: 2000, endFixity: 'PIN_PIN', loadKN: 80, yieldMpa: 785, youngModulusGPa: 206, safetyRequired: 3 }, { digits: 2 });
    expect(o.ok).toBe(true);
    const r = o.result!;

    // λ = 4μL/d = 2000/11.25 = 177.78
    expect(num(r, '柔度')).toBeCloseTo(177.78, 1);
    // 失稳模式
    const modeRow = r.results.find((x) => x.label === '失稳模式')!;
    expect(modeRow.value).toContain('欧拉');
    // Fcr = π²EI/(μL)² ≈ 102.31 kN
    expect(Number(String(r.results[0].value).replace(/,/g, ''))).toBeCloseTo(102.31, 0);
    // 许用轴向力 = Fcr/3 ≈ 34.10 kN
    expect(num(r, '许用轴向力')).toBeCloseTo(34.104, 1);
    // 实际安全系数 = 102.31/80 ≈ 1.279 < 3 → bad
    expect(num(r, '实际安全系数')).toBeCloseTo(1.2789, 2);
    const safetyRow = r.results.find((x) => x.label.startsWith('实际安全系数'))!;
    expect(safetyRow.tone).toBe('bad');
  });

  it('中柔度杆(约翰逊):d=60,L=800,两端固定,σs=355 → σcr≈343.98 MPa,Fcr≈972.6 kN', () => {
    const o = calcRodBuckling({ rodDiaMm: 60, effLenMm: 800, endFixity: 'FIXED_FIXED', loadKN: 0, yieldMpa: 355, youngModulusGPa: 206 }, { digits: 2 });
    expect(o.ok).toBe(true);
    const r = o.result!;

    // λ = 0.5×800/15 = 26.67,λp = π√(206000/355) ≈ 75.68 → 中柔度
    expect(num(r, '柔度')).toBeCloseTo(26.667, 1);
    const modeRow = r.results.find((x) => x.label === '失稳模式')!;
    expect(modeRow.value).toContain('约翰逊');
    // σcr = 355 − 355²λ²/(4π²E) ≈ 343.98
    expect(num(r, '临界应力')).toBeCloseTo(343.98, 0);
    // Fcr = σcr·A ≈ 972.58 kN
    expect(Number(String(r.results[0].value).replace(/,/g, ''))).toBeCloseTo(972.6, 0);
  });

  it('短粗杆:d=80,L=300,λ=15<20 → 强度控制,Fcr≈1784 kN', () => {
    const o = calcRodBuckling({ rodDiaMm: 80, effLenMm: 300, endFixity: 'PIN_PIN', loadKN: 0, yieldMpa: 355 }, { digits: 2 });
    const r = o.result!;
    const modeRow = r.results.find((x) => x.label === '失稳模式')!;
    expect(modeRow.value).toContain('短粗');
    // Fcr = σs·A = 355 × 5026.55 ≈ 1784.42 kN
    expect(Number(String(r.results[0].value).replace(/,/g, ''))).toBeCloseTo(1784.4, 0);
  });

  it('端部约束系数影响:一固一自的临界力是两端铰接的 1/4', () => {
    const pinned = calcRodBuckling({ rodDiaMm: 40, effLenMm: 1500, endFixity: 'PIN_PIN' }, { digits: 2 });
    const fixedFree = calcRodBuckling({ rodDiaMm: 40, effLenMm: 1500, endFixity: 'FIXED_FREE' }, { digits: 2 });
    const fP = Number(String(pinned.result!.results[0].value).replace(/,/g, ''));
    const fF = Number(String(fixedFree.result!.results[0].value).replace(/,/g, ''));
    expect(fP / fF).toBeCloseTo(4, 1);
  });

  it('未填载荷时不给安全系数判定,填了才判定', () => {
    const noLoad = calcRodBuckling({ rodDiaMm: 45, effLenMm: 1500 }, { digits: 2 });
    expect(noLoad.result!.results.find((x) => x.label.startsWith('实际安全系数'))).toBeUndefined();

    const withLightLoad = calcRodBuckling({ rodDiaMm: 70, effLenMm: 800, loadKN: 50, yieldMpa: 785, safetyRequired: 2 }, { digits: 2 });
    const row = withLightLoad.result!.results.find((x) => x.label.startsWith('实际安全系数'))!;
    expect(row.tone === 'ok' || row.tone === 'warn').toBe(true);
  });

  it('参数校验', () => {
    expect(calcRodBuckling({ rodDiaMm: 0, effLenMm: 1000 }).fieldErrors?.rodDiaMm).toBeTruthy();
    expect(calcRodBuckling({ rodDiaMm: 45, effLenMm: -1 }).fieldErrors?.effLenMm).toBeTruthy();
    expect(calcRodBuckling({ rodDiaMm: 45, effLenMm: 1000, loadKN: -5 }).fieldErrors?.loadKN).toBeTruthy();
    expect(calcRodBuckling({ rodDiaMm: 45, effLenMm: 1000, yieldMpa: 0 }).fieldErrors?.yieldMpa).toBeTruthy();
    expect(calcRodBuckling({ rodDiaMm: 45, effLenMm: 1000, youngModulusGPa: 5 }).fieldErrors?.youngModulusGPa).toBeTruthy();
    expect(calcRodBuckling({ rodDiaMm: 45, effLenMm: 1000, safetyRequired: 15 }).fieldErrors?.safetyRequired).toBeTruthy();
  });

  it('复制文本包含关键结果', () => {
    const txt = rodBucklingCopyText({ rodDiaMm: 45, effLenMm: 2000, loadKN: 80 }, 2);
    expect(txt).toContain('【液压缸活塞杆压杆稳定】');
    expect(txt).toContain('临界失稳力');
  });
});
