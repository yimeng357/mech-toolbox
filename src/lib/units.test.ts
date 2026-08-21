import { describe, it, expect } from 'vitest';
import { convert, CATEGORIES } from './units';

describe('单位换算', () => {
  it('长度:mm / inch', () => {
    expect(convert('length', 'inch', 'mm', 1)).toBeCloseTo(25.4, 6);
    expect(convert('length', 'm', 'inch', 1)).toBeCloseTo(39.3701, 3);
    expect(convert('length', 'mm', 'cm', 10)).toBeCloseTo(1, 6);
  });

  it('压力:MPa / bar / 等', () => {
    expect(convert('pressure', 'mpa', 'bar', 1)).toBeCloseTo(10, 6);
    expect(convert('pressure', 'mpa', 'kpa', 1)).toBeCloseTo(1000, 6);
    expect(convert('pressure', 'bar', 'mpa', 10)).toBeCloseTo(1, 6);
    expect(convert('pressure', 'mpa', 'kgfcm2', 1)).toBeCloseTo(10.1972, 3);
    expect(convert('pressure', 'mpa', 'psi', 1)).toBeCloseTo(145.038, 2);
  });

  it('力:N / kN / kgf', () => {
    expect(convert('force', 'kn', 'n', 1)).toBeCloseTo(1000, 6);
    expect(convert('force', 'kgf', 'n', 1)).toBeCloseTo(9.80665, 6);
    expect(convert('force', 'tf', 'kn', 1)).toBeCloseTo(9.80665, 5);
  });

  it('扭矩:N·m / kgf·m', () => {
    expect(convert('torque', 'kgfm', 'nm', 1)).toBeCloseTo(9.80665, 6);
    expect(convert('torque', 'lbfft', 'nm', 1)).toBeCloseTo(1.35582, 4);
    expect(convert('torque', 'nm', 'nmm', 1)).toBeCloseTo(1000, 6);
  });

  it('功率:kW / hp', () => {
    expect(convert('power', 'kw', 'w', 1)).toBeCloseTo(1000, 6);
    expect(convert('power', 'hp_metric', 'kw', 1)).toBeCloseTo(0.7355, 3);
    expect(convert('power', 'hp_imperial', 'kw', 1)).toBeCloseTo(0.7457, 3);
  });

  it('质量:kg / lb', () => {
    expect(convert('mass', 'kg', 'g', 1)).toBeCloseTo(1000, 6);
    expect(convert('mass', 'kg', 'lb', 1)).toBeCloseTo(2.20462, 4);
    expect(convert('mass', 't', 'kg', 1)).toBeCloseTo(1000, 6);
  });

  it('温度:带偏移换算', () => {
    expect(convert('temperature', 'c', 'f', 0)).toBeCloseTo(32, 6);
    expect(convert('temperature', 'c', 'f', 100)).toBeCloseTo(212, 6);
    expect(convert('temperature', 'c', 'k', 0)).toBeCloseTo(273.15, 6);
    expect(convert('temperature', 'f', 'c', 68)).toBeCloseTo(20, 6);
    expect(convert('temperature', 'k', 'c', 300)).toBeCloseTo(26.85, 2);
  });

  it('非法类别/单位返回 null', () => {
    expect(convert('nope', 'm', 'mm', 1)).toBeNull();
    expect(convert('length', 'nope', 'mm', 1)).toBeNull();
    expect(convert('length', 'm', 'mm', NaN)).toBeNull();
  });

  it('所有类别均有单位与换算预设', () => {
    for (const c of CATEGORIES) {
      expect(c.units.length).toBeGreaterThanOrEqual(3);
      expect(c.presets.length).toBeGreaterThan(0);
    }
  });
});
