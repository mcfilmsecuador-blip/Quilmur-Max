import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Quilmur Max · Producción",
  description: "Plataforma de lanzamiento de producción a partir de PDF técnico",
};

const NAV = [
  { href: "/", label: "Dashboard", icon: "▦" },
  { href: "/proyectos", label: "Proyectos", icon: "▤" },
  { href: "/configuracion", label: "Configuración", icon: "⚙" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-screen bg-zinc-950 text-zinc-100 font-[family-name:var(--font-geist-sans)]">
        <div className="flex min-h-screen">
          <aside className="w-56 shrink-0 border-r border-zinc-800 bg-zinc-900/60 flex flex-col">
            <Link href="/" className="px-5 py-5 border-b border-zinc-800 block">
              <div className="text-xl font-bold tracking-tight text-amber-400">
                QUILMUR <span className="text-zinc-400">MAX</span>
              </div>
              <div className="text-[11px] uppercase tracking-widest text-zinc-500">
                Lanzamiento de producción
              </div>
            </Link>
            <nav className="p-3 space-y-1">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
                >
                  <span className="text-amber-500/80">{n.icon}</span>
                  {n.label}
                </Link>
              ))}
            </nav>
            <div className="mt-auto p-4 text-[11px] text-zinc-600 border-t border-zinc-800">
              PDF → analizar → revisar → aprobar → producir
            </div>
          </aside>
          <main className="flex-1 min-w-0 p-6 lg:p-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
