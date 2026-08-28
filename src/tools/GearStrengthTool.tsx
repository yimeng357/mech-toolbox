// 直齿圆柱齿轮强度校核工具页
import { useCallback } from 'react';
import type { HistoryRecord } from '../types';
import { GEAR_STRENGTH_DEFAULTS, calcGearStrength, gearStrengthCopyText } from '../calc/gearStrength';
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
  torqueNm: String(GEAR_STRENGTH_DEFAULTS.torqueNm),
  teethPinion: String(GEAR_STRENGTH_DEFAULTS.teethPinion),
  teethGear: String(GEAR_STRENGTH_DEFAULTS.teethGear),
  moduleMm: String(GEAR_STRENGTH_DEFAULTS.moduleMm),
  faceWidthMm: String(GEAR_STRENGTH_DEFAULTS.faceWidthMm),
  loadFactor: String(GEAR_STRENGTH_DEFAULTS.loadFactor),
  sigmaHAllow: String(GEAR_STRENGTH_DEFAULTS.sigmaHAllow),
  sigmaFAllow: String(GEAR_STRENGTH_DEFAULTS.sigmaFAllow),
};

export function GearStrengthTool({ digits, preset, onRestored, onSave, onToast }: Props) {
  const { form, setForm, errors, result, run: rawRun, reset, copy, save } = useToolForm({
    toolId: 'gear', toolName: '齿轮强度', defaults: DEFAULTS,
    buildInput: (f) => ({
      torqueNm: parseNum(f.torqueNm), teethPinion: parseNum(f.teethPinion),
      teethGear: parseNum(f.teethGear), moduleMm: parseNum(f.moduleMm),
      faceWidthMm: parseNum(f.faceWidthMm), loadFactor: parseNum(f.loadFactor),
      sigmaHAllow: parseNum(f.sigmaHAllow), sigmaFAllow: parseNum(f.sigmaFAllow),
    }),
    calc: (input, opt) => calcGearStrength(input as Parameters<typeof calcGearStrength>[0], opt),
    copyText: (input, d) => gearStrengthCopyText(input as Parameters<typeof gearStrengthCopyText>[0], d),
    makeParams: (f) => `m=${f.moduleMm || '—'} · z=${f.teethPinion || '—'}/${f.teethGear || '—'} · b=${f.faceWidthMm || '—'} · T=${f.torqueNm || '—'} N·m`,
    preset, digits, onRestored, onSave, onToast,
  });

  const run = useCallback(() => { rawRun(); touchUsage('gear'); }, [rawRun]);
  useEnterSubmit(run);

  return (
    <div className="tool-layout">
      <div className="tool-form card card-pad">
        <div className="result-title">输入参数</div>
        <NumField label="小轮扭矩" symbol="T₁" value={form.torqueNm} onChange={(v) => setForm({ ...form, torqueNm: v })} unit="N·m" error={errors.torqueNm} />
        <NumField label="小轮齿数" symbol="z₁" value={form.teethPinion} onChange={(v) => setForm({ ...form, teethPinion: v })} unit="—" error={errors.teethPinion} hint="避免根切一般 ≥ 17" />
        <NumField label="大轮齿数" symbol="z₂" value={form.teethGear} onChange={(v) => setForm({ ...form, teethGear: v })} unit="—" error={errors.teethGear} />
        <NumField label="模数" symbol="m" value={form.moduleMm} onChange={(v) => setForm({ ...form, moduleMm: v })} unit="mm" error={errors.moduleMm} presets={[1.5, 2, 2.5, 3, 4, 5]} />
        <NumField label="齿宽" symbol="b" value={form.faceWidthMm} onChange={(v) => setForm({ ...form, faceWidthMm: v })} unit="mm" error={errors.faceWidthMm} hint="常取 b = (6~12)·m" />
        <NumField label="载荷系数" symbol="K" value={form.loadFactor} onChange={(v) => setForm({ ...form, loadFactor: v })} unit="—" error={errors.loadFactor} hint="平稳 1.3,一般 1.6,冲击 2.0+" />
        <NumField label="许用接触应力" symbol="[σH]" value={form.sigmaHAllow} onChange={(v) => setForm({ ...form, sigmaHAllow: v })} unit="MPa" error={errors.sigmaHAllow} hint="调质钢 500~600,渗碳淬火 1300~1500" />
        <NumField label="许用弯曲应力" symbol="[σF]" value={form.sigmaFAllow} onChange={(v) => setForm({ ...form, sigmaFAllow: v })} unit="MPa" error={errors.sigmaFAllow} hint="调质钢 250~350,渗碳淬火 500~700" />
        <div className="btn-row">
          <button className="btn" onClick={run}>计算</button>
          <button className="btn ghost" onClick={reset}>重置</button>
        </div>
      </div>

      <CalcResult data={result} hasInput={!!result} onCopy={copy} onSave={save} onReset={reset} />
    </div>
  );
}
