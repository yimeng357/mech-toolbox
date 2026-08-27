// 气压试验爆破能量工具页
import { useCallback } from 'react';
import type { HistoryRecord } from '../types';
import { PNEUMATIC_TEST_DEFAULTS, calcPneumaticTestEnergy, pneumaticTestEnergyCopyText, type PneumaticGasType } from '../calc/pneumaticTestEnergy';
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
  testVolumeLiter: String(PNEUMATIC_TEST_DEFAULTS.testVolumeLiter),
  testPressureBar: String(PNEUMATIC_TEST_DEFAULTS.testPressureBar),
  gasType: PNEUMATIC_TEST_DEFAULTS.gasType || 'NITROGEN',
};

export function PneumaticTestEnergyTool({ digits, preset, onRestored, onSave, onToast }: Props) {
  const { form, setForm, errors, result, setResult, run: rawRun, reset, copy, save } = useToolForm({
    toolId: 'pneumatic-energy', toolName: '气压试验爆破储能与安全距离', defaults: DEFAULTS,
    buildInput: (f) => ({
      testVolumeLiter: parseNum(f.testVolumeLiter),
      testPressureBar: parseNum(f.testPressureBar),
      gasType: f.gasType as PneumaticGasType,
    }),
    calc: (input, opt) => calcPneumaticTestEnergy(input as Parameters<typeof calcPneumaticTestEnergy>[0], opt),
    copyText: (input, d) => pneumaticTestEnergyCopyText(input as Parameters<typeof pneumaticTestEnergyCopyText>[0], d),
    makeParams: (f) => `V=${f.testVolumeLiter || '—'} L · P=${f.testPressureBar || '—'} bar · ${f.gasType}`,
    preset, digits, onRestored, onSave, onToast,
  });

  const run = useCallback(() => { rawRun(); touchUsage('pneumatic-energy'); }, [rawRun]);
  useEnterSubmit(run);

  return (
    <div className="tool-layout">
      <div className="tool-form card card-pad">
        <div className="result-title">输入参数</div>
        <NumField label="试压管路/容器总容积" symbol="V" value={form.testVolumeLiter} onChange={(v) => setForm({ ...form, testVolumeLiter: v })} unit="L" error={errors.testVolumeLiter} presets={[10, 25, 50, 100, 500]} />
        <NumField label="气压试验压力" symbol="P" value={form.testPressureBar} onChange={(v) => setForm({ ...form, testPressureBar: v })} unit="bar" error={errors.testPressureBar} presets={[100, 200, 350, 700, 1050]} />
        <SegField
          label="试压气体介质"
          value={form.gasType as PneumaticGasType}
          onChange={(v) => { setForm({ ...form, gasType: v }); setResult(null); }}
          options={[
            { value: 'NITROGEN', label: '氮气 (k=1.4)' },
            { value: 'AIR', label: '压缩空气 (k=1.4)' },
            { value: 'HELIUM', label: '氦气 (k=1.66)' },
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
