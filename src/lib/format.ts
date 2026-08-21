// 数字格式化工具

/** 科学计数阈值 */
const EXP_HIGH = 1e6;
const EXP_LOW = 1e-3;

/** 格式化数字:工程风格,大/小数值自动转科学计数,带千分位 */
export function fmtNum(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  if (abs !== 0 && (abs >= EXP_HIGH || abs < EXP_LOW)) {
    return n.toExponential(Math.max(0, Math.min(digits, 4)));
  }
  return n.toLocaleString('zh-CN', {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  });
}

/** 数值 + 单位组合显示 */
export function fmtUnit(n: number, unit: string, digits = 2): string {
  return `${fmtNum(n, digits)} ${unit}`;
}

/** 解析用户输入字符串为有限数字,非法返回 null */
export function parseNum(raw: string): number | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (s === '') return null;
  const v = Number(s);
  return Number.isFinite(v) ? v : null;
}
