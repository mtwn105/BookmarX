"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ArtificialIntelligence01Icon,
  Bookmark02Icon,
  Calendar01Icon,
  Folder01Icon,
  Logout01Icon,
  Search01Icon,
  Settings01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { logout } from "@/app/app/actions"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import type { Folder, User } from "@/lib/api"

const primaryItems = [
  { title: "Library", href: "/app", icon: Bookmark02Icon },
  { title: "Search", href: "/app/search", icon: Search01Icon },
  { title: "Chat", href: "/app/ask", icon: ArtificialIntelligence01Icon },
  { title: "Briefs", href: "/app/briefs", icon: Calendar01Icon },
  { title: "Folders", href: "/app/folders", icon: Folder01Icon },
  { title: "Settings", href: "/app/settings", icon: Settings01Icon },
]

export function AppSidebar({ user, folders }: { user: User; folders: Folder[] }) {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="h-12"
              isActive={pathname === "/app"}
              render={<Link href="/app" />}
              size="lg"
              tooltip="BookmarX"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <span className="text-sm font-semibold">BX</span>
              </div>
              <div className="grid min-w-0 flex-1 text-left">
                <span className="truncate font-semibold">BookmarX</span>
                <span className="truncate text-xs text-muted-foreground">Intelligent archive</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {primaryItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={item.href === "/app" ? pathname === item.href : pathname.startsWith(item.href)}
                    render={<Link href={item.href} />}
                    tooltip={item.title}
                  >
                    <HugeiconsIcon icon={item.icon} strokeWidth={1.8} />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Smart folders</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {folders.map((folder) => {
                const href = `/app/folders?folder=${folder.id}`
                return (
                  <SidebarMenuItem key={folder.id}>
                    <SidebarMenuButton
                      isActive={pathname === "/app/folders"}
                      render={<Link href={href} />}
                      tooltip={folder.name}
                    >
                      <span
                        className="size-2.5 shrink-0 rounded-sm"
                        style={{ backgroundColor: folder.color ?? "var(--muted-foreground)" }}
                      />
                      <span>{folder.name}</span>
                    </SidebarMenuButton>
                    {folder.bookmarkCount > 0 ? <SidebarMenuBadge>{folder.bookmarkCount}</SidebarMenuBadge> : null}
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg">
              <Avatar size="sm">
                <AvatarImage alt={user.name ?? "Account"} src={user.imageUrl ?? undefined} />
                <AvatarFallback>{user.name?.slice(0, 1).toUpperCase() ?? "X"}</AvatarFallback>
              </Avatar>
              <div className="grid min-w-0 flex-1 text-left">
                <span className="truncate font-medium">{user.name ?? "X account"}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {user.username ? `@${user.username}` : "Connected"}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <form action={logout}>
              <SidebarMenuButton className="w-full" tooltip="Log out" type="submit">
                <HugeiconsIcon icon={Logout01Icon} strokeWidth={1.8} />
                <span>Log out</span>
              </SidebarMenuButton>
            </form>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
