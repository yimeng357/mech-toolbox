// 高压孔口临界节流与微泄漏工具页
import { useCallback } from 'react';
import type { HistoryRecord } from '../types';
import { CHOKED_FLOW_DEFAULTS, calcChokedFlow, chokedFlowCopyText, type ChokedFlowGasType } from '../calc/chokedFlow';
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
  upstreamPressureBar: String(CHOKED_FLOW_DEFAULTS.upstreamPressureBar),
  upstreamTemperatureC: String(CHOKED_FLOW_DEFAULTS.upstreamTemperatureC),
  orificeDiameterMm: String(CHOKED_FLOW_DEFAULTS.orificeDiameterMm),
  downstreamPressureBar: String(CHOKED_FLOW_DEFAULTS.downstreamPressureBar || 1.013),
  gasType: CHOKED_FLOW_DEFAULTS.gasType || 'NITROGEN',
};

export function ChokedFlowTool({ digits, preset, onRestored, onSave, onToast }: Props) {
  const { form, setForm, errors, result, setResult, run: rawRun, reset, copy, save } = useToolForm({
    toolId: 'choked-flow', toolName: '高压孔口临界节流与微泄漏', defaults: DEFAULTS,
    buildInput: (f) => ({
      upstreamPressureBar: parseNum(f.upstreamPressureBar),
      upstreamTemperatureC: parseNum(f.upstreamTemperatureC),
      orificeDiameterMm: parseNum(f.orificeDiameterMm),
      downstreamPressureBar: parseNum(f.downstreamPressureBar),
      gasType: f.gasType as ChokedFlowGasType,
    }),
    calc: (input, opt) => calcChokedFlow(input as Parameters<typeof calcChokedFlow>[0], opt),
    copyText: (input, d) => chokedFlowCopyText(input as Parameters<typeof chokedFlowCopyText>[0], d),
    makeParams: (f) => `P1=${f.upstreamPressureBar || '—'} bar · d0=${f.orificeDiameterMm || '—'} mm · ${f.gasType}`,
    preset, digits, onRestored, onSave, onToast,
  });

  const run = useCallback(() => { rawRun(); touchUsage('choked-flow'); }, [rawRun]);
  useEnterSubmit(run);

  return (
    <div className="tool-layout">
      <div className="tool-form card card-pad">
        <div className="result-title">输入参数</div>
        <NumField label="上游高压压力" symbol="P1" value={form.upstreamPressureBar} onChange={(v) => setForm({ ...form, upstreamPressureBar: v })} unit="bar" error={errors.upstreamPressureBar} presets={[50, 100, 200, 350, 700]} />
        <NumField label="上游气体温度" symbol="T1" value={form.upstreamTemperatureC} onChange={(v) => setForm({ ...form, upstreamTemperatureC: v })} unit="°C" error={errors.upstreamTemperatureC} presets={[0, 20, 50, 80]} />
        <NumField label="节流孔/微漏孔径" symbol="d0" value={form.orificeDiameterMm} onChange={(v) => setForm({ ...form, orificeDiameterMm: v })} unit="mm" error={errors.orificeDiameterMm} presets={[0.1, 0.3, 0.5, 1.0, 2.0]} hint="锐边孔 Cd≈0.62, 喷嘴 Cd≈0.90" />
        <NumField label="下游排气背压" symbol="P2" value={form.downstreamPressureBar} onChange={(v) => setForm({ ...form, downstreamPressureBar: v })} unit="bar" error={errors.downstreamPressureBar} presets={[1.013, 5, 10, 20]} hint="大气压 1.013 bar" />
        <SegField
          label="气体介质"
          value={form.gasType as ChokedFlowGasType}
          onChange={(v) => { setForm({ ...form, gasType: v }); setResult(null); }}
          options={[
            { value: 'NITROGEN', label: '氮气 (N2)' },
            { value: 'AIR', label: '空气' },
            { value: 'HYDROGEN', label: '氢气 (H2)' },
          ]}
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
