import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../../hooks/useAuth';

const itemClass =
  'flex w-full items-center rounded-lg px-3 py-2 text-left text-sm outline-none transition-colors hover:bg-zinc-100 focus-visible:bg-zinc-100 dark:hover:bg-zinc-800 dark:focus-visible:bg-zinc-800';

/** « Connexion » quand on est déconnecté ; quand on est connecté, pastille et nom qui ouvrent le menu du compte. */
export function AccountButton() {
  const { backend, user, loading } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!user) return setIsAdmin(false);
    let alive = true;
    backend.admin
      ?.isAdmin()
      .then((ok) => alive && setIsAdmin(ok))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [backend, user]);

  // Fermé à chaque changement de page
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  if (loading) return <span className="size-9" aria-hidden="true" />;

  if (!user) {
    return (
      <Link
        to="/connexion"
        aria-label="Connexion"
        title="Connexion"
        className="grid h-9 place-items-center rounded-lg px-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
      >
        <svg viewBox="0 0 24 24" className="size-5 lg:hidden" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" strokeLinecap="round" />
        </svg>
        <span className="hidden lg:inline">Connexion</span>
      </Link>
    );
  }

  const name = user.displayName || user.email;
  const close = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };
  const signOut = async () => {
    setOpen(false);
    await backend.auth.signOut();
    navigate('/');
  };

  const onMenuKeyDown = (e: KeyboardEvent) => {
    const items = [...(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
    const i = items.indexOf(document.activeElement as HTMLElement);
    const move: Record<string, number> = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: items.length - 1 };
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'Tab') {
      setOpen(false);
    } else if (e.key in move) {
      e.preventDefault();
      items[(move[e.key]! + items.length) % items.length]?.focus();
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label="Mon compte"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        title={name}
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 items-center gap-2 rounded-full py-0.5 pl-0.5 pr-1 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 lg:pr-2.5 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        <span className="grid size-8 place-items-center rounded-full bg-indigo-600 font-semibold text-white dark:bg-indigo-500">
          {name.charAt(0).toUpperCase()}
        </span>
        <span className="hidden max-w-32 truncate font-medium lg:inline">{name}</span>
        <svg viewBox="0 0 20 20" className={`size-4 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="currentColor" aria-hidden="true">
          <path d="M5.2 7.2a.75.75 0 0 1 1.06 0L10 10.94l3.74-3.74a.75.75 0 1 1 1.06 1.06l-4.27 4.27a.75.75 0 0 1-1.06 0L5.2 8.26a.75.75 0 0 1 0-1.06Z" />
        </svg>
      </button>

      {open && (
        <div
          ref={menuRef}
          id={id}
          role="menu"
          aria-label="Mon compte"
          onKeyDown={onMenuKeyDown}
          // Un lien vers la page déjà ouverte ne change pas l'adresse : on ferme ici aussi
          onClick={(e) => (e.target as HTMLElement).closest('a') && setOpen(false)}
          className="absolute right-0 top-full z-40 mt-2 w-64 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="px-3 pb-2 pt-1.5" role="none">
            {user.displayName && <p className="truncate text-sm font-medium">{user.displayName}</p>}
            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{user.email}</p>
          </div>
          <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" role="none" />
          <Link to="/compte" role="menuitem" className={itemClass}>
            Mon compte
          </Link>
          <Link to="/compte/mot-de-passe" role="menuitem" className={itemClass}>
            Changer le mot de passe
          </Link>
          {isAdmin && (
            <Link to="/admin" role="menuitem" className={itemClass}>
              Tableau de bord administrateur
            </Link>
          )}
          <Link to="/compte/suppression" role="menuitem" className={`${itemClass} text-red-600 dark:text-red-400`}>
            Supprimer mon compte
          </Link>
          <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" role="none" />
          <button type="button" role="menuitem" onClick={signOut} className={itemClass}>
            Se déconnecter
          </button>
        </div>
      )}
    </div>
  );
}
