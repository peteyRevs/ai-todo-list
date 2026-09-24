# Assumptions

## Persistence

- **The list is stored on the server in SQLite, not in the browser.** The requirement is that the list survives the user navigating away and coming back, on a single device. Browser `localStorage` would meet that on its own. I chose server storage anyway because:
  - the magic wand needs a server to keep the AI API key secret, so there is a backend either way, and storing the list there costs little extra;
  - it survives things `localStorage` doesn't, such as clearing site data, private windows, or opening the app in a different browser on the same machine;
  - "deployable via Docker" then means a real service with its data on a volume.
- The database lives on a Docker named volume, so the list survives container restarts and re-creation (`docker compose down`/`up`). `docker compose down -v` deletes it on purpose.
- Only one browser tab at a time is expected. Multiple open tabs don't sync live, but a refresh always shows the latest data.

## To-do behaviour

- Items can be marked **complete** and **uncompleted** again. This isn't listed as a requirement, but sorting completed items to the bottom only makes sense if they can be completed.
- **Ordering:** open items are shown oldest first (the order they were added). Completed items sit below them, most recently completed first. Unchecking an item moves it back into the open section in its original position.
- Titles are trimmed, must not be empty, and are limited to 200 characters.
- Editing an item's text wasn't asked for, so it isn't supported. To change an item, delete it and add it again.
- Deleting is immediate, with no confirmation dialog or undo, to keep the interaction quick. Nothing else is lost when an item is deleted.
- The list isn't paginated, filtered or grouped. A personal list is assumed to stay small (hundreds of items at most).

## Users, security and deployment

- One user on one device: no accounts, authentication or multi-tenancy, as stated.
- The app is assumed to run locally or on a trusted network. Since there is no auth, it shouldn't be exposed to the public internet as-is: anyone who can reach it can read and change the list and use up AI credits. Rate limiting and CSRF protection are out of scope for the same reason.
- The app runs as a single container on port 3000. No reverse proxy, TLS or external database is included.

## Magic wand (AI)

- The AI provider is **Google Gemini**, called from the server through the official `@google/genai` SDK. The model defaults to `gemini-3.8-flash` (fast and inexpensive, which suits short step lists) and can be changed with `GEMINI_MODEL`.
- The API key is optional. Without it, the rest of the app works normally and the wand button is disabled with a tooltip explaining why.
- Only the item's title is sent to the model. No other items or personal data are included.
- The model returns 3–7 short steps as plain text. Steps are guidance only: they are not separate checkable sub-tasks and don't affect sorting.
- Generated steps are saved on the item and shown again instantly the next time. They are only regenerated when the user clicks **Regenerate**, which avoids repeat costs and keeps answers stable. Steps are kept when an item is completed and removed when it is deleted.
- If the model blocks the request for safety reasons or the provider fails, the user sees a short error message and the item is unchanged.
