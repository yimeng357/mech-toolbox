// 同步带与 V 带传动计算工具页(几何 + 容量校核)
import { useCallback } from 'react';
import type { HistoryRecord } from '../types';
import {
  BELT_DRIVE_DEFAULTS, calcBeltDrive, beltDriveCopyText, type BeltType,
  TIMING_SECTIONS, V_BELT_SECTIONS, type TimingSection, type VBeltSection,
} from '../calc/beltDrive';
import { parseNum } from '../lib/format';
import { touchUsage } from '../lib/history';
import { useToolForm } from '../lib/useToolForm';
import { useEnterSubmit } from '../lib/useEnterSubmit';
import { NumField, SegField, SelectField } from '../components/Field';
import { CalcResult } from '../components/CalcResult';

interface Props {
  digits: number;
  preset: Record<string, string> | null;
  onRestored: () => void;
  onSave: (rec: HistoryRecord) => void;
  onToast: (msg: string) => void;
}

const DEFAULTS = {
  beltType: BELT_DRIVE_DEFAULTS.beltType,
  powerKw: String(BELT_DRIVE_DEFAULTS.powerKw),
  speedRpm: String(BELT_DRIVE_DEFAULTS.speedRpm),
  ratio: String(BELT_DRIVE_DEFAULTS.ratio),
  d1: String(BELT_DRIVE_DEFAULTS.d1),
  pitch: String(BELT_DRIVE_DEFAULTS.pitch),
  a0: String(BELT_DRIVE_DEFAULTS.a0),
  serviceFactor: String(BELT_DRIVE_DEFAULTS.serviceFactor),
  timingSection: BELT_DRIVE_DEFAULTS.timingSection ?? '',
  beltWidthMm: String(BELT_DRIVE_DEFAULTS.beltWidthMm ?? ''),
  vBeltSection: '',
  beltCount: '',
};

const timingOptions = [
  { value: '', label: '— 手动指定节距 —' },
  ...Object.entries(TIMING_SECTIONS).map(([k, s]) => ({ value: k, label: `${k}(节距 ${s.pitchMm} mm)` })),
];

const vBeltOptions = [
  { value: '', label: '— 不做容量校核 —' },
  ...Object.entries(V_BELT_SECTIONS).map(([k, s]) => ({ value: k, label: `${k}(≥${s.minDiaMm} mm)` })),
];

const widthPresets: Partial<Record<TimingSection, Array<string | number>>> = {
  MXL: [3.048, 4.826, 6.35],
  XL: [6.35, 9.652],
  L: [12.7, 19.05, 25.4],
  H: [19.05, 25.4, 38.1, 50.8, 76.2],
  XH: [50.8, 76.2, 101.6],
  XXH: [50.8, 76.2, 101.6, 127],
};

/** 按带型给出小带轮最小齿数提示 */
function minTeethHint(sec: TimingSection | ''): string | undefined {
  if (!sec) return undefined;
  const s = TIMING_SECTIONS[sec];
  return `推荐小带轮齿数 ≥ ${s.minTeeth}`;
}

export function BeltDriveTool({ digits, preset, onRestored, onSave, onToast }: Props) {
  const { form, setForm, errors, result, setResult, run: rawRun, reset, copy, save } = useToolForm({
    toolId: 'belt', toolName: '同步带与 V 带', defaults: DEFAULTS,
    buildInput: (f) => ({
      beltType: f.beltType as BeltType,
      powerKw: parseNum(f.powerKw), speedRpm: parseNum(f.speedRpm),
      ratio: parseNum(f.ratio), d1: parseNum(f.d1), pitch: parseNum(f.pitch),
      a0: parseNum(f.a0), serviceFactor: parseNum(f.serviceFactor),
      timingSection: (f.timingSection || undefined) as TimingSection | undefined,
      beltWidthMm: f.timingSection ? parseNum(f.beltWidthMm) : null,
      vBeltSection: (f.vBeltSection || undefined) as VBeltSection | undefined,
      beltCount: parseNum(f.beltCount),
    }),
    calc: (input, opt) => calcBeltDrive(input as Parameters<typeof calcBeltDrive>[0], opt),
    copyText: (input, d) => beltDriveCopyText(input as Parameters<typeof beltDriveCopyText>[0], d),
    makeParams: (f) => {
      const type = f.beltType === 'TIMING'
        ? `同步带${f.timingSection ? ' ' + f.timingSection : ''}`
        : `V 带${f.vBeltSection ? ' ' + f.vBeltSection : ''}`;
      return `${type} · P=${f.powerKw || '—'}kW · n1=${f.speedRpm || '—'}rpm · i=${f.ratio || '—'} · d1=${f.d1 || '—'}mm`;
    },
    preset, digits, onRestored, onSave, onToast,
  });

  const run = useCallback(() => { rawRun(); touchUsage('belt'); }, [rawRun]);
  useEnterSubmit(run);

  const onTimingSectionChange = (v: string) => {
    setResult(null);
    if (!v) { setForm({ ...form, timingSection: '' }); return; }
    const sec = v as TimingSection;
    const spec = TIMING_SECTIONS[sec];
    setForm({ ...form, timingSection: sec, pitch: String(spec.pitchMm) });
  };

  const onVBeltSectionChange = (v: string) => {
    setResult(null);
    setForm({ ...form, vBeltSection: v });
  };

  return (
    <div className="tool-layout">
      <div className="tool-form card card-pad">
        <div className="result-title">输入参数</div>
        <SegField
          label="带型大类"
          value={form.beltType as BeltType}
          onChange={(v) => { setForm({ ...form, beltType: v }); setResult(null); }}
          options={[{ value: 'TIMING', label: '同步带' }, { value: 'V_BELT', label: 'V 带' }]}
        />
        <NumField label="传递功率" symbol="P" value={form.powerKw} onChange={(v) => setForm({ ...form, powerKw: v })} unit="kW" error={errors.powerKw} presets={[0.75, 1.5, 2.2, 4, 7.5]} />
        <NumField label="主动轮转速" symbol="n₁" value={form.speedRpm} onChange={(v) => setForm({ ...form, speedRpm: v })} unit="rpm" error={errors.speedRpm} presets={[960, 1450, 2880]} />
        <NumField label="传动比" symbol="i" value={form.ratio} onChange={(v) => setForm({ ...form, ratio: v })} unit="—" error={errors.ratio} hint="i = n₁/n₂ = d₂/d₁" />
        <NumField label="小带轮节径" symbol="d₁" value={form.d1} onChange={(v) => setForm({ ...form, d1: v })} unit="mm" error={errors.d1} />
        {form.beltType === 'TIMING' ? (
          <>
            <SelectField
              label="同步带带型(容量校核)"
              value={form.timingSection}
              onChange={onTimingSectionChange}
              options={timingOptions}
              hint={minTeethHint(form.timingSection as TimingSection | '')}
            />
            {form.timingSection ? (
              <NumField
                label="带宽" symbol="b" value={form.beltWidthMm}
                onChange={(v) => setForm({ ...form, beltWidthMm: v })}
                unit="mm" error={errors.beltWidthMm}
                presets={widthPresets[form.timingSection as TimingSection] ?? []}
                hint="选定带型后参与额定功率计算"
              />
            ) : (
              <NumField label="带齿节距" symbol="pb" value={form.pitch} onChange={(v) => setForm({ ...form, pitch: v })} unit="mm" error={errors.pitch} hint="MXL=2.032 · XL=5.08 · L=9.525 · H=12.7 mm" />
            )}
          </>
        ) : (
          <SelectField
            label="V 带带型(容量校核)"
            value={form.vBeltSection}
            onChange={onVBeltSectionChange}
            options={vBeltOptions}
            hint="窄 V 带 BS 3790 系列;选择后计算单根许用功率与推荐根数"
          />
        )}
        <NumField label="初定中心距" symbol="a₀" value={form.a0} onChange={(v) => setForm({ ...form, a0: v })} unit="mm" error={errors.a0} hint="一般取 (0.7~2)·(d₁+d₂)" />
        <NumField label="工况系数" symbol="KA" value={form.serviceFactor} onChange={(v) => setForm({ ...form, serviceFactor: v })} unit="—" error={errors.serviceFactor} hint="平稳载荷 1.0~1.2,冲击载荷 1.3~1.5" />
        {form.beltType === 'V_BELT' && form.vBeltSection ? (
          <NumField
            label="V 带根数" symbol="N" value={form.beltCount}
            onChange={(v) => setForm({ ...form, beltCount: v })}
            unit="根" error={errors.beltCount} opt="可选"
            hint="留空自动计算推荐根数;填入则校核给定根数是否足够"
          />
        ) : null}
        <div className="btn-row">
          <button className="btn" onClick={run}>计算</button>
          <button className="btn ghost" onClick={reset}>重置</button>
        </div>
      </div>

      <CalcResult data={result} hasInput={!!result} onCopy={copy} onSave={save} onReset={reset} />
    </div>
  );
}
