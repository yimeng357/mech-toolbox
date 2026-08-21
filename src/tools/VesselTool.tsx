// 超高压缸筒设计工具页(双层缩套 / 钢丝缠绕)
import { useCallback } from 'react';
import type { HistoryRecord } from '../types';
import { VESSEL_DEFAULTS, calcVessel, vesselCopyText } from '../calc/vessel';
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
  method: VESSEL_DEFAULTS.method,
  pressure: String(VESSEL_DEFAULTS.pressure),
  bore: String(VESSEL_DEFAULTS.bore),
  sigmaS: String(VESSEL_DEFAULTS.sigmaS),
  safety: String(VESSEL_DEFAULTS.safety),
  od: String(VESSEL_DEFAULTS.od),
  linerOd: String(VESSEL_DEFAULTS.linerOd),
  wireSigmaS: String(VESSEL_DEFAULTS.wireSigmaS),
  wireSafety: String(VESSEL_DEFAULTS.wireSafety),
  wireDia: String(VESSEL_DEFAULTS.wireDia),
};

export function VesselTool({ digits, preset, onRestored, onSave, onToast }: Props) {
  const { form, setForm, errors, result, setResult, run: rawRun, reset, copy, save } = useToolForm({
    toolId: 'vessel', toolName: '超高压缸筒', defaults: DEFAULTS,
    buildInput: (f) => ({
      method: f.method, pressure: parseNum(f.pressure), bore: parseNum(f.bore),
      sigmaS: parseNum(f.sigmaS), safety: parseNum(f.safety), od: parseNum(f.od),
      linerOd: parseNum(f.linerOd), wireSigmaS: parseNum(f.wireSigmaS),
      wireSafety: parseNum(f.wireSafety), wireDia: parseNum(f.wireDia),
    }),
    calc: (input, opt) => calcVessel(input as Parameters<typeof calcVessel>[0], opt),
    copyText: (input, d) => vesselCopyText(input as Parameters<typeof vesselCopyText>[0], d),
    makeParams: (f) => f.method === 'shrink'
      ? `缩套 · di=${f.bore || '—'} · p=${f.pressure || '—'}MPa · σs=${f.sigmaS || '—'} · do=${f.od || '—'}`
      : `缠绕 · di=${f.bore || '—'} · p=${f.pressure || '—'}MPa · d₁=${f.linerOd || '—'} · do=${f.od || '—'}`,
    preset, digits, onRestored, onSave, onToast,
  });

  const run = useCallback(() => { rawRun(); touchUsage('vessel'); }, [rawRun]);
  useEnterSubmit(run);

  return (
    <div className="tool-layout">
      <div className="tool-form card card-pad">
        <div className="result-title">输入参数</div>
        <SegField
          label="设计方案"
          value={form.method as 'shrink' | 'wire'}
          onChange={(v) => { setForm({ ...form, method: v }); setResult(null); }}
          options={[{ value: 'shrink', label: '双层缩套' }, { value: 'wire', label: '钢丝缠绕' }]}
        />
        <NumField label="设计压力" symbol="p" value={form.pressure} onChange={(v) => setForm({ ...form, pressure: v })} unit="MPa" error={errors.pressure} hint="超高压容器通常 ≥ 100 MPa" />
        <NumField label="缸孔内径" symbol="di" value={form.bore} onChange={(v) => setForm({ ...form, bore: v })} unit="mm" error={errors.bore} />
        <NumField
          label={form.method === 'shrink' ? '筒体材料屈服强度' : '内衬材料屈服强度'}
          symbol="σs"
          value={form.sigmaS}
          onChange={(v) => setForm({ ...form, sigmaS: v })}
          unit="MPa"
          error={errors.sigmaS}
          hint="参考:42CrMo≈930 · 30CrNiMo8≈1000 · 300M≈1650 MPa"
        />
        <NumField label="安全系数" symbol="n" value={form.safety} onChange={(v) => setForm({ ...form, safety: v })} unit="—" error={errors.safety} hint="超高压建议 ≥ 1.5" />
        <NumField
          label={form.method === 'shrink' ? '总外径' : '缠绕外径'}
          symbol="do"
          value={form.od}
          onChange={(v) => setForm({ ...form, od: v })}
          unit="mm"
          error={errors.od}
          hint={form.method === 'shrink' ? '建议 do/di ≥ 2' : '含内衬与钢丝层的总外径'}
        />
        {form.method === 'wire' && (
          <>
            <NumField label="内衬外径" symbol="d₁" value={form.linerOd} onChange={(v) => setForm({ ...form, linerOd: v })} unit="mm" error={errors.linerOd} hint="薄内衬,约 (1.2~1.5)·di" />
            <NumField label="钢丝屈服强度" symbol="σs" value={form.wireSigmaS} onChange={(v) => setForm({ ...form, wireSigmaS: v })} unit="MPa" error={errors.wireSigmaS} hint="琴钢丝/弹簧钢丝 ≈ 1700~2000 MPa" />
            <NumField label="钢丝安全系数" symbol="n" value={form.wireSafety} onChange={(v) => setForm({ ...form, wireSafety: v })} unit="—" error={errors.wireSafety} hint="建议 ≥ 1.5" />
            <NumField label="钢丝直径" symbol="d_w" value={form.wireDia} onChange={(v) => setForm({ ...form, wireDia: v })} unit="mm" error={errors.wireDia} hint="常用 1~5 mm" />
          </>
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
