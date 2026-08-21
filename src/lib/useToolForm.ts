// 通用工具表单 Hook:减少五个工具页重复的状态管理代码
import { useCallback, useEffect, useState } from 'react';
import type { CalcOutcome, CalcResultData, HistoryRecord, ToolId } from '../types';

export interface UseToolFormOpts {
  toolId: ToolId;
  toolName: string;
  defaults: { [key: string]: string };
  buildInput: (form: { [key: string]: string }) => unknown;
  calc: (input: unknown, opt: { digits: number }) => CalcOutcome;
  copyText: (input: unknown, digits: number) => string;
  makeParams: (form: { [key: string]: string }) => string;
  preset: { [key: string]: string } | null;
  digits: number;
  onRestored: () => void;
  onSave: (rec: HistoryRecord) => void;
  onToast: (msg: string) => void;
}

export function useToolForm(opts: UseToolFormOpts) {
  const { toolId, toolName, defaults, buildInput, calc, copyText, makeParams, preset, digits, onRestored, onSave, onToast } = opts;

  const [form, setForm] = useState<{ [key: string]: string }>({ ...defaults });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<CalcResultData | null>(null);

  useEffect(() => {
    if (!preset) return;
    setForm((f) => {
      const merged = { ...f };
      for (const k of Object.keys(f)) {
        if (k in preset) merged[k] = preset[k];
      }
      return merged;
    });
    setResult(null);
    onRestored();
  }, [preset, onRestored]);

  const run = useCallback(() => {
    const input = buildInput(form);
    const o = calc(input, { digits });
    if (!o.ok) { setErrors(o.fieldErrors ?? {}); return; }
    setErrors({});
    setResult(o.result!);
  }, [form, buildInput, calc, digits]);

  const reset = useCallback(() => {
    setForm({ ...defaults });
    setErrors({});
    setResult(null);
  }, [defaults]);

  const copy = useCallback(async () => {
    const input = buildInput(form);
    const text = copyText(input, digits);
    if (!text) return;
    try { await navigator.clipboard.writeText(text); onToast('已复制到剪贴板'); }
    catch { onToast('复制失败,请手动复制'); }
  }, [form, buildInput, copyText, digits, onToast]);

  const save = useCallback(() => {
    if (!result) return;
    const input = buildInput(form);
    onSave({
      id: `h_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      toolId,
      toolName,
      time: Date.now(),
      summary: (() => {
        const primary = result.results.find((r) => r.primary);
        return primary ? `${toolName}: ${primary.value}${primary.unit ? ' ' + primary.unit : ''}` : toolName;
      })(),
      params: makeParams(form),
      copy: copyText(input, digits),
      inputs: { ...form },
    });
  }, [form, result, buildInput, copyText, makeParams, toolId, toolName, digits, onSave]);

  return { form, setForm, errors, setErrors, result, setResult, run, reset, copy, save };
}
