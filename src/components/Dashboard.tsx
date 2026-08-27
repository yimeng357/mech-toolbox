// 首页 Dashboard:分组工具卡片 + 最近使用/常用/最近记录
import type { CSSProperties } from 'react';
import type { HistoryRecord, ToolId } from '../types';
import { TOOLS, TOOL_GROUPS } from '../tools';
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
    <>
      <div className="hero">
        <div>
          <div className="hero-title">工程师，今天算点什么？</div>
          <div className="hero-chips">
            <span className="chip"><b>{TOOLS.length}</b>个专业计算工具</span>
            <span className="chip"><b>{history.length}</b>条本地计算记录</span>
            <span className="chip">数据仅存于本机</span>
          </div>
        </div>
      </div>
      <div className="dash">
      <div>
        {TOOL_GROUPS.map((group) => (
          <div
            key={group.name}
            className="tool-group"
            style={{ '--g': group.accent, '--g-soft': group.accentSoft, '--g-glow': group.accentGlow } as CSSProperties}
          >
            <div className="section-title">{group.name}<span className="cnt">{group.tools.length} 个</span></div>
            <div className="tool-grid">
              {group.tools.map((t) => {
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
        ))}
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
    </>
  );
}
