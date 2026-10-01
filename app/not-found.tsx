import Link from "next/link";
export default function NotFound() {
  return (
    <div className="vazio" style={{ minHeight: "60vh", justifyContent: "center" }}>
      <h1 className="serif" style={{ fontSize: 36, fontWeight: 500, margin: 0, color: "var(--fg)" }}>Página não encontrada</h1>
      <p>O evento não existe ou você não tem acesso a ele.</p>
      <Link href="/eventos" className="btn-sec">Ver meus eventos</Link>
    </div>
  );
}
