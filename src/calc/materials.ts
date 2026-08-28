// 常用机械材料数据库(带疲劳极限与热处理状态)
// 数据为手册常用典型值(GB/T 699、GB/T 3077、GB/T 1220、GB/T 3190 等),
// σ-1 为对称循环弯曲疲劳极限(典型值,拉压/扭转载荷需按系数换算),
// 不同热处理状态/规格的实测值会有差异,仅用于初步选型计算。

export interface Material {
  id: string;
  name: string;       // 牌号(含热处理状态)
  category: string;   // 类别
  sigmaS: number;     // 屈服强度 σs, MPa(灰铸铁取抗拉)
  sigmaB: number;     // 抗拉强度 σb, MPa
  sigmaNeg1?: number; // 对称循环弯曲疲劳极限 σ-1, MPa(缺省按 ~0.43σb 估算)
  hardnessHb?: number;  // 布氏硬度 HB(典型值)
  eGPa: number;       // 弹性模量 E, GPa
  density: number;    // 密度, g/cm3
  note?: string;      // 典型热处理/用途备注
}

export const MATERIALS: Material[] = [
  // 碳素结构钢
  { id: 'Q235', name: 'Q235', category: '碳素结构钢', sigmaS: 235, sigmaB: 375, sigmaNeg1: 160, hardnessHb: 120, eGPa: 206, density: 7.85, note: '普通焊接结构件、型材' },
  { id: '35', name: '35 钢(正火)', category: '优质碳素钢', sigmaS: 315, sigmaB: 530, sigmaNeg1: 210, hardnessHb: 156, eGPa: 206, density: 7.85, note: '正火,一般轴类' },
  { id: '45N', name: '45 钢(正火)', category: '优质碳素钢', sigmaS: 295, sigmaB: 590, sigmaNeg1: 227, hardnessHb: 170, eGPa: 206, density: 7.85, note: '正火,一般轴/齿轮坯,硬度较低好加工' },
  { id: '45T', name: '45 钢(调质)', category: '优质碳素钢', sigmaS: 355, sigmaB: 600, sigmaNeg1: 258, hardnessHb: 220, eGPa: 206, density: 7.85, note: '调质,最常用轴与齿轮坯' },
  { id: '55', name: '55 钢(调质)', category: '优质碳素钢', sigmaS: 380, sigmaB: 645, sigmaNeg1: 275, hardnessHb: 240, eGPa: 206, density: 7.85, note: '调质,弹簧与较高强度轴' },
  // 合金钢
  { id: '40Cr', name: '40Cr(调质)', category: '合金结构钢', sigmaS: 785, sigmaB: 980, sigmaNeg1: 430, hardnessHb: 280, eGPa: 206, density: 7.85, note: '调质,中等载荷轴/齿轮/螺柱' },
  { id: '42CrMo', name: '42CrMo(调质)', category: '合金结构钢', sigmaS: 930, sigmaB: 1080, sigmaNeg1: 490, hardnessHb: 310, eGPa: 206, density: 7.85, note: '调质,重载齿轮/高强度螺栓/高压缸体' },
  { id: '20CrMnTi', name: '20CrMnTi(渗碳淬火)', category: '合金结构钢', sigmaS: 850, sigmaB: 1080, sigmaNeg1: 470, hardnessHb: 320, eGPa: 206, density: 7.85, note: '渗碳淬火,汽车变速箱齿轮(表面 HRC58~62)' },
  { id: '30CrMnSiA', name: '30CrMnSiA(调质)', category: '合金结构钢', sigmaS: 885, sigmaB: 1080, sigmaNeg1: 455, hardnessHb: 300, eGPa: 206, density: 7.85, note: '调质,高强度结构件' },
  // 不锈钢
  { id: '304', name: '304 (06Cr19Ni10)', category: '不锈钢', sigmaS: 205, sigmaB: 515, sigmaNeg1: 205, hardnessHb: 160, eGPa: 193, density: 7.93, note: '奥氏体不锈钢,通用防腐' },
  { id: '316L', name: '316L (022Cr17Ni12Mo2)', category: '不锈钢', sigmaS: 170, sigmaB: 485, sigmaNeg1: 195, hardnessHb: 150, eGPa: 193, density: 7.98, note: '耐氯离子腐蚀,化工/海洋' },
  { id: '630', name: '630 (17-4PH)', category: '不锈钢', sigmaS: 930, sigmaB: 1070, sigmaNeg1: 480, hardnessHb: 330, eGPa: 196, density: 7.78, note: '沉淀硬化,高强度耐蚀轴/阀件' },
  // 铸铁
  { id: 'HT250', name: 'HT250', category: '铸铁', sigmaS: 250, sigmaB: 250, sigmaNeg1: 105, hardnessHb: 220, eGPa: 120, density: 7.28, note: '灰铸铁,机座/箱体(sigmaS 列为抗拉强度)' },
  { id: 'QT500', name: 'QT500-7', category: '铸铁', sigmaS: 320, sigmaB: 500, sigmaNeg1: 205, hardnessHb: 170, eGPa: 169, density: 7.20, note: '球墨铸铁,曲轴/阀体' },
  // 铝合金
  { id: '6061T6', name: '6061-T6', category: '铝合金', sigmaS: 240, sigmaB: 290, sigmaNeg1: 95, hardnessHb: 95, eGPa: 69, density: 2.70, note: '通用结构铝型材/轻量化支架' },
  { id: '7075T6', name: '7075-T6', category: '铝合金', sigmaS: 503, sigmaB: 572, sigmaNeg1: 160, hardnessHb: 150, eGPa: 72, density: 2.81, note: '航空级高强铝,工装夹具' },
  // 铜合金
  { id: 'QAl9-4', name: 'QAl9-4 铝青铜', category: '铜合金', sigmaS: 350, sigmaB: 550, sigmaNeg1: 210, hardnessHb: 130, eGPa: 110, density: 7.50, note: '滑动轴承/蜗轮(耐磨)' },
  { id: 'H62', name: 'H62 黄铜', category: '铜合金', sigmaS: 200, sigmaB: 370, sigmaNeg1: 130, hardnessHb: 110, eGPa: 100, density: 8.50, note: '垫片/导电/装饰件' },
  // 钛合金
  { id: 'TC4', name: 'TC4 (Ti-6Al-4V)', category: '钛合金', sigmaS: 825, sigmaB: 895, sigmaNeg1: 380, hardnessHb: 330, eGPa: 110, density: 4.43, note: '高比强度,航空航天/医疗' },
];

export const MATERIAL_CATEGORIES = [...new Set(MATERIALS.map((m) => m.category))];

export function findMaterial(id: string | null | undefined): Material | null {
  if (!id) return null;
  return MATERIALS.find((m) => m.id === id) ?? null;
}

/** σ-1 取值:优先取库值,否则按钢 0.43σb / 其他 0.35σb 估算 */
export function sigmaNeg1Of(m: Material): number {
  return m.sigmaNeg1 ?? Math.round(m.sigmaB * (m.eGPa > 180 ? 0.43 : 0.35));
}

/** 选择器选项(label 含关键参数提示) */
export function materialOptions(): Array<{ value: string; label: string }> {
  return [
    { value: '', label: '— 手动输入 —' },
    ...MATERIALS.map((m) => ({ value: m.id, label: `${m.name}(σs ${m.sigmaS} · σ-1 ${sigmaNeg1Of(m)} · E ${m.eGPa} GPa)` })),
  ];
}
