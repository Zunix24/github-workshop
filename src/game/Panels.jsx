export function MissionBrief({ mission, hintIdx, onHint, showSolution, onSolution, completed, onNext, next, locked, style }) {
  return (
    <section className="brief" style={style}>
      <div className="brief-head">
        <div>
          <span className="pill">{mission.chapter}</span>
          <span className="deck">{mission.deck}</span>
        </div>
        {locked ? <span className="badge-lock">🔒 PREVIEW — level locked</span> : completed && <span className="badge-win">✓ COMPLETED</span>}
      </div>
      <h2>{mission.title}</h2>
      <div className="story">
        {mission.story.map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>
      <p className="goal">
        <strong>Goal:</strong> {mission.goal}
      </p>
      <div className="brief-actions">
        <button
          className="btn"
          onClick={onHint}
          disabled={!mission.hints || (hintIdx > 0 && hintIdx - 1 >= mission.hints.length)}
        >
          💡{' '}
          {hintIdx === 0
            ? 'How to play'
            : mission.hints && hintIdx - 1 < mission.hints.length
              ? `Hint ${hintIdx}/${mission.hints.length}`
              : 'All hints seen'}
        </button>
        <button className="btn" onClick={onSolution}>
          🔓 Reveal solution
        </button>
        {completed && next && !locked && (
          <button className="btn primary" onClick={onNext}>
            Next mission →
          </button>
        )}
      </div>
      {hintIdx > 0 && (
        <div className="steps">
          <h4>How to play</h4>
          <ol>
            {mission.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </div>
      )}
      {hintIdx > 1 && mission.hints && (
        <div className="hints">
          {mission.hints.slice(0, hintIdx - 1).map((h, i) => (
            <p key={i}>
              <span className="hint-mark">hint {i + 1}:</span> {h}
            </p>
          ))}
        </div>
      )}
      {showSolution && (
        <div className="solution">
          <h4>Solution (spoiler)</h4>
          <pre>
            {mission.solution.map((l) => (l.startsWith('Quiz') ? l : `$ ${l}`)).join('\n')}
          </pre>
        </div>
      )}
    </section>
  );
}

export function ChecksPanel({ checks }) {
  if (!checks.length) {
    return <p className="dim">Run commands in the terminal — objectives update live.</p>;
  }
  return (
    <ul className="checks">
      {checks.map((c, i) => (
        <li key={i} className={c.ok ? 'ok' : 'todo'}>
          <span className="mark">{c.ok ? '☑' : '☐'}</span> {c.label}
        </li>
      ))}
    </ul>
  );
}

export function QuizPanel({ mission, answers, onAnswer, completed, locked }) {
  return (
    <div className="quiz">
      {mission.questions.map((q, qi) => {
        const picked = answers[qi];
        const done = picked === q.answer;
        return (
          <div className="q" key={qi}>
            <p className="q-text">
              Q{qi + 1}. {q.q}
            </p>
            <div className="choices">
              {q.choices.map((ch, ci) => {
                let cls = 'choice';
                if (picked === ci) cls += done ? ' correct' : ' wrong';
                else if (done && ci === q.answer) cls += ' correct';
                return (
                  <button key={ci} className={cls} disabled={completed || locked} onClick={() => onAnswer(qi, ci)}>
                    {ch}
                  </button>
                );
              })}
            </div>
            {done && <p className="why">✓ {q.why}</p>}
          </div>
        );
      })}
    </div>
  );
}

// The visual DAG graph lives in GraphView.jsx (SVG, LearnGitBranching-style).
export { GraphPanel } from './GraphView.jsx';

export function Modal({ title, onClose, children }) {
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="btn" onClick={onClose}>
            ✕ close
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
