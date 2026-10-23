import { Link, useNavigate } from '@tanstack/react-router';
import { LogIn, LogOut, Menu, Search, Server, X } from 'lucide-react';
import { useState } from 'react';

import { ThemeSwitcher } from '@/components/theme-switcher';
import { login, logout } from '@/lib/keycloak';
import { useAuth } from '@/lib/use-auth';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/', label: 'Accueil' },
  { to: '/applications', label: 'Applications' },
  { to: '/espaces', label: 'Espaces' },
  { to: '/memo', label: 'Mémo' },
  { to: '/recherche', label: 'Recherche' },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { user, signedIn, isAdmin } = useAuth();
  const navigate = useNavigate();

  const items = [...NAV, ...(signedIn ? [{ to: '/admin', label: isAdmin ? 'Administration' : 'Rédaction' } as const] : [])];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <Link to="/" className="flex items-center gap-2 font-mono text-base font-semibold">
          <Server className="size-5 text-primary" aria-hidden />
          <span>home&#8203;lab</span>
        </Link>

        <nav className="ml-6 hidden items-center gap-1 md:flex">
          {items.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === '/' }}
              activeProps={{ className: 'bg-secondary text-foreground' }}
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-3 md:flex">
          <button onClick={() => navigate({ to: '/recherche' })} className="rounded-md border border-border p-2 text-muted-foreground hover:text-foreground" aria-label="Rechercher">
            <Search className="size-4" />
          </button>
          <ThemeSwitcher />
          {signedIn ? (
            <div className="flex items-center gap-2">
              <span className="max-w-[12rem] truncate font-mono text-xs text-muted-foreground">{user?.name}</span>
              <button onClick={() => logout()} className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-secondary">
                <LogOut className="size-4" /> Se déconnecter
              </button>
            </div>
          ) : (
            <button onClick={() => void login()} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90">
              <LogIn className="size-4" /> Se connecter
            </button>
          )}
        </div>

        <button className="ml-auto rounded-md border border-border p-2 md:hidden" onClick={() => setOpen((v) => !v)} aria-label="Menu" aria-expanded={open}>
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      <div className={cn('border-t border-border md:hidden', open ? 'block' : 'hidden')}>
        <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
          {items.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === '/' }}
              onClick={() => setOpen(false)}
              activeProps={{ className: 'bg-secondary text-foreground' }}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
          <div className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-3">
            <ThemeSwitcher />
            {signedIn ? (
              <button onClick={() => logout()} className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm">
                <LogOut className="size-4" /> Déconnexion
              </button>
            ) : (
              <button onClick={() => void login()} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">
                <LogIn className="size-4" /> Connexion
              </button>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border py-8 text-sm text-muted-foreground">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-mono">home lab — auto-hébergé, documenté, sauvegardé.</p>
        <div className="flex gap-4">
          <a href="/rss.xml" className="hover:text-foreground">
            Flux RSS
          </a>
          <Link to="/espaces" className="hover:text-foreground">
            Espaces
          </Link>
          <Link to="/applications" className="hover:text-foreground">
            Applications
          </Link>
        </div>
      </div>
    </footer>
  );
}
