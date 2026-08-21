// 液压泵与电机功率匹配工具页
import { useCallback } from 'react';
import type { HistoryRecord } from '../types';
import { HYDRAULIC_PUMP_MOTOR_DEFAULTS, calcHydraulicPumpMotor, hydraulicPumpMotorCopyText } from '../calc/hydraulicPumpMotor';
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
  pressure: String(HYDRAULIC_PUMP_MOTOR_DEFAULTS.pressure),
  flow: String(HYDRAULIC_PUMP_MOTOR_DEFAULTS.flow),
  rpm: String(HYDRAULIC_PUMP_MOTOR_DEFAULTS.rpm),
  etaV: String(HYDRAULIC_PUMP_MOTOR_DEFAULTS.etaV),
  etaT: String(HYDRAULIC_PUMP_MOTOR_DEFAULTS.etaT),
  km: String(HYDRAULIC_PUMP_MOTOR_DEFAULTS.km),
};

export function HydraulicPumpMotorTool({ digits, preset, onRestored, onSave, onToast }: Props) {
  const { form, setForm, errors, result, run: rawRun, reset, copy, save } = useToolForm({
    toolId: 'pump', toolName: '液压泵电机匹配', defaults: DEFAULTS,
    buildInput: (f) => ({
      pressure: parseNum(f.pressure), flow: parseNum(f.flow), rpm: parseNum(f.rpm),
      etaV: parseNum(f.etaV), etaT: parseNum(f.etaT), km: parseNum(f.km),
    }),
    calc: (input, opt) => calcHydraulicPumpMotor(input as Parameters<typeof calcHydraulicPumpMotor>[0], opt),
    copyText: (input, d) => hydraulicPumpMotorCopyText(input as Parameters<typeof hydraulicPumpMotorCopyText>[0], d),
    makeParams: (f) => `p=${f.pressure || '—'}bar · Q=${f.flow || '—'}L/min · n=${f.rpm || '—'}rpm · ηt=${f.etaT || '—'}`,
    preset, digits, onRestored, onSave, onToast,
  });

  const run = useCallback(() => { rawRun(); touchUsage('pump'); }, [rawRun]);
  useEnterSubmit(run);

  return (
    <div className="tool-layout">
      <div className="tool-form card card-pad">
        <div className="result-title">输入参数</div>
        <NumField label="最高工作压力" symbol="p" value={form.pressure} onChange={(v) => setForm({ ...form, pressure: v })} unit="bar" error={errors.pressure} hint="1 MPa = 10 bar" />
        <NumField label="系统流量" symbol="Q" value={form.flow} onChange={(v) => setForm({ ...form, flow: v })} unit="L/min" error={errors.flow} />
        <NumField label="泵转速" symbol="n" value={form.rpm} onChange={(v) => setForm({ ...form, rpm: v })} unit="rpm" error={errors.rpm} presets={[960, 1450, 2900]} />
        <NumField label="容积效率" symbol="ηv" value={form.etaV} onChange={(v) => setForm({ ...form, etaV: v })} unit="—" error={errors.etaV} hint="齿轮泵 0.85~0.95,柱塞泵 0.92~0.98" />
        <NumField label="总效率" symbol="ηt" value={form.etaT} onChange={(v) => setForm({ ...form, etaT: v })} unit="—" error={errors.etaT} hint="通常取 0.85~0.90" />
        <NumField label="电机功率裕量系数" symbol="km" value={form.km} onChange={(v) => setForm({ ...form, km: v })} unit="—" error={errors.km} hint="推荐 1.1~1.3,考虑启动与过载" />
        <div className="btn-row">
          <button className="btn" onClick={run}>计算</button>
          <button className="btn ghost" onClick={reset}>重置</button>
        </div>
      </div>

      <CalcResult data={result} hasInput={!!result} onCopy={copy} onSave={save} onReset={reset} />
    </div>
  );
}
