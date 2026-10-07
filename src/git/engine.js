// Tokenizer + dispatcher: shell line -> engine command.

import { cmdInit, cmdConfig } from './gitA.js';
import { cmdStatus, cmdAdd } from './gitB.js';
import { cmdCommit, cmdRevert } from './gitC.js';
import { cmdRestore } from './gitD.js';
import { cmdLog, cmdShow } from './gitE.js';
import { cmdDiff } from './gitF.js';
import { cmdBranch, cmdSwitch, cmdCheckout } from './gitG.js';
import { cmdMerge } from './gitH.js';
import { cmdRebase } from './gitI.js';
import { cmdRemote, cmdClone } from './gitJ.js';
import { cmdFetch, cmdPull } from './gitK.js';
import { cmdPush } from './gitL.js';
import { cmdPwd, cmdLs, cmdCd, cmdMkdir, cmdCat, cmdEcho } from './shell.js';
import { cmdSet, cmdEdit, cmdNano, cmdTouch, cmdRm } from './edit.js';

export function tokenize(line) {
  const tokens = [];
  let cur = '';
  let quote = null;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quote) {
      if (ch === quote) quote = null;
      else cur += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (/\s/.test(ch)) {
      if (cur) {
        tokens.push(cur);
        cur = '';
      }
    } else cur += ch;
  }
  if (cur) tokens.push(cur);
  return tokens;
}

const GIT = {
  init: cmdInit,
  config: cmdConfig,
  status: cmdStatus,
  add: cmdAdd,
  commit: cmdCommit,
  revert: cmdRevert,
  restore: cmdRestore,
  log: cmdLog,
  show: cmdShow,
  diff: cmdDiff,
  branch: cmdBranch,
  switch: cmdSwitch,
  checkout: cmdCheckout,
  merge: cmdMerge,
  rebase: cmdRebase,
  remote: cmdRemote,
  clone: cmdClone,
  fetch: cmdFetch,
  pull: cmdPull,
  push: cmdPush,
};

const SH = {
  pwd: cmdPwd,
  ls: cmdLs,
  cd: cmdCd,
  mkdir: cmdMkdir,
  cat: cmdCat,
  set: cmdSet,
  edit: cmdEdit,
  nano: cmdNano,
  touch: cmdTouch,
  rm: cmdRm,
};

export function runLine(S, line, ctx, extra) {
  const out = [];
  const push = (text, cls) => out.push({ text, cls: cls || 'out' });
  const record = extra && extra.record !== false;
  const tokens = tokenize(line);
  if (!tokens.length) return out;
  if (record) {
    S.history.push(line);
    if (extra && extra.onHistory) extra.onHistory(line);
  }
  // echo needs raw args for > redirection
  const [cmd, ...args] = tokens;
  if (cmd === 'echo') {
    cmdEcho(S, args, ctx, out, args);
    return out;
  }
  if (cmd === 'help' || cmd === '?') {
    cmdHelp(S, args, ctx, out);
    return out;
  }
  if (cmd === 'clear') {
    if (extra && extra.onClear) extra.onClear();
    return out;
  }
  if (cmd === 'git') {
    const [sub, ...rest] = args;
    if (!sub) {
      push('usage: git <command>  (try: git status)', 'err');
      return out;
    }
    const fn = GIT[sub];
    if (!fn) {
      push(`git: '${sub}' is not a git command in this game. Try: help`, 'err');
      return out;
    }
    try {
      fn(S, rest, ctx, out);
    } catch (e) {
      push(e && e.message ? e.message : String(e), 'err');
    }
    return out;
  }
  if (SH[cmd]) {
    try {
      SH[cmd](S, args, ctx, out, args);
    } catch (e) {
      push(e && e.message ? e.message : String(e), 'err');
    }
    return out;
  }
  push(`${cmd}: command not found — try: help`, 'err');
  return out;
}

export function cmdHelp(S, args, ctx, out) {
  const rows = [
    ['Shell', 'pwd · ls · cd · mkdir · cat · echo hi > file · set · edit · nano · touch · rm'],
    ['Setup', 'git init [dir] · git clone <url> [dir] · git config --global user.name/email · git remote add <n> <url>'],
    ['Daily loop', 'git status · git add <file> | git add . · git commit -m "msg"'],
    ['Inspect', 'git log [-N] [--since ...] [--oneline] [file] · git show <rev> · git diff [--staged] [<a> <b>]'],
    ['Undo', 'git revert [--no-edit|-n] <rev> · git restore [--staged|--source=<rev>] <file>'],
    ['Branches', 'git branch [name] · git switch [-c] <branch> · git checkout [-b] <branch>'],
    ['Integrate', 'git merge <branch> · git rebase <upstream> [--continue/--skip/--abort]'],
    ['Share', 'git fetch [remote] · git pull [remote] [branch] · git push [remote] [branch] (-u first time)'],
    ['Game', 'hint · solution · missions · cheat · graph · reset · help'],
  ];
  out.push({ text: 'GitQuest commands (this world mirrors the workshop deck):', cls: 'ok' });
  for (const [k, v] of rows) out.push({ text: `  ${k.padEnd(9)} ${v}`, cls: 'out' });
}
