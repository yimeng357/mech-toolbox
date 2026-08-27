// 常用机械材料数据库
// 数据为手册常用典型值(GB/T 699、GB/T 3077、GB/T 1220、GB/T 3190 等),
// 不同热处理状态/规格的实测值会有差异,仅用于初步选型计算。

export interface Material {
  id: string;
  name: string;       // 牌号
  category: string;   // 类别
  sigmaS: number;     // 屈服强度 σs, MPa(灰铸铁取抗拉)
  sigmaB: number;     // 抗拉强度 σb, MPa
  eGPa: number;       // 弹性模量 E, GPa
  density: number;    // 密度, g/cm³
  note?: string;      // 典型热处理/用途备注
}

export const MATERIALS: Material[] = [
  // 碳素结构钢
  { id: 'Q235', name: 'Q235', category: '碳素结构钢', sigmaS: 235, sigmaB: 375, eGPa: 206, density: 7.85, note: '普通焊接结构件、型材' },
  { id: '35', name: '35 钢', category: '优质碳素钢', sigmaS: 315, sigmaB: 530, eGPa: 206, density: 7.85, note: '正火,一般轴类' },
  { id: '45', name: '45 钢', category: '优质碳素钢', sigmaS: 355, sigmaB: 600, eGPa: 206, density: 7.85, note: '正火/调质,最常用轴与齿轮坯' },
  { id: '55', name: '55 钢', category: '优质碳素钢', sigmaS: 380, sigmaB: 645, eGPa: 206, density: 7.85, note: '调质,弹簧与较高强度轴' },
  // 合金钢
  { id: '40Cr', name: '40Cr', category: '合金结构钢', sigmaS: 785, sigmaB: 980, eGPa: 206, density: 7.85, note: '调质,中等载荷轴/齿轮/螺柱' },
  { id: '42CrMo', name: '42CrMo', category: '合金结构钢', sigmaS: 930, sigmaB: 1080, eGPa: 206, density: 7.85, note: '调质,重载齿轮/高强度螺栓/高压缸体' },
  { id: '20CrMnTi', name: '20CrMnTi', category: '合金结构钢', sigmaS: 850, sigmaB: 1080, eGPa: 206, density: 7.85, note: '渗碳淬火,汽车变速箱齿轮' },
  { id: '30CrMnSiA', name: '30CrMnSiA', category: '合金结构钢', sigmaS: 885, sigmaB: 1080, eGPa: 206, density: 7.85, note: '调质,高强度结构件' },
  // 不锈钢
  { id: '304', name: '304 (06Cr19Ni10)', category: '不锈钢', sigmaS: 205, sigmaB: 515, eGPa: 193, density: 7.93, note: '奥氏体不锈钢,通用防腐' },
  { id: '316L', name: '316L (022Cr17Ni12Mo2)', category: '不锈钢', sigmaS: 170, sigmaB: 485, eGPa: 193, density: 7.98, note: '耐氯离子腐蚀,化工/海洋' },
  { id: '630', name: '630 (17-4PH)', category: '不锈钢', sigmaS: 930, sigmaB: 1070, eGPa: 196, density: 7.78, note: '沉淀硬化,高强度耐蚀轴/阀件' },
  // 铸铁
  { id: 'HT250', name: 'HT250', category: '铸铁', sigmaS: 250, sigmaB: 250, eGPa: 120, density: 7.28, note: '灰铸铁,机座/箱体(sigmaS 列为抗拉强度)' },
  { id: 'QT500', name: 'QT500-7', category: '铸铁', sigmaS: 320, sigmaB: 500, eGPa: 169, density: 7.20, note: '球墨铸铁,曲轴/阀体' },
  // 铝合金
  { id: '6061T6', name: '6061-T6', category: '铝合金', sigmaS: 240, sigmaB: 290, eGPa: 69, density: 2.70, note: '通用结构铝型材/轻量化支架' },
  { id: '7075T6', name: '7075-T6', category: '铝合金', sigmaS: 503, sigmaB: 572, eGPa: 72, density: 2.81, note: '航空级高强铝,工装夹具' },
  // 铜合金
  { id: 'QAl9-4', name: 'QAl9-4 铝青铜', category: '铜合金', sigmaS: 350, sigmaB: 550, eGPa: 110, density: 7.50, note: '滑动轴承/蜗轮(耐磨)' },
  { id: 'H62', name: 'H62 黄铜', category: '铜合金', sigmaS: 200, sigmaB: 370, eGPa: 100, density: 8.50, note: '垫片/导电/装饰件' },
  // 钛合金
  { id: 'TC4', name: 'TC4 (Ti-6Al-4V)', category: '钛合金', sigmaS: 825, sigmaB: 895, eGPa: 110, density: 4.43, note: '高比强度,航空航天/医疗' },
];

export const MATERIAL_CATEGORIES = [...new Set(MATERIALS.map((m) => m.category))];

export function findMaterial(id: string | null | undefined): Material | null {
  if (!id) return null;
  return MATERIALS.find((m) => m.id === id) ?? null;
}

/** 选择器选项(label 含关键参数提示) */
export function materialOptions(): Array<{ value: string; label: string }> {
  return [
    { value: '', label: '— 手动输入 —' },
    ...MATERIALS.map((m) => ({ value: m.id, label: `${m.name}(σs ${m.sigmaS} · E ${m.eGPa} GPa)` })),
  ];
}
