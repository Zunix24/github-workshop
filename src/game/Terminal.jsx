import { useEffect, useRef, useState } from 'react';

// Simulated terminal: prints engine output, keeps per-mission command history.
// Focus is shared with GameScreen via inputRef; new output refocuses the caret
// so the terminal is always ready to type (unless the level is locked).
export default function Terminal({ logs, prompt, history, onSubmit, locked, inputRef }) {
  const [value, setValue] = useState('');
  const [histIdx, setHistIdx] = useState(-1);
  const scrollRef = useRef(null);
  const localInput = useRef(null);

  const setInput = (node) => {
    localInput.current = node;
    if (inputRef) inputRef.current = node;
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs]);

  // Always ready to type: refocus on mount and whenever new output lands.
  useEffect(() => {
    if (!locked && localInput.current) localInput.current.focus();
  }, [logs, locked]);

  const fire = () => {
    const line = value.trim();
    setValue('');
    setHistIdx(-1);
    if (line) onSubmit(line);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter') {
      fire();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!history.length) return;
      const next = histIdx < 0 ? history.length - 1 : Math.max(0, histIdx - 1);
      setHistIdx(next);
      setValue(history[next]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (histIdx < 0) return;
      const next = histIdx + 1;
      if (next >= history.length) {
        setHistIdx(-1);
        setValue('');
      } else {
        setHistIdx(next);
        setValue(history[next]);
      }
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      onSubmit('clear');
    }
  };

  return (
    <div
      className={`term${locked ? ' locked' : ''}`}
      onClick={() => {
        if (!locked && localInput.current) localInput.current.focus();
      }}
    >
      <div className="term-scroll" ref={scrollRef}>
        {logs.map((l, i) =>
          l.cls === 'in' ? (
            <div key={i} className="line in">
              <span className="prompt">{l.prompt}</span>
              <span>{l.text}</span>
            </div>
          ) : (
            <div key={i} className={`line ${l.cls}`}>
              {l.text || ' '}
            </div>
          ),
        )}
      </div>
      <div className="term-input-row">
        <span className="prompt">{prompt}</span>
        <input
          ref={setInput}
          value={value}
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="off"
          disabled={locked}
          placeholder={
            locked
              ? '🔒 Complete the previous mission to unlock this terminal'
              : 'type a command…  (help · hint · solution · reset)'
          }
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
        />
      </div>
    </div>
  );
}
