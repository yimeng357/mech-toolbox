// 圆柱螺旋压缩弹簧设计工具页
import { useCallback } from 'react';
import type { HistoryRecord } from '../types';
import { SPRING_DEFAULTS, calcSpring, springCopyText } from '../calc/spring';
import { parseNum } from '../lib/format';
import { touchUsage } from '../lib/history';
import { useToolForm } from '../lib/useToolForm';
import { useEnterSubmit } from '../lib/useEnterSubmit';
import { NumField } from '../components/Field';
import { CalcResult } from '../components/CalcResult';

interface Props {
  digits: number;
  preset: Record<string, string> | null;
  onRestored: () => void;
  onSave: (rec: HistoryRecord) => void;
  onToast: (msg: string) => void;
}

const DEFAULTS = {
  wireDiaMm: String(SPRING_DEFAULTS.wireDiaMm),
  meanDiaMm: String(SPRING_DEFAULTS.meanDiaMm),
  activeCoils: String(SPRING_DEFAULTS.activeCoils),
  endCoils: String(SPRING_DEFAULTS.endCoils),
  shearModulusGPa: String(SPRING_DEFAULTS.shearModulusGPa),
  allowableStressMpa: String(SPRING_DEFAULTS.allowableStressMpa),
  designForceN: String(SPRING_DEFAULTS.designForceN),
};

export function SpringTool({ digits, preset, onRestored, onSave, onToast }: Props) {
  const { form, setForm, errors, result, run: rawRun, reset, copy, save } = useToolForm({
    toolId: 'spring', toolName: '压缩弹簧设计', defaults: DEFAULTS,
    buildInput: (f) => ({
      wireDiaMm: parseNum(f.wireDiaMm), meanDiaMm: parseNum(f.meanDiaMm),
      activeCoils: parseNum(f.activeCoils), endCoils: parseNum(f.endCoils),
      shearModulusGPa: parseNum(f.shearModulusGPa),
      allowableStressMpa: parseNum(f.allowableStressMpa),
      designForceN: parseNum(f.designForceN),
    }),
    calc: (input, opt) => calcSpring(input as Parameters<typeof calcSpring>[0], opt),
    copyText: (input, d) => springCopyText(input as Parameters<typeof springCopyText>[0], d),
    makeParams: (f) => `d=${f.wireDiaMm || '—'} · D=${f.meanDiaMm || '—'} · n=${f.activeCoils || '—'} 圈`,
    preset, digits, onRestored, onSave, onToast,
  });

  const run = useCallback(() => { rawRun(); touchUsage('spring'); }, [rawRun]);
  useEnterSubmit(run);

  return (
    <div className="tool-layout">
      <div className="tool-form card card-pad">
        <div className="result-title">输入参数</div>
        <NumField label="簧丝直径" symbol="d" value={form.wireDiaMm} onChange={(v) => setForm({ ...form, wireDiaMm: v })} unit="mm" error={errors.wireDiaMm} presets={[2, 3, 4, 5, 6]} />
        <NumField label="弹簧中径" symbol="D" value={form.meanDiaMm} onChange={(v) => setForm({ ...form, meanDiaMm: v })} unit="mm" error={errors.meanDiaMm} presets={[16, 20, 25, 32, 40]} />
        <NumField label="有效圈数" symbol="n" value={form.activeCoils} onChange={(v) => setForm({ ...form, activeCoils: v })} unit="圈" error={errors.activeCoils} hint="有效圈数越多刚度越低" />
        <NumField label="支承圈数" symbol="n₂" value={form.endCoils} onChange={(v) => setForm({ ...form, endCoils: v })} unit="圈" error={errors.endCoils} hint="端部并紧磨平典型 1.5~2.5" />
        <NumField label="切变模量" symbol="G" value={form.shearModulusGPa} onChange={(v) => setForm({ ...form, shearModulusGPa: v })} unit="GPa" error={errors.shearModulusGPa} hint="弹簧钢 79,不锈钢 71" />
        <NumField label="许用切应力" symbol="[τ]" value={form.allowableStressMpa} onChange={(v) => setForm({ ...form, allowableStressMpa: v })} unit="MPa" error={errors.allowableStressMpa} hint="油淬火钢丝静载约 0.5σb,动载降 20~30%" />
        <NumField label="设计载荷" symbol="F" value={form.designForceN} onChange={(v) => setForm({ ...form, designForceN: v })} unit="N" error={errors.designForceN} opt="可选" hint="填写后校核切应力与变形量" />
        <div className="btn-row">
          <button className="btn" onClick={run}>计算</button>
          <button className="btn ghost" onClick={reset}>重置</button>
        </div>
      </div>

      <CalcResult data={result} hasInput={!!result} onCopy={copy} onSave={save} onReset={reset} />
    </div>
  );
}
