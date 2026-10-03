# UptimeForge — kompletna specyfikacja projektu dla Agenta AI

> **Cel dokumentu:** Ten plik jest kompletną specyfikacją wykonawczą dla Agenta AI działającego w Visual Studio Code. Agent ma na jego podstawie samodzielnie zaprojektować, zaimplementować, przetestować, uruchomić, udokumentować i opublikować aplikację **UptimeForge** od zera.
>
> Dokument należy traktować jako źródło prawdy dla zakresu MVP. Jeżeli jakaś drobna decyzja implementacyjna nie jest opisana, Agent ma wybrać rozwiązanie najprostsze, bezpieczne, dobrze utrzymywalne i zgodne z aktualnymi stabilnymi wersjami użytych technologii.
>
> **Bardzo ważne:** Agent odpowiada nie tylko za kod. Ma również wykonywać wszystkie wymagane operacje Git i GitHub: inicjalizację repozytorium, konfigurację remote, tworzenie sensownych commitów, pushowanie zmian, konfigurację GitHub Actions, utworzenie tagu/release po ukończeniu projektu oraz bieżące utrzymywanie repozytorium w stanie zgodnym z kodem lokalnym.

---

## 1. Streszczenie projektu

**UptimeForge** to nowoczesna aplikacja webowa typu SaaS służąca do monitorowania dostępności stron internetowych i endpointów HTTP/HTTPS.

Użytkownik po zalogowaniu może:

- dodać adres URL do monitorowania,
- wybrać interwał sprawdzania,
- obserwować aktualny stan usługi,
- analizować response time,
- przeglądać historię checków,
- śledzić wykryte incydenty,
- otrzymywać powiadomienia e-mail o awarii i przywróceniu działania,
- utworzyć publiczną stronę statusu wybranych monitorów.

System działa również wtedy, gdy użytkownik nie ma otwartej aplikacji. Monitorowanie jest wykonywane po stronie backendu przez cykliczny scheduler i asynchroniczne zadania.

Projekt ma wyglądać i zachowywać się jak **realny, mały produkt SaaS**, a nie demonstracyjny CRUD.

---

# 2. Główne cele portfolio

UptimeForge ma pokazywać kompetencje, których nie prezentuje typowa aplikacja CRUD:

1. nowoczesny full-stack TypeScript,
2. projektowanie API i logiki domenowej,
3. scheduler i background jobs,
4. bezpieczne wykonywanie requestów do URL podawanych przez użytkownika,
5. ochrona przed SSRF,
6. asynchroniczne przetwarzanie zadań,
7. wykrywanie incydentów na podstawie kolejnych checków,
8. analiza danych historycznych,
9. publiczne i prywatne części aplikacji,
10. autoryzacja zasobów,
11. rate limiting,
12. responsive dashboard,
13. testy jednostkowe, integracyjne i E2E,
14. CI na GitHub Actions,
15. deployment produkcyjny,
16. profesjonalna dokumentacja GitHub.

---

# 3. Zakres MVP

## 3.1 Funkcje wymagane

MVP musi zawierać:

- landing page,
- logowanie przez GitHub OAuth,
- konto użytkownika,
- prywatny dashboard,
- CRUD monitorów HTTP/HTTPS,
- cykliczne wykonywanie checków,
- response time,
- status code,
- timestamp każdego checku,
- stan UP / DOWN / PENDING,
- historia wyników,
- wykres response time,
- wskaźnik uptime,
- incydenty,
- automatyczne otwieranie i zamykanie incydentów,
- e-mail przy otwarciu incydentu,
- e-mail przy rozwiązaniu incydentu,
- publiczne strony statusu,
- edycja publicznej strony statusu,
- ustawienia konta,
- responsywny interfejs,
- light/dark theme,
- error states,
- empty states,
- loading/skeleton states,
- testy,
- CI,
- production deployment,
- README,
- `.env.example`,
- poprawną historię Git.

## 3.2 Poza zakresem MVP

Nie implementować w v1:

- płatności,
- subskrypcji,
- planów premium,
- monitoringu TCP,
- ping/ICMP,
- monitoringu DNS,
- monitoringu SSL expiration,
- monitoringu portów,
- webhooków użytkownika,
- SMS,
- Slack/Discord,
- aplikacji mobilnej,
- aplikacji desktopowej,
- zespołów i organizacji,
- zaawansowanego RBAC,
- wieloregionowych checkerów,
- monitoringu z wielu lokalizacji geograficznych,
- status-page custom domains,
- własnego buildera status page,
- AI,
- syntetycznych testów przeglądarkowych,
- wykonywania JavaScript na monitorowanej stronie.

Te elementy mogą znaleźć się w sekcji "Future roadmap" w README, ale nie mogą blokować ukończenia v1.

---

# 4. Założenia produktowe MVP

## 4.1 Limity

Na potrzeby portfolio i prostoty:

- maksymalnie **10 aktywnych monitorów na użytkownika**,
- minimalny interwał monitoringu: **5 minut**,
- dostępne interwały:
  - 5 min,
  - 10 min,
  - 15 min,
  - 30 min,
  - 60 min,
- timeout pojedynczego requestu: domyślnie **10 sekund**,
- maksymalnie 5 redirectów,
- przechowywanie surowej historii checków: **30 dni**,
- publiczna strona statusu może zawierać maksymalnie 10 monitorów,
- jeden użytkownik może mieć maksymalnie 3 publiczne strony statusu.

Limity mają być zaimplementowane po stronie serwera, a nie tylko w UI.

## 4.2 Wspierane adresy

Akceptować wyłącznie:

- `https://...`
- `http://...`

Nie obsługiwać:

- `file://`
- `ftp://`
- `data:`
- `javascript:`
- custom schemes.

---

# 5. Definicje domenowe

## 5.1 Monitor

Monitor reprezentuje pojedynczy endpoint HTTP/HTTPS.

Przykład:

```text
Name: Production API
URL: https://api.example.com/health
Interval: 5 minutes
Timeout: 10 seconds
```

## 5.2 Check

Check to pojedyncza próba połączenia z monitorem.

Musi zapisywać minimum:

- monitor ID,
- rozpoczęcie,
- zakończenie,
- duration/response time w ms,
- status checku,
- HTTP status code, jeżeli otrzymano odpowiedź,
- kategorię błędu,
- ewentualny bezpieczny, skrócony komunikat błędu,
- datę utworzenia.

## 5.3 Status monitora

Dopuszczalne stany:

- `PENDING` — nie wykonano jeszcze wystarczającej liczby checków,
- `UP`,
- `DOWN`,
- `PAUSED`.

## 5.4 Incydent

Incydent oznacza potwierdzoną niedostępność monitora.

Incydent:

- otwiera się automatycznie,
- ma `startedAt`,
- opcjonalne `resolvedAt`,
- jest powiązany z monitorem,
- ma status `OPEN` / `RESOLVED`,
- może zawierać przyczynę wynikającą z checków.

---

# 6. Reguły ustalania UP/DOWN

Aby ograniczyć false positives:

## 6.1 Sukces checku

Domyślnie check jest udany, jeśli:

- request zakończył się przed timeoutem,
- końcowa odpowiedź po redirectach ma status HTTP **200–399**.

## 6.2 Niepowodzenie

Check jest nieudany, jeśli nastąpi:

- timeout,
- connection refused,
- DNS error,
- TLS error,
- zablokowane przekierowanie,
- zablokowany adres prywatny,
- HTTP 400–599,
- inny bezpiecznie sklasyfikowany błąd transportowy.

## 6.3 Potwierdzanie awarii

Nie otwierać incydentu po pojedynczym failure.

Reguła v1:

- **2 kolejne nieudane checki** → monitor przechodzi na `DOWN`, otwierany jest incident,
- **2 kolejne udane checki po DOWN** → monitor przechodzi na `UP`, incident zostaje rozwiązany.

Pojedynczy failure pomiędzy sukcesami może być widoczny w historii, ale nie tworzy incydentu.

## 6.4 Idempotencja

System nie może:

- otworzyć dwóch aktywnych incydentów dla tego samego monitora,
- zamknąć tego samego incydentu wielokrotnie,
- wysłać kilku identycznych alertów wskutek retry joba.

Logika ma być odporna na powtórne wykonanie wiadomości kolejki.

---

# 7. Uptime

W MVP uptime dla przedziału czasu liczyć jako:

```text
successful_checks / completed_checks * 100
```

Nie uwzględniać checków anulowanych lub wewnętrznych błędów schedulera.

Obsługiwane zakresy UI:

- 24h,
- 7d,
- 30d.

Jeżeli brak danych, pokazać `No data`, a nie `100%`.

W README należy wyjaśnić, że jest to **check-based uptime**, a nie formalny SLA oparty na ciągłym pomiarze czasu.

---

# 8. Proponowany stack

Agent ma użyć **aktualnych stabilnych wersji** bibliotek zgodnych ze sobą. Nie należy bez potrzeby używać preview/canary/beta.

## 8.1 Frontend / full-stack

- Next.js — App Router,
- React,
- TypeScript w trybie strict,
- Tailwind CSS,
- shadcn/ui,
- Lucide icons,
- Recharts do wykresów.

## 8.2 Backend

- Next.js Route Handlers / Server Actions tam, gdzie mają sens,
- PostgreSQL,
- Neon jako produkcyjna baza danych,
- Prisma ORM,
- Zod do walidacji.

## 8.3 Auth

- Auth.js,
- GitHub OAuth,
- Prisma adapter.

Jeśli aktualna stabilna wersja Auth.js wymaga innego zalecanego sposobu integracji, Agent ma użyć aktualnego oficjalnego podejścia.

## 8.4 Background jobs

Preferowana architektura:

- **Upstash QStash** jako zewnętrzna kolejka / wyzwalanie zadań,
- cykliczny globalny dispatcher,
- osobne zadanie wykonujące check pojedynczego monitora.

Nie wykonywać monitoringu w przeglądarce użytkownika.

## 8.5 Rate limiting / coordination

- Upstash Redis,
- `@upstash/ratelimit` lub aktualny odpowiednik,
- Redis może być również użyty do krótkiego locka dispatchera.

## 8.6 E-mail

- Resend,
- React Email lub prosty, bezpieczny HTML/template,
- osobne template:
  - incident opened,
  - incident resolved.

## 8.7 Testy

- Vitest,
- Testing Library tam, gdzie uzasadnione,
- Playwright dla E2E.

## 8.8 Hosting

Preferowany:

- Vercel — web application,
- Neon — PostgreSQL,
- Upstash — QStash + Redis,
- Resend — e-mail.

Jeżeli ograniczenia aktualnych darmowych planów uniemożliwiają któryś element, Agent może zamienić usługę na równoważną, lecz musi:
1. zachować architekturę,
2. opisać zmianę w README,
3. nie obniżyć bezpieczeństwa,
4. nie komplikować projektu bez potrzeby.

---

# 9. Architektura wysokiego poziomu

```text
User
  |
  v
Next.js application
  |
  +--> Auth.js
  |
  +--> PostgreSQL / Neon
  |
  +--> Redis / rate limits
  |
  +--> QStash
         |
         +--> Dispatcher
         |      |
         |      +--> finds due monitors
         |      +--> enqueues check jobs
         |
         +--> Check worker
                |
                +--> safe HTTP request
                +--> stores Check
                +--> updates Monitor state
                +--> opens/resolves Incident
                +--> sends alert job/email
```

---

# 10. Scheduler i kolejka

## 10.1 Dispatcher

Dispatcher uruchamia się cyklicznie.

Jego zadania:

1. uzyskać krótki lock zapobiegający równoległemu dispatcherowi,
2. pobrać aktywne monitory z:
   - `nextCheckAt <= now`,
   - status != `PAUSED`,
3. pobierać rekordy batchami,
4. dla każdego monitora zarezerwować następny termin,
5. enqueue check job,
6. zapisać informacje diagnostyczne,
7. zwolnić lock.

## 10.2 nextCheckAt

Monitor powinien posiadać pole `nextCheckAt`.

Po zaplanowaniu checku należy obliczyć następną wartość.

Dodać niewielki deterministic/random jitter, aby wszystkie monitory nie uruchamiały się dokładnie w tej samej sekundzie.

## 10.3 Check job

Job dla monitora:

1. weryfikuje autentyczność requestu kolejki,
2. pobiera monitor,
3. sprawdza, czy monitor nadal jest aktywny,
4. waliduje URL,
5. wykonuje bezpieczny request,
6. zapisuje check,
7. aktualizuje stan monitora,
8. otwiera / zamyka incident,
9. wysyła alert, jeżeli zaszła zmiana stanu.

## 10.4 Retry

Retry może być realizowane przez queue provider.

Wymagania:

- operacje muszą być idempotentne,
- duplikat joba nie może tworzyć duplikatów incydentów,
- retry nie może wielokrotnie wysyłać tego samego alertu.

---

# 11. SSRF — wymaganie krytyczne

UptimeForge wykonuje połączenia do URL podawanych przez użytkowników. Ochrona przed SSRF jest jednym z najważniejszych elementów projektu.

## 11.1 Bezwzględnie blokować

Połączenia do:

- `localhost`,
- `127.0.0.0/8`,
- `0.0.0.0/8`,
- `10.0.0.0/8`,
- `172.16.0.0/12`,
- `192.168.0.0/16`,
- `169.254.0.0/16`,
- link-local,
- loopback IPv6,
- private IPv6,
- multicast,
- unspecified addresses,
- cloud metadata endpoints,
- inne adresy niepubliczne / reserved.

Agent ma zastosować sprawdzoną bibliotekę do klasyfikacji IP lub własny dobrze przetestowany helper, jeżeli biblioteka nie jest potrzebna.

## 11.2 DNS resolution

Nie wystarczy sprawdzić sam string hosta.

Przed połączeniem:

1. sparsować URL przez standardowe URL API,
2. rozwiązać hostname,
3. sprawdzić wszystkie otrzymane IP,
4. odrzucić request, jeśli którekolwiek użyte IP jest niedozwolone.

## 11.3 DNS rebinding

Implementacja musi zapobiegać sytuacji:

```text
hostname -> public IP during validation
hostname -> private IP during connection
```

Bezpieczne podejście powinno wiązać realne połączenie z wcześniej zweryfikowanym adresem lub używać mechanizmu `lookup`/dispatcher zapewniającego ponowną kontrolę IP.

Agent ma dobrać implementację zgodną z aktualnym Node/Undici.

## 11.4 Redirects

Nie używać bezwarunkowo automatycznych redirectów.

Każdy redirect:

1. odczytać ręcznie,
2. zbudować kolejny URL,
3. ponownie przeprowadzić pełną walidację SSRF,
4. wykonać maksymalnie 5 redirectów.

## 11.5 Porty

MVP powinien zezwalać wyłącznie na standardowe HTTP/HTTPS:

- HTTP: 80,
- HTTPS: 443,
- brak jawnego portu.

Dopuszczenie innych publicznych portów może być rozszerzeniem po v1, nie jest wymagane.

## 11.6 Credentials w URL

Odrzucać adresy zawierające:

```text
https://user:password@example.com
```

## 11.7 Logowanie

Nigdy nie logować:

- tokenów,
- cookies,
- Authorization headers,
- pełnych sekretów,
- prywatnych danych użytkowników.

---

# 12. Model danych

Agent ma przygotować ostateczny schema Prisma. Minimalnie potrzebne modele:

## 12.1 User

Przez Auth.js.

Dodatkowe pola aplikacyjne mogą obejmować:

- id,
- name,
- email,
- image,
- createdAt,
- updatedAt.

## 12.2 Account / Session / VerificationToken

Według wymagań adaptera Auth.js.

## 12.3 Monitor

Sugerowane pola:

```text
id
userId
name
url
normalizedUrl
intervalMinutes
timeoutMs
status
isPaused
lastCheckedAt
nextCheckAt
lastResponseTimeMs
lastHttpStatus
consecutiveSuccesses
consecutiveFailures
createdAt
updatedAt
```

Ważne:

- URL może zostać znormalizowany,
- uniknąć niejednoznacznych duplikatów,
- indeks na `userId`,
- indeks na `nextCheckAt`,
- indeks ułatwiający dispatcherowi pobieranie aktywnych monitorów.

## 12.4 Check

```text
id
monitorId
startedAt
finishedAt
durationMs
result
httpStatus
errorCode
errorMessage
createdAt
```

`result` przykładowo:

- SUCCESS,
- HTTP_ERROR,
- TIMEOUT,
- DNS_ERROR,
- TLS_ERROR,
- CONNECTION_ERROR,
- BLOCKED_TARGET,
- INTERNAL_ERROR.

Indeksy:

- `(monitorId, createdAt)`,
- ewentualnie `(createdAt)` dla cleanup.

## 12.5 Incident

```text
id
monitorId
status
startedAt
resolvedAt
triggerCheckId
resolveCheckId
createdAt
updatedAt
```

Należy zagwarantować logicznie i/lub bazodanowo maksymalnie jeden otwarty incydent na monitor.

## 12.6 StatusPage

```text
id
userId
name
slug
description
isPublished
createdAt
updatedAt
```

Slug:

- unikalny globalnie,
- lower-case,
- bezpieczny URL,
- walidowany.

## 12.7 StatusPageMonitor

Tabela łącząca:

```text
statusPageId
monitorId
position
displayName?
```

Wymagania:

- monitor musi należeć do właściciela status page,
- unikalność pary,
- sortowanie przez `position`.

## 12.8 NotificationEvent lub NotificationDelivery

Zalecany model do idempotencji wysyłek.

Powinien umożliwić odnotowanie:

- typu zdarzenia,
- incident ID,
- kanału,
- adresata,
- statusu wysyłki,
- timestampu,
- deduplication key.

---

# 13. Retencja danych

Co najmniej raz dziennie uruchamiać cleanup:

- usuwać Check starsze niż 30 dni,
- nie usuwać monitorów,
- nie usuwać incydentów,
- nie usuwać agregatów potrzebnych do bieżącego UI.

Cleanup musi być bezpieczny i wykonywany batchami.

---

# 14. Autoryzacja i ownership

Każda prywatna operacja ma sprawdzać ownership po stronie serwera.

Nigdy nie ufać:

- `userId` przesłanemu z klienta,
- ID monitora bez sprawdzenia właściciela.

Przykład:

```text
UPDATE monitor
WHERE id = ? AND userId = currentUser.id
```

lub równoważna logika ORM.

Publiczne status pages udostępniają tylko dane niezbędne do prezentacji statusu.

Nie ujawniać:

- user ID,
- prywatnego e-maila,
- technicznych error stacków,
- wewnętrznych identyfikatorów niezwiązanych z publicznym URL.

---

# 15. Rate limiting

Wymagane minimum:

## Authenticated routes

- create/update monitor,
- manual check,
- status page mutations.

## Public

- public status page,
- ewentualne publiczne endpointy JSON.

Limity mają być rozsądne i zapisane w kodzie jako konfiguracja.

Nie należy przypadkowo blokować normalnego korzystania z UI.

---

# 16. Manual check

Na stronie monitora może istnieć przycisk:

**Check now**

Warunki:

- tylko właściciel monitora,
- rate limit, np. raz na 30 sekund na monitor,
- check ma iść przez tę samą bezpieczną logikę co background job,
- UI powinien pokazać loading i następnie odświeżyć dane.

Manual check nie powinien modyfikować `nextCheckAt` w sposób zaburzający harmonogram automatyczny.

---

# 17. Publiczne status pages

Publiczny URL przykładowo:

```text
/status/acme
```

Strona pokazuje:

- nazwę status page,
- opis,
- ogólny stan:
  - All systems operational,
  - Partial outage,
  - Major outage / service disruption,
- listę monitorów,
- aktualny status,
- 24h/7d/30d uptime,
- ostatnie incydenty,
- datę ostatniej aktualizacji.

Nie pokazywać surowych błędów infrastruktury.

## SEO

Publiczne strony:

- sensowny title,
- description,
- Open Graph metadata.

Prywatny dashboard:

- `noindex`.

---

# 18. UI / UX

## 18.1 Styl

Produkt powinien wyglądać jak nowoczesny developer SaaS:

- czysty,
- techniczny,
- profesjonalny,
- bez przesadzonych gradientów,
- wysoki kontrast,
- czytelne status colors,
- dobre odstępy,
- responsywny.

## 18.2 Status colors

Semantycznie:

- UP — sukces,
- DOWN — danger,
- PENDING — neutral/warning,
- PAUSED — muted.

Kolor nigdy nie może być jedynym nośnikiem informacji. Używać również:

- tekstu,
- ikon,
- aria labels.

## 18.3 Dostępność

Minimum:

- semantyczny HTML,
- focus states,
- keyboard navigation,
- labels,
- aria tam, gdzie potrzebne,
- kontrast,
- formularze z czytelnymi errorami.

---

# 19. Ekrany

## 19.1 Landing page

Sekcje:

1. navbar,
2. hero,
3. krótki opis produktu,
4. 3–4 główne feature cards,
5. screenshot/mock dashboardu wykonany kodem UI, nie statycznym fake obrazkiem,
6. security/reliability section,
7. CTA,
8. footer.

CTA:

- Sign in with GitHub,
- View demo status page — jeśli demo jest bezpiecznie dostępne.

## 19.2 Sign in

Prosty ekran GitHub OAuth.

## 19.3 Dashboard

Pokazuje:

- liczbę monitorów,
- liczbę UP,
- liczbę DOWN,
- średni uptime,
- aktywne incydenty,
- listę monitorów.

Każdy monitor:

- name,
- domain,
- state,
- uptime 24h,
- latest response time,
- last checked,
- link do szczegółów.

## 19.4 New monitor

Form:

- name,
- URL,
- interval,
- timeout.

Walidacja inline i server-side.

## 19.5 Monitor details

Nagłówek:

- name,
- URL,
- current state,
- pause/resume,
- check now,
- edit.

Sekcje / tabs:

### Overview
- current status,
- uptime 24h / 7d / 30d,
- current/last response time,
- response-time chart,
- latest checks,
- current incident.

### History
- paginated checks,
- filter success/failure,
- status code,
- duration,
- time.

### Incidents
- active incident,
- resolved incidents.

### Settings
- name,
- URL,
- interval,
- timeout,
- pause,
- delete monitor.

Delete wymaga potwierdzenia.

## 19.6 Status pages dashboard

- lista status pages,
- create,
- edit,
- published/unpublished,
- copy public URL.

## 19.7 Status page editor

- name,
- slug,
- description,
- published toggle,
- wybór monitorów,
- kolejność.

## 19.8 Public status page

Mobile-first, szybka i prosta.

## 19.9 Account settings

Minimum:

- user info,
- sign out,
- delete account.

Delete account powinno usuwać:

- monitory,
- checki,
- incydenty,
- status pages,
- zależne dane aplikacyjne,

zgodnie z relacjami i transakcją.

---

# 20. Formularze i walidacja

Wspólny schema Zod powinien istnieć dla ważnych danych.

## Monitor name

- trim,
- min 2,
- max 80.

## URL

- prawidłowy URL,
- tylko HTTP/HTTPS,
- brak credentials,
- brak fragmentu, jeżeli niepotrzebny,
- SSRF validation odbywa się również przed realnym requestem, nie tylko przy zapisie.

## Slug

- `[a-z0-9-]`,
- min sensowny,
- max ok. 50,
- unikalny,
- blokada reserved slugs.

Reserved przykładowo:

```text
api
admin
login
signin
dashboard
status
settings
www
app
```

---

# 21. Błędy i obserwowalność

## 21.1 User-facing

Użytkownik widzi bezpieczne komunikaty:

- Request timed out,
- Could not resolve host,
- TLS connection failed,
- Endpoint returned HTTP 500,
- Target is not allowed.

Nie pokazywać stack traces.

## 21.2 Logs

Logi backendowe powinny być strukturalne.

Co najmniej:

- event,
- monitorId,
- jobId,
- duration,
- result,
- timestamp.

Bez sekretów.

## 21.3 Error tracking

Opcjonalne, ale mile widziane:

- Sentry.

Nie jest wymagane do MVP, jeżeli komplikowałoby deployment.

---

# 22. Bezpieczeństwo aplikacji

Wymagane:

- CSRF zgodnie z frameworkiem/auth,
- secure cookies,
- `HttpOnly`,
- `SameSite`,
- secrets tylko po stronie server,
- CSP, jeśli możliwe bez destabilizacji aplikacji,
- podstawowe security headers,
- brak `dangerouslySetInnerHTML` dla danych użytkownika,
- walidacja inputów,
- brak raw SQL z interpolacją,
- rate limiting,
- authorization,
- SSRF protection,
- QStash signature verification,
- ochrona internal routes.

Endpointy kolejki nie mogą być możliwe do wywołania przez dowolnego użytkownika z internetu bez poprawnej autoryzacji/signature.

---

# 23. Konfiguracja environment variables

Przygotować `.env.example`.

Przykładowe grupy:

```env
DATABASE_URL=
AUTH_SECRET=
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=

UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

QSTASH_URL=
QSTASH_TOKEN=
QSTASH_CURRENT_SIGNING_KEY=
QSTASH_NEXT_SIGNING_KEY=

RESEND_API_KEY=
EMAIL_FROM=

APP_URL=
```

Nazwy mają odpowiadać rzeczywiście użytym SDK.

Nigdy nie commitować prawdziwego `.env`.

---

# 24. Struktura repozytorium

Dokładna struktura może zostać dostosowana, ale zalecany kierunek:

```text
uptimeforge/
├─ .github/
│  └─ workflows/
│     └─ ci.yml
├─ prisma/
│  ├─ schema.prisma
│  └─ migrations/
├─ public/
├─ src/
│  ├─ app/
│  │  ├─ (marketing)/
│  │  ├─ (auth)/
│  │  ├─ dashboard/
│  │  ├─ status/
│  │  └─ api/
│  ├─ components/
│  │  ├─ ui/
│  │  ├─ charts/
│  │  ├─ monitors/
│  │  └─ status-pages/
│  ├─ features/
│  │  ├─ monitors/
│  │  ├─ checks/
│  │  ├─ incidents/
│  │  ├─ status-pages/
│  │  └─ notifications/
│  ├─ lib/
│  │  ├─ auth/
│  │  ├─ db/
│  │  ├─ queue/
│  │  ├─ redis/
│  │  ├─ email/
│  │  ├─ security/
│  │  └─ validation/
│  ├─ server/
│  └─ test/
├─ tests/
│  └─ e2e/
├─ .env.example
├─ .gitignore
├─ README.md
├─ LICENSE
├─ package.json
└─ ...
```

Unikać folderów typu `utils.ts` zawierających dziesiątki niezwiązanych funkcji.

Logikę domenową izolować od Reacta.

---

# 25. Testy

Projekt nie może zostać uznany za ukończony bez testów.

## 25.1 Unit tests

Minimum dla:

- URL normalization,
- URL validation,
- private IP detection,
- IPv4/IPv6 SSRF rules,
- redirect validation,
- incident state machine,
- uptime calculation,
- nextCheckAt calculation,
- slug validation,
- rate-limit helpers, jeżeli logika własna.

## 25.2 Integration tests

Minimum:

- create monitor,
- unauthorized access do cudzego monitora,
- check result zapisuje poprawny stan,
- 2 failures → incident,
- kolejny duplicate job → brak duplicate incident,
- 2 successes → resolve,
- status page nie może zawierać cudzego monitora,
- account deletion cascade.

## 25.3 E2E

Playwright:

1. wejście na landing,
2. autoryzowany użytkownik otwiera dashboard,
3. tworzy monitor,
4. widzi go na liście,
5. edytuje,
6. tworzy status page,
7. publikuje status page,
8. publiczna strona jest dostępna,
9. usuwa monitor.

OAuth może być stubowany/test-mode.

E2E nie powinno zależeć od prawdziwego GitHub OAuth.

## 25.4 Security tests

Napisać testy, które próbują monitorować m.in.:

```text
http://localhost
http://127.0.0.1
http://10.0.0.1
http://169.254.169.254
http://[::1]
```

oraz redirect public URL → private URL.

Wszystkie muszą być blokowane.

---

# 26. Dev experience

Wymagane scripts:

```text
dev
build
start
lint
typecheck
test
test:watch
test:e2e
format / format:check
```

Jeżeli użyty toolchain oferuje scalone lint+format, dostosować scripts sensownie.

`npm run build` musi przechodzić przed finalnym release.

Preferować jeden package manager. Użyć `pnpm`, chyba że środowisko projektu wskazuje inaczej.

Commitować lockfile.

---

# 27. GitHub Actions CI

Plik:

```text
.github/workflows/ci.yml
```

CI na:

- push,
- pull_request.

Etapy minimum:

1. checkout,
2. setup Node,
3. package manager cache,
4. install frozen lockfile,
5. lint,
6. typecheck,
7. unit/integration tests,
8. build.

E2E może być osobnym jobem, jeśli wymaga DB.

Nie pomijać CI tylko dlatego, że build działa lokalnie.

---

# 28. Git i GitHub — obowiązkowe instrukcje dla Agenta

Ta sekcja jest **obowiązkowa**.

Agent ma wykonywać operacje Git/GitHub samodzielnie, o ile środowisko posiada dostęp i wymagane uwierzytelnienie.

## 28.1 Przed pierwszym commitem

Agent ma wykonać i sprawdzić:

```bash
git status
git remote -v
git branch --show-current
git config user.name
git config user.email
gh auth status
```

Jeżeli workspace nie jest jeszcze repozytorium:

```bash
git init
git branch -M main
```

## 28.2 Tożsamość commitów

Agent **nie może wymyślać** autora commitów.

Ma użyć poprawnej tożsamości skonfigurowanej w środowisku / GitHub CLI.

Jeżeli `git config user.name` lub `user.email` są niepoprawne albo niezgodne z zalogowanym kontem GitHub:

- poprawić je tylko wtedy, gdy prawidłowe dane są jednoznacznie dostępne w środowisku,
- w przeciwnym razie nie tworzyć commitów pod fikcyjną tożsamością,
- zachować kod lokalnie i jednoznacznie zgłosić problem.

Nie przepisywać historii istniejącego repozytorium bez wyraźnej potrzeby.

## 28.3 Repozytorium GitHub

Jeśli remote `origin` istnieje:

- użyć go,
- nie tworzyć drugiego repozytorium.

Jeśli remote nie istnieje i GitHub CLI jest zalogowane:

- utworzyć repozytorium `uptimeforge`,
- preferować repo publiczne dla portfolio,
- dodać `origin`,
- pushować `main`.

Przykładowo:

```bash
gh repo create uptimeforge --public --source=. --remote=origin
```

Nie wykonywać komendy bez wcześniejszego sprawdzenia, czy repo już nie istnieje.

## 28.4 Strategia commitów

Nie robić jednego gigantycznego commita na końcu.

Tworzyć logiczne, małe/średnie commity po ukończeniu stabilnego etapu.

Preferowane Conventional Commits:

```text
chore: initialize uptimeforge project
feat: add authentication and protected dashboard
feat: add monitor management
feat: implement secure http checker
feat: add qstash monitoring pipeline
feat: add incident detection
feat: add public status pages
feat: add email incident alerts
test: add monitoring security coverage
ci: add github actions pipeline
docs: complete production documentation
fix: prevent duplicate incident notifications
```

Commit nie może zawierać:

- sekretów,
- `.env`,
- debug dumpów,
- zbędnych plików,
- danych produkcyjnych.

## 28.5 Push

Po każdym stabilnym milestone:

```bash
git push origin main
```

Agent ma regularnie pushować postęp.

Nie zostawiać gotowej pracy tylko w lokalnych commitach.

## 28.6 Kontrola przed push

Przed ważnym push:

```bash
git status
pnpm lint
pnpm typecheck
pnpm test
```

Przed finalnym push również:

```bash
pnpm build
```

## 28.7 GitHub Actions

Po push Agent ma sprawdzić stan workflow:

```bash
gh run list
```

Jeśli CI jest czerwone:

- sprawdzić logi,
- naprawić,
- commit,
- push,
- ponownie zweryfikować.

Nie uznawać projektu za ukończony przy failing CI.

## 28.8 Final release

Po ukończeniu v1:

1. wszystkie testy zielone,
2. build zielony,
3. CI zielone,
4. README aktualne,
5. working tree clean,
6. production smoke test zakończony.

Następnie:

```bash
git tag -a v1.0.0 -m "UptimeForge v1.0.0"
git push origin v1.0.0
```

Jeśli GitHub CLI pozwala:

```bash
gh release create v1.0.0 --generate-notes --title "UptimeForge v1.0.0"
```

## 28.9 Zakaz force push

Nie używać:

```bash
git push --force
git push --force-with-lease
```

chyba że użytkownik wyraźnie poleci zmianę historii.

## 28.10 Końcowy raport Agenta

Po zakończeniu Agent ma podać:

- URL repozytorium,
- branch,
- ostatni commit SHA,
- release/tag,
- wynik testów,
- wynik build,
- wynik CI,
- URL produkcji,
- znane ograniczenia.

---

# 29. README

README jest częścią produktu portfolio.

Powinien zawierać:

## Header

- UptimeForge,
- krótki opis,
- badges CI,
- link do live demo.

## Preview

- 1–3 screenshots produkcji.

Nie commitować olbrzymich obrazów. Zoptymalizować.

## Features

Krótka lista.

## Architecture

Diagram Mermaid.

Przykład:

```mermaid
flowchart LR
    User --> Next
    Next --> Neon
    Next --> QStash
    QStash --> Dispatcher
    QStash --> Checker
    Checker --> Target
    Checker --> Neon
    Checker --> Resend
```

## Security

Wyraźnie opisać:

- SSRF protection,
- private address blocking,
- redirect validation,
- queue signature verification,
- ownership.

## Tech stack

## Local setup

Dokładnie:

- prerequisites,
- clone,
- install,
- env,
- DB,
- migrations,
- dev.

## Testing

## Deployment

## Project decisions / trade-offs

Np.:

- 5-min minimum checks,
- check-based uptime,
- 30-day retention,
- serverless scheduler.

## Roadmap

Krótka roadmapa v1.x / v2.

## License

MIT.

---

# 30. Roadmap implementacyjna

Agent ma realizować projekt etapami. Po każdym etapie:

1. uruchomić relevant tests,
2. sprawdzić git diff,
3. wykonać logiczny commit,
4. push do GitHub.

---

## Phase 0 — Repository & planning

### Zadania

- sprawdzić Git/GitHub identity,
- utworzyć repo lub podłączyć existing remote,
- utworzyć `main`,
- dodać `.gitignore`,
- dodać `LICENSE`,
- utworzyć początkowy README,
- przygotować roadmap checklist.

### Definition of done

- repo działa,
- origin działa,
- pierwszy commit jest na GitHub.

---

## Phase 1 — Foundation

### Zadania

- Next.js + TypeScript,
- pnpm,
- Tailwind,
- shadcn/ui,
- ESLint,
- formatter,
- env validation,
- podstawowy layout,
- theme provider,
- error boundaries,
- podstawowe test tooling.

### Commit

```text
chore: initialize uptimeforge application
```

---

## Phase 2 — Database & authentication

### Zadania

- Neon/Postgres,
- Prisma,
- initial migration,
- Auth.js,
- GitHub OAuth,
- protected dashboard,
- user menu,
- logout.

### Testy

- auth guards,
- DB connection,
- basic user flow.

### Commit

```text
feat: add database and github authentication
```

---

## Phase 3 — Monitor CRUD

### Zadania

- model Monitor,
- create,
- list,
- details,
- update,
- pause/resume,
- delete,
- limits per user,
- authorization,
- validation.

### UI

- dashboard,
- create form,
- settings.

### Testy

- ownership,
- limit,
- invalid URLs.

### Commit

```text
feat: add monitor management
```

---

## Phase 4 — Secure HTTP checker

Najważniejszy etap techniczny.

### Zadania

- URL normalization,
- DNS resolution,
- IP classification,
- private IP blocking,
- DNS rebinding defense,
- manual redirects,
- max redirects,
- timeout,
- HTTP classification,
- response time,
- safe errors,
- manual Check Now.

### Testy

Duża liczba unit/security tests.

### Commit

```text
feat: implement ssrf-safe http monitoring
```

---

## Phase 5 — Check persistence & analytics

### Zadania

- Check model,
- historia checków,
- paginacja,
- uptime calculation,
- response-time chart,
- dashboard metrics.

### Commit

```text
feat: add check history and uptime analytics
```

---

## Phase 6 — QStash scheduler

### Zadania

- QStash SDK,
- internal dispatcher route,
- signature verification,
- Redis lock,
- due-monitor query,
- `nextCheckAt`,
- jitter,
- enqueue check jobs,
- retry/idempotency,
- dev fallback do ręcznego uruchamiania.

### Testy

- dispatcher,
- no duplicate dispatch under lock,
- paused monitors excluded.

### Commit

```text
feat: add qstash background monitoring pipeline
```

---

## Phase 7 — Incident engine

### Zadania

- Incident model,
- consecutive failure/success counters,
- open after 2 failures,
- resolve after 2 successes,
- idempotent transitions,
- incident history.

### Testy

Pełny state machine.

### Commit

```text
feat: add automatic incident detection
```

---

## Phase 8 — Email notifications

### Zadania

- Resend,
- templates,
- incident opened,
- incident resolved,
- deduplication,
- delivery logs.

### Testy

- template rendering,
- idempotency.

### Commit

```text
feat: add incident email alerts
```

---

## Phase 9 — Public status pages

### Zadania

- StatusPage,
- StatusPageMonitor,
- CRUD,
- slug,
- publishing,
- ordering,
- public rendering,
- SEO metadata,
- recent incidents.

### Testy

- privacy,
- ownership,
- published/unpublished.

### Commit

```text
feat: add public status pages
```

---

## Phase 10 — Data retention & account lifecycle

### Zadania

- cleanup job,
- batching,
- account deletion,
- cascade/transakcje,
- stale records cleanup.

### Commit

```text
feat: add data retention and account cleanup
```

---

## Phase 11 — UX polish

### Zadania

- responsive,
- dark/light,
- skeletons,
- empty states,
- errors,
- toasts,
- accessibility,
- page metadata,
- loading optimization,
- no layout shifts where practical.

### Commit

```text
feat: polish dashboard user experience
```

---

## Phase 12 — Test hardening

### Zadania

- unit,
- integration,
- E2E,
- security regression,
- flaky test fixes,
- coverage review.

Nie wymagać sztucznie 100% coverage.

Priorytet:

- krytyczna logika,
- security,
- incident engine,
- authorization.

### Commit

```text
test: harden monitoring and security coverage
```

---

## Phase 13 — CI

### Zadania

- GitHub Actions,
- lint,
- typecheck,
- test,
- build,
- E2E jeśli praktyczne.

### Commit

```text
ci: add github actions quality pipeline
```

---

## Phase 14 — Deployment

### Zadania

- Vercel project,
- production env,
- Neon production DB,
- migrations,
- Upstash,
- Resend,
- GitHub OAuth production callback,
- QStash scheduler,
- production smoke test.

### Smoke tests

Minimum:

- login,
- create monitor,
- manual check,
- automatic check,
- check history,
- incident simulation w bezpieczny sposób,
- email alert,
- status page,
- logout.

Nie zostawiać danych smoke testu, jeśli można je bezpiecznie usunąć.

### Commit

```text
chore: configure production deployment
```

---

## Phase 15 — Documentation & release

### Zadania

- final README,
- screenshots,
- architecture diagram,
- setup,
- env,
- deployment,
- trade-offs,
- roadmap,
- CI badge,
- clean repo,
- final audit.

### Commit

```text
docs: finalize uptimeforge documentation
```

Następnie:

- push,
- sprawdzenie CI,
- tag `v1.0.0`,
- GitHub Release.

---

# 31. Future roadmap po v1.0

Nie implementować przed ukończeniem v1.

## v1.1

- keyword/content assertions,
- custom expected HTTP status range,
- maintenance windows,
- export CSV,
- improved filtering.

## v1.2

- Discord/Slack/webhook alerts,
- SSL expiration monitor,
- 1-minute interval jako opcja,
- daily/weekly reports.

## v1.3

- team workspaces,
- invitations,
- RBAC.

## v2

- multiple checker regions,
- latency by region,
- custom domains for status pages,
- paid plans,
- subscriptions,
- SLA/SLO analytics,
- API keys,
- external API,
- infrastructure improvements.

---

# 32. Performance

Wymagania praktyczne:

- dashboard nie może ładować całej historii checków,
- używać paginacji,
- wykresy pobierają ograniczony dataset,
- database indexes,
- `select` tylko wymaganych pól,
- avoid N+1,
- Server Components tam, gdzie sensowne,
- Client Components tylko gdy potrzebna interakcja.

Public status page ma być lekka i cache'owalna, ale cache nie może powodować wyświetlania starych informacji przez zbyt długi czas.

---

# 33. Database migrations

Zasady:

- każda zmiana schema → migration,
- commitować migrations,
- nie używać `db push` jako zamiennika historii produkcyjnych migracji,
- produkcja: migration deploy zgodnie z Prisma docs.

Nie niszczyć produkcyjnych danych podczas deploymentu.

---

# 34. Seed/demo

Opcjonalny dev seed może tworzyć:

- demo user,
- 2–3 demo monitors,
- sample checks,
- incident.

Seed nie może trafiać automatycznie na produkcję.

---

# 35. API conventions

Jeśli Route Handler zwraca JSON:

Sukces:

```json
{
  "data": {}
}
```

Błąd:

```json
{
  "error": {
    "code": "MONITOR_NOT_FOUND",
    "message": "Monitor not found"
  }
}
```

Nie wymagać tej struktury dla Server Actions, jeżeli wybrane podejście frameworka ma czytelniejszy standard.

---

# 36. Typowe edge cases

Agent musi obsłużyć:

- user deletes monitor while job is queued,
- monitor paused while job is queued,
- redirect loop,
- invalid `Location`,
- DNS returns multiple IP,
- IPv6 private target,
- timeout,
- connection reset,
- TLS certificate error,
- HTTP 429,
- HTTP 500,
- duplicate QStash delivery,
- dispatcher called twice,
- user changes interval,
- user changes URL podczas istniejącego incidentu,
- status page containing deleted monitor,
- account deletion,
- no check data,
- only one check,
- clock/date formatting,
- DST in UI.

W bazie zapisywać timestamps w UTC.

W UI wyświetlać w locale użytkownika.

---

# 37. Zmiana URL monitora

Zmiana URL powinna być traktowana jak zmiana monitorowanego zasobu.

Po zmianie:

- zresetować consecutive success/failure,
- status → PENDING,
- zamknąć aktywny incident jako resolved/system-changed lub usunąć jego aktywność w kontrolowany sposób,
- ustawić nowy nextCheckAt,
- zachować historyczne checki związane z monitorem lub jasno rozdzielić historię.

Preferowane MVP:

- zachować checki,
- wyświetlać informację, że URL został zmieniony od określonej daty,
- nie mieszać aktywnego incidentu starego URL z nowym targetem.

---

# 38. Delete monitor

Usuwanie:

- wymaga confirm dialog,
- tylko owner,
- cascade dla checków/incidents/status-page relations,
- wykonywane transakcyjnie / relacyjnie,
- queue job po usunięciu musi zakończyć się bez błędu krytycznego.

---

# 39. Definition of Done — projekt

Projekt jest ukończony dopiero, gdy wszystkie poniższe warunki są spełnione.

## Produkt

- [ ] użytkownik może zalogować się przez GitHub,
- [ ] użytkownik może utworzyć monitor,
- [ ] scheduler wykonuje automatyczne checki,
- [ ] safe checker blokuje SSRF,
- [ ] historia checków działa,
- [ ] wykres response time działa,
- [ ] uptime działa,
- [ ] 2 failures otwierają incident,
- [ ] 2 successes rozwiązują incident,
- [ ] email alert działa,
- [ ] status pages działają,
- [ ] pause/resume działa,
- [ ] manual check działa,
- [ ] delete account działa.

## Jakość

- [ ] TypeScript strict bez zbędnych `any`,
- [ ] lint przechodzi,
- [ ] typecheck przechodzi,
- [ ] unit tests przechodzą,
- [ ] integration tests przechodzą,
- [ ] E2E krytycznych flow przechodzi,
- [ ] build przechodzi,
- [ ] brak sekretów w repo,
- [ ] brak debug code,
- [ ] brak TODO blokujących feature.

## Security

- [ ] private IPv4 blocked,
- [ ] private IPv6 blocked,
- [ ] metadata endpoint blocked,
- [ ] redirect SSRF blocked,
- [ ] DNS rebinding mitigated,
- [ ] internal queue endpoints authenticated,
- [ ] ownership tested,
- [ ] rate limits działają.

## GitHub

- [ ] repo istnieje,
- [ ] remote działa,
- [ ] logiczna historia commitów,
- [ ] wszystkie stabilne etapy pushowane,
- [ ] GitHub Actions green,
- [ ] README kompletne,
- [ ] MIT License,
- [ ] tag `v1.0.0`,
- [ ] GitHub Release,
- [ ] working tree clean.

## Production

- [ ] deployed,
- [ ] OAuth production działa,
- [ ] scheduler działa,
- [ ] DB migrations wykonane,
- [ ] email działa,
- [ ] public status page działa,
- [ ] smoke test wykonany.

---

# 40. Zasady pracy Agenta

1. **Nie pytaj o drobne decyzje**, jeśli można bezpiecznie wybrać rozsądny standard.
2. Nie zwiększaj zakresu bez potrzeby.
3. Najpierw działające i bezpieczne MVP, potem polish.
4. Nie zostawiaj mocków w finalnej produkcji.
5. Nie ukrywaj błędów przez wyłączanie lint/testów.
6. Nie dodawaj `eslint-disable` bez uzasadnienia.
7. Nie używaj `@ts-ignore`, jeśli można poprawić typy.
8. Nie commituj sekretów.
9. Nie commituj `.env`.
10. Nie hardcoduj kluczy.
11. Nie obchodź failing tests.
12. Po zmianach w krytycznej logice dodawaj regression test.
13. Każdy endpoint sprawdza authorization.
14. Każdy user-controlled URL przechodzi SSRF validation.
15. Każdy background job ma być idempotentny.
16. Każdy milestone kończy się testem, commitem i pushem.
17. Nie zostawiaj lokalnych commitów bez push.
18. Sprawdzaj CI po ważnych pushach.
19. Finalna wersja musi mieć clean working tree.
20. Wszystkie kompromisy techniczne opisz w README.

---

# 41. Kolejność priorytetów w razie problemów

Jeśli Agent napotka konflikt wymagań:

1. bezpieczeństwo,
2. poprawność danych,
3. niezawodność,
4. prostota architektury,
5. testowalność,
6. UX,
7. performance,
8. dodatkowy polish.

Nigdy nie poświęcać bezpieczeństwa tylko po to, aby szybko zakończyć feature.

---

# 42. Kryteria jakości portfolio

Repozytorium powinno sprawiać wrażenie projektu, który można pokazać podczas rekrutacji.

Oczekiwane:

- dobra nazwa,
- spójny UI,
- czytelny README,
- architecture diagram,
- screenshots,
- security section,
- deployment link,
- sensowna historia commitów,
- testy,
- CI,
- brak śmieci w repo,
- profesjonalne nazwy zmiennych i komponentów,
- logiczna struktura projektu,
- brak copy-paste architecture,
- brak nadmiernej abstrakcji.

---

# 43. Wymagany finalny raport

Po zakończeniu prac Agent ma zwrócić użytkownikowi raport w formacie:

```text
UptimeForge v1.0.0 — completed

Repository:
<GitHub URL>

Production:
<deployment URL>

Git:
- branch: main
- latest commit: <SHA>
- tag: v1.0.0
- working tree: clean

Quality:
- lint: PASS
- typecheck: PASS
- tests: PASS
- e2e: PASS
- build: PASS
- GitHub Actions: PASS

Infrastructure:
- database: configured
- QStash scheduler: configured
- Redis: configured
- email: configured
- OAuth: configured

Smoke test:
- authentication: PASS
- monitor creation: PASS
- manual check: PASS
- scheduled check: PASS
- incident transition: PASS
- email: PASS
- public status page: PASS

Known limitations:
<short list or "None beyond documented MVP scope">
```

Nie deklarować `PASS`, jeśli Agent faktycznie nie wykonał danej kontroli.

---

# 44. Ostateczna dyrektywa

Zbuduj **UptimeForge** jako dopracowaną, bezpieczną i rzeczywiście działającą aplikację portfolio.

Nie buduj jedynie demonstracji interfejsu.

Kluczowe elementy, które muszą działać end-to-end:

```text
User creates monitor
        ↓
Monitor becomes scheduled
        ↓
Background dispatcher enqueues check
        ↓
Safe checker performs HTTP request
        ↓
Result is stored
        ↓
Dashboard updates
        ↓
Repeated failures create incident
        ↓
Email is sent
        ↓
Public status page shows outage
        ↓
Repeated successes resolve incident
        ↓
Recovery email is sent
        ↓
Public page returns to operational
```

Cały cykl ma być pokryty testami na odpowiednich poziomach.

Po zakończeniu:

- kod ma być na GitHubie,
- wszystkie stabilne zmiany mają być commitowane i pushowane,
- CI ma być zielone,
- aplikacja ma być wdrożona,
- dokumentacja ma być kompletna,
- repo ma być gotowe do pokazania jako projekt portfolio.

**Nie uznawaj projektu za zakończony, dopóki kod istnieje tylko lokalnie lub GitHub nie zawiera aktualnej wersji.**
