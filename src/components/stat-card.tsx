import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  helper
}: {
  label: string;
  value: string | number;
  helper?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-dark">{value}</div>
        {helper ? <p className="mt-1 text-sm text-muted-foreground">{helper}</p> : null}
      </CardContent>
    </Card>
  );
}
