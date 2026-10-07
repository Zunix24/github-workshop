// LearnGitBranching-style visual graph: circular nodes showing short hashes,
// arrow edges pointing from each commit to its parents (oldest at top),
// branch/HEAD badges with pointer arrows. Pure SVG, no dependencies.

const R = 19; // node radius
const COL_W = 84;
const ROW_H = 76;
const PAD = { t: 22, l: 30, b: 26, r: 26 };

const BADGE_KINDS = {
  head: { fill: '#8250df', marker: 'gmk-head' },
  main: { fill: '#238636', marker: 'gmk-main' },
  branch: { fill: '#1f6feb', marker: 'gmk-branch' },
  remote: { fill: '#6e7681', marker: 'gmk-remote' },
};

function short(sha) {
  return sha.slice(0, 7);
}

// Children are always emitted before their parents; among ready commits the
// newest wins — guarantees every parent draws ABOVE its children.
function orderNewestFirst(commits) {
  const shas = Object.keys(commits);
  const childrenOf = {};
  for (const s of shas) childrenOf[s] = [];
  for (const s of shas) {
    for (const p of commits[s].parents || []) {
      if (childrenOf[p]) childrenOf[p].push(s);
    }
  }
  const emitted = new Set();
  const out = [];
  const timeOf = (s) => String((commits[s] && commits[s].time) || '');
  while (out.length < shas.length) {
    let best = null;
    for (const s of shas) {
      if (emitted.has(s)) continue;
      if (childrenOf[s].every((ch) => emitted.has(ch))) {
        if (best === null || timeOf(s) > timeOf(best)) best = s;
      }
    }
    if (best === null) {
      // Broken ancestry fallback — flush the rest so the graph still renders.
      for (const s of shas) if (!emitted.has(s)) { emitted.add(s); out.push(s); }
      break;
    }
    emitted.add(best);
    out.push(best);
  }
  return out;
}

// Classic git-log lane assignment: a commit occupies the lane that expects it;
// its first parent inherits the lane, extra (merge) parents take free lanes.
function computePositions(order, commits) {
  const lanes = [];
  const pos = {};
  order.forEach((sha, row) => {
    let lane = lanes.indexOf(sha);
    if (lane === -1) {
      lane = lanes.indexOf(null);
      if (lane === -1) {
        lane = lanes.length;
        lanes.push(null);
      }
    }
    for (let i = 0; i < lanes.length; i += 1) if (lanes[i] === sha) lanes[i] = null;
    pos[sha] = { row, lane };
    const parents = commits[sha].parents || [];
    lanes[lane] = parents.length ? parents[0] : null;
    for (const extra of parents.slice(1)) {
      const free = lanes.indexOf(null);
      if (free === -1) lanes.push(extra);
      else lanes[free] = extra;
    }
  });
  return pos;
}

// Edge from child center (x1,y1) to parent center (x2,y2), stopping short of
// both circles so nodes cover the ends and the arrowhead stays visible.
function edgePath(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const sx = x1 + ux * (R + 2);
  const sy = y1 + uy * (R + 2);
  const ex = x2 - ux * (R + 5);
  const ey = y2 - uy * (R + 5);
  if (Math.abs(dx) < 2) return `M ${sx} ${sy} L ${ex} ${ey}`;
  // Vertical tangents at both ends — the LearnGitBranching curve.
  const c1y = sy + (ey - sy) * 0.45;
  const c2y = ey - (ey - sy) * 0.45;
  return `M ${sx} ${sy} C ${sx} ${c1y} ${ex} ${c2y} ${ex} ${ey}`;
}

function Marker({ id, fill }) {
  return (
    <marker id={id} viewBox="0 0 7 7" refX="7" refY="3.5" markerWidth="7" markerHeight="7" orient="auto" markerUnits="userSpaceOnUse">
      <path d="M0,0 L7,3.5 L0,7 z" fill={fill} />
    </marker>
  );
}

export function GraphPanel({ engine }) {
  const repo = engine.S.repo;
  if (!repo) return <p className="dim">No repository yet — run git init or git clone first.</p>;
  const commits = repo.commits;
  const order = orderNewestFirst(commits);
  if (!order.length) return <p className="dim">No commits yet.</p>;

  const pos = computePositions(order, commits);
  const maxRow = order.length - 1;
  const maxLane = Math.max(...order.map((s) => pos[s].lane));
  const yOf = (row) => PAD.t + (maxRow - row) * ROW_H;
  const xOf = (lane) => PAD.l + lane * COL_W;

  const headSha = repo.head.type === 'branch' ? repo.branches[repo.head.name] : repo.head.sha || null;
  const tipSet = new Set(Object.values(repo.branches));

  // Collect badges (branches, HEAD, remote tips) grouped by commit.
  const badgeGroups = {};
  const addBadge = (sha, label, kind) => {
    if (!sha || !pos[sha]) return;
    if (!badgeGroups[sha]) badgeGroups[sha] = [];
    badgeGroups[sha].push({ label, kind });
  };
  for (const [name, tip] of Object.entries(repo.branches)) {
    addBadge(tip, name, name === 'main' ? 'main' : 'branch');
  }
  if (headSha) addBadge(headSha, 'HEAD', 'head');
  for (const ref of Object.values(repo.upstream || {})) {
    const remote = String(ref).split('/')[0];
    const cfg = repo.remotes[remote];
    if (cfg && engine.ctx.remoteStore[cfg.url]) {
      const store = engine.ctx.remoteStore[cfg.url];
      const rb = String(ref).split('/').slice(1).join('/');
      addBadge(store.branches[rb], String(ref), 'remote');
    }
  }
  const badgeW = (label) => label.length * 6.7 + 18;
  let widestBadge = 0;
  for (const items of Object.values(badgeGroups)) {
    for (const b of items) widestBadge = Math.max(widestBadge, badgeW(b.label));
  }

  const svgW = PAD.l + maxLane * COL_W + R + 16 + widestBadge + PAD.r;
  const svgH = yOf(0) + R + PAD.b;

  const edges = [];
  for (const sha of order) {
    for (const p of commits[sha].parents || []) {
      if (!pos[p]) continue;
      edges.push(edgePath(xOf(pos[sha].lane), yOf(pos[sha].row), xOf(pos[p].lane), yOf(pos[p].row)));
    }
  }

  const badgeNodes = [];
  for (const [sha, items] of Object.entries(badgeGroups)) {
    const { lane, row } = pos[sha];
    const cx = xOf(lane);
    const cy = yOf(row);
    items.forEach((b, i) => {
      const w = badgeW(b.label);
      const bx = cx + R + 14;
      const by = cy - 11 + i * 26;
      const ax = bx - 3;
      const ay = by + 11;
      const dx = cx - ax;
      const dy = cy - ay;
      const len = Math.hypot(dx, dy) || 1;
      const tx = cx - (dx / len) * (R + 4);
      const ty = cy - (dy / len) * (R + 4);
      const kind = BADGE_KINDS[b.kind] || BADGE_KINDS.branch;
      badgeNodes.push(
        <g key={`${sha}-${b.label}-${i}`}>
          <line x1={ax} y1={ay} x2={tx} y2={ty} stroke={kind.fill} strokeWidth="3" markerEnd={`url(#${kind.marker})`} />
          <rect x={bx} y={by} width={w} height="22" rx="6" fill={kind.fill} />
          <text x={bx + w / 2} y={by + 15} textAnchor="middle" fontSize="11.5" fontWeight="600" fill="#fff" className="gs-badge-text">
            {b.label}
          </text>
        </g>,
      );
    });
  }

  return (
    <div className="graph">
      <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} role="img" aria-label="commit graph">
        <defs>
          <Marker id="gmk-edge" fill="#8b949e" />
          <Marker id="gmk-head" fill={BADGE_KINDS.head.fill} />
          <Marker id="gmk-main" fill={BADGE_KINDS.main.fill} />
          <Marker id="gmk-branch" fill={BADGE_KINDS.branch.fill} />
          <Marker id="gmk-remote" fill={BADGE_KINDS.remote.fill} />
        </defs>
        {edges.map((d, i) => (
          <path key={`e${i}`} d={d} fill="none" stroke="#8b949e" strokeWidth="2" markerEnd="url(#gmk-edge)" />
        ))}
        {badgeNodes}
        {order.map((sha) => {
          const { lane, row } = pos[sha];
          const cx = xOf(lane);
          const cy = yOf(row);
          const c = commits[sha];
          const isHead = sha === headSha;
          const isTip = tipSet.has(sha);
          const isMerge = (c.parents || []).length > 1;
          const fill = isHead ? '#f0883e' : isTip ? '#7ff0b0' : isMerge ? '#c084fc' : '#8fd8d8';
          const textFill = isHead || isMerge ? '#ffffff' : '#0b2b30';
          const msg = String(c.message || '');
          return (
            <g key={sha} className="gs-node">
              <title>{`${sha}\n"${msg}"\n${c.author || ''} <${c.email || ''}>`}</title>
              <circle cx={cx} cy={cy} r={R} fill={fill} stroke="#ffffff" strokeWidth="2" />
              <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize="9.5" fontFamily="var(--mono)" fontWeight="600" fill={textFill}>
                {short(sha)}
              </text>
              <text x={cx} y={cy + R + 14} textAnchor="middle" fontSize="9.5" fill="#8b949e" className="gs-msg">
                {msg.length > 15 ? `${msg.slice(0, 14)}…` : msg}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="dim graph-foot">
        circle = commit (short hash) · arrow → parent · badges = branches/HEAD · hover a node for the full sha &amp; message
      </p>
    </div>
  );
}

