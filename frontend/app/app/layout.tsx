import { redirect } from "next/navigation"

import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { getFolders, getMe } from "@/lib/api"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getMe()

  if (!user) {
    redirect("/")
  }
  const folders = await getFolders()

  return (
    <SidebarProvider>
      <AppSidebar folders={folders} user={user} />
      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/80 bg-white/88 px-4 backdrop-blur-xl">
          <SidebarTrigger />
          <Separator className="h-4" orientation="vertical" />
          <LinkBrand />
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-7 sm:px-7 lg:py-10">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}

function LinkBrand() {
  return (
    <div className="flex items-center gap-2.5 text-sm">
      <span className="font-semibold tracking-tight text-foreground">BookmarX</span>
      <span className="hidden text-muted-foreground sm:inline">Your intelligent X library</span>
    </div>
  )
}
