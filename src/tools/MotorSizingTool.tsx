// 电机选型与惯量匹配工具页
import { useCallback } from 'react';
import type { HistoryRecord } from '../types';
import { MOTOR_SIZING_DEFAULTS, calcMotorSizing, motorSizingCopyText, type MechanismType } from '../calc/motorSizing';
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
  mechanism: MOTOR_SIZING_DEFAULTS.mechanism,
  mass: String(MOTOR_SIZING_DEFAULTS.mass),
  speed: String(MOTOR_SIZING_DEFAULTS.speed),
  accelTime: String(MOTOR_SIZING_DEFAULTS.accelTime),
  leadDia: String(MOTOR_SIZING_DEFAULTS.leadDia),
  gearRatio: String(MOTOR_SIZING_DEFAULTS.gearRatio),
  mu: String(MOTOR_SIZING_DEFAULTS.mu),
  fExt: String(MOTOR_SIZING_DEFAULTS.fExt),
  eta: String(MOTOR_SIZING_DEFAULTS.eta),
  Jm: String(MOTOR_SIZING_DEFAULTS.Jm),
};

const MECH_NAMES: Record<MechanismType, string> = {
  BALL_SCREW: '滚珠丝杠',
  TIMING_BELT: '同步带',
  ROTARY_TABLE: '回转工作台',
  RACK_PINION: '齿轮齿条',
};

export function MotorSizingTool({ digits, preset, onRestored, onSave, onToast }: Props) {
  const { form, setForm, errors, result, setResult, run: rawRun, reset, copy, save } = useToolForm({
    toolId: 'motor', toolName: '电机选型', defaults: DEFAULTS,
    buildInput: (f) => ({
      mechanism: f.mechanism as MechanismType,
      mass: parseNum(f.mass), speed: parseNum(f.speed), accelTime: parseNum(f.accelTime),
      leadDia: parseNum(f.leadDia), gearRatio: parseNum(f.gearRatio), mu: parseNum(f.mu),
      fExt: parseNum(f.fExt), eta: parseNum(f.eta), Jm: parseNum(f.Jm),
    }),
    calc: (input, opt) => calcMotorSizing(input as Parameters<typeof calcMotorSizing>[0], opt),
    copyText: (input, d) => motorSizingCopyText(input as Parameters<typeof motorSizingCopyText>[0], d),
    makeParams: (f) => `${MECH_NAMES[f.mechanism as MechanismType]} · m=${f.mass || '—'} · v=${f.speed || '—'} · ta=${f.accelTime || '—'}s · i=${f.gearRatio || '—'}`,
    preset, digits, onRestored, onSave, onToast,
  });

  const run = useCallback(() => { rawRun(); touchUsage('motor'); }, [rawRun]);
  useEnterSubmit(run);

  const isRotary = form.mechanism === 'ROTARY_TABLE';

  return (
    <div className="tool-layout">
      <div className="tool-form card card-pad">
        <div className="result-title">输入参数</div>
        <SegField
          label="机构类型"
          value={form.mechanism as MechanismType}
          onChange={(v) => { setForm({ ...form, mechanism: v }); setResult(null); }}
          options={[
            { value: 'BALL_SCREW', label: '滚珠丝杠' },
            { value: 'TIMING_BELT', label: '同步带' },
            { value: 'ROTARY_TABLE', label: '回转工作台' },
            { value: 'RACK_PINION', label: '齿轮齿条' },
          ]}
        />
        <NumField
          label={isRotary ? '台面转动惯量' : '移动质量'}
          symbol={isRotary ? 'J' : 'm'}
          value={form.mass}
          onChange={(v) => setForm({ ...form, mass: v })}
          unit={isRotary ? 'kg·cm²' : 'kg'}
          error={errors.mass}
          hint={isRotary ? '折算到电机轴: JL = J / i²' : '负载(工件+工作台)总质量'}
        />
        <NumField
          label={isRotary ? '台面最大转速' : '最大速度'}
          symbol="v"
          value={form.speed}
          onChange={(v) => setForm({ ...form, speed: v })}
          unit={isRotary ? 'rpm' : 'm/s'}
          error={errors.speed}
        />
        <NumField label="加速时间" symbol="ta" value={form.accelTime} onChange={(v) => setForm({ ...form, accelTime: v })} unit="s" error={errors.accelTime} hint="伺服定位通常 0.1~0.5 s" />
        <NumField
          label={isRotary ? '台面直径' : form.mechanism === 'BALL_SCREW' ? '丝杠导程' : '带轮节径'}
          symbol={isRotary ? 'd' : form.mechanism === 'BALL_SCREW' ? 'Pb' : 'd'}
          value={form.leadDia}
          onChange={(v) => setForm({ ...form, leadDia: v })}
          unit="mm"
          error={errors.leadDia}
        />
        <NumField label="减速比" symbol="i" value={form.gearRatio} onChange={(v) => setForm({ ...form, gearRatio: v })} unit="—" error={errors.gearRatio} hint="电机转速 / 负载转速,≥ 1" />
        <NumField label="摩擦系数" symbol="μ" value={form.mu} onChange={(v) => setForm({ ...form, mu: v })} unit="—" error={errors.mu} hint="滚动导轨 0.005~0.02,滑动导轨 0.05~0.1" />
        <NumField label="外部阻力" symbol="F" value={form.fExt} onChange={(v) => setForm({ ...form, fExt: v })} unit="N" error={errors.fExt} hint="切削力等附加阻力,无则填 0" />
        <NumField label="机械效率" symbol="η" value={form.eta} onChange={(v) => setForm({ ...form, eta: v })} unit="—" error={errors.eta} hint="丝杠 0.85~0.95,带传动 0.90~0.95" />
        <NumField label="电机转子惯量" symbol="Jm" value={form.Jm} onChange={(v) => setForm({ ...form, Jm: v })} unit="kg·cm²" error={errors.Jm} hint="可暂填待选电机惯量,用于惯量比校核" />
        <div className="btn-row">
          <button className="btn" onClick={run}>计算</button>
          <button className="btn ghost" onClick={reset}>重置</button>
        </div>
      </div>

      <CalcResult data={result} hasInput={!!result} onCopy={copy} onSave={save} onReset={reset} />
    </div>
  );
}
