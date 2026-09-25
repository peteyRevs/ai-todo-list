# How AI was used

## Tooling

| | |
|---|---|
| **Harness** | [Claude Code](https://claude.com/claude-code) (Anthropic's agentic CLI), run in the terminal on macOS |
| **Model** | Claude Opus 5.5 (`claude-opus-5-5`, 1M context) |
| **Tools the agent used** | Shell (npm, git, Docker, curl), file read/write/edit, Chrome browser automation (Claude in Chrome) for UI checks, the bundled `claude-api` skill (Anthropic SDK reference, used for the first version of the wand), and web fetches of Google's Gemini API docs (current model IDs and structured output) |
| **Reference docs** | The Next.js 16 docs bundled in `node_modules/next/dist/docs`, read by the agent before writing route handlers, `connection()` and `output: "standalone"` config (`create-next-app` adds `AGENTS.md`/`CLAUDE.md` pointing agents there) |

## Prompts/Workflow

1. **Understanding the brief.** I pasted in the assignment and asked the agent to go through it with me. It listed the requirements, what each one implies, and a suggested stack.
2. **Persistence decision.** I pointed out that `localStorage` would probably meet the persistence requirement and asked whether that's what the reviewers were looking for. We discussed the trade-offs and I chose a middle option: store data server-side in SQLite (needed anyway to keep the AI key secret) and note in `ASSUMPTIONS.md` that `localStorage` would also have worked.
3. **Stack decision.** I chose Next.js because it's what Agora uses, and it is my framework of choice.
4. **AI provider.** The wand first used Anthropic Claude, but I already had the Gemini key on hand in a current project. It's also my go-to for non-coding solutions.
5. **Implementation.** The agent scaffolded the app with `create-next-app`, then wrote the data layer, API routes, UI, AI integration, tests, Dockerfile and docs.
6. **Verification.** The agent ran unit and action tests, typecheck, lint, a production build, curl smoke tests against the standalone server, and a Docker Compose run that checked data survives `restart` and `down`/`up`.
7. **Refactor to Server Actions.** I found `TodoApp` too large and asked to split out the icons and `TodoItem`, and to move the server calls into a `"use server"` actions module. The agent replaced the REST routes and `fetch` code with Zod-validated actions that return errors as values, rewrote the tests, and checked the result in Chrome (through the Claude in Chrome extension): add, complete while the wand was running, AI steps, reload persistence, and delete.

## AI inside the application

The magic wand feature uses Google Gemini at runtime (`src/lib/ai.ts`): the `@google/genai` SDK with a JSON response schema generated from a Zod schema, validated again with Zod. It uses a low thinking level for fast, cheap answers.

## My review

Because of the simplicity of this app, the initial architecture prompt was very straightforward. For more complicated tasks, there is more of a back and forth between the agent and me before we create the implementation plan.
I usually do more incremental checks and updates as each task in the feature is completed. For this project I decided to do any refactoring and updates after the agent was done.
