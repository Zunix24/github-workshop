# ⚔️ GitQuest — the GitHub workshop as a game

An interactive, LearnGitBranching-style game that teaches Git **slide-by-slide along the
workshop deck**: why Git exists, setup & config, the staging/commit loop, time travel
(log/diff/revert/restore), branching & merge conflicts, rebase, remotes (pull/push golden
rule), both deck workflow scenarios, and a GitHub-features finale.

Everything runs in the browser against a **simulated git engine** written for this project
(`src/git/`): a virtual filesystem, commits with real SHA/ancestry semantics, three-way
merge with conflict markers, rebase replay, and a remote-server store that clone/pull/push
talk to. No real repository on your machine is ever touched.

## How to play

1. Pick a mission from the left sidebar (chapters follow the deck order).
2. Read the story, goal and step-by-step instructions in the briefing panel.
3. Type commands into the terminal (`git status`, `git add .`, `git commit -m "msg"` …).
4. Objectives tick off live in the right panel; the Graph tab visualises commits/branches.
5. Stuck? Use `hint` (cycles), `solution` (reveals), `reset` (restart mission),
   `missions` (list), `cheat` (cheat sheet), `graph`, `guide`, `clear`, `help`.

Progress is saved in your browser (localStorage).

### Game commands

| Command | Effect |
| --- | --- |
| `help` | list shell + git commands supported by the simulation |
| `hint` / `solution` | reveal the next hint / full solution |
| `missions` | list all missions with completion state |
| `cheat` | open the deck slide-32 cheat sheet |
| `graph` | open the commit graph tab |
| `done` | run the objective checks now |
| `reset` / `next` | restart mission / jump to next completed-unlocked mission |
| `guide` | open the install & container guide |

## Missions (mapped to the deck)

1. **Why Git** — broken optimisation, two-hands clash, yesterday's build (slides 4–7)
2. **Origins & Setup** — history quiz, install & `git config` identity (slides 9–13)
3. **Core Loop** — `init`, staging area, commit anatomy (`git show`) (slides 14–19)
4. **Time Travel** — log filters, diff lab, revert vs restore (slides 21–23)
5. **Branching** — branch/switch, fast-forward merge, **conflict boss fight** (slides 24–26)
6. **Rebase** — linear history replay (slide 27)
7. **Remotes & Sharing** — first push `-u`, the Golden Rule (pull before push), clone & contribute (slides 28–31)
8. **Workflows & GitHub** — new-project bootstrap sequence, GitHub features quiz (slides 30, 35–36)

## Run locally (Node 24+)

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production bundle → dist/
npm run preview    # serve the production bundle
npm run lint       # oxlint
```

## Run in a container (Docker)

The repo ships a multi-stage `Dockerfile` (Node build → nginx static serve) and a
`docker-compose.yml`. **Only Docker itself is required on the host — no Node.**

```bash
# build the image
docker build -t gitquest .

# run it — open http://localhost:8080
docker run --rm -p 8080:80 gitquest

# or, with compose
docker compose up --build
```

To stop: `Ctrl+C` (compose) or `docker stop <container>`; the image persists, so the next
`docker run`/`docker compose up` starts instantly.

### Install real Git (deck slide 12)

- **Windows:** `winget install --id Git.Git -e --source winget` (or the git-scm.com installer)
- **Debian/Ubuntu:** `sudo add-apt-repository ppa:git-core/ppa && sudo apt update && sudo apt install git`
- **Fedora:** `sudo dnf install git`
- **macOS:** `xcode-select --install`
- Then configure your identity: `git config --global user.name "Your Name"` and
  `git config --global user.email "you@example.com"` (this is mission **m05** in the game).

The same instructions are available in-game via the **🐳 Install / Container** button.

## Project layout

```
src/git/     simulated git engine (state, commits, diff, merge, rebase, remotes, shell)
src/game/    mission chapters (missionsA–F), registry, UI components, styles
src/App.jsx  renders the game screen
Dockerfile   multi-stage: node:24-alpine build → nginx:alpine serve
docker-compose.yml  one-command container run on :8080
```

## Notes & limitations

- The simulation covers the commands used by the workshop; exotic flags may be ignored or
  rejected (`git: '<x>' is not a git command in this game`).
- Remotes live in an in-memory server store per mission — realistic, but not a real network.
- No Docker daemon on the build machine? Validate with `npm run build`; the Dockerfile is
  provided for machines that have Docker.
