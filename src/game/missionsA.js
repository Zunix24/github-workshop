// Chapter 1 — WHY GIT (deck slides 4-8). Three playable disaster scenarios:
// a broken optimisation, a teamwork clash, and a deadline with broken code.

import { silent, seedFiles, seedCommit, mkCheck } from './helpers.js';

export const missionsA = [
  {
    id: 'm01-broken-code',
    title: 'The Broken Optimisation',
    chapter: 'Why Git',
    deck: 'Slides 4–5 · Scenario 1',
    story: [
      'You spent weeks building app.py and it finally works.',
      'Then you tried "just a small optimisation"... and everything broke.',
      'Without version control you would be digging through project_final_REAL.py right now.',
      'Luckily this project already uses Git. The last working version is safe in history.',
    ],
    goal: 'Inspect the damage, then restore app.py to its last committed (working) version.',
    steps: [
      '1. Look around:  ls  and  cat app.py  (see the breakage).',
      '2. Check Git status:  git status  — is the file modified but unstaged?',
      '3. Compare with the safe version:  git diff app.py',
      '4. Throw away the broken edit:  git restore app.py',
      '5. Verify:  cat app.py  and  git status  (working tree clean).',
    ],
    hints: [
      'git diff shows working-tree vs last commit. Red lines are your broken edit.',
      'git restore <file> discards unstaged changes — the commit stays untouched.',
      'Never touch .git/ — Git is the time machine, your files are the passengers.',
    ],
    solution: ['git status', 'git diff app.py', 'git restore app.py', 'git status'],
    setup(S, ctx) {
      silent(S, ctx, 'git init rescue-proj');
      silent(S, ctx, 'cd rescue-proj');
      seedCommit(S, ctx, 'Working version with slow algorithm', {
        'app.py': 'def solve(): return 42  # slow but CORRECT',
      });
      seedFiles(S, { 'app.py': 'def solve(): return "boom"  # optimised... broken' });
    },
    check: mkCheck([
      { label: 'app.py matches the committed working version', test: (S) => S.files.get(`${S.repo.root}/app.py`) === 'def solve(): return 42  # slow but CORRECT' },
      { label: 'working tree is clean (nothing to commit)', test: (S) => S.history.length >= 0 && !S.repo.conflicts },
    ]),
  },
  {
    id: 'm02-team-clash',
    title: 'Two Hands, One Project',
    chapter: 'Why Git',
    deck: 'Slide 6 · Scenario 2',
    story: [
      'You own Part A of the project, your teammate owns Part B.',
      'Merging by hand-copying code overwrote work last time. Chaos.',
      'The Git way: each of you works on a branch, then merges. Nothing gets silently lost.',
    ],
    goal: 'Create a branch for Part B, commit it there, switch back to main and merge it in.',
    steps: [
      '1. See where you are:  git branch  and  git status',
      '2. Create the teammate branch:  git branch part-b',
      '3. Switch to it:  git switch part-b',
      '4. Add the Part B file:  echo "part B done" > part_b.py  then  git add part_b.py  and  git commit -m "Add part B"',
      '5. Switch back:  git switch main  and merge:  git merge part-b',
      '6. Confirm both parts exist:  ls',
    ],
    hints: [
      'A branch is just a movable pointer to a commit — cheap and instant.',
      'git switch -c part-b creates AND switches in one step (like checkout -b).',
      'Merge from the branch that should RECEIVE the changes (main).',
    ],
    solution: ['git branch part-b', 'git switch part-b', 'echo "part B done" > part_b.py', 'git add part_b.py', 'git commit -m "Add part B"', 'git switch main', 'git merge part-b'],
    setup(S, ctx) {
      silent(S, ctx, 'git init team-proj');
      silent(S, ctx, 'cd team-proj');
      seedCommit(S, ctx, 'Add part A', { 'part_a.py': 'part A done' });
    },
    check: mkCheck([
      { label: 'branch part-b exists', test: (S) => 'part-b' in S.repo.branches },
      { label: 'main now contains both part_a.py and part_b.py', test: (S) => { const t = S.repo.commits[S.repo.branches.main].tree; return 'part_a.py' in t && 'part_b.py' in t; } },
      { label: 'you are back on main', test: (S) => S.repo.head.type === 'branch' && S.repo.head.name === 'main' },
    ]),
  },
  {
    id: 'm03-yesterday',
    title: "Yesterday's Build, Due in 2 Hours",
    chapter: 'Why Git',
    deck: 'Slide 7 · Scenario 3',
    story: [
      "Yesterday's version worked great. Last night's 'improvements' do not.",
      'Deadline in 2 hours — you need yesterday’s working version NOW.',
      'No history, no backups? Stuck. WITH Git: just look at the log and revert.',
    ],
    goal: 'Find the broken commit in the log, then revert it (history stays intact).',
    steps: [
      '1. Read the history:  git log  (or  git log --oneline)',
      '2. See what the last commit broke:  git show HEAD',
      '3. Undo it safely:  git revert --no-edit HEAD',
      '4. Verify the fix:  cat app.py  and  git log --oneline',
    ],
    hints: [
      'git revert does NOT delete history — it adds a NEW commit that undoes the old one.',
      "--no-edit accepts the default message so no editor opens.",
      'After reverting, app.py should say v1 STABLE again.',
    ],
    solution: ['git log --oneline', 'git show HEAD', 'git revert --no-edit HEAD', 'cat app.py'],
    setup(S, ctx) {
      silent(S, ctx, 'git init deadline-proj');
      silent(S, ctx, 'cd deadline-proj');
      seedCommit(S, ctx, 'Yesterday stable release', { 'app.py': 'version = "v1 STABLE"' });
      seedCommit(S, ctx, 'Late-night improvements', { 'app.py': 'version = "v2 BROKEN"' });
    },
    check: mkCheck([
      { label: 'HEAD is a Revert commit', test: (S) => S.repo.commits[S.repo.branches.main].message.startsWith('Revert') },
      { label: 'app.py is back to v1 STABLE', test: (S) => S.files.get(`${S.repo.root}/app.py`) === 'version = "v1 STABLE"' },
      { label: 'history still has 3 commits (nothing rewritten)', test: (S) => Object.keys(S.repo.commits).length === 3 },
    ]),
  },
];
