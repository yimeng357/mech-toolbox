// 螺栓预紧力计算工具页
import { useCallback, useEffect } from 'react';
import type { HistoryRecord } from '../types';
import { BOLT_DEFAULTS, BOLT_GRADES, METRIC_BOLTS, calcBolt, boltCopyText } from '../calc/boltPreload';
import { parseNum } from '../lib/format';
import { touchUsage } from '../lib/history';
import { useToolForm } from '../lib/useToolForm';
import { useEnterSubmit } from '../lib/useEnterSubmit';
import { NumField, SelectField } from '../components/Field';
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
  spec: BOLT_DEFAULTS.spec,
  d: String(BOLT_DEFAULTS.d),
  pitch: String(BOLT_DEFAULTS.pitch),
  grade: BOLT_DEFAULTS.grade,
  torque: String(BOLT_DEFAULTS.torque),
  k: String(BOLT_DEFAULTS.k),
  useFriction: 'false',
  muThread: '0.15',
  muHead: '',
  scatterPct: '25',
  axialFatigueLoad: '',
};

export function BoltPreloadTool({ digits, preset, onRestored, onSave, onToast }: Props) {
  const { form, setForm, errors, result, run: rawRun, reset, copy, save, presets, savePreset, applyPreset, deletePresetById, presetSaved } = useToolForm({
    toolId: 'bolt', toolName: '螺栓预紧力', defaults: DEFAULTS,
    buildInput: (f) => ({
      spec: f.spec, d: parseNum(f.d), pitch: parseNum(f.pitch),
      grade: f.grade, torque: parseNum(f.torque),
      useFriction: f.useFriction === 'true',
      muThread: parseNum(f.muThread),
      muHead: parseNum(f.muHead),
      scatterPct: parseNum(f.scatterPct),
      axialFatigueLoad: parseNum(f.axialFatigueLoad),
      k: parseNum(f.k),
    }),
    calc: (input, opt) => calcBolt(input as Parameters<typeof calcBolt>[0], opt),
    copyText: (input, d) => boltCopyText(input as Parameters<typeof boltCopyText>[0], d),
    makeParams: (f) => `${f.spec} ${f.grade} · T=${f.torque || '—'} N·m · ${f.useFriction === 'true' ? `μ=${f.muThread || '—'}` : `K=${f.k || '—'}`}`,
    preset, digits, onRestored, onSave, onToast,
  });

  const run = useCallback(() => { rawRun(); touchUsage('bolt'); }, [rawRun]);
  useEnterSubmit(run);

  const onSpec = useCallback((spec: string) => {
    const m = METRIC_BOLTS.find((b) => b.spec === spec);
    setForm((f) => m
      ? { ...f, spec, d: String(m.d), pitch: String(m.pitch) }
      : { ...f, spec });
  }, [setForm]);

  const frictionMode = form.useFriction === 'true';

  useEffect(() => {
    if (!preset) return;
    const spec = preset.spec ?? DEFAULTS.spec;
    const m = METRIC_BOLTS.find((b) => b.spec === spec);
    if (m) setForm((f) => ({ ...f, d: String(m.d), pitch: String(m.pitch) }));
  }, [preset, setForm]);

  return (
    <div className="tool-layout">
      <div className="tool-form card card-pad">
        <div className="result-title">输入参数</div>
        <SelectField
          label="螺栓规格"
          value={form.spec}
          onChange={onSpec}
          options={[
            { value: 'custom', label: '自定义尺寸' },
            ...METRIC_BOLTS.map((b) => ({ value: b.spec, label: `${b.spec}(粗牙 P=${b.pitch})` })),
          ]}
        />
        <NumField label="公称直径" symbol="d" value={form.d} onChange={(v) => setForm({ ...form, d: v })} unit="mm" error={errors.d} />
        <NumField label="螺距" symbol="P" value={form.pitch} onChange={(v) => setForm({ ...form, pitch: v })} unit="mm" error={errors.pitch} hint="选标准规格时自动填入粗牙螺距" />
        <SelectField
          label="强度等级"
          value={form.grade}
          onChange={(v) => setForm({ ...form, grade: v })}
          options={BOLT_GRADES.map((g) => ({ value: g.id, label: g.label }))}
        />
        <NumField label="拧紧扭矩" symbol="T" value={form.torque} onChange={(v) => setForm({ ...form, torque: v })} unit="N·m" error={errors.torque} />
        <div className="field">
          <div className="lbl"><span>K 值来源</span></div>
          <div className="seg">
            <button type="button" className={!frictionMode ? 'active' : ''} onClick={() => setForm({ ...form, useFriction: 'false' })}>手填 K</button>
            <button type="button" className={frictionMode ? 'active' : ''} onClick={() => setForm({ ...form, useFriction: 'true' })}>由摩擦系数计算</button>
          </div>
        </div>
        {frictionMode ? (
          <>
            <NumField label="螺纹摩擦系数" symbol="μ" value={form.muThread} onChange={(v) => setForm({ ...form, muThread: v })} unit="—" error={errors.muThread} hint="钢-钢干态 0.10~0.18,轻微涂油 0.08~0.12" />
            <NumField label="支承面摩擦系数" symbol="μK" value={form.muHead} onChange={(v) => setForm({ ...form, muHead: v })} unit="—" error={errors.muHead} opt="可选" hint="留空同螺纹 μ" />
          </>
        ) : (
          <NumField label="扭矩系数" symbol="K" value={form.k} onChange={(v) => setForm({ ...form, k: v })} unit="—" error={errors.k} hint="无润滑约 0.20,润滑 0.12~0.15" />
        )}
        <NumField label="预紧力分散度" symbol="±" value={form.scatterPct} onChange={(v) => setForm({ ...form, scatterPct: v })} unit="%" error={errors.scatterPct} hint="扭矩法典型 20~30;转角法约 10;液压拉伸 5" />
        <NumField label="交变轴向载荷" symbol="Fa" value={form.axialFatigueLoad} onChange={(v) => setForm({ ...form, axialFatigueLoad: v })} unit="N" error={errors.axialFatigueLoad} opt="可选" hint="填写后评估最低残余夹紧力与螺栓应力幅" />
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
