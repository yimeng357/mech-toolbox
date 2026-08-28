// 焊缝强度校核工具页
import { useCallback } from 'react';
import type { HistoryRecord } from '../types';
import { WELD_DEFAULTS, calcWeld, weldCopyText, type WeldType } from '../calc/weld';
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
  weldType: WELD_DEFAULTS.weldType,
  loadN: String(WELD_DEFAULTS.loadN),
  legMm: String(WELD_DEFAULTS.legMm),
  weldLengthMm: String(WELD_DEFAULTS.weldLengthMm),
  plateThkMm: String(WELD_DEFAULTS.plateThkMm),
  allowableMpa: String(WELD_DEFAULTS.allowableMpa),
  buttQualityFactor: String(WELD_DEFAULTS.buttQualityFactor),
};

export function WeldTool({ digits, preset, onRestored, onSave, onToast }: Props) {
  const { form, setForm, errors, result, run: rawRun, reset, copy, save } = useToolForm({
    toolId: 'weld', toolName: '焊缝强度', defaults: DEFAULTS,
    buildInput: (f) => ({
      weldType: f.weldType as WeldType,
      loadN: parseNum(f.loadN),
      legMm: parseNum(f.legMm),
      weldLengthMm: parseNum(f.weldLengthMm),
      plateThkMm: parseNum(f.plateThkMm),
      allowableMpa: parseNum(f.allowableMpa),
      buttQualityFactor: parseNum(f.buttQualityFactor),
    }),
    calc: (input, opt) => calcWeld(input as Parameters<typeof calcWeld>[0], opt),
    copyText: (input, d) => weldCopyText(input as Parameters<typeof weldCopyText>[0], d),
    makeParams: (f) => `${f.weldType === 'FILLET' ? `角焊 h=${f.legMm || '—'}` : `对接 t=${f.plateThkMm || '—'}`} · L=${f.weldLengthMm || '—'} · F=${f.loadN || '—'} N`,
    preset, digits, onRestored, onSave, onToast,
  });

  const run = useCallback(() => { rawRun(); touchUsage('weld'); }, [rawRun]);
  useEnterSubmit(run);

  const isFillet = form.weldType === 'FILLET';

  return (
    <div className="tool-layout">
      <div className="tool-form card card-pad">
        <div className="result-title">输入参数</div>
        <SegField
          label="焊缝类型"
          value={form.weldType as WeldType}
          onChange={(v) => setForm({ ...form, weldType: v })}
          options={[
            { value: 'FILLET', label: '角焊缝' },
            { value: 'BUTT', label: '对接焊缝' },
          ]}
        />
        <NumField label="作用载荷" symbol="F" value={form.loadN} onChange={(v) => setForm({ ...form, loadN: v })} unit="N" error={errors.loadN} hint="拉/压/剪载荷,受弯结构需另行折算" />
        {isFillet ? (
          <NumField label="焊脚高度" symbol="h" value={form.legMm} onChange={(v) => setForm({ ...form, legMm: v })} unit="mm" error={errors.legMm} presets={[3, 4, 5, 6, 8]} />
        ) : (
          <NumField label="板厚" symbol="t" value={form.plateThkMm} onChange={(v) => setForm({ ...form, plateThkMm: v })} unit="mm" error={errors.plateThkMm} />
        )}
        <NumField label="焊缝总长" symbol="L" value={form.weldLengthMm} onChange={(v) => setForm({ ...form, weldLengthMm: v })} unit="mm" error={errors.weldLengthMm} hint="双侧焊按两条长度之和" />
        <NumField label="许用切应力" symbol="[τ']" value={form.allowableMpa} onChange={(v) => setForm({ ...form, allowableMpa: v })} unit="MPa" error={errors.allowableMpa} hint="Q235 焊缝约 100~120,低合金钢 140~180" />
        {!isFillet && (
          <NumField label="对接质量系数" symbol="φ" value={form.buttQualityFactor} onChange={(v) => setForm({ ...form, buttQualityFactor: v })} unit="—" error={errors.buttQualityFactor} hint="一级 1.0 / 二级 0.85 / 三级 0.7" />
        )}
        <div className="btn-row">
          <button className="btn" onClick={run}>计算</button>
          <button className="btn ghost" onClick={reset}>重置</button>
        </div>
      </div>

      <CalcResult data={result} hasInput={!!result} onCopy={copy} onSave={save} onReset={reset} />
    </div>
  );
}
