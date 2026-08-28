// 参数预设管理(「我的设备/我的材料」参数槽,localStorage 持久化)
// 每条预设:工具 + 命名参数快照;同工具可存多套(如 200 bar / 600 bar 两台设备)
import type { ToolId } from '../types';

const PRESETS_KEY = '***';
const PRESETS_SCHEMA_KEY = '***';

export interface ToolPreset {
  id: string;
  toolId: ToolId;
  name: string;             // 用户命名,如「600bar 试验台」
  inputs: Record<string, string>;
  time: number;
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

/** 列出全部预设(新→旧) */
export function listPresets(): ToolPreset[] {
  return safeGet<ToolPreset[]>(PRESETS_KEY, []);
}

/** 某工具的预设列表 */
export function toolPresets(toolId: ToolId): ToolPreset[] {
  return listPresets().filter((p) => p.toolId === toolId);
}

/** 保存预设(同名覆盖更新) */
export function savePreset(toolId: ToolId, name: string, inputs: Record<string, string>): ToolPreset[] {
  const list = listPresets();
  const cleanName = name.trim() || '默认预设';
  const existIdx = list.findIndex((p) => p.toolId === toolId && p.name === cleanName);
  if (existIdx >= 0) {
    list[existIdx] = { ...list[existIdx], inputs: { ...inputs }, time: Date.now() };
  } else {
    list.unshift({
      id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      toolId,
      name: cleanName,
      inputs: { ...inputs },
      time: Date.now(),
    });
  }
  safeSet(PRESETS_KEY, list);
  safeSet(PRESETS_SCHEMA_KEY, String(2));
  return list;
}

/** 删除预设 */
export function deletePreset(id: string): ToolPreset[] {
  const list = listPresets().filter((p) => p.id !== id);
  safeSet(PRESETS_KEY, list);
  return list;
}

/** 取单个预设 */
export function getPreset(id: string): ToolPreset | null {
  return listPresets().find((p) => p.id === id) ?? null;
}
