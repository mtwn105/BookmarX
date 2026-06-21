import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const navItems = [
  ["Library", "/app"],
  ["Search", "/app/search"],
  ["Ask", "/app/ask"],
  ["Folders", "/app/folders"],
  ["Tags", "/app/tags"],
]

export function AppNav() {
  return (
    <nav className="fixed inset-x-3 bottom-3 z-50 rounded-full border border-white/15 bg-background/85 p-1 shadow-2xl shadow-black/10 backdrop-blur-xl md:sticky md:top-6 md:bottom-auto md:rounded-[2rem] md:bg-card/70 md:p-3">
      <div className="grid grid-cols-5 gap-1 md:grid-cols-1">
        {navItems.map(([label, href]) => (
          <Link
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "h-11 rounded-full text-xs md:justify-start md:text-sm",
            )}
            href={href}
            key={href}
          >
            {label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
