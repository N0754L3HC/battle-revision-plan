import { useState } from 'react';
import { SUBJECT_CATALOG } from '../data/subjects';
import { supabase } from '../lib/supabase';

const font = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

const colors = {
  bg:      '#e8e4dd',
  surface: '#f0ece5',
  border:  'rgba(0,0,0,0.09)',
  text:    '#2b2b2b',
  muted:   '#7a7268',
  subtle:  '#9a9490',
  accent:  '#b5735a',
};

const MAX_SUBJECTS = 4;

function SubjectBadge({ subject, size = 32 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 8,
      background: `${subject.color}18`,
      border: `1px solid ${subject.color}30`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size < 28 ? 9 : 11, fontWeight: 700, color: subject.color,
      fontFamily: font, flexShrink: 0,
    }}>
      {subject.abbr}
    </div>
  );
}

function PickSubjects({ selection, onChange }) {
  const selectedIds = selection.map(s => s.subjectId);
  const atMax = selectedIds.length >= MAX_SUBJECTS;

  const toggle = id => {
    if (selectedIds.includes(id)) {
      onChange(selection.filter(s => s.subjectId !== id));
    } else {
      if (atMax) return;
      const subject = SUBJECT_CATALOG.find(s => s.id === id);
      onChange([...selection, { subjectId: id, boardId: subject.boards[0].id }]);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: colors.text, margin: '0 0 6px', fontFamily: font }}>
          Which subjects are you studying?
        </h2>
        <p style={{ fontSize: 13, color: colors.muted, margin: 0, fontFamily: font }}>
          Select 2 to 4 subjects. You can change these later.{' '}
          <span style={{
            fontSize: 12, fontWeight: 600,
            color: atMax ? colors.accent : colors.muted,
          }}>
            {selectedIds.length}/{MAX_SUBJECTS} selected
          </span>
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))',
        gap: 8,
      }}>
        {SUBJECT_CATALOG.map(s => {
          const selected = selectedIds.includes(s.id);
          const locked   = atMax && !selected;
          return (
            <button
              key={s.id}
              onClick={() => toggle(s.id)}
              disabled={locked}
              style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '14px 14px 12px',
                background: selected ? `${s.color}10` : 'rgba(0,0,0,0.02)',
                border: `1.5px solid ${selected ? s.color + '66' : locked ? 'rgba(0,0,0,0.03)' : colors.border}`,
                borderRadius: 10, cursor: locked ? 'not-allowed' : 'pointer',
                textAlign: 'left', transition: 'border-color 0.12s, background 0.12s',
                opacity: locked ? 0.3 : 1,
                position: 'relative',
              }}
            >
              {selected && (
                <div style={{
                  position: 'absolute', top: 8, right: 8,
                  width: 16, height: 16, borderRadius: '50%',
                  background: s.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, color: '#fff', fontWeight: 800,
                }}>
                  ✓
                </div>
              )}
              <SubjectBadge subject={s} size={32} />
              <span style={{
                marginTop: 10,
                fontSize: 13, fontWeight: 600,
                color: selected ? colors.text : '#7a7268',
                fontFamily: font, lineHeight: 1.3,
              }}>
                {s.name}
              </span>
              {s.popular && !selected && (
                <span style={{
                  marginTop: 5, fontSize: 10, fontWeight: 500,
                  color: colors.subtle,
                  fontFamily: font,
                }}>
                  Popular
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PickBoards({ selection, onChange }) {
  const update = (subjectId, boardId) => {
    onChange(selection.map(s => s.subjectId === subjectId ? { ...s, boardId } : s));
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: colors.text, margin: '0 0 6px', fontFamily: font }}>
          Which exam board are you with?
        </h2>
        <p style={{ fontSize: 13, color: colors.muted, margin: 0, fontFamily: font }}>
          This sets the right papers and grade boundaries for you.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {selection.map(({ subjectId, boardId }) => {
          const subject = SUBJECT_CATALOG.find(s => s.id === subjectId);
          if (!subject) return null;
          return (
            <div key={subjectId} style={{
              background: 'rgba(0,0,0,0.02)',
              border: `1px solid ${colors.border}`,
              borderRadius: 10, padding: '16px 18px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <SubjectBadge subject={subject} size={28} />
                <span style={{ fontSize: 14, fontWeight: 600, color: colors.text, fontFamily: font }}>
                  {subject.name}
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {subject.boards.map(b => (
                  <button
                    key={b.id}
                    onClick={() => update(subjectId, b.id)}
                    style={{
                      padding: '6px 12px',
                      background: boardId === b.id ? `${subject.color}14` : 'rgba(0,0,0,0.03)',
                      border: `1.5px solid ${boardId === b.id ? subject.color + '55' : colors.border}`,
                      borderRadius: 6,
                      color: boardId === b.id ? colors.text : colors.muted,
                      fontSize: 12, fontWeight: boardId === b.id ? 600 : 400,
                      fontFamily: font, cursor: 'pointer', transition: 'all 0.12s',
                    }}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Confirm({ selection }) {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: colors.text, margin: '0 0 6px', fontFamily: font }}>
          You are all set
        </h2>
        <p style={{ fontSize: 13, color: colors.muted, margin: 0, fontFamily: font }}>
          Here is your subject lineup. Start logging past papers to build your readiness score.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {selection.map(({ subjectId, boardId }) => {
          const subject = SUBJECT_CATALOG.find(s => s.id === subjectId);
          if (!subject) return null;
          const board = subject.boards.find(b => b.id === boardId) || subject.boards[0];
          return (
            <div key={subjectId} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 16px',
              background: `${subject.color}08`,
              border: `1px solid ${subject.color}25`,
              borderRadius: 10,
            }}>
              <div style={{
                width: 3, height: 36, borderRadius: 2,
                background: subject.color, flexShrink: 0,
              }}/>
              <SubjectBadge subject={subject} size={28} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: colors.text, fontFamily: font }}>
                  {subject.name}
                </div>
                <div style={{ fontSize: 12, color: colors.muted, fontFamily: font, marginTop: 2 }}>
                  {board.name}
                </div>
              </div>
              <div style={{
                fontSize: 11, fontWeight: 600, color: subject.color,
                background: `${subject.color}14`,
                border: `1px solid ${subject.color}30`,
                padding: '3px 8px', borderRadius: 4,
              }}>
                A* at {subject.gradeBoundaries['A*']}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SubjectPicker({ user, onComplete }) {
  const [step, setStep] = useState(1);
  const [selection, setSelection] = useState([]);
  const [saving, setSaving] = useState(false);

  const canNext = step === 1
    ? selection.length >= 2
    : step === 2
      ? selection.every(s => s.boardId)
      : true;

  const handleNext = async () => {
    if (step < 3) { setStep(step + 1); return; }
    setSaving(true);
    const subjectsJson = JSON.stringify(selection);
    // Always save to localStorage as backup
    try { localStorage.setItem('rbp_subjects', subjectsJson); } catch(_) {}
    if (user) {
      try {
        await supabase.from('user_profiles')
          .upsert({ id: user.id, subjects: subjectsJson }, { onConflict: 'id' });
      } catch(_) {}
    }
    setSaving(false);
    onComplete(selection);
  };

  const STEP_LABELS = ['Subjects', 'Exam boards', 'Ready'];

  return (
    <div style={{
      minHeight: '100vh', background: colors.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: font, padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 640 }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 36 }}>
          <div style={{
            width: 26, height: 26, borderRadius: 6,
            background: colors.accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 900, fontSize: 11, color: '#fff',
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            A*
          </div>
          <span style={{ fontSize: 14, fontWeight: 600, color: colors.text, letterSpacing: 0.2 }}>
            Battle Plan
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32 }}>
          {STEP_LABELS.map((label, i) => {
            const n      = i + 1;
            const done   = step > n;
            const active = step === n;
            return (
              <div key={n} style={{ display: 'flex', alignItems: 'center', flex: i < 2 ? 1 : 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: done ? colors.accent : active ? 'rgba(181,115,90,0.12)' : 'rgba(0,0,0,0.04)',
                    border: `1.5px solid ${done || active ? colors.accent : colors.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700,
                    color: done ? '#fff' : active ? colors.accent : colors.subtle,
                    transition: 'all 0.2s',
                  }}>
                    {done ? '✓' : n}
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: active ? 600 : 400,
                    color: active ? colors.text : colors.muted,
                    whiteSpace: 'nowrap',
                  }}>
                    {label}
                  </span>
                </div>
                {i < 2 && (
                  <div style={{
                    flex: 1, height: 1, margin: '0 8px', marginBottom: 20,
                    background: done ? colors.accent : colors.border,
                    transition: 'background 0.2s',
                  }}/>
                )}
              </div>
            );
          })}
        </div>

        <div style={{
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: 14, padding: '28px 28px 24px',
          marginBottom: 12,
        }}>
          {step === 1 && <PickSubjects selection={selection} onChange={setSelection} />}
          {step === 2 && <PickBoards  selection={selection} onChange={setSelection} />}
          {step === 3 && <Confirm     selection={selection} />}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              style={{
                flex: 1, padding: '12px 0',
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                borderRadius: 8, color: colors.muted,
                fontSize: 14, fontFamily: font, cursor: 'pointer',
              }}
            >
              Back
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={!canNext || saving}
            style={{
              flex: 2, padding: '12px 0',
              background: canNext ? colors.accent : 'rgba(239,68,68,0.15)',
              border: 'none', borderRadius: 8,
              color: canNext ? '#fff' : 'rgba(239,68,68,0.4)',
              fontSize: 14, fontWeight: 600, fontFamily: font,
              cursor: canNext ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s',
            }}
          >
            {saving ? 'Saving...' : step === 3 ? 'Start tracking' : 'Continue'}
          </button>
        </div>

        <p style={{ fontSize: 11, color: colors.subtle, textAlign: 'center', marginTop: 14, fontFamily: font }}>
          You can update your subjects any time in Settings.
        </p>
      </div>
    </div>
  );
}
