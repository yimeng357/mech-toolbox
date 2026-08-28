// 参数预设槽组件:保存当前参数为命名预设 / 一键载入 / 删除
import { useState } from 'react';
import type { ToolPreset } from '../lib/presets';

interface Props {
  presets: ToolPreset[];
  presetSaved: boolean;
  onSave: (name: string) => void;
  onApply: (id: string) => void;
  onDelete: (id: string) => void;
}

export function PresetBar({ presets, presetSaved, onSave, onApply, onDelete }: Props) {
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');

  if (!naming && presets.length === 0) {
    return (
      <div className="preset-bar">
        <button
          type="button"
          className="preset-chip"
          style={{ padding: '3px 12px', fontSize: 12 }}
          onClick={() => setNaming(true)}
          title="把当前输入参数存为命名预设,下次一键载入"
        >
          + 保存当前参数为预设
        </button>
      </div>
    );
  }

  return (
    <div className="preset-bar">
      <div className="lbl" style={{ marginBottom: 4 }}>
        <span>参数预设(我的设备)</span>
      </div>
      <div className="preset-list" style={{ marginTop: 0, gap: 6 }}>
        {presets.map((p) => (
          <span key={p.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
            <button
              type="button"
              className="preset-chip"
              style={{ padding: '3px 12px', fontSize: 12 }}
              title="点击载入此预设"
              onClick={() => onApply(p.id)}
            >
              {p.name}
            </button>
            <button
              type="button"
              className="preset-chip"
              style={{ padding: '3px 8px', fontSize: 11, opacity: 0.6 }}
              title="删除此预设"
              onClick={() => onDelete(p.id)}
            >
              ×
            </button>
          </span>
        ))}
        {naming ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <input
              type="text"
              autoFocus
              placeholder="预设名称,如「600bar 试验台」"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { onSave(name); setNaming(false); setName(''); }
                if (e.key === 'Escape') { setNaming(false); setName(''); }
              }}
              style={{ padding: '3px 10px', fontSize: 12, width: 200 }}
            />
            <button
              type="button"
              className="preset-chip"
              style={{ padding: '3px 12px', fontSize: 12, fontWeight: 700 }}
              onClick={() => { onSave(name); setNaming(false); setName(''); }}
            >
              {presetSaved ? '已保存 ✓' : '保存'}
            </button>
          </span>
        ) : (
          <button
            type="button"
            className="preset-chip"
            style={{ padding: '3px 12px', fontSize: 12 }}
            onClick={() => setNaming(true)}
          >
            + 保存当前参数
          </button>
        )}
      </div>
    </div>
  );
}
