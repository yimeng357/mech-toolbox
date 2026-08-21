// 历史记录页(带搜索过滤)
import { useMemo, useState } from 'react';
import type { HistoryRecord } from '../types';
import { TOOLS } from '../tools';
import { IconTrash, IconRotate } from './icons';

interface Props {
  history: HistoryRecord[];
  onDelete: (id: string) => void;
  onClear: () => void;
  onLoad: (r: HistoryRecord) => void;
}

function fmtTime(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function HistoryView({ history, onDelete, onClear, onLoad }: Props) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return history;
    const q = search.toLowerCase();
    return history.filter((r) =>
      r.summary.toLowerCase().includes(q) ||
      r.toolName.toLowerCase().includes(q) ||
      r.params.toLowerCase().includes(q)
    );
  }, [history, search]);

  return (
    <div>
      <div className="hist-actions">
        <button className="btn ghost small" onClick={onClear} disabled={history.length === 0}>
          <IconTrash size={14} /> 清空全部
        </button>
        {history.length > 0 && (
          <div className="input-wrap" style={{ flex: 1, maxWidth: 300 }}>
            <input
              type="text"
              placeholder="搜索历史记录..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ fontSize: 12, padding: '6px 10px' }}
            />
          </div>
        )}
        <span className="empty-note" style={{ alignSelf: 'center' }}>
          共 {filtered.length}{search ? `/${history.length}` : ''} 条记录 · 点击「载入参数」可回到对应工具
        </span>
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <div className="empty-note" style={{ padding: 30, textAlign: 'center' }}>
            {search ? '没有匹配的记录' : '暂无历史记录。计算后点击「保存记录」即可保存到这里。'}
          </div>
        ) : (
          filtered.map((r) => {
            const t = TOOLS.find((x) => x.id === r.toolId);
            const Icon = t?.icon;
            return (
              <div key={r.id} className="hist-item">
                <span className="ic">{Icon ? <Icon size={18} /> : null}</span>
                <div className="bd">
                  <div className="t">{r.summary}</div>
                  <div className="s">{r.toolName} · {fmtTime(r.time)}</div>
                  <div className="p">{r.params}</div>
                </div>
                <div className="btns">
                  <button className="btn ghost small" onClick={() => onLoad(r)}>
                    <IconRotate size={13} /> 载入参数
                  </button>
                  <button className="btn ghost small" onClick={() => onDelete(r.id)}>
                    <IconTrash size={13} /> 删除
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
