import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const S = {
  root: {
    minHeight: '100vh', background: '#08080D', color: '#E0E0E5',
    fontFamily: "'JetBrains Mono','SF Mono',monospace", padding: '0 0 60px',
  },
  header: {
    position: 'sticky', top: 0, zIndex: 50,
    background: 'rgba(8,8,13,0.96)', backdropFilter: 'blur(16px)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 24px', height: 56,
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  logoA: { fontSize: 16, fontWeight: 800, color: '#FF3D00' },
  logoT: { fontWeight: 700, fontSize: 13, letterSpacing: 2, color: '#fff' },
  badge: {
    background: 'rgba(255,61,0,0.15)', border: '1px solid rgba(255,61,0,0.4)',
    color: '#FF3D00', fontSize: 10, fontWeight: 800, letterSpacing: 1,
    padding: '2px 8px', borderRadius: 4,
  },
  backBtn: {
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
    color: '#aaa', padding: '6px 14px', borderRadius: 6, cursor: 'pointer',
    fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
  },
  body: { padding: '24px', maxWidth: 1200, margin: '0 auto' },
  statsRow: { display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' },
  stat: {
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8, padding: '14px 20px', flex: '1 1 140px',
  },
  statV: { fontSize: 28, fontWeight: 800, color: '#FF3D00' },
  statL: { fontSize: 11, color: '#555', marginTop: 2, letterSpacing: 1 },
  search: {
    width: '100%', background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6,
    padding: '10px 14px', color: '#ddd', fontSize: 13,
    fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginBottom: 16,
  },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    textAlign: 'left', padding: '8px 14px', fontSize: 10, color: '#555',
    letterSpacing: 1, borderBottom: '1px solid rgba(255,255,255,0.06)',
    fontWeight: 700,
  },
  tr: (hover) => ({
    background: hover ? 'rgba(255,255,255,0.04)' : 'transparent',
    cursor: 'pointer', transition: 'background 0.1s',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  }),
  td: { padding: '10px 14px', fontSize: 12, color: '#ccc' },
  pill: (color) => ({
    display: 'inline-block', background: `${color}22`,
    border: `1px solid ${color}66`, color: color,
    fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 4,
  }),
  modal: {
    position: 'fixed', inset: 0, zIndex: 200,
    background: 'rgba(0,0,0,0.9)', overflowY: 'auto',
  },
  modalInner: {
    background: '#0f0f18', minHeight: '100vh',
    fontFamily: "'JetBrains Mono','SF Mono',monospace",
  },
  modalHeader: {
    position: 'sticky', top: 0, background: 'rgba(15,15,24,0.98)',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    display: 'flex', alignItems: 'center', gap: 16, padding: '14px 24px', zIndex: 10,
  },
  section: {
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 8, padding: 20, marginBottom: 16,
  },
  sTitle: { fontSize: 11, color: '#555', letterSpacing: 2, fontWeight: 700, marginBottom: 14 },
  row: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  chip: (color) => ({
    background: `${color}15`, border: `1px solid ${color}44`, color,
    fontSize: 11, padding: '4px 10px', borderRadius: 5,
  }),
  scoreRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
    fontSize: 12,
  },
  empty: { color: '#333', fontSize: 13, padding: '20px 0' },
};

const GRADE_COLORS = { 'A*': '#00E676', A: '#69F0AE', B: '#FFD600', C: '#FF9100', D: '#FF6D00', E: '#FF3D00', U: '#555' };
const SUBJECT_COLORS = {
  Maths: '#2979FF', 'Further Maths': '#E040FB', CS: '#00E676',
  Chemistry: '#FF4081', Physics: '#40C4FF', Economics: '#FFD600',
};

function gradeColor(g) { return GRADE_COLORS[g] || '#555'; }
function subColor(s) { return SUBJECT_COLORS[s] || '#888'; }

function getGrade(pct, subject) {
  const bounds = {
    Maths: { 'A*': 80, A: 70, B: 60, C: 50, D: 40, E: 30 },
    'Further Maths': { 'A*': 83, A: 72, B: 60, C: 50, D: 40, E: 30 },
    CS: { 'A*': 75, A: 65, B: 55, C: 45, D: 35, E: 25 },
    Chemistry: { 'A*': 80, A: 70, B: 60, C: 50, D: 40, E: 30 },
    Physics: { 'A*': 80, A: 70, B: 60, C: 50, D: 40, E: 30 },
    Economics: { 'A*': 75, A: 65, B: 55, C: 45, D: 35, E: 25 },
  };
  const b = bounds[subject] || {};
  for (const g of ['A*', 'A', 'B', 'C', 'D', 'E']) {
    if (pct >= (b[g] || 0)) return g;
  }
  return 'U';
}

function calcReadiness(scores, errors, checks) {
  const avg = scores.length ? scores.reduce((a, s) => a + s.pct, 0) / scores.length : 0;
  const scoreC = Math.round((avg / 100) * 40);
  const paperC = Math.min(20, Math.round((scores.length / 12) * 20));
  const recentErr = errors.filter(e => Date.now() - e.id < 7 * 86400000).length;
  const errC = Math.max(0, 20 - recentErr * 2);
  const checkC = Math.min(20, Math.round((Object.keys(checks).length / 40) * 20));
  const total = scoreC + paperC + errC + checkC;
  return { total, label: total >= 80 ? 'BATTLE READY' : total >= 60 ? 'ON TRACK' : total >= 40 ? 'BUILDING' : 'JUST STARTED' };
}

function UserModal({ user, onClose, onToggleAdmin }) {
  const [tab, setTab] = useState('me');
  const scores = (user.scores || {})[tab] || [];
  const errors = (user.errors || {})[tab] || [];
  const checks = (user.checks || {})[tab] || {};
  const targets = (user.targets || {})[tab] || {};
  const br = calcReadiness(scores, errors, checks);

  const subjects = [...new Set(scores.map(s => s.subject))];
  const avgBySubject = subjects.map(s => {
    const ss = scores.filter(x => x.subject === s);
    const avg = Math.round(ss.reduce((a, x) => a + x.pct, 0) / ss.length);
    return { s, avg, grade: getGrade(avg, s), count: ss.length };
  });

  const brColor = br.total >= 80 ? '#00E676' : br.total >= 60 ? '#FFD600' : br.total >= 40 ? '#FF9100' : '#FF3D00';

  return (
    <div style={S.modal}>
      <div style={S.modalInner}>
        <div style={S.modalHeader}>
          <button style={S.backBtn} onClick={onClose}>← Back</button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>
              {user.display_name || user.email}
            </div>
            <div style={{ fontSize: 11, color: '#555' }}>
              {user.display_name ? user.email + ' · ' : ''}
              Joined {new Date(user.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              {user.tos_agreed_at ? ' · ToS agreed' : ' · ToS not confirmed'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {['me', 'friend'].map(p => (
              <button
                key={p}
                onClick={() => setTab(p)}
                style={{
                  background: tab === p ? 'rgba(255,255,255,0.1)' : 'transparent',
                  border: `1px solid ${tab === p ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)'}`,
                  color: tab === p ? '#fff' : '#555',
                  padding: '4px 10px', borderRadius: 5, cursor: 'pointer',
                  fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
                }}
              >
                {p === 'me' ? 'Their Plan' : 'Friend Plan'}
              </button>
            ))}
            <button
              style={{
                background: user.is_admin ? 'rgba(255,61,0,0.15)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${user.is_admin ? 'rgba(255,61,0,0.4)' : 'rgba(255,255,255,0.1)'}`,
                color: user.is_admin ? '#FF3D00' : '#666',
                padding: '4px 10px', borderRadius: 5, cursor: 'pointer',
                fontSize: 11, fontWeight: 700, fontFamily: 'inherit',
              }}
              onClick={() => onToggleAdmin(user)}
            >
              {user.is_admin ? 'ADMIN' : 'Make Admin'}
            </button>
          </div>
        </div>

        <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
          {/* Battle Readiness */}
          <div style={{ ...S.section, display: 'flex', gap: 20, alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 36, fontWeight: 800, color: brColor }}>{br.total}</div>
              <div style={{ fontSize: 10, color: '#555', letterSpacing: 1 }}>BATTLE READINESS</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${br.total}%`, background: brColor, borderRadius: 3, transition: 'width 0.6s' }} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: brColor, marginTop: 6 }}>{br.label}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>{scores.length}</div>
              <div style={{ fontSize: 10, color: '#555', letterSpacing: 1 }}>PAPERS DONE</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>{errors.length}</div>
              <div style={{ fontSize: 10, color: '#555', letterSpacing: 1 }}>ERRORS LOGGED</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>{Object.keys(checks).length}</div>
              <div style={{ fontSize: 10, color: '#555', letterSpacing: 1 }}>TOPICS CHECKED</div>
            </div>
          </div>

          {/* Subject averages */}
          {avgBySubject.length > 0 && (
            <div style={S.section}>
              <div style={S.sTitle}>SUBJECT AVERAGES</div>
              <div style={S.row}>
                {avgBySubject.map(({ s, avg, grade, count }) => (
                  <div key={s} style={{
                    background: 'rgba(255,255,255,0.04)', border: `1px solid ${subColor(s)}33`,
                    borderRadius: 8, padding: '12px 16px', minWidth: 130,
                  }}>
                    <div style={{ fontSize: 10, color: '#555', letterSpacing: 1, marginBottom: 4 }}>{s.toUpperCase()}</div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: gradeColor(grade) }}>{grade}</div>
                    <div style={{ fontSize: 12, color: '#888' }}>{avg}% avg · {count} paper{count !== 1 ? 's' : ''}</div>
                    {targets[s] && (
                      <div style={{ fontSize: 10, color: '#555', marginTop: 4 }}>Target: {targets[s]}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Past paper scores */}
          <div style={S.section}>
            <div style={S.sTitle}>PAST PAPERS ({scores.length})</div>
            {scores.length === 0
              ? <div style={S.empty}>No papers logged yet.</div>
              : scores.slice(0, 30).map((sc, i) => (
                <div key={i} style={S.scoreRow}>
                  <div>
                    <span style={{ ...S.chip(subColor(sc.subject)), marginRight: 8 }}>{sc.subject}</span>
                    <span style={{ color: '#ccc' }}>{sc.paper}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span style={{ color: '#555', fontSize: 11 }}>{sc.date}</span>
                    <span style={{ color: '#888' }}>{sc.got}/{sc.max}</span>
                    <span style={{ fontWeight: 700, color: gradeColor(getGrade(sc.pct, sc.subject)) }}>
                      {sc.pct}% · {getGrade(sc.pct, sc.subject)}
                    </span>
                  </div>
                </div>
              ))}
            {scores.length > 30 && (
              <div style={{ fontSize: 11, color: '#555', marginTop: 8 }}>
                + {scores.length - 30} more papers
              </div>
            )}
          </div>

          {/* Error log */}
          <div style={S.section}>
            <div style={S.sTitle}>ERROR LOG ({errors.length})</div>
            {errors.length === 0
              ? <div style={S.empty}>No errors logged yet.</div>
              : errors.slice(0, 20).map((e, i) => (
                <div key={i} style={{ ...S.scoreRow, fontSize: 12 }}>
                  <div>
                    <span style={{ ...S.chip(subColor(e.subject)), marginRight: 8 }}>{e.subject}</span>
                    <span style={{ color: '#ccc' }}>{e.topic}</span>
                    {e.note && <span style={{ color: '#555', fontSize: 11 }}> — {e.note}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ color: '#555', fontSize: 11 }}>{e.date}</span>
                    <span style={{ ...S.chip('#FF9100') }}>{e.type}</span>
                  </div>
                </div>
              ))}
          </div>

          {/* Checked topics */}
          {Object.keys(checks).length > 0 && (
            <div style={S.section}>
              <div style={S.sTitle}>CHECKED TOPICS ({Object.keys(checks).length})</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {Object.keys(checks).slice(0, 60).map(k => (
                  <span key={k} style={{ ...S.chip('#00E676'), fontSize: 10 }}>{k}</span>
                ))}
                {Object.keys(checks).length > 60 && (
                  <span style={{ color: '#555', fontSize: 11 }}>+ {Object.keys(checks).length - 60} more</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminPanel({ currentUser, onBack }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [hoveredRow, setHoveredRow] = useState(null);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    const { data: userData } = await supabase
      .from('user_data')
      .select('*');

    if (!profiles) { setLoading(false); return; }

    const merged = profiles.map(p => {
      const rows = (userData || []).filter(d => d.user_id === p.id);
      const scores = {};
      const errors = {};
      const checks = {};
      const targets = {};
      rows.forEach(r => {
        scores[r.profile] = r.scores || [];
        errors[r.profile] = r.errors || [];
        checks[r.profile] = r.checks || {};
        targets[r.profile] = r.targets || {};
      });
      const allScores = Object.values(scores).flat();
      const allErrors = Object.values(errors).flat();
      const lastActive = rows.length
        ? rows.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))[0].updated_at
        : p.created_at;
      return { ...p, scores, errors, checks, targets, totalScores: allScores.length, totalErrors: allErrors.length, lastActive };
    });

    setUsers(merged);
    setLoading(false);
  };

  const toggleAdmin = async (user) => {
    const next = !user.is_admin;
    await supabase
      .from('user_profiles')
      .update({ is_admin: next })
      .eq('id', user.id);
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_admin: next } : u));
    if (selected?.id === user.id) setSelected(prev => ({ ...prev, is_admin: next }));
  };

  const filtered = users.filter(u =>
    !search || u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.display_name?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPapers = users.reduce((a, u) => a + u.totalScores, 0);
  const admins = users.filter(u => u.is_admin).length;
  const activeToday = users.filter(u => {
    const d = new Date(u.lastActive);
    return d.toDateString() === new Date().toDateString();
  }).length;

  return (
    <>
      {selected && (
        <UserModal
          user={selected}
          onClose={() => setSelected(null)}
          onToggleAdmin={toggleAdmin}
        />
      )}

      <div style={S.root}>
        <div style={S.header}>
          <div style={S.headerLeft}>
            <span style={S.logoA}>A*</span>
            <span style={S.logoT}>BATTLE PLAN</span>
            <span style={S.badge}>GOD MODE</span>
          </div>
          <button style={S.backBtn} onClick={onBack}>← Exit Admin</button>
        </div>

        <div style={S.body}>
          <div style={S.statsRow}>
            <div style={S.stat}>
              <div style={S.statV}>{users.length}</div>
              <div style={S.statL}>TOTAL USERS</div>
            </div>
            <div style={S.stat}>
              <div style={S.statV}>{totalPapers}</div>
              <div style={S.statL}>PAPERS LOGGED</div>
            </div>
            <div style={S.stat}>
              <div style={S.statV}>{activeToday}</div>
              <div style={S.statL}>ACTIVE TODAY</div>
            </div>
            <div style={S.stat}>
              <div style={S.statV}>{admins}</div>
              <div style={S.statL}>ADMINS</div>
            </div>
          </div>

          <input
            style={S.search}
            placeholder="Search by email or name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          {loading ? (
            <div style={{ color: '#444', fontSize: 13, padding: 24 }}>Loading users...</div>
          ) : (
            <table style={S.table}>
              <thead>
                <tr>
                  {['User', 'Joined', 'Last Active', 'Papers', 'Errors', 'ToS', 'Role'].map(h => (
                    <th key={h} style={S.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={7} style={{ ...S.td, color: '#333' }}>No users found.</td></tr>
                )}
                {filtered.map(u => (
                  <tr
                    key={u.id}
                    style={S.tr(hoveredRow === u.id)}
                    onClick={() => setSelected(u)}
                    onMouseEnter={() => setHoveredRow(u.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    <td style={S.td}>
                      <div style={{ color: '#fff', fontWeight: 600 }}>{u.display_name || '—'}</div>
                      <div style={{ color: '#555', fontSize: 11 }}>{u.email}</div>
                    </td>
                    <td style={{ ...S.td, color: '#666' }}>
                      {new Date(u.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </td>
                    <td style={{ ...S.td, color: '#666' }}>
                      {new Date(u.lastActive).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </td>
                    <td style={{ ...S.td, color: '#fff', fontWeight: 700 }}>{u.totalScores}</td>
                    <td style={{ ...S.td, color: u.totalErrors > 0 ? '#FF9100' : '#555' }}>{u.totalErrors}</td>
                    <td style={S.td}>
                      {u.tos_agreed_at
                        ? <span style={S.pill('#00E676')}>Agreed</span>
                        : <span style={S.pill('#FF3D00')}>Not agreed</span>}
                    </td>
                    <td style={S.td}>
                      {u.is_admin
                        ? <span style={S.pill('#FF3D00')}>Admin</span>
                        : <span style={S.pill('#555')}>User</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
