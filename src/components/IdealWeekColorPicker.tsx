import { Check } from "lucide-react";
import { usePlanningCopy } from "./PlanningControls";

export function IdealWeekColorPicker({ color, onChange }: {
  color?: string;
  onChange: (color?: string) => void;
}) {
  const c = usePlanningCopy();
  const choices = [
    ["#7cb69b", c("Hijau", "Green")],
    ["#86afd9", c("Biru", "Blue")],
    ["#c499cb", c("Ungu", "Purple")],
    ["#db91aa", c("Merah muda", "Pink")],
    ["#d5a16e", c("Jingga", "Orange")],
    ["#c9b776", c("Kuning", "Yellow")],
  ];
  return (
    <fieldset className="space-y-3">
      <legend className="mb-2 text-sm font-medium text-monk-muted">{c("Warna aktivitas", "Activity color")}</legend>
      <div className="flex flex-wrap gap-2">
        <button type="button" aria-pressed={!color} onClick={() => onChange(undefined)} className="min-h-11 rounded-lg border border-monk-border px-3 text-sm text-monk-text hover:bg-monk-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-monk-accent">{c("Otomatis", "Automatic")}</button>
        {choices.map(([value, name]) => (
          <button key={value} type="button" aria-label={name} title={name} aria-pressed={color?.toLowerCase() === value} onClick={() => onChange(value)} className="flex h-11 w-11 items-center justify-center rounded-full border border-monk-border focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-monk-accent" style={{backgroundColor:value}}>
            {color?.toLowerCase() === value && <Check size={20} className="text-monk-bg" aria-hidden />}
          </button>
        ))}
      </div>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-monk-text">
        <input type="color" aria-label={c("Pilih warna kustom", "Choose custom color")} value={color ?? "#7cb69b"} onChange={event => onChange(event.target.value)} className="h-11 w-11 shrink-0 cursor-pointer rounded-lg border border-monk-border bg-monk-bg p-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-monk-accent" />
        <span>{c("Warna kustom", "Custom color")}<span className="ml-2 font-mono text-xs text-monk-muted">{color ?? c("otomatis", "automatic")}</span></span>
      </label>
    </fieldset>
  );
}
