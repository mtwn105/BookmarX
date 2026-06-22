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
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur-xl">
          <SidebarTrigger />
          <Separator className="h-4" orientation="vertical" />
          <LinkBrand />
        </header>
        <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 lg:py-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}

function LinkBrand() {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="font-medium">BookmarX</span>
      <span className="hidden text-muted-foreground sm:inline">Your X knowledge library</span>
    </div>
  )
}
