// 管路压力损失工具页(沿程+局部压降、流态与流速校核)
import { useCallback } from 'react';
import type { HistoryRecord } from '../types';
import type { PipeLineType } from '../calc/pipeLoss';
import { PIPE_LOSS_DEFAULTS, PIPE_FITTINGS, calcPipeLoss, pipeLossCopyText } from '../calc/pipeLoss';
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
  lineType: PIPE_LOSS_DEFAULTS.lineType,
  flowRateLMin: String(PIPE_LOSS_DEFAULTS.flowRateLMin),
  innerDiaMm: String(PIPE_LOSS_DEFAULTS.innerDiaMm),
  lengthM: String(PIPE_LOSS_DEFAULTS.lengthM),
  kinViscCst: String(PIPE_LOSS_DEFAULTS.kinViscCst),
  densityKgM3: String(PIPE_LOSS_DEFAULTS.densityKgM3),
  roughnessMm: String(PIPE_LOSS_DEFAULTS.roughnessMm),
  localK: String(PIPE_LOSS_DEFAULTS.localK),
  fittings: '',
};

export function PipeLossTool({ digits, preset, onRestored, onSave, onToast }: Props) {
  const { form, setForm, errors, result, run: rawRun, reset, copy, save } = useToolForm({
    toolId: 'pipe-loss', toolName: '管路压力损失', defaults: DEFAULTS,
    buildInput: (f) => ({
      lineType: f.lineType as PipeLineType,
      flowRateLMin: parseNum(f.flowRateLMin), innerDiaMm: parseNum(f.innerDiaMm),
      lengthM: parseNum(f.lengthM), kinViscCst: parseNum(f.kinViscCst),
      densityKgM3: parseNum(f.densityKgM3), roughnessMm: parseNum(f.roughnessMm),
      localK: parseNum(f.localK),
      fittings: f.fittings ? f.fittings.split(',') : [],
    }),
    calc: (input, opt) => calcPipeLoss(input as Parameters<typeof calcPipeLoss>[0], opt),
    copyText: (input, d) => pipeLossCopyText(input as Parameters<typeof pipeLossCopyText>[0], d),
    makeParams: (f) => `${f.lineType === 'SUCTION' ? '吸油' : f.lineType === 'RETURN' ? '回油' : '压力'} · Q=${f.flowRateLMin || '—'}L/min · d=${f.innerDiaMm || '—'}mm · L=${f.lengthM || '—'}m`,
    preset, digits, onRestored, onSave, onToast,
  });

  const run = useCallback(() => { rawRun(); touchUsage('pipe-loss'); }, [rawRun]);
  useEnterSubmit(run);

  return (
    <div className="tool-layout">
      <div className="tool-form card card-pad">
        <div className="result-title">输入参数</div>
        <SegField
          label="管路类型"
          value={form.lineType as PipeLineType}
          onChange={(v) => setForm({ ...form, lineType: v })}
          options={[
            { value: 'SUCTION', label: '吸油' },
            { value: 'PRESSURE', label: '压力' },
            { value: 'RETURN', label: '回油' },
          ]}
        />
        <NumField label="体积流量" symbol="Q" value={form.flowRateLMin} onChange={(v) => setForm({ ...form, flowRateLMin: v })} unit="L/min" error={errors.flowRateLMin} presets={[10, 20, 40, 60, 100]} />
        <NumField label="管道内径" symbol="d" value={form.innerDiaMm} onChange={(v) => setForm({ ...form, innerDiaMm: v })} unit="mm" error={errors.innerDiaMm} presets={[6, 8, 10, 12, 16, 20, 25, 32]} />
        <NumField label="管长" symbol="L" value={form.lengthM} onChange={(v) => setForm({ ...form, lengthM: v })} unit="m" error={errors.lengthM} hint="只算局部损失可填 0" />
        <NumField
          label="运动粘度" symbol="ν"
          value={form.kinViscCst} onChange={(v) => setForm({ ...form, kinViscCst: v })}
          unit="mm²/s" error={errors.kinViscCst}
          presets={[15, 22, 32, 46, 68]}
          hint="VG 牌号即 40℃ 粘度:L-HM32≈32,L-HM46≈46;低温启动时粘度显著升高"
        />
        <NumField label="油液密度" symbol="ρ" value={form.densityKgM3} onChange={(v) => setForm({ ...form, densityKgM3: v })} unit="kg/m³" error={errors.densityKgM3} hint="矿物油典型 870~900" />
        <NumField
          label="局部阻力系数(手填)" symbol="Σζ"
          value={form.localK} onChange={(v) => setForm({ ...form, localK: v })}
          unit="—" error={errors.localK}
          hint="额外补充的 ζ 值,与下方管件选择累加;不确定可填 0 仅用管件库"
        />
        <div className="field">
          <div className="lbl"><span>管件选择(多选,自动累加 ζ)</span></div>
          <div className="preset-list" style={{ marginTop: 6, gap: 6 }}>
            {PIPE_FITTINGS.map((fit) => {
              const selected = form.fittings.split(',').filter(Boolean).includes(fit.key);
              return (
                <button
                  key={fit.key}
                  type="button"
                  className="preset-chip"
                  style={{ padding: '2px 10px', fontSize: 11, opacity: selected ? 1 : 0.65, fontWeight: selected ? 700 : 400 }}
                  onClick={() => {
                    const cur = form.fittings.split(',').filter(Boolean);
                    const next = selected ? cur.filter((k) => k !== fit.key) : [...cur, fit.key];
                    setForm({ ...form, fittings: next.join(',') });
                  }}
                >
                  {selected ? '✓ ' : ''}{fit.name} ζ={fit.zeta}
                </button>
              );
            })}
          </div>
        </div>
        <NumField label="绝对粗糙度" symbol="ε" value={form.roughnessMm} onChange={(v) => setForm({ ...form, roughnessMm: v })} unit="mm" error={errors.roughnessMm} hint="冷拔无缝钢管≈0.0015,不锈钢光管可填 0" />
        <div className="btn-row">
          <button className="btn" onClick={run}>计算</button>
          <button className="btn ghost" onClick={reset}>重置</button>
        </div>
      </div>

      <CalcResult data={result} hasInput={!!result} onCopy={copy} onSave={save} onReset={reset} />
    </div>
  );
}
