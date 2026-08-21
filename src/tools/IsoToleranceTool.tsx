// ISO 公差与配合查询工具页
import { useCallback } from 'react';
import type { HistoryRecord } from '../types';
import { ISO_TOLERANCE_DEFAULTS, HOLE_GRADE_OPTIONS, SHAFT_GRADE_OPTIONS, calcIsoTolerance, isoToleranceCopyText } from '../calc/isoTolerance';
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
  const { form, setForm, errors, result, run: rawRun, reset, copy, save } = useToolForm({
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
          hint="常用配合: H7/g6 间隙 · H7/k6 过渡 · H7/p6 过盈"
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
