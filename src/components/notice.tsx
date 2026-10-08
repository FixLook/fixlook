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
          ? "rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm leading-relaxed text-rose-800"
          : "rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-relaxed text-emerald-800"
      }
    >
      {error ?? message}
    </div>
  );
}
