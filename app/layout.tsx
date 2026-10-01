import type { Metadata } from "next";
import { getTheme } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Portal Imagium Foto", template: "%s · Portal Imagium Foto" },
  robots: { index: false, follow: false },
  icons: { icon: "/logo.jpg" },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const tema = await getTheme();
  return (
    <html lang="pt-BR" className={tema === "claro" ? "tema-claro" : "tema-escuro"}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Newsreader:opsz,wght@6..72,400..700&family=Schibsted+Grotesk:wght@400..700&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
