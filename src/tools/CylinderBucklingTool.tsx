// 液压缸活塞杆压杆稳定校核工具页(欧拉/约翰逊 + 端部约束 + 安全系数)
import { useCallback } from 'react';
import type { HistoryRecord } from '../types';
import type { EndFixity } from '../calc/cylinderBuckling';
import { CYLINDER_BUCKLING_DEFAULTS, calcRodBuckling, rodBucklingCopyText } from '../calc/cylinderBuckling';
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
  endFixity: CYLINDER_BUCKLING_DEFAULTS.endFixity,
  rodDiaMm: String(CYLINDER_BUCKLING_DEFAULTS.rodDiaMm),
  effLenMm: String(CYLINDER_BUCKLING_DEFAULTS.effLenMm),
  loadKN: String(CYLINDER_BUCKLING_DEFAULTS.loadKN),
  yieldMpa: String(CYLINDER_BUCKLING_DEFAULTS.yieldMpa),
  youngModulusGPa: String(CYLINDER_BUCKLING_DEFAULTS.youngModulusGPa),
  safetyRequired: String(CYLINDER_BUCKLING_DEFAULTS.safetyRequired),
};

export function CylinderBucklingTool({ digits, preset, onRestored, onSave, onToast }: Props) {
  const { form, setForm, errors, result, run: rawRun, reset, copy, save } = useToolForm({
    toolId: 'rod-buckling', toolName: '液压缸压杆稳定', defaults: DEFAULTS,
    buildInput: (f) => ({
      endFixity: f.endFixity as EndFixity,
      rodDiaMm: parseNum(f.rodDiaMm), effLenMm: parseNum(f.effLenMm),
      loadKN: parseNum(f.loadKN), yieldMpa: parseNum(f.yieldMpa),
      youngModulusGPa: parseNum(f.youngModulusGPa), safetyRequired: parseNum(f.safetyRequired),
    }),
    calc: (input, opt) => calcRodBuckling(input as Parameters<typeof calcRodBuckling>[0], opt),
    copyText: (input, d) => rodBucklingCopyText(input as Parameters<typeof rodBucklingCopyText>[0], d),
    makeParams: (f) => `杆φ${f.rodDiaMm || '—'} · L=${f.effLenMm || '—'}mm · F=${f.loadKN || '—'}kN`,
    preset, digits, onRestored, onSave, onToast,
  });

  const run = useCallback(() => { rawRun(); touchUsage('rod-buckling'); }, [rawRun]);
  useEnterSubmit(run);

  return (
    <div className="tool-layout">
      <div className="tool-form card card-pad">
        <div className="result-title">输入参数</div>
        <SegField
          label="安装/端部约束"
          value={form.endFixity as EndFixity}
          onChange={(v) => setForm({ ...form, endFixity: v })}
          options={[
            { value: 'PIN_PIN', label: '两端铰接' },
            { value: 'FIXED_FREE', label: '一固一自' },
            { value: 'FIXED_PIN', label: '一固一铰' },
            { value: 'FIXED_FIXED', label: '两端固定' },
          ]}
        />
        <NumField label="活塞杆直径" symbol="d" value={form.rodDiaMm} onChange={(v) => setForm({ ...form, rodDiaMm: v })} unit="mm" error={errors.rodDiaMm} presets={[25, 32, 40, 45, 56, 63, 70, 80, 90, 100]} />
        <NumField
          label="计算长度" symbol="L"
          value={form.effLenMm} onChange={(v) => setForm({ ...form, effLenMm: v })}
          unit="mm" error={errors.effLenMm}
          hint="完全伸出且受最大轴向压力时的受压段总长 ≈ 行程 + 最小安装导向距"
        />
        <NumField label="实际轴向载荷" symbol="F" value={form.loadKN} onChange={(v) => setForm({ ...form, loadKN: v })} unit="kN" error={errors.loadKN} opt="可选" hint="填入后给出安全系数判定;留空只算临界承载能力" />
        <MaterialSelectField
          hint="选中后自动填入活塞杆材料的屈服强度与弹性模量(手册典型值)"
          onPick={(m) => { if (m) setForm((f) => ({ ...f, yieldMpa: String(m.sigmaS), youngModulusGPa: String(m.eGPa) })); }}
        />
        <NumField label="屈服强度" symbol="σs" value={form.yieldMpa} onChange={(v) => setForm({ ...form, yieldMpa: v })} unit="MPa" error={errors.yieldMpa} hint="用于中柔度段判定与压应力校核" />
        <NumField label="弹性模量" symbol="E" value={form.youngModulusGPa} onChange={(v) => setForm({ ...form, youngModulusGPa: v })} unit="GPa" error={errors.youngModulusGPa} hint="钢 ≈ 206" />
        <NumField label="要求安全系数" symbol="n" value={form.safetyRequired} onChange={(v) => setForm({ ...form, safetyRequired: v })} unit="—" error={errors.safetyRequired} presets={[2, 3, 4]} hint="轻载静载 2~3,重载/冲击/偏载 ≥4" />
        <div className="btn-row">
          <button className="btn" onClick={run}>计算</button>
          <button className="btn ghost" onClick={reset}>重置</button>
        </div>
      </div>

      <CalcResult data={result} hasInput={!!result} onCopy={copy} onSave={save} onReset={reset} />
    </div>
  );
}
