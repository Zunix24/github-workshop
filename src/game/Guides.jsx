// In-game cheat sheet (deck slide 32) + install & container guide (deck slide 12).

const CHEATS = [
  ['Setup', ['git init [dir]', 'git clone <url>', 'git config --global user.name "You"', 'git config --global user.email you@x.com']],
  ['Daily loop', ['git status', 'git add <file> / git add .', 'git commit -m "message"']],
  ['Inspect', ['git log [--oneline] [-N] [file]', 'git show <rev>', 'git diff [--staged] [<a> <b>]']],
  ['Undo', ['git restore <file>', 'git restore --staged <file>', 'git revert [--no-edit] <rev>']],
  ['Branches', ['git branch <name>', 'git switch <name> / git switch -c <name>', 'git checkout -b <name>']],
  ['Integrate', ['git merge <branch>', 'git rebase <upstream>', 'git rebase --continue / --abort / --skip']],
  ['Remotes', ['git remote add origin <url>', 'git fetch', 'git pull  (fetch + merge)', 'git push -u origin main']],
  ['Game', ['hint', 'solution', 'missions', 'cheat', 'graph', 'reset', 'clear', 'help']],
];

export function CheatSheet() {
  return (
    <div className="cheat">
      {CHEATS.map(([group, items]) => (
        <div className="cheat-group" key={group}>
          <h4>{group}</h4>
          <ul>
            {items.map((it) => (
              <li key={it}>
                <code>{it}</code>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function InstallGuide() {
  return (
    <div className="guide">
      <h4>1 · Install real Git (deck slide 12)</h4>
      <ul>
        <li>
          <strong>Windows:</strong> <code>winget install --id Git.Git -e --source winget</code> (or installer from git-scm.com)
        </li>
        <li>
          <strong>Debian/Ubuntu:</strong> <code>sudo add-apt-repository ppa:git-core/ppa &amp;&amp; sudo apt update &amp;&amp; sudo apt install git</code>
        </li>
        <li>
          <strong>Fedora:</strong> <code>sudo dnf install git</code>
        </li>
        <li>
          <strong>macOS:</strong> <code>xcode-select --install</code>
        </li>
        <li>Then identify yourself: git config --global user.name / user.email (mission m05).</li>
      </ul>

      <h4>2 · Run GitQuest from source</h4>
      <pre>{`npm install
npm run dev        # http://localhost:5173
npm run build      # production bundle in dist/
npm run preview    # serve the production build`}</pre>

      <h4>3 · Run GitQuest in a container (Docker)</h4>
      <p>The repo ships a Dockerfile (multi-stage: build with Node, serve with nginx):</p>
      <pre>{`# build the image
docker build -t gitquest .

# run it — open http://localhost:8080
docker run --rm -p 8080:80 gitquest

# or with docker compose
docker compose up --build`}</pre>
      <p>
        No Node needed on the host — only Docker itself. The container serves the built static app on port 80
        (mapped to 8080). See README.md for details.
      </p>

      <h4>4 · Play with real git inside a container (optional)</h4>
      <p>
        Spin up a throwaway shell and install git in it: <code>docker run --rm -it alpine:latest sh</code> then{' '}
        <code>apk add git &amp;&amp; git --version</code>.
      </p>
    </div>
  );
}
