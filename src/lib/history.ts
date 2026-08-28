// 历史记录与使用统计(localStorage)

import type { CalcResultData, HistoryRecord, ToolId } from '../types';

const HISTORY_KEY = 'mech_history_v1';
const USAGE_KEY = 'mech_usage_v1';
const SCHEMA_VERSION_KEY = '***';

/** 当前存储结构版本;破坏性变更时递增并在 MIGRATIONS 中登记迁移函数 */
export const STORAGE_SCHEMA_VERSION = 2;

/** 版本迁移链 */
const MIGRATIONS: Record<number, (data: unknown) => unknown> = {
  1: (data) => {
    if (!Array.isArray(data)) return data;
    return data.map((rec: Record<string, unknown>) => ({
      id: rec.id ?? 'h_migrated_' + Math.random().toString(36).slice(2, 8),
      toolId: rec.toolId ?? 'cylinder',
      toolName: rec.toolName ?? '未知工具',
      time: rec.time ?? 0,
      summary: rec.summary ?? '',
      params: rec.params ?? '',
      copy: rec.copy ?? '',
      inputs: rec.inputs ?? {},
    }));
  },
};

/** 读取时执行版本迁移(迁移后回写并更新版本标记) */
function migrate<T>(key: string, raw: string, fallback: T): T {
  try {
    const data = JSON.parse(raw);
    let version = Number(localStorage.getItem(SCHEMA_VERSION_KEY) ?? '1');
    if (!Number.isFinite(version) || version < 1) version = 1;
    let current = data;
    while (version < STORAGE_SCHEMA_VERSION) {
      const step = MIGRATIONS[version];
      if (!step) break;
      current = step(current);
      version += 1;
    }
    localStorage.setItem(SCHEMA_VERSION_KEY, String(STORAGE_SCHEMA_VERSION));
    safeSet(key, current);
    return current as T;
  } catch {
    return fallback;
  }
}

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
  const raw = localStorage.getItem(HISTORY_KEY);
  if (!raw) return [];
  return migrate<HistoryRecord[]>(HISTORY_KEY, raw, []);
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
