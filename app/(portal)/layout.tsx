import { requireProfile } from "@/lib/auth";
import { Header } from "@/components/Header";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  return (
    <>
      <Header profile={profile} />
      <main>{children}</main>
    </>
  );
}
