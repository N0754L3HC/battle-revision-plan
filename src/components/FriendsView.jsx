import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

function scoreColor(s) {
  if (s >= 80) return '#22c55e';
  if (s >= 65) return '#fbbf24';
  if (s >= 50) return '#f97316';
  return '#ef4444';
}

function rankColor(i) {
  return i === 0 ? '#fbbf24' : i === 1 ? '#9ca3af' : i === 2 ? '#b5735a' : null;
}

// ── Groups panel ─────────────────────────────────────────────────────────────
function GroupsPanel({ C, font, addToast }) {
  const [groups, setGroups]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [createName, setCreateName] = useState('');
  const [joinCode,   setJoinCode]   = useState('');
  const [creating, setCreating]   = useState(false);
  const [joining,  setJoining]    = useState(false);
  const [expanded, setExpanded]   = useState(null); // group id

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

  const handleCreate = async () => {
    const name = createName.trim();
    if (!name) return;
    setCreating(true);
    const d = await apiFetch('POST', { action: 'create', name });
    if (d.group) { setCreateName(''); addToast(`Group "${d.group.name}" created`, 'success'); load(); }
    else addToast(d.error || 'Failed to create group', 'error');
    setCreating(false);
  };

  const handleJoin = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setJoining(true);
    const d = await apiFetch('POST', { action: 'join', invite_code: code });
    if (d.group) { setJoinCode(''); addToast(`Joined "${d.group.name}"`, 'success'); load(); }
    else addToast(d.error || 'No group found with that code', 'error');
    setJoining(false);
  };

  const handleLeave = async (group_id, name) => {
    const d = await apiFetch('POST', { action: 'leave', group_id });
    if (d.ok) { addToast(`Left "${name}"`, 'info'); load(); }
    else addToast(d.error || 'Failed', 'error');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Create + Join row */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }}>Create a group</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input value={createName} onChange={e => setCreateName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !creating && handleCreate()}
              placeholder="Group name"
              style={{ flex: 1, background: C.card2, border: `1px solid ${C.border}`, borderRadius: 7,
                padding: '9px 11px', color: C.text, fontSize: 12, fontFamily: font, outline: 'none' }} />
            <button onClick={handleCreate} disabled={creating || !createName.trim()}
              style={{ padding: '9px 14px', background: creating || !createName.trim() ? C.card2 : C.accent,
                border: `1px solid ${creating || !createName.trim() ? C.border : C.accent}`,
                borderRadius: 7, color: creating || !createName.trim() ? C.muted : '#fff',
                fontSize: 12, fontWeight: 600, fontFamily: font, cursor: creating || !createName.trim() ? 'not-allowed' : 'pointer' }}>
              {creating ? '…' : 'Create'}
            </button>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }}>Join with code</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && !joining && handleJoin()}
              placeholder="e.g. XK7F2A" maxLength={6}
              style={{ flex: 1, background: C.card2, border: `1px solid ${C.border}`, borderRadius: 7,
                padding: '9px 11px', color: C.text, fontSize: 12, fontFamily: font, outline: 'none',
                fontFamily: "'JetBrains Mono','SF Mono',monospace", letterSpacing: 2 }} />
            <button onClick={handleJoin} disabled={joining || joinCode.trim().length < 4}
              style={{ padding: '9px 14px', background: joining || joinCode.trim().length < 4 ? C.card2 : C.accent,
                border: `1px solid ${joining || joinCode.trim().length < 4 ? C.border : C.accent}`,
                borderRadius: 7, color: joining || joinCode.trim().length < 4 ? C.muted : '#fff',
                fontSize: 12, fontWeight: 600, fontFamily: font, cursor: joining || joinCode.trim().length < 4 ? 'not-allowed' : 'pointer' }}>
              {joining ? '…' : 'Join'}
            </button>
          </div>
        </div>
      </div>

      {/* Groups list */}
      {loading ? (
        <div style={{ fontSize: 13, color: C.subtle, padding: '4px 0' }}>Loading…</div>
      ) : groups.length === 0 ? (
        <div style={{ fontSize: 12, color: C.subtle, lineHeight: 1.6, padding: '4px 0' }}>
          Create a group or join one with an invite code to compare scores with your class or study group.
        </div>
      ) : (
        groups.map(g => {
          const isOpen = expanded === g.id;
          return (
            <div key={g.id} style={{ background: C.card2, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
              {/* Group header */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '13px 14px', cursor: 'pointer', gap: 10 }}
                onClick={() => setExpanded(isOpen ? null : g.id)}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{g.name}</div>
                  <div style={{ fontSize: 11, color: C.subtle, marginTop: 2 }}>
                    {g.members.length} member{g.members.length !== 1 ? 's' : ''}
                    &nbsp;·&nbsp;Code: <span style={{ fontFamily: "'JetBrains Mono',monospace", letterSpacing: 1, color: C.accent }}>{g.invite_code}</span>
                  </div>
                </div>
                <span style={{ fontSize: 12, color: C.muted }}>{isOpen ? '▲' : '▼'}</span>
              </div>

              {isOpen && (
                <div style={{ borderTop: `1px solid ${C.border}`, padding: '12px 14px' }}>
                  {/* Invite code copy */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
                    padding: '9px 12px', background: `${C.accent}0d`, borderRadius: 7,
                    border: `1px solid ${C.accent}33` }}>
                    <span style={{ fontSize: 12, color: C.muted, flex: 1 }}>
                      Share code: <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: C.accent, letterSpacing: 2 }}>{g.invite_code}</span>
                    </span>
                    <button onClick={() => { navigator.clipboard?.writeText(g.invite_code); addToast('Code copied', 'success'); }}
                      style={{ padding: '4px 10px', background: C.accent, border: 'none', borderRadius: 5,
                        color: '#fff', fontSize: 11, fontWeight: 600, fontFamily: font, cursor: 'pointer' }}>
                      Copy
                    </button>
                  </div>

                  {/* Leaderboard */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 10 }}>
                    {g.members.map((m, i) => (
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
                  </div>

                  <button onClick={() => handleLeave(g.id, g.name)}
                    style={{ padding: '5px 12px', background: 'transparent',
                      border: `1px solid ${C.border}`, borderRadius: 6,
                      color: C.muted, fontSize: 11, fontFamily: font, cursor: 'pointer' }}>
                    Leave group
                  </button>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

// ── Main FriendsView ─────────────────────────────────────────────────────────
export default function FriendsView({ user, scores = [], uid, C, font, addToast }) {
  const [tab, setTab] = useState('friends'); // 'friends' | 'groups'

  const [loading, setLoading]     = useState(true);
  const [friends, setFriends]     = useState([]);
  const [pending, setPending]     = useState([]);
  const [sent,    setSent]        = useState([]);
  const [addEmail,  setAddEmail]  = useState('');
  const [adding,    setAdding]    = useState(false);
  const [displayName, setDisplayName] = useState(user?.email?.split('@')[0] || 'You');
  const [editName,  setEditName]  = useState(false);
  const [nameDraft, setNameDraft] = useState('');

  const [schools, setSchools]     = useState(null);
  const [schoolsLoading, setSchoolsLoading] = useState(false);
  const [schoolsOpen, setSchoolsOpen] = useState(false);
  const [yearFilter, setYearFilter] = useState('');
  const [nationalAvg, setNationalAvg] = useState(null);
  const schoolsFetchedRef = useRef({});

  const ownScore = scores.length
    ? Math.round(scores.reduce((s, x) => s + (x.pct ?? 0), 0) / scores.length)
    : 0;

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  };

  const apiFetch = useCallback(async (method, body) => {
    const token = await getToken();
    if (!token) return { error: 'Not signed in' };
    const r = await fetch('/api/friends', {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return r.json();
  }, []);

  const loadFriends = useCallback(async () => {
    setLoading(true);
    try {
      const d = await apiFetch('GET');
      if (!d.error) {
        setFriends(d.friends ?? []);
        setPending(d.pending ?? []);
        setSent(d.sent ?? []);
      }
    } catch {}
    setLoading(false);
  }, [apiFetch]);

  const loadSchools = useCallback(async (yr='') => {
    const cacheKey = yr || 'all';
    if (schoolsFetchedRef.current[cacheKey]) return;
    schoolsFetchedRef.current[cacheKey] = true;
    setSchoolsLoading(true);
    try {
      const token = await getToken();
      const url = yr ? `/api/school-leaderboard?year=${yr}` : '/api/school-leaderboard';
      const r = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const d = await r.json();
      setSchools(d.schools ?? []);
      if (d.national_avg!=null) setNationalAvg(d.national_avg);
    } catch {
      setSchools([]);
    }
    setSchoolsLoading(false);
  }, []);

  useEffect(() => { loadFriends(); }, [loadFriends]);

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

  useEffect(() => {
    if (!uid) return;
    supabase.from('user_profiles').select('display_name').eq('id', uid).single()
      .then(({ data }) => { if (data?.display_name) setDisplayName(data.display_name); });
  }, [uid]);

  const sendRequest = async () => {
    const email = addEmail.trim();
    if (!email) return;
    setAdding(true);
    const d = await apiFetch('POST', { action: 'send', email });
    if (d.ok) {
      setAddEmail('');
      addToast('Friend request sent', 'success');
      loadFriends();
    } else {
      addToast(d.error || 'Failed to send request', 'error');
    }
    setAdding(false);
  };

  const accept = async (id) => {
    const d = await apiFetch('POST', { action: 'accept', requestId: id });
    if (d.ok) { addToast('Friend added', 'success'); loadFriends(); }
    else addToast(d.error || 'Failed', 'error');
  };

  const decline = async (id) => {
    const d = await apiFetch('POST', { action: 'decline', requestId: id });
    if (d.ok) loadFriends();
    else addToast(d.error || 'Failed', 'error');
  };

  const removeFriend = async (friendUserId) => {
    const d = await apiFetch('POST', { action: 'remove', friendUserId });
    if (d.ok) { addToast('Friend removed', 'info'); loadFriends(); }
    else addToast(d.error || 'Failed', 'error');
  };

  const saveDisplayName = async () => {
    const name = nameDraft.trim() || user?.email?.split('@')[0] || 'You';
    setDisplayName(name);
    setEditName(false);
    await supabase.from('user_profiles').update({ display_name: name }).eq('id', uid);
    addToast('Display name updated', 'success');
  };

  const ownEntry = { user_id: uid, display_name: displayName, leaderboard_score: ownScore, papers_count: scores.length, isMe: true };
  const allEntries = [ownEntry, ...friends].sort((a, b) => b.leaderboard_score - a.leaderboard_score);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Tab row */}
      <div style={{ display: 'flex', gap: 0, background: C.card2, borderRadius: 9, padding: 3,
        alignSelf: 'flex-start', border: `1px solid ${C.border}` }}>
        {[['friends','Friends'],['groups','Private Groups']].map(([t, lbl]) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '7px 18px', borderRadius: 7, border: 'none',
              background: tab === t ? C.surface : 'transparent',
              color: tab === t ? C.text : C.muted,
              fontSize: 12, fontWeight: tab === t ? 700 : 400, fontFamily: font, cursor: 'pointer',
              boxShadow: tab === t ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
              transition: 'all 0.15s' }}>
            {lbl}
          </button>
        ))}
      </div>

      {tab === 'groups' ? (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '18px 20px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 }}>
            Private Study Groups
          </div>
          <GroupsPanel C={C} font={font} addToast={addToast} />
        </div>
      ) : (
        <>
          {/* Leaderboard */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Friends leaderboard
              </div>
              {editName ? (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input value={nameDraft} onChange={e => setNameDraft(e.target.value)} maxLength={20}
                    autoFocus onKeyDown={e => e.key === 'Enter' && saveDisplayName()}
                    style={{ background: C.card2, border: `1px solid ${C.border}`, borderRadius: 5,
                      padding: '4px 8px', color: C.text, fontSize: 12, fontFamily: font,
                      outline: 'none', width: 110 }} />
                  <button onClick={saveDisplayName}
                    style={{ padding: '4px 10px', background: C.accent, border: 'none',
                      borderRadius: 5, color: '#fff', fontSize: 11, fontWeight: 700, fontFamily: font, cursor: 'pointer' }}>
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
                  Edit name
                </button>
              )}
            </div>

            {loading ? (
              <div style={{ fontSize: 13, color: C.subtle, padding: '8px 0' }}>Loading…</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {allEntries.map((e, i) => (
                  <div key={e.user_id} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                    background: e.isMe ? C.accentSoft : C.card2,
                    border: `1px solid ${e.isMe ? C.accent + '44' : C.border}`,
                    borderRadius: 8,
                  }}>
                    <div style={{ width: 24, textAlign: 'center', fontSize: 14, fontWeight: 800,
                      color: rankColor(i) ?? C.subtle, flexShrink: 0 }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: e.isMe ? 700 : 500, color: C.text,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {e.display_name}{e.isMe ? ' (you)' : ''}
                      </div>
                      <div style={{ fontSize: 11, color: C.subtle, marginTop: 1 }}>
                        {e.papers_count} paper{e.papers_count !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: scoreColor(e.leaderboard_score),
                      minWidth: 52, textAlign: 'right', flexShrink: 0 }}>
                      {e.leaderboard_score}%
                    </div>
                    {!e.isMe && (
                      <button onClick={() => removeFriend(e.user_id)} title="Remove friend"
                        style={{ background: 'transparent', border: 'none', color: C.subtle,
                          cursor: 'pointer', fontSize: 13, padding: '2px 4px', flexShrink: 0, lineHeight: 1 }}>
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!loading && allEntries.length === 1 && (
              <div style={{ fontSize: 12, color: C.subtle, marginTop: 10, lineHeight: 1.6 }}>
                Add friends to compare scores. Your score updates every time you log a paper.
              </div>
            )}
          </div>

          {/* Incoming pending requests */}
          {pending.length > 0 && (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '18px 20px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase',
                letterSpacing: 0.5, marginBottom: 12 }}>
                Friend requests ({pending.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pending.map(r => (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', background: C.card2, border: `1px solid ${C.border}`, borderRadius: 8 }}>
                    <div style={{ flex: 1, fontSize: 13, color: C.text, fontWeight: 500,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.from_email}
                    </div>
                    <button onClick={() => accept(r.id)}
                      style={{ padding: '5px 12px', background: C.accent, border: 'none',
                        borderRadius: 6, color: '#fff', fontSize: 12, fontWeight: 600,
                        fontFamily: font, cursor: 'pointer', flexShrink: 0 }}>
                      Accept
                    </button>
                    <button onClick={() => decline(r.id)}
                      style={{ padding: '5px 10px', background: 'transparent',
                        border: `1px solid ${C.border}`, borderRadius: 6, color: C.muted,
                        fontSize: 12, fontFamily: font, cursor: 'pointer', flexShrink: 0 }}>
                      Decline
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add friend */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '18px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase',
              letterSpacing: 0.5, marginBottom: 10 }}>
              Add a friend
            </div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 12, lineHeight: 1.6 }}>
              Enter their Battle Plan account email. They need to have signed up first.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={addEmail}
                onChange={e => setAddEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !adding && sendRequest()}
                placeholder="friend@email.com"
                type="email"
                style={{ flex: 1, background: C.card2, border: `1px solid ${C.border}`, borderRadius: 8,
                  padding: '10px 12px', color: C.text, fontSize: 13, fontFamily: font, outline: 'none' }}
              />
              <button onClick={sendRequest} disabled={adding || !addEmail.trim()}
                style={{ padding: '10px 18px', borderRadius: 8, fontFamily: font,
                  fontSize: 13, fontWeight: 600, cursor: adding || !addEmail.trim() ? 'not-allowed' : 'pointer',
                  background: adding || !addEmail.trim() ? C.card2 : C.accent,
                  border: `1px solid ${adding || !addEmail.trim() ? C.border : C.accent}`,
                  color: adding || !addEmail.trim() ? C.muted : '#fff', flexShrink: 0 }}>
                {adding ? '…' : 'Add'}
              </button>
            </div>
            {sent.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 11, color: C.subtle, marginBottom: 7, textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 600 }}>
                  Awaiting response
                </div>
                {sent.map(r => (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8,
                    fontSize: 12, color: C.muted, padding: '3px 0' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.accent,
                      flexShrink: 0, display: 'inline-block' }} />
                    {r.to_email}
                  </div>
                ))}
              </div>
            )}
          </div>

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
                {/* Year-group filter chips */}
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
        </>
      )}
    </div>
  );
}
