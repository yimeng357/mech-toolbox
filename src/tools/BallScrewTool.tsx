// 滚珠丝杠副寿命校核工具页
import { useCallback } from 'react';
import type { HistoryRecord } from '../types';
import { BALL_SCREW_DEFAULTS, calcBallScrew, ballScrewCopyText, type BallScrewSegment } from '../calc/ballScrew';
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
  dynamicLoadRatingN: String(BALL_SCREW_DEFAULTS.dynamicLoadRatingN),
  leadMm: String(BALL_SCREW_DEFAULTS.leadMm),
  rootDiaMm: String(BALL_SCREW_DEFAULTS.rootDiaMm),
  seg1Load: '4200', seg1Rpm: '300', seg1Ratio: '0.2',
  seg2Load: '1500', seg2Rpm: '900', seg2Ratio: '0.5',
  seg3Load: '300', seg3Rpm: '1500', seg3Ratio: '0.3',
  targetLifeHours: String(BALL_SCREW_DEFAULTS.targetLifeHours),
  lubrication: 'GREASE',
  efficiency: '0.9',
  meanFactor: '1.2',
};

export function BallScrewTool({ digits, preset, onRestored, onSave, onToast }: Props) {
  const { form, setForm, errors, result, run: rawRun, reset, copy, save } = useToolForm({
    toolId: 'ball-screw', toolName: '滚珠丝杠寿命', defaults: DEFAULTS,
    buildInput: (f) => {
      const segments: BallScrewSegment[] = [];
      for (let i = 1; i <= 3; i++) {
        const load = parseNum(f[`seg${i}Load`]);
        const rpm = parseNum(f[`seg${i}Rpm`]);
        const ratio = parseNum(f[`seg${i}Ratio`]);
        if (load != null && rpm != null && ratio != null && ratio > 0) {
          segments.push({ axialLoadN: load, rpm, ratio });
        }
      }
      return {
        dynamicLoadRatingN: parseNum(f.dynamicLoadRatingN),
        leadMm: parseNum(f.leadMm),
        rootDiaMm: parseNum(f.rootDiaMm),
        segments,
        targetLifeHours: parseNum(f.targetLifeHours),
        lubrication: (f.lubrication as 'GREASE' | 'OIL') || 'GREASE',
        efficiency: parseNum(f.efficiency),
        meanFactor: parseNum(f.meanFactor),
      };
    },
    calc: (input, opt) => calcBallScrew(input as Parameters<typeof calcBallScrew>[0], opt),
    copyText: (input, d) => ballScrewCopyText(input as Parameters<typeof ballScrewCopyText>[0], d),
    makeParams: (f) => `Ca=${f.dynamicLoadRatingN || '—'}N · Pb=${f.leadMm || '—'}mm · Fa=${f.seg1Load}/${f.seg2Load}/${f.seg3Load}N`,
    preset, digits, onRestored, onSave, onToast,
  });

  const run = useCallback(() => { rawRun(); touchUsage('ball-screw'); }, [rawRun]);
  useEnterSubmit(run);

  const setSeg = (i: number, key: 'Load' | 'Rpm' | 'Ratio', v: string) =>
    setForm({ ...form, [`seg${i}${key}`]: v });

  return (
    <div className="tool-layout">
      <div className="tool-form card card-pad">
        <div className="result-title">输入参数</div>
        <NumField label="额定动载荷" symbol="Ca" value={form.dynamicLoadRatingN} onChange={(v) => setForm({ ...form, dynamicLoadRatingN: v })} unit="N" error={errors.dynamicLoadRatingN} hint="厂家样本基本额定动载荷(注意区分预压型号)" presets={[12000, 28500, 53000]} />
        <NumField label="导程" symbol="Pb" value={form.leadMm} onChange={(v) => setForm({ ...form, leadMm: v })} unit="mm" error={errors.leadMm} presets={[5, 10, 16, 20]} />
        <NumField label="丝杠底径" symbol="d2" value={form.rootDiaMm} onChange={(v) => setForm({ ...form, rootDiaMm: v })} unit="mm" error={errors.rootDiaMm} opt="可选" hint="用于 dn 值限速校核" />

        <div className="lbl" style={{ marginTop: 8 }}><span>工况分段(占比合计 = 1,不用段留空载荷)</span></div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="field">
            <div className="lbl"><span>工况段 {i}</span></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <div className="input-wrap">
                <input type="text" inputMode="decimal" placeholder="载荷 N" value={form[`seg${i}Load`]} onChange={(e) => setSeg(i, 'Load', e.target.value)} />
              </div>
              <div className="input-wrap">
                <input type="text" inputMode="decimal" placeholder="转速 rpm" value={form[`seg${i}Rpm`]} onChange={(e) => setSeg(i, 'Rpm', e.target.value)} />
              </div>
              <div className="input-wrap">
                <input type="text" inputMode="decimal" placeholder="占比" value={form[`seg${i}Ratio`]} onChange={(e) => setSeg(i, 'Ratio', e.target.value)} />
              </div>
            </div>
          </div>
        ))}

        <NumField label="目标寿命" symbol="Lh" value={form.targetLifeHours} onChange={(v) => setForm({ ...form, targetLifeHours: v })} unit="h" error={errors.targetLifeHours} opt="可选" hint="填写后反算所需 Ca 并给出寿命富余" presets={[10000, 20000, 50000]} />
        <SegField
          label="润滑方式(dn 限值)"
          value={form.lubrication as 'GREASE' | 'OIL'}
          onChange={(v) => setForm({ ...form, lubrication: v })}
          options={[{ value: 'GREASE', label: '脂润滑(50000)' }, { value: 'OIL', label: '油润滑(70000)' }]}
        />
        <NumField label="传动效率" symbol="η" value={form.efficiency} onChange={(v) => setForm({ ...form, efficiency: v })} unit="—" error={errors.efficiency} hint="滚珠丝杠通常 0.9~0.96" />
        <NumField label="载荷波动系数" symbol="fw" value={form.meanFactor} onChange={(v) => setForm({ ...form, meanFactor: v })} unit="—" error={errors.meanFactor} hint="平稳 1.1,一般 1.2,冲击 1.5" />
        <div className="btn-row">
          <button className="btn" onClick={run}>计算</button>
          <button className="btn ghost" onClick={reset}>重置</button>
        </div>
      </div>

      <CalcResult data={result} hasInput={!!result} onCopy={copy} onSave={save} onReset={reset} />
    </div>
  );
}
