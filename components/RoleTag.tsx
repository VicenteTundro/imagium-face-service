import type { Role } from "@/lib/types";
import { Escudo, Camera } from "./icons";

/** Marca "Seu papel": administrador, administrador e fotógrafo, organizador. Só fotógrafo não leva marca. */
export function RoleTag({ roles }: { roles: Role[] }) {
  const admin = roles.includes("admin");
  const photo = roles.includes("photographer");
  if (admin && photo) {
    return <span className="tag destaque"><Escudo /><Camera size={13} className="" />Administrador e fotógrafo</span>;
  }
  if (admin) return <span className="tag"><Escudo />Administrador</span>;
  if (roles.includes("organizer")) return <span className="tag">Organizador</span>;
  return null;
}
