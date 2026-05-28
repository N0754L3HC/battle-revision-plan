import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

function scoreColor(s) {
  if (s >= 80) return '#22c55e';
  if (s >= 65) return '#fbbf24';
  if (s >= 50) return '#f97316';
  return '#ef4444';
}

export default function FriendsView({ user, scores = [], uid, C, font, addToast }) {
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
  const schoolsFetchedRef = useRef(false);

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

  const loadSchools = useCallback(async () => {
    if (schoolsFetchedRef.current) return;
    schoolsFetchedRef.current = true;
    setSchoolsLoading(true);
    try {
      const token = await getToken();
      const r = await fetch('/api/school-leaderboard', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const d = await r.json();
      setSchools(d.schools ?? []);
    } catch {
      setSchools([]);
    }
    setSchoolsLoading(false);
  }, []);

  useEffect(() => { loadFriends(); }, [loadFriends]);

  const handleToggleSchools = () => {
    const next = !schoolsOpen;
    setSchoolsOpen(next);
    if (next) loadSchools();
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
                  color: i === 0 ? '#fbbf24' : i === 1 ? '#9ca3af' : i === 2 ? '#b5735a' : C.subtle, flexShrink: 0 }}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
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
            {schoolsLoading ? (
              <div style={{ fontSize: 13, color: C.subtle }}>Loading…</div>
            ) : schools && schools.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {schools.map((s, i) => (
                  <div key={s.school_name} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '9px 12px',
                    background: C.card2, border: `1px solid ${C.border}`, borderRadius: 8,
                  }}>
                    <div style={{ width: 24, textAlign: 'center', fontSize: 13, fontWeight: 800,
                      color: i === 0 ? '#fbbf24' : i === 1 ? '#9ca3af' : i === 2 ? '#b5735a' : C.subtle, flexShrink: 0 }}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: C.text,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.school_name}
                      </div>
                      <div style={{ fontSize: 11, color: C.subtle, marginTop: 1 }}>
                        {s.student_count} student{s.student_count !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: scoreColor(s.avg_score),
                      minWidth: 52, textAlign: 'right', flexShrink: 0 }}>
                      {s.avg_score}%
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: C.subtle, lineHeight: 1.6 }}>
                No schools yet — opt in under Account → School leaderboard. Requires at least 3 students from the same school.
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
