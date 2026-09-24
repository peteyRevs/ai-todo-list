# To-do

A single-user to-do list built with Next.js. You can add, complete and delete items. Completed items sort to the bottom, and everything is stored in SQLite, so the list is still there after you leave the page, restart the server or restart the container. Each item also has a **magic wand** button that asks Google Gemini for a short list of steps to get it done.

## Quick start (Docker)

Requirements: Docker with Compose v2.

```bash
cp .env.example .env          # optional: add GEMINI_API_KEY to enable the magic wand
docker compose up --build -d
```

Open <http://localhost:3000>.

- Data lives in the `todo-data` named volume, so it survives `docker compose restart` and `docker compose down`/`up`. To wipe it, run `docker compose down -v`.
- To use a different host port, run `PORT=8080 docker compose up --build -d`.
- Stop with `docker compose down`.

Without Compose:

```bash
docker build -t todo .
docker run -p 3000:3000 -v todo-data:/app/data -e GEMINI_API_KEY=your-key todo
```

## Configuration

All settings are optional environment variables (see `.env.example`):

| Variable | Default | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | _(unset)_ | Enables the magic wand ([get a key](https://aistudio.google.com/apikey)). When it isn't set, the app still works and the wand button is disabled with a tooltip. |
| `GEMINI_MODEL` | `gemini-3.8-flash` | Gemini model used to generate steps. |
| `DATABASE_PATH` | `./data/todos.db` (`/app/data/todos.db` in Docker) | SQLite database file location. |
| `PORT` | `3000` | Host port for Docker Compose, or the server port when running locally. |

## Local development

Requirements: Node.js 22+.

```bash
npm install
cp .env.example .env.local    # optional, for the magic wand
npm run dev                   # http://localhost:3000
```

Other scripts:

```bash
npm test            # Vitest: sorting, Server Actions (in-memory SQLite) and the Gemini module (SDK mocked)
npm run typecheck   # generate Next route types and run tsc
npm run lint        # ESLint
npm run build       # production build (standalone output)
```

## How it works

```
src/
  app/
    page.tsx                  Server component: reads todos from SQLite, renders <TodoApp>
    api/health/route.ts       Health check used by the Docker HEALTHCHECK
  actions/todos.ts            Server Actions ("use server"): add, complete, delete, generate steps
  components/
    TodoApp.tsx               Client UI: list state, optimistic updates, calls the actions
    TodoItem.tsx              One row: checkbox, wand, delete, steps panel
    icons.tsx                 Inline SVG icons
  lib/
    db.ts                     SQLite connection + schema
    todos.ts                  Data access
    sort.ts                   Ordering rule, shared by server and client
    ai.ts                     Gemini call with structured (Zod-validated) output
    validation.ts             Zod schemas for action arguments
    types.ts                  Todo and ActionResult types
tests/                        Vitest tests
```

**Persistence.** The list lives on the server in SQLite (`better-sqlite3`). In Docker the database file is on a named volume. The page is rendered on the server for each request, so it always shows the current list, including after navigating away and back. [ASSUMPTIONS.md](./ASSUMPTIONS.md) explains why I chose this over `localStorage`.

**Ordering.** Open items come first, oldest first. Completed items follow, most recently completed first. If you uncheck an item, it moves back up. The rule lives in `lib/sort.ts` and both the server and the UI use it, so optimistic updates land in the same place the server would put them.

**Magic wand.** The `generateTodoSteps` action sends the item's title to Gemini and asks for 3–7 short, actionable steps. The response is constrained to a JSON schema generated from a Zod schema (`{ steps: string[] }`) and validated again with Zod on the server. Steps are saved on the item, so reopening them is instant and costs nothing. **Regenerate** asks for a fresh set. The API key stays on the server and is never sent to the browser. Provider errors (bad key, rate limit, safety block) are turned into clear messages in the UI.

**Server Actions.** The UI talks to the server only through the Server Actions in `src/actions/todos.ts`. There is no hand-written REST API or `fetch` code. Each action:

- validates its arguments with Zod, because actions can be called with any payload by a direct POST;
- returns `{ ok: true, data }` or `{ ok: false, error }` instead of throwing, because Next.js hides thrown error messages in production builds.

| Action | Arguments | Returns |
|---|---|---|
| `getTodos` | – | `Todo[]` (sorted) |
| `addTodo` | `title` (1–200 chars after trimming) | `Todo` |
| `setTodoCompleted` | `id`, `completed` | `Todo` |
| `deleteTodo` | `id` | `null` |
| `generateTodoSteps` | `id` | `Todo` with `steps` |

Next.js runs Server Actions one at a time per browser tab. While the wand is waiting for Gemini, other clicks still update the screen straight away (they're optimistic), but saving them waits until the AI call finishes. See ASSUMPTIONS.md.

`GET /api/health` returns `{ "status": "ok" }` for the Docker health check.
