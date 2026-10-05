import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "latin-ext"] });

export const metadata: Metadata = {
  title: "FixLook",
  description:
    "Objednajte si overeného elektrikára alebo inštalatéra. Dohodnite cenu, píšte si s majstrom a zaplaťte online."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sk">
      <body className={`${inter.className} min-h-screen antialiased`}>
        {process.env.STRIPE_EXPECTED_MODE === "test" && (
          <div className="bg-primary-soft px-4 py-2 text-center text-sm text-primary-strong">
            Testovacia prevádzka · Platby sú skúšobné. Objednávky zatiaľ neslúžia na reálny výjazd.
          </div>
        )}
        {children}
      </body>
    </html>
  );
}
