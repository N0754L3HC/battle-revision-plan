// ── Root shell ──────────────────────────────────────────────────────────────
// Thin entry: auth boot + phase routing. The landing page and the signed-in
// app are lazy chunks, so new visitors download only the landing and students
// download only the app. Keep this file light - no heavy imports.
import React, { useState, useEffect, lazy, Suspense } from 'react';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { T, FONT_BODY, FONT_DISPLAY, ls } from './theme';
import { EXAM_SCHEDULE } from './data/examSchedule';
import CompanionAvatar from './components/CompanionAvatar';
import CapsMark from './components/CapsMark';
import AuthGate from './components/AuthGate';
import TermsOfService from './components/TermsOfService';

const appModule   = () => import('./App.jsx');
const RevisionPlan = lazy(() => appModule().then(m => ({ default: m.RevisionPlan })));
const LevelPicker  = lazy(() => appModule().then(m => ({ default: m.LevelPicker })));
const PlanPicker   = lazy(() => appModule().then(m => ({ default: m.PlanPicker })));
const LandingPage  = lazy(() => import('./components/LandingPage.jsx'));
// Onboarding-only and it drags the whole subject catalogue - keep it lazy.
const SubjectPicker = lazy(() => import('./components/SubjectPicker.jsx'));

// ── Error boundary ─────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(p) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(e) { return { err: e }; }
  render() {
    if (this.state.err) return (
      <div style={{ minHeight:'100vh', background:'#f4eee3', display:'flex', alignItems:'center',
        justifyContent:'center', flexDirection:'column', gap:16, padding:24, fontFamily:'system-ui,sans-serif' }}>
        <div style={{ fontSize:15, fontWeight:700, color:'#2b2620' }}>Something went wrong</div>
        <div style={{ fontSize:13, color:'#6f665b', maxWidth:360, textAlign:'center', lineHeight:1.7 }}>
          {this.state.err?.message || 'Unexpected error.'}
        </div>
        <button onClick={() => window.location.reload()}
          style={{ padding:'10px 22px', background:'#b5735a', border:'none', borderRadius:8,
            color:'#fff', cursor:'pointer', fontSize:14, fontWeight:600 }}>Reload</button>
      </div>
    );
    return this.props.children;
  }
}

export default function Root() {
  const [phase,setPhase]           = useState('loading');
  const [user,setUser]             = useState(null);
  const [selection,setSelection]   = useState([]);
  const [examLevel,setExamLevel]   = useState('alevel');
  const [examSched,setExamSched]   = useState(EXAM_SCHEDULE);
  const [isPro,setIsPro]           = useState(false);
  const [stripeCustomerId,setStripeCustomerId] = useState(null);
  const [subscriptionStatus,setSubscriptionStatus] = useState(null);
  const [referralCode,setReferralCode] = useState(null);
  const [planChoice,setPlanChoice] = useState(null);
  const [splash,setSplash] = useState(true);

  // After returning from Stripe checkout (?upgraded=1), the webhook may take a
  // second or two to mark the account Pro. Poll briefly so Pro lights up on its
  // own - no manual reload, no awkward "still free" flash.
  useEffect(()=>{
    if (!user || isPro) return;
    if (new URLSearchParams(window.location.search).get('upgraded')!=='1') return;
    let alive=true, tries=0;
    const tick=async()=>{
      const {data}=await supabase.from('user_profiles')
        .select('subscription_status,stripe_customer_id,referral_pro_until,is_admin').eq('id',user.id).single();
      if(!alive) return;
      if (data?.stripe_customer_id) setStripeCustomerId(data.stripe_customer_id);
      if (data?.subscription_status) setSubscriptionStatus(data.subscription_status);
      const pro = data?.is_admin || ['pro','trialing','active'].includes(data?.subscription_status)
        || (data?.referral_pro_until && new Date(data.referral_pro_until).getTime()>Date.now());
      if (pro) { setIsPro(true); return; }
      if (++tries < 6) setTimeout(tick, 2000);
    };
    const t=setTimeout(tick, 1500);
    return ()=>{ alive=false; clearTimeout(t); };
  },[user, isPro]);
  // Splash: hold a short minimum so Caps registers as a brand moment, then get
  // out of the way the instant boot resolves. The old fixed 1.5s taxed every
  // single visit; now a warm returning session clears in ~0.6s and slow boots
  // still show the mascot (never a blank screen) up to a 4s safety cap.
  const [splashMinDone,setSplashMinDone] = useState(false);
  useEffect(()=>{
    const min = setTimeout(()=>setSplashMinDone(true), 600);
    const cap = setTimeout(()=>{ setSplashMinDone(true); setSplash(false); }, 4000);
    return ()=>{ clearTimeout(min); clearTimeout(cap); };
  },[]);
  useEffect(()=>{ if (splashMinDone && phase!=='loading') setSplash(false); },[splashMinDone, phase]);
  // Start downloading the destination chunk while the splash is still up, so the
  // splash and the network run in parallel instead of back-to-back.
  useEffect(()=>{
    if (phase==='landing') import('./components/LandingPage.jsx');
    else if (phase==='onboarding') import('./components/SubjectPicker.jsx');
    else if (phase==='app'||phase==='level-pick'||phase==='plan-pick') appModule();
  },[phase]);

  const dark = ls.get('rbp_dark',false);
  const C    = dark?T.dark:T.light;
  const font = FONT_BODY;

  // Paint the document (html + body) to match whatever screen is showing, so
  // overscroll / momentum-scroll never reveals the browser-default white behind
  // the themed canvas (which read as a fragile "slate floating on white").
  useEffect(()=>{
    const PHASE_BG = {
      landing: '#f4eee3', anon: '#f4eee3',           // light marketing + sign-in
      'level-pick': '#f4eee3', onboarding: '#f4eee3', // light onboarding
    };
    const bg = PHASE_BG[phase] || C.bg;             // loading + app use the user's theme
    const html = document.documentElement, body = document.body;
    html.style.background = bg; body.style.background = bg;
    body.style.margin = '0';
    body.style.overscrollBehavior = 'none';         // kill rubber-band reveal
  },[phase, dark, C.bg]);

  // Load admin-managed exam-date overrides (app_config.exam_schedule) and merge
  // them over the built-in schedule. Public read, admin-only write (RLS). This is
  // what makes the God-Mode exam editor's saved dates actually reach students -
  // without it the editor wrote to a table nothing ever read back.
  useEffect(()=>{
    if (!isSupabaseConfigured()) return;
    let alive=true;
    (async()=>{
      try {
        const {data}=await supabase.from('app_config').select('value').eq('key','exam_schedule').maybeSingle();
        if (!alive || !data?.value) return;
        const override = typeof data.value==='string' ? JSON.parse(data.value) : data.value;
        if (override && typeof override==='object' && !Array.isArray(override)) {
          setExamSched(prev=>({...prev,...override}));
        }
      } catch(_) { /* keep built-in defaults on any error */ }
    })();
    return ()=>{ alive=false; };
  },[]);

  useEffect(()=>{
    if (!isSupabaseConfigured()) { setPhase('landing'); return; }
    // Capture referral code from URL before auth
    const refParam = new URLSearchParams(window.location.search).get('ref');
    if (refParam) sessionStorage.setItem('rbp_ref', refParam.toUpperCase().trim());
    // Capture group invite from /j/CODE path before auth; consumed by useEffect in RevisionPlan post-auth
    const joinMatch = window.location.pathname.match(/^\/j\/([A-Z0-9]{4,8})$/i);
    if (joinMatch) {
      sessionStorage.setItem('rbp_join_code', joinMatch[1].toUpperCase());
      window.history.replaceState({}, '', '/');
    }
    let alive=true;

    async function boot(session) {
      if (!session?.user) { if (alive) { setUser(null); setPhase('landing'); } return; }
      if (sessionStorage.getItem('rbp_goto_admin')) {
        sessionStorage.removeItem('rbp_goto_admin');
        window.location.href = '/hq';
        return;
      }
      const u=session.user; const uid=u.id;
      if (alive) setUser(u);
      try {
        // Row is created by handle_new_user trigger on auth.users insert.
        // Heartbeat just bumps last_seen_at (email is server-controlled).
        await supabase.from('user_profiles').update({last_seen_at:new Date().toISOString()}).eq('id',uid);
        const {data}=await supabase.from('user_profiles').select('subjects,subscription_status,stripe_customer_id,referral_code,exam_level,referral_pro_until,is_admin,plan_choice').eq('id',uid).single();
        if (alive && data?.plan_choice) setPlanChoice(data.plan_choice);
        if (!alive) return;
        const stripePro = data?.subscription_status==='pro'||data?.subscription_status==='trialing'||data?.subscription_status==='active';
        const referralPro = data?.referral_pro_until && new Date(data.referral_pro_until).getTime() > Date.now();
        // Admins always get Pro for free.
        if (stripePro || referralPro || data?.is_admin) setIsPro(true);
        if (data?.stripe_customer_id) setStripeCustomerId(data.stripe_customer_id);
        if (data?.subscription_status) setSubscriptionStatus(data.subscription_status);
        // referral_code is auto-assigned by the column DEFAULT on insert.
        // If still null on an existing row, re-read after a short pause -
        // the row was likely created by handle_new_user mid-boot.
        let rc=data?.referral_code;
        if (!rc) {
          const {data:retry}=await supabase.from('user_profiles').select('referral_code').eq('id',uid).single();
          rc = retry?.referral_code ?? null;
        }
        if (alive && rc) setReferralCode(rc);
        const pendingRef=sessionStorage.getItem('rbp_ref');
        if (pendingRef && pendingRef!==rc) {
          sessionStorage.removeItem('rbp_ref');
          supabase.auth.getSession().then(({data:{session:s}})=>{
            if (!s) return;
            fetch('/api/referral',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${s.access_token}`},body:JSON.stringify({referrerCode:pendingRef})}).catch(()=>{});
          });
        }
        const lvl = data?.exam_level || null;
        if (lvl && alive) setExamLevel(lvl);
        let sel=[];
        try { if (data?.subjects) sel=JSON.parse(data.subjects); } catch {}
        if (Array.isArray(sel)&&sel.length>0) {
          ls.set(`rbp_sel_${uid}`,sel); setSelection(sel);
          if (!lvl) {
            // Existing user without exam_level - default to alevel, save it silently
            setExamLevel('alevel');
            supabase.from('user_profiles').update({exam_level:'alevel'}).eq('id',uid).then(()=>{});
          }
          if (alive) setPhase('app');
        } else {
          const cached=ls.get(`rbp_sel_${uid}`,[]);
          if (cached.length>0) {
            setSelection(cached);
            if (!lvl) { setExamLevel('alevel'); supabase.from('user_profiles').update({exam_level:'alevel'}).eq('id',uid).then(()=>{}); }
            if (alive) setPhase('app');
            supabase.rpc('save_subjects',{p_subjects:JSON.stringify(cached)});
          } else {
            // New user - if exam_level not set show level picker, else go to subject picker
            if (alive) setPhase(lvl ? 'onboarding' : 'level-pick');
          }
        }
      } catch {
        if (!alive) return;
        const cached=ls.get(`rbp_sel_${uid}`,[]);
        if (cached.length>0) { setSelection(cached); setPhase('app'); }
        else setPhase('level-pick');
      }
    }

    let booted=false;
    const {data:{subscription}}=supabase.auth.onAuthStateChange((event,session)=>{
      if (event==='INITIAL_SESSION'||event==='SIGNED_IN'||event==='TOKEN_REFRESHED') {
        if (!booted||event==='SIGNED_IN') { booted=true; boot(session); }
      }
      if (event==='SIGNED_OUT') { booted=false; if (alive) { setUser(null); setSelection([]); setPhase('landing'); } }
    });
    return ()=>{ alive=false; subscription.unsubscribe(); };
  },[]);


  function handleSubjectsDone(sel, yg) {
    setSelection(sel);
    if (yg && user?.id) {
      supabase.from('user_profiles').update({year_group:yg}).eq('id',user.id).then(()=>{});
    }
    // New recruits see the plan chooser once; returning users skip straight in.
    setPhase(planChoice ? 'app' : 'plan-pick');
  }

  function handlePlanDone(choice, billing) {
    setPlanChoice(choice);
    const uid=user?.id;
    if (uid) supabase.from('user_profiles').update({plan_choice:choice}).eq('id',uid).then(()=>{},()=>{});
    // Commander → land them in Account → Subscription and auto-start the chosen
    // checkout (monthly = trial, annual = direct) so it's one flow from signup.
    if (choice==='commander') {
      try { sessionStorage.setItem('rbp_plan_intent','commander'); sessionStorage.setItem('rbp_billing_intent', billing||'monthly'); } catch {}
    }
    setPhase('app');
  }

  async function handleLevelDone(level) {
    setExamLevel(level);
    const uid=user?.id;
    if (uid) await supabase.from('user_profiles').update({exam_level:level}).eq('id',uid);
    setPhase('onboarding');
  }

  async function handleSignOut() {
    const uid=user?.id;
    await supabase.auth.signOut();
    if (uid) ls.del(`rbp_sel_${uid}`);
    setUser(null); setSelection([]); setExamLevel('alevel'); setPhase('anon');
  }

  async function handleResetSubjects() {
    const uid=user?.id;
    if (uid) ls.del(`rbp_sel_${uid}`);
    await supabase.rpc('save_subjects',{p_subjects:'[]'});
    setSelection([]); setPhase('onboarding');
  }

  // Splash - show the full mascot for a beat on first load so Caps is seen.
  const splashScreen=(
    <div style={{minHeight:'100vh',background:C.bg,display:'flex',alignItems:'center',
      justifyContent:'center',flexDirection:'column',gap:8,fontFamily:font,
      animation:'rbp-fade-in 0.3s ease'}}>
      <style>{`@keyframes caps-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}`}</style>
      <div style={{animation:'caps-bob 1.7s ease-in-out infinite'}}>
        <CompanionAvatar skin={0} outfitColor={0} accessory={0} mood="happy" pose="wave" size={120}/>
      </div>
      <div style={{fontFamily:FONT_DISPLAY,fontSize:24,fontWeight:700,color:C.text,letterSpacing:'-0.02em',marginTop:4}}>Battle Plan</div>
      <div style={{fontSize:13,color:C.subtle}}>Loading your plan…</div>
    </div>
  );

  const loading=(
    <div style={{minHeight:'100vh',background:C.bg,display:'flex',alignItems:'center',
      justifyContent:'center',flexDirection:'column',gap:16,fontFamily:font}}>
      <CapsMark size={48}/>
      <div style={{fontSize:13,color:C.muted}}>Loading…</div>
    </div>
  );

  // Public legal pages — reachable without an account (Stripe / Google OAuth
  // reviewers and users can read them directly). Checked before splash/auth.
  const legalPath = typeof window!=='undefined' ? window.location.pathname.replace(/\/+$/,'').toLowerCase() : '';
  if (legalPath==='/terms')   return <ErrorBoundary><TermsOfService standalone/></ErrorBoundary>;
  if (legalPath==='/privacy') return <ErrorBoundary><TermsOfService standalone focus="privacy"/></ErrorBoundary>;

  if (splash)               return <ErrorBoundary>{splashScreen}</ErrorBoundary>;
  if (phase==='loading')    return <ErrorBoundary>{loading}</ErrorBoundary>;
  if (phase==='landing')    return <ErrorBoundary><Suspense fallback={loading}><LandingPage onGetStarted={()=>setPhase('anon')}/></Suspense></ErrorBoundary>;
  if (phase==='anon')       return <ErrorBoundary><AuthGate onAuth={()=>{}}/></ErrorBoundary>;
  if (phase==='level-pick') return <ErrorBoundary><Suspense fallback={loading}><LevelPicker onComplete={handleLevelDone}/></Suspense></ErrorBoundary>;
  if (phase==='onboarding') return <ErrorBoundary><Suspense fallback={loading}><SubjectPicker user={user} onComplete={handleSubjectsDone} examLevel={examLevel}/></Suspense></ErrorBoundary>;
  if (phase==='plan-pick')  return <ErrorBoundary><Suspense fallback={loading}><PlanPicker isPro={isPro} onComplete={handlePlanDone}/></Suspense></ErrorBoundary>;
  return (
    <ErrorBoundary>
      <Suspense fallback={loading}>
      <RevisionPlan user={user} selection={selection} examLevel={examLevel} onSignOut={handleSignOut} onResetSubjects={handleResetSubjects} examSched={examSched} isPro={isPro} stripeCustomerId={stripeCustomerId} subscriptionStatus={subscriptionStatus} referralCode={referralCode}/>
      </Suspense>
    </ErrorBoundary>
  );
}
