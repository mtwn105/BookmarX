import { Button } from "@/components/ui/button"
import { getSettings } from "@/lib/api"

import { updateSettings } from "../actions"

export default async function SettingsPage() {
  const settings = await getSettings()

  return (
    <div className="space-y-6">
      <section className="rounded-[2.25rem] border border-white/15 bg-background/80 p-5 shadow-2xl shadow-black/5 backdrop-blur-xl md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Settings</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.06em] md:text-6xl">Tune your instance.</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Control scheduled sync, daily brief preference, and the AI models used by this self-hosted deployment.
        </p>
      </section>
      <form action={updateSettings} className="rounded-[2rem] border border-white/15 bg-background/80 p-5 shadow-xl shadow-black/5 backdrop-blur-xl md:p-6">
        <div className="grid gap-5 md:grid-cols-2">
          <label className="rounded-3xl border border-border bg-muted/25 p-4">
            <span className="block text-sm font-medium">Embedding model</span>
            <input
              className="mt-3 h-11 w-full rounded-full border border-border bg-background px-4 outline-none ring-ring/20 focus:ring-4"
              defaultValue={settings.embeddingModel}
              name="embeddingModel"
            />
          </label>
          <label className="rounded-3xl border border-border bg-muted/25 p-4">
            <span className="block text-sm font-medium">Chat model</span>
            <input
              className="mt-3 h-11 w-full rounded-full border border-border bg-background px-4 outline-none ring-ring/20 focus:ring-4"
              defaultValue={settings.chatModel}
              name="chatModel"
            />
          </label>
          <label className="flex items-center justify-between gap-4 rounded-3xl border border-border bg-muted/25 p-4">
            <span>
              <span className="block text-sm font-medium">Scheduled sync</span>
              <span className="text-sm text-muted-foreground">Worker checks once per hour and syncs at most daily.</span>
            </span>
            <input className="size-5" defaultChecked={settings.scheduledSyncEnabled} name="scheduledSyncEnabled" type="checkbox" />
          </label>
          <label className="flex items-center justify-between gap-4 rounded-3xl border border-border bg-muted/25 p-4">
            <span>
              <span className="block text-sm font-medium">Daily brief preference</span>
              <span className="text-sm text-muted-foreground">Stores preference for the scheduled brief phase.</span>
            </span>
            <input className="size-5" defaultChecked={settings.dailyBriefEnabled} name="dailyBriefEnabled" type="checkbox" />
          </label>
        </div>
        <Button className="mt-6 rounded-full" type="submit">
          Save settings
        </Button>
      </form>
    </div>
  )
}
