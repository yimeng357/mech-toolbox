// 平键/花键连接校核工具页
import { useCallback } from 'react';
import type { HistoryRecord } from '../types';
import { KEY_DEFAULTS, calcKey, keyCopyText, type KeyType } from '../calc/keyJoint';
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
  keyType: KEY_DEFAULTS.keyType,
  torqueNm: String(KEY_DEFAULTS.torqueNm),
  shaftDiaMm: String(KEY_DEFAULTS.shaftDiaMm),
  keyWidthMm: String(KEY_DEFAULTS.keyWidthMm),
  keyHeightMm: String(KEY_DEFAULTS.keyHeightMm),
  keyLengthMm: String(KEY_DEFAULTS.keyLengthMm),
  keyCount: String(KEY_DEFAULTS.keyCount),
  splineTeeth: String(KEY_DEFAULTS.splineTeeth),
  splineWorkHeightMm: String(KEY_DEFAULTS.splineWorkHeightMm),
  splineLengthMm: String(KEY_DEFAULTS.splineLengthMm),
  splineUnevenFactor: String(KEY_DEFAULTS.splineUnevenFactor),
  allowablePressureMpa: String(KEY_DEFAULTS.allowablePressureMpa),
};

export function KeyJointTool({ digits, preset, onRestored, onSave, onToast }: Props) {
  const { form, setForm, errors, result, run: rawRun, reset, copy, save } = useToolForm({
    toolId: 'key-joint', toolName: '键/花键校核', defaults: DEFAULTS,
    buildInput: (f) => ({
      keyType: f.keyType as KeyType,
      torqueNm: parseNum(f.torqueNm),
      shaftDiaMm: parseNum(f.shaftDiaMm),
      keyWidthMm: parseNum(f.keyWidthMm),
      keyHeightMm: parseNum(f.keyHeightMm),
      keyLengthMm: parseNum(f.keyLengthMm),
      keyCount: parseNum(f.keyCount),
      splineTeeth: parseNum(f.splineTeeth),
      splineWorkHeightMm: parseNum(f.splineWorkHeightMm),
      splineLengthMm: parseNum(f.splineLengthMm),
      splineUnevenFactor: parseNum(f.splineUnevenFactor),
      allowablePressureMpa: parseNum(f.allowablePressureMpa),
    }),
    calc: (input, opt) => calcKey(input as Parameters<typeof calcKey>[0], opt),
    copyText: (input, d) => keyCopyText(input as Parameters<typeof keyCopyText>[0], d),
    makeParams: (f) => `${f.keyType === 'FLAT_KEY' ? '平键' : '花键'} · T=${f.torqueNm || '—'} N·m · d=${f.shaftDiaMm || '—'} mm`,
    preset, digits, onRestored, onSave, onToast,
  });

  const run = useCallback(() => { rawRun(); touchUsage('key-joint'); }, [rawRun]);
  useEnterSubmit(run);

  const isFlat = form.keyType === 'FLAT_KEY';

  return (
    <div className="tool-layout">
      <div className="tool-form card card-pad">
        <div className="result-title">输入参数</div>
        <SegField
          label="连接类型"
          value={form.keyType as KeyType}
          onChange={(v) => setForm({ ...form, keyType: v })}
          options={[
            { value: 'FLAT_KEY', label: '平键' },
            { value: 'SPLINE', label: '花键' },
          ]}
        />
        <NumField label="传递扭矩" symbol="T" value={form.torqueNm} onChange={(v) => setForm({ ...form, torqueNm: v })} unit="N·m" error={errors.torqueNm} />
        <NumField label="轴径" symbol="d" value={form.shaftDiaMm} onChange={(v) => setForm({ ...form, shaftDiaMm: v })} unit="mm" error={errors.shaftDiaMm} presets={[20, 25, 30, 40, 50]} />
        {isFlat ? (
          <>
            <NumField label="键宽" symbol="b" value={form.keyWidthMm} onChange={(v) => setForm({ ...form, keyWidthMm: v })} unit="mm" error={errors.keyWidthMm} hint="按 GB/T 1095 随轴径选:d 22~30 → 8×7,30~38 → 10×8,38~44 → 12×8" />
            <NumField label="键高" symbol="h" value={form.keyHeightMm} onChange={(v) => setForm({ ...form, keyHeightMm: v })} unit="mm" error={errors.keyHeightMm} />
            <NumField label="键长" symbol="L" value={form.keyLengthMm} onChange={(v) => setForm({ ...form, keyLengthMm: v })} unit="mm" error={errors.keyLengthMm} hint="标准长度系列:22/25/28/32/36/40/45/50/56/63…" />
            <NumField label="键数量" symbol="n" value={form.keyCount} onChange={(v) => setForm({ ...form, keyCount: v })} unit="个" error={errors.keyCount} hint="双键按 1.5 键折算承载" />
          </>
        ) : (
          <>
            <NumField label="齿数" symbol="z" value={form.splineTeeth} onChange={(v) => setForm({ ...form, splineTeeth: v })} unit="—" error={errors.splineTeeth} presets={[8, 10, 13, 16, 20]} />
            <NumField label="齿工作高" symbol="h" value={form.splineWorkHeightMm} onChange={(v) => setForm({ ...form, splineWorkHeightMm: v })} unit="mm" error={errors.splineWorkHeightMm} hint="近似取模数 m" />
            <NumField label="工作长度" symbol="l" value={form.splineLengthMm} onChange={(v) => setForm({ ...form, splineLengthMm: v })} unit="mm" error={errors.splineLengthMm} />
            <NumField label="载荷不均匀系数" symbol="ψ" value={form.splineUnevenFactor} onChange={(v) => setForm({ ...form, splineUnevenFactor: v })} unit="—" error={errors.splineUnevenFactor} hint="一般 0.7~0.8" />
          </>
        )}
        <NumField label="许用挤压应力" symbol="[σp]" value={form.allowablePressureMpa} onChange={(v) => setForm({ ...form, allowablePressureMpa: v })} unit="MPa" error={errors.allowablePressureMpa} hint="静连接钢 100~150,动连接(滑移)40~60" />
        <div className="btn-row">
          <button className="btn" onClick={run}>计算</button>
          <button className="btn ghost" onClick={reset}>重置</button>
        </div>
      </div>

      <CalcResult data={result} hasInput={!!result} onCopy={copy} onSave={save} onReset={reset} />
    </div>
  );
}
