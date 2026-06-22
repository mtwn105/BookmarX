"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <Alert variant="destructive">
      <AlertTitle>BookmarX could not load this page</AlertTitle>
      <AlertDescription className="mt-2">
        Check that the backend, database, Redis, and worker are running.
      </AlertDescription>
      <Button className="mt-4 w-fit" onClick={reset} variant="outline">
        Try again
      </Button>
    </Alert>
  )
}
