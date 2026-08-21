// 首页 Dashboard:工具卡片 + 最近使用/常用/最近记录
import type { HistoryRecord, ToolId } from '../types';
import { TOOLS } from '../tools';
import { IconArrowRight, IconClock } from './icons';

interface Props {
  history: HistoryRecord[];
  recentIds: ToolId[];
  popularIds: ToolId[];
  onOpenTool: (id: ToolId) => void;
  onLoadRecord: (r: HistoryRecord) => void;
  onViewHistory: () => void;
}

function fmtTime(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function Dashboard({ history, recentIds, popularIds, onOpenTool, onLoadRecord, onViewHistory }: Props) {
  return (
    <div className="dash">
      <div>
        <div className="section-title">计算工具</div>
        <div className="tool-grid">
          {TOOLS.map((t) => {
            const Icon = t.icon;
            return (
              <div key={t.id} className="tool-card" onClick={() => onOpenTool(t.id)}>
                <div className="icon"><Icon size={22} /></div>
                <div className="nm">{t.name}</div>
                <div className="ds">{t.desc}</div>
                <div className="fm">{t.formula}</div>
                <div className="go">打开工具 <IconArrowRight size={12} /></div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="aside">
        <div className="card">
          <div className="h">最近使用</div>
          {recentIds.length === 0 ? (
            <div className="empty-note">还没有使用记录</div>
          ) : (
            <div className="aside-list">
              {recentIds.map((id) => {
                const t = TOOLS.find((x) => x.id === id)!;
                const Icon = t.icon;
                return (
                  <div key={id} className="aside-item" onClick={() => onOpenTool(id)}>
                    <span className="ic"><Icon size={16} /></span>
                    <span className="tx"><span className="t">{t.name}</span></span>
                    <IconArrowRight size={13} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card">
          <div className="h">常用工具</div>
          {popularIds.length === 0 ? (
            <div className="empty-note">使用过的工具会出现在这里</div>
          ) : (
            <div className="aside-list">
              {popularIds.map((id) => {
                const t = TOOLS.find((x) => x.id === id)!;
                const Icon = t.icon;
                return (
                  <div key={id} className="aside-item" onClick={() => onOpenTool(id)}>
                    <span className="ic"><Icon size={16} /></span>
                    <span className="tx"><span className="t">{t.name}</span></span>
                    <span className="tm">{t.formula}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card">
          <div className="h">
            最近计算记录
            <span className="more" onClick={onViewHistory}>全部 ›</span>
          </div>
          {history.length === 0 ? (
            <div className="empty-note">保存的计算会显示在这里</div>
          ) : (
            <div className="aside-list">
              {history.slice(0, 5).map((r) => (
                <div key={r.id} className="aside-item" onClick={() => onLoadRecord(r)}>
                  <span className="ic"><IconClock size={14} /></span>
                  <span className="tx">
                    <span className="t">{r.summary}</span>
                    <span className="s">{r.toolName} · {fmtTime(r.time)}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
