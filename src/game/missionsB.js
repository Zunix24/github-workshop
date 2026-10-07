// Chapter 2 — ORIGINS & SETUP (deck slides 9-13): history quiz, install, config.

import { silent, mkCheck } from './helpers.js';

export const missionsB = [
  {
    id: 'm04-history-quiz',
    title: 'Know Your Roots',
    chapter: 'Origins & Setup',
    deck: 'Slides 9–10 · Brief History',
    kind: 'quiz',
    story: [
      'Before touching the keyboard: who built this time machine, and why?',
      'Answer 3 questions from the workshop history slides.',
    ],
    goal: 'Score 3/3 on the history quiz.',
    steps: [
      'Use the Quiz panel on the right — pick one answer per question.',
      'Q1 is about the creator of Git. Q2 about the year. Q3 about GitHub.',
    ],
    hints: ['Linus Torvalds, 2005, Linux kernel: speed + distributed non-linear work.', 'GitHub: 2008, Preston-Werner + Wanstrath + Hyett.'],
    solution: ['Quiz answers: Linus Torvalds · 2005 · Tom Preston-Werner, Chris Wanstrath & PJ Hyett'],
    questions: [
      {
        q: 'Who created Git in 2005?',
        choices: ['Linus Torvalds', 'Guido van Rossum', 'Brendan Eich', 'Tom Preston-Werner'],
        answer: 0,
        why: 'Linus built Git for the Linux kernel — speed, reliability, distributed non-linear workflows.',
      },
      {
        q: 'Why was Git created?',
        choices: ['To host a social network', 'To manage the Linux kernel with speed + distributed workflows', 'To replace Python', 'To sell licences'],
        answer: 1,
        why: 'Deck slide 10: chosen for speed, reliability, strong support for distributed non-linear work.',
      },
      {
        q: 'GitHub was founded in 2008 by…',
        choices: ['Linus Torvalds alone', 'Microsoft', 'Tom Preston-Werner, Chris Wanstrath & PJ Hyett', 'Google'],
        answer: 2,
        why: 'GitHub added social, collaboration and CI features on top of Git hosting.',
      },
    ],
    check: null,
  },
  {
    id: 'm05-install-config',
    title: 'Forge Your Identity',
    chapter: 'Origins & Setup',
    deck: 'Slides 12–13 · Install & Config',
    story: [
      'Fresh machine. The deck says: install from git-scm.com/install, or on Windows:',
      '  winget install --id Git.Git -e --source winget',
      'On Debian/Ubuntu: add the git-core PPA; Fedora: dnf install git.',
      'Install done (pretend the spinner finished). Now Git needs to know WHO you are — every commit stamps author + email.',
    ],
    goal: 'Configure your identity (name + email) and verify it.',
    steps: [
      '1. Set your name:  git config --global user.name "Your Name"',
      '2. Set your email:  git config --global user.email "you@example.com"',
      '3. Store credentials so PAT login is remembered:  git config --global credential.helper store',
      '4. Verify:  git config --list',
    ],
    hints: [
      'Use YOUR OWN name/email — the grader accepts anything non-default.',
      'The deck: GitHub asks username + PAT as password; Option B stores it to skip repeats.',
    ],
    solution: ['git config --global user.name "Ada Lovelace"', 'git config --global user.email "ada@example.com"', 'git config --global credential.helper store', 'git config --list'],
    setup(S, ctx) {
      silent(S, ctx, 'git init identity-proj');
      silent(S, ctx, 'cd identity-proj');
    },
    check: mkCheck([
      { label: 'user.name is set (not the default)', test: (S) => S.repo.user.name && S.repo.user.name !== 'GitQuest Player' },
      { label: 'user.email looks like an email', test: (S) => /.+@.+\..+/.test(S.repo.user.email || '') },
    ]),
  },
];
