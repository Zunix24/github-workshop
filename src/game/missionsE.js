// Chapter 5 — BRANCHING (deck slides 24-27): branch/switch, merge, conflict,
// rebase. The LearnGitBranching heart of the game.

import { silent, seedCommit, mkCheck } from './helpers.js';

export const missionsE = [
  {
    id: 'm12-branch-gym',
    title: 'Branch Gym',
    chapter: 'Branching',
    deck: 'Slide 24 · Git branch & switch',
    story: [
      'Branches = parallel universes. The deck flow: git branch speed-test,',
      'git switch -c speed-test, hack away, git switch main to come home.',
      'Your gym: list, create, switch, and prove the universes differ.',
    ],
    goal: 'Create branch speed-test, switch to it, commit a tweak, switch back to main.',
    steps: [
      '1. List branches:  git branch  (star = current).',
      '2. Create:  git branch speed-test',
      '3. Switch+verify:  git switch speed-test  then  git branch',
      '4. Tweak:  set speed.txt "turbo"  then  git add speed.txt  and  git commit -m "Turbo tweak"',
      '5. Go home:  git switch main  and  cat speed.txt  (old content — the tweak lives on speed-test!).',
    ],
    hints: ['git switch -c speed-test = create + switch in one move.', 'git checkout -b speed-test does the same (deck uses both spellings).'],
    solution: ['git branch speed-test', 'git switch speed-test', 'set speed.txt "turbo"', 'git add speed.txt', 'git commit -m "Turbo tweak"', 'git switch main'],
    setup(S, ctx) {
      silent(S, ctx, 'git init branch-proj');
      silent(S, ctx, 'cd branch-proj');
      seedCommit(S, ctx, 'Base work', { 'speed.txt': 'normal', 'app.py': 'v1' });
    },
    check: mkCheck([
      { label: 'branch speed-test exists with the Turbo commit', test: (S) => S.repo.branches['speed-test'] && S.repo.commits[S.repo.branches['speed-test']].message === 'Turbo tweak' },
      { label: 'you are back on main', test: (S) => S.repo.head.type === 'branch' && S.repo.head.name === 'main' },
      { label: 'main does NOT contain the turbo tweak', test: (S) => S.repo.commits[S.repo.branches.main].tree['speed.txt'] === 'normal' },
    ]),
  },
  {
    id: 'm13-merge-clean',
    title: 'Merge: Clean & Fast',
    chapter: 'Branching',
    deck: 'Slide 26 · Git merge',
    story: [
      'Merge combines one branch into another via their COMMON BASE.',
      'Two flavours: fast-forward (tip is an ancestor — just slide the pointer)',
      'and true merge (diverged — a new merge commit with TWO parents).',
      'This round: a clean fast-forward. Feel how effortless it is.',
    ],
    goal: 'From main, merge the feature branch (fast-forward) and read the graph.',
    steps: [
      '1. Confirm you are on main:  git branch',
      '2. Merge:  git merge speed-test',
      '3. Watch for the words "Fast-forward".',
      '4. Read the graph:  git log --oneline',
    ],
    hints: ['Run the merge FROM the branch that receives (main).', 'No new commit appears on fast-forward — the pointer just moves.'],
    solution: ['git merge speed-test', 'git log --oneline'],
    setup(S, ctx) {
      silent(S, ctx, 'git init merge-proj');
      silent(S, ctx, 'cd merge-proj');
      seedCommit(S, ctx, 'Base work', { 'app.py': 'v1' });
      silent(S, ctx, 'git branch speed-test');
      silent(S, ctx, 'git switch speed-test');
      seedCommit(S, ctx, 'Turbo tweak', { 'app.py': 'v1', 'speed.txt': 'turbo' });
      silent(S, ctx, 'git switch main');
    },
    check: mkCheck([
      { label: 'main fast-forwarded to the feature tip', test: (S) => S.repo.branches.main === S.repo.branches['speed-test'] },
    ]),
  },
  {
    id: 'm14-merge-conflict',
    title: 'Merge: The Conflict Boss',
    chapter: 'Branching',
    deck: 'Slide 26 · Merge conflicts',
    story: [
      'Both branches edited THE SAME LINE of app.py. Git cannot pick a winner —',
      'it stops and marks the file with <<<<<<< HEAD ... ======= ... >>>>>>>.',
      'Boss fight: open the file, keep the right lines, add, commit.',
    ],
    goal: 'Merge ai-assistant into main, resolve the conflict, conclude the merge.',
    steps: [
      '1. You are on main. Merge:  git merge ai-assistant',
      '2. Read the failure:  git status  (Unmerged paths).',
      '3. Open the battlefield:  cat app.py  (find the <<<<<<< markers).',
      '4. Rewrite cleanly:  set app.py "assistant: v3 united"',
      '5. Mark resolved:  git add app.py',
      '6. Conclude:  git commit -m "Merge ai-assistant"',
      '7. Admire:  git log --oneline  (merge commit, two parents).',
    ],
    hints: [
      'set <file> <text> replaces the WHOLE file — perfect for wiping markers.',
      'Merge finishes only when conflicts = 0 AND you commit.',
    ],
    solution: ['git merge ai-assistant', 'cat app.py', 'set app.py "assistant: v3 united"', 'git add app.py', 'git commit -m "Merge ai-assistant"'],
    setup(S, ctx) {
      silent(S, ctx, 'git init conflict-proj');
      silent(S, ctx, 'cd conflict-proj');
      seedCommit(S, ctx, 'Base assistant', { 'app.py': 'assistant: v1' });
      silent(S, ctx, 'git branch ai-assistant');
      seedCommit(S, ctx, 'Main improves assistant', { 'app.py': 'assistant: v2 main' });
      silent(S, ctx, 'git switch ai-assistant');
      seedCommit(S, ctx, 'Branch improves assistant', { 'app.py': 'assistant: v2 branch' });
      silent(S, ctx, 'git switch main');
    },
    check: mkCheck([
      { label: 'HEAD is a merge commit (two parents)', test: (S) => (S.repo.commits[S.repo.branches.main].parents || []).length === 2 },
      { label: 'app.py has no conflict markers left', test: (S) => !String(S.files.get(`${S.repo.root}/app.py`) || '').includes('<<<<<<<') },
      { label: 'no unresolved conflicts remain', test: (S) => !S.repo.conflicts },
    ]),
  },
];
