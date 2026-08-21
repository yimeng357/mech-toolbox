// 计算结果展示组件:公式 → 计算过程 → 结果 → 说明 → 操作按钮
import type { CalcResultData } from '../types';
import { IconCopy, IconSave, IconRotate, IconPrint } from './icons';

interface Props {
  data: CalcResultData | null;
  hasInput: boolean;
  onCopy: () => void;
  onSave: () => void;
  onReset: () => void;
  saveDisabled?: boolean;
}

export function CalcResult({ data, hasInput, onCopy, onSave, onReset, saveDisabled }: Props) {
  if (!hasInput || !data) {
    return (
      <div className="result-card">
        <div className="result-placeholder">
          填写左侧参数并点击「计算」,结果将在这里显示
        </div>
      </div>
    );
  }

  return (
    <div className="result-card">
      <div className="result-title">计算结果</div>

      <div className="sec-label">计算公式</div>
      <div className="formula-box">{data.formula}</div>
      {data.formulaAlt && <div className="formula-alt">{data.formulaAlt}</div>}

      <div className="sec-label">计算过程</div>
      <ul className="steps">
        {data.steps.map((s, i) => (
          <li key={i} data-n={i + 1}>{s}</li>
        ))}
      </ul>

      <div className="sec-label">结果</div>
      <div className="result-grid">
        {data.results.map((r, i) => (
          <div key={i} className={`result-item ${r.primary ? 'primary' : ''}`}>
            <div className="lb">{r.label}</div>
            <div>
              <span className="vl">{r.value}</span>
              {r.unit && <span className="un">{r.unit}</span>}
            </div>
            {r.tone && (
              <div className={`verdict ${r.tone}`} style={{ marginTop: 6 }}>
                <span className="d" />
              </div>
            )}
          </div>
        ))}
      </div>

      {data.note && <div className="note-box">{data.note}</div>}
      {data.disclaimer && (
        <div className="disclaimer">
          <b>注意:</b> 该结果仅用于初步计算,实际设计应根据相关标准进行校核。
        </div>
      )}

      <div className="result-actions">
        <button className="btn" onClick={onCopy}><IconCopy size={16} /> 复制结果</button>
        <button className="btn ghost" onClick={onSave} disabled={saveDisabled}>
          <IconSave size={16} /> 保存记录
        </button>
        <button className="btn ghost" onClick={() => window.print()}>
          <IconPrint size={16} /> 导出计算书
        </button>
        <button className="btn ghost" onClick={onReset}><IconRotate size={16} /> 重新计算</button>
      </div>
    </div>
  );
}
