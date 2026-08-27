// 轴径计算工具页
import { useCallback } from 'react';
import type { HistoryRecord } from '../types';
import { SHAFT_DEFAULTS, calcShaft, shaftCopyText } from '../calc/shaftDiameter';
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
  mode: 'torque',
  torque: String(SHAFT_DEFAULTS.torque),
  power: '',
  speed: '',
  tau: String(SHAFT_DEFAULTS.tau),
  safety: String(SHAFT_DEFAULTS.safety),
  bendingMoment: '',
  sigmaB: '',
  keywayFactor: '1',
  hollowRatio: '0',
};

export function ShaftDiameterTool({ digits, preset, onRestored, onSave, onToast }: Props) {
  const { form, setForm, errors, setErrors, result, setResult, run: rawRun, reset, copy, save } = useToolForm({
    toolId: 'shaft', toolName: '轴径计算', defaults: DEFAULTS,
    buildInput: (f) => ({
      mode: f.mode, torque: parseNum(f.torque), power: parseNum(f.power),
      speed: parseNum(f.speed), tau: parseNum(f.tau), safety: parseNum(f.safety),
      bendingMoment: parseNum(f.bendingMoment), sigmaB: parseNum(f.sigmaB),
      keywayFactor: parseNum(f.keywayFactor) ?? 1,
      hollowRatio: parseNum(f.hollowRatio) ?? 0,
    }),
    calc: (input, opt) => calcShaft(input as Parameters<typeof calcShaft>[0], opt),
    copyText: (input, d) => shaftCopyText(input as Parameters<typeof shaftCopyText>[0], d),
    makeParams: (f) => {
      const base = f.mode === 'torque'
        ? `扭矩 ${f.torque || '—'} N·m`
        : `功率 ${f.power || '—'} kW · n=${f.speed || '—'} rpm`;
      return [
        base,
        `[τ]=${f.tau || '—'} MPa`,
        `S=${f.safety || '—'}`,
        ...(parseNum(f.bendingMoment) != null && (parseNum(f.bendingMoment) as number) > 0
          ? [`M=${f.bendingMoment} N·m`, `[σb]=${f.sigmaB || '60'} MPa`]
          : []),
        f.keywayFactor !== '1' ? `Kw=${f.keywayFactor}` : null,
        f.hollowRatio !== '0' && f.hollowRatio !== '' ? `α=${f.hollowRatio}` : null,
      ].filter(Boolean).join(' · ');
    },
    preset, digits, onRestored, onSave, onToast,
  });

  const run = useCallback(() => { rawRun(); touchUsage('shaft'); }, [rawRun]);
  useEnterSubmit(run);

  return (
    <div className="tool-layout">
      <div className="tool-form card card-pad">
        <div className="result-title">输入参数</div>
        <SegField
          label="载荷输入方式"
          value={form.mode as 'torque' | 'power'}
          onChange={(v) => { setForm({ ...form, mode: v }); setErrors({}); setResult(null); }}
          options={[{ value: 'torque', label: '已知扭矩' }, { value: 'power', label: '功率+转速' }]}
        />
        {form.mode === 'torque' ? (
          <NumField label="扭矩" symbol="T" value={form.torque} onChange={(v) => setForm({ ...form, torque: v })} unit="N·m" error={errors.torque} />
        ) : (
          <>
            <NumField label="传递功率" symbol="P" value={form.power} onChange={(v) => setForm({ ...form, power: v })} unit="kW" error={errors.power} />
            <NumField label="转速" symbol="n" value={form.speed} onChange={(v) => setForm({ ...form, speed: v })} unit="rpm" error={errors.speed} hint="由 T = 9550·P/n 换算扭矩" />
          </>
        )}
        <NumField label="许用扭应力" symbol="[τ]" value={form.tau} onChange={(v) => setForm({ ...form, tau: v })} unit="MPa" error={errors.tau} hint="常用 45 钢 ≈ 30~40 MPa" />
        <NumField label="安全系数" symbol="S" value={form.safety} onChange={(v) => setForm({ ...form, safety: v })} unit="—" error={errors.safety} hint="建议 ≥ 1.2" />
        <NumField label="弯矩(可选)" symbol="M" value={form.bendingMoment} onChange={(v) => setForm({ ...form, bendingMoment: v })} unit="N·m" error={errors.bendingMoment} hint="悬臂力/齿轮径向力产生的弯矩,输入后自动启用弯扭合成" />
        {parseNum(form.bendingMoment) != null && (parseNum(form.bendingMoment) as number) > 0 && (
          <NumField label="许用弯应力" symbol="[σb]" value={form.sigmaB} onChange={(v) => setForm({ ...form, sigmaB: v })} unit="MPa" error={errors.sigmaB} placeholder="60" hint="留空默认 60 MPa(约对应 45 钢调质脉动弯曲)" />
        )}
        <div className="field">
          <div className="lbl"><span>键槽削弱</span></div>
          <div className="seg">
            {[{ v: '1', l: '无键槽' }, { v: '0.85', l: '单键槽' }, { v: '0.75', l: '双键槽' }].map((o) => (
              <button key={o.v} type="button" className={form.keywayFactor === o.v ? 'active' : ''} onClick={() => setForm({ ...form, keywayFactor: o.v })}>{o.l}</button>
            ))}
          </div>
        </div>
        <NumField label="空心轴内外径比" symbol="α" value={form.hollowRatio} onChange={(v) => setForm({ ...form, hollowRatio: v })} unit="di/do" error={errors.hollowRatio} hint="实心轴填 0,空心轴填 di/do(如 0.5)" />
        <div className="btn-row">
          <button className="btn" onClick={run}>计算</button>
          <button className="btn ghost" onClick={reset}>重置</button>
        </div>
      </div>

      <CalcResult data={result} hasInput={!!result} onCopy={copy} onSave={save} onReset={reset} />
    </div>
  );
}
