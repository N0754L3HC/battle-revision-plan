import { useState } from 'react';
import { SUBJECT_CATALOG, GCSE_CATALOG } from '../data/subjects';
import { supabase } from '../lib/supabase';
import TermsOfService from './TermsOfService';

const TERMS_VERSION = '2026-05-31';

const font = "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif";

const colors = {
  bg:      '#e8e4dd',
  surface: '#f0ece5',
  border:  'rgba(0,0,0,0.09)',
  text:    '#2b2b2b',
  muted:   '#7a7268',
  subtle:  '#9a9490',
  accent:  '#b5735a',
};

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

function PickSubjects({ selection, onChange, catalog, maxSubjects }) {
  const selectedIds = selection.map(s => s.subjectId);
  const atMax = selectedIds.length >= maxSubjects;

  const toggle = id => {
    if (selectedIds.includes(id)) {
      onChange(selection.filter(s => s.subjectId !== id));
    } else {
      if (atMax) return;
      const subject = catalog.find(s => s.id === id);
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
          Select {maxSubjects <= 4 ? '2 to 4' : 'up to ' + maxSubjects} subjects. You can change these later.{' '}
          <span style={{
            fontSize: 12, fontWeight: 600,
            color: atMax ? colors.accent : colors.muted,
          }}>
            {selectedIds.length}/{maxSubjects} selected
          </span>
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))',
        gap: 8,
      }}>
        {catalog.map(s => {
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

const FM_OPTIONS = {
  edexcel: [
    { code: '3A', label: 'Further Pure Mathematics 1' },
    { code: '3B', label: 'Further Statistics 1' },
    { code: '3C', label: 'Further Mechanics 1' },
    { code: '3D', label: 'Decision Mathematics 1' },
    { code: '4A', label: 'Further Pure Mathematics 2' },
    { code: '4B', label: 'Further Statistics 2' },
    { code: '4C', label: 'Further Mechanics 2' },
    { code: '4D', label: 'Decision Mathematics 2' },
  ],
  aqa: [
    { code: 'OA', label: 'Mechanics (Paper 2)' },
    { code: 'OB', label: 'Statistics / Discrete (Paper 3)' },
  ],
  'ocr-a': [
    { code: 'Y533', label: 'Mechanics (Y533)' },
    { code: 'Y532', label: 'Statistics (Y532)' },
    { code: 'Y534', label: 'Discrete Maths (Y534)' },
    { code: 'Y535', label: 'Numerical Methods (Y535)' },
  ],
};

function PickBoards({ selection, onChange, catalog }) {
  const update = (subjectId, boardId) => {
    onChange(selection.map(s => s.subjectId === subjectId ? { ...s, boardId, options: [] } : s));
  };
  const toggleOption = (subjectId, code) => {
    onChange(selection.map(s => {
      if (s.subjectId !== subjectId) return s;
      const opts = s.options || [];
      return { ...s, options: opts.includes(code) ? opts.filter(o => o !== code) : [...opts, code] };
    }));
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
        {selection.map(({ subjectId, boardId, options: selOpts = [] }) => {
          const subject = catalog.find(s => s.id === subjectId);
          if (!subject) return null;
          const isFM = subjectId === 'further-maths';
          const fmOpts = isFM ? (FM_OPTIONS[boardId] || []) : [];
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
              {isFM && fmOpts.length > 0 && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${colors.border}` }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: colors.muted, marginBottom: 4, fontFamily: font }}>
                    Which option modules are you taking?
                  </div>
                  <div style={{ fontSize: 11, color: colors.subtle, marginBottom: 8, fontFamily: font }}>
                    Most students pick 2. Select the ones you're actually sitting.
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {fmOpts.map(opt => {
                      const sel = selOpts.includes(opt.code);
                      return (
                        <button key={opt.code} onClick={() => toggleOption(subjectId, opt.code)} style={{
                          padding: '6px 12px',
                          background: sel ? `${subject.color}14` : 'rgba(0,0,0,0.03)',
                          border: `1.5px solid ${sel ? subject.color + '55' : colors.border}`,
                          borderRadius: 6,
                          color: sel ? colors.text : colors.muted,
                          fontSize: 12, fontWeight: sel ? 600 : 400,
                          fontFamily: font, cursor: 'pointer', transition: 'all 0.12s',
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}>
                          {sel && <span style={{ color: subject.color, fontSize: 10, fontWeight: 800 }}>✓</span>}
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ fontSize: 11, color: colors.subtle, marginTop: 6, fontFamily: font }}>
                    Core Pure 1 &amp; 2 are always included.
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PickYearGroup({ yearGroup, setYearGroup, examLevel }) {
  const isGcse = examLevel === 'gcse';
  const options = isGcse
    ? [{id:'Y10',label:'Year 10',desc:'First year of GCSEs'},{id:'Y11',label:'Year 11',desc:'Final GCSE year — exams this summer'}]
    : examLevel === 'aslevel'
    ? [{id:'Y12',label:'Year 12',desc:'AS-Level year'}]
    : [{id:'Y12',label:'Year 12',desc:'First year of A-Levels'},{id:'Y13',label:'Year 13',desc:'Final A-Level year — exams this summer'}];
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: colors.text, margin: '0 0 6px', fontFamily: font }}>
          Which year are you in?
        </h2>
        <p style={{ fontSize: 13, color: colors.muted, margin: 0, fontFamily: font }}>
          This personalises your exam countdown and readiness score.
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {options.map(o => (
          <button key={o.id} onClick={() => setYearGroup(o.id)} style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '16px 18px', textAlign: 'left',
            background: yearGroup === o.id ? `rgba(181,115,90,0.08)` : 'rgba(0,0,0,0.02)',
            border: `1.5px solid ${yearGroup === o.id ? colors.accent + '66' : colors.border}`,
            borderRadius: 10, cursor: 'pointer', fontFamily: font, transition: 'all 0.15s',
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8, flexShrink: 0,
              background: yearGroup === o.id ? colors.accent : 'rgba(0,0,0,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 800,
              color: yearGroup === o.id ? '#fff' : colors.subtle,
            }}>{o.id}</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: colors.text, marginBottom: 2 }}>{o.label}</div>
              <div style={{ fontSize: 12, color: colors.muted }}>{o.desc}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function Confirm({ selection, catalog, examLevel }) {
  const isGcse = examLevel === 'gcse';
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
          const subject = catalog.find(s => s.id === subjectId);
          if (!subject) return null;
          const board = subject.boards.find(b => b.id === boardId) || subject.boards[0];
          const topGrade = isGcse ? '9' : 'A*';
          const topPct = subject.gradeBoundaries[topGrade];
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
                {isGcse ? `Grade 9 at ${topPct}%` : `A* at ${topPct}%`}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SubjectPicker({ user, onComplete, examLevel = 'alevel' }) {
  const [step, setStep] = useState(1);
  const [selection, setSelection] = useState([]);
  const [yearGroup, setYearGroup] = useState('');
  const [saving, setSaving] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const isGcse = examLevel === 'gcse';
  const catalog = isGcse ? GCSE_CATALOG : SUBJECT_CATALOG;
  const maxSubjects = isGcse ? 10 : 4;
  const minSubjects = isGcse ? 3 : 2;
  const hasFM = selection.some(s => s.subjectId === 'further-maths');

  const canNext = step === 1
    ? selection.length >= minSubjects
    : step === 2
      ? selection.every(s => s.boardId) && (!hasFM || selection.every(s => s.subjectId !== 'further-maths' || (s.options||[]).length > 0))
      : step === 3
        ? !!yearGroup
        : agreed;

  const handleNext = async () => {
    if (step < 4) { setStep(step + 1); return; }
    setSaving(true);
    const subjectsJson = JSON.stringify(selection);
    if (user?.id) {
      try { localStorage.setItem(`rbp_sel_${user.id}`, subjectsJson); } catch(_) {}
    }
    if (user) {
      await supabase.rpc('save_subjects', { p_subjects: subjectsJson });
      // Record Terms/Privacy acceptance (best-effort — never block onboarding on it)
      try { await supabase.rpc('accept_terms', { p_version: TERMS_VERSION }); } catch (_) {}
    }
    setSaving(false);
    onComplete(selection, yearGroup);
  };

  const STEP_LABELS = ['Subjects', 'Boards', 'Year', 'Ready'];

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
              <div key={n} style={{ display: 'flex', alignItems: 'center', flex: i < 3 ? 1 : 0 }}>
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
                {i < 3 && (
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
          {step === 1 && <PickSubjects selection={selection} onChange={setSelection} catalog={catalog} maxSubjects={maxSubjects} />}
          {step === 2 && <PickBoards  selection={selection} onChange={setSelection} catalog={catalog} />}
          {step === 3 && <PickYearGroup yearGroup={yearGroup} setYearGroup={setYearGroup} examLevel={examLevel} />}
          {step === 4 && <Confirm     selection={selection} catalog={catalog} examLevel={examLevel} />}

          {step === 4 && (
            <label style={{
              display: 'flex', gap: 10, alignItems: 'flex-start', marginTop: 18,
              padding: '12px 14px', background: 'rgba(181,115,90,0.06)',
              border: `1px solid ${colors.border}`, borderRadius: 10, cursor: 'pointer',
            }}>
              <input
                type="checkbox" checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
                style={{ marginTop: 2, width: 16, height: 16, accentColor: colors.accent, cursor: 'pointer', flexShrink: 0 }}
              />
              <span style={{ fontSize: 12, color: colors.muted, lineHeight: 1.6 }}>
                I agree to the{' '}
                <button type="button" onClick={e => { e.preventDefault(); setShowTerms(true); }}
                  style={{ background: 'none', border: 'none', padding: 0, font: 'inherit',
                    color: colors.accent, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>
                  Terms of Service &amp; Privacy Policy
                </button>
                , and I understand that exam dates, grade boundaries and predictions are estimates I should verify myself.
              </span>
            </label>
          )}
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
            {saving ? 'Saving...' : step === 4 ? 'Start tracking' : 'Continue'}
          </button>
        </div>

        <p style={{ fontSize: 11, color: colors.subtle, textAlign: 'center', marginTop: 14, fontFamily: font }}>
          {isGcse ? 'Select at least 3 GCSEs. You can update your subjects any time in Settings.' : 'You can update your subjects any time in Settings.'}
        </p>
      </div>

      {showTerms && <TermsOfService onClose={() => setShowTerms(false)} />}
    </div>
  );
}
