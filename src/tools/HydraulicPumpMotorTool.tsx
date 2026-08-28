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
import { PresetBar } from '../components/PresetBar';

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
  suctionLiftM: '',
  suctionLossBar: '',
  tankPressureBar: '',
  oilVaporBar: '',
  npshRequiredM: '',
};

export function HydraulicPumpMotorTool({ digits, preset, onRestored, onSave, onToast }: Props) {
  const { form, setForm, errors, result, run: rawRun, reset, copy, save, presets, savePreset, applyPreset, deletePresetById, presetSaved } = useToolForm({
    toolId: 'pump', toolName: '液压泵电机匹配', defaults: DEFAULTS,
    buildInput: (f) => ({
      pressure: parseNum(f.pressure), flow: parseNum(f.flow), rpm: parseNum(f.rpm),
      etaV: parseNum(f.etaV), etaT: parseNum(f.etaT), km: parseNum(f.km),
      suctionLiftM: parseNum(f.suctionLiftM), suctionLossBar: parseNum(f.suctionLossBar),
      tankPressureBar: parseNum(f.tankPressureBar), oilVaporBar: parseNum(f.oilVaporBar),
      npshRequiredM: parseNum(f.npshRequiredM),
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
        <div className="field">
          <div className="lbl"><span>NPSH 汽蚀校核(可选,任填一项启用)</span></div>
          <div className="hint" style={{ marginBottom: 6 }}>评估泵吸入口汽蚀风险:安全裕量建议 ≥ 0.3 m</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div className="input-wrap"><input type="text" inputMode="decimal" placeholder="吸油高度 m" value={form.suctionLiftM} onChange={(e) => setForm({ ...form, suctionLiftM: e.target.value })} /></div>
            <div className="input-wrap"><input type="text" inputMode="decimal" placeholder="吸油压损 bar" value={form.suctionLossBar} onChange={(e) => setForm({ ...form, suctionLossBar: e.target.value })} /></div>
            <div className="input-wrap"><input type="text" inputMode="decimal" placeholder="油箱液面压力 bar" value={form.tankPressureBar} onChange={(e) => setForm({ ...form, tankPressureBar: e.target.value })} /></div>
            <div className="input-wrap"><input type="text" inputMode="decimal" placeholder="NPSHr m(泵样本)" value={form.npshRequiredM} onChange={(e) => setForm({ ...form, npshRequiredM: e.target.value })} /></div>
          </div>
          <div className="hint">留空默认:开式箱 1.013 bar;饱和蒸气压 0.001 bar(矿物油常温);吸油压损可用「管路压力损失」工具按吸油管工况计算后填入</div>
        </div>
        <PresetBar presets={presets} presetSaved={presetSaved} onSave={savePreset} onApply={applyPreset} onDelete={deletePresetById} />
        <div className="btn-row">
          <button className="btn" onClick={run}>计算</button>
          <button className="btn ghost" onClick={reset}>重置</button>
        </div>
      </div>

      <CalcResult data={result} hasInput={!!result} onCopy={copy} onSave={save} onReset={reset} />
    </div>
  );
}
