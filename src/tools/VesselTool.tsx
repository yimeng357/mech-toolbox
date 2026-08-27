// 超高压缸筒设计工具页(双层缩套 / 钢丝缠绕 / 自增强 / 多层热套)
import { useCallback } from 'react';
import type { HistoryRecord } from '../types';
import { VESSEL_DEFAULTS, calcVessel, vesselCopyText } from '../calc/vessel';
import { parseNum } from '../lib/format';
import { touchUsage } from '../lib/history';
import { useToolForm } from '../lib/useToolForm';
import { useEnterSubmit } from '../lib/useEnterSubmit';
import { MaterialSelectField, NumField, SegField, TextField } from '../components/Field';
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
  autofrettageRatio: String(VESSEL_DEFAULTS.autofrettageRatio),
  layerCount: String(VESSEL_DEFAULTS.layerCount),
  layerSigmaS: String(VESSEL_DEFAULTS.layerSigmaS),
  layerSafety: String(VESSEL_DEFAULTS.layerSafety),
  layerOd: String(VESSEL_DEFAULTS.layerOd),
};

// 方案选项
const METHOD_OPTIONS = [
  { value: 'shrink' as const, label: '双层缩套' },
  { value: 'wire' as const, label: '钢丝缠绕' },
  { value: 'autofrettage' as const, label: '自增强' },
  { value: 'multilayer' as const, label: '多层热套' },
];

export function VesselTool({ digits, preset, onRestored, onSave, onToast }: Props) {
  const { form, setForm, errors, result, setResult, run: rawRun, reset, copy, save } = useToolForm({
    toolId: 'vessel', toolName: '超高压缸筒', defaults: DEFAULTS,
    buildInput: (f) => ({
      method: f.method, pressure: parseNum(f.pressure), bore: parseNum(f.bore),
      sigmaS: parseNum(f.sigmaS), safety: parseNum(f.safety), od: parseNum(f.od),
      linerOd: parseNum(f.linerOd), wireSigmaS: parseNum(f.wireSigmaS),
      wireSafety: parseNum(f.wireSafety), wireDia: parseNum(f.wireDia),
      autofrettageRatio: parseNum(f.autofrettageRatio),
      layerCount: parseNum(f.layerCount),
      layerSigmaS: parseNum(f.layerSigmaS),
      layerSafety: parseNum(f.layerSafety),
      layerOd: f.layerOd,
    }),
    calc: (input, opt) => calcVessel(input as Parameters<typeof calcVessel>[0], opt),
    copyText: (input, d) => vesselCopyText(input as Parameters<typeof vesselCopyText>[0], d),
    makeParams: (f) => {
      const base = `di=${f.bore || '—'} · p=${f.pressure || '—'}MPa · do=${f.od || '—'}`;
      if (f.method === 'shrink') return `缩套 · ${base} · σs=${f.sigmaS || '—'}`;
      if (f.method === 'wire') return `缠绕 · ${base} · d₁=${f.linerOd || '—'}`;
      if (f.method === 'autofrettage') return `自增强 · ${base} · rp/ri=${f.autofrettageRatio || '—'}`;
      return `多层热套 · ${base} · n=${f.layerCount || '—'}`;
    },
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
          value={form.method as string}
          onChange={(v) => { setForm({ ...form, method: v }); setResult(null); }}
          options={METHOD_OPTIONS}
        />
        <NumField label="设计压力" symbol="p" value={form.pressure} onChange={(v) => setForm({ ...form, pressure: v })} unit="MPa" error={errors.pressure} hint="超高压容器通常 ≥ 100 MPa" />
        <NumField label="缸孔内径" symbol="di" value={form.bore} onChange={(v) => setForm({ ...form, bore: v })} unit="mm" error={errors.bore} />
        <MaterialSelectField
          hint="选中后自动填入屈服强度(手册典型值),可再手动微调"
          onPick={(m) => { if (m) setForm((f) => ({ ...f, sigmaS: String(m.sigmaS) })); }}
        />
        <NumField
          label={form.method === 'wire' ? '内衬材料屈服强度' : '筒体材料屈服强度'}
          symbol="σs"
          value={form.sigmaS}
          onChange={(v) => setForm({ ...form, sigmaS: v })}
          unit="MPa"
          error={errors.sigmaS}
          hint="参考:42CrMo≈930 · 30CrNiMo8≈1000 · 300M≈1650 MPa"
        />
        <NumField label="安全系数" symbol="n" value={form.safety} onChange={(v) => setForm({ ...form, safety: v })} unit="—" error={errors.safety} hint="超高压建议 ≥ 1.5" />
        <NumField
          label={form.method === 'wire' ? '缠绕外径' : '总外径'}
          symbol="do"
          value={form.od}
          onChange={(v) => setForm({ ...form, od: v })}
          unit="mm"
          error={errors.od}
          hint={form.method === 'wire' ? '含内衬与钢丝层的总外径' : '建议 do/di ≥ 2'}
        />
        {form.method === 'wire' && (
          <>
            <NumField label="内衬外径" symbol="d₁" value={form.linerOd} onChange={(v) => setForm({ ...form, linerOd: v })} unit="mm" error={errors.linerOd} hint="薄内衬,约 (1.2~1.5)·di" />
            <NumField label="钢丝屈服强度" symbol="σs" value={form.wireSigmaS} onChange={(v) => setForm({ ...form, wireSigmaS: v })} unit="MPa" error={errors.wireSigmaS} hint="琴钢丝/弹簧钢丝 ≈ 1700~2000 MPa" />
            <NumField label="钢丝安全系数" symbol="n" value={form.wireSafety} onChange={(v) => setForm({ ...form, wireSafety: v })} unit="—" error={errors.wireSafety} hint="建议 ≥ 1.5" />
            <NumField label="钢丝直径" symbol="d_w" value={form.wireDia} onChange={(v) => setForm({ ...form, wireDia: v })} unit="mm" error={errors.wireDia} hint="常用 1~5 mm" />
          </>
        )}
        {form.method === 'autofrettage' && (
          <NumField
            label="过应变深度比"
            symbol="rp/ri"
            value={form.autofrettageRatio}
            onChange={(v) => setForm({ ...form, autofrettageRatio: v })}
            unit="—"
            error={errors.autofrettageRatio}
            hint="塑性区深度与内径之比,建议 1.2~1.8"
          />
        )}
        {form.method === 'multilayer' && (
          <>
            <NumField label="层数" symbol="n" value={form.layerCount} onChange={(v) => setForm({ ...form, layerCount: v })} unit="层" error={errors.layerCount} hint="≥2,建议 2~4 层" />
            <NumField label="各层屈服强度" symbol="σs" value={form.layerSigmaS} onChange={(v) => setForm({ ...form, layerSigmaS: v })} unit="MPa" error={errors.layerSigmaS} hint="各层材料相同;如不同可在结果中手动校核" />
            <NumField label="各层安全系数" symbol="n" value={form.layerSafety} onChange={(v) => setForm({ ...form, layerSafety: v })} unit="—" error={errors.layerSafety} hint="建议 ≥ 1.5" />
            <TextField
              label="各层外径"
              value={form.layerOd}
              onChange={(v) => setForm({ ...form, layerOd: v })}
              error={errors.layerOd}
              hint={`${(Number(form.layerCount) || 3) - 1} 个分界直径,用逗号分隔(如 80,110)`}
            />
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
