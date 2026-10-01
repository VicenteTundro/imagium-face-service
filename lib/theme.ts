import { cookies } from "next/headers";
export async function getTheme(): Promise<"claro" | "escuro"> {
  return (await cookies()).get("tema")?.value === "claro" ? "claro" : "escuro";
}
