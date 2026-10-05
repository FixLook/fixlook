export function Notice({
  error,
  message
}: {
  error?: string;
  message?: string;
}) {
  if (!error && !message) {
    return null;
  }

  return (
    <div
      role={error ? "alert" : "status"}
      className={
        error
          ? "rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
          : "rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"
      }
    >
      {error ?? message}
    </div>
  );
}
