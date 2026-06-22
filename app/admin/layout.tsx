import type React from "react"
import Link from "next/link"
import { isAuthenticated, adminConfigured } from "@/lib/admin-auth"
import { loginAction, logoutAction } from "@/app/actions/admin"
import { AdminLogin } from "@/components/admin/admin-login"
import { AdminNav } from "@/components/admin/admin-nav"
import { Button } from "@/components/ui/button"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const authed = await isAuthenticated()
  const configured = adminConfigured()

  if (!authed) {
    return <AdminLogin action={loginAction} configured={configured} />
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-navy text-navy-foreground">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-lg font-semibold tracking-tight">
              LogiMarket <span className="text-teal">Admin</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="ghost"
              className="text-navy-foreground hover:bg-white/10 hover:text-navy-foreground"
            >
              <Link href="/" target="_blank">
                Zobacz katalog
              </Link>
            </Button>
            <form action={logoutAction}>
              <Button type="submit" variant="secondary" size="sm">
                Wyloguj
              </Button>
            </form>
          </div>
        </div>
        <AdminNav />
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  )
}
