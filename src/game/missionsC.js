// Chapter 3 — CORE LOOP I (deck slides 14-18): repos, staging, commit anatomy.

import { silent, seedFiles, mkCheck } from './helpers.js';

export const missionsC = [
  {
    id: 'm06-my-first-repo',
    title: 'Birth of a Repo',
    chapter: 'Core Loop',
    deck: 'Slide 15 · Creating Repos',
    story: [
      'A Git repo = a directory with a hidden .git/ database.',
      'Your quest: start a repo called my-project, step inside, and prove .git exists. Hands off its contents!',
    ],
    goal: 'Run git init my-project, cd into it, and confirm a clean git status.',
    steps: [
      '1. Create + initialise:  git init my-project',
      '2. Move inside:  cd my-project',
      '3. Prove it:  git status  (should say "nothing to commit, working tree clean").',
    ],
    hints: ['git init <name> creates the folder AND the repo — two birds.', 'Never edit .git/ by hand.'],
    solution: ['git init my-project', 'cd my-project', 'git status'],
    setup(S, ctx) {
      silent(S, ctx, 'mkdir workshop');
      silent(S, ctx, 'cd workshop');
    },
    check: mkCheck([
      { label: 'a repo exists at ~/workshop/my-project', test: (S) => !!S.repo && S.repo.root === '/workshop/my-project' },
      { label: 'you are inside the repo', test: (S) => S.cwd === '/workshop/my-project' },
    ]),
  },
  {
    id: 'm07-staging-dojo',
    title: 'Staging Dojo',
    chapter: 'Core Loop',
    deck: 'Slide 16 · Staging + remote add',
    story: [
      'Files live in three places: working tree → staging area (index) → committed history.',
      'git add moves work into the staging area. git add . stages EVERYTHING — handy, but know what it grabs.',
    ],
    goal: 'Stage README.md individually, then stage everything else with git add . Register the remote too.',
    steps: [
      '1. Look:  git status  (two untracked files).',
      '2. Stage one file:  git add README.md  then  git status',
      '3. Stage the rest:  git add .  then  git status  (both green).',
      '4. Register where this will live online:  git remote add origin https://github.com/you/my-project.git',
      '5. List remotes:  git remote',
    ],
    hints: ['Untracked (red) → staged (green). git status tells the story each time.', 'The deck pattern: git remote add <name> <url>.'],
    solution: ['git add README.md', 'git add .', 'git remote add origin https://github.com/you/my-project.git'],
    setup(S, ctx) {
      silent(S, ctx, 'git init stage-proj');
      silent(S, ctx, 'cd stage-proj');
      seedFiles(S, { 'README.md': '# my project', 'notes.txt': 'todo: write code' });
    },
    check: mkCheck([
      { label: 'README.md and notes.txt are both staged', test: (S) => S.repo.index['README.md'] !== undefined && S.repo.index['notes.txt'] !== undefined },
      { label: 'remote "origin" is registered', test: (S) => !!S.repo.remotes.origin },
    ]),
  },
  {
    id: 'm08-commit-anatomy',
    title: 'Commit: Metadata, Tree, Blob',
    chapter: 'Core Loop',
    deck: 'Slides 18–19 · Commit + structure',
    story: [
      'A commit has THREE parts: (1) metadata — author, message, time; (2) tree — names/locations like a dictionary; (3) blobs — compressed snapshots of each file.',
      'Time to mint one and read its anatomy with git show.',
    ],
    goal: 'Stage everything, commit with -m, then inspect the commit object.',
    steps: [
      '1.  git status  (see untracked work).',
      '2.  git add .',
      '3.  git commit -m "Adding a README."  — the -m flag skips the editor.',
      '4. Read the object back:  git show HEAD  (metadata on top, diff/blob below).',
      '5. One-line history:  git log --oneline',
    ],
    hints: ['No -m → an editor would open IRL. This game requires -m.', 'Console output looks like: [main abc1234] Adding a README.'],
    solution: ['git add .', 'git commit -m "Adding a README."', 'git show HEAD'],
    setup(S, ctx) {
      silent(S, ctx, 'git init commit-proj');
      silent(S, ctx, 'cd commit-proj');
      seedFiles(S, { 'README.md': '# hello git' });
    },
    check: mkCheck([
      { label: 'exactly one commit exists with your message', test: (S) => Object.keys(S.repo.commits).length === 1 && Object.values(S.repo.commits)[0].message === 'Adding a README.' },
      { label: 'the commit tree contains README.md (blob snapshot)', test: (S) => 'README.md' in Object.values(S.repo.commits)[0].tree },
    ]),
  },
];
