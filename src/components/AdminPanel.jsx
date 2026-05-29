import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const S = {
  root: { minHeight:'100vh', background:'#08080D', color:'#E0E0E5', fontFamily:"'JetBrains Mono','SF Mono',monospace", padding:'0 0 60px' },
  header: { position:'sticky', top:0, zIndex:50, background:'rgba(8,8,13,0.96)', backdropFilter:'blur(16px)', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 24px', height:56 },
  headerLeft: { display:'flex', alignItems:'center', gap:12 },
  logoA: { fontSize:16, fontWeight:800, color:'#FF3D00' },
  logoT: { fontWeight:700, fontSize:13, letterSpacing:2, color:'#fff' },
  badge: { background:'rgba(255,61,0,0.15)', border:'1px solid rgba(255,61,0,0.4)', color:'#FF3D00', fontSize:10, fontWeight:800, letterSpacing:1, padding:'2px 8px', borderRadius:4 },
  backBtn: { background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'#aaa', padding:'6px 14px', borderRadius:6, cursor:'pointer', fontSize:12, fontWeight:700, fontFamily:'inherit' },
  body: { padding:'24px', maxWidth:1200, margin:'0 auto' },
  statsRow: { display:'flex', gap:12, marginBottom:28, flexWrap:'wrap' },
  stat: { background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, padding:'14px 20px', flex:'1 1 140px' },
  statV: { fontSize:28, fontWeight:800, color:'#FF3D00' },
  statL: { fontSize:11, color:'#555', marginTop:2, letterSpacing:1 },
  search: { width:'100%', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:6, padding:'10px 14px', color:'#ddd', fontSize:13, fontFamily:'inherit', outline:'none', boxSizing:'border-box', marginBottom:16 },
  table: { width:'100%', borderCollapse:'collapse' },
  th: { textAlign:'left', padding:'8px 14px', fontSize:10, color:'#555', letterSpacing:1, borderBottom:'1px solid rgba(255,255,255,0.06)', fontWeight:700 },
  tr: hover => ({ background:hover?'rgba(255,255,255,0.04)':'transparent', cursor:'pointer', transition:'background 0.1s', borderBottom:'1px solid rgba(255,255,255,0.04)' }),
  td: { padding:'10px 14px', fontSize:12, color:'#ccc' },
  pill: color => ({ display:'inline-block', background:`${color}22`, border:`1px solid ${color}66`, color, fontSize:10, fontWeight:700, padding:'1px 7px', borderRadius:4 }),
  modal: { position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.9)', overflowY:'auto' },
  modalInner: { background:'#0f0f18', minHeight:'100vh', fontFamily:"'JetBrains Mono','SF Mono',monospace" },
  modalHeader: { position:'sticky', top:0, background:'rgba(15,15,24,0.98)', borderBottom:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', gap:16, padding:'14px 24px', zIndex:10 },
  section: { background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:8, padding:20, marginBottom:16 },
  sTitle: { fontSize:11, color:'#555', letterSpacing:2, fontWeight:700, marginBottom:14 },
  row: { display:'flex', gap:10, flexWrap:'wrap' },
  chip: color => ({ background:`${color}15`, border:`1px solid ${color}44`, color, fontSize:11, padding:'4px 10px', borderRadius:5 }),
  scoreRow: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom:'1px solid rgba(255,255,255,0.04)', fontSize:12 },
  empty: { color:'#333', fontSize:13, padding:'20px 0' },
};

const GRADE_COLORS = { 'A*':'#00E676', A:'#69F0AE', B:'#FFD600', C:'#FF9100', D:'#FF6D00', E:'#FF3D00', U:'#555' };
const SUBJECT_COLORS = { Maths:'#2979FF', 'Further Maths':'#E040FB', CS:'#00E676', Chemistry:'#FF4081', Physics:'#40C4FF', Economics:'#FFD600' };

function gradeColor(g) { return GRADE_COLORS[g] || '#555'; }
function subColor(s) { return SUBJECT_COLORS[s] || '#888'; }

function getGrade(pct, subject) {
  const bounds = { Maths:{'A*':80,A:70,B:60,C:50,D:40,E:30}, 'Further Maths':{'A*':83,A:72,B:60,C:50,D:40,E:30}, CS:{'A*':75,A:65,B:55,C:45,D:35,E:25}, Chemistry:{'A*':80,A:70,B:60,C:50,D:40,E:30}, Physics:{'A*':80,A:70,B:60,C:50,D:40,E:30}, Economics:{'A*':75,A:65,B:55,C:45,D:35,E:25} };
  const b = bounds[subject] || {};
  for (const g of ['A*','A','B','C','D','E']) { if (pct >= (b[g]||0)) return g; }
  return 'U';
}

function calcReadiness(scores, errors, checks) {
  const avg = scores.length ? scores.reduce((a,s)=>a+s.pct,0)/scores.length : 0;
  const scoreC = Math.round((avg/100)*40);
  const paperC = Math.min(20, Math.round((scores.length/12)*20));
  const recentErr = errors.filter(e=>Date.now()-e.id<7*86400000).length;
  const errC = Math.max(0, 20-recentErr*2);
  const checkC = Math.min(20, Math.round((Object.keys(checks).length/40)*20));
  const total = scoreC+paperC+errC+checkC;
  return { total, label: total>=80?'BATTLE READY':total>=60?'ON TRACK':total>=40?'BUILDING':'JUST STARTED' };
}

// ── Analytics components ────────────────────────────────────────────────────

function KpiTile({ value, label, sub, accent='#FF3D00', prefix='', suffix='' }) {
  return (
    <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',
      borderRadius:8,padding:'16px 18px',flex:'1 1 150px',minWidth:0}}>
      <div style={{fontSize:9,color:'#444',letterSpacing:2,fontWeight:700,marginBottom:8,textTransform:'uppercase'}}>{label}</div>
      <div style={{fontSize:26,fontWeight:800,color:accent,letterSpacing:-0.5}}>
        {prefix}{typeof value==='number'?value.toLocaleString():value}{suffix}
      </div>
      {sub&&<div style={{fontSize:10,color:'#555',marginTop:4}}>{sub}</div>}
    </div>
  );
}

function Sparkbar({ data, color='#00E676', h=56 }) {
  const max = Math.max(...data.map(d=>d.v), 1);
  return (
    <div style={{display:'flex',alignItems:'flex-end',gap:1.5,height:h,overflow:'hidden'}}>
      {data.map((d,i)=>(
        <div key={i} title={`${d.label}: ${d.v}`} style={{
          flex:1, background:color, borderRadius:'1.5px 1.5px 0 0',
          height:`${Math.max(2, Math.round(d.v/max*100))}%`,
          opacity:0.45+0.55*(d.v/max),
          transition:'height 0.4s',
        }}/>
      ))}
    </div>
  );
}

function FunnelRow({ label, count, base, color, prev }) {
  const pct = base ? Math.round(count/base*100) : 0;
  const dropPct = prev ? Math.round((1 - count/prev)*100) : null;
  return (
    <div style={{marginBottom:14}}>
      <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:5}}>
        <span style={{color:'#999'}}>{label}</span>
        <span style={{fontWeight:700,color:'#fff'}}>
          {count.toLocaleString()}&nbsp;
          <span style={{color:'#444',fontWeight:400}}>({pct}%)</span>
          {dropPct!==null&&dropPct>0&&<span style={{color:'#FF9100',fontWeight:400,fontSize:10}}>&nbsp;↓{dropPct}%</span>}
        </span>
      </div>
      <div style={{height:8,background:'rgba(255,255,255,0.05)',borderRadius:4,overflow:'hidden'}}>
        <div style={{height:'100%',width:`${pct}%`,background:color,borderRadius:4,transition:'width 0.6s ease'}}/>
      </div>
    </div>
  );
}

function AnalyticsDashboard({ users, referrals=[], groups=[], groupMembers=[] }) {
  const now = Date.now();
  const D1=86400000, D7=D1*7, D14=D1*14, D30=D1*30, D60=D1*60;

  const total  = users.length;
  const pro    = users.filter(u=>u.subscription_status==='active').length;
  const mrr    = +(pro*4.99).toFixed(2);
  const arr    = +(mrr*12).toFixed(0);
  const arpu   = total ? +(mrr/total).toFixed(2) : 0;
  const conv   = total ? Math.round(pro/total*100) : 0;

  const new7   = users.filter(u=>now-new Date(u.created_at)<D7).length;
  const new30  = users.filter(u=>now-new Date(u.created_at)<D30).length;

  const dau    = users.filter(u=>now-new Date(u.lastActive)<D1).length;
  const wau    = users.filter(u=>now-new Date(u.lastActive)<D7).length;
  const mau    = users.filter(u=>now-new Date(u.lastActive)<D30).length;
  const stick  = mau ? Math.round(dau/mau*100) : 0;

  const act1   = users.filter(u=>u.totalScores>=1).length;
  const act5   = users.filter(u=>u.totalScores>=5).length;
  const act10  = users.filter(u=>u.totalScores>=10).length;

  const dormant = users.filter(u=>now-new Date(u.created_at)>D14&&u.totalScores===0).length;
  const atRisk  = users.filter(u=>{ const i=now-new Date(u.lastActive); return i>D7&&i<D30&&u.totalScores>=1; }).length;
  const churned = users.filter(u=>now-new Date(u.lastActive)>D30&&u.totalScores>=1).length;
  const schoolOpt = users.filter(u=>u.school_opt_in).length;
  const usedErr   = users.filter(u=>u.totalErrors>0).length;
  const usedTimer = users.filter(u=>u.totalStudySecs>0).length;

  // Retention cohorts
  const c7  = users.filter(u=>{ const a=now-new Date(u.created_at); return a>=D7&&a<D14; });
  const c30 = users.filter(u=>{ const a=now-new Date(u.created_at); return a>=D30&&a<D60; });
  const r7  = c7.filter(u=>now-new Date(u.lastActive)<D7).length;
  const r30 = c30.filter(u=>now-new Date(u.lastActive)<D30).length;
  const ret7  = c7.length  ? Math.round(r7/c7.length*100)   : null;
  const ret30 = c30.length ? Math.round(r30/c30.length*100) : null;
  const retC  = r => r===null?'#555':r>=40?'#00E676':r>=20?'#FFD600':'#FF3D00';

  // 30-day signup sparkline
  const signupDays = Array.from({length:30},(_,i)=>{
    const d=new Date(now-(29-i)*D1); d.setHours(0,0,0,0);
    const e=d.getTime()+D1;
    return { v:users.filter(u=>{const t=new Date(u.created_at).getTime();return t>=d.getTime()&&t<e;}).length,
      label:d.toLocaleDateString('en-GB',{day:'numeric',month:'short'}) };
  });
  const peakDay = Math.max(...signupDays.map(d=>d.v));

  const totalPapers = users.reduce((a,u)=>a+u.totalScores,0);
  const totalHours  = Math.round(users.reduce((a,u)=>a+(u.totalStudySecs||0),0)/3600);
  const avgPapers   = total ? (totalPapers/total).toFixed(1) : 0;

  // Top subjects
  const subMap={};
  for (const u of users) for (const sc of Object.values(u.scores||{})) for (const s of sc) subMap[s.subject]=(subMap[s.subject]||0)+1;
  const topSubs = Object.entries(subMap).sort((a,b)=>b[1]-a[1]).slice(0,6);

  // Trial/cancelled breakdown
  const trialing  = users.filter(u=>u.subscription_status==='trialing').length;
  const cancelled = users.filter(u=>u.subscription_status==='canceled'||u.subscription_status==='cancelled').length;
  const pastDue   = users.filter(u=>u.subscription_status==='past_due').length;

  const Sec = ({title,children,style={}}) => (
    <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)',
      borderRadius:8,padding:'18px 20px',marginBottom:14,...style}}>
      <div style={{fontSize:9,color:'#444',letterSpacing:2,fontWeight:700,marginBottom:14}}>{title}</div>
      {children}
    </div>
  );

  return (
    <div>
      {/* ACQUISITION */}
      <div style={{fontSize:9,color:'#FF3D00',letterSpacing:3,fontWeight:800,marginBottom:10,opacity:0.6}}>ACQUISITION</div>
      <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:10}}>
        <KpiTile value={total} label="Total Users" sub={`+${new7} this week · +${new30} this month`}/>
        <KpiTile value={new7} label="New (7d)" accent='#00E676' sub={`${new30} new this month`}/>
        <KpiTile value={mau} label="MAU" accent='#40C4FF' sub={`${wau} wau · ${dau} dau`}/>
        <KpiTile value={`${stick}%`} label="Stickiness (DAU/MAU)" accent='#40C4FF' sub="industry avg ~25%"/>
      </div>

      {/* REVENUE */}
      <div style={{fontSize:9,color:'#FF3D00',letterSpacing:3,fontWeight:800,marginBottom:10,marginTop:4,opacity:0.6}}>REVENUE</div>
      <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:10}}>
        <KpiTile value={pro} label="Pro Users" accent='#FFD600' sub={`${conv}% conversion · ${trialing} trialing`}/>
        <KpiTile value={`£${mrr}`} label="MRR (est.)" accent='#FFD600' sub="£4.99/mo per Pro"/>
        <KpiTile value={`£${arr}`} label="ARR (est.)" accent='#FFD600' sub="MRR × 12"/>
        <KpiTile value={`£${arpu}`} label="ARPU" accent='#FFD600' sub="MRR ÷ all users"/>
      </div>
      {(cancelled>0||pastDue>0)&&(
        <div style={{display:'flex',gap:8,marginBottom:14}}>
          {cancelled>0&&<span style={{...S.pill('#FF3D00'),fontSize:11}}>{cancelled} cancelled</span>}
          {pastDue>0&&<span style={{...S.pill('#FF9100'),fontSize:11}}>{pastDue} past due</span>}
          {trialing>0&&<span style={{...S.pill('#40C4FF'),fontSize:11}}>{trialing} trialing</span>}
        </div>
      )}

      {/* RETENTION */}
      <div style={{fontSize:9,color:'#FF3D00',letterSpacing:3,fontWeight:800,marginBottom:10,marginTop:4,opacity:0.6}}>RETENTION</div>
      <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:16}}>
        <KpiTile value={ret7!==null?`${ret7}%`:'—'} label="D7 Retention" accent={retC(ret7)} sub={`cohort n=${c7.length} · ≥40% is good`}/>
        <KpiTile value={ret30!==null?`${ret30}%`:'—'} label="D30 Retention" accent={retC(ret30)} sub={`cohort n=${c30.length} · ≥25% is good`}/>
        <KpiTile value={`${avgPapers}`} label="Avg Papers/User" accent='#40C4FF' sub={`${totalPapers} total papers`}/>
        <KpiTile value={`${totalHours}h`} label="Total Study Time" accent='#40C4FF' sub="all users combined"/>
      </div>

      {/* GROWTH SPARKLINE */}
      <Sec title={`DAILY SIGNUPS — LAST 30 DAYS  (peak: ${peakDay}/day)`}>
        <Sparkbar data={signupDays} color='#00E676' h={64}/>
        <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'#333',marginTop:5}}>
          <span>{signupDays[0].label}</span>
          <span>{signupDays[29].label}</span>
        </div>
      </Sec>

      {/* ACTIVATION FUNNEL */}
      <Sec title="ACTIVATION FUNNEL  (users progressing through key milestones)">
        <FunnelRow label="Signed up"                   count={total} base={total}  color='#40C4FF'/>
        <FunnelRow label="Logged first paper"          count={act1}  base={total}  color='#00E676' prev={total}/>
        <FunnelRow label="5+ papers (engaged)"         count={act5}  base={total}  color='#00E676' prev={act1}/>
        <FunnelRow label="10+ papers (power user)"     count={act10} base={total}  color='#FFD600' prev={act5}/>
        <FunnelRow label="Upgraded to Pro (paying)"    count={pro}   base={total}  color='#FF3D00' prev={act10}/>
        <div style={{fontSize:10,color:'#444',marginTop:8}}>
          Conversion gap: {act1>0&&pro>0?`${Math.round(pro/act1*100)}% of activated users convert to Pro`:'no data yet'}
        </div>
      </Sec>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:14,marginBottom:14}}>
        {/* USER SEGMENTS */}
        <Sec title="USER HEALTH SEGMENTS" style={{marginBottom:0}}>
          {[
            ['Active today',              dau,       '#00E676'],
            ['Active this week',          wau,       '#00E676'],
            ['Active this month',         mau,       '#40C4FF'],
            ['Pro subscribers',           pro,       '#FFD600'],
            ['Dormant (14d+, 0 papers)',  dormant,   '#FF3D00'],
            ['At-risk (7–30d idle)',       atRisk,    '#FF9100'],
            ['Churned (30d+ inactive)',    churned,   '#FF3D00'],
            ['School opt-in',             schoolOpt, '#40C4FF'],
          ].map(([l,n,c])=>(
            <div key={l} style={{display:'flex',justifyContent:'space-between',
              padding:'6px 0',borderBottom:'1px solid rgba(255,255,255,0.04)',fontSize:12}}>
              <span style={{color:'#777'}}>{l}</span>
              <span style={{fontWeight:800,color:c}}>{n}<span style={{color:'#333',fontWeight:400,fontSize:10}}> ({total?Math.round(n/total*100):0}%)</span></span>
            </div>
          ))}
        </Sec>

        {/* FEATURE ADOPTION */}
        <Sec title="FEATURE ADOPTION" style={{marginBottom:0}}>
          {[
            ['Paper tracker',  act1,     total, '#00E676'],
            ['Error log',      usedErr,  total, '#40C4FF'],
            ['Study timer',    usedTimer,total, '#40C4FF'],
            ['School opt-in',  schoolOpt,total, '#FFD600'],
          ].map(([l,n,t,c])=>{
            const pct=t?Math.round(n/t*100):0;
            return (
              <div key={l} style={{marginBottom:12}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4}}>
                  <span style={{color:'#888'}}>{l}</span>
                  <span style={{color:'#fff',fontWeight:700}}>{pct}% <span style={{color:'#444',fontWeight:400}}>({n} users)</span></span>
                </div>
                <div style={{height:6,background:'rgba(255,255,255,0.05)',borderRadius:3,overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${pct}%`,background:c,borderRadius:3,transition:'width 0.5s'}}/>
                </div>
              </div>
            );
          })}
          <div style={{height:1,background:'rgba(255,255,255,0.05)',margin:'12px 0'}}/>
          <div style={{fontSize:11,color:'#555',lineHeight:1.8}}>
            Total papers logged: <b style={{color:'#fff'}}>{totalPapers.toLocaleString()}</b><br/>
            Avg papers per user: <b style={{color:'#fff'}}>{avgPapers}</b><br/>
            Total study hours:   <b style={{color:'#fff'}}>{totalHours}h</b>
          </div>
        </Sec>
      </div>

      {/* RETENTION COHORT DETAIL */}
      <Sec title="RETENTION COHORT ANALYSIS">
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
          {[
            {label:'D7 RETENTION',rate:ret7,size:c7.length,desc:'Users who joined 7–14 days ago, still active in last 7 days'},
            {label:'D30 RETENTION',rate:ret30,size:c30.length,desc:'Users who joined 30–60 days ago, still active in last 30 days'},
          ].map(({label,rate,size,desc})=>(
            <div key={label} style={{background:'rgba(255,255,255,0.03)',borderRadius:6,padding:14}}>
              <div style={{fontSize:9,color:'#444',letterSpacing:2,fontWeight:700,marginBottom:8}}>{label}</div>
              <div style={{fontSize:34,fontWeight:800,color:retC(rate)}}>{rate!==null?`${rate}%`:'—'}</div>
              <div style={{fontSize:10,color:'#555',marginTop:4,marginBottom:8}}>n={size} · {desc}</div>
              {rate!==null&&(
                <div style={{height:5,background:'rgba(255,255,255,0.06)',borderRadius:3,overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${rate}%`,background:retC(rate),borderRadius:3}}/>
                </div>
              )}
            </div>
          ))}
        </div>
        <div style={{fontSize:10,color:'#333',lineHeight:1.7}}>
          Benchmarks for productivity/education tools: D7 ≥ 40% = good · D30 ≥ 25% = good · D30 ≥ 10% = median
        </div>
      </Sec>

      {/* TOP SUBJECTS */}
      {topSubs.length>0&&(
        <Sec title="TOP SUBJECTS BY PAPERS LOGGED">
          <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
            {topSubs.map(([sub,count])=>(
              <div key={sub} style={{background:'rgba(255,255,255,0.04)',
                border:`1px solid ${SUBJECT_COLORS[sub]||'#888'}33`,borderRadius:8,padding:'12px 16px',minWidth:110}}>
                <div style={{fontSize:9,color:'#555',letterSpacing:1}}>{sub.toUpperCase()}</div>
                <div style={{fontSize:24,fontWeight:800,color:SUBJECT_COLORS[sub]||'#888',marginTop:3}}>{count}</div>
                <div style={{fontSize:10,color:'#444'}}>papers</div>
              </div>
            ))}
          </div>
        </Sec>
      )}

      {/* ── GROWTH ENGINES ───────────────────────────────────────────── */}
      <div style={{fontSize:9,color:'#FF3D00',letterSpacing:3,fontWeight:800,marginBottom:10,marginTop:14,opacity:0.6}}>GROWTH ENGINES</div>

      {(()=>{
        // Referrals
        const refByCode = {};
        for (const r of referrals) refByCode[r.referrer_code] = (refByCode[r.referrer_code]||0) + 1;
        const totalRefs = referrals.length;
        const referredUsers = new Set(referrals.map(r=>r.referred_user_id)).size;
        const usersByCode = Object.fromEntries(users.filter(u=>u.referral_code).map(u=>[u.referral_code, u]));
        const topReferrers = Object.entries(refByCode)
          .map(([code,c])=>({code,count:c,user:usersByCode[code]}))
          .sort((a,b)=>b.count-a.count).slice(0,8);
        const activeReferralPro = users.filter(u=>u.referral_pro_until && new Date(u.referral_pro_until).getTime() > now).length;
        // Schools
        const schoolMap = {};
        for (const u of users) {
          if (!u.school_name || !u.school_opt_in) continue;
          const n = u.school_name.trim();
          if (!n) continue;
          if (!schoolMap[n]) schoolMap[n] = {count:0, total:0};
          schoolMap[n].count++;
          schoolMap[n].total += u.leaderboard_score ?? 0;
        }
        const topSchools = Object.entries(schoolMap)
          .map(([n,v])=>({name:n,count:v.count,avg:Math.round(v.total/v.count)}))
          .sort((a,b)=>b.count-a.count).slice(0,8);
        // Groups
        const totalGroups = groups.length;
        const totalMemberships = groupMembers.length;
        const avgGroupSize = totalGroups ? (totalMemberships/totalGroups).toFixed(1) : 0;
        // Exam level split
        const lvlCount = users.reduce((acc,u)=>{const k=u.exam_level||'(unset)';acc[k]=(acc[k]||0)+1;return acc;},{});
        return (
        <>
          <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:10}}>
            <KpiTile value={totalRefs} label="Total Referrals" accent='#fbbf24' sub={`${referredUsers} unique users referred`}/>
            <KpiTile value={topReferrers.length} label="Active Referrers" accent='#fbbf24' sub={`avg ${topReferrers.length?(totalRefs/topReferrers.length).toFixed(1):0}/referrer`}/>
            <KpiTile value={activeReferralPro} label="Referral Pro Grants" accent='#FFD600' sub="users with active Pro week"/>
            <KpiTile value={totalGroups} label="Study Groups" accent='#40C4FF' sub={`${totalMemberships} memberships · avg ${avgGroupSize} per group`}/>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:14,marginBottom:14}}>
            {topReferrers.length>0&&(
              <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:8,padding:'18px 20px'}}>
                <div style={{fontSize:9,color:'#444',letterSpacing:2,fontWeight:700,marginBottom:14}}>TOP REFERRERS</div>
                {topReferrers.map((r,i)=>(
                  <div key={r.code} style={{display:'flex',gap:10,alignItems:'center',padding:'7px 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                    <span style={{width:18,textAlign:'center',fontSize:11,color:i<3?'#FFD600':'#444',fontWeight:800}}>{i+1}</span>
                    <span style={{flex:1,fontSize:12,color:'#ddd',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.user?.display_name||r.user?.email||r.code}</span>
                    <span style={{fontSize:12,fontWeight:700,color:'#fbbf24'}}>{r.count}</span>
                  </div>
                ))}
              </div>
            )}

            {topSchools.length>0&&(
              <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:8,padding:'18px 20px'}}>
                <div style={{fontSize:9,color:'#444',letterSpacing:2,fontWeight:700,marginBottom:14}}>TOP SCHOOLS (OPTED IN)</div>
                {topSchools.map((s,i)=>(
                  <div key={s.name} style={{display:'flex',gap:10,alignItems:'center',padding:'7px 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                    <span style={{width:18,textAlign:'center',fontSize:11,color:i<3?'#FFD600':'#444',fontWeight:800}}>{i+1}</span>
                    <span style={{flex:1,fontSize:12,color:'#ddd',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.name}</span>
                    <span style={{fontSize:10,color:'#666',marginRight:6}}>{s.count}u</span>
                    <span style={{fontSize:12,fontWeight:700,color:s.avg>=80?'#00E676':s.avg>=60?'#FFD600':'#FF9100'}}>{s.avg}%</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:8,padding:'18px 20px'}}>
              <div style={{fontSize:9,color:'#444',letterSpacing:2,fontWeight:700,marginBottom:14}}>EXAM LEVEL MIX</div>
              {Object.entries(lvlCount).sort((a,b)=>b[1]-a[1]).map(([k,n])=>{
                const pct = total ? Math.round(n/total*100) : 0;
                const c = k==='alevel'?'#40C4FF':k==='aslevel'?'#FF9100':k==='gcse'?'#00E676':'#555';
                return (
                  <div key={k} style={{marginBottom:11}}>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4}}>
                      <span style={{color:'#888',textTransform:'uppercase'}}>{k}</span>
                      <span style={{color:'#fff',fontWeight:700}}>{n} <span style={{color:'#444',fontWeight:400,fontSize:10}}>({pct}%)</span></span>
                    </div>
                    <div style={{height:6,background:'rgba(255,255,255,0.05)',borderRadius:3,overflow:'hidden'}}>
                      <div style={{height:'100%',width:`${pct}%`,background:c,borderRadius:3,transition:'width 0.5s'}}/>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
        );
      })()}
    </div>
  );
}

// ── User detail modal ───────────────────────────────────────────────────────

function UserModal({ user, onClose, onToggleAdmin }) {
  const [tab, setTab] = useState('me');
  const scores  = (user.scores||{})[tab]||[];
  const errors  = (user.errors||{})[tab]||[];
  const checks  = (user.checks||{})[tab]||{};
  const targets = (user.targets||{})[tab]||{};
  const br = calcReadiness(scores, errors, checks);

  const subjects = [...new Set(scores.map(s=>s.subject))];
  const avgBySubject = subjects.map(s=>{
    const ss=scores.filter(x=>x.subject===s);
    const avg=Math.round(ss.reduce((a,x)=>a+x.pct,0)/ss.length);
    return { s, avg, grade:getGrade(avg,s), count:ss.length };
  });
  const brColor = br.total>=80?'#00E676':br.total>=60?'#FFD600':br.total>=40?'#FF9100':'#FF3D00';

  return (
    <div style={S.modal}>
      <div style={S.modalInner}>
        <div style={S.modalHeader}>
          <button style={S.backBtn} onClick={onClose}>← Back</button>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:700,color:'#fff'}}>{user.display_name||user.email}</div>
            <div style={{fontSize:11,color:'#555'}}>
              {user.display_name?user.email+' · ':'' }
              Joined {new Date(user.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}
              {user.tos_agreed_at?' · ToS agreed':' · ToS not confirmed'}
              {user.subscription_status==='active'?<span style={{color:'#FFD600'}}> · Pro</span>:null}
            </div>
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            {['me','friend'].map(p=>(
              <button key={p} onClick={()=>setTab(p)} style={{
                background:tab===p?'rgba(255,255,255,0.1)':'transparent',
                border:`1px solid ${tab===p?'rgba(255,255,255,0.2)':'rgba(255,255,255,0.06)'}`,
                color:tab===p?'#fff':'#555', padding:'4px 10px', borderRadius:5, cursor:'pointer',
                fontSize:12, fontWeight:700, fontFamily:'inherit',
              }}>{p==='me'?'Their Plan':'Friend Plan'}</button>
            ))}
            <button style={{
              background:user.is_admin?'rgba(255,61,0,0.15)':'rgba(255,255,255,0.04)',
              border:`1px solid ${user.is_admin?'rgba(255,61,0,0.4)':'rgba(255,255,255,0.1)'}`,
              color:user.is_admin?'#FF3D00':'#666', padding:'4px 10px', borderRadius:5, cursor:'pointer',
              fontSize:11, fontWeight:700, fontFamily:'inherit',
            }} onClick={()=>onToggleAdmin(user)}>
              {user.is_admin?'ADMIN':'Make Admin'}
            </button>
          </div>
        </div>
        <div style={{padding:24,maxWidth:900,margin:'0 auto'}}>
          <div style={{...S.section,display:'flex',gap:20,alignItems:'center',marginBottom:16}}>
            <div>
              <div style={{fontSize:36,fontWeight:800,color:brColor}}>{br.total}</div>
              <div style={{fontSize:10,color:'#555',letterSpacing:1}}>BATTLE READINESS</div>
            </div>
            <div style={{flex:1}}>
              <div style={{height:6,background:'rgba(255,255,255,0.06)',borderRadius:3,overflow:'hidden'}}>
                <div style={{height:'100%',width:`${br.total}%`,background:brColor,borderRadius:3,transition:'width 0.6s'}}/>
              </div>
              <div style={{fontSize:13,fontWeight:700,color:brColor,marginTop:6}}>{br.label}</div>
            </div>
            <div style={{textAlign:'right'}}><div style={{fontSize:20,fontWeight:800,color:'#fff'}}>{scores.length}</div><div style={{fontSize:10,color:'#555',letterSpacing:1}}>PAPERS</div></div>
            <div style={{textAlign:'right'}}><div style={{fontSize:20,fontWeight:800,color:'#fff'}}>{errors.length}</div><div style={{fontSize:10,color:'#555',letterSpacing:1}}>ERRORS</div></div>
            <div style={{textAlign:'right'}}><div style={{fontSize:20,fontWeight:800,color:'#fff'}}>{Object.keys(checks).length}</div><div style={{fontSize:10,color:'#555',letterSpacing:1}}>TOPICS</div></div>
          </div>
          {avgBySubject.length>0&&(
            <div style={S.section}>
              <div style={S.sTitle}>SUBJECT AVERAGES</div>
              <div style={S.row}>
                {avgBySubject.map(({s,avg,grade,count})=>(
                  <div key={s} style={{background:'rgba(255,255,255,0.04)',border:`1px solid ${subColor(s)}33`,borderRadius:8,padding:'12px 16px',minWidth:130}}>
                    <div style={{fontSize:10,color:'#555',letterSpacing:1,marginBottom:4}}>{s.toUpperCase()}</div>
                    <div style={{fontSize:26,fontWeight:800,color:gradeColor(grade)}}>{grade}</div>
                    <div style={{fontSize:12,color:'#888'}}>{avg}% avg · {count} paper{count!==1?'s':''}</div>
                    {targets[s]&&<div style={{fontSize:10,color:'#555',marginTop:4}}>Target: {targets[s]}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={S.section}>
            <div style={S.sTitle}>PAST PAPERS ({scores.length})</div>
            {scores.length===0?<div style={S.empty}>No papers logged yet.</div>:
              scores.slice(0,30).map((sc,i)=>(
                <div key={i} style={S.scoreRow}>
                  <div>
                    <span style={{...S.chip(subColor(sc.subject)),marginRight:8}}>{sc.subject}</span>
                    <span style={{color:'#ccc'}}>{sc.paper}</span>
                  </div>
                  <div style={{display:'flex',gap:12,alignItems:'center'}}>
                    <span style={{color:'#555',fontSize:11}}>{sc.date}</span>
                    <span style={{color:'#888'}}>{sc.got}/{sc.max}</span>
                    <span style={{fontWeight:700,color:gradeColor(getGrade(sc.pct,sc.subject))}}>{sc.pct}% · {getGrade(sc.pct,sc.subject)}</span>
                  </div>
                </div>
              ))}
            {scores.length>30&&<div style={{fontSize:11,color:'#555',marginTop:8}}>+ {scores.length-30} more</div>}
          </div>
          <div style={S.section}>
            <div style={S.sTitle}>ERROR LOG ({errors.length})</div>
            {errors.length===0?<div style={S.empty}>No errors logged yet.</div>:
              errors.slice(0,20).map((e,i)=>(
                <div key={i} style={{...S.scoreRow,fontSize:12}}>
                  <div>
                    <span style={{...S.chip(subColor(e.subject)),marginRight:8}}>{e.subject}</span>
                    <span style={{color:'#ccc'}}>{e.topic}</span>
                    {e.note&&<span style={{color:'#555',fontSize:11}}> — {e.note}</span>}
                  </div>
                  <div style={{display:'flex',gap:8,alignItems:'center'}}>
                    <span style={{color:'#555',fontSize:11}}>{e.date}</span>
                    <span style={{...S.chip('#FF9100')}}>{e.type}</span>
                  </div>
                </div>
              ))}
          </div>
          {Object.keys(checks).length>0&&(
            <div style={S.section}>
              <div style={S.sTitle}>CHECKED TOPICS ({Object.keys(checks).length})</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                {Object.keys(checks).slice(0,60).map(k=>(
                  <span key={k} style={{...S.chip('#00E676'),fontSize:10}}>{k}</span>
                ))}
                {Object.keys(checks).length>60&&<span style={{color:'#555',fontSize:11}}>+ {Object.keys(checks).length-60} more</span>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main admin panel ────────────────────────────────────────────────────────

export default function AdminPanel({ currentUser, onBack }) {
  const [users,      setUsers]      = useState([]);
  const [referrals,  setReferrals]  = useState([]);
  const [groups,     setGroups]     = useState([]);
  const [groupMembers, setGroupMembers] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [selected,   setSelected]   = useState(null);
  const [hoveredRow, setHoveredRow] = useState(null);
  const [tab,        setTab]        = useState('analytics');

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const [
      { data: profiles },
      { data: userData },
      { data: refRows },
      { data: groupRows },
      { data: memberRows },
    ] = await Promise.all([
      supabase.from('user_profiles').select('*').order('created_at',{ascending:false}),
      supabase.from('user_data').select('*'),
      supabase.from('referrals').select('referrer_code,referred_user_id,created_at'),
      supabase.from('study_groups').select('id,name,created_by,created_at'),
      supabase.from('group_members').select('group_id,user_id'),
    ]);
    setReferrals(refRows || []);
    setGroups(groupRows || []);
    setGroupMembers(memberRows || []);
    if (!profiles) { setLoading(false); return; }

    const merged = profiles.map(p => {
      const rows = (userData||[]).filter(d=>d.user_id===p.id);
      const scores={}, errors={}, checks={}, targets={}, sessions={};
      rows.forEach(r => {
        scores[r.profile]   = r.scores   || [];
        errors[r.profile]   = r.errors   || [];
        checks[r.profile]   = r.checks   || {};
        targets[r.profile]  = r.targets  || {};
        sessions[r.profile] = r.sessions || [];
      });
      const allScores   = Object.values(scores).flat();
      const allErrors   = Object.values(errors).flat();
      const allSessions = Object.values(sessions).flat();
      const totalStudySecs = allSessions.reduce((a,s)=>a+(s.secs||0),0);
      const lastActive = rows.length
        ? rows.sort((a,b)=>new Date(b.updated_at)-new Date(a.updated_at))[0].updated_at
        : p.created_at;
      return { ...p, scores, errors, checks, targets, totalScores:allScores.length, totalErrors:allErrors.length, totalStudySecs, lastActive };
    });

    setUsers(merged);
    setLoading(false);
  };

  const toggleAdmin = async (user) => {
    const next = !user.is_admin;
    await supabase.from('user_profiles').update({is_admin:next}).eq('id',user.id);
    setUsers(prev=>prev.map(u=>u.id===user.id?{...u,is_admin:next}:u));
    if (selected?.id===user.id) setSelected(prev=>({...prev,is_admin:next}));
  };

  const filtered = users.filter(u=>
    !search || u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.display_name?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPapers = users.reduce((a,u)=>a+u.totalScores,0);
  const totalHours  = Math.round(users.reduce((a,u)=>a+(u.totalStudySecs||0),0)/3600);
  const proCount    = users.filter(u=>u.subscription_status==='active').length;

  const TABS = [
    { id:'analytics', label:'Product Analytics' },
    { id:'users',     label:'Users' },
  ];

  return (
    <>
      {selected&&<UserModal user={selected} onClose={()=>setSelected(null)} onToggleAdmin={toggleAdmin}/>}
      <div style={S.root}>
        <div style={S.header}>
          <div style={S.headerLeft}>
            <span style={S.logoA}>A*</span>
            <span style={S.logoT}>BATTLE PLAN</span>
            <span style={S.badge}>GOD MODE</span>
            <div style={{display:'flex',gap:4,marginLeft:8}}>
              {TABS.map(t=>(
                <button key={t.id} onClick={()=>setTab(t.id)} style={{
                  background:tab===t.id?'rgba(255,61,0,0.12)':'transparent',
                  border:`1px solid ${tab===t.id?'rgba(255,61,0,0.35)':'rgba(255,255,255,0.08)'}`,
                  color:tab===t.id?'#FF3D00':'#666', padding:'4px 12px', borderRadius:5, cursor:'pointer',
                  fontSize:11, fontWeight:700, fontFamily:'inherit', letterSpacing:0.3,
                }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <button style={S.backBtn} onClick={onBack}>← Exit Admin</button>
        </div>

        <div style={S.body}>
          {/* Top-line stat tiles (always visible) */}
          <div style={S.statsRow}>
            <div style={S.stat}><div style={S.statV}>{users.length}</div><div style={S.statL}>TOTAL USERS</div></div>
            <div style={{...S.stat,borderColor:'rgba(255,215,0,0.2)'}}><div style={{...S.statV,color:'#FFD600'}}>{proCount}</div><div style={S.statL}>PRO USERS</div></div>
            <div style={S.stat}><div style={S.statV}>{totalPapers}</div><div style={S.statL}>PAPERS LOGGED</div></div>
            <div style={S.stat}><div style={S.statV}>{totalHours}h</div><div style={S.statL}>HOURS STUDIED</div></div>
            <div style={{...S.stat,borderColor:'rgba(255,215,0,0.15)'}}><div style={{...S.statV,color:'#FFD600'}}>£{(proCount*4.99).toFixed(0)}</div><div style={S.statL}>MRR (EST)</div></div>
          </div>

          {loading?(
            <div style={{color:'#444',fontSize:13,padding:24}}>Loading data…</div>
          ):tab==='analytics'?(
            <AnalyticsDashboard users={users} referrals={referrals} groups={groups} groupMembers={groupMembers}/>
          ):(
            <>
              <input style={S.search} placeholder="Search by email or name…" value={search} onChange={e=>setSearch(e.target.value)}/>
              <table style={S.table}>
                <thead>
                  <tr>{['User','Joined','Last Active','Papers','Study','Pro','Role'].map(h=>(
                    <th key={h} style={S.th}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {filtered.length===0&&<tr><td colSpan={7} style={{...S.td,color:'#333'}}>No users found.</td></tr>}
                  {filtered.map(u=>(
                    <tr key={u.id} style={S.tr(hoveredRow===u.id)} onClick={()=>setSelected(u)}
                      onMouseEnter={()=>setHoveredRow(u.id)} onMouseLeave={()=>setHoveredRow(null)}>
                      <td style={S.td}>
                        <div style={{color:'#fff',fontWeight:600}}>{u.display_name||'—'}</div>
                        <div style={{color:'#555',fontSize:11}}>{u.email}</div>
                      </td>
                      <td style={{...S.td,color:'#666'}}>{new Date(u.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'2-digit'})}</td>
                      <td style={{...S.td,color:'#666'}}>{new Date(u.lastActive).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'2-digit'})}</td>
                      <td style={{...S.td,color:'#fff',fontWeight:700}}>{u.totalScores}</td>
                      <td style={{...S.td,color:'#666'}}>{u.totalStudySecs?`${Math.round(u.totalStudySecs/3600)}h`:'—'}</td>
                      <td style={S.td}>
                        {u.subscription_status==='active'
                          ? <span style={S.pill('#FFD600')}>Pro</span>
                          : u.subscription_status==='trialing'
                          ? <span style={S.pill('#40C4FF')}>Trial</span>
                          : <span style={S.pill('#333')}>Free</span>}
                      </td>
                      <td style={S.td}>
                        {u.is_admin?<span style={S.pill('#FF3D00')}>Admin</span>:<span style={S.pill('#333')}>User</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </>
  );
}
