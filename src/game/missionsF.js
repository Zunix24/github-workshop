// Chapter 6 REBASE + Chapter 7 REMOTES & SHARING (deck slides 27-31).

import { silent, seedCommit, mkCheck } from './helpers.js';
import { seedRemote } from '../git/gitJ.js';

export const missionsF = [
  {
    id: 'm15-rebase-linear',
    title: 'Rebase for a Linear History',
    chapter: 'Rebase',
    deck: 'Slide 27 · Git rebase',
    story: [
      'Merge preserved history — with a fork. The deck offers a tidier alternative:',
      'rebase REPLAYS your commits on top of another branch, rewriting their hashes',
      'for a perfectly linear log. Same changes, straighter story.',
      'experiment branched early; main moved on. Rebase experiment onto main.',
    ],
    goal: 'Switch to experiment and rebase it onto main so history is linear (no merge commit).',
    steps: [
      '1. Go to the branch that moves:  git switch experiment',
      '2. Replay its commits on main:  git rebase main',
      '3. Read the straight line:  git log --oneline  (no merge commit!).',
      '4. Prove the trees agree:  git status  and  ls',
    ],
    hints: [
      'git rebase <upstream> runs FROM the branch you want to move, TOWARD the base.',
      'Rebase rewrites hashes — never rebase commits you have already pushed/shared.',
      'Merge = preserve history as-is. Rebase = redraw it linearly. The deck compares both (slide 27).',
    ],
    solution: ['git switch experiment', 'git rebase main', 'git log --oneline'],
    setup(S, ctx) {
      silent(S, ctx, 'git init rebase-proj');
      silent(S, ctx, 'cd rebase-proj');
      seedCommit(S, ctx, 'Base feature work', { 'feature.py': 'v1' });
      silent(S, ctx, 'git branch experiment');
      seedCommit(S, ctx, 'Main adds README', { 'feature.py': 'v1', 'README.md': 'docs' });
      silent(S, ctx, 'git switch experiment');
      seedCommit(S, ctx, 'Experiment speeds up', { 'feature.py': 'v2 FAST' });
      silent(S, ctx, 'git switch main');
    },
    check: mkCheck([
      {
        label: 'experiment now sits directly on top of main',
        test: (S) => {
          const tip = S.repo.branches.experiment;
          return !!tip && (S.repo.commits[tip].parents || [])[0] === S.repo.branches.main;
        },
      },
      {
        label: 'history is linear — no commit has two parents',
        test: (S) => Object.values(S.repo.commits).every((c) => (c.parents || []).length <= 1),
      },
      {
        label: 'experiment still has the fast feature.py',
        test: (S) => {
          const tip = S.repo.branches.experiment;
          return S.repo.commits[tip].tree['feature.py'] === 'v2 FAST';
        },
      },
    ]),
  },
  {
    id: 'm16-first-push',
    title: 'First Push to the Cloud',
    chapter: 'Remotes & Sharing',
    deck: 'Slides 16, 28 · remote add + push',
    story: [
      'Your repo lives only on this machine. Time to give it a home on GitHub.',
      'The deck flow: register the remote URL, then push with -u the FIRST time',
      '(-u links local main to origin/main so future pushes need no arguments).',
    ],
    goal: 'Register remote origin, push main with -u, and verify with git remote -v.',
    steps: [
      '1. Register the home:  git remote add origin https://github.com/you/share-proj.git',
      '2. First push (with tracking):  git push -u origin main',
      '3. Verify the link:  git remote -v',
      '4. Optional:  git status  (shows "tracking origin/main").',
    ],
    hints: [
      'Convention: remote called "origin" = the canonical upstream; URL ends in .git.',
      '-u / --set-upstream remembers the pairing so later you can just run git push.',
      'This game simulates the server: your push really lands in the mission world.',
    ],
    solution: ['git remote add origin https://github.com/you/share-proj.git', 'git push -u origin main', 'git remote -v'],
    setup(S, ctx) {
      silent(S, ctx, 'git init share-proj');
      silent(S, ctx, 'cd share-proj');
      seedCommit(S, ctx, 'Initial commit', { 'README.md': '# share-proj' });
    },
    check: mkCheck([
      { label: 'remote "origin" is registered', test: (S) => !!S.repo.remotes.origin },
      {
        label: 'main is on the remote server',
        test: (S, ctx) => {
          const r = S.repo.remotes.origin;
          const R = r && ctx.remoteStore[r.url];
          return !!R && R.branches.main === S.repo.branches.main;
        },
      },
      { label: 'local main tracks origin/main (upstream set)', test: (S) => S.repo.upstream.main === 'origin/main' },
    ]),
  },
  {
    id: 'm17-golden-rule',
    title: 'The Golden Rule of Pushing',
    chapter: 'Remotes & Sharing',
    deck: 'Slide 28 · pull before push',
    story: [
      'Your teammate Sam pushed to origin WHILE you were coding offline.',
      'You try to push — Git REJECTS it: the remote has commits you lack.',
      'The Golden Rule (deck slide 28): ALWAYS git pull before git push.',
      'Pull = fetch (download) + merge (integrate). Then your new push flies.',
    ],
    goal: 'Hit the rejection, recover with pull, commit your new work, and push successfully.',
    steps: [
      '1. Register the remote:  git remote add origin https://github.com/team/team-sync.git',
      '2. Feel the rejection:  git push origin main  ("fetch first" / rejected).',
      '3. Follow the rule:  git pull  (fast-forwards you — Sam’s tests.py appears).',
      '4. Add your own work:  set app.py "v2 by me + tests ready"  then  git add app.py  and  git commit -m "Polish after pull"',
      '5. Push for real:  git push origin main  (accepted!).',
    ],
    hints: [
      'git pull = git fetch + integration. Here it fast-forwards because you had no new commits.',
      'After step 4 your newest commit sits ON TOP of Sam’s — that is what push ships.',
      'Never use --force to win a rejection argument; you would erase Sam’s work.',
    ],
    solution: [
      'git remote add origin https://github.com/team/team-sync.git',
      'git push origin main',
      'git pull',
      'set app.py "v2 by me + tests ready"',
      'git add app.py',
      'git commit -m "Polish after pull"',
      'git push origin main',
    ],
    setup(S, ctx) {
      silent(S, ctx, 'git init team-sync');
      silent(S, ctx, 'cd team-sync');
      seedCommit(S, ctx, 'My local work', { 'app.py': 'v1 by me' });
      // Simulate a teammate pushing a newer commit to the shared remote.
      const url = 'https://github.com/team/team-sync.git';
      const R = seedRemote(ctx, url);
      R.commits = JSON.parse(JSON.stringify(S.repo.commits));
      const localTip = S.repo.branches.main;
      const base = S.repo.commits[localTip];
      const sha = 'teammate0';
      R.commits[sha] = {
        sha,
        parents: [localTip],
        message: 'Teammate adds tests',
        author: 'Sam',
        email: 'sam@example.com',
        time: new Date(Date.now() + 60000).toISOString(),
        tree: { ...base.tree, 'tests.py': 'assert True' },
      };
      R.branches.main = sha;
    },
    check: mkCheck([
      { label: 'you pulled Sam’s commit (it is in your history)', test: (S) => S.history.some((h) => h.startsWith('git pull')) },
      {
        label: 'Sam’s "Teammate adds tests" commit is in your log',
        test: (S) => Object.values(S.repo.commits).some((c) => c.message === 'Teammate adds tests'),
      },
      {
        label: 'the remote tip is your newest commit (pushed on top of Sam’s)',
        test: (S, ctx) => {
          const r = S.repo.remotes.origin;
          const R = r && ctx.remoteStore[r.url];
          if (!R || R.branches.main !== S.repo.branches.main) return false;
          const tip = R.commits[R.branches.main];
          return !!tip && (tip.parents || [])[0] === 'teammate0';
        },
      },
    ]),
  },
  {
    id: 'm18-clone-workflow',
    title: 'Scenario: Join an Existing Project',
    chapter: 'Remotes & Sharing',
    deck: 'Slide 31 · Scenario 2',
    story: [
      'The deck’s Scenario 2: the repo already exists on GitHub and you must contribute.',
      'git clone copies the ENTIRE history and wires up origin for you — no init needed.',
      'Edit → pull (Golden Rule) → push. The everyday collaboration loop.',
    ],
    goal: 'Clone the repo, update README.md, commit, pull, then push.',
    steps: [
      '1. From home (/):  git clone https://github.com/username/existing-project.git',
      '2. Step inside:  cd existing-project',
      '3. Edit:  set README.md "# existing project — updated by me"',
      '4. Stage + commit:  git add README.md  then  git commit -m "Update README"',
      '5. Golden Rule first:  git pull origin main',
      '6. Publish:  git push origin main',
    ],
    hints: [
      'clone creates the folder, .git, all files, and the origin remote — one command.',
      'Your clone already shares history with the server, so pull is just a sync check here.',
      'push copies your new commit objects up and moves the remote branch pointer.',
    ],
    solution: [
      'git clone https://github.com/username/existing-project.git',
      'cd existing-project',
      'set README.md "# existing project — updated by me"',
      'git add README.md',
      'git commit -m "Update README"',
      'git pull origin main',
      'git push origin main',
    ],
    setup(S, ctx) {
      const url = 'https://github.com/username/existing-project.git';
      const R = seedRemote(ctx, url);
      R.commits.base1 = {
        sha: 'base1',
        parents: [],
        message: 'Initial project import',
        author: 'Alex',
        email: 'alex@example.com',
        time: new Date(Date.now() - 3600000).toISOString(),
        tree: { 'README.md': '# existing project', 'script.py': 'print("hello")' },
      };
      R.branches.main = 'base1';
      R.files = { 'README.md': '# existing project', 'script.py': 'print("hello")' };
    },
    check: mkCheck([
      { label: 'you cloned into /existing-project', test: (S) => !!S.repo && S.repo.root === '/existing-project' },
      { label: 'your clone has its own commit on top of history', test: (S) => Object.keys(S.repo.commits).length === 2 },
      {
        label: 'the remote received your README update',
        test: (S, ctx) => {
          const R = ctx.remoteStore['https://github.com/username/existing-project.git'];
          if (!R || R.branches.main !== S.repo.branches.main) return false;
          const tip = R.commits[R.branches.main];
          return !!tip && String(tip.tree['README.md']).includes('updated by me');
        },
      },
    ]),
  },
  {
    id: 'm19-new-project',
    title: 'Scenario: A Brand-New Project',
    chapter: 'Workflows & GitHub',
    deck: 'Slide 30 · Scenario 1',
    story: [
      'The deck’s Scenario 1 — the full bootstrap sequence for ANY new project:',
      'init → add → commit → remote add → push -u. Memorise this five-beat rhythm;',
      'it is the first thing every new workshop repo needs.',
    ],
    goal: 'Run the complete new-project sequence from an empty directory to a pushed GitHub repo.',
    steps: [
      '1. Create + init:  git init my-app',
      '2. Enter:  cd my-app',
      '3. First file:  echo "# My App" > README.md',
      '4. Stage everything:  git add .',
      '5. Commit:  git commit -m "Initial commit"',
      '6. Register home:  git remote add origin https://github.com/username/my-app.git',
      '7. Publish with tracking:  git push -u origin main',
    ],
    hints: [
      'Order matters: no commits before push — an empty repo has nothing to upload.',
      'git status after every beat tells you exactly where you are in the pipeline.',
      'Same sequence as deck slide 30, and again in Scenario 1 on slide 30.',
    ],
    solution: [
      'git init my-app',
      'cd my-app',
      'echo "# My App" > README.md',
      'git add .',
      'git commit -m "Initial commit"',
      'git remote add origin https://github.com/username/my-app.git',
      'git push -u origin main',
    ],
    setup() {
      // empty home directory — the player performs every step.
    },
    check: mkCheck([
      { label: 'repo created at /my-app', test: (S) => !!S.repo && S.repo.root === '/my-app' },
      { label: 'initial commit exists with your README', test: (S) => Object.values(S.repo.commits).some((c) => c.message === 'Initial commit' && 'README.md' in c.tree) },
      {
        label: 'GitHub has your main branch (pushed)',
        test: (S, ctx) => {
          const r = S.repo.remotes.origin;
          const R = r && ctx.remoteStore[r.url];
          return !!R && R.branches.main === S.repo.branches.main;
        },
      },
      { label: 'main tracks origin/main', test: (S) => S.repo.upstream.main === 'origin/main' },
    ]),
  },
  {
    id: 'm20-github-features',
    title: 'GitHub Power-Ups Quiz',
    chapter: 'Workflows & GitHub',
    deck: 'Slides 35–36 · GitHub Features',
    kind: 'quiz',
    story: [
      'Git tracks history; GitHub layers teamwork on top: repositories, issues,',
      'pull requests, actions, code review. Final exam — 4 questions, no terminal needed.',
    ],
    goal: 'Score 4/4 on the GitHub features quiz to complete the workshop quest.',
    steps: [
      'Use the Quiz panel on the right — one answer per question.',
      'Think: propose changes? track bugs? automate CI/CD? copy a repo to your account?',
    ],
    hints: [
      'Pull requests = review + discuss + merge. Issues = bugs/tasks. Actions = CI/CD.',
      'A fork is your personal copy of someone else’s repo, ready for a PR back.',
    ],
    solution: ['Quiz answers: Pull requests · Issues · GitHub Actions · A personal copy of the repo'],
    questions: [
      {
        q: 'Which GitHub feature lets you propose, discuss and review changes before they land on main?',
        choices: ['Issues', 'Pull requests', 'Releases', 'Wikis'],
        answer: 1,
        why: 'A pull request opens your branch for review, checks and discussion — then merges it.',
      },
      {
        q: 'What do you use to track bugs, feature requests and tasks in a repo?',
        choices: ['Issues', 'Gists', 'Milestones only', 'Commit messages only'],
        answer: 0,
        why: 'Issues are the deck’s tracker for bugs and tasks, linked to commits/PRs.',
      },
      {
        q: 'Which feature automatically builds, tests and deploys your code (CI/CD)?',
        choices: ['GitHub Copilot', 'GitHub Pages', 'GitHub Actions', 'Codespaces'],
        answer: 2,
        why: 'Actions = event-driven workflows: run tests on push, deploy on tag, etc.',
      },
      {
        q: 'Forking a repository creates…',
        choices: [
          'A branch inside the same repo',
          'A personal copy of the repo under your account',
          'A backup on your machine',
          'A new empty repository',
        ],
        answer: 1,
        why: 'A fork is your account’s full copy — clone it, change it, send a pull request back.',
      },
    ],
    check: null,
  },
];



