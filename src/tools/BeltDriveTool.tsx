// 同步带与 V 带传动计算工具页
import { useCallback } from 'react';
import type { HistoryRecord } from '../types';
import { BELT_DRIVE_DEFAULTS, calcBeltDrive, beltDriveCopyText, type BeltType } from '../calc/beltDrive';
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
  beltType: BELT_DRIVE_DEFAULTS.beltType,
  powerKw: String(BELT_DRIVE_DEFAULTS.powerKw),
  speedRpm: String(BELT_DRIVE_DEFAULTS.speedRpm),
  ratio: String(BELT_DRIVE_DEFAULTS.ratio),
  d1: String(BELT_DRIVE_DEFAULTS.d1),
  pitch: String(BELT_DRIVE_DEFAULTS.pitch),
  a0: String(BELT_DRIVE_DEFAULTS.a0),
  serviceFactor: String(BELT_DRIVE_DEFAULTS.serviceFactor),
};

export function BeltDriveTool({ digits, preset, onRestored, onSave, onToast }: Props) {
  const { form, setForm, errors, result, setResult, run: rawRun, reset, copy, save } = useToolForm({
    toolId: 'belt', toolName: '同步带与 V 带', defaults: DEFAULTS,
    buildInput: (f) => ({
      beltType: f.beltType as BeltType,
      powerKw: parseNum(f.powerKw), speedRpm: parseNum(f.speedRpm),
      ratio: parseNum(f.ratio), d1: parseNum(f.d1), pitch: parseNum(f.pitch),
      a0: parseNum(f.a0), serviceFactor: parseNum(f.serviceFactor),
    }),
    calc: (input, opt) => calcBeltDrive(input as Parameters<typeof calcBeltDrive>[0], opt),
    copyText: (input, d) => beltDriveCopyText(input as Parameters<typeof beltDriveCopyText>[0], d),
    makeParams: (f) => `${f.beltType === 'TIMING' ? '同步带' : 'V 带'} · P=${f.powerKw || '—'}kW · n1=${f.speedRpm || '—'}rpm · i=${f.ratio || '—'} · d1=${f.d1 || '—'}mm`,
    preset, digits, onRestored, onSave, onToast,
  });

  const run = useCallback(() => { rawRun(); touchUsage('belt'); }, [rawRun]);
  useEnterSubmit(run);

  return (
    <div className="tool-layout">
      <div className="tool-form card card-pad">
        <div className="result-title">输入参数</div>
        <SegField
          label="带型"
          value={form.beltType as BeltType}
          onChange={(v) => { setForm({ ...form, beltType: v }); setResult(null); }}
          options={[{ value: 'TIMING', label: '同步带' }, { value: 'V_BELT', label: 'V 带' }]}
        />
        <NumField label="传递功率" symbol="P" value={form.powerKw} onChange={(v) => setForm({ ...form, powerKw: v })} unit="kW" error={errors.powerKw} presets={[0.75, 1.5, 2.2, 4, 7.5]} />
        <NumField label="主动轮转速" symbol="n₁" value={form.speedRpm} onChange={(v) => setForm({ ...form, speedRpm: v })} unit="rpm" error={errors.speedRpm} presets={[960, 1450, 2880]} />
        <NumField label="传动比" symbol="i" value={form.ratio} onChange={(v) => setForm({ ...form, ratio: v })} unit="—" error={errors.ratio} hint="i = n₁/n₂ = d₂/d₁" />
        <NumField label="小带轮节径" symbol="d₁" value={form.d1} onChange={(v) => setForm({ ...form, d1: v })} unit="mm" error={errors.d1} />
        {form.beltType === 'TIMING' && (
          <NumField label="带齿节距" symbol="pb" value={form.pitch} onChange={(v) => setForm({ ...form, pitch: v })} unit="mm" error={errors.pitch} hint="MXL=2.032 · XL=5.08 · L=9.525 · H=12.7 mm" />
        )}
        <NumField label="初定中心距" symbol="a₀" value={form.a0} onChange={(v) => setForm({ ...form, a0: v })} unit="mm" error={errors.a0} hint="一般取 (0.7~2)·(d₁+d₂)" />
        <NumField label="工况系数" symbol="KA" value={form.serviceFactor} onChange={(v) => setForm({ ...form, serviceFactor: v })} unit="—" error={errors.serviceFactor} hint="平稳载荷 1.0~1.2,冲击载荷 1.3~1.5" />
        <div className="btn-row">
          <button className="btn" onClick={run}>计算</button>
          <button className="btn ghost" onClick={reset}>重置</button>
        </div>
      </div>

      <CalcResult data={result} hasInput={!!result} onCopy={copy} onSave={save} onReset={reset} />
    </div>
  );
}
