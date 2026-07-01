// ── Rich text rendering ─────────────────────────────────────────────────────
// LaTeX (KaTeX), markdown-ish inline styles, fenced charts/graphs and code
// highlighting. KaTeX/highlight.js load lazily on first use - keep it that way.
import React, { useState, useEffect } from 'react';

// Lazy KaTeX: loaded on demand the first time a result with maths is shown.
let _katex=null,_katexPromise=null;
function loadKatex(){
  if(_katex) return Promise.resolve(_katex);
  if(_katexPromise) return _katexPromise;
  _katexPromise=(async()=>{
    try{ await import('katex/dist/katex.min.css'); }catch{} // styles are non-fatal
    const m=await import('katex');
    _katex=m.default||m; return _katex;
  })();
  return _katexPromise;
}
function _escHtml(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function _renderMath(text,katex){
  const re=/(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\$[^$\n]+?\$|\\\([\s\S]+?\\\))/g;
  let out='',last=0,m;
  while((m=re.exec(text))){
    out+=_escHtml(text.slice(last,m.index));
    const seg=m[0]; let display=false,body;
    if(seg.startsWith('$$')){display=true;body=seg.slice(2,-2);}
    else if(seg.startsWith('\\[')){display=true;body=seg.slice(2,-2);}
    else if(seg.startsWith('\\(')){body=seg.slice(2,-2);}
    else {body=seg.slice(1,-1);}
    try{ out+=katex.renderToString(body,{displayMode:display,throwOnError:false,output:'html'}); }
    catch{ out+=_escHtml(seg); }
    last=re.lastIndex;
  }
  out+=_escHtml(text.slice(last));
  return out;
}
// Renders a string that may contain LaTeX. Shows raw text until KaTeX is ready.
function MathText({children,style,as='span'}){
  const text=String(children??'');
  const hasMath=/\$|\\\(|\\\[/.test(text);
  const [k,setK]=useState(_katex);
  useEffect(()=>{ if(hasMath&&!_katex) loadKatex().then(setK).catch(()=>{}); },[hasMath]);
  const Tag=as;
  if(!hasMath||!k) return <Tag style={style}>{text}</Tag>;
  return <Tag style={style} dangerouslySetInnerHTML={{__html:_renderMath(text,k)}}/>;
}

// Syntax highlighting (lazy highlight.js) for fenced code blocks - CS, R, etc.
let _hljs=null,_hljsPromise=null;
function loadHljs(){
  if(_hljs) return Promise.resolve(_hljs);
  if(_hljsPromise) return _hljsPromise;
  _hljsPromise=(async()=>{
    try{ await import('highlight.js/styles/github-dark.css'); }catch{}
    const m=await import('highlight.js/lib/common');
    _hljs=m.default||m; return _hljs;
  })();
  return _hljsPromise;
}
// Inline markdown (code / bold / highlight / underline / italic) - reused for cells.
function _inlineMd(s){
  return s
    .replace(/`([^`\n]+)`/g,'<code style="background:rgba(127,127,127,0.16);border-radius:4px;padding:1px 5px;font-size:0.92em">$1</code>')
    .replace(/\*\*([^\n]+?)\*\*/g,'<strong style="font-weight:800">$1</strong>')
    .replace(/==([^=\n]+)==/g,'<mark style="background:rgba(250,204,21,0.40);color:inherit;padding:0 3px;border-radius:3px;font-weight:600">$1</mark>')
    .replace(/__([^_\n]+)__/g,'<u style="text-decoration-color:rgba(127,127,127,0.6);text-underline-offset:2px">$1</u>')
    .replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g,'$1<em>$2</em>');
}
// Draw a simple chart from a JSON spec as inline SVG (no dependency). Supports
// line / scatter (series of [x,y] points) and bar (categories + values) - enough
// for econ supply&demand, biology results, physics, geography data.
function _renderChart(raw){
  let spec; try{ spec=JSON.parse(raw); }catch{ return null; }
  if(!spec||typeof spec!=='object') return null;
  const fin=n=>Number.isFinite(n);
  const type=(spec.type||'line').toLowerCase();
  const W=560,H=260, pad={l:52,r:18,t:spec.title?30:16,b:46};
  const iw=W-pad.l-pad.r, ih=H-pad.t-pad.b;
  const COL=i=>['#b5735a','#0369a1','#15803d','#a855f7','#d97706','#dc2626'][i%6];
  const T=(x,y,t,o={})=>`<text x="${x}" y="${y}" font-size="${o.s||11}" fill="${o.c||'#999'}" text-anchor="${o.a||'middle'}"${o.w?` font-weight="${o.w}"`:''} font-family="system-ui,sans-serif">${_escHtml(t)}</text>`;
  let svg='';
  try{
    if(type==='bar'){
      const cats=Array.isArray(spec.categories)?spec.categories:[];
      const series=Array.isArray(spec.series)?spec.series:[];
      const vals=series.flatMap(s=>(s.values||[]).map(Number)).filter(fin);
      if(!cats.length||!vals.length) return null;
      let max=Math.max(0,...vals),min=Math.min(0,...vals); if(max===min)max=min+1;
      const x0=pad.l,y0=pad.t+ih,gw=iw/cats.length,bw=Math.min(gw*0.7/Math.max(1,series.length),46);
      for(let k=0;k<=4;k++){ const v=min+(max-min)*k/4,y=y0-(v-min)/(max-min)*ih; svg+=`<line x1="${x0}" y1="${y}" x2="${x0+iw}" y2="${y}" stroke="rgba(127,127,127,0.14)"/>`+T(x0-6,y+3,Math.round(v*100)/100,{a:'end'}); }
      cats.forEach((c,ci)=>{ series.forEach((s,si)=>{ const v=Number((s.values||[])[ci]); if(!fin(v))return; const h=(v-min)/(max-min)*ih; const bx=x0+ci*gw+gw/2-(series.length*bw)/2+si*bw; svg+=`<rect x="${bx}" y="${y0-Math.max(0,h)}" width="${bw-2}" height="${Math.abs(h)}" fill="${COL(si)}" rx="2"/>`; }); svg+=T(x0+ci*gw+gw/2,y0+16,c,{s:10}); });
    } else {
      const series=Array.isArray(spec.series)?spec.series:[];
      const pts=series.flatMap(s=>(s.points||[])).filter(p=>Array.isArray(p)&&fin(+p[0])&&fin(+p[1]));
      if(!pts.length) return null;
      const xs=pts.map(p=>+p[0]),ys=pts.map(p=>+p[1]);
      let xmin=Math.min(...xs),xmax=Math.max(...xs),ymin=Math.min(...ys),ymax=Math.max(...ys);
      if(xmin===xmax)xmax=xmin+1; if(ymin===ymax)ymax=ymin+1;
      const X=x=>pad.l+(x-xmin)/(xmax-xmin)*iw, Y=y=>pad.t+ih-(y-ymin)/(ymax-ymin)*ih;
      for(let k=0;k<=4;k++){ const gy=pad.t+ih*k/4,v=ymax-(ymax-ymin)*k/4; svg+=`<line x1="${pad.l}" y1="${gy}" x2="${pad.l+iw}" y2="${gy}" stroke="rgba(127,127,127,0.12)"/>`+T(pad.l-6,gy+3,Math.round(v*100)/100,{a:'end'}); }
      for(let k=0;k<=4;k++){ const gx=pad.l+iw*k/4,v=xmin+(xmax-xmin)*k/4; svg+=T(gx,pad.t+ih+16,Math.round(v*100)/100,{s:10}); }
      series.forEach((s,si)=>{ const ps=(s.points||[]).filter(p=>Array.isArray(p)&&fin(+p[0])&&fin(+p[1])).map(p=>[X(+p[0]),Y(+p[1])]);
        if(type!=='scatter'&&ps.length>1) svg+=`<polyline points="${ps.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ')}" fill="none" stroke="${COL(si)}" stroke-width="2"/>`;
        ps.forEach(p=>{ svg+=`<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${type==='scatter'?2.6:2}" fill="${COL(si)}"/>`; }); });
    }
    svg+=`<line x1="${pad.l}" y1="${pad.t}" x2="${pad.l}" y2="${pad.t+ih}" stroke="rgba(127,127,127,0.5)"/><line x1="${pad.l}" y1="${pad.t+ih}" x2="${pad.l+iw}" y2="${pad.t+ih}" stroke="rgba(127,127,127,0.5)"/>`;
    if(spec.title) svg=T(W/2,18,spec.title,{s:13,c:'currentColor',w:700})+svg;
    if(spec.xLabel) svg+=T(pad.l+iw/2,H-6,spec.xLabel,{s:11});
    if(spec.yLabel) svg+=`<text x="14" y="${pad.t+ih/2}" font-size="11" fill="#999" text-anchor="middle" font-family="system-ui,sans-serif" transform="rotate(-90 14 ${pad.t+ih/2})">${_escHtml(spec.yLabel)}</text>`;
    const names=(spec.series||[]).map(s=>s.name).filter(Boolean);
    const legend=names.length>1?'<div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-top:2px">'+names.map((n,i)=>`<span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;color:#888"><span style="width:10px;height:10px;border-radius:2px;background:${COL(i)};display:inline-block"></span>${_escHtml(n)}</span>`).join('')+'</div>':'';
    return `<div style="margin:10px 0"><svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:${W}px;height:auto;display:block">${svg}</svg>${legend}</div>`;
  }catch{ return null; }
}

// Node-edge graph/network renderer for Decision Maths (graphs, trees, networks,
// MST/Kruskal/Prim, Dijkstra shortest path, critical-path activity networks).
// Spec: {"type":"graph","directed":false,"title":"","nodes":[{"id":"A","label":"A","x":0,"y":0}],
//        "edges":[{"from":"A","to":"B","weight":5,"highlight":true}]}. x/y optional (auto circular layout).
function _renderGraph(raw){
  let spec; try{ spec=JSON.parse(raw); }catch{ return null; }
  if(!spec||typeof spec!=='object') return null;
  const nodes=(Array.isArray(spec.nodes)?spec.nodes:[]).slice(0,40);
  const edges=(Array.isArray(spec.edges)?spec.edges:[]).slice(0,80);
  if(!nodes.length) return null;
  const W=560,H=340,R=18,pad=40, directed=!!spec.directed, fin=n=>Number.isFinite(n);
  const byId={}; nodes.forEach(n=>{ byId[String(n.id)]=n; });
  try{
    const haveXY = nodes.every(n=>fin(+n.x)&&fin(+n.y));
    if(haveXY){
      const xs=nodes.map(n=>+n.x),ys=nodes.map(n=>+n.y);
      let xmin=Math.min(...xs),xmax=Math.max(...xs),ymin=Math.min(...ys),ymax=Math.max(...ys);
      if(xmin===xmax)xmax=xmin+1; if(ymin===ymax)ymax=ymin+1;
      nodes.forEach(n=>{ n._x=pad+((+n.x-xmin)/(xmax-xmin))*(W-2*pad); n._y=pad+((+n.y-ymin)/(ymax-ymin))*(H-2*pad); });
    } else {
      const cx=W/2,cy=H/2,rad=Math.min(W,H)/2-pad;
      nodes.forEach((n,i)=>{ const a=(i/nodes.length)*2*Math.PI-Math.PI/2; n._x=cx+rad*Math.cos(a); n._y=cy+rad*Math.sin(a); });
    }
    const ACC='#b5735a',HI='#15803d'; let svg='';
    if(directed) svg+=`<defs><marker id="rbpah" markerWidth="9" markerHeight="9" refX="7.5" refY="3" orient="auto"><path d="M0,0 L7.5,3 L0,6 Z" fill="#9b938b"/></marker><marker id="rbpahh" markerWidth="9" markerHeight="9" refX="7.5" refY="3" orient="auto"><path d="M0,0 L7.5,3 L0,6 Z" fill="${HI}"/></marker></defs>`;
    edges.forEach(e=>{
      const a=byId[String(e.from)],b=byId[String(e.to)]; if(!a||!b) return;
      const hl=!!e.highlight; let ex=b._x,ey=b._y;
      if(directed){ const dx=b._x-a._x,dy=b._y-a._y,len=Math.hypot(dx,dy)||1; ex=b._x-(dx/len)*R; ey=b._y-(dy/len)*R; }
      svg+=`<line x1="${a._x.toFixed(1)}" y1="${a._y.toFixed(1)}" x2="${ex.toFixed(1)}" y2="${ey.toFixed(1)}" stroke="${hl?HI:'#9b938b'}" stroke-width="${hl?3:1.6}"${directed?` marker-end="url(#${hl?'rbpahh':'rbpah'})"`:''}/>`;
      if(e.weight!=null&&e.weight!==''){ const mx=(a._x+b._x)/2,my=(a._y+b._y)/2;
        svg+=`<rect x="${(mx-12).toFixed(1)}" y="${(my-9).toFixed(1)}" width="24" height="16" rx="3" fill="#fbf7ef" stroke="rgba(127,127,127,0.25)"/>`+
             `<text x="${mx.toFixed(1)}" y="${(my+3).toFixed(1)}" font-size="10" fill="${hl?HI:'#574f48'}" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="${hl?700:400}">${_escHtml(e.weight)}</text>`; }
    });
    nodes.forEach(n=>{
      svg+=`<circle cx="${n._x.toFixed(1)}" cy="${n._y.toFixed(1)}" r="${R}" fill="#fff" stroke="${ACC}" stroke-width="2"/>`+
           `<text x="${n._x.toFixed(1)}" y="${(n._y+4).toFixed(1)}" font-size="12" fill="#2b2620" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="600">${_escHtml(n.label!=null?n.label:n.id)}</text>`;
    });
    const title=spec.title?`<div style="text-align:center;font-size:13px;font-weight:700;color:currentColor;margin-bottom:2px">${_escHtml(spec.title)}</div>`:'';
    return `<div style="margin:10px 0">${title}<svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:${W}px;height:auto;display:block">${svg}</svg></div>`;
  }catch{ return null; }
}
// Full renderer: markdown (bold/italic/code/headings/bullets/rule/TABLES) +
// fenced CODE blocks (highlighted) + CHARTS (```chart JSON) + LaTeX. So Caps's
// replies and the marker's feedback render cleanly across subjects.
function _renderRich(text,katex,hljs){
  const parts=[]; const blockIdx=new Set();
  const stash=(html,block)=>{ parts.push(html); if(block) blockIdx.add(parts.length-1); return '[[RB:'+(parts.length-1)+']]'; };
  let t=String(text??'');

  // 1) fenced code blocks ```lang … ``` (and ```chart JSON → SVG graph)
  t=t.replace(/```([a-zA-Z0-9+#._-]*)\n?([\s\S]*?)```/g,(m,lang,code)=>{
    if(/^(graph|network)$/i.test(lang||'')){ const g=_renderGraph(code.trim()); if(g) return stash(g,true); }
    if(/^chart$/i.test(lang||'')){ const c=_renderChart(code.trim()); if(c) return stash(c,true); }
    code=code.replace(/\n+$/,'');
    let inner;
    if(hljs){
      try{ inner=(lang&&hljs.getLanguage&&hljs.getLanguage(lang))
        ? hljs.highlight(code,{language:lang,ignoreIllegals:true}).value
        : hljs.highlightAuto(code).value; }
      catch{ inner=_escHtml(code); }
    } else inner=_escHtml(code);
    return stash(`<pre style="margin:9px 0;border-radius:8px;overflow:auto;font-size:12px;line-height:1.55"><code class="hljs language-${_escHtml(lang)}" style="font-family:ui-monospace,Menlo,Consolas,monospace">${inner}</code></pre>`,true);
  });

  // 2) maths (LaTeX)
  if(katex){
    const re=/(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\$[^$\n]+?\$|\\\([\s\S]+?\\\))/g;
    t=t.replace(re,(seg)=>{
      let display=false,body;
      if(seg.startsWith('$$')){display=true;body=seg.slice(2,-2);}
      else if(seg.startsWith('\\[')){display=true;body=seg.slice(2,-2);}
      else if(seg.startsWith('\\(')){body=seg.slice(2,-2);}
      else {body=seg.slice(1,-1);}
      let html; try{ html=katex.renderToString(body,{displayMode:display,throwOnError:false,output:'html'}); }catch{ html=_escHtml(seg); }
      return stash(html,display);
    });
  }

  let s=_escHtml(t);

  // 3) markdown pipe tables
  s=(function(str){
    const lines=str.split('\n'), out=[];
    const isRow=l=>/^\s*\|.*\|\s*$/.test(l);
    const isSep=l=>/^\s*\|?[\s:|-]+\|?\s*$/.test(l)&&/-/.test(l);
    const cells=l=>l.trim().replace(/^\|/,'').replace(/\|$/,'').split('|').map(c=>c.trim());
    for(let i=0;i<lines.length;i++){
      if(isRow(lines[i])&&i+1<lines.length&&isSep(lines[i+1])){
        const head=cells(lines[i]); let j=i+2; const body=[];
        while(j<lines.length&&isRow(lines[j])){ body.push(cells(lines[j])); j++; }
        const th='<tr>'+head.map(c=>`<th style="text-align:left;padding:6px 10px;border-bottom:1px solid rgba(127,127,127,0.35);font-weight:700;white-space:nowrap">${_inlineMd(c)}</th>`).join('')+'</tr>';
        const tb=body.map(r=>'<tr>'+r.map(c=>`<td style="padding:6px 10px;border-bottom:1px solid rgba(127,127,127,0.15)">${_inlineMd(c)}</td>`).join('')+'</tr>').join('');
        out.push(stash(`<div style="overflow-x:auto;margin:8px 0"><table style="border-collapse:collapse;width:100%;font-size:12.5px">${th}${tb}</table></div>`,true));
        i=j-1;
      } else out.push(lines[i]);
    }
    return out.join('\n');
  })(s);

  // 4) block markdown
  s=s.replace(/^[ \t]*#{3,6}[ \t]+(.+)$/gm,'<div style="font-weight:800;margin:8px 0 2px">$1</div>')
     .replace(/^[ \t]*##[ \t]+(.+)$/gm,'<div style="font-weight:800;font-size:1.05em;margin:8px 0 2px">$1</div>')
     .replace(/^[ \t]*#[ \t]+(.+)$/gm,'<div style="font-weight:800;font-size:1.1em;margin:8px 0 3px">$1</div>');
  s=s.replace(/^[ \t]*([-*_])\1{2,}[ \t]*$/gm,'<hr style="border:none;border-top:1px solid currentColor;opacity:0.18;margin:9px 0"/>');
  s=s.replace(/^[ \t]*[-*][ \t]+(.+)$/gm,'<div style="padding-left:14px;text-indent:-9px">&bull; $1</div>');

  // 5) inline markdown + line breaks (blank lines become real paragraph gaps)
  s=_inlineMd(s);
  s=s.replace(/\n{2,}/g,'<div style="height:8px"></div>');
  s=s.replace(/\n/g,'<br/>');
  s=s.replace(/<br\/>(<(?:div|hr|table))/g,'$1').replace(/(<\/div>|<hr[^>]*\/>)<br\/>/g,'$1');
  s=s.replace(/<br\/>(\[\[RB:(\d+)\]\])/g,(m,p,i)=>blockIdx.has(+i)?p:m);
  s=s.replace(/(\[\[RB:(\d+)\]\])<br\/>/g,(m,p,i)=>blockIdx.has(+i)?p:m);

  // 6) restore code / math / tables
  s=s.replace(/\[\[RB:(\d+)\]\]/g,(_,i)=>parts[i]);
  return s;
}
function RichText({children,style}){
  const text=String(children??'');
  const hasMath=/\$|\\\(|\\\[/.test(text);
  const hasCode=/```/.test(text);
  const [k,setK]=useState(_katex);
  const [hl,setHl]=useState(_hljs);
  useEffect(()=>{ if(hasMath&&!_katex) loadKatex().then(setK).catch(()=>{}); },[hasMath]);
  useEffect(()=>{ if(hasCode&&!_hljs) loadHljs().then(setHl).catch(()=>{}); },[hasCode]);
  if(hasMath&&!k) return <div style={style}>{text}</div>; // brief: wait for KaTeX
  return <div style={style} dangerouslySetInnerHTML={{__html:_renderRich(text,hasMath?k:null,hasCode?hl:null)}}/>;
}

export { loadKatex, loadHljs, MathText, RichText };
