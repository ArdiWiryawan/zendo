import { restIcon } from "../constants/restActivities";

/**
 * Renders a stored rest icon name as its lucide glyph.
 *
 * Icon names are persisted in `RestActivityItem.icon`, so old records may still
 * hold an emoji from before the icon migration — `restIcon()` falls back to a
 * neutral glyph for anything it does not recognise.
 */
export function RestGlyph({
  name,
  size = 18,
  strokeWidth = 1.75,
  className
}: {
  name: string;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  const Icon = restIcon(name);
  return <Icon size={size} strokeWidth={strokeWidth} className={className} />;
}
