// 液压蓄能器容积计算工具页
import { useCallback } from 'react';
import type { HistoryRecord } from '../types';
import { ACCUMULATOR_DEFAULTS, calcAccumulator, accumulatorCopyText, type AccumulatorMode, type AccumulatorProcess } from '../calc/accumulator';
import { parseNum } from '../lib/format';
import { touchUsage } from '../lib/history';
import { useToolForm } from '../lib/useToolForm';
import { useEnterSubmit } from '../lib/useEnterSubmit';
import { NumField, SegField } from '../components/Field';
import { CalcResult } from '../components/CalcResult';

interface Props {
  digits: number;
  preset: Record<string, string> | null;
  onRestored: () => void;
  onSave: (rec: HistoryRecord) => void;
  onToast: (msg: string) => void;
}

const DEFAULTS = {
  mode: ACCUMULATOR_DEFAULTS.mode,
  deltaV: String(ACCUMULATOR_DEFAULTS.deltaV),
  p2: String(ACCUMULATOR_DEFAULTS.p2),
  p1: String(ACCUMULATOR_DEFAULTS.p1),
  processType: ACCUMULATOR_DEFAULTS.processType,
};

export function AccumulatorTool({ digits, preset, onRestored, onSave, onToast }: Props) {
  const { form, setForm, errors, result, setResult, run: rawRun, reset, copy, save } = useToolForm({
    toolId: 'accumulator', toolName: '液压蓄能器', defaults: DEFAULTS,
    buildInput: (f) => ({
      mode: f.mode as AccumulatorMode,
      deltaV: parseNum(f.deltaV), p2: parseNum(f.p2), p1: parseNum(f.p1),
      processType: f.processType as AccumulatorProcess,
    }),
    calc: (input, opt) => calcAccumulator(input as Parameters<typeof calcAccumulator>[0], opt),
    copyText: (input, d) => accumulatorCopyText(input as Parameters<typeof accumulatorCopyText>[0], d),
    makeParams: (f) => `${f.mode === 'EMERGENCY_POWER' ? '应急' : f.mode === 'LEAK_COMPENSATION' ? '补偿' : '缓冲'} · ΔV=${f.deltaV || '—'}L · p1=${f.p1 || '—'} · p2=${f.p2 || '—'}bar`,
    preset, digits, onRestored, onSave, onToast,
  });

  const run = useCallback(() => { rawRun(); touchUsage('accumulator'); }, [rawRun]);
  useEnterSubmit(run);

  return (
    <div className="tool-layout">
      <div className="tool-form card card-pad">
        <div className="result-title">输入参数</div>
        <SegField
          label="工作模式"
          value={form.mode as AccumulatorMode}
          onChange={(v) => { setForm({ ...form, mode: v }); setResult(null); }}
          options={[
            { value: 'EMERGENCY_POWER', label: '应急动力' },
            { value: 'LEAK_COMPENSATION', label: '泄漏补偿' },
            { value: 'SHOCK_ABSORPTION', label: '冲击吸收' },
          ]}
        />
        <NumField label="有效释放油量" symbol="ΔV" value={form.deltaV} onChange={(v) => setForm({ ...form, deltaV: v })} unit="L" error={errors.deltaV} />
        <NumField label="最高工作压力" symbol="p₂" value={form.p2} onChange={(v) => setForm({ ...form, p2: v })} unit="bar" error={errors.p2} />
        <NumField label="最低工作压力" symbol="p₁" value={form.p1} onChange={(v) => setForm({ ...form, p1: v })} unit="bar" error={errors.p1} hint="必须低于最高压力 p₂" />
        <SegField
          label="气体过程"
          value={form.processType as AccumulatorProcess}
          onChange={(v) => setForm({ ...form, processType: v })}
          options={[{ value: 'ADIABATIC', label: '绝热(n=1.4)' }, { value: 'ISOTHERMAL', label: '等温(n=1.0)' }]}
        />
        <div className="btn-row">
          <button className="btn" onClick={run}>计算</button>
          <button className="btn ghost" onClick={reset}>重置</button>
        </div>
      </div>

      <CalcResult data={result} hasInput={!!result} onCopy={copy} onSave={save} onReset={reset} />
    </div>
  );
}
