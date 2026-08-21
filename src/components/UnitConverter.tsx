// 单位换算器
import { useMemo, useState } from 'react';
import { CATEGORIES, convert, type UnitCategory } from '../lib/units';
import { fmtNum } from '../lib/format';
import { IconSwap } from './icons';
import { SelectField } from './Field';

export function UnitConverter() {
  const [catId, setCatId] = useState('length');
  const [fromId, setFromId] = useState('mm');
  const [toId, setToId] = useState('inch');
  const [value, setValue] = useState('1');

  const cat: UnitCategory = useMemo(() => CATEGORIES.find((c) => c.id === catId)!, [catId]);

  const num = Number(value);
  const forward = Number.isFinite(num) ? convert(catId, fromId, toId, num) : null;
  const backward = Number.isFinite(num) ? convert(catId, toId, fromId, num) : null;

  const fromLabel = cat.units.find((u) => u.id === fromId)?.label ?? '';
  const toLabel = cat.units.find((u) => u.id === toId)?.label ?? '';

  return (
    <div>
      <div className="cat-tabs">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            className={`cat-tab ${c.id === catId ? 'active' : ''}`}
            onClick={() => {
              setCatId(c.id);
              setFromId(c.units[0].id);
              setToId(c.units[1].id);
              setValue('1');
            }}
          >
            {c.name} {c.symbol && <span className="mono" style={{ opacity: 0.7 }}>{c.symbol}</span>}
          </button>
        ))}
      </div>

      <div className="convert-wrap">
        <div className="card card-pad">
          <div className="conv-box">
            <SelectField
              label="源单位"
              value={fromId}
              onChange={(v) => { setFromId(v); setValue('1'); }}
              options={cat.units.map((u) => ({ value: u.id, label: u.label }))}
            />
            <div className="field">
              <div className="lbl"><span>数值</span></div>
              <div className="input-wrap">
                <input type="text" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} />
              </div>
            </div>
            <SelectField
              label="目标单位"
              value={toId}
              onChange={(v) => setToId(v)}
              options={cat.units.map((u) => ({ value: u.id, label: u.label }))}
            />
            <div className="conv-result">
              {forward != null ? `${fmtNum(forward, 6)} ${toLabel.split(' ')[0]}` : '—'}
            </div>
            {backward != null && (
              <div className="conv-sub">
                反向:1 {toLabel.split(' ')[0]} = {fmtNum(convert(catId, toId, fromId, 1)!, 6)} {fromLabel.split(' ')[0]}
              </div>
            )}
            <button className="btn ghost" onClick={() => { const t = fromId; setFromId(toId); setToId(t); }}>
              <IconSwap size={15} /> 交换单位
            </button>
          </div>
        </div>

        <div className="card card-pad">
          <div className="result-title">常用换算</div>
          <div className="preset-list">
            {cat.presets.map((p, i) => (
              <button
                key={i}
                className="preset-chip"
                onClick={() => { setFromId(p.from); setToId(p.to); setValue(String(p.value)); }}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="note-box">
            换算公式:目标值 = (源值 + 偏移) × 系数 ÷ 目标系数 − 目标偏移。温度类单位存在偏移,其余均为纯比例换算。
          </div>
        </div>
      </div>
    </div>
  );
}
