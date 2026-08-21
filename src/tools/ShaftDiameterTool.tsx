// 轴径计算工具页
import { useCallback } from 'react';
import type { HistoryRecord } from '../types';
import { SHAFT_DEFAULTS, calcShaft, shaftCopyText } from '../calc/shaftDiameter';
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
  mode: 'torque',
  torque: String(SHAFT_DEFAULTS.torque),
  power: '',
  speed: '',
  tau: String(SHAFT_DEFAULTS.tau),
  safety: String(SHAFT_DEFAULTS.safety),
};

export function ShaftDiameterTool({ digits, preset, onRestored, onSave, onToast }: Props) {
  const { form, setForm, errors, setErrors, result, setResult, run: rawRun, reset, copy, save } = useToolForm({
    toolId: 'shaft', toolName: '轴径计算', defaults: DEFAULTS,
    buildInput: (f) => ({
      mode: f.mode, torque: parseNum(f.torque), power: parseNum(f.power),
      speed: parseNum(f.speed), tau: parseNum(f.tau), safety: parseNum(f.safety),
    }),
    calc: (input, opt) => calcShaft(input as Parameters<typeof calcShaft>[0], opt),
    copyText: (input, d) => shaftCopyText(input as Parameters<typeof shaftCopyText>[0], d),
    makeParams: (f) => f.mode === 'torque'
      ? `扭矩 ${f.torque || '—'} N·m · [τ]=${f.tau || '—'} MPa · S=${f.safety || '—'}`
      : `功率 ${f.power || '—'} kW · n=${f.speed || '—'} rpm · [τ]=${f.tau || '—'} MPa · S=${f.safety || '—'}`,
    preset, digits, onRestored, onSave, onToast,
  });

  const run = useCallback(() => { rawRun(); touchUsage('shaft'); }, [rawRun]);
  useEnterSubmit(run);

  return (
    <div className="tool-layout">
      <div className="tool-form card card-pad">
        <div className="result-title">输入参数</div>
        <SegField
          label="载荷输入方式"
          value={form.mode as 'torque' | 'power'}
          onChange={(v) => { setForm({ ...form, mode: v }); setErrors({}); setResult(null); }}
          options={[{ value: 'torque', label: '已知扭矩' }, { value: 'power', label: '功率+转速' }]}
        />
        {form.mode === 'torque' ? (
          <NumField label="扭矩" symbol="T" value={form.torque} onChange={(v) => setForm({ ...form, torque: v })} unit="N·m" error={errors.torque} />
        ) : (
          <>
            <NumField label="传递功率" symbol="P" value={form.power} onChange={(v) => setForm({ ...form, power: v })} unit="kW" error={errors.power} />
            <NumField label="转速" symbol="n" value={form.speed} onChange={(v) => setForm({ ...form, speed: v })} unit="rpm" error={errors.speed} hint="由 T = 9550·P/n 换算扭矩" />
          </>
        )}
        <NumField label="许用扭应力" symbol="[τ]" value={form.tau} onChange={(v) => setForm({ ...form, tau: v })} unit="MPa" error={errors.tau} hint="常用 45 钢 ≈ 30~40 MPa" />
        <NumField label="安全系数" symbol="S" value={form.safety} onChange={(v) => setForm({ ...form, safety: v })} unit="—" error={errors.safety} hint="建议 ≥ 1.2" />
        <div className="btn-row">
          <button className="btn" onClick={run}>计算</button>
          <button className="btn ghost" onClick={reset}>重置</button>
        </div>
      </div>

      <CalcResult data={result} hasInput={!!result} onCopy={copy} onSave={save} onReset={reset} />
    </div>
  );
}
