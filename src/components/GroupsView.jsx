import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

const APP_ORIGIN = typeof window !== 'undefined' ? window.location.origin : 'https://beattheexam.org';

function scoreColor(s) {
  if (s >= 80) return '#22c55e';
  if (s >= 65) return '#fbbf24';
  if (s >= 50) return '#f97316';
  return '#ef4444';
}

function rankColor(i) {
  return i === 0 ? '#fbbf24' : i === 1 ? '#9ca3af' : i === 2 ? '#b5735a' : null;
}

// Extract a 4-8 char alphanumeric invite code from a pasted link or raw string
function extractCode(raw) {
  const s = (raw || '').trim().toUpperCase();
  if (!s) return '';
  const m = s.match(/\/J\/([A-Z0-9]{4,8})/) || s.match(/^([A-Z0-9]{4,8})$/);
  return m ? m[1] : '';
}

export default function GroupsView({ user, scores = [], uid, C, font, addToast }) {
  const [groups, setGroups]       = useState([]);
  const [loading, setLoading]     = useState(true);

  const [createName, setCreateName] = useState('');
  const [joinInput, setJoinInput]   = useState('');
  const [creating, setCreating]   = useState(false);
  const [joining, setJoining]     = useState(false);
  const [expanded, setExpanded]   = useState(null);

  const [displayName, setDisplayName] = useState(user?.email?.split('@')[0] || 'You');

  const [schools, setSchools]     = useState(null);
  const [schoolsLoading, setSchoolsLoading] = useState(false);
  const [schoolsOpen, setSchoolsOpen] = useState(false);
  const [yearFilter, setYearFilter] = useState('');
  const [nationalAvg, setNationalAvg] = useState(null);
  const schoolsFetchedRef = useRef({});

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  };

  const apiFetch = useCallback(async (method, body) => {
    const token = await getToken();
    if (!token) return { error: 'Not signed in' };
    const r = await fetch('/api/groups', {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return r.json();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const d = await apiFetch('GET');
    if (!d.error) setGroups(d.groups ?? []);
    setLoading(false);
  }, [apiFetch]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!uid) return;
    supabase.from('user_profiles').select('display_name').eq('id', uid).single()
      .then(({ data }) => { if (data?.display_name) setDisplayName(data.display_name); });
  }, [uid]);

  const handleCreate = async () => {
    const name = createName.trim();
    if (name.length < 2) { addToast('Group name must be at least 2 characters', 'error'); return; }
    setCreating(true);
    const d = await apiFetch('POST', { action: 'create', name });
    if (d.group) {
      setCreateName('');
      addToast(`Group "${d.group.name}" created`, 'success');
      load();
      setExpanded(d.group.id);
    } else {
      addToast(d.error || 'Failed to create group', 'error');
    }
    setCreating(false);
  };

  const handleJoin = async () => {
    const code = extractCode(joinInput);
    if (!code) { addToast('Paste an invite link or code', 'error'); return; }
    setJoining(true);
    const d = await apiFetch('POST', { action: 'join', invite_code: code });
    if (d.group) {
      setJoinInput('');
      addToast(`Joined "${d.group.name}"`, 'success');
      load();
    } else {
      addToast(d.error || 'No group found with that code', 'error');
    }
    setJoining(false);
  };

  const handleInvite = async (group) => {
    const url  = `${APP_ORIGIN}/j/${group.invite_code}`;
    const text = `Join my A* Battle Plan study group "${group.name}" — compare exam scores`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Join my study group', text, url });
        return;
      }
    } catch (e) {
      if (e?.name === 'AbortError') return;
    }
    try {
      await navigator.clipboard.writeText(url);
      addToast('Invite link copied — paste it to your friends', 'success');
    } catch {
      addToast(`Share this link: ${url}`, 'info');
    }
  };

  const handleLeave = async (group_id, name) => {
    if (!confirm(`Leave "${name}"?`)) return;
    const d = await apiFetch('POST', { action: 'leave', group_id });
    if (d.ok) { addToast(`Left "${name}"`, 'info'); load(); }
    else addToast(d.error || 'Failed', 'error');
  };

  const loadSchools = useCallback(async (yr='') => {
    const cacheKey = yr || 'all';
    if (schoolsFetchedRef.current[cacheKey]) return;
    schoolsFetchedRef.current[cacheKey] = true;
    setSchoolsLoading(true);
    try {
      const token = await getToken();
      const url = yr ? `/api/school-leaderboard?year=${yr}` : '/api/school-leaderboard';
      const r = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const d = await r.json();
      setSchools(d.schools ?? []);
      if (d.national_avg!=null) setNationalAvg(d.national_avg);
    } catch {
      setSchools([]);
    }
    setSchoolsLoading(false);
  }, []);

  const handleToggleSchools = () => {
    const next = !schoolsOpen;
    setSchoolsOpen(next);
    if (next) loadSchools(yearFilter);
  };

  const handleYearFilter = (yr) => {
    setYearFilter(yr);
    setSchools(null);
    loadSchools(yr);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Header */}
      <div>
        <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 4 }}>Groups</div>
        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
          Private leaderboards with your mates. Create one and share the link — they tap, sign in, and join instantly.
        </div>
      </div>

      {/* ─────── Always-visible action card: Create + Join ─────── */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '18px 20px' }}>

        {/* Create */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase',
            letterSpacing: 0.5, marginBottom: 8 }}>
            Start a new group
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={createName} onChange={e => setCreateName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !creating && handleCreate()}
              placeholder="e.g. Maths group, Form 12B"
              maxLength={40}
              style={{ flex: 1, background: C.card2, border: `1px solid ${C.border}`, borderRadius: 8,
                padding: '11px 13px', color: C.text, fontSize: 13, fontFamily: font, outline: 'none' }} />
            <button onClick={handleCreate} disabled={creating || createName.trim().length < 2}
              style={{ padding: '11px 22px', borderRadius: 8, fontFamily: font, fontSize: 13, fontWeight: 700,
                cursor: creating || createName.trim().length < 2 ? 'not-allowed' : 'pointer',
                background: creating || createName.trim().length < 2 ? C.card2 : C.accent,
                border: `1px solid ${creating || createName.trim().length < 2 ? C.border : C.accent}`,
                color: creating || createName.trim().length < 2 ? C.muted : '#fff' }}>
              {creating ? '…' : 'Create'}
            </button>
          </div>
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0 14px' }}>
          <div style={{ flex: 1, height: 1, background: C.border }} />
          <div style={{ fontSize: 10, fontWeight: 700, color: C.subtle, letterSpacing: 1 }}>OR</div>
          <div style={{ flex: 1, height: 1, background: C.border }} />
        </div>

        {/* Join */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase',
            letterSpacing: 0.5, marginBottom: 8 }}>
            Join with an invite link or code
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={joinInput} onChange={e => setJoinInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !joining && handleJoin()}
              placeholder="Paste invite link or code"
              style={{ flex: 1, background: C.card2, border: `1px solid ${C.border}`, borderRadius: 8,
                padding: '11px 13px', color: C.text, fontSize: 13, fontFamily: font, outline: 'none' }} />
            <button onClick={handleJoin} disabled={joining || !extractCode(joinInput)}
              style={{ padding: '11px 22px', borderRadius: 8, fontFamily: font, fontSize: 13, fontWeight: 700,
                cursor: joining || !extractCode(joinInput) ? 'not-allowed' : 'pointer',
                background: joining || !extractCode(joinInput) ? C.card2 : C.accent,
                border: `1px solid ${joining || !extractCode(joinInput) ? C.border : C.accent}`,
                color: joining || !extractCode(joinInput) ? C.muted : '#fff' }}>
              {joining ? '…' : 'Join'}
            </button>
          </div>
        </div>
      </div>

      {/* ─────── Your groups list ─────── */}
      {loading ? (
        <div style={{ fontSize: 13, color: C.subtle, padding: '4px 0' }}>Loading…</div>
      ) : groups.length === 0 ? (
        <div style={{ fontSize: 12, color: C.subtle, lineHeight: 1.6, padding: '4px 4px' }}>
          You're not in any groups yet — create one above or paste a friend's invite link.
        </div>
      ) : (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase',
            letterSpacing: 0.5, marginTop: 4 }}>
            Your groups
          </div>

          {/* Group cards */}
          {groups.map(g => {
            const isOpen   = expanded === g.id;
            const alone    = g.members.length === 1 && g.members[0]?.is_me;
            const youOwn   = g.created_by === uid;
            const visible  = isOpen ? g.members : g.members.slice(0, 5);

            return (
              <div key={g.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>

                {/* Header */}
                <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.border}`,
                  display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{g.name}</div>
                      {youOwn && (
                        <span style={{ fontSize: 9, fontWeight: 700, color: C.accent,
                          background: C.accentSoft, padding: '2px 7px', borderRadius: 10,
                          textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          Yours
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: C.subtle, marginTop: 3 }}>
                      {g.members.length} member{g.members.length !== 1 ? 's' : ''}
                      {' · '}
                      <span style={{ fontFamily: "'JetBrains Mono','SF Mono',monospace", letterSpacing: 1, color: C.muted }}>
                        {g.invite_code}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => handleInvite(g)}
                    style={{ padding: '8px 16px', background: C.accent, border: 'none', borderRadius: 7,
                      color: '#fff', fontSize: 12, fontWeight: 700, fontFamily: font, cursor: 'pointer' }}>
                    Invite
                  </button>
                  <button onClick={() => handleLeave(g.id, g.name)} title="Leave group"
                    style={{ padding: '8px 10px', background: 'transparent', border: `1px solid ${C.border}`,
                      borderRadius: 7, color: C.muted, fontSize: 12, fontFamily: font, cursor: 'pointer' }}>
                    Leave
                  </button>
                </div>

                {/* Lone-member CTA — replaces leaderboard when you're alone */}
                {alone ? (
                  <div style={{ padding: '24px 18px', textAlign: 'center' }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>👋</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 6 }}>
                      You're the only one here so far
                    </div>
                    <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5, marginBottom: 14, maxWidth: 320, margin: '0 auto 14px' }}>
                      Share the invite link with your friends — they'll tap it, sign in, and land straight in this group.
                    </div>
                    <button onClick={() => handleInvite(g)}
                      style={{ padding: '11px 24px', background: C.accent, border: 'none', borderRadius: 8,
                        color: '#fff', fontSize: 14, fontWeight: 700, fontFamily: font, cursor: 'pointer' }}>
                      Share invite link
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Leaderboard */}
                    <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {visible.map((m, i) => (
                        <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 10,
                          padding: '8px 10px', borderRadius: 7,
                          background: m.is_me ? `${C.accent}0d` : 'transparent',
                          border: `1px solid ${m.is_me ? C.accent + '33' : C.border}` }}>
                          <div style={{ width: 22, textAlign: 'center', fontSize: 13, fontWeight: 800,
                            color: rankColor(i) ?? C.subtle, flexShrink: 0 }}>{i + 1}</div>
                          <div style={{ flex: 1, fontSize: 12, fontWeight: m.is_me ? 700 : 500, color: C.text,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {m.display_name}{m.is_me ? ' (you)' : ''}
                          </div>
                          <div style={{ fontSize: 11, color: C.subtle, flexShrink: 0 }}>{m.papers_count}p</div>
                          <div style={{ fontSize: 18, fontWeight: 800, color: scoreColor(m.leaderboard_score),
                            minWidth: 48, textAlign: 'right', flexShrink: 0 }}>
                            {m.leaderboard_score}%
                          </div>
                        </div>
                      ))}
                      {g.members.length > 5 && (
                        <button onClick={() => setExpanded(isOpen ? null : g.id)}
                          style={{ padding: '6px 0', background: 'transparent', border: 'none',
                            color: C.muted, fontSize: 11, fontFamily: font, cursor: 'pointer', fontWeight: 600 }}>
                          {isOpen ? 'Show top 5' : `Show all ${g.members.length}`}
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </>
      )}

      {/* School leaderboard */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            School leaderboard
          </div>
          <button onClick={handleToggleSchools}
            style={{ fontSize: 11, color: C.muted, background: 'transparent',
              border: `1px solid ${C.border}`, borderRadius: 5, padding: '4px 9px',
              fontFamily: font, cursor: 'pointer' }}>
            {schoolsOpen ? 'Hide' : 'Show'}
          </button>
        </div>
        {schoolsOpen && (
          <div style={{ marginTop: 14 }}>
            <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:12 }}>
              {[['','All years'],['Y10','Y10'],['Y11','Y11'],['Y12','Y12'],['Y13','Y13']].map(([k,l])=>(
                <button key={k} onClick={()=>handleYearFilter(k)}
                  style={{ padding:'4px 10px', borderRadius:6,
                    background: yearFilter===k ? C.accentSoft : 'transparent',
                    border:`1px solid ${yearFilter===k?C.accent:C.border}`,
                    color: yearFilter===k ? C.accent : C.muted,
                    fontSize:11, fontWeight: yearFilter===k?700:500,
                    fontFamily:font, cursor:'pointer' }}>
                  {l}
                </button>
              ))}
            </div>
            {nationalAvg!=null && (
              <div style={{ fontSize:11, color:C.subtle, marginBottom:10 }}>
                National avg: <strong style={{ color: scoreColor(nationalAvg) }}>{nationalAvg}%</strong>
                {yearFilter && <> · filtered to {yearFilter}</>}
              </div>
            )}
            {schoolsLoading ? (
              <div style={{ fontSize: 13, color: C.subtle }}>Loading…</div>
            ) : schools && schools.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {schools.map((s, i) => {
                  const wd = s.weekly_diff;
                  const wColor = wd==null ? null : wd>0 ? '#22c55e' : wd<0 ? '#ef4444' : C.subtle;
                  return (
                  <div key={s.school_name} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '9px 12px',
                    background: C.card2, border: `1px solid ${C.border}`, borderRadius: 8,
                  }}>
                    <div style={{ width: 24, textAlign: 'center', fontSize: 13, fontWeight: 800,
                      color: rankColor(i) ?? C.subtle, flexShrink: 0 }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: C.text,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.school_name}
                      </div>
                      <div style={{ fontSize: 11, color: C.subtle, marginTop: 1 }}>
                        {s.student_count} student{s.student_count !== 1 ? 's' : ''}
                        {nationalAvg!=null && (
                          <span style={{ marginLeft:6,
                            color: s.avg_score>nationalAvg ? '#22c55e' : s.avg_score<nationalAvg ? '#ef4444' : C.subtle }}>
                            {s.avg_score>nationalAvg?'+':''}{s.avg_score-nationalAvg} vs nat'l
                          </span>
                        )}
                      </div>
                    </div>
                    {wd!=null && wd!==0 && (
                      <div style={{ fontSize:11, fontWeight:700, color:wColor, flexShrink:0 }}>
                        {wd>0?'▲':'▼'}{Math.abs(wd)}
                      </div>
                    )}
                    <div style={{ fontSize: 20, fontWeight: 800, color: scoreColor(s.avg_score),
                      minWidth: 52, textAlign: 'right', flexShrink: 0 }}>
                      {s.avg_score}%
                    </div>
                  </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: C.subtle, lineHeight: 1.6 }}>
                No schools yet for this filter — opt in under Account → School leaderboard. Requires at least 3 students from the same school{yearFilter?` in ${yearFilter}`:''}.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
