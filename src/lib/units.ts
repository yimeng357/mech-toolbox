// 单位换算引擎

export interface UnitDef {
  id: string;
  label: string;
  /** 相对基准单位的换算系数 */
  factor: number;
  /** 线性偏移(仅温度类单位使用) */
  offset?: number;
}

export interface UnitCategory {
  id: string;
  name: string;
  symbol?: string;
  units: UnitDef[];
  /** 常用换算快捷项 */
  presets: Array<{ label: string; from: string; to: string; value: number }>;
}

export const CATEGORIES: UnitCategory[] = [
  {
    id: 'length',
    name: '长度',
    symbol: 'L',
    units: [
      { id: 'mm', label: '毫米 mm', factor: 0.001 },
      { id: 'cm', label: '厘米 cm', factor: 0.01 },
      { id: 'm', label: '米 m', factor: 1 },
      { id: 'km', label: '千米 km', factor: 1000 },
      { id: 'inch', label: '英寸 in', factor: 0.0254 },
      { id: 'ft', label: '英尺 ft', factor: 0.3048 },
    ],
    presets: [
      { label: '1 inch = 25.4 mm', from: 'inch', to: 'mm', value: 1 },
      { label: '1 m = 39.37 inch', from: 'm', to: 'inch', value: 1 },
      { label: '1 ft = 304.8 mm', from: 'ft', to: 'mm', value: 1 },
    ],
  },
  {
    id: 'pressure',
    name: '压力',
    symbol: 'p',
    units: [
      { id: 'pa', label: '帕 Pa', factor: 1 },
      { id: 'kpa', label: '千帕 kPa', factor: 1e3 },
      { id: 'mpa', label: '兆帕 MPa', factor: 1e6 },
      { id: 'bar', label: '巴 bar', factor: 1e5 },
      { id: 'kgfcm2', label: 'kgf/cm²', factor: 98066.5 },
      { id: 'psi', label: 'psi', factor: 6894.757 },
      { id: 'atm', label: '标准大气压 atm', factor: 101325 },
    ],
    presets: [
      { label: '1 MPa = 10 bar', from: 'mpa', to: 'bar', value: 1 },
      { label: '1 MPa = 10.197 kgf/cm²', from: 'mpa', to: 'kgfcm2', value: 1 },
      { label: '1 MPa = 145.04 psi', from: 'mpa', to: 'psi', value: 1 },
      { label: '1 bar = 0.1 MPa', from: 'bar', to: 'mpa', value: 1 },
    ],
  },
  {
    id: 'force',
    name: '力',
    symbol: 'F',
    units: [
      { id: 'n', label: '牛 N', factor: 1 },
      { id: 'kn', label: '千牛 kN', factor: 1e3 },
      { id: 'kgf', label: '千克力 kgf', factor: 9.80665 },
      { id: 'lbf', label: '磅力 lbf', factor: 4.448222 },
      { id: 'tf', label: '吨力 tf', factor: 9806.65 },
    ],
    presets: [
      { label: '1 kgf = 9.80665 N', from: 'kgf', to: 'n', value: 1 },
      { label: '1 tf = 9.80665 kN', from: 'tf', to: 'kn', value: 1 },
      { label: '1 kN = 101.97 kgf', from: 'kn', to: 'kgf', value: 1 },
    ],
  },
  {
    id: 'torque',
    name: '扭矩',
    symbol: 'T',
    units: [
      { id: 'nmm', label: '牛·毫米 N·mm', factor: 0.001 },
      { id: 'nm', label: '牛·米 N·m', factor: 1 },
      { id: 'knm', label: '千牛·米 kN·m', factor: 1000 },
      { id: 'kgfm', label: '千克力·米 kgf·m', factor: 9.80665 },
      { id: 'lbfft', label: '磅力·英尺 lbf·ft', factor: 1.355818 },
    ],
    presets: [
      { label: '1 kgf·m = 9.80665 N·m', from: 'kgfm', to: 'nm', value: 1 },
      { label: '1 lbf·ft = 1.3558 N·m', from: 'lbfft', to: 'nm', value: 1 },
      { label: '1 N·m = 1000 N·mm', from: 'nm', to: 'nmm', value: 1 },
    ],
  },
  {
    id: 'power',
    name: '功率',
    symbol: 'P',
    units: [
      { id: 'w', label: '瓦 W', factor: 1 },
      { id: 'kw', label: '千瓦 kW', factor: 1e3 },
      { id: 'mw', label: '兆瓦 MW', factor: 1e6 },
      { id: 'hp_metric', label: '马力 hp(米制)', factor: 735.49875 },
      { id: 'hp_imperial', label: '马力 hp(英制)', factor: 745.699872 },
    ],
    presets: [
      { label: '1 kW = 1.3596 hp(米制)', from: 'kw', to: 'hp_metric', value: 1 },
      { label: '1 kW = 1.341 hp(英制)', from: 'kw', to: 'hp_imperial', value: 1 },
      { label: '1 hp(米制) = 0.7355 kW', from: 'hp_metric', to: 'kw', value: 1 },
    ],
  },
  {
    id: 'mass',
    name: '质量',
    symbol: 'm',
    units: [
      { id: 'g', label: '克 g', factor: 0.001 },
      { id: 'kg', label: '千克 kg', factor: 1 },
      { id: 't', label: '吨 t', factor: 1000 },
      { id: 'lb', label: '磅 lb', factor: 0.45359237 },
      { id: 'oz', label: '盎司 oz', factor: 0.028349523 },
    ],
    presets: [
      { label: '1 kg = 2.2046 lb', from: 'kg', to: 'lb', value: 1 },
      { label: '1 t = 1000 kg', from: 't', to: 'kg', value: 1 },
      { label: '1 lb = 453.59 g', from: 'lb', to: 'g', value: 1 },
    ],
  },
  {
    id: 'temperature',
    name: '温度',
    symbol: 'T',
    units: [
      { id: 'c', label: '摄氏度 °C', factor: 1, offset: 0 },
      { id: 'k', label: '开尔文 K', factor: 1, offset: -273.15 },
      { id: 'f', label: '华氏度 °F', factor: 5 / 9, offset: -32 },
    ],
    presets: [
      { label: '0 °C = 32 °F', from: 'c', to: 'f', value: 0 },
      { label: '100 °C = 212 °F', from: 'c', to: 'f', value: 100 },
      { label: '0 °C = 273.15 K', from: 'c', to: 'k', value: 0 },
    ],
  },
];

export function getCategory(id: string): UnitCategory | undefined {
  return CATEGORIES.find((c) => c.id === id);
}

/** 单位换算:把 fromId 单位下的 value 换算成 toId 单位下的值 */
export function convert(catId: string, fromId: string, toId: string, value: number): number | null {
  const cat = getCategory(catId);
  if (!cat) return null;
  const f = cat.units.find((u) => u.id === fromId);
  const t = cat.units.find((u) => u.id === toId);
  if (!f || !t) return null;
  if (!Number.isFinite(value)) return null;
  const base = (value + (f.offset || 0)) * f.factor;
  return base / t.factor - (t.offset || 0);
}
