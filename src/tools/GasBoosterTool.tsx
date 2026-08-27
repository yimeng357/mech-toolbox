// 气体增压器选型与充装时间工具页
import { useCallback } from 'react';
import type { HistoryRecord } from '../types';
import { GAS_BOOSTER_DEFAULTS, calcGasBooster, gasBoosterCopyText } from '../calc/gasBooster';
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
  vesselVolumeLiter: String(GAS_BOOSTER_DEFAULTS.vesselVolumeLiter),
  supplyPressureBar: String(GAS_BOOSTER_DEFAULTS.supplyPressureBar),
  targetPressureBar: String(GAS_BOOSTER_DEFAULTS.targetPressureBar),
  driveAirPressureBar: String(GAS_BOOSTER_DEFAULTS.driveAirPressureBar),
  boosterRatio: String(GAS_BOOSTER_DEFAULTS.boosterRatio),
  displacementCcPerStroke: String(GAS_BOOSTER_DEFAULTS.displacementCcPerStroke),
};

export function GasBoosterTool({ digits, preset, onRestored, onSave, onToast }: Props) {
  const { form, setForm, errors, result, run: rawRun, reset, copy, save } = useToolForm({
    toolId: 'gas-booster', toolName: '气动增压器与充气耗时', defaults: DEFAULTS,
    buildInput: (f) => ({
      vesselVolumeLiter: parseNum(f.vesselVolumeLiter),
      supplyPressureBar: parseNum(f.supplyPressureBar),
      targetPressureBar: parseNum(f.targetPressureBar),
      driveAirPressureBar: parseNum(f.driveAirPressureBar),
      boosterRatio: parseNum(f.boosterRatio),
      displacementCcPerStroke: parseNum(f.displacementCcPerStroke),
    }),
    calc: (input, opt) => calcGasBooster(input as Parameters<typeof calcGasBooster>[0], opt),
    copyText: (input, d) => gasBoosterCopyText(input as Parameters<typeof gasBoosterCopyText>[0], d),
    makeParams: (f) => `V=${f.vesselVolumeLiter || '—'} L · Pin=${f.supplyPressureBar || '—'} bar · Ptarget=${f.targetPressureBar || '—'} bar`,
    preset, digits, onRestored, onSave, onToast,
  });

  const run = useCallback(() => { rawRun(); touchUsage('gas-booster'); }, [rawRun]);
  useEnterSubmit(run);

  return (
    <div className="tool-layout">
      <div className="tool-form card card-pad">
        <div className="result-title">输入参数</div>
        <NumField label="被充容器容积" symbol="V" value={form.vesselVolumeLiter} onChange={(v) => setForm({ ...form, vesselVolumeLiter: v })} unit="L" error={errors.vesselVolumeLiter} presets={[5, 10, 20, 50, 100]} />
        <NumField label="气源初充压力" symbol="Pin" value={form.supplyPressureBar} onChange={(v) => setForm({ ...form, supplyPressureBar: v })} unit="bar" error={errors.supplyPressureBar} presets={[10, 20, 30, 50, 100]} />
        <NumField label="目标充装压力" symbol="Ptarget" value={form.targetPressureBar} onChange={(v) => setForm({ ...form, targetPressureBar: v })} unit="bar" error={errors.targetPressureBar} presets={[200, 300, 350, 700, 900]} />
        <NumField label="驱动气源压力" symbol="PL" value={form.driveAirPressureBar} onChange={(v) => setForm({ ...form, driveAirPressureBar: v })} unit="bar" error={errors.driveAirPressureBar} presets={[6.0, 7.0, 8.0]} hint="通常 6~8 bar 工业压缩空气" />
        <NumField label="增压器增压比" symbol="i" value={form.boosterRatio} onChange={(v) => setForm({ ...form, boosterRatio: v })} error={errors.boosterRatio} presets={[15, 30, 60, 75, 150]} hint="Maximator/Haskel 常用增压比" />
        <NumField label="每双冲程排量" symbol="Vdisp" value={form.displacementCcPerStroke} onChange={(v) => setForm({ ...form, displacementCcPerStroke: v })} unit="cc" error={errors.displacementCcPerStroke} presets={[20, 45, 80, 120]} />
        <div className="btn-row">
          <button className="btn" onClick={run}>计算</button>
          <button className="btn ghost" onClick={reset}>重置</button>
        </div>
      </div>

      <CalcResult data={result} hasInput={!!result} onCopy={copy} onSave={save} onReset={reset} />
    </div>
  );
}
