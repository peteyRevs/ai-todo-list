# How AI was used

## Tooling

| | |
|---|---|
| **Harness** | [Claude Code](https://claude.com/claude-code) (Anthropic's agentic CLI), run in the terminal on macOS |
| **Model** | Claude Opus 5.5 (`claude-opus-5-5`, 1M context) |
| **Tools the agent used** | Shell (npm, git, Docker, curl), file read/write/edit, Chrome browser automation (Claude in Chrome) for UI checks, the bundled `claude-api` skill (Anthropic SDK reference, used for the first version of the wand), and web fetches of Google's Gemini API docs (current model IDs and structured output) |
| **Reference docs** | The Next.js 16 docs bundled in `node_modules/next/dist/docs`, read by the agent before writing route handlers, `connection()` and `output: "standalone"` config (`create-next-app` adds `AGENTS.md`/`CLAUDE.md` pointing agents there) |

## How the work was split

I used Claude Code as a pair programmer. I made the product and architecture decisions; the agent proposed options, wrote the code, and ran it to check it worked.

1. **Understanding the brief.** I pasted in the assignment and asked the agent to go through it with me. It listed the requirements, what each one implies, and a suggested stack.
2. **Persistence decision.** I pointed out that `localStorage` would probably meet the persistence requirement and asked whether that's what the reviewers were looking for. We discussed the trade-offs and I chose a middle option: store data server-side in SQLite (needed anyway to keep the AI key secret) and note in `ASSUMPTIONS.md` that `localStorage` would also have worked.
3. **Stack decision.** I chose Next.js because it's what Agora uses. The agent flagged the one risk (the native SQLite module inside a standalone Docker build) and handled it.
4. **AI provider.** The wand first used Anthropic Claude. I then asked for Google Gemini instead. The agent checked the installed `@google/genai` SDK types and Google's current model list before rewriting `src/lib/ai.ts`, instead of relying on memory.
5. **Implementation.** The agent scaffolded the app with `create-next-app`, then wrote the data layer, API routes, UI, AI integration, tests, Dockerfile and docs.
6. **Verification.** The agent ran unit and action tests, typecheck, lint, a production build, curl smoke tests against the standalone server, and a Docker Compose run that checked data survives `restart` and `down`/`up`.
7. **Refactor to Server Actions.** I found `TodoApp` too large and asked to split out the icons and `TodoItem`, and to move the server calls into a `"use server"` actions module. The agent pointed out (quoting the Next.js docs) that Server Actions run one at a time per client, so a slow AI call would hold up other saves, and suggested keeping the wand as a Route Handler. I chose to make everything a Server Action for simplicity and recorded the trade-off in `ASSUMPTIONS.md`. The agent replaced the REST routes and `fetch` code with Zod-validated actions that return errors as values, rewrote the tests, and checked the result in Chrome (through the Claude in Chrome extension): add, complete while the wand was running, AI steps, reload persistence, and delete.

Problems the agent hit and fixed along the way:

- An npm optional-dependency bug broke Vitest's native binding; a clean reinstall fixed it.
- `npm ci` inside the `node:22` image tried to compile `better-sqlite3` from source (no Python available), even though the package ships prebuilt binaries. The fix was `npm ci --ignore-scripts`, after checking that no dependency needs an install script.
- Next's docs note that synchronous `better-sqlite3` queries would run at build time during prerendering, so the page calls `connection()` to render per request.

## Prompts

These are the main prompts I gave the agent (lightly trimmed):

> ive got an assignment I need to complete for the hiring at agora. here is the task, lets go through it: *[assignment text pasted]*

> Well the instructions say data needs to persist when you navigate and return. I think this could be done with local storage, but maybe thats not what they are looking for? What do you think

> Ok, ive installed docker. Lets go with the middle option. I think I also want to use next js since thats what they use at agora, unless you can think of any reason not to

> where is the sqllite server?

> lets use gemini instead of claude for the ai wand

> i dont like how the ToDoApp component is so large. lets move the icons to an icons file in components. Same with todo item. I also think . we could move the api action functions to an actions folder and mark that index file as use server, what do you think

*(After the agent explained the trade-offs, I chose "Everything as actions".)*

## AI inside the application

The magic wand feature uses Google Gemini at runtime (`src/lib/ai.ts`): the `@google/genai` SDK with a JSON response schema generated from a Zod schema, so the response is always `{ steps: string[] }`, validated again with Zod. It uses a low thinking level for fast, cheap answers. See the README for details.

## My review

<!-- TODO: in your own words, note what you reviewed, changed, or tested by hand. -->
