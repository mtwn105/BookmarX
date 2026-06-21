import { redirect } from "next/navigation"

import { AppNav } from "@/components/app-nav"
import { getMe } from "@/lib/api"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getMe()

  if (!user) {
    redirect("/")
  }

  return (
    <div className="min-h-svh bg-[linear-gradient(135deg,oklch(0.98_0.02_90),oklch(0.95_0.02_250))] pb-24 dark:bg-[linear-gradient(135deg,oklch(0.16_0.02_250),oklch(0.1_0.01_260))] md:pb-0">
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-5 md:grid-cols-[13rem_1fr] md:px-6 md:py-6">
        <aside className="hidden md:block">
          <div className="mb-4 rounded-[2rem] border border-white/15 bg-card/70 p-4 shadow-xl shadow-black/5 backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">BookmarX</p>
            <p className="mt-2 truncate text-sm font-medium">{user.name ?? "X account"}</p>
          </div>
          <AppNav />
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
      <div className="md:hidden">
        <AppNav />
      </div>
    </div>
  )
}
