// 轻量 toast
interface Props {
  items: Array<{ id: number; text: string }>;
}

export function Toast({ items }: Props) {
  return (
    <div className="toast-wrap">
      {items.map((t) => (
        <div key={t.id} className="toast">{t.text}</div>
      ))}
    </div>
  );
}
