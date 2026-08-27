# Talantul în Negoț — Școala Duminicală Maranata Ghiroda

PWA pentru gestiunea concurenților și a întrebărilor la concursul biblic
"Talantul în Negoț" (1 Samuel + 2 Samuel). Hostat pe GitHub Pages, date în
Turso (libSQL).

## Arhitectură pe scurt

- **Frontend**: Vite + JavaScript vanilla (fără framework greu), CSS propriu,
  responsive (mobil + desktop), instalabil ca PWA (manifest + service worker
  pentru shell offline).
- **Bază de date**: Turso, accesată **direct din browser** cu
  `@libsql/client/web` (peste HTTP) — nu există server intermediar, așa cum
  cere găzduirea pe GitHub Pages (site static).
- **Întrebările (~2000)** NU sunt în Turso. Sunt în fișiere JSON statice
  (`data/questions/1-samuel.json`, `data/questions/2-samuel.json`),
  împachetate direct în build-ul aplicației. Asta înseamnă zero interogări
  Turso pentru banca de întrebări — economisește masiv din limita de 500M
  citiri / 10M scrieri. În Turso rămân doar: concurenți, prezențe, note,
  progres capitole, id-urile întrebărilor "consumate" și evenimentele de
  indisciplină — date mici, care cresc încet.

## ⚠️ Notă importantă de securitate

Fiindcă site-ul e 100% static (GitHub Pages) și vorbește direct cu Turso,
tokenul de acces la baza de date ajunge, inevitabil, în JS-ul livrat în
browser (oricine poate să-l vadă din DevTools). Pentru faza 1 (un singur
utilizator, fără autentificare, cerută explicit de tine) e o compromitere
acceptată. Recomandări minime:
- Creează un token Turso dedicat doar acestei baze (nu unul global de cont).
- Nu publica linkul aplicației public / nu-l indexa — ține-l semi-privat.
- Dacă la un moment dat vrei autentificare reală sau vrei să ascunzi
  tokenul, următorul pas natural e un mic proxy serverless (Cloudflare
  Worker / Netlify Function) care ține tokenul server-side — arhitectura
  de mai jos (strat `api.js` unic) e făcută să poată fi mutată acolo fără
  să rescrii paginile.

## Structura proiectului

```
talantul-in-negot/
├── index.html                     # shell HTML, meniu principal
├── manifest.webmanifest (public/) # metadate PWA
├── public/
│   ├── sw.js                      # service worker (cache shell, nu interceptează Turso)
│   ├── manifest.webmanifest
│   └── icons/icon-192.png, icon-512.png
├── src/
│   ├── main.js                    # bootstrap, înregistrare rute + service worker
│   ├── router.js                  # router simplu bazat pe #hash
│   ├── db.js                      # client Turso (@libsql/client/web)
│   ├── api.js                     # STRATUL UNIC de acces la date — toate query-urile SQL
│   ├── styles.css                 # tot CSS-ul aplicației (responsive)
│   ├── components/
│   │   ├── toast.js                # notificări scurte
│   │   └── modal.js                # modal generic (folosit la indisciplină)
│   ├── utils/
│   │   └── questions.js            # citește JSON-urile de întrebări, alege random, respectă progresul
│   └── pages/
│       ├── competitors.js          # User story 1: concurenți
│       ├── attendance.js           # User story 2: prezență
│       ├── grades.js               # User story 3: note + grafic evoluție (Chart.js)
│       ├── chapters.js             # User story 4: capitole parcurse (1 Samuel + 2 Samuel)
│       ├── quiz.js                 # User story 5: întrebare random din capitole parcurse
│       ├── discipline.js           # User story 6: indisciplină + 3 întrebări + cartonaș
│       └── discipline-report.js    # User story 7: raport sortabil indisciplină
├── data/questions/
│   ├── 1-samuel.json               # 31 capitole (schelet + 2 întrebări exemplu în cap. 1)
│   └── 2-samuel.json               # 24 capitole (schelet + 1 întrebare exemplu în cap. 1)
├── sql/schema.sql                  # tot DDL-ul pentru Turso
├── scripts/validate-questions.js   # validează fișierele JSON înainte să le adaugi la git
├── .github/workflows/deploy.yml    # build + deploy automat pe GitHub Pages
├── .env.example
├── vite.config.js
└── package.json
```

## Pas cu pas: configurare Turso

```bash
# 1. Instalează Turso CLI (Windows: prin WSL, sau vezi docs.turso.tech)
# 2. Autentificare
turso auth login

# 3. Creează baza de date
turso db create talantul-in-negot

# 4. Rulează schema
turso db shell talantul-in-negot < sql/schema.sql

# 5. Obține URL-ul
turso db show talantul-in-negot --url

# 6. Creează un token (scoped doar la această bază, dacă planul tău permite)
turso db tokens create talantul-in-negot
```

Pune URL-ul și tokenul în `.env` (copiat din `.env.example`) pentru dezvoltare
locală, și în **GitHub → Settings → Secrets and variables → Actions** (numele
`VITE_TURSO_URL` și `VITE_TURSO_AUTH_TOKEN`) pentru deploy automat.

## Dezvoltare locală (Windows)

```powershell
npm install
copy .env.example .env
# editează .env cu URL-ul și tokenul tău Turso
npm run dev
```

Deschide `http://localhost:5173`.

## Adăugarea celor ~2000 de întrebări

1. Deschide `data/questions/1-samuel.json` sau `2-samuel.json`.
2. Fiecare capitol e o cheie (`"1"`, `"2"`, …), cu un array de întrebări:
   ```json
   {
     "id": "1SAM-3-004",
     "text": "Cine l-a chemat pe Samuel de trei ori în timpul nopții?",
     "options": ["Domnul", "Eli", "Îngerul Domnului", "Un vis"],
     "correct": 0
   }
   ```
3. **Convenția de `id`**: `<CARTE>-<CAPITOL>-<SECVENȚĂ>`, ex. `2SAM-14-003`.
   Trebuie să fie unic în tot fișierul (și, ideal, în tot proiectul).
   `correct` e indexul (de la 0) din `options` care e răspunsul corect.
   `options` poate avea 3 sau 4 variante.
4. După ce adaugi un lot de întrebări, rulează:
   ```bash
   npm run validate-questions
   ```
   Îți spune dacă ai id-uri duplicate, capitole greșite, `correct` invalid
   etc. — util când completezi manual peste 2000 de întrebări.
5. Commit + push → GitHub Actions rebuildează și redeployează automat
   (întrebările sunt parte din build, nu din baza de date).

## Deploy pe GitHub Pages

1. În `vite.config.js`, setează `base: '/<numele-repo-ului>/'`.
2. În repo GitHub → **Settings → Pages → Source: GitHub Actions**.
3. Adaugă secretele `VITE_TURSO_URL` și `VITE_TURSO_AUTH_TOKEN` (Settings →
   Secrets and variables → Actions → New repository secret).
4. Push pe `main` → workflow-ul din `.github/workflows/deploy.yml` face
   build și deploy automat.

## Cum acoperă aplicația user story-urile

| # | User story | Unde |
|---|---|---|
| 1 | Listă / adăugare / ștergere concurenți | `pages/competitors.js` |
| 2 | Prezență pe întâlnire, istoric, total per concurent | `pages/attendance.js` |
| 3 | Note (0-100, mai multe/zi), istoric, medie, grafic evoluție | `pages/grades.js` |
| 4 | Bifare capitole parcurse (1 Samuel + 2 Samuel, global) | `pages/chapters.js` |
| 5 | Întrebare random din capitole parcurse, fără repetare până la epuizare | `pages/quiz.js` + `utils/questions.js` |
| 6 | Indisciplină + 3 întrebări + cartonaș roșu/galben | `pages/discipline.js` |
| 7 | Raport indisciplină, sortabil pe total/roșii/galbene | `pages/discipline-report.js` |

### Cum funcționează "fără repetare până se epuizează" (US 5 + US 6)

- Tabela `used_questions` din Turso ține id-urile întrebărilor deja arătate
  (indiferent dacă au apărut la Quiz sau la Indisciplină — e un pool comun,
  exact cum ai cerut).
- La fiecare cerere de întrebare(i), `utils/questions.js` calculează
  întrebările disponibile = cele din capitolele bifate ca parcurse, minus
  cele din `used_questions`.
- Dacă poolul rămas e mai mic decât ce trebuie afișat, aplicația golește
  automat `used_questions` (le redeblochează pe toate) și reia selecția —
  exact comportamentul cerut.
- Marcarea "folosită" se face imediat ce întrebarea e arătată (nu la
  răspuns), ca să respecte "o dată primită, nu se mai repetă".

### Cartonaș roșu / galben (US 6)

- 3 întrebări per eveniment de indisciplină.
- ≥ 2 răspunsuri corecte din 3 → **cartonaș galben** (indisciplinat, dar știe).
- ≤ 1 răspuns corect din 3 → **cartonaș roșu** (indisciplinat + nu știe).
- Se pot înregistra oricâte evenimente de indisciplină pe aceeași dată,
  pentru același concurent.

## Limite Turso — cum sunt respectate

- Cele ~2000 de întrebări **nu ating deloc** baza de date (sunt statice, în
  build) → economisește milioane de citiri.
- `api.js` grupează operațiile pe cât posibil (`db.batch`) — de exemplu
  salvarea prezenței unei întregi sesiuni se face într-un singur batch, nu
  un write per copil.
- Paginile fac de regulă 1-2 interogări per încărcare (ex. raportul de
  indisciplină citește tot ce-i trebuie într-un singur `SELECT` cu `LEFT
  JOIN`, nu unul per concurent).

## Ce poți extinde ușor mai târziu

- Autentificare (ex. un simplu PIN) — se adaugă un ecran de login înainte de
  `startRouter()`.
- Mutarea tokenului Turso într-un proxy serverless, ca să nu mai fie vizibil
  în bundle.
- Export CSV al notelor / prezențelor / raportului de indisciplină.
