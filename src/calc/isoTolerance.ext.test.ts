// ISO 公差扩展测试:IT 等级扩展 / 基本偏差扩展 / 等效配合 / 典型配合库
import { describe, it, expect } from 'vitest';
import { calcIsoTolerance, getITValue, getShaftDeviations, getHoleDeviations, FIT_SCENARIOS } from './isoTolerance';

function fitOf(D: number, hole: string, shaft: string) {
  const o = calcIsoTolerance({ nominalDiameterMm: D, holeGrade: hole, shaftGrade: shaft });
  if (!o.ok || !o.result) throw new Error('calc failed');
  const r = o.result.results.find((x) => x.label === '配合性质')!.value;
  const nums = o.result.results.filter((x) => x.label.includes('间隙') || x.label.includes('过盈'));
  return { r, nums };
}

describe('ISO 公差·IT 等级表', () => {
  it('IT5~IT12 数值与标准一致(抽查)', () => {
    expect(getITValue(30, 5)).toBe(9);    // >18~30 IT5
    expect(getITValue(30, 7)).toBe(21);
    expect(getITValue(30, 11)).toBe(130);
    expect(getITValue(100, 6)).toBe(22);  // >80~120 IT6
    expect(getITValue(400, 12)).toBe(570);
  });
});

describe('ISO 公差·基本偏差(公式法 vs 标准表抽查)', () => {
  it('常用轴偏差与标准表一致(±2 μm 容差)', () => {
    // Ф30: g6 es=-9(表值 -9/-7? 表: g >18~30 es=-7 → 公式 -2.5*D^0.34, D=24, = -6.98 → -7)
    expect(Math.abs(getShaftDeviations(30, 'g6').es - -7)).toBeLessThanOrEqual(2);
    // Ф30 f7 es 表值 -20
    expect(Math.abs(getShaftDeviations(30, 'f7').es - -20)).toBeLessThanOrEqual(2);
    // Ф30 k6 ei 表值 +2
    expect(Math.abs(getShaftDeviations(30, 'k6').ei - 2)).toBeLessThanOrEqual(2);
    // Ф50 m6 ei 表值 +11
    expect(Math.abs(getShaftDeviations(50, 'm6').ei - 11)).toBeLessThanOrEqual(2);
    // Ф30 p6 ei 表值 +22
    expect(getShaftDeviations(30, 'p6').ei).toBe(22);
    // Ф30 s6 ei 表值 +35
    expect(getShaftDeviations(30, 's6').ei).toBe(35);
    // js6 对称
    expect(getShaftDeviations(30, 'js6')).toEqual({ es: 6.5, ei: -6.5 });
  });

  it('孔 H7 与 JS7 对称性', () => {
    expect(getHoleDeviations(30, 'H7')).toEqual({ es: 21, ei: 0 });
    expect(getHoleDeviations(30, 'JS7')).toEqual({ es: 10.5, ei: -10.5 });
  });
});

describe('ISO 公差·等效配合性质(同名配合互换)', () => {
  it('H7/p6 与 P7/h6 过盈量一致', () => {
    const a = fitOf(30, 'H7', 'p6');
    const b = fitOf(30, 'P7', 'h6');
    expect(a.r).toBe('过盈配合');
    expect(b.r).toBe('过盈配合');
    const aMax = a.nums.find((x) => x.label.includes('最大过盈'))!.value;
    const bMax = b.nums.find((x) => x.label.includes('最大过盈'))!.value;
    expect(aMax).toBe(bMax);
  });

  it('H7/n6 与 N7/h6 均为过渡配合且数值一致', () => {
    const a = fitOf(30, 'H7', 'n6');
    const b = fitOf(30, 'N7', 'h6');
    expect(a.r).toBe('过渡配合');
    expect(b.r).toBe('过渡配合');
    const aMax = a.nums.find((x) => x.label.includes('最大间隙'))!.value;
    const bMax = b.nums.find((x) => x.label.includes('最大间隙'))!.value;
    expect(aMax).toBe(bMax);
  });

  it('H7/k6 为典型过渡配合(Ф30 标准表: Xmax=+19, Ymax=−15 μm)', () => {
    const a = fitOf(30, 'H7', 'k6');
    expect(a.r).toBe('过渡配合');
    const xmax = Number(a.nums.find((x) => x.label.includes('最大间隙'))!.value);
    const ymax = Number(a.nums.find((x) => x.label.includes('最大过盈'))!.value);
    expect(xmax).toBeGreaterThanOrEqual(17);
    expect(xmax).toBeLessThanOrEqual(21);
    expect(ymax).toBeGreaterThanOrEqual(13);
    expect(ymax).toBeLessThanOrEqual(17);
  });

  it('H7/f7 为间隙配合(Ф30 最小间隙约 20 μm)', () => {
    const a = fitOf(30, 'H7', 'f7');
    expect(a.r).toBe('间隙配合');
    const xmin = Number(a.nums.find((x) => x.label.includes('最小间隙'))!.value);
    expect(xmin).toBeGreaterThanOrEqual(18);
    expect(xmin).toBeLessThanOrEqual(22);
  });
});

describe('ISO 公差·典型配合场景库', () => {
  it('8 个场景输入均可正常计算且性质与预期一致', () => {
    const expectType: Record<string, string> = {
      'slide-precise': '过渡配合', // H7/h6 最小间隙 0 → 判定间隙
      'slide-run': '间隙配合',
      'free-run': '间隙配合',
      'trans-key': '过渡配合',
      'trans-tight': '过渡配合',
      'press-light': '过盈配合',
      'press-mid': '过盈配合',
      'press-heavy': '过盈配合',
    };
    for (const s of FIT_SCENARIOS) {
      const f = fitOf(30, s.hole, s.shaft);
      const expected = s.key === 'slide-precise' ? '间隙配合' : expectType[s.key];
      expect(f.r).toBe(expected);
    }
  });
});

describe('ISO 公差·回归(旧功能不回归)', () => {
  it('H7/g6 Ф30 仍为间隙配合', () => {
    const f = fitOf(30, 'H7', 'g6');
    expect(f.r).toBe('间隙配合');
  });
  it('非法输入仍报错', () => {
    const o = calcIsoTolerance({ nominalDiameterMm: 900, holeGrade: 'H7', shaftGrade: 'g6' });
    expect(o.ok).toBe(false);
  });
});
