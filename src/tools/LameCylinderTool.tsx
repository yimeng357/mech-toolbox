// 厚壁圆筒拉美应力与爆破压力工具页(含端部条件)
import { useCallback } from 'react';
import type { HistoryRecord } from '../types';
import { LAME_CYLINDER_DEFAULTS, calcLameCylinder, lameCylinderCopyText, type LameEndCondition } from '../calc/lameCylinder';
import { parseNum } from '../lib/format';
import { touchUsage } from '../lib/history';
import { useToolForm } from '../lib/useToolForm';
import { useEnterSubmit } from '../lib/useEnterSubmit';
import { MaterialSelectField, NumField, SegField } from '../components/Field';
import { CalcResult } from '../components/CalcResult';

interface Props {
  digits: number;
  preset: Record<string, string> | null;
  onRestored: () => void;
  onSave: (rec: HistoryRecord) => void;
  onToast: (msg: string) => void;
}

const DEFAULTS = {
  internalPressureBar: String(LAME_CYLINDER_DEFAULTS.internalPressureBar),
  innerDiameterMm: String(LAME_CYLINDER_DEFAULTS.innerDiameterMm),
  outerDiameterMm: String(LAME_CYLINDER_DEFAULTS.outerDiameterMm),
  endCondition: LAME_CYLINDER_DEFAULTS.endCondition ?? 'CLOSED',
  axialForceN: '',
  yieldStrengthMpa: String(LAME_CYLINDER_DEFAULTS.yieldStrengthMpa),
  tensileStrengthMpa: String(LAME_CYLINDER_DEFAULTS.tensileStrengthMpa),
  safetyFactorYield: String(LAME_CYLINDER_DEFAULTS.safetyFactorYield),
  safetyFactorBurst: String(LAME_CYLINDER_DEFAULTS.safetyFactorBurst),
};

export function LameCylinderTool({ digits, preset, onRestored, onSave, onToast }: Props) {
  const { form, setForm, errors, result, run: rawRun, reset, copy, save } = useToolForm({
    toolId: 'lame-cylinder', toolName: '厚壁圆筒与爆破压力', defaults: DEFAULTS,
    buildInput: (f) => ({
      internalPressureBar: parseNum(f.internalPressureBar),
      innerDiameterMm: parseNum(f.innerDiameterMm),
      outerDiameterMm: parseNum(f.outerDiameterMm),
      endCondition: f.endCondition as LameEndCondition,
      axialForceN: f.endCondition === 'OPEN' ? parseNum(f.axialForceN) : null,
      yieldStrengthMpa: parseNum(f.yieldStrengthMpa),
      tensileStrengthMpa: parseNum(f.tensileStrengthMpa),
      safetyFactorYield: parseNum(f.safetyFactorYield) ?? 1.5,
      safetyFactorBurst: parseNum(f.safetyFactorBurst) ?? 2.5,
    }),
    calc: (input, opt) => calcLameCylinder(input as Parameters<typeof calcLameCylinder>[0], opt),
    copyText: (input, d) => lameCylinderCopyText(input as Parameters<typeof lameCylinderCopyText>[0], d),
    makeParams: (f) => `Pi=${f.internalPressureBar || '—'} bar · Di=${f.innerDiameterMm || '—'} · Do=${f.outerDiameterMm || '—'} · ${f.endCondition === 'CLOSED' ? '闭口' : '开口'}`,
    preset, digits, onRestored, onSave, onToast,
  });

  const run = useCallback(() => { rawRun(); touchUsage('lame-cylinder'); }, [rawRun]);
  useEnterSubmit(run);

  return (
    <div className="tool-layout">
      <div className="tool-form card card-pad">
        <div className="result-title">输入参数</div>
        <NumField label="内部工作压力" symbol="Pi" value={form.internalPressureBar} onChange={(v) => setForm({ ...form, internalPressureBar: v })} unit="bar" error={errors.internalPressureBar} presets={[700, 1400, 2800, 4000, 6000]} hint="超高压系统工作压力" />
        <NumField label="筒体内径" symbol="Di" value={form.innerDiameterMm} onChange={(v) => setForm({ ...form, innerDiameterMm: v })} unit="mm" error={errors.innerDiameterMm} presets={[10, 20, 25, 40, 50]} />
        <NumField label="筒体外径" symbol="Do" value={form.outerDiameterMm} onChange={(v) => setForm({ ...form, outerDiameterMm: v })} unit="mm" error={errors.outerDiameterMm} presets={[30, 50, 60, 80, 100]} />
        <SegField
          label="端部条件"
          value={form.endCondition as LameEndCondition}
          onChange={(v) => setForm({ ...form, endCondition: v })}
          options={[
            { value: 'CLOSED', label: '闭口圆筒' },
            { value: 'OPEN', label: '开口圆筒' },
          ]}
        />
        {form.endCondition === 'OPEN' && (
          <NumField label="外部轴向力" symbol="F" value={form.axialForceN} onChange={(v) => setForm({ ...form, axialForceN: v })} unit="N" error={errors.axialForceN} opt="可选" hint="拉力为正;开口圆筒的轴向应力来源,留空则 σz=0" />
        )}
        <MaterialSelectField
          hint="选中后自动填入屈服/抗拉强度(手册典型值),可再手动微调"
          onPick={(m) => {
            if (m) setForm((f) => ({ ...f, yieldStrengthMpa: String(m.sigmaS), tensileStrengthMpa: String(m.sigmaB) }));
          }}
        />
        <NumField label="材料屈服强度" symbol="Rp0.2" value={form.yieldStrengthMpa} onChange={(v) => setForm({ ...form, yieldStrengthMpa: v })} unit="MPa" error={errors.yieldStrengthMpa} presets={[345, 650, 850, 1050]} hint="材料 0.2% 条件屈服强度" />
        <NumField label="材料抗拉强度" symbol="Rm" value={form.tensileStrengthMpa} onChange={(v) => setForm({ ...form, tensileStrengthMpa: v })} unit="MPa" error={errors.tensileStrengthMpa} presets={[550, 800, 1050, 1250]} />
        <NumField label="屈服安全系数" symbol="Sfy" value={form.safetyFactorYield} onChange={(v) => setForm({ ...form, safetyFactorYield: v })} unit="—" error={errors.safetyFactorYield} hint="默认 1.5" />
        <NumField label="爆破安全系数" symbol="Sfb" value={form.safetyFactorBurst} onChange={(v) => setForm({ ...form, safetyFactorBurst: v })} unit="—" error={errors.safetyFactorBurst} hint="默认 2.5" />
        <div className="btn-row">
          <button className="btn" onClick={run}>计算</button>
          <button className="btn ghost" onClick={reset}>重置</button>
        </div>
      </div>

      <CalcResult data={result} hasInput={!!result} onCopy={copy} onSave={save} onReset={reset} />
    </div>
  );
}
