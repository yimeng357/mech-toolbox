// 全局共享类型定义

export type ToolId = 'cylinder' | 'bolt' | 'shaft' | 'flange' | 'vessel';
export type ViewName = 'dashboard' | ToolId | 'convert' | 'history' | 'settings';

/** 一条计算结果(带标签、值、单位) */
export interface ResultItem {
  label: string;
  value: string;
  unit?: string;
  /** 主结果:展示时高亮 */
  primary?: boolean;
  /** 结果语气(用于安全判断等) */
  tone?: 'ok' | 'warn' | 'bad';
}

/** 计算模块返回的结构化结果 */
export interface CalcResultData {
  /** 主公式 */
  formula: string;
  /** 附加公式 */
  formulaAlt?: string;
  /** 计算过程(逐行) */
  steps: string[];
  /** 结果列表 */
  results: ResultItem[];
  /** 附加说明 */
  note?: string;
  /** 是否显示"仅用于初步计算"提示 */
  disclaimer?: boolean;
}

/** 计算模块统一的返回结构 */
export interface CalcOutcome {
  ok: boolean;
  /** 字段级错误:key 为表单字段名 */
  fieldErrors?: Record<string, string>;
  result?: CalcResultData;
}

/** 计算选项(如小数位数) */
export interface CalcOption {
  digits: number;
}

/** 历史记录 */
export interface HistoryRecord {
  id: string;
  toolId: ToolId;
  toolName: string;
  time: number;
  /** 结果摘要(一行) */
  summary: string;
  /** 输入参数文本 */
  params: string;
  /** 完整可复制文本 */
  copy: string;
  /** 用于"载入参数"恢复表单 */
  inputs: Record<string, string>;
}

/** 主题 */
export type ThemeMode = 'dark' | 'light' | 'system';

/** 应用设置 */
export interface AppSettings {
  theme: ThemeMode;
  digits: number;
}

export const DEFAULT_SETTINGS: AppSettings = { theme: 'dark', digits: 2 };
