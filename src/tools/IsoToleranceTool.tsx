// ISO 公差与配合查询工具页
import { useCallback } from 'react';
import type { HistoryRecord } from '../types';
import { ISO_TOLERANCE_DEFAULTS, HOLE_GRADE_OPTIONS, SHAFT_GRADE_OPTIONS, FIT_SCENARIOS, calcIsoTolerance, isoToleranceCopyText } from '../calc/isoTolerance';
import { parseNum } from '../lib/format';
import { touchUsage } from '../lib/history';
import { useToolForm } from '../lib/useToolForm';
import { useEnterSubmit } from '../lib/useEnterSubmit';
import { NumField, SelectField } from '../components/Field';
import { CalcResult } from '../components/CalcResult';

interface Props {
  digits: number;
  preset: Record<string, string> | null;
  onRestored: () => void;
  onSave: (rec: HistoryRecord) => void;
  onToast: (msg: string) => void;
}

const DEFAULTS = {
  nominalDiameterMm: String(ISO_TOLERANCE_DEFAULTS.nominalDiameterMm),
  holeGrade: ISO_TOLERANCE_DEFAULTS.holeGrade,
  shaftGrade: ISO_TOLERANCE_DEFAULTS.shaftGrade,
};

export function IsoToleranceTool({ digits, preset, onRestored, onSave, onToast }: Props) {
  const { form, setForm, errors, result, setResult, run: rawRun, reset, copy, save } = useToolForm({
    toolId: 'tolerance', toolName: 'ISO 公差配合', defaults: DEFAULTS,
    buildInput: (f) => ({
      nominalDiameterMm: parseNum(f.nominalDiameterMm),
      holeGrade: f.holeGrade, shaftGrade: f.shaftGrade,
    }),
    calc: (input, opt) => calcIsoTolerance(input as Parameters<typeof calcIsoTolerance>[0], opt),
    copyText: (input, d) => isoToleranceCopyText(input as Parameters<typeof isoToleranceCopyText>[0], d),
    makeParams: (f) => `Ф${f.nominalDiameterMm || '—'} · ${f.holeGrade} / ${f.shaftGrade}`,
    preset, digits, onRestored, onSave, onToast,
  });

  const run = useCallback(() => { rawRun(); touchUsage('tolerance'); }, [rawRun]);
  useEnterSubmit(run);

  const applyFit = useCallback((hole: string, shaft: string) => {
    setForm((f) => ({ ...f, holeGrade: hole, shaftGrade: shaft }));
    setResult(null);
  }, [setForm, setResult]);

  return (
    <div className="tool-layout">
      <div className="tool-form card card-pad">
        <div className="result-title">输入参数</div>
        <NumField label="公称尺寸" symbol="D" value={form.nominalDiameterMm} onChange={(v) => setForm({ ...form, nominalDiameterMm: v })} unit="mm" error={errors.nominalDiameterMm} hint="支持 1 ~ 500 mm" />
        <SelectField
          label="孔公差带"
          value={form.holeGrade}
          onChange={(v) => setForm({ ...form, holeGrade: v })}
          options={HOLE_GRADE_OPTIONS.map((g) => ({ value: g, label: g }))}
        />
        <SelectField
          label="轴公差带"
          value={form.shaftGrade}
          onChange={(v) => setForm({ ...form, shaftGrade: v })}
          options={SHAFT_GRADE_OPTIONS.map((g) => ({ value: g, label: g }))}
        />
        <div className="field">
          <div className="lbl"><span>典型配合速选</span></div>
          <div className="preset-list" style={{ marginTop: 6, gap: 6 }}>
            {FIT_SCENARIOS.map((s) => (
              <button
                key={s.key}
                type="button"
                className="preset-chip"
                style={{ padding: '2px 10px', fontSize: 11 }}
                title={s.desc}
                onClick={() => applyFit(s.hole, s.shaft)}
              >
                {s.name}
              </button>
            ))}
          </div>
          <div className="hint">点击自动填入孔/轴公差带,悬停查看适用场景</div>
        </div>
        <div className="btn-row">
          <button className="btn" onClick={run}>计算</button>
          <button className="btn ghost" onClick={reset}>重置</button>
        </div>
      </div>

      <CalcResult data={result} hasInput={!!result} onCopy={copy} onSave={save} onReset={reset} />
    </div>
  );
}
