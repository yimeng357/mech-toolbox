// 真实气体压缩因子与储气量工具页
import { useCallback } from 'react';
import type { HistoryRecord } from '../types';
import { REAL_GAS_DEFAULTS, calcRealGas, realGasCopyText, type HighPressureGasType } from '../calc/realGas';
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
  gasType: REAL_GAS_DEFAULTS.gasType,
  pressureBar: String(REAL_GAS_DEFAULTS.pressureBar),
  temperatureC: String(REAL_GAS_DEFAULTS.temperatureC),
  vesselVolumeLiter: String(REAL_GAS_DEFAULTS.vesselVolumeLiter),
};

export function RealGasTool({ digits, preset, onRestored, onSave, onToast }: Props) {
  const { form, setForm, errors, result, setResult, run: rawRun, reset, copy, save } = useToolForm({
    toolId: 'real-gas', toolName: '高压真实气体Z因子与储气量', defaults: DEFAULTS,
    buildInput: (f) => ({
      gasType: f.gasType as HighPressureGasType,
      pressureBar: parseNum(f.pressureBar),
      temperatureC: parseNum(f.temperatureC),
      vesselVolumeLiter: parseNum(f.vesselVolumeLiter),
    }),
    calc: (input, opt) => calcRealGas(input as Parameters<typeof calcRealGas>[0], opt),
    copyText: (input, d) => realGasCopyText(input as Parameters<typeof realGasCopyText>[0], d),
    makeParams: (f) => `${f.gasType} · P=${f.pressureBar || '—'} bar · T=${f.temperatureC || '—'} °C`,
    preset, digits, onRestored, onSave, onToast,
  });

  const run = useCallback(() => { rawRun(); touchUsage('real-gas'); }, [rawRun]);
  useEnterSubmit(run);

  return (
    <div className="tool-layout">
      <div className="tool-form card card-pad">
        <div className="result-title">输入参数</div>
        <SegField
          label="气体类型"
          value={form.gasType as HighPressureGasType}
          onChange={(v) => { setForm({ ...form, gasType: v }); setResult(null); }}
          options={[
            { value: 'NITROGEN', label: '高压氮气 (N2)' },
            { value: 'HYDROGEN', label: '高压氢气 (H2)' },
            { value: 'HELIUM', label: '高压氦气 (He)' },
            { value: 'AIR', label: '高压空气' },
          ]}
        />
        <NumField label="工作压力" symbol="P" value={form.pressureBar} onChange={(v) => setForm({ ...form, pressureBar: v })} unit="bar" error={errors.pressureBar} presets={[200, 350, 450, 700, 900]} hint="200~1000 bar 超高压范围" />
        <NumField label="工作环境温度" symbol="T" value={form.temperatureC} onChange={(v) => setForm({ ...form, temperatureC: v })} unit="°C" error={errors.temperatureC} presets={[-20, 0, 20, 50, 85]} />
        <NumField label="储罐内部几何容积" symbol="V" value={form.vesselVolumeLiter} onChange={(v) => setForm({ ...form, vesselVolumeLiter: v })} unit="L" error={errors.vesselVolumeLiter} presets={[10, 50, 150, 350, 1000]} />
        <div className="btn-row">
          <button className="btn" onClick={run}>计算</button>
          <button className="btn ghost" onClick={reset}>重置</button>
        </div>
      </div>

      <CalcResult data={result} hasInput={!!result} onCopy={copy} onSave={save} onReset={reset} />
    </div>
  );
}
