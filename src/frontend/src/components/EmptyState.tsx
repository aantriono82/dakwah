import { Card } from "./ui";

export function EmptyState({ text }: { text: string }) {
  return (
    <Card className="p-6 text-center text-sm text-muted-foreground">
      <p>{text}</p>
    </Card>
  );
}

