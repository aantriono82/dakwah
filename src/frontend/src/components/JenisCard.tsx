import { ArrowRight } from "lucide-react";
import { Card } from "./ui";
import { cn, jenisOptions, type JenisId } from "../lib/utils";

export function JenisCard({
  item,
  active,
  onClick
}: {
  item: (typeof jenisOptions)[number];
  active: boolean;
  onClick: (id: JenisId) => void;
}) {
  return (
    <button onClick={() => onClick(item.id)} className="text-left">
      <Card className={cn("h-full p-4 transition hover:border-primary", active && "border-primary ring-2 ring-ring")}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className={cn("inline-flex rounded-md px-2.5 py-1 text-xs font-semibold", item.accent)}>{item.label}</span>
            <p className="mt-3 text-sm text-muted-foreground">{item.description}</p>
          </div>
          <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
        </div>
      </Card>
    </button>
  );
}
