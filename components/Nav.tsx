"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Nav() {
  const path = usePathname();
  const eventos = path.startsWith("/eventos") || path.startsWith("/e/");
  return (
    <nav className="nav" aria-label="Seções do portal">
      <Link href="/eventos" aria-current={eventos ? "page" : undefined}>Eventos</Link>
    </nav>
  );
}
