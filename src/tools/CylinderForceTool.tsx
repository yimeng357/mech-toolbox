// 气缸推力计算工具页
import { useCallback } from 'react';
import type { HistoryRecord } from '../types';
import { CYLINDER_DEFAULTS, calcCylinder, cylinderCopyText } from '../calc/cylinder';
import { parseNum } from '../lib/format';
import { touchUsage } from '../lib/history';
import { useToolForm } from '../lib/useToolForm';
import { useEnterSubmit } from '../lib/useEnterSubmit';
import { NumField, SegField } from '../components/Field';
import { CalcResult } from '../components/CalcResult';
import { PresetBar } from '../components/PresetBar';

interface Props {
  digits: number;
  preset: Record<string, string> | null;
  onRestored: () => void;
  onSave: (rec: HistoryRecord) => void;
  onToast: (msg: string) => void;
}

const DEFAULTS = {
  bore: String(CYLINDER_DEFAULTS.bore),
  rod: String(CYLINDER_DEFAULTS.rod),
  pressure: String(CYLINDER_DEFAULTS.pressure),
  direction: 'push',
  efficiency: String(CYLINDER_DEFAULTS.efficiency ?? 0.9),
  loadForce: '',
};

export function CylinderForceTool({ digits, preset, onRestored, onSave, onToast }: Props) {
  const { form, setForm, errors, result, run: rawRun, reset, copy, save, presets, savePreset, applyPreset, deletePresetById, presetSaved } = useToolForm({
    toolId: 'cylinder', toolName: '气缸推力', defaults: DEFAULTS,
    buildInput: (f) => ({
      bore: parseNum(f.bore), rod: parseNum(f.rod),
      pressure: parseNum(f.pressure), direction: f.direction,
      efficiency: parseNum(f.efficiency) ?? 0.9,
      loadForce: parseNum(f.loadForce),
    }),
    calc: (input, opt) => calcCylinder(input as Parameters<typeof calcCylinder>[0], opt),
    copyText: (input, d) => cylinderCopyText(input as Parameters<typeof cylinderCopyText>[0], d),
    makeParams: (f) => [
      `缸径 ${f.bore || '—'} mm`,
      `杆径 ${f.rod || '—'} mm`,
      `压力 ${f.pressure || '—'} MPa`,
      f.direction === 'push' ? '推出' : '缩回',
      `η=${f.efficiency || '—'}`,
      ...(parseNum(f.loadForce) != null && (parseNum(f.loadForce) as number) > 0 ? [`负载 ${f.loadForce} N`] : []),
    ].join(' · '),
    preset, digits, onRestored, onSave, onToast,
  });

  const run = useCallback(() => { rawRun(); touchUsage('cylinder'); }, [rawRun]);
  useEnterSubmit(run);

  return (
    <div className="tool-layout">
      <div className="tool-form card card-pad">
        <div className="result-title">输入参数</div>
        <NumField label="缸径" symbol="D" value={form.bore} onChange={(v) => setForm({ ...form, bore: v })} unit="mm" error={errors.bore} />
        <NumField label="杆径" symbol="d" value={form.rod} onChange={(v) => setForm({ ...form, rod: v })} unit="mm" error={errors.rod} hint="活塞杆直径,无杆取 0" />
        <NumField label="工作压力" symbol="p" value={form.pressure} onChange={(v) => setForm({ ...form, pressure: v })} unit="MPa" error={errors.pressure} />
        <SegField label="作用方向" value={form.direction as 'push' | 'pull'} onChange={(v) => setForm({ ...form, direction: v })} options={[{ value: 'push', label: '推出(推力)' }, { value: 'pull', label: '缩回(拉力)' }]} />
        <NumField label="机械效率" symbol="η" value={form.efficiency} onChange={(v) => setForm({ ...form, efficiency: v })} unit="—" error={errors.efficiency} hint="含摩擦与背压损失,常用 0.85~0.95" />
        <NumField label="外部负载(可选)" symbol="F_L" value={form.loadForce} onChange={(v) => setForm({ ...form, loadForce: v })} unit="N" error={errors.loadForce} hint="填入后自动校核负载率 β(气动建议 ≤70%)" />
        <PresetBar presets={presets} presetSaved={presetSaved} onSave={savePreset} onApply={applyPreset} onDelete={deletePresetById} />
        <div className="btn-row">
          <button className="btn" onClick={run}>计算</button>
          <button className="btn ghost" onClick={reset}>重置</button>
        </div>
      </div>

      <CalcResult data={result} hasInput={!!result} onCopy={copy} onSave={save} onReset={reset} />
    </div>
  );
}
