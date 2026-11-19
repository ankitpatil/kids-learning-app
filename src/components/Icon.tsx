import { hasIcon, iconEmoji, iconUrl, splitIcons } from '../icons/icons';

/** A bundled Fluent Emoji picture by icon name, sized 1em like the emoji it replaces. Falls back to `fallback` text. */
export function Icon({ name, fallback, label }: { name: string; fallback?: string; label?: string }) {
  if (!hasIcon(name)) return <>{fallback ?? ''}</>;
  return (
    <img
      className="icon"
      src={iconUrl(name)}
      alt={label ?? ''}
      aria-hidden={label ? undefined : true}
      draggable={false}
      decoding="async"
    />
  );
}

/** Text that may contain emoji: each emoji with a bundled icon renders as that icon, the rest as text. */
export function Emoji({ text, label }: { text: string; label?: string }) {
  const pieces = splitIcons(text);
  return (
    <>
      {pieces.map((p, i) =>
        'icon' in p ? <Icon key={i} name={p.icon} fallback={p.emoji} label={pieces.length === 1 ? label : undefined} /> : <span key={i}>{p.text}</span>,
      )}
    </>
  );
}
