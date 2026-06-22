import { RefreshIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { getMe, getSettings, getSyncJobs } from "@/lib/api"

import { logout, updateSettings } from "../actions"

export default async function SettingsPage() {
  const [user, settings, syncJobs] = await Promise.all([getMe(), getSettings(), getSyncJobs()])
  const latestSync = syncJobs[0]

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <p className="text-sm font-medium text-primary">Settings</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Account and automation</h1>
        <p className="mt-2 text-muted-foreground">BookmarX manages AI configuration at the deployment level.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Connected X account</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <Avatar className="size-11">
            <AvatarImage alt={user?.name ?? "X account"} src={user?.imageUrl ?? undefined} />
            <AvatarFallback>{user?.name?.slice(0, 1).toUpperCase() ?? "X"}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{user?.name ?? "X account"}</p>
            <p className="truncate text-sm text-muted-foreground">
              {user?.username ? `@${user.username}` : "Connected through X OAuth"}
            </p>
          </div>
        </CardContent>
      </Card>

      <form action={updateSettings}>
        <Card>
          <CardHeader>
            <CardTitle>Automation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <SettingRow
              checked={settings.scheduledSyncEnabled}
              description="Check X daily and enrich new bookmarks automatically."
              label="Daily bookmark sync"
              name="scheduledSyncEnabled"
            />
            <Separator />
            <SettingRow
              checked={settings.dailyBriefEnabled}
              description="Generate a daily editorial summary from recent bookmarks."
              label="Daily intelligent brief"
              name="dailyBriefEnabled"
            />
            <Button type="submit">Save preferences</Button>
          </CardContent>
        </Card>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>Sync status</CardTitle>
        </CardHeader>
        <CardContent className="flex items-start gap-3 text-sm">
          <HugeiconsIcon className="mt-0.5 text-muted-foreground" icon={RefreshIcon} size={18} />
          <div>
            <p className="font-medium capitalize">{latestSync?.status ?? "Not synced yet"}</p>
            {latestSync ? (
              <p className="mt-1 text-muted-foreground">
                {latestSync.resourcesFetched} posts fetched ·{" "}
                {new Date(latestSync.finishedAt ?? latestSync.createdAt).toLocaleString()}
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Session</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={logout}>
            <Button type="submit" variant="outline">
              Log out
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

function SettingRow({
  label,
  description,
  name,
  checked,
}: {
  label: string
  description: string
  name: string
  checked: boolean
}) {
  return (
    <label className="flex items-center justify-between gap-6">
      <span>
        <span className="block font-medium">{label}</span>
        <span className="mt-1 block text-sm text-muted-foreground">{description}</span>
      </span>
      <Switch defaultChecked={checked} name={name} />
    </label>
  )
}
