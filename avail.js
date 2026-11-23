// ---------- Availability plan: third panel beside the project detail (#/project/<id>/units)
// Data: availability.js (window.AVAIL, full unit tables) is loaded on first open; data.js carries a compact p.avail summary.
// Built by _build/refresh_availability.py — see DATA_FORMAT.md › Availability.
(function(){
'use strict';
const avEsc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const avFmt=n=>!n?'On request':n>=1e6?'€'+(n/1e6).toFixed(2).replace(/\.?0+$/,'')+'M':'€'+Math.round(n/1e3)+'k';
const AVS={sort:'price',dir:1,only:true,type:'All',pid:null};
const avDate=d=>{if(!d)return '';const t=new Date(d+'T12:00:00');return isNaN(t)?d:t.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});};
const avEur=n=>n?'€'+Math.round(n).toLocaleString('en-GB'):'On request';
const avM2=n=>n?Math.round(n)+' m²':'–';
function avBadge(p,cls){const a=p.avail;if(!a||a.level==='unknown')return '';
 if(a.soldOut||a.available===0)return `<span class="avb sold ${cls||''}">Sold out</span>`;
 if(a.available==null)return '';
 return `<span class="avb ${cls||''}" title="${avEsc((a.source||'')+' · checked '+avDate(a.lastChecked))}">${a.available} unit${a.available==1?'':'s'} available</span>`;}
function avPriceRange(p,availOnly){const a=p.avail;if(!availOnly||!a||a.level==='unknown')return null;
 if(a.available===0)return false;if(a.priceMin)return [a.priceMin,a.priceMax||a.priceMin];return null;}
function avSec(p){const a=p.avail||{level:'unknown'};
 const head=a.level==='unknown'?'No live availability published':a.available===0||a.soldOut?'Sold out':(a.available!=null?`<b>${a.available}</b> available`+(a.total?` / ${a.total} total`:''):'Listed for sale');
 const ph=a.ph?` · <span class="phk">${a.ph} penthouse${a.ph>1?'s':''} available${a.phMin?' from '+avFmt(a.phMin):''}</span>`:'';
 return `<div class="dsec avsec"><h4>Availability</h4><div class="avline">${head}${ph}</div>${a.summary&&a.level!=='unit'?`<p class="note">${avEsc(a.summary)}</p>`:''}${p.penthouseSoldOut?`<p class="note phso">Penthouses: ${avEsc(p.penthouseSoldOut)}</p>`:''}<p class="note">${a.source?'Source: '+(a.sourceUrl?`<a href="${avEsc(a.sourceUrl)}" target="_blank" rel="noopener">${avEsc(a.source)} ↗</a>`:avEsc(a.source)):''}${a.asOf?' · dated '+avDate(a.asOf):''}${a.lastChecked?' · checked '+avDate(a.lastChecked):''}</p><div class="btns" style="margin-top:8px"><a class="btn primary" href="#/project/${p.id}/units">${a.level==='unit'?'▦ Availability plan':'▦ Availability summary'} →</a></div></div>`;}
(function(){const d=document.getElementById('detail');if(!d)return;const s=document.createElement('section');s.id='avail';s.setAttribute('aria-hidden','true');s.innerHTML='<div class="avscroll" id="avbody"></div>';d.after(s);})();
function avLoad(cb){if(window.AVAIL)return cb();const s=document.createElement('script');s.src='availability.js?v='+encodeURIComponent((window.MAPDATA&&window.MAPDATA.availUpdated)||'');s.onload=()=>cb();s.onerror=()=>cb('Could not load availability data');document.head.appendChild(s);}
const AVST={available:['Available','ok'],reserved:['Reserved','res'],sold:['Sold','sold']};
const avKey={id:u=>u.id||'',type:u=>u.type||'',beds:u=>u.beds||0,built:u=>u.built||0,terrace:u=>u.terrace||0,floor:u=>u.floor||'',price:u=>u.price||9e12,status:u=>({available:0,reserved:1,sold:2})[u.status]??3};
function avTable(a){let us=a.units.slice();const types=['All',...new Set(us.map(u=>u.type).filter(Boolean))];
 if(AVS.only)us=us.filter(u=>u.status==='available');if(AVS.type!=='All')us=us.filter(u=>u.type===AVS.type);
 const k=avKey[AVS.sort]||avKey.price;us.sort((x,y)=>{const a1=k(x),b1=k(y);return (typeof a1==='string'?a1.localeCompare(b1,undefined,{numeric:true}):a1-b1)*AVS.dir;});
 const th=(c,l)=>`<th data-s="${c}" class="${AVS.sort===c?'on '+(AVS.dir>0?'asc':'desc'):''}">${l}</th>`;
 return `<div class="avctl"><div class="chips" id="avtype">${types.map(t=>`<button data-t="${avEsc(t)}" class="${AVS.type===t?'on':''}">${t==='Penthouse'?'★ ':''}${avEsc(t)}</button>`).join('')}</div><label class="check"><input type="checkbox" id="avonly" ${AVS.only?'checked':''}> Available units only</label></div>
 <div class="avtw"><table class="avt"><thead><tr>${th('id','Unit')}${th('type','Type')}${th('beds','Beds')}${th('built','Built')}${th('terrace','Terrace')}${th('floor','Floor')}${th('price','Price')}${th('status','Status')}</tr></thead><tbody>${us.map(u=>{const s=AVST[u.status]||[u.status||'?','unk'];const tip=[u.label,u.typeFrom,u.note,u.usable?'Usable '+avM2(u.usable):'',u.garden?'Garden '+avM2(u.garden):'',u.plot?'Plot '+avM2(u.plot):'',u.baths?u.baths+' baths':''].filter(Boolean).join(' · ');
  return `<tr class="${u.type==='Penthouse'?'ph':''}" title="${avEsc(tip)}"><td>${u.src?`<a href="${avEsc(u.src)}" target="_blank" rel="noopener">${avEsc(u.id||'—')}</a>`:avEsc(u.id||'—')}</td><td>${u.type==='Penthouse'?'<b>★ Penthouse</b>':avEsc(u.type||'')}${u.typeFrom?' <sup>*</sup>':''}</td><td>${u.beds||'–'}</td><td>${avM2(u.built)}</td><td>${avM2(u.terrace)}</td><td class="fl">${avEsc(u.floor||'–')}</td><td class="pr">${avEur(u.price)}</td><td><span class="avs ${s[1]}">${s[0]}</span></td></tr>`;}).join('')||'<tr><td colspan="8" class="note">No units match.</td></tr>'}</tbody></table></div>
 ${a.units.some(u=>u.typeFrom)?'<p class="note">* Penthouse label taken from another dated source for the same unit (hover the row for details).</p>':''}<p class="note">Hover a row for usable area, garden, plot and notes. Click a unit to open its source page.</p>`;}
function avRender(){const pid=AVS.pid,p=window.MAPDATA.properties.find(x=>x.id===pid),a=window.AVAIL&&AVAIL.projects[pid];const b=document.getElementById('avbody');
 if(!p){b.innerHTML='';return;}
 if(!a){b.innerHTML=`<div class="avhead"><a class="close" href="#/project/${pid}" aria-label="Close">✕</a><div class="avk">Availability</div><h2>${avEsc(p.name)}</h2></div><div class="dsec"><p class="p">No availability data for this project yet.</p></div>`;return;}
 const prim=a.sources.find(s=>s.primary)||a.sources[0]||{};
 const cnt=a.available!=null?`<b>${a.available}</b> available${a.total?` <span>/ ${a.total} total</span>`:''}`:'<b>—</b> <span>not published</span>';
 const extra=[a.reserved?a.reserved+' reserved':'',a.sold?a.sold+' sold':'',a.penthouse&&a.penthouse.available?`<span class="phk">★ ${a.penthouse.available} penthouse${a.penthouse.available>1?'s':''} available${a.penthouse.priceMin?' · '+avFmt(a.penthouse.priceMin)+(a.penthouse.priceMax>a.penthouse.priceMin?'–'+avFmt(a.penthouse.priceMax):''):''}</span>`:'',a.priceMin?'Prices '+avFmt(a.priceMin)+(a.priceMax>a.priceMin?'–'+avFmt(a.priceMax):''):''].filter(Boolean);
 let h=`<div class="avhead"><a class="close" href="#/project/${pid}" aria-label="Close availability">✕</a><div class="avk">Availability plan · ${avEsc(a.level==='unit'?'unit list':a.level==='project'?'project-level summary':'not published')}</div><h2>${avEsc(p.name)}</h2><div class="avcnt">${cnt}</div>${extra.length?`<div class="avx">${extra.join(' · ')}</div>`:''}<div class="avdate">Last checked ${avDate(a.lastChecked)}${prim.asOf&&prim.asOf!==a.lastChecked?' · source dated '+avDate(prim.asOf):''}${a.stale?' · <b>stale</b>':''}</div></div>`;
 if(a.units&&a.units.length&&a.level==='unit')h+=`<div class="dsec">${avTable(a)}</div>`;
 else{h+=`<div class="dsec"><h4>Summary</h4><p class="p">${avEsc(a.summary||'No availability published')}</p>${a.totalNote?`<p class="note">${avEsc(a.totalNote)}</p>`:''}${a.units&&a.units.length?`<p class="note" style="margin-top:8px">Individual units found in agent listings (not a full list):</p><div class="avtw">${avTable(a)}</div>`:''}</div>`;}
 const pe=a.penthouse&&a.penthouse.evidence||[];
 if(pe.length)h+=`<div class="dsec phsec"><h4><span class="tag ph">Penthouse</span> Penthouse listings</h4>${pe.map(e=>`<p class="p" style="margin:0 0 8px">${avEsc(e.text)} — <a href="${avEsc(e.url)}" target="_blank" rel="noopener">${avEsc(e.label)} ↗</a></p>`).join('')}</div>`;
 if(a.penthouse&&a.penthouse.note)h+=`<div class="dsec"><p class="note phso">${avEsc(a.penthouse.note)}</p></div>`;
 if(p.penthouseSoldOut&&!(a.penthouse&&a.penthouse.note))h+=`<div class="dsec"><p class="note phso">Penthouses: ${avEsc(p.penthouseSoldOut)}</p></div>`;
 h+=`<div class="dsec"><h4>Sources</h4>${a.sources.map(s=>`<div class="avsrc ${s.primary?'prim':''}"><a href="${avEsc(s.url)}" target="_blank" rel="noopener">${avEsc(s.label)} ↗</a>${s.primary?' <span class="tag green">used for table</span>':''}<div class="note">${[s.asOf?'dated '+avDate(s.asOf):'',s.checked?'checked '+avDate(s.checked):'',s.available!=null?s.available+' available'+(s.total?' of '+s.total:''):'',s.penthousesAvailable?s.penthousesAvailable+' penthouse(s)':'',s.note].filter(Boolean).map(avEsc).join(' · ')}</div></div>`).join('')}${(a.notes||[]).map(n=>`<p class="note" style="margin-top:6px">${avEsc(n)}</p>`).join('')}<p class="note" style="margin-top:8px">Agents publish their own lists; counts can differ between sources and units sell fast. Confirm with the developer before reserving. Prices as published (usually excl. 10% VAT).</p></div>`;
 b.innerHTML=h;
 b.querySelectorAll('.avt th').forEach(x=>x.onclick=()=>{const c=x.dataset.s;AVS.dir=AVS.sort===c?-AVS.dir:1;AVS.sort=c;avRender();});
 b.querySelectorAll('#avtype button').forEach(x=>x.onclick=()=>{AVS.type=x.dataset.t;avRender();});
 const o=b.querySelector('#avonly');if(o)o.onchange=e=>{AVS.only=e.target.checked;avRender();};}
function avRoute(){const m=location.hash.match(/^#\/project\/([\w-]+)\/units/);const el=document.getElementById('avail');if(!el)return;
 if(!m){el.classList.remove('open');el.setAttribute('aria-hidden','true');document.body.classList.remove('av-open');return;}
 if(AVS.pid!==m[1]){AVS.pid=m[1];AVS.type='All';AVS.sort='price';AVS.dir=1;}
 document.getElementById('avbody').innerHTML='<div class="dsec note">Loading availability…</div>';
 el.classList.add('open');el.setAttribute('aria-hidden','false');document.body.classList.add('av-open');
 avLoad(err=>{if(err){document.getElementById('avbody').innerHTML='<div class="dsec note">'+avEsc(err)+'</div>';return;}avRender();document.getElementById('avbody').scrollTop=0;});}
addEventListener('hashchange',()=>setTimeout(avRoute,0));addEventListener('load',()=>setTimeout(avRoute,0));
addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('av-open')&&AVS.pid)location.hash='#/project/'+AVS.pid;});
window.avBadge=avBadge;window.avSec=avSec;window.avPriceRange=avPriceRange;
})();
