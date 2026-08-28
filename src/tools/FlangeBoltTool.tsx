// 法兰螺栓计算工具页
import { useCallback, useEffect } from 'react';
import type { HistoryRecord } from '../types';
import { FLANGE_DEFAULTS, calcFlange, flangeCopyText } from '../calc/flangeBolt';
import { BOLT_GRADES, METRIC_BOLTS } from '../calc/boltPreload';
import { GASKET_CLASSES } from '../calc/flangeBolt';
import { parseNum } from '../lib/format';
import { touchUsage } from '../lib/history';
import { useToolForm } from '../lib/useToolForm';
import { useEnterSubmit } from '../lib/useEnterSubmit';
import { NumField, SelectField } from '../components/Field';
import { CalcResult } from '../components/CalcResult';

interface Props {
  digits: number;
  preset: Record<string, string> | null;
  onRestored: () => void;
  onSave: (rec: HistoryRecord) => void;
  onToast: (msg: string) => void;
}

const DEFAULTS = {
  od: String(FLANGE_DEFAULTS.od),
  sealD: String(FLANGE_DEFAULTS.sealD),
  pressure: String(FLANGE_DEFAULTS.pressure),
  count: String(FLANGE_DEFAULTS.count),
  spec: FLANGE_DEFAULTS.spec,
  d: String(FLANGE_DEFAULTS.d),
  grade: FLANGE_DEFAULTS.grade,
  gasketClass: FLANGE_DEFAULTS.gasketClass ?? '',
};

export function FlangeBoltTool({ digits, preset, onRestored, onSave, onToast }: Props) {
  const { form, setForm, errors, result, run: rawRun, reset, copy, save } = useToolForm({
    toolId: 'flange', toolName: '法兰螺栓', defaults: DEFAULTS,
    buildInput: (f) => ({
      od: parseNum(f.od), sealD: parseNum(f.sealD), pressure: parseNum(f.pressure),
      count: parseNum(f.count), spec: f.spec, d: parseNum(f.d), grade: f.grade,
      gasketClass: f.gasketClass,
    }),
    calc: (input, opt) => calcFlange(input as Parameters<typeof calcFlange>[0], opt),
    copyText: (input, d) => flangeCopyText(input as Parameters<typeof flangeCopyText>[0], d),
    makeParams: (f) => `D_g ${f.sealD || '—'} mm · p ${f.pressure || '—'} MPa · n=${f.count || '—'} · ${f.spec} ${f.grade}`,
    preset, digits, onRestored, onSave, onToast,
  });

  const run = useCallback(() => { rawRun(); touchUsage('flange'); }, [rawRun]);
  useEnterSubmit(run);

  const onSpec = useCallback((spec: string) => {
    const m = METRIC_BOLTS.find((b) => b.spec === spec);
    if (m) setForm((f) => ({ ...f, spec, d: String(m.d) }));
    else setForm((f) => ({ ...f, spec }));
  }, [setForm]);

  useEffect(() => {
    if (!preset) return;
    const spec = preset.spec ?? DEFAULTS.spec;
    const m = METRIC_BOLTS.find((b) => b.spec === spec);
    if (m) setForm((f) => ({ ...f, d: String(m.d) }));
  }, [preset, setForm]);

  return (
    <div className="tool-layout">
      <div className="tool-form card card-pad">
        <div className="result-title">输入参数</div>
        <NumField label="法兰外径" symbol="D" value={form.od} onChange={(v) => setForm({ ...form, od: v })} unit="mm" error={errors.od} />
        <NumField label="密封直径" symbol="Dg" value={form.sealD} onChange={(v) => setForm({ ...form, sealD: v })} unit="mm" error={errors.sealD} hint="垫片平均直径,内压作用面积取此" />
        <NumField label="工作压力" symbol="p" value={form.pressure} onChange={(v) => setForm({ ...form, pressure: v })} unit="MPa" error={errors.pressure} />
        <NumField label="螺栓数量" symbol="n" value={form.count} onChange={(v) => setForm({ ...form, count: v })} unit="个" error={errors.count} />
        <SelectField
          label="螺栓规格"
          value={form.spec}
          onChange={onSpec}
          options={[
            { value: 'custom', label: '自定义直径' },
            ...METRIC_BOLTS.map((b) => ({ value: b.spec, label: b.spec })),
          ]}
        />
        <NumField label="螺栓公称直径" symbol="d" value={form.d} onChange={(v) => setForm({ ...form, d: v })} unit="mm" error={errors.d} />
        <SelectField
          label="螺栓强度等级"
          value={form.grade}
          onChange={(v) => setForm({ ...form, grade: v })}
          options={BOLT_GRADES.map((g) => ({ value: g.id, label: g.label }))}
        />
        <SelectField
          label="垫片类别(m/y 两工况校核)"
          value={form.gasketClass}
          onChange={(v) => setForm({ ...form, gasketClass: v })}
          options={[
            { value: '', label: '— 不校核垫片 —' },
            ...GASKET_CLASSES.map((g) => ({ value: g.key, label: `${g.name}(m=${g.m}, y=${g.y})` })),
          ]}
          hint="选中后按 ASME VIII/GB 150.3 校核预紧压紧与操作密封两工况"
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
