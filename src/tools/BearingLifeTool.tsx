// 滚动轴承寿命计算工具页
import { useCallback } from 'react';
import type { HistoryRecord } from '../types';
import { BEARING_LIFE_DEFAULTS, calcBearingLife, bearingLifeCopyText, type BearingKind } from '../calc/bearingLife';
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
  kind: BEARING_LIFE_DEFAULTS.kind,
  dynamicLoadRatingKn: String(BEARING_LIFE_DEFAULTS.dynamicLoadRatingKn),
  radialLoadKn: String(BEARING_LIFE_DEFAULTS.radialLoadKn),
  axialLoadKn: String(BEARING_LIFE_DEFAULTS.axialLoadKn),
  speedRpm: String(BEARING_LIFE_DEFAULTS.speedRpm),
  loadFactor: String(BEARING_LIFE_DEFAULTS.loadFactor),
  tempFactor: String(BEARING_LIFE_DEFAULTS.tempFactor),
  targetLifeHours: String(BEARING_LIFE_DEFAULTS.targetLifeHours),
};

export function BearingLifeTool({ digits, preset, onRestored, onSave, onToast }: Props) {
  const { form, setForm, errors, result, run: rawRun, reset, copy, save, presets, savePreset, applyPreset, deletePresetById, presetSaved } = useToolForm({
    toolId: 'bearing', toolName: '滚动轴承寿命', defaults: DEFAULTS,
    buildInput: (f) => ({
      kind: f.kind as BearingKind,
      dynamicLoadRatingKn: parseNum(f.dynamicLoadRatingKn),
      radialLoadKn: parseNum(f.radialLoadKn),
      axialLoadKn: parseNum(f.axialLoadKn),
      speedRpm: parseNum(f.speedRpm),
      loadFactor: parseNum(f.loadFactor),
      tempFactor: parseNum(f.tempFactor),
      targetLifeHours: parseNum(f.targetLifeHours),
    }),
    calc: (input, opt) => calcBearingLife(input as Parameters<typeof calcBearingLife>[0], opt),
    copyText: (input, d) => bearingLifeCopyText(input as Parameters<typeof bearingLifeCopyText>[0], d),
    makeParams: (f) => `${f.kind === 'BALL' ? '球' : '滚子'}轴承 · C=${f.dynamicLoadRatingKn || '—'}kN · Fr=${f.radialLoadKn || '—'}kN · n=${f.speedRpm || '—'}rpm`,
    preset, digits, onRestored, onSave, onToast,
  });

  const run = useCallback(() => { rawRun(); touchUsage('bearing'); }, [rawRun]);
  useEnterSubmit(run);

  return (
    <div className="tool-layout">
      <div className="tool-form card card-pad">
        <div className="result-title">输入参数</div>
        <SegField
          label="轴承类型"
          value={form.kind as BearingKind}
          onChange={(v) => setForm({ ...form, kind: v })}
          options={[
            { value: 'BALL', label: '球轴承(ε=3)' },
            { value: 'ROLLER', label: '滚子轴承(ε=10/3)' },
          ]}
        />
        <NumField label="额定动载荷" symbol="C" value={form.dynamicLoadRatingKn} onChange={(v) => setForm({ ...form, dynamicLoadRatingKn: v })} unit="kN" error={errors.dynamicLoadRatingKn} hint="轴承样本基本额定动载荷 Cr" presets={[15, 25, 32.5, 43, 55.3]} />
        <NumField label="径向载荷" symbol="Fr" value={form.radialLoadKn} onChange={(v) => setForm({ ...form, radialLoadKn: v })} unit="kN" error={errors.radialLoadKn} />
        <NumField label="轴向载荷" symbol="Fa" value={form.axialLoadKn} onChange={(v) => setForm({ ...form, axialLoadKn: v })} unit="kN" error={errors.axialLoadKn} hint="纯径向受载填 0" />
        <NumField label="工作转速" symbol="n" value={form.speedRpm} onChange={(v) => setForm({ ...form, speedRpm: v })} unit="rpm" error={errors.speedRpm} presets={[960, 1450, 2900]} />
        <NumField label="冲击载荷系数" symbol="fd" value={form.loadFactor} onChange={(v) => setForm({ ...form, loadFactor: v })} unit="—" error={errors.loadFactor} hint="平稳 1.0 / 轻冲击 1.2~1.5 / 重冲击 1.8~3" />
        <NumField label="温度系数" symbol="ft" value={form.tempFactor} onChange={(v) => setForm({ ...form, tempFactor: v })} unit="—" error={errors.tempFactor} hint="≤120℃ 取 1.0,125℃ 0.95,150℃ 0.9,200℃ 0.8" />
        <NumField label="目标寿命" symbol="Lh" value={form.targetLifeHours} onChange={(v) => setForm({ ...form, targetLifeHours: v })} unit="h" error={errors.targetLifeHours} opt="可选" hint="填写后校核寿命富余并反算所需 C;一般机械 20000~40000h" />
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
