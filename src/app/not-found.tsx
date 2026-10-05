import Link from "next/link";
export default function NotFound() { return <main className="mx-auto max-w-xl space-y-4 px-4 py-20"><h1 className="text-3xl font-bold">Stránka sa nenašla</h1><p>Odkaz nie je platný alebo k tomuto obsahu nemáte prístup.</p><Link href="/" className="font-semibold text-emerald-800 underline">Späť na úvod</Link></main>; }
