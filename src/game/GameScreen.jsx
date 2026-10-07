import { useEffect, useRef, useState } from 'react';
import Terminal from './Terminal.jsx';
import { MissionBrief, ChecksPanel, QuizPanel, GraphPanel, Modal } from './Panels.jsx';
import { CheatSheet, InstallGuide } from './Guides.jsx';
import { MISSIONS, CHAPTERS, nextMission, isUnlocked, loadProgress, saveProgress } from './index.js';
import { freshGame } from './helpers.js';
import { runLine, tokenize } from '../git/engine.js';
import './game.css';

function promptFor(S) {
  const cwd = S.cwd === '/' ? '~' : `~${S.cwd}`;
  let head = '';
  if (S.repo && S.repo.head.type === 'branch') head = `(${S.repo.head.name}) `;
  else if (S.repo) head = '(detached) ';
  return `${head}${cwd} $`;
}

function makeLogs(m) {
  return [
    { cls: 'sys', text: `━━━━━  MISSION: ${m.title}  ·  ${m.chapter}  ━━━━━` },
    { cls: 'dim', text: "Type 'help' for commands · 'hint' if stuck · 'graph' for history · 'missions' to jump." },
  ];
}

function initial() {
  const done = loadProgress();
  const mission = MISSIONS.find((m) => !done.includes(m.id)) || MISSIONS[0];
  const engine = freshGame();
  mission.setup(engine.S, engine.ctx);
  return {
    mission,
    engine,
    checks: mission.check ? mission.check(engine.S, engine.ctx) : [],
    logs: makeLogs(mission),
    hintIdx: 0,
    showSolution: false,
    answers: {},
    tab: mission.kind === 'quiz' ? 'quiz' : 'checks',
  };
}

export default function GameScreen() {
  const [st, setSt] = useState(initial);
  const [completed, setCompleted] = useState(() => loadProgress());
  const [modal, setModal] = useState(null); // 'cheat' | 'guide' | null

  const { mission, engine, checks, logs, hintIdx, showSolution, answers, tab } = st;
  const locked = !isUnlocked(mission, completed);
  const inputRef = useRef(null);
  const centerRef = useRef(null);
  const [briefH, setBriefH] = useState(300);

  function focusTerm() {
    if (!locked && inputRef.current) inputRef.current.focus();
  }

  // Always ready to type: refocus after every submit / mission switch / tab change.
  useEffect(() => {
    if (!locked && inputRef.current) inputRef.current.focus();
  }, [st, locked]);

  // Default split: briefing takes 46% of the center column.
  useEffect(() => {
    const el = centerRef.current;
    if (el) setBriefH(Math.max(180, Math.round(el.clientHeight * 0.46)));
  }, []);

  function startDrag(e) {
    e.preventDefault();
    const el = centerRef.current;
    const maxH = el ? Math.max(240, el.clientHeight - 220) : 2400;
    const startY = e.clientY;
    const startH = briefH;
    const onMove = (ev) => {
      setBriefH(Math.min(Math.max(140, startH + (ev.clientY - startY)), maxH));
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      focusTerm();
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  function resetSplit() {
    const el = centerRef.current;
    if (el) setBriefH(Math.round(el.clientHeight * 0.46));
    focusTerm();
  }

  function close() {
    setModal(null);
    focusTerm();
  }

  // Clicking anywhere outside inputs/buttons returns the caret to the terminal.
  function onShellClick(e) {
    if (locked) return;
    if (e.target.closest('button, input, textarea, select, .modal')) return;
    const sel = window.getSelection();
    if (sel && String(sel).trim()) return; // keep text selections intact
    focusTerm();
  }

  function markDone(id) {
    setCompleted((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      saveProgress(next);
      return next;
    });
  }

  function loadMission(m) {
    const eng = freshGame();
    try {
      m.setup(eng.S, eng.ctx);
    } catch (e) {
      console.error('mission setup failed', e);
    }
    setSt({
      mission: m,
      engine: eng,
      checks: m.check ? m.check(eng.S, eng.ctx) : [],
      logs: makeLogs(m),
      hintIdx: 0,
      showSolution: false,
      answers: {},
      tab: m.kind === 'quiz' ? 'quiz' : 'checks',
    });
  }

  // Re-evaluate objectives, announce completion once.
  function evalSt(cur) {
    const m = cur.mission;
    const ck = m.check ? m.check(cur.engine.S, cur.engine.ctx) : [];
    const shellOk = ck.length > 0 && ck.every((c) => c.ok);
    const quizOk = m.kind === 'quiz' && m.questions.every((q, i) => cur.answers[i] === q.answer);
    if ((shellOk || quizOk) && !completed.includes(m.id)) {
      cur.logs = [...cur.logs, { cls: 'win', text: `🎉 MISSION COMPLETE — ${m.title}!` }];
      if (nextMission(m.id)) {
        cur.logs.push({ cls: 'dim', text: "Type 'next' or press the Next mission button." });
      }
      markDone(m.id);
    }
    return { ...cur, checks: ck };
  }

  function submit(line) {
    const cur = st;
    const m = cur.mission;
    const echo = { cls: 'in', prompt: promptFor(cur.engine.S), text: line };
    const [cmd] = tokenize(line);
    cur.engine.S.history.push(line);
    let next = { ...cur, logs: [...cur.logs, echo] };

    if (cmd === 'hint') {
      if (hintIdx === 0) {
        // First press reveals the "How to play" steps inside the hint flow.
        next.logs = [
          ...next.logs,
          { cls: 'hint', text: '📖 How to play:' },
          ...m.steps.map((s) => ({ cls: 'dim', text: `     ${s}` })),
        ];
        next.hintIdx = 1;
      } else if (m.hints && hintIdx - 1 < m.hints.length) {
        next.logs = [...next.logs, { cls: 'hint', text: `💡 ${m.hints[hintIdx - 1]}` }];
        next.hintIdx = hintIdx + 1;
      } else {
        next.logs = [...next.logs, { cls: 'dim', text: 'No more hints — try solution, or re-read the objective.' }];
      }
      setSt(next);
      return;
    }
    if (cmd === 'solution') {
      next.showSolution = true;
      next.logs = [...next.logs, { cls: 'warn', text: '🔓 Solution revealed in the briefing panel:' }];
      for (const l of m.solution) {
        next.logs.push({ cls: 'dim', text: l.startsWith('Quiz') ? `  ${l}` : `  $ ${l}` });
      }
      setSt(next);
      return;
    }
    if (cmd === 'missions') {
      next.logs = [
        ...next.logs,
        ...MISSIONS.map((mm) => ({
          cls: completed.includes(mm.id) ? 'ok' : 'out',
          text: `${completed.includes(mm.id) ? '✓' : '○'} ${mm.title}  —  ${mm.chapter}`,
        })),
      ];
      setSt(next);
      return;
    }
    if (cmd === 'cheat') {
      setModal('cheat');
      next.logs = [...next.logs, { cls: 'sys', text: 'Cheat sheet opened.' }];
      setSt(next);
      return;
    }
    if (cmd === 'guide') {
      setModal('guide');
      next.logs = [...next.logs, { cls: 'sys', text: 'Install / container guide opened.' }];
      setSt(next);
      return;
    }
    if (cmd === 'graph') {
      next.tab = 'graph';
      next.logs = [...next.logs, { cls: 'sys', text: 'Graph tab opened (right panel).' }];
      setSt(next);
      return;
    }
    if (cmd === 'reset') {
      loadMission(m);
      return;
    }
    if (cmd === 'next') {
      const n = nextMission(m.id);
      if (completed.includes(m.id) && n) {
        loadMission(n);
        return;
      }
      next.logs = [
        ...next.logs,
        {
          cls: 'err',
          text: completed.includes(m.id) ? 'Quest complete — no next mission!' : 'Finish this mission first (check the Objectives tab).',
        },
      ];
      setSt(next);
      return;
    }
    if (cmd === 'done' || cmd === 'check') {
      const ck = m.check ? m.check(cur.engine.S, cur.engine.ctx) : [];
      if (!ck.length) next.logs = [...next.logs, { cls: 'dim', text: 'This mission is graded by the quiz panel.' }];
      for (const c of ck) next.logs.push({ cls: c.ok ? 'ok' : 'err', text: `  ${c.ok ? '☑' : '☐'} ${c.label}` });
      setSt(evalSt(next));
      return;
    }

    // Plain shell/git command → simulated engine.
    let cleared = false;
    const res = runLine(cur.engine.S, line, cur.engine.ctx, {
      record: false, // history was already recorded above
      onClear: () => {
        cleared = true;
      },
    });
    next.logs = cleared ? [] : [...next.logs, ...res];
    setSt(evalSt(next));
  }

  function onAnswer(qi, ci) {
    if (completed.includes(mission.id)) return;
    const echo = { cls: 'in', prompt: promptFor(engine.S), text: `quiz Q${qi + 1} → ${mission.questions[qi].choices[ci]}` };
    const next = { ...st, answers: { ...answers, [qi]: ci }, logs: [...logs, echo] };
    setSt(evalSt(next));
  }

  const isQuiz = mission.kind === 'quiz';
  const tabs = isQuiz
    ? [
        ['quiz', '🎓 Quiz'],
        ['graph', '📜 Graph'],
      ]
    : [
        ['checks', '🎯 Objectives'],
        ['graph', '📜 Graph'],
      ];
  const activeTab = tabs.some(([k]) => k === tab) ? tab : tabs[0][0];
  const doneNow = completed.includes(mission.id);
  const nx = nextMission(mission.id);

  return (
    <div className="game" onClickCapture={onShellClick}>
      <header className="topbar">
        <span className="brand">⚔️ GitQuest</span>
        <span className="tagline">the workshop deck, turned into playable quests</span>
        <span className="grow" />
        <span className="progress" title="missions completed">
          <span className="bar">
            <span className="fill" style={{ width: `${(completed.length / MISSIONS.length) * 100}%` }} />
          </span>
          {completed.length}/{MISSIONS.length}
        </span>
        <button className="btn" onClick={() => setModal('cheat')}>📋 Cheat sheet</button>
        <button className="btn" onClick={() => setModal('guide')}>🐳 Install / Container</button>
        <button className="btn" onClick={() => loadMission(mission)}>↻ Restart</button>
      </header>

      <div className="game-body">
        <nav className="sidebar">
          {CHAPTERS.map((ch) => (
            <div className="chapter" key={ch.name}>
              <h5>{ch.name}</h5>
              {ch.missions.map((m) => {
                const open = isUnlocked(m, completed);
                const prev = MISSIONS[MISSIONS.findIndex((x) => x.id === m.id) - 1];
                return (
                  <button
                    key={m.id}
                    className={`mission-btn${m.id === mission.id ? ' active' : ''}${completed.includes(m.id) ? ' done' : ''}${open ? '' : ' locked'}`}
                    onClick={() => loadMission(m)}
                    title={open ? `${m.chapter} · ${m.deck}` : `🔒 Locked — complete "${prev ? prev.title : 'previous mission'}" first`}
                  >
                    <span className="m-check">{!open ? '🔒' : completed.includes(m.id) ? '✓' : '○'}</span>
                    <span className="m-title">{m.title}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <main className="center" ref={centerRef}>
          <MissionBrief
            mission={mission}
            hintIdx={hintIdx}
            onHint={() => submit('hint')}
            showSolution={showSolution}
            onSolution={() => submit('solution')}
            completed={doneNow}
            onNext={() => nx && loadMission(nx)}
            next={nx}
            locked={locked}
            style={{ height: briefH, flex: '0 0 auto', maxHeight: 'none' }}
          />
          <div
            className="divider"
            title="Drag to resize · double-click to reset"
            onPointerDown={startDrag}
            onDoubleClick={resetSplit}
          />
          <Terminal logs={logs} prompt={promptFor(engine.S)} history={engine.S.history} onSubmit={submit} locked={locked} inputRef={inputRef} />
        </main>

        <aside className="side">
          <div className="tabs">
            {tabs.map(([k, label]) => (
              <button key={k} className={`tab${activeTab === k ? ' active' : ''}`} onClick={() => setSt({ ...st, tab: k })}>
                {label}
              </button>
            ))}
          </div>
          <div className="tab-body">
            {activeTab === 'checks' && <ChecksPanel checks={checks} />}
            {activeTab === 'quiz' && (
              <QuizPanel mission={mission} answers={answers} onAnswer={onAnswer} completed={doneNow} locked={locked} />
            )}
            {activeTab === 'graph' && <GraphPanel engine={engine} />}
          </div>
        </aside>
      </div>

      {modal === 'cheat' && (
        <Modal title="Cheat sheet (deck slide 32)" onClose={close}>
          <CheatSheet />
        </Modal>
      )}
      {modal === 'guide' && (
        <Modal title="Install & container guide" onClose={close}>
          <InstallGuide />
        </Modal>
      )}
    </div>
  );
}
