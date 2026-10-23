import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

import { completeLogin } from '@/lib/keycloak';

export const Route = createFileRoute('/auth/callback')({
  head: () => ({
    meta: [
      { title: 'Connexion en cours' },
      { name: 'description', content: 'Finalisation de la connexion au home lab.' },
      { name: 'robots', content: 'noindex' },
      { property: 'og:title', content: 'Connexion en cours' },
      { property: 'og:description', content: 'Finalisation de la connexion au home lab.' },
    ],
  }),
  component: Callback,
});

function Callback() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code');
    if (!code) {
      setError("Code d'autorisation manquant.");
      return;
    }
    completeLogin(code)
      .then((back) => window.location.replace(back || '/'))
      .catch(() => setError('La connexion a échoué. Vérifiez la configuration du client Keycloak.'));
  }, []);

  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <h1 className="text-2xl">{error ? 'Connexion impossible' : 'Connexion en cours…'}</h1>
      {error ? <p className="mt-3 text-sm text-muted-foreground">{error}</p> : null}
    </div>
  );
}
