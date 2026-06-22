"use client"

import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type LoginState = { error?: string } | undefined

export function AdminLogin({
  action,
  configured,
}: {
  action: (prev: LoginState, formData: FormData) => Promise<LoginState>
  configured: boolean
}) {
  const [state, formAction, pending] = useActionState(action, undefined)

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">
            LogiMarket <span className="text-teal">Admin</span>
          </CardTitle>
          <CardDescription>Panel zarządzania katalogiem B2B</CardDescription>
        </CardHeader>
        <CardContent>
          {!configured ? (
            <div className="rounded-md border border-border bg-muted p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Panel nie jest jeszcze skonfigurowany.</p>
              <p className="mt-2">
                Ustaw zmienne środowiskowe{" "}
                <code className="rounded bg-background px-1 py-0.5 text-xs">ADMIN_PASSWORD</code> oraz{" "}
                <code className="rounded bg-background px-1 py-0.5 text-xs">ADMIN_SESSION_SECRET</code> w
                ustawieniach projektu (Settings → Vars), aby aktywować logowanie.
              </p>
            </div>
          ) : (
            <form action={formAction} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Hasło dostępu</Label>
                <Input id="password" name="password" type="password" required autoFocus />
              </div>
              {state?.error ? (
                <p className="text-sm text-destructive" role="alert">
                  {state.error}
                </p>
              ) : null}
              <Button type="submit" disabled={pending} className="bg-teal text-teal-foreground hover:bg-teal/90">
                {pending ? "Logowanie..." : "Zaloguj się"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
