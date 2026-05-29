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

// Extract a 4-8 char alphanumeric code from a pasted link or raw string
function extractCode(raw) {
  const s = (raw || '').trim().toUpperCase();
  if (!s) return '';
  const m = s.match(/\/J\/([A-Z0-9]{4,8})/) || s.match(/^([A-Z0-9]{4,8})$/);
  return m ? m[1] : '';
}

export default function SquadsView({ user, scores = [], uid, C, font, addToast }) {
  const [squads, setSquads]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [joinInput, setJoinInput] = useState('');
  const [joining, setJoining]     = useState(false);
  const [expanded, setExpanded]   = useState(null);
  const [displayName, setDisplayName] = useState(user?.email?.split('@')[0] || 'You');
  const [editName, setEditName]   = useState(false);
  const [nameDraft, setNameDraft] = useState('');

  const [schools, setSchools]     = useState(null);
  const [schoolsLoading, setSchoolsLoading] = useState(false);
  const [schoolsOpen, setSchoolsOpen] = useState(false);
  const [yearFilter, setYearFilter] = useState('');
  const [nationalAvg, setNationalAvg] = useState(null);
  const schoolsFetchedRef = useRef({});
  const autoCreatedRef = useRef(false);

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
    if (!d.error) setSquads(d.groups ?? []);
    setLoading(false);
    return d.groups ?? [];
  }, [apiFetch]);

  // Initial load + auto-create personal squad on first visit
  useEffect(() => {
    (async () => {
      const list = await load();
      if (list.length === 0 && !autoCreatedRef.current) {
        autoCreatedRef.current = true;
        const name = `${displayName || 'My'}'s squad`;
        const d = await apiFetch('POST', { action: 'create', name });
        if (d.group) load();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pull display name + auto-join any pending code from sessionStorage
  useEffect(() => {
    if (!uid) return;
    supabase.from('user_profiles').select('display_name').eq('id', uid).single()
      .then(({ data }) => { if (data?.display_name) setDisplayName(data.display_name); });

    const pending = sessionStorage.getItem('rbp_join_code');
    if (pending) {
      sessionStorage.removeItem('rbp_join_code');
      (async () => {
        const d = await apiFetch('POST', { action: 'join', invite_code: pending });
        if (d.group) { addToast(`Joined "${d.group.name}"`, 'success'); load(); }
        else if (d.error && d.error !== 'Already in this group') addToast(d.error, 'error');
      })();
    }
  }, [uid, apiFetch, addToast, load]);

  const handleJoin = async () => {
    const code = extractCode(joinInput);
    if (!code) { addToast('Paste a squad link or 6-character code', 'error'); return; }
    setJoining(true);
    const d = await apiFetch('POST', { action: 'join', invite_code: code });
    if (d.group) { setJoinInput(''); addToast(`Joined "${d.group.name}"`, 'success'); load(); }
    else addToast(d.error || 'No squad found with that code', 'error');
    setJoining(false);
  };

  const handleInvite = async (squad) => {
    const url  = `${APP_ORIGIN}/j/${squad.invite_code}`;
    const text = `Join my Battle Plan squad "${squad.name}" and compare exam scores`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Join my squad', text, url });
        return;
      }
    } catch (e) {
      if (e?.name === 'AbortError') return;
    }
    try {
      await navigator.clipboard.writeText(url);
      addToast('Invite link copied', 'success');
    } catch {
      addToast(`Share this link: ${url}`, 'info');
    }
  };

  const handleLeave = async (group_id, name) => {
    const d = await apiFetch('POST', { action: 'leave', group_id });
    if (d.ok) { addToast(`Left "${name}"`, 'info'); load(); }
    else addToast(d.error || 'Failed', 'error');
  };

  const saveDisplayName = async () => {
    const name = nameDraft.trim() || user?.email?.split('@')[0] || 'You';
    setDisplayName(name);
    setEditName(false);
    await supabase.from('user_profiles').update({ display_name: name }).eq('id', uid);
    addToast('Display name updated', 'success');
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

      {/* Header + display name */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 2 }}>Squads</div>
          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
            Share an invite link with your mates. Anyone with the link can join.
          </div>
        </div>
        {editName ? (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input value={nameDraft} onChange={e => setNameDraft(e.target.value)} maxLength={20}
              autoFocus onKeyDown={e => e.key === 'Enter' && saveDisplayName()}
              style={{ background: C.card2, border: `1px solid ${C.border}`, borderRadius: 5,
                padding: '4px 8px', color: C.text, fontSize: 12, fontFamily: font, outline: 'none', width: 110 }} />
            <button onClick={saveDisplayName}
              style={{ padding: '4px 10px', background: C.accent, border: 'none', borderRadius: 5,
                color: '#fff', fontSize: 11, fontWeight: 700, fontFamily: font, cursor: 'pointer' }}>
              Save
            </button>
            <button onClick={() => setEditName(false)}
              style={{ padding: '4px 8px', background: 'transparent', border: `1px solid ${C.border}`,
                borderRadius: 5, color: C.muted, fontSize: 11, fontFamily: font, cursor: 'pointer' }}>
              ✕
            </button>
          </div>
        ) : (
          <button onClick={() => { setNameDraft(displayName); setEditName(true); }}
            style={{ fontSize: 11, color: C.muted, background: 'transparent',
              border: `1px solid ${C.border}`, borderRadius: 5, padding: '4px 9px',
              fontFamily: font, cursor: 'pointer' }}>
            {displayName} · edit
          </button>
        )}
      </div>

      {/* Join with link or code */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 16px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase',
          letterSpacing: 0.5, marginBottom: 8 }}>
          Join a squad
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={joinInput} onChange={e => setJoinInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !joining && handleJoin()}
            placeholder="Paste invite link or 6-char code"
            style={{ flex: 1, background: C.card2, border: `1px solid ${C.border}`, borderRadius: 8,
              padding: '10px 12px', color: C.text, fontSize: 13, fontFamily: font, outline: 'none' }} />
          <button onClick={handleJoin} disabled={joining || !extractCode(joinInput)}
            style={{ padding: '10px 18px', borderRadius: 8, fontFamily: font, fontSize: 13, fontWeight: 700,
              cursor: joining || !extractCode(joinInput) ? 'not-allowed' : 'pointer',
              background: joining || !extractCode(joinInput) ? C.card2 : C.accent,
              border: `1px solid ${joining || !extractCode(joinInput) ? C.border : C.accent}`,
              color: joining || !extractCode(joinInput) ? C.muted : '#fff' }}>
            {joining ? '…' : 'Join'}
          </button>
        </div>
      </div>

      {/* Squads list */}
      {loading ? (
        <div style={{ fontSize: 13, color: C.subtle, padding: '4px 0' }}>Loading…</div>
      ) : squads.length === 0 ? (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
          padding: '20px', textAlign: 'center', fontSize: 13, color: C.subtle, lineHeight: 1.6 }}>
          You're not in any squads yet. Setting one up…
        </div>
      ) : (
        squads.map(g => {
          const isOpen = expanded === g.id;
          const top5 = g.members.slice(0, 5);
          const rest = g.members.slice(5);
          const visible = isOpen ? g.members : top5;
          return (
            <div key={g.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>

              {/* Header with name + invite + leave */}
              <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.border}`,
                display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</div>
                  <div style={{ fontSize: 11, color: C.subtle, marginTop: 2 }}>
                    {g.members.length} member{g.members.length !== 1 ? 's' : ''}
                    {' · '}
                    <span style={{ fontFamily: "'JetBrains Mono','SF Mono',monospace", letterSpacing: 1, color: C.muted }}>
                      {g.invite_code}
                    </span>
                  </div>
                </div>
                <button onClick={() => handleInvite(g)}
                  style={{ padding: '7px 14px', background: C.accent, border: 'none', borderRadius: 7,
                    color: '#fff', fontSize: 12, fontWeight: 700, fontFamily: font, cursor: 'pointer',
                    flexShrink: 0 }}>
                  Invite
                </button>
                <button onClick={() => handleLeave(g.id, g.name)} title="Leave squad"
                  style={{ padding: '7px 10px', background: 'transparent', border: `1px solid ${C.border}`,
                    borderRadius: 7, color: C.muted, fontSize: 12, fontFamily: font, cursor: 'pointer',
                    flexShrink: 0 }}>
                  Leave
                </button>
              </div>

              {/* Inline leaderboard */}
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
                {rest.length > 0 && (
                  <button onClick={() => setExpanded(isOpen ? null : g.id)}
                    style={{ padding: '6px 0', background: 'transparent', border: 'none',
                      color: C.muted, fontSize: 11, fontFamily: font, cursor: 'pointer', fontWeight: 600 }}>
                    {isOpen ? 'Show top 5' : `Show all ${g.members.length}`}
                  </button>
                )}
              </div>
            </div>
          );
        })
      )}

      {/* School leaderboard — kept as-is */}
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
