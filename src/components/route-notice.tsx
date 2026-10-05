"use client";
import { useSearchParams } from "next/navigation";
import { Notice } from "./notice";
export function RouteNotice() { const params = useSearchParams(); return <Notice error={params.get("error") ?? undefined} message={params.get("message") ?? undefined} />; }
