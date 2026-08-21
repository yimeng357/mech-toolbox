// 历史记录与使用统计(localStorage)

import type { CalcResultData, HistoryRecord, ToolId } from '../types';

const HISTORY_KEY = 'mech_history_v1';
const USAGE_KEY = 'mech_usage_v1';

export interface UsageStat {
  count: number;
  lastUsed: number;
}

function safeGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 存储满等情况静默失败 */
  }
}

/** 列出全部历史记录,新→旧 */
export function listHistory(): HistoryRecord[] {
  return safeGet<HistoryRecord[]>(HISTORY_KEY, []);
}

export function addHistory(rec: HistoryRecord): HistoryRecord[] {
  const list = [rec, ...listHistory()].slice(0, 500);
  safeSet(HISTORY_KEY, list);
  return list;
}

export function removeHistory(id: string): HistoryRecord[] {
  const list = listHistory().filter((r) => r.id !== id);
  safeSet(HISTORY_KEY, list);
  return list;
}

export function clearHistory(): void {
  localStorage.removeItem(HISTORY_KEY);
}

/** 组装一条历史记录(摘要取主结果) */
export function makeHistoryRecord(opts: {
  toolId: ToolId;
  toolName: string;
  inputs: Record<string, string>;
  params: string;
  copy: string;
  result: CalcResultData;
}): HistoryRecord {
  const primary = opts.result.results.find((r) => r.primary);
  const summary = primary
    ? `${opts.toolName}: ${primary.value}${primary.unit ? ' ' + primary.unit : ''}`
    : opts.toolName;
  return {
    id: `h_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    toolId: opts.toolId,
    toolName: opts.toolName,
    time: Date.now(),
    summary,
    params: opts.params,
    copy: opts.copy,
    inputs: opts.inputs,
  };
}

/** 记录某工具使用一次(用于"最近使用/常用工具") */
export function touchUsage(toolId: ToolId): void {
  const usage = safeGet<Record<string, UsageStat>>(USAGE_KEY, {});
  const cur = usage[toolId] || { count: 0, lastUsed: 0 };
  usage[toolId] = { count: cur.count + 1, lastUsed: Date.now() };
  safeSet(USAGE_KEY, usage);
}

export function getUsage(): Record<string, UsageStat> {
  return safeGet<Record<string, UsageStat>>(USAGE_KEY, {});
}

/** 最近使用(按最近时间) */
export function recentTools(usage: Record<string, UsageStat>, limit = 4): ToolId[] {
  return Object.entries(usage)
    .sort((a, b) => b[1].lastUsed - a[1].lastUsed)
    .slice(0, limit)
    .map(([id]) => id as ToolId);
}

/** 常用工具(按次数) */
export function popularTools(usage: Record<string, UsageStat>, limit = 4): ToolId[] {
  return Object.entries(usage)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, limit)
    .map(([id]) => id as ToolId);
}
