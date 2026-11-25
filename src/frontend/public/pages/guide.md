# Admin guide

This guide covers everything the administrator of a Vebvy wiki can do: signing in,
creating and editing pages, renaming, deleting, account settings, configuration,
and working with the content repository directly.

> [!NOTE]
> Reading a Vebvy wiki never touches the backend — pages are fetched straight from
> the Git host. The backend is only needed for signing in and making changes. When
> it is offline, the wiki stays readable, but the editing controls are hidden.

## How content is stored

- Every page is a plain Markdown file **without an extension** in the content
  repository. The page `guide/install` is the file `guide/install`; the site's home
  page is the file `index`.
- `index.json` in the repository root lists all registered pages
  (`{"guide/install": true}`). The backend maintains it automatically on every
  save, rename, and delete.
- Every change is published as a Git commit, so the full history is always
  available and any edit can be reverted with regular Git tools.
- URLs starting with `/-/` are reserved for built-in pages (page index, editor,
  authentication, settings, docs). Do not create wiki pages whose names start
  with `-`.

> [!WARNING]
> `index.json` and `.git` are internal. The management API refuses to write,
> rename, or delete them.

## First run: becoming the admin

Vebvy uses a single-admin model: the account is created once, confirmed by a
one-time code delivered through a Telegram bot.

1. Open your bot in Telegram and send it any message. The **first chat that writes
   to the bot** becomes the admin chat. The account must have a Telegram username.
2. On the site, go to `/-/auth/sign-up`.
3. Enter your email and press **Send code**. The code arrives in the admin chat.
   The bot's **Get code** button resends it while it is valid (10 minutes).
4. Enter the code, choose a password (minimum 6 characters), and submit.

After the first account exists, registration closes. Sign in at `/-/auth/sign-in`.

> [!WARNING]
> Do the bot step immediately after the first backend start: until the admin chat
> is registered, anyone who messages the bot first can claim it.

> [!NOTE]
> Codes are single-use and live for 10 minutes. Requesting a new code invalidates
> the previous one.

## The admin interface

Once you are signed in and the backend is reachable, you get:

- **Sidebar** — Home, Index (the tree of all pages), Create, Settings.
- **Header** — theme toggle (light / dark / system), the page actions menu,
  and the sign in / sign out button.
- **Page actions menu** — Copy link, Edit, Rename, Delete, Create.

The **Index** page (`/-/index`) shows every registered page grouped alphabetically.
Folders can be expanded; a page that also has sub-pages is shown as a link with an
expand arrow next to it.

## Creating and editing pages

### Create a new page

1. Click **Create** in the sidebar (or use the page actions menu). You land on `/-/edit`.
2. Type the page name in the file name field. To place a page in a folder, include
   the path in the name, e.g. `guide/install` — folders are created automatically.
3. Write the content and press **Save**.

### Edit an existing page

Open the page, then choose **Edit** in the page actions menu. The editor opens at
`/-/edit?page=<path>` with the current content loaded.

### The editor

- **Preview** — toggle between the Monaco editor and a live rendered preview.
- **Search** (`Ctrl+F`) and **Replace** (`Ctrl+H`) — built-in Monaco actions.
- The file name field can also be changed to save the page under a new name.
- Syntax reference: see the **MD Syntax** docs page (GFM, alerts, KaTeX math,
  syntax highlighting, raw HTML).

### What happens on save

The backend writes the file, updates `index.json`, creates a commit, and pushes it
to the Git host. If any step fails (for example, the push is rejected), you get an
error banner and nothing is silently lost.

> [!NOTE]
> Saves larger than `UPLOAD_LIMIT` are rejected. Check the current limit with
> `GET /info/upload-limit` (value in bytes).

> [!TIP]
> Leaving the editor with unsaved changes triggers a browser confirmation. There
> is no autosave — press Save before navigating away.

## Images

Pages are Markdown, so images are referenced by URL (use other repo!!!):

```markdown
![Diagram](https://codeberg.org/<owner>/<repo>/raw/branch/main/img/diagram.png)
```

You can store images in the content repository itself and link to them via its raw
URL, or use any external URL. Clicking an image in a page opens it in a lightbox.

## Renaming and moving pages

1. Open the page, then choose **Rename** in the page actions menu.
2. Enter the new full path (e.g. `guide/setup`) and press **Continue**.

The file is moved, `index.json` is updated, and the change is committed. Renaming a
folder moves all of its child pages in the index as well. If the target path already
exists, the rename is rejected instead of overwriting it.

## Deleting pages

1. Open the page, then choose **Delete** in the page actions menu.
2. Confirm in the dialog.

The file and its index entry are removed and the deletion is committed. The content
is **not gone forever** — it stays in the Git history and can be restored with
`git revert` or by checking out an older revision.

> [!NOTE]
> Deleting the home page removes the `index` file. The wiki will show a 404 at `/`
> until you create a new home page.

## Account settings

Go to `/-/settings` (sidebar **Settings**) to:

- view your email and registration date;
- **change your password** — enter the current password and the new one
  (minimum 6 characters, repeated);
- **log out**.

### Forgot your password?

Use `/-/auth/reset`: enter your email, press **Send code**, then submit the code
from Telegram together with the new password. After a successful reset, sign in
again at `/-/auth/sign-in`.

> [!NOTE]
> Session cookies are `Secure`, so the backend must be served over HTTPS (directly
> via `CERT`/`KEY` or behind a TLS-terminating reverse proxy). If you are signed out
> unexpectedly, just sign in again.

## Editing the content repository by hand

You can bypass the web editor entirely — the storage is just a Git repository:

```bash
git clone https://codeberg.org/<owner>/<repo>.git
cd <repo>
mkdir -p guide
printf '# Install\n\nSteps…\n' > guide/install
```

Register the new page in `index.json`:

```json
{
  "index": true,
  "guide/install": true
}
```

Then commit and push:

```bash
git add guide/install index.json
git commit -m "Add guide/install"
git push
```

> [!IMPORTANT]
> The backend clones/pulls the content repository on startup. After pushing changes
> by hand, restart the backend so its local clone is up to date before you edit
> through the web UI again — otherwise pushes may be rejected as non-fast-forward.

Rules for hand edits:

- register every new page in `index.json`, or it will not appear in the Index;
- do not create pages under names starting with `-` (reserved `/-/` URLs);
- never delete or rewrite `.git`;
- keep `index.json` valid JSON — a broken index prevents the backend from starting.

## Configuration reference

### Backend (`src/.env`)

The backend loads `../.env` relative to its working directory, so run it from
`src/core`.

| Variable | Required | Description |
| --- | --- | --- |
| `HOST` | yes | Listen address, e.g. `:6060` or `127.0.0.1:6060`. |
| `FRONTEND` | yes | Exact frontend origin (`scheme://host[:port]`, no trailing slash). Used for CORS and origin checks. |
| `GIT_REPO_URL` | yes | Clone URL of the content repo; must be readable without auth. |
| `GIT_REPO_TOKEN` | yes | Token with **write** access, used to push commits. |
| `TELEGRAM_BOT_TOKEN` | yes | Bot that delivers one-time codes. |
| `UPLOAD_LIMIT` | yes | Maximum page size in bytes. |
| `GIT_REPO_PATH` | no | Local clone directory. Default `./data`. |
| `CERT`, `KEY` | no | TLS certificate and key. If both are set, the backend serves HTTPS. |

Runtime files created in `src/core` (git-ignored — **back them up**):

| File | Purpose |
| --- | --- |
| `.main.db` | SQLite database with the admin account. |
| `.SECRET_KEY` | Key used to sign session cookies. Deleting it signs everyone out. |
| `.TG_CHAT_ID` | The Telegram chat registered as admin. |

### Frontend (`src/frontend/src/config.ts`)

Settings are compiled into the bundle — **rebuild after changing them**.

| Constant | Description |
| --- | --- |
| `BACKEND_BASE_URL` | Backend URL, no trailing slash. |
| `REPO_BASE_URL` | Raw-file URL prefix of the content repo (pages and `index.json` are fetched from here). |
| `PAGE_TITLE` | Site name shown in the browser tab. |
| `SIDEBAR_ICON_PATH`, `HEADER_ICON_PATH` | Icons under `public/`. |

### Deployment

```bash
# backend
cd src/core
go build -o vebvy ./cmd/vebvy
# run the binary from a directory whose parent contains .env

# frontend
cd src/frontend
npm ci
npm run build   # output goes to dist/
```

Upload `dist/` to any static host. Routing is client-side, so unknown paths must
fall back to `index.html`. Serve the backend over HTTPS.

## Admin API

All management endpoints require a valid session cookie. Non-GET requests must
carry an `Origin` header equal to `FRONTEND`.

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/auth/register` | Create the admin account (once). |
| `POST` | `/auth/login` | Sign in. |
| `GET` | `/auth/logout` | Sign out. |
| `POST` | `/auth/change` | Change password (current + new). |
| `POST` | `/auth/reset` | Reset password with a code. |
| `GET` | `/auth/code` | Send a one-time code to the admin chat. |
| `GET` | `/auth/me` | Current account info. |
| `POST` | `/manage/create?file=…` | Create/update a page. Body: `{"newName": "…", "content": "…"}`. |
| `DELETE` | `/manage/delete?file=…` | Delete a page. |
| `POST` | `/manage/rename?file=…&name=…` | Rename/move a page. |
| `GET` | `/info/upload-limit` | Size limit in bytes. |

Example session:

```bash
# sign in and keep the cookie
curl -c cookies.txt -X POST https://api.example.com/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: https://wiki.example.com" \
  -d '{"email":"admin@example.com","password":"secret"}'

# create or update a page
curl -b cookies.txt -X POST "https://api.example.com/manage/create?file=guide/install" \
  -H "Content-Type: application/json" \
  -H "Origin: https://wiki.example.com" \
  -d '{"newName":"guide/install","content":"# Install\n\nSteps…\n"}'
```

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| "Admin already exists" on sign-up | Registration is closed after the first account. | Use sign-in, or reset the password. |
| Code never arrives | Bot not running, wrong chat, or stale `.TG_CHAT_ID`. | Message the bot from the admin chat; check `TELEGRAM_BOT_TOKEN`. |
| `403 forbidden origin` | `FRONTEND` does not exactly match the site origin. | Set `scheme://host[:port]`, no trailing slash. |
| Save fails with a push error | Token lacks write access, or the remote diverged. | Check the token scope; restart the backend to re-sync the clone. |
| `413` / "too large" on save | Content exceeds `UPLOAD_LIMIT`. | Raise the limit or split the page. |
| Readers see old content | Raw-host / CDN caching. | Hard-refresh; wait for the CDN TTL to expire. |
| Create / Settings / Edit hidden | Backend offline or you are signed out. | Check the backend, sign in again. |
| Signed out unexpectedly | Session expired or `.SECRET_KEY` was rotated. | Sign in again. |
| Auth fails in local dev | `Secure` cookies require HTTPS. | Set `CERT`/`KEY` or use a trusted local TLS proxy. |

## Security checklist

- Give `GIT_REPO_TOKEN` write access to the **content repository only**.
- Never commit `.env`, `.SECRET_KEY`, `.main.db`, or `.TG_CHAT_ID`.
- Back up the runtime files and the content repository.
- Register the Telegram admin chat immediately after the first start.
- Serve the backend over HTTPS in production.
- Remember that raw HTML in pages is rendered as-is: only give repository write
  access to people you trust.