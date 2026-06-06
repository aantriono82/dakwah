import type React from "react";
import { IconArrowRight, IconQuran, IconMicrophone, IconCrescent, IconMinaret, IconPulpit, IconScroll } from "./icons";
import { Card } from "./ui";
import { cn, jenisOptions, type JenisId } from "../lib/utils";

const jenisIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  "khutbah-jumat": IconPulpit,
  "idul-fitri": IconMinaret,
  "idul-adha": IconQuran,
  "nikah": IconScroll,
  "ceramah": IconMicrophone,
  "kultum": IconCrescent,
};

export function JenisCard({
  item,
  active,
  onClick
}: {
  item: (typeof jenisOptions)[number];
  active: boolean;
  onClick: (id: JenisId) => void;
}) {
  const Icon = jenisIconMap[item.id] ?? IconQuran;
  return (
    <button onClick={() => onClick(item.id)} className="text-left">
      <Card className={cn("h-full p-4 transition hover:border-primary", active && "border-primary ring-2 ring-ring")}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={cn("inline-flex size-7 items-center justify-center rounded-md", item.accent)}>
                <Icon className="size-4" />
              </span>
              <span className={cn("inline-flex rounded-md px-2.5 py-1 text-xs font-semibold", item.accent)}>{item.label}</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
          </div>
          <IconArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
        </div>
      </Card>
    </button>
  );
}
