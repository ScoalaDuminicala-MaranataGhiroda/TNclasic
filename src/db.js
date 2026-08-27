// Conexiunea la Turso, folosită direct din browser (client-side), fără server intermediar.
// Foloseste build-ul "web" al @libsql/client, care merge peste HTTP, deci funcționează
// și pe GitHub Pages (nu necesită Node.js/WebSockets server-side).
import { createClient } from '@libsql/client/web';

const url = import.meta.env.VITE_TURSO_URL;
const authToken = import.meta.env.VITE_TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  // eslint-disable-next-line no-console
  console.error(
    'Lipsesc VITE_TURSO_URL / VITE_TURSO_AUTH_TOKEN. Verifică fișierul .env (dev) sau ' +
    'secretele setate în GitHub Actions (build).'
  );
}

export const db = createClient({ url, authToken });
