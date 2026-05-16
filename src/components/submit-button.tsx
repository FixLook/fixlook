"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";

export function SubmitButton({
  children,
  pendingText = "Saving...",
  ...props
}: ButtonProps & { pendingText?: string }) {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending} {...props}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {pending ? pendingText : children}
    </Button>
  );
}
