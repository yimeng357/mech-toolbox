// 液压缸活塞杆压杆稳定校核(欧拉公式 + 约翰逊抛物线)
//   惯性半径 i = d/4(实心圆杆),柔度 λ = μ·L/i = 4μL/d
//   极限柔度 λp = π·√(E/σs):λ ≥ λp 属大柔度杆 → 欧拉公式
//     Fcr = π²·E·I/(μL)² ,I = π·d⁴/64(MPa·mm⁴/mm² → N)
//   中柔度杆(λ < λp)→ 约翰逊抛物线 σcr = σs − σs²λ²/(4π²E)(与欧拉式在 λp 处连续)
//   短粗杆(λ < 20)  → 强度控制,σcr ≈ σs,稳定性不控制设计
//   稳定性安全系数 n = Fcr/F,液压缸一般要求 n ≥ 2~4(重载/偏载取大值)
import type { CalcOption, CalcOutcome } from '../types';
import { fmtNum } from '../lib/format';

export type EndFixity = 'PIN_PIN' | 'FIXED_FREE' | 'FIXED_PIN' | 'FIXED_FIXED';

/** 端部约束的长度折算系数 μ(欧拉计算长度 Lc = μ·L) */
export const END_FIXITY_MU: Record<EndFixity, number> = {
  PIN_PIN: 1.0,
  FIXED_FREE: 2.0,
  FIXED_PIN: 0.7,
  FIXED_FIXED: 0.5,
};

export const END_FIXITY_LABELS: Record<EndFixity, string> = {
  PIN_PIN: '两端铰接',
  FIXED_FREE: '一端固定一端自由',
  FIXED_PIN: '一端固定一端铰接',
  FIXED_FIXED: '两端固定',
};

export interface CylinderBucklingInput {
  rodDiaMm: number;             // 活塞杆直径 d, mm
  effLenMm: number;             // 计算长度 L, mm(最大伸展时的受压长度 ≈ 行程 + 最小安装导向距)
  endFixity?: EndFixity;        // 端部约束方式(默认两端铰接)
  loadKN?: number;              // 实际轴向载荷 F, kN(可选,用于安全系数与压应力)
  yieldMpa?: number;            // 杆材料屈服强度 σs, MPa(可选,中柔度段判定需要)
  youngModulusGPa?: number;     // 弹性模量 E, GPa(默认 206,钢)
  safetyRequired?: number;      // 要求稳定安全系数 n_req(默认 3)
}

export const CYLINDER_BUCKLING_DEFAULTS: Required<CylinderBucklingInput> = {
  rodDiaMm: 45,
  effLenMm: 2000,
  endFixity: 'PIN_PIN',
  loadKN: 80,
  yieldMpa: 785,
  youngModulusGPa: 206,
  safetyRequired: 3,
};

export function calcRodBuckling(input: CylinderBucklingInput, opt: CalcOption = { digits: 2 }): CalcOutcome {
  const {
    rodDiaMm: d,
    effLenMm: L,
    endFixity = 'PIN_PIN',
    // 载荷为可选项:不填时不做安全系数判定,只给临界承载能力
    loadKN: FkN,
    yieldMpa: sigmaS = CYLINDER_BUCKLING_DEFAULTS.yieldMpa,
    youngModulusGPa: EGPa = CYLINDER_BUCKLING_DEFAULTS.youngModulusGPa,
    safetyRequired: nReq = CYLINDER_BUCKLING_DEFAULTS.safetyRequired,
  } = input;

  const fe: Record<string, string> = {};
  if (d == null || Number.isNaN(d)) fe.rodDiaMm = '请输入活塞杆直径';
  else if (d <= 0) fe.rodDiaMm = '直径必须大于 0';
  if (L == null || Number.isNaN(L)) fe.effLenMm = '请输入计算长度';
  else if (L <= 0) fe.effLenMm = '长度必须大于 0';
  if (FkN != null && (Number.isNaN(FkN) || FkN < 0)) fe.loadKN = '载荷不能为负';
  if (sigmaS != null && (Number.isNaN(sigmaS) || sigmaS <= 0)) fe.yieldMpa = '屈服强度必须大于 0';
  if (EGPa != null && (Number.isNaN(EGPa) || EGPa < 10 || EGPa > 700)) fe.youngModulusGPa = '弹性模量应在 10~700 GPa';
  if (nReq != null && (Number.isNaN(nReq) || nReq < 1 || nReq > 10)) fe.safetyRequired = '安全系数应在 1~10';

  if (Object.keys(fe).length) return { ok: false, fieldErrors: fe };

  const fmt = (n: number) => fmtNum(n, opt.digits);
  const steps: string[] = [];
  const mu = END_FIXITY_MU[endFixity];
  const E = EGPa * 1000;                       // MPa (= N/mm²)

  // 截面几何
  const area = (Math.PI / 4) * d * d;          // mm²
  const inertia = (Math.PI / 64) * Math.pow(d, 4); // mm⁴
  const radiusGyration = d / 4;                // mm
  steps.push(`截面面积 A = (π/4)d² = ${fmt(area)} mm²,惯性矩 I = (π/64)d⁴ = ${fmt(inertia)} mm⁴`);
  steps.push(`惯性半径 i = d/4 = ${fmt(radiusGyration)} mm`);

  // 柔度
  const lambda = (mu * L) / radiusGyration;
  steps.push(`柔度 λ = μ·L/i = ${fmt(mu)} × ${fmt(L)} / ${fmt(radiusGyration)} = ${fmt(lambda)}(${END_FIXITY_LABELS[endFixity]},μ=${fmt(mu)})`);

  // 失稳模式判别
  let mode: string;
  let sigmaCr: number | null = null;
  let fCrN: number;

  if (sigmaS == null || Number.isNaN(sigmaS)) {
    // 未提供屈服强度:仅按欧拉校核
    mode = '大柔度 · 欧拉';
    fCrN = (Math.PI * Math.PI * E * inertia) / Math.pow(mu * L, 2);
    sigmaCr = fCrN / area;
    steps.push(`未填屈服强度,按欧拉公式直接计算临界力`);
    steps.push(`Fcr = π²EI/(μL)² = π² × ${fmt(E)} × ${fmt(inertia)} / (${fmt(mu)}×${fmt(L)})² = ${fmt(fCrN / 1000)} kN`);
  } else {
    const lambdaP = Math.PI * Math.sqrt(E / sigmaS);
    steps.push(`极限柔度 λp = π√(E/σs) = π√(${fmt(E)}/${fmt(sigmaS)}) = ${fmt(lambdaP)}`);
    if (lambda < 20) {
      mode = '短粗 · 强度控制';
      sigmaCr = sigmaS;
      fCrN = sigmaCr * area;
      steps.push(`λ < 20 属短粗杆,失稳不控制设计,临界应力 σcr ≈ σs = ${fmt(sigmaCr)} MPa`);
      steps.push(`Fcr = σcr·A = ${fmt(sigmaCr)} × ${fmt(area)} = ${fmt(fCrN / 1000)} kN`);
    } else if (lambda >= lambdaP) {
      mode = '大柔度 · 欧拉';
      fCrN = (Math.PI * Math.PI * E * inertia) / Math.pow(mu * L, 2);
      sigmaCr = fCrN / area;
      steps.push(`λ ≥ λp 属大柔度杆,采用欧拉公式:`);
      steps.push(`Fcr = π²EI/(μL)² = ${fmt(fCrN / 1000)} kN,对应 σcr = ${fmt(sigmaCr)} MPa`);
    } else {
      mode = '中柔度 · 约翰逊';
      sigmaCr = sigmaS - (sigmaS * sigmaS * lambda * lambda) / (4 * Math.PI * Math.PI * E);
      fCrN = sigmaCr * area;
      steps.push(`λp > λ ≥ 20 属中柔度杆,欧拉公式偏危险,采用约翰逊抛物线:`);
      steps.push(`σcr = σs − σs²λ²/(4π²E) = ${fmt(sigmaCr)} MPa,Fcr = σcr·A = ${fmt(fCrN / 1000)} kN`);
    }
  }

  const fCrKN = fCrN / 1000;
  const allowableKN = fCrKN / nReq;

  const results: Array<{ label: string; value: string; unit?: string; primary?: boolean; tone?: 'ok' | 'warn' | 'bad' }> = [
    { label: '临界失稳力 Fcr', value: fmt(fCrKN), unit: 'kN', primary: true },
    { label: `许用轴向力 Fcr/n(n=${fmt(nReq)})`, value: fmt(allowableKN), unit: 'kN' },
    { label: '柔度 λ', value: fmt(lambda), unit: '—', tone: lambda >= 120 ? ('warn' as const) : undefined },
    { label: '失稳模式', value: mode, unit: '—' },
    { label: '临界应力 σcr', value: fmt(sigmaCr ?? NaN), unit: 'MPa' },
  ];

  // 有实际载荷时给出安全系数判定
  if (FkN != null && !Number.isNaN(FkN) && FkN > 0) {
    const fN = FkN * 1000;
    const nActual = fCrN / fN;
    const compressStress = fN / area;
    const tone: 'ok' | 'warn' | 'bad' = nActual >= nReq ? 'ok' : nActual >= 0.7 * nReq ? 'warn' : 'bad';
    results.push({ label: '实际安全系数 n = Fcr/F', value: fmt(nActual), unit: `(vs ${fmt(FkN)} kN)`, tone });
    results.push({ label: '杆截面压应力 σ', value: fmt(compressStress), unit: 'MPa', tone: compressStress > sigmaS / 2 ? 'warn' : undefined });

    return {
      ok: true,
      result: {
        formula: 'Fcr = π²EI/(μL)² · λ = μL/i',
        formulaAlt: 'i = d/4(实心圆杆);λp = π√(E/σs);中柔度:σcr = σs − σs²λ²/(4π²E)',
        steps,
        results,
        note: [
          `计算长度应取活塞杆完全伸出且承受最大轴向压力时的受压段总长(≈ 行程 + 安装/导向最小距离)。`,
          tone === 'bad'
            ? '⚠️ 当前安全系数不足:细长比过大或载荷过高,建议加大杆径、改用多级结构、缩短行程或改变安装约束(如增设导向支承)。'
            : '工程上液压缸稳定安全系数一般取 2~4:轻载静载可取 2~3,重载、冲击或偏载工况建议 ≥4。',
          '本模块仅校核活塞杆整体失稳;缸筒壁厚、螺纹连接与局部挤压需另行校核。',
        ].join(' '),
        disclaimer: true,
      },
    };
  }

  return {
    ok: true,
    result: {
      formula: 'Fcr = π²EI/(μL)² · λ = μL/i',
      formulaAlt: 'i = d/4(实心圆杆);λp = π√(E/σs)',
      steps,
      results,
      note: [
        `计算长度应取活塞杆完全伸出且承受最大轴向压力时的受压段总长(≈ 行程 + 安装/导向最小距离)。`,
        '未填写实际载荷,以上为临界承载能力;建议补充载荷以获得安全系数判定。液压缸稳定安全系数一般取 2~4。',
      ].join(' '),
      disclaimer: true,
    },
  };
}

export function rodBucklingCopyText(input: CylinderBucklingInput, digits = 2): string {
  const fmt = (n: number) => fmtNum(n, digits);
  const o = calcRodBuckling(input, { digits });
  if (!o.result) return '';
  const r = o.result;
  return [
    '【液压缸活塞杆压杆稳定】',
    `${END_FIXITY_LABELS[input.endFixity ?? 'PIN_PIN']} · 杆径 d=${fmt(input.rodDiaMm)} mm · 计算长度 L=${fmt(input.effLenMm)} mm`,
    `E=${fmt(input.youngModulusGPa ?? 206)} GPa · σs=${input.yieldMpa != null ? fmt(input.yieldMpa) : '—'} MPa${input.loadKN != null ? ` · F=${fmt(input.loadKN)} kN` : ''}`,
    '',
    ...r.steps.map((s, i) => `${i + 1}. ${s}`),
    '',
    ...r.results.map((x) => `${x.label}: ${x.value}${x.unit ? ' ' + x.unit : ''}`),
  ].join('\n');
}
