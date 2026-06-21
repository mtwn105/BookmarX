import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import { getMe } from "@/lib/api"
import { cn } from "@/lib/utils"

export default async function Page() {
  const user = await getMe()

  return (
    <main className="min-h-svh overflow-hidden bg-[radial-gradient(circle_at_top_left,oklch(0.9_0.12_95/.28),transparent_32rem),radial-gradient(circle_at_bottom_right,oklch(0.66_0.2_250/.18),transparent_30rem)] px-5 py-6 md:px-10">
      <div className="mx-auto grid min-h-[calc(100svh-3rem)] max-w-6xl content-center gap-8 md:grid-cols-[1.08fr_0.92fr] md:items-center">
        <section className="relative z-10">
          <p className="mb-5 inline-flex rounded-full border border-border bg-background/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground backdrop-blur">
            Self-hosted X knowledge base
          </p>
          <h1 className="max-w-3xl text-5xl font-semibold tracking-[-0.07em] text-foreground md:text-7xl">
            Turn X bookmarks into a searchable second brain.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
            BookmarX syncs your saved posts, organizes them into folders and tags, then makes them searchable with AI citations from your own archive.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a className={cn(buttonVariants({ size: "lg" }), "h-12 rounded-full px-6")} href="http://localhost:4000/auth/x/start">
              Connect X account
            </a>
            {user ? (
              <Link className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "h-12 rounded-full px-6")} href="/app">
                Open library
              </Link>
            ) : null}
          </div>
        </section>
        <section className="relative rounded-[2.5rem] border border-white/20 bg-card/70 p-5 shadow-[0_30px_120px_rgba(0,0,0,0.16)] ring-1 ring-black/5 backdrop-blur-xl dark:ring-white/10">
          <div className="rounded-[2rem] bg-background p-5">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Today&apos;s brief</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em]">Ideas you forgot</h2>
              </div>
              <span className="rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground">AI</span>
            </div>
            <div className="mt-5 space-y-3">
              {["Threads about agent memory", "Pricing notes for X API", "Three product ideas saved last month"].map((item) => (
                <div className="rounded-2xl border border-border bg-muted/35 p-4" key={item}>
                  <p className="font-medium">{item}</p>
                  <p className="mt-1 text-sm text-muted-foreground">Ready to cite from your saved bookmarks.</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
