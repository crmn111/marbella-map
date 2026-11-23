(function(){
'use strict';
const D=window.MAPDATA, $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=n=>!n?'On request':n>=1e6?'€'+(n/1e6).toFixed(2).replace(/\.?0+$/,'')+'M':'€'+Math.round(n/1e3)+'k';
const isNS=v=>!v||/^not (stated|verified|published|announced|assessed)/i.test(v);
const hav=(a,b,c,d)=>{const R=6371,r=x=>x*Math.PI/180;const x=Math.sin(r(c-a)/2)**2+Math.cos(r(a))*Math.cos(r(c))*Math.sin(r(d-b)/2)**2;return 2*R*Math.asin(Math.sqrt(x));};
const ZM={'Marbella East':'marbella-east','Golden Mile':'golden-mile','Benahavís':'benahavis','Estepona':'estepona','Casares / Manilva / Sotogrande':'casares-manilva-sotogrande','Mijas':'mijas-costa'};
const inPoly=(lat,lng,poly)=>{let ins=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [yi,xi]=poly[i],[yj,xj]=poly[j];if(((yi>lat)!=(yj>lat))&&(lng<(xj-xi)*(lat-yi)/(yj-yi)+xi))ins=!ins;}return ins;};
D.properties.forEach(p=>{p.zoneObj=D.zones.find(z=>z.id===ZM[p.zone])||D.zones.find(z=>z.rank&&inPoly(p.lat,p.lng,z.poly));});
const fitCls=v=>v>=8?'hi':v>=6?'mid':'lo';
const POIL=D.poiLayers||[];

// ---------- map & basemaps
const map=L.map('map',{zoomControl:false,minZoom:9,maxZoom:18}).setView([36.47,-5.0],11);
L.control.zoom({position:'topright'}).addTo(map);
L.control.scale({position:'bottomleft',imperial:false}).addTo(map);
const esri='Tiles &copy; Esri &mdash; Esri, HERE, Garmin, FAO, NOAA, USGS, &copy; OpenStreetMap contributors';
const E=(p,o)=>L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/'+p+'/MapServer/tile/{z}/{y}/{x}',Object.assign({maxZoom:19,attribution:esri},o||{}));
const bases={voyager:E('World_Topo_Map'),
 positron:L.layerGroup([E('Canvas/World_Light_Gray_Base',{maxNativeZoom:16}),E('Canvas/World_Light_Gray_Reference',{maxNativeZoom:16,attribution:''})]),
 osm:L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}),
 imagery:L.layerGroup([E('World_Imagery',{attribution:'Imagery &copy; Esri, Maxar, Earthstar Geographics'}),E('Reference/World_Boundaries_and_Places',{attribution:''})])};
let curBase=bases.voyager.addTo(map);
$$('#basemaps button').forEach(b=>b.onclick=()=>{map.removeLayer(curBase);curBase=bases[b.dataset.b].addTo(map);$$('#basemaps button').forEach(x=>x.classList.toggle('on',x===b));});
map.createPane('roads');map.getPane('roads').style.zIndex=390;

// ---------- layers
const layers={props:L.layerGroup().addTo(map),schools:L.layerGroup().addTo(map),zones:L.layerGroup().addTo(map),pois:L.layerGroup().addTo(map),train:L.layerGroup().addTo(map),roads:L.layerGroup()};
POIL.forEach(g=>{layers['poi_'+g.id]=L.layerGroup();if(g.on)layers['poi_'+g.id].addTo(map);});
const zoneStyle={growth:['#e08a4a',.16],blue:['#3467a8',.16],upgrade:['#9b59b6',.14],neutral:['#2f7d5b',.10],heritage:['#b5485d',.22]};
const zoneLayers={},zoneLabels={};
function zoneLabelHtml(z){const short=z.short||z.name.split(/[:,(]/)[0].replace(/Nueva Andalucía /,'');
 return `<div class="zl">${z.rank?'<b>#'+z.rank+'</b> ':''}${esc(short)}${st.scores&&(z.growth||z.avgFit!=null)?`<span class="zb">${z.growth?esc(z.growth):''}${z.growth&&z.avgFit!=null?' · ':''}${z.avgFit!=null?'fit '+z.avgFit:''}</span>`:''}</div>`;}
const st={scope:'all',type:'All',year:'All',pmin:0,pmax:27,unknown:true,availOnly:false,terrace:false,q:'',sort:'fit',scores:true,minFit:0,layers:{props:1,schools:1,zones:1,pois:1,train:1,roads:0}};
POIL.forEach(g=>st.layers['poi_'+g.id]=g.on?1:0);
D.zones.forEach(z=>{const [c,o]=zoneStyle[z.tone]||zoneStyle.neutral;
 const pg=L.polygon(z.poly,{color:c,weight:z.tone==='heritage'?2.2:1.6,dashArray:z.tone==='heritage'?null:'5 4',fillColor:c,fillOpacity:o}).addTo(layers.zones);
 pg.bindTooltip((z.rank?('#'+z.rank+' '):'')+esc(z.name)+(z.metric?'<br><b>'+esc(z.metric)+'</b>':''),{sticky:true,className:'tt'});
 pg.on('click',()=>go('zone',z.id));pg.on('mouseover',()=>pg.setStyle({fillOpacity:o+.12}));pg.on('mouseout',()=>pg.setStyle({fillOpacity:o}));
 zoneLayers[z.id]=pg;
 const at=z.labelAt||pg.getBounds().getCenter();
 zoneLabels[z.id]=L.marker(at,{icon:L.divIcon({className:'zlabel',html:zoneLabelHtml(z),iconSize:[200,34],iconAnchor:[100,17]}),interactive:false}).addTo(layers.zones);
});
const tr=L.polyline(D.train.line,{color:'#9b59b6',weight:4,dashArray:'2 9',lineCap:'round',opacity:.85}).addTo(layers.train);
tr.bindTooltip('Coastal train study — schematic, no route defined',{sticky:true,className:'tt'});tr.on('click',()=>go('train','corridor'));
// roads
const RC={'AP-7':'#d1495b','A-7':'#edae49','A-355':'#00798c','A-397':'#30638e'};
(D.roads||[]).forEach(r=>{const c=RC[r.ref]||'#555';
 r.lines.forEach(l=>{L.polyline(l,{pane:'roads',color:'#fff',weight:7,opacity:.9}).addTo(layers.roads);
  L.polyline(l,{pane:'roads',color:c,weight:r.ref==='AP-7'?4.5:3.5,opacity:.95}).bindTooltip(`<b>${esc(r.ref)}</b> · ${esc(r.name)}`,{sticky:true,className:'tt'}).addTo(layers.roads);});
 (r.labels||[]).forEach(ll=>L.marker(ll,{icon:L.divIcon({className:'',html:`<div class="shield" style="background:${c}">${esc(r.ref)}</div>`,iconSize:[44,20],iconAnchor:[22,10]}),interactive:false}).addTo(layers.roads));
});
(D.junctions||[]).forEach(j=>{L.marker([j.lat,j.lng],{icon:L.divIcon({className:'',html:`<div class="jx">${esc(j.ref?('Exit '+j.ref):'Exit')}</div>`,iconSize:[0,0]})}).bindTooltip(`<b>${esc(j.ref?'Exit '+j.ref:'Junction')}</b>${j.name?' · '+esc(j.name):''}<br>${esc(j.road||'')}${j.near?'<br>Near '+esc(j.near):''}`,{direction:'top',className:'tt'}).addTo(layers.roads);});

// ---------- markers
const markers={};
const propClass=p=>p.shortlist?'gold':p.ultra?'ultra':p.category==='Branded residences'?'plum':p.premium?'sea':'navy';
const tierLbl=p=>p.shortlist?'Shortlist ≤ €3M':p.ultra?'Ultra-prime €10M+':p.premium?(p.price?'Sea view €3–10M':'Luxury pipeline · price TBA'):'Pipeline';
const webBtn=(u,label,cls)=>u?`<a class="btn web ${cls||''}" href="${esc(u)}" target="_blank" rel="noopener">${label} ↗</a>`:'';
function popProject(p){const ph=p.photos&&p.photos[0];
 return `<div class="pop go" role="link" tabindex="0" onclick="if(!event.target.closest('a'))location.hash='#/project/${p.id}'">${ph?`<img src="${ph.thumb}" alt="">`:`<div class="ph-ph sm">${catIcon(p)}</div>`}<div class="pb"><div class="pk">${tierLbl(p)} · ${esc(p.category)}${p.penthouse?' · <b class="phk">Penthouses</b>':''}</div><h3>${esc(p.name)}</h3><div class="pa">${esc(p.area)}</div><div class="pr"><b>${esc(p.priceText)}</b><span class="fit ${fitCls(p.fit)}">Fit ${p.fit}</span></div>${typeof avBadge==='function'?avBadge(p,'pop'):''}<div class="pbtn"><a class="btn primary vd" href="#/project/${p.id}">View details →</a></div>${ph?`<div class="credit">Photo: ${esc(p.photoCredit)}</div>`:''}</div></div>`;}
function popSchool(s){const ph=s.photos&&s.photos[0];
 return `<div class="pop go" role="link" tabindex="0" onclick="if(!event.target.closest('a'))location.hash='#/school/${s.id}'">${ph?`<img src="${ph.thumb}" alt="">`:''}<div class="pb"><div class="pk">International school · #${s.rank}</div><h3>${esc(s.name)}</h3><div class="pa">${esc(s.curriculum)}</div><div class="pr"><span class="fit sch">${esc(s.badge)}</span></div><div class="pbtn"><a class="btn primary vd" href="#/school/${s.id}">View details →</a></div></div></div>`;}
function popPoi(x,g){return `<div class="pop${x.id&&!g?' go':''}" ${x.id&&!g?`onclick="if(!event.target.closest('a'))location.hash='#/place/${x.id}'"`:''}><div class="pb"><div class="pk">${esc(g?g.name:x.kind)}</div><h3>${esc(x.name)}</h3>${x.type?`<div class="pa">${esc(x.type)}</div>`:''}${x.detail?`<p class="pd">${esc(x.detail)}</p>`:''}<div class="pbtn">${x.id&&!g?`<a class="btn primary vd" href="#/place/${x.id}">View details →</a>`:webBtn(x.url,'Website','sm')}${x.osm&&!(x.id&&!g)?`<a class="btn sm" href="${x.osm}" target="_blank" rel="noopener">OpenStreetMap ↗</a>`:''}</div></div></div>`;}
function propIcon(p){return L.divIcon({className:'',html:`<div class="mk ${propClass(p)} ${p.precise?'':'approx'}"><div class="pill">${p.price?fmt(p.price)+(p.priceHi&&p.priceHi>10e6&&p.price<10e6?'+':''):'TBA'}${st.scores?`<b class="fs ${fitCls(p.fit)}">${p.fit}</b>`:''}</div></div>`,iconSize:[0,0],iconAnchor:[0,0]});}
function schoolIcon(s){return L.divIcon({className:'',html:`<div class="mk-school ${s.precise?'':'approx'}">🎓</div>${st.scores&&!/^No results/.test(s.badge)?`<div class="sbadge">${esc(s.badge)}</div>`:''}`,iconSize:[30,30],iconAnchor:[15,15]});}
const popOpts={maxWidth:300,minWidth:260,className:'ppop',offset:[0,-26]};
D.properties.forEach(p=>{const m=L.marker([p.lat,p.lng],{icon:propIcon(p),riseOnHover:true,title:p.name});m.bindPopup(()=>popProject(p),popOpts);markers['project/'+p.id]=m;});
D.schools.forEach(s=>{const m=L.marker([s.lat,s.lng],{icon:schoolIcon(s),title:s.name});m.bindPopup(()=>popSchool(s),Object.assign({},popOpts,{offset:[0,-8]}));m.addTo(layers.schools);markers['school/'+s.id]=m;});
const poiIcon=k=>k==='Marina'?'⚓':k==='Catalyst'?'★':k==='Golf resort'?'⛳':k==='Old town'?'⛪':'◆';
D.pois.forEach(s=>{const m=L.marker([s.lat,s.lng],{icon:L.divIcon({className:'',html:`<div class="mk-poi ${s.kind==='Old town'?'old':''}">${poiIcon(s.kind)}</div>`,iconSize:[30,30],iconAnchor:[15,15]}),title:s.name});
 m.bindPopup(()=>popPoi(s),Object.assign({},popOpts,{offset:[0,-8]}));m.addTo(layers.pois);markers['place/'+s.id]=m;});
POIL.forEach(g=>g.items.forEach(x=>{L.marker([x.lat,x.lng],{icon:L.divIcon({className:'',html:`<div class="mk-x" style="background:${g.color}">${g.icon}</div>`,iconSize:[24,24],iconAnchor:[12,12]}),title:x.name})
 .bindTooltip(`<b>${esc(x.name)}</b><br>${esc(g.name)}`,{direction:'top',offset:[0,-10],className:'tt'}).bindPopup(()=>popPoi(x,g),Object.assign({},popOpts,{offset:[0,-6]})).addTo(layers['poi_'+g.id]);}));
function refreshIcons(){D.properties.forEach(p=>markers['project/'+p.id].setIcon(propIcon(p)));D.schools.forEach(s=>markers['school/'+s.id].setIcon(schoolIcon(s)));D.zones.forEach(z=>zoneLabels[z.id].setIcon(L.divIcon({className:'zlabel',html:zoneLabelHtml(z),iconSize:[200,34],iconAnchor:[100,17]})));}

// ---------- filters UI
const types=['All','Villa','Townhouse','Apartment','Penthouse','Branded residences'],years=['All','2028','2029','2030+','Not stated'];
const utOf=p=>p.unitTypes||[p.category==='Apartment / penthouse'?'Apartment':p.category];
$('#f-type').innerHTML=types.map(t=>`<button data-v="${t}" class="${t==='All'?'on':''}">${t==='Penthouse'?'★ ':''}${t}${t==='All'?'':` <small>${D.properties.filter(p=>utOf(p).includes(t)).length}</small>`}</button>`).join('');
$('#f-year').innerHTML=years.map(t=>`<button data-v="${t}" class="${t==='All'?'on':''}">${t}</button>`).join('');
const layerDefs=[['props','d-prop','Projects'],['schools','d-school','Schools'],['zones','d-zone','Hotspots'],['pois','d-poi','Marinas & catalysts'],['train','d-train','Train study'],['roads','d-road','Main roads & exits']].concat(POIL.map(g=>['poi_'+g.id,'',g.name,g.color]));
$('#f-layers').innerHTML=layerDefs.map(([k,c,n,col])=>`<button data-l="${k}" class="${st.layers[k]?'on':''}"><i class="dot ${c}" ${col?`style="background:${col}"`:''}></i>${esc(n)}${k.startsWith('poi_')?` <small>${POIL.find(g=>'poi_'+g.id===k).items.length}</small>`:''}</button>`).join('');
const chipGroup=(sel,key)=>$$(sel+' button').forEach(b=>b.onclick=()=>{st[key]=b.dataset.v;$$(sel+' button').forEach(x=>x.classList.toggle('on',x===b));render();});
chipGroup('#f-type','type');chipGroup('#f-year','year');chipGroup('#f-scope','scope');
const PS=[0,500e3,750e3,1e6,1.25e6,1.5e6,1.75e6,2e6,2.25e6,2.5e6,2.75e6,3e6,3.5e6,4e6,4.5e6,5e6,6e6,7e6,7.5e6,8e6,9e6,10e6,12.5e6,15e6,20e6,25e6,30e6,Infinity];const PT=PS.length-1;
const pmn=$('#f-pmin'),pmx=$('#f-pmax');
function pv(){const a=+pmn.value,b=+pmx.value;const lo=PS[a],hi=PS[b];$('#pval').textContent=(a===0&&b===PT)?'Any':(a===0?'≤ '+fmt(hi):b===PT?fmt(lo)+'+':fmt(lo)+' – '+fmt(hi));
 $('#dfill').style.left=(a/PT*100)+'%';$('#dfill').style.right=(100-b/PT*100)+'%';
 document.querySelectorAll('#f-preset button').forEach(x=>x.classList.toggle('on',x.dataset.p===a+','+b));}
function setP(a,b){st.pmin=a;st.pmax=b;pmn.value=a;pmx.value=b;pv();render();}
pmn.oninput=()=>{let a=+pmn.value;if(a>+pmx.value-1){a=Math.max(0,+pmx.value-1);pmn.value=a;}setP(a,+pmx.value);};
pmx.oninput=()=>{let b=+pmx.value;if(b<+pmn.value+1){b=Math.min(PT,+pmn.value+1);pmx.value=b;}setP(+pmn.value,b);};
document.querySelectorAll('#f-preset button').forEach(x=>x.onclick=()=>{const [a,b]=x.dataset.p.split(',').map(Number);setP(a,b);});
$('#f-unknown').onchange=e=>{st.unknown=e.target.checked;render();};
$('#uval').textContent='('+D.properties.filter(p=>!p.price).length+')';pv();
const priceOk=p=>{const r=typeof avPriceRange==='function'?avPriceRange(p,st.availOnly):null;if(r===false)return false;if(r)return r[0]<=PS[st.pmax]&&r[1]>=PS[st.pmin];return !p.price?st.unknown:(p.price<=PS[st.pmax]&&(p.priceHi||p.price)>=PS[st.pmin]);};
const avo=$('#f-availonly');if(avo)avo.onchange=e=>{st.availOnly=e.target.checked;render();};
const fr=$('#f-fit');const fv=()=>{$('#fval').textContent=+fr.value?'≥ '+fr.value:'Any';};fr.oninput=()=>{st.minFit=+fr.value;fv();render();};fv();
$('#f-terrace').onchange=e=>{st.terrace=e.target.checked;render();};
$('#f-scores').onchange=e=>{st.scores=e.target.checked;refreshIcons();render();};
$('#q').oninput=e=>{st.q=e.target.value.trim().toLowerCase();render();};
$('#sort').onchange=e=>{st.sort=e.target.value;render();};
$$('#f-layers button').forEach(b=>b.onclick=()=>{const l=b.dataset.l;st.layers[l]=!st.layers[l];b.classList.toggle('on',!!st.layers[l]);st.layers[l]?layers[l].addTo(map):map.removeLayer(layers[l]);render();});
$('#infobtn').onclick=()=>$('#info').classList.toggle('open');$('#infoclose').onclick=()=>$('#info').classList.remove('open');
$('#infotext').textContent=D.scoreInfo;
const yb=p=>!p.year?'Not stated':p.year>=2030?'2030+':String(p.year);
const match=(o,f)=>!st.q||f.some(k=>String(o[k]||'').toLowerCase().includes(st.q));
function visibleProps(){return D.properties.filter(p=>(st.scope==='all'||(st.scope==='shortlist'?p.shortlist:st.scope==='ultra'?p.ultra:p.premium))&&(st.type==='All'||utOf(p).includes(st.type))&&(st.year==='All'||yb(p)===st.year)&&priceOk(p)&&(!st.terrace||(p.terraceMax||0)>=60)&&p.fit>=st.minFit&&match(p,['name','area','zone','developer','kind','category']));}
function sortP(a){const s=st.sort;return a.sort((x,y)=>s==='fit'?y.fit-x.fit:s==='name'?x.name.localeCompare(y.name):s==='year'?(x.year||9999)-(y.year||9999):s==='year-desc'?(y.year||0)-(x.year||0):s==='price-desc'?(y.price||0)-(x.price||0):(x.price||9e12)-(y.price||9e12));}
$('#upd').textContent=D.updated;
const nPoi=POIL.reduce((a,g)=>a+g.items.length,0);
$('#stats').innerHTML=[[D.properties.length,'Projects'],[D.properties.filter(p=>p.shortlist).length,'Shortlist ≤ €3M'],[D.properties.filter(p=>p.premium).length,'€3–10M sea view'],[D.properties.filter(p=>p.ultra).length,'Ultra-prime €10M+'],[D.schools.length,'Schools'],[nPoi+D.pois.length,'Places']].map(([n,l])=>`<div><b>${n}</b><span>${l}</span></div>`).join('');
const catIcon=p=>p.category==='Villa'?'⌂':p.category==='Townhouse'?'▥':p.category==='Branded residences'?'✦':'▤';
const catBg=p=>p.shortlist?'linear-gradient(135deg,#b88a3e,#d9b56f)':p.category==='Branded residences'?'#6d3f78':p.ultra?'#1c1a17':p.premium?'#1f6fb2':'#0f2a3f';
function render(){
 if(typeof SW!=='undefined'&&SW.open)setTimeout(swBuild,0);
 const vp=sortP(visibleProps());layers.props.clearLayers();vp.forEach(p=>markers['project/'+p.id].addTo(layers.props));
 let h='';
 if(st.layers.props){h+=vp.map(p=>{const ph=p.photos&&p.photos[0];return `<div class="card" data-r="project/${p.id}">${ph?`<div class="th" style="background-image:url('${ph.thumb}')"></div>`:`<div class="ic" style="background:${catBg(p)}">${catIcon(p)}</div>`}<div style="flex:1;min-width:0"><div style="display:flex;gap:8px;align-items:flex-start"><h3>${esc(p.name)}</h3><span class="price">${p.price?fmt(p.price):'TBA'}</span></div><div class="sub">${esc(p.area)}</div><div class="row"><span class="fit ${fitCls(p.fit)}">Fit ${p.fit}</span>${typeof avBadge==='function'?avBadge(p,'sm'):''}${p.shortlist?'<span class="tag gold">Shortlist</span>':p.ultra?'<span class="tag ultra">Ultra-prime €10M+</span>':p.premium?'<span class="tag sea">€3–10M sea view</span>':''}<span class="tag">${esc(p.category)}</span>${p.penthouse?'<span class="tag ph">Penthouse</span>':''}<span class="tag navy">${esc(p.delivery)}</span>${(p.terraceMax||0)>=60?`<span class="tag green">Terrace ${p.terraceMax} m²</span>`:''}${p.precise?'':'<span class="tag warn">◌ approx.</span>'}</div></div><span class="cardgo" aria-hidden="true">›</span></div>`;}).join('')||'<div class="note" style="padding:10px">No projects match these filters.</div>';}
 const sc=D.schools.filter(s=>match(s,['name','area','curriculum']));
 if(st.layers.schools&&sc.length){h+='<div class="section-label">International schools</div>'+sc.map(s=>`<div class="card" data-r="school/${s.id}"><div class="ic" style="background:#2f7d5b">🎓</div><div style="flex:1"><h3>#${s.rank} ${esc(s.name)}</h3><div class="sub">${esc(s.area)} · ages ${esc(s.ages)}</div><div class="row"><span class="fit sch">${esc(s.badge)}</span><span class="tag green">${esc(s.curriculum.split(/[,(]/)[0])}</span></div></div></div>`).join('');}
 const zs=D.zones.filter(z=>match(z,['name','detail']));
 if(st.layers.zones&&zs.length){h+='<div class="section-label">Hotspots & areas</div>'+zs.map(z=>`<div class="card" data-r="zone/${z.id}"><div class="ic" style="background:${z.tone==='heritage'?'#b5485d':'#e08a4a'}">${z.rank||'•'}</div><div style="flex:1"><h3>${esc(z.name)}</h3><div class="sub">${esc(z.metric||z.label)}</div><div class="row"><span class="tag warn">${esc(z.label)}</span>${z.avgFit!=null?`<span class="fit ${fitCls(z.avgFit)}">Avg fit ${z.avgFit}</span>`:''}</div></div></div>`).join('');}
 const ps=D.pois.filter(z=>match(z,['name','detail','kind']));
 if(st.layers.pois&&ps.length){h+='<div class="section-label">Old towns, marinas & catalysts</div>'+ps.map(z=>`<div class="card" data-r="place/${z.id}"><div class="ic" style="background:${z.kind==='Old town'?'#b5485d':'#1f8a99'}">${poiIcon(z.kind)}</div><div style="flex:1"><h3>${esc(z.name)}</h3><div class="sub">${esc(z.kind)}${z.status?' · '+esc(z.status):''}</div></div></div>`).join('');}
 if(st.q){POIL.forEach(g=>{const it=g.items.filter(x=>match(x,['name','type']));if(it.length)h+=`<div class="section-label">${esc(g.name)}</div>`+it.slice(0,12).map(x=>`<div class="card" data-poi="${g.id}|${esc(x.name)}"><div class="ic" style="background:${g.color}">${g.icon}</div><div style="flex:1"><h3>${esc(x.name)}</h3><div class="sub">${esc(x.type||g.name)}</div></div></div>`).join('');});}
 $('#list').innerHTML=h;$('#count').textContent=`${vp.length} of ${D.properties.length} projects`;
 $$('#list .card[data-r]').forEach(c=>c.onclick=()=>{location.hash='#/'+c.dataset.r;});
 $$('#list .card[data-poi]').forEach(c=>c.onclick=()=>{const [gid,n]=c.dataset.poi.split('|');const g=POIL.find(x=>x.id===gid);const x=g.items.find(i=>i.name===n);if(!st.layers['poi_'+gid]){$(`#f-layers button[data-l="poi_${gid}"]`).click();}map.flyTo([x.lat,x.lng],15);L.popup(popOpts).setLatLng([x.lat,x.lng]).setContent(popPoi(x,g)).openOn(map);});
}

// ---------- detail
const fact=(k,v,full)=>`<div class="fact ${full?'full':''}"><div class="k">${k}</div><div class="v ${isNS(v)?'ns':''}">${esc(v||'Not stated')}</div></div>`;
const gmaps=(lat,lng)=>`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
const locSec=o=>`<div class="dsec"><h4>Location</h4><p class="note">${o.precise?'<span class="tag green">Exact / listing location</span>':'<span class="tag warn">◌ Approximate location</span>'} ${esc(o.geoNote)}<br>${o.lat.toFixed(5)}, ${o.lng.toFixed(5)}</p><div class="btns" style="margin-top:10px"><a class="btn" target="_blank" rel="noopener" href="${gmaps(o.lat,o.lng)}">Open in Google Maps ↗</a><a class="btn" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=${o.lat},${o.lng}">Directions ↗</a></div></div>`;
const shareSec=()=>`<div class="dsec"><div class="btns"><button class="btn" id="copy">🔗 Copy link to this page</button></div></div>`;
const webFoot=(u,label,kind,extra)=>u||extra?`<div class="dsec webfoot"><h4>Website &amp; sources</h4>${u?`<a class="btn web xl" href="${esc(u)}" target="_blank" rel="noopener">${/website/i.test(label)?'Visit '+esc(label.toLowerCase()):'Open '+esc(label.toLowerCase())} ↗</a><p class="wf">${kind?esc(kind)+' · ':''}<a href="${esc(u)}" target="_blank" rel="noopener">${esc(u.replace(/^https?:\/\/(www\.)?/,'').replace(/\/$/,''))}</a></p>`:''}${extra||''}</div>`:'';
const bigWeb=(u,label,kind)=>u?`<div class="webbar"><a class="btn web xl" href="${esc(u)}" target="_blank" rel="noopener">${label} ↗</a><div class="wurl">${kind?esc(kind)+' · ':''}<a href="${esc(u)}" target="_blank" rel="noopener">${esc(u)}</a></div></div>`:'';
function galHtml(photos,credit){const P=photos||[];if(!P.length)return '';const n=P.length;
 if(n===1)return `<div class="gal g1"><button class="gi lead" data-i="0" aria-label="Open photo"><img class="cs on" src="${P[0].src}" alt="Photo 1" decoding="async" onload="this.classList.add('ld')"><span class="gcount">⤢ View photo</span></button></div>`;
 const lead=`<div class="gi lead car" data-i="0" role="button" tabindex="0" aria-roledescription="carousel" aria-label="Photo 1 of ${n}, click to enlarge"><img class="cs on kb0" src="${P[0].src}" alt="Photo 1" decoding="async" onload="this.classList.add('ld')"><img class="cs" alt="" decoding="async" aria-hidden="true"><button class="cnav cprev" aria-label="Previous photo">‹</button><button class="cnav cnext" aria-label="Next photo">›</button><div class="cdots" role="tablist">${P.map((x,k)=>`<button class="cdot${k?'':' on'}" data-i="${k}" aria-label="Show photo ${k+1}"></button>`).join('')}</div><span class="gcount">▦ ${n} photos</span></div>`;
 const th=P.map((x,k)=>`<button class="gt${k?'':' on'}" data-i="${k}" aria-label="Show photo ${k+1} of ${n}"><img src="${x.thumb}" alt="Photo ${k+1}" loading="lazy" decoding="async" onload="this.classList.add('ld')"></button>`).join('');
 return `<div class="gal gc">${lead}<div class="gstrip" style="--gn:${Math.min(n,6)}">${th}</div></div>`;}
function heroHtml(cls,crumbs,title,loc,price,priceLbl,tags,photos,credit,icon){
 const ph=photos&&photos[0];
 return `<div class="dtop ${ph?'hasgal':''}"><button class="close" aria-label="Close" onclick="location.hash='#/'">✕</button>${galHtml(photos,credit)}<div class="dhero ${cls}">${!ph&&icon?`<div class="phbig">${icon}<span>No project photo published</span></div>`:''}<div class="crumbs">${crumbs}</div><h2>${esc(title)}</h2><div class="loc">${esc(loc)}</div>${price?`<div class="bigprice"><small>${priceLbl}</small>${esc(price)}</div>`:''}<div class="htags">${tags.filter(Boolean).map(t=>`<span>${esc(t)}</span>`).join('')}</div>${ph?`<div class="hcredit">Photos: ${esc(credit)}</div>`:''}</div></div>`;}
function avCta(p){const a=p.avail||{level:'unknown'};const u=`#/project/${p.id}/units`;
 if(a.level==='unknown')return `<div class="avcta"><a class="btn avbig muted" href="${u}"><span class="ai">▦</span><span><b>See availability</b><small>No live availability published yet</small></span><span class="ar">→</span></a></div>`;
 const so=a.soldOut||a.available===0;const cnt=so?'Sold out':a.available!=null?`${a.available} available${a.total?' / '+a.total+' total':''}`:'Listed for sale';
 return `<div class="avcta"><a class="btn avbig ${so?'sold':''}" href="${u}"><span class="ai">▦</span><span><b>See availability</b><small>${cnt}${a.ph?` · ★ ${a.ph} penthouse${a.ph>1?'s':''}`:''}</small></span><span class="ar">→</span></a></div>`;}
function scoreSec(p){return `<div class="dsec"><h4>Fit score <span class="fit ${fitCls(p.fit)} big">${p.fit} / 10</span></h4>${p.fitParts.map(c=>`<div class="sbar"><div class="sl"><span>${esc(c.k)}</span><b>${c.v} / ${c.max}</b></div><div class="track"><i style="width:${100*c.v/c.max}%"></i></div><div class="sw2">${esc(c.why)}</div></div>`).join('')}<p class="note" style="margin-top:8px">Computed by this map from your brief; not third-party data. <a href="#" onclick="document.getElementById('info').classList.add('open');return false">How it works</a></p></div>`;}
function viewProject(p){
 const cls=p.shortlist?'gold':p.ultra?'ultra':p.category==='Branded residences'?'plum':p.premium?'sea':'';
 let h=heroHtml(cls,tierLbl(p)+' · '+esc(p.category),p.name,p.area,p.priceText,p.shortlist||p.premium||p.ultra?'Price':'Entry price',['Fit '+p.fit+'/10','Delivery '+p.delivery,p.sea&&/^yes/i.test(p.sea)?'Sea view':'',p.gated&&!isNS(p.gated)?'Gated':'',p.penthouse?'Penthouses':'',p.precise?'':'Approx. location'],p.photos,p.photoCredit,catIcon(p));
 h+=avCta(p);
 if(typeof avSec==='function')h+=avSec(p);
 h+=`<div class="dsec"><h4>Key facts</h4><div class="facts">${fact('Developer',p.developer)}${fact('Type',p.kind)}${fact('Units',p.units)}${fact('Delivery',p.delivery)}`;
 if(p.premium||p.ultra){h+=fact('Price range',p.priceText)+fact('Size / plot / pool',p.size,1)+fact('Sea view',p.sea,1)+fact('Gated / security',p.gated)+fact('Area group',p.zone)+fact('Listing summary',p.note,1);}
 else if(p.shortlist){h+=fact('Size / plot / pool',p.size,1)+fact('Terrace',p.terrace)+fact('Sea view',p.sea)+fact('Gated / security',p.gated)+fact('Pipeline entry price',p.entryPrice)+fact('Nearest top school (Page)',p.school,1)+fact('Notes',p.note,1);}
 else h+=fact('Entry price',p.priceText)+fact('Area group',p.zone);
 h+=`</div>${p.extraLinks?`<div class="btns" style="margin-top:10px">${p.extraLinks.map(([t,u])=>`<a class="btn" target="_blank" rel="noopener" href="${esc(u)}">${esc(t)} ↗</a>`).join('')}</div>`:''}${p.shortlist?'':p.ultra&&p.id!=='ocho-de-oro-versace-home'?'<p class="note" style="margin-top:10px">Added in the ultra-prime €10M+ sweep (Nov 2026). Facts are taken from the linked listing and sources; fields not published are marked as such.</p>':p.premium?'<p class="note" style="margin-top:10px">Added in the €3–10M sea-view sweep (Nov 2026). Facts are taken from the linked listing; terrace sizes were not published, developer not named on the listing.</p>':'<p class="note" style="margin-top:10px">Pipeline project kept for the market picture; sea view, terrace and gating were not assessed on the Page.</p>'}</div>`;
 if(p.penthouse){const q=p.penthouse;h+=`<div class="dsec phsec"><h4><span class="tag ph">Penthouse</span> Penthouse units</h4><div class="facts">${fact('Penthouse price',q.priceText||(q.price?fmt(q.price):'Not published'),1)}${q.size?fact('Penthouse size',q.size):''}${q.terrace?fact('Penthouse terrace',q.terrace):''}${q.note?fact('Unit mix',q.note,1):''}</div><p class="note" style="margin-top:8px">Source: ${q.sourceUrl?`<a href="${esc(q.sourceUrl)}" target="_blank" rel="noopener">${esc(q.source)} ↗</a>`:esc(q.source)}${q.quote?` · “${esc(q.quote)}”`:''}</p></div>`;}
 h+=scoreSec(p);
 if(p.zoneObj)h+=`<div class="dsec"><h4>Hotspot</h4><div class="near"><a href="#/zone/${p.zoneObj.id}">${p.zoneObj.rank?'#'+p.zoneObj.rank+' ':''}${esc(p.zoneObj.name)}<span>${esc(p.zoneObj.label)} →</span></a></div></div>`;
 h+=`<div class="dsec near"><h4>Closest international schools (straight line)</h4>${p.nearSchools.map(s=>{const so=D.schools.find(x=>x.id===s.id);return `<a href="#/school/${s.id}">${esc(s.name)} <em>${esc(so.badge)}</em><span>${s.km} km →</span></a>`;}).join('')}</div>`;
 const amen=[];POIL.forEach(g=>{if(!g.near)return;let best=null;g.items.forEach(x=>{const d=hav(p.lat,p.lng,x.lat,x.lng);if(!best||d<best[0])best=[d,x];});if(best)amen.push([g,best]);});
 if(amen.length)h+=`<div class="dsec near"><h4>Nearest amenities (straight line)</h4>${amen.map(([g,[d,x]])=>`<a href="#" data-ll="${x.lat},${x.lng}">${g.icon} ${esc(x.name)} <em>${esc(g.short||g.name)}</em><span>${d.toFixed(1)} km</span></a>`).join('')}</div>`;
 h+=locSec(p)+shareSec()+webFoot(p.url,'Project website',p.urlKind+' on '+p.urlHost)+`<div class="dsec note">Prices exclude 10% VAT and 1.2% stamp duty unless stated. Sea views and terrace sizes as claimed by developers/agents; confirm per unit. Photos © their publishers (${phSrc(p)}), shown for reference. Research as of ${esc(D.updated)}.</div>`;
 return h;}
function viewSchool(s){
 let h=heroHtml('green','International school · ranked #'+s.rank,s.name,s.area,s.badge,'Key result',['Ages '+s.ages,s.precise?'':'Approx. location'],s.photos,s.photoCredit,'🎓');
 h+=`<div class="dsec"><h4>Profile</h4><div class="facts">${fact('Curriculum',s.curriculum,1)}${fact('Ages',s.ages)}${fact('Annual fees',s.fees)}${fact('Inspection / accreditation',s.accred,1)}${fact('Results',s.results,1)}${fact('Best-placed areas',s.near,1)}</div><p class="note" style="margin-top:8px">Results source: <a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.url)}</a></p></div>`;
 const np=D.properties.map(p=>[hav(s.lat,s.lng,p.lat,p.lng),p]).sort((a,b)=>a[0]-b[0]).slice(0,6);
 h+=`<div class="dsec near"><h4>Nearest projects (straight line)</h4>${np.map(([d,p])=>`<a href="#/project/${p.id}">${esc(p.name)}${p.shortlist?' ★':''} <em>fit ${p.fit}</em><span>${d.toFixed(1)} km →</span></a>`).join('')}</div>`;
 return h+locSec(s)+shareSec()+webFoot(s.site||s.url,s.site?'School website':'Source',s.site?'':'');}
function viewZone(z){
 let h=heroHtml('zone '+(z.tone==='heritage'?'heritage':''),z.rank?'Hotspot #'+z.rank+' · '+esc(z.label):esc(z.label),z.name,z.metric,z.avgFit!=null?'Avg fit '+z.avgFit+' / 10':'','Projects in this area',[z.growth?z.growth+' y/y asking prices':''],z.photos,z.photoCredit);
 h+=`<div class="dsec"><h4>${z.tone==='heritage'?'About':'Why it matters'}</h4><p class="p">${esc(z.detail)}</p></div>`;
 const ps=D.properties.filter(p=>p.zoneObj===z);
 if(z.tone!=='heritage')h+=`<div class="dsec near"><h4>Projects in this area (${ps.length})</h4>${ps.map(p=>`<a href="#/project/${p.id}">${esc(p.name)}${p.shortlist?' ★':''} <em>fit ${p.fit}</em><span>${p.price?fmt(p.price):'TBA'} →</span></a>`).join('')||'<p class="note">None mapped inside this outline.</p>'}</div>`;
 return h+`<div class="dsec note">Outline is hand-drawn for orientation only, not an official boundary.${z.rank?' Price data: Idealista asking prices, Sept 2026 (published Oct 2026). Avg fit = mean of the computed fit scores of projects in this area.':''}</div>`+shareSec()+(z.url?webFoot(z.url,z.urlLabel||'Website',z.urlKind):'');}
function phSrc(p){const pg=[...new Set((p.photos||[]).map(x=>x.page).filter(Boolean))];return pg.length?pg.map(u=>`<a href="${esc(u)}" target="_blank" rel="noopener">${esc(u.replace(/^https?:\/\/(www\.)?/,'').split('/')[0])}</a>`).join(', '):esc(p.photoCredit);}
function viewPlace(s){let h=heroHtml(s.kind==='Old town'?'zone heritage':'teal',esc(s.kind),s.name,s.status,'','',[],s.photos,s.photoCredit);h+=`<div class="dsec"><p class="p">${esc(s.detail)}</p></div>`;return h+locSec(Object.assign({precise:true,geoNote:'Location from OpenStreetMap.'},s))+shareSec()+webFoot(s.url,s.urlLabel||'Website',s.urlKind);}
function viewTrain(){const t=D.train;return heroHtml('plum','Catalyst · '+esc(t.status),t.name,'Fuengirola – Marbella – Estepona','','',[])+`<div class="dsec"><p class="p">${esc(t.detail)}</p></div>`+shareSec()+webFoot(t.url,'Source','News');}
function route(){
 if(/^#\/swipe/.test(location.hash)){$('#detail').classList.remove('open');openSwipe();return;} else closeSwipe(true);
 const m=location.hash.match(/^#\/(project|school|zone|place|train)\/?([\w-]*)/);const det=$('#detail');
 if(!m){setTimeout(carStop,0);det.classList.remove('open');det.setAttribute('aria-hidden','true');document.title='Marbella New-Build Atlas · Costa del Sol 2028–2030';return;}
 map.closePopup();
 const [,k,id]=m;let h='',ll=null,title='';
 if(k==='project'){const p=D.properties.find(x=>x.id===id);if(p){h=viewProject(p);ll=[p.lat,p.lng];title=p.name;}}
 if(k==='school'){const s=D.schools.find(x=>x.id===id);if(s){h=viewSchool(s);ll=[s.lat,s.lng];title=s.name;}}
 if(k==='place'){const s=D.pois.find(x=>x.id===id);if(s){h=viewPlace(s);ll=[s.lat,s.lng];title=s.name;}}
 const dw=innerWidth>860?(det.offsetWidth||720):0;const pad={paddingTopLeft:[innerWidth>860?dw+20:20,40],paddingBottomRight:[40,40],duration:.8};
 if(k==='zone'){const z=D.zones.find(x=>x.id===id);if(z){h=viewZone(z);title=z.name;map.flyToBounds(zoneLayers[id].getBounds(),Object.assign({maxZoom:16},pad));}}
 if(k==='train'){h=viewTrain();title='Coastal train study';map.flyToBounds(tr.getBounds(),pad);}
 if(!h){location.hash='#/';return;}
 $('#dbody').innerHTML=h;$('#dbody').scrollTop=0;det.classList.add('open');det.setAttribute('aria-hidden','false');document.title=title+' · Marbella New-Build Atlas';
 const cp=$('#copy');if(cp)cp.onclick=()=>{navigator.clipboard&&navigator.clipboard.writeText(location.href);cp.textContent='✓ Link copied';};
 const galP=k==='project'?(D.properties.find(x=>x.id===id)||{}):k==='school'?(D.schools.find(x=>x.id===id)||{}):k==='place'?(D.pois.find(x=>x.id===id)||{}):k==='zone'?(D.zones.find(x=>x.id===id)||{}):{};
 setTimeout(()=>carInit(galP.photos||[],title,galP.photoCredit),0);
 $$('#dbody a[data-ll]').forEach(a=>a.onclick=e=>{e.preventDefault();const [la,ln]=a.dataset.ll.split(',').map(Number);map.flyTo([la,ln],15);});
 if(ll){const z=Math.max(map.getZoom(),14);const off=innerWidth>860?Math.round(dw/2):0;const pt=map.project(ll,z).subtract([off,0]);map.flyTo(map.unproject(pt,z),z,{duration:.8});
  const mk=markers[k+'/'+id];if(mk&&k==='project'&&!layers.props.hasLayer(mk))mk.addTo(layers.props);}
}

// ---------- Swipe carousel (#/swipe) — reads the same D.properties + active filters
const SW={i:0,n:3,list:[],sort:'fit',open:false};window.SW=SW;
const swN=()=>{const w=innerWidth;return w<640?1:w<1024?2:w<1440?3:w<1900?4:5;};
function swList(){const a=visibleProps().slice();return SW.sort==='price'?a.sort((x,y)=>(x.price||9e12)-(y.price||9e12)):SW.sort==='price-desc'?a.sort((x,y)=>(y.priceHi||y.price||0)-(x.priceHi||x.price||0)):a.sort((x,y)=>y.fit-x.fit||(x.price||9e12)-(y.price||9e12));}
const clip=(s,n)=>{s=String(s||'');return s.length>n?s.slice(0,n-1).replace(/\s+\S*$/,'')+'…':s;};
function swCard(p,k){const ph=p.photos&&p.photos[0];const sea=p.sea&&/^yes/i.test(p.sea)?clip(p.sea.replace(/^yes[,:]?\s*(per [^:]+:\s*)?/i,''),120):(p.sea||'Not assessed');
 const ter=!isNS(p.terrace)&&p.terrace?p.terrace:'';
 return `<article class="swc ${propClass(p)}" data-k="${k}"><div class="swimg" ${ph?`data-src="${esc(ph.src)}"`:''} style="${ph?'':'background:'+catBg(p)}">${ph?'':`<span class="swph">${catIcon(p)}<small>No project photo published</small></span>`}<span class="fit ${fitCls(p.fit)} big">Fit ${p.fit}</span><span class="swtier">${esc(tierLbl(p))}</span>${p.penthouse?'<span class="swph2">★ Penthouse</span>':''}${p.precise?'':'<span class="swapprox">◌ approx. pin</span>'}</div>
 <div class="swb"><h3>${esc(p.name)}</h3><div class="swa">${esc(p.area)}</div><div class="swp">${esc(p.priceText||'Price not published')}</div>${typeof avBadge==='function'?avBadge(p,'sw'):''}
 <dl><div><dt>Type</dt><dd>${esc(p.category==='Branded residences'?['Branded',...utOf(p).filter(t=>t!=='Branded residences')].join(' · '):utOf(p).join(' · '))}</dd></div><div><dt>Delivery</dt><dd>${esc(clip(p.delivery,60))}</dd></div><div class="full"><dt>Sea view</dt><dd class="${/^yes/i.test(p.sea||'')?'yes':'ns'}">${esc(sea)}</dd></div>${p.penthouse?`<div class="full ph"><dt>Penthouse</dt><dd>${esc(clip([p.penthouse.priceText,p.penthouse.size,p.penthouse.terrace].filter(Boolean).join(' · '),130))}</dd></div>`:''}<div class="full"><dt>Size</dt><dd>${esc(clip(p.size||'Not stated',110))}${ter?' · Terrace '+esc(clip(ter,50)):''}</dd></div></dl>
 <div class="swbtn"><a class="btn primary vd" href="#/project/${p.id}">View details →</a></div></div></article>`;}
function swBuild(){SW.list=swList();$('#swtrack').innerHTML=SW.list.map(swCard).join('')||'<div class="swempty">No projects match the current filters.</div>';
 $$('#swtrack .swc').forEach(c=>c.onclick=e=>{if(e.target.closest('a')||Date.now()-(SW.drag||0)<400)return;const p=SW.list[+c.dataset.k];if(p)location.hash='#/project/'+p.id;});swLayout(false);}
function swLayout(anim){SW.n=swN();const t=$('#swtrack');t.style.setProperty('--n',SW.n);const tot=SW.list.length;
 SW.i=Math.max(0,Math.min(SW.i-SW.i%SW.n,Math.max(0,tot-1)-((Math.max(0,tot-1))%SW.n)));
 t.classList.toggle('anim',anim!==false);t.style.transform=`translate3d(${-SW.i*100/SW.n}%,0,0)`;
 const e2=Math.min(SW.i+SW.n,tot);$('#swpos').textContent=tot?(e2>SW.i+1?`${SW.i+1}–${e2} of ${tot}`:`${SW.i+1} of ${tot}`):'0 of 0';
 $('#swprev').disabled=SW.i<=0;$('#swnext').disabled=SW.i+SW.n>=tot;
 // load current page, preload previous and next page
 $$('#swtrack .swimg[data-src]').forEach(el=>{const k=+el.parentNode.dataset.k;if(k>=SW.i-SW.n&&k<SW.i+2*SW.n&&!el.dataset.ok){el.dataset.ok=1;el.style.backgroundImage=`url('${el.dataset.src}')`;}});
 for(let k=SW.i+SW.n;k<SW.i+3*SW.n&&k<tot;k++){const p=SW.list[k],ph=p.photos&&p.photos[0];if(ph){const im=new Image();im.src=ph.src;}}}
function swStep(d){const tot=SW.list.length;const ni=SW.i+d*SW.n;if(ni<0||ni>=tot)return swLayout(true);SW.i=ni;swLayout(true);}
function openSwipe(){const o=$('#swipe');if(!SW.open){SW.open=true;SW.i=0;o.classList.add('open');o.setAttribute('aria-hidden','false');document.body.classList.add('swiping');swBuild();setTimeout(()=>$('#swnext').focus(),50);}document.title='Swipe projects · Marbella New-Build Atlas';}
function closeSwipe(fromRoute){if(!SW.open)return;SW.open=false;const o=$('#swipe');o.classList.remove('open');o.setAttribute('aria-hidden','true');document.body.classList.remove('swiping');if(!fromRoute&&/^#\/swipe/.test(location.hash))location.hash='#/';}
$('#swbtn').onclick=()=>{location.hash='#/swipe';};
$('#swclose').onclick=()=>closeSwipe();
$('#swprev').onclick=()=>swStep(-1);$('#swnext').onclick=()=>swStep(1);
$$('#swsort button').forEach(b=>b.onclick=()=>{SW.sort=b.dataset.s;$$('#swsort button').forEach(x=>x.classList.toggle('on',x===b));SW.i=0;swBuild();});
document.addEventListener('keydown',e=>{if(!SW.open)return;if(e.key==='ArrowRight'){e.preventDefault();swStep(1);}else if(e.key==='ArrowLeft'){e.preventDefault();swStep(-1);}else if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();closeSwipe();}},true);
window.addEventListener('resize',()=>{if(SW.open)swLayout(false);});
(()=>{const vp=$('#swview');let x0=null,y0=0,dx=0,lock=null,w=1;
 vp.addEventListener('touchstart',e=>{const t=e.touches[0];x0=t.clientX;y0=t.clientY;dx=0;lock=null;w=vp.clientWidth;$('#swtrack').classList.remove('anim');},{passive:true});
 vp.addEventListener('touchmove',e=>{if(x0==null)return;const t=e.touches[0];const ddx=t.clientX-x0,ddy=t.clientY-y0;if(lock==null&&(Math.abs(ddx)>8||Math.abs(ddy)>8))lock=Math.abs(ddx)>Math.abs(ddy)?'x':'y';if(lock!=='x')return;dx=ddx;$('#swtrack').style.transform=`translate3d(calc(${-SW.i*100/SW.n}% + ${dx}px),0,0)`;},{passive:true});
 vp.addEventListener('touchend',()=>{if(x0==null)return;x0=null;if(lock==='x')SW.drag=Date.now();if(lock==='x'&&Math.abs(dx)>Math.min(60,w*.15))swStep(dx<0?1:-1);else swLayout(true);});
})();
function go(k,id){location.hash='#/'+k+'/'+id;}
window.addEventListener('hashchange',route);
document.addEventListener('keydown',e=>{if(e.key==='Escape'){$('#info').classList.remove('open');if(location.hash.length>2)location.hash='#/';}});
$('#mobtoggle').onclick=()=>$('#sidebar').classList.toggle('collapsed');
const zc=()=>{$('#map').classList.toggle('far',map.getZoom()<12);$('#map').classList.toggle('vfar',map.getZoom()<11);};map.on('zoomend',zc);zc();
render();route();
if(!location.hash||location.hash==='#/'){map.fitBounds(L.featureGroup(D.properties.map(p=>markers['project/'+p.id])).getBounds(),{paddingTopLeft:[innerWidth>860?40:20,40],paddingBottomRight:[40,40]});}
if(innerWidth<=860)$('#sidebar').classList.add('collapsed');
window.__atlasReady=true;
})();

// ---------- Lightbox (detail gallery): arrows, keys, swipe, counter, credit, lazy neighbours
const lbQ=s=>document.querySelector(s),lbAll=s=>[...document.querySelectorAll(s)],lbEsc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const LB={list:[],i:0,open:false,title:''};
(function(){const d=document.createElement('div');d.id='lb';d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');d.setAttribute('aria-hidden','true');
 d.innerHTML='<div class="lbstage"><img id="lbimg" alt=""></div><button class="lbx" aria-label="Close">✕</button><button class="lbnav lbp" aria-label="Previous photo">‹</button><button class="lbnav lbn" aria-label="Next photo">›</button><div class="lbbar"><span id="lbcount"></span><span id="lbtitle"></span><span id="lbcred"></span></div>';
 document.body.appendChild(d);
 d.querySelector('.lbx').onclick=lbClose;d.querySelector('.lbp').onclick=e=>{e.stopPropagation();lbGo(-1);};d.querySelector('.lbn').onclick=e=>{e.stopPropagation();lbGo(1);};
 d.addEventListener('click',e=>{if(e.target===d||e.target.classList.contains('lbstage'))lbClose();});
 const im=d.querySelector('#lbimg');im.onload=()=>im.classList.add('ld');
 let x0=null,y0=0;d.addEventListener('touchstart',e=>{const t=e.touches[0];x0=t.clientX;y0=t.clientY;},{passive:true});
 d.addEventListener('touchend',e=>{if(x0==null)return;const t=e.changedTouches[0],dx=t.clientX-x0,dy=t.clientY-y0;x0=null;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy))lbGo(dx<0?1:-1);else if(dy>90&&Math.abs(dy)>Math.abs(dx))lbClose();},{passive:true});
 window.addEventListener('keydown',e=>{if(!LB.open)return;if(e.key==='ArrowRight'){lbGo(1);}else if(e.key==='ArrowLeft'){lbGo(-1);}else if(e.key==='Escape'){lbClose();}else return;e.preventDefault();e.stopImmediatePropagation();},true);
})();
function lbShow(){const x=LB.list[LB.i];if(!x)return;const im=lbQ('#lbimg');im.classList.remove('ld');im.alt=`${LB.title} · photo ${LB.i+1}`;
 requestAnimationFrame(()=>{im.src=x.src;if(im.complete&&im.naturalWidth)im.classList.add('ld');});
 const n=LB.list.length;lbQ('#lbcount').textContent=`${LB.i+1} / ${n}`;lbQ('#lbtitle').textContent=LB.title||'';
 const pg=x.page||x.orig;const host=pg?pg.replace(/^https?:\/\/(www\.)?/,'').split('/')[0]:'';
 lbQ('#lbcred').innerHTML=pg?`Photo: <a href="${lbEsc(pg)}" target="_blank" rel="noopener">${lbEsc(host)} ↗</a>`:(LB.credit?'Photo: '+lbEsc(LB.credit):'');
 lbAll('#lb .lbnav').forEach(b=>b.style.display=n>1?'':'none');
 [1,-1].forEach(d=>{const y=LB.list[(LB.i+d+n)%n];if(y){const p=new Image();p.src=y.src;}});}
function lbOpen(list,i,title,credit){if(!list.length)return;Object.assign(LB,{list,i:i||0,title:title||'',credit:credit||'',open:true});const d=lbQ('#lb');d.classList.add('open');d.setAttribute('aria-hidden','false');document.body.classList.add('lbopen');lbShow();setTimeout(()=>d.querySelector('.lbn').focus({preventScroll:true}),30);}
function lbClose(){if(!LB.open)return;LB.open=false;const d=lbQ('#lb');d.classList.remove('open');d.setAttribute('aria-hidden','true');document.body.classList.remove('lbopen');}
function lbGo(d){const n=LB.list.length;if(n<2)return;LB.i=(LB.i+d+n)%n;lbShow();}
addEventListener('hashchange',lbClose);

// ---------- Detail lead-photo carousel: crossfade + Ken Burns, dots/arrows/swipe, pauses (hover, lightbox, hidden tab, closed panel)
const RM=matchMedia('(prefers-reduced-motion: reduce)');
const CAR={list:[],i:0,t:null,el:null,acc:0,hover:false,busy:false,kb:0,title:'',credit:''};
const CAR_MS=3500,CAR_TICK=100;
function carStop(){if(CAR.t){clearInterval(CAR.t);CAR.t=null;}CAR.el=null;CAR.list=[];CAR.busy=false;}
function carPaused(){const det=document.getElementById('detail');return RM.matches||CAR.hover||LB.open||document.hidden||!det||!det.classList.contains('open')||!CAR.el||!document.body.contains(CAR.el);}
function carInit(list,title,credit){carStop();const gal=lbQ('#dbody .gal');if(!gal)return;
 const lead=gal.querySelector('.gi.lead');CAR.title=title;CAR.credit=credit;
 if(!lead)return;
 if(list.length<2){lead.onclick=()=>lbOpen(list,0,title,credit);return;}
 Object.assign(CAR,{list,i:0,el:lead,acc:0,hover:false,busy:false,kb:0});
 lead.onclick=e=>{if(e.target.closest('.cnav,.cdot'))return;if(Date.now()-(CAR.swiped||0)<450)return;lbOpen(CAR.list,CAR.i,CAR.title,CAR.credit);};
 lead.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();lbOpen(CAR.list,CAR.i,CAR.title,CAR.credit);}};
 lead.querySelector('.cprev').onclick=e=>{e.stopPropagation();carGo(CAR.i-1);};
 lead.querySelector('.cnext').onclick=e=>{e.stopPropagation();carGo(CAR.i+1);};
 lbAll('#dbody .gal .cdot').forEach(d=>d.onclick=e=>{e.stopPropagation();carGo(+d.dataset.i);});
 lbAll('#dbody .gal .gt').forEach(t=>t.onclick=()=>carGo(+t.dataset.i));
 lead.addEventListener('mouseenter',()=>{CAR.hover=true;});lead.addEventListener('mouseleave',()=>{CAR.hover=false;});
 let x0=null,y0=0;lead.addEventListener('touchstart',e=>{const t=e.touches[0];x0=t.clientX;y0=t.clientY;},{passive:true});
 lead.addEventListener('touchend',e=>{if(x0==null)return;const t=e.changedTouches[0],dx=t.clientX-x0,dy=t.clientY-y0;x0=null;if(Math.abs(dx)>40&&Math.abs(dx)>Math.abs(dy)*1.2){CAR.swiped=Date.now();carGo(CAR.i+(dx<0?1:-1));}},{passive:true});
 carPreload(1);
 CAR.t=setInterval(()=>{if(carPaused())return;CAR.acc+=CAR_TICK;if(CAR.acc>=CAR_MS)carGo(CAR.i+1,true);},CAR_TICK);}
function carPreload(k){const n=CAR.list.length;const x=CAR.list[(k%n+n)%n];if(x){const im=new Image();im.decoding='async';im.src=x.src;}}
function carGo(k,auto){const n=CAR.list.length;if(n<2||!CAR.el)return;k=(k%n+n)%n;CAR.acc=0;if(k===CAR.i||CAR.busy)return;
 const el=CAR.el,cur=el.querySelector('.cs.on'),nxt=[...el.querySelectorAll('.cs')].find(x=>x!==cur);const x=CAR.list[k];CAR.busy=true;
 const swap=()=>{if(CAR.el!==el){CAR.busy=false;return;}
  CAR.kb=(CAR.kb+1)%4;nxt.className='cs ld'+(RM.matches?'':' kb'+CAR.kb);void nxt.offsetWidth;nxt.classList.add('on');nxt.alt='Photo '+(k+1);nxt.removeAttribute('aria-hidden');
  cur.classList.remove('on');cur.setAttribute('aria-hidden','true');cur.alt='';
  CAR.i=k;el.dataset.i=k;el.setAttribute('aria-label',`Photo ${k+1} of ${n}, click to enlarge`);
  lbAll('#dbody .gal .cdot').forEach(d=>d.classList.toggle('on',+d.dataset.i===k));
  lbAll('#dbody .gal .gt').forEach(t=>{const on=+t.dataset.i===k;t.classList.toggle('on',on);if(on&&!auto){}});
  const at=lbQ('#dbody .gal .gt.on'),st=lbQ('#dbody .gal .gstrip');if(at&&st&&st.scrollWidth>st.clientWidth){st.scrollTo({left:at.offsetLeft-st.clientWidth/2+at.offsetWidth/2,behavior:RM.matches?'auto':'smooth'});}
  setTimeout(()=>{CAR.busy=false;},RM.matches?60:700);carPreload(k+1);};
 nxt.onload=null;
 if(nxt.getAttribute('src')===x.src&&nxt.complete&&nxt.naturalWidth){swap();return;}
 nxt.src=x.src;(nxt.decode?nxt.decode():Promise.resolve()).then(swap,swap);}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)CAR.acc=0;});
// ---------- Swipe cards: gentle photo rotation on hover (desktop pointers only)
(function(){let cur=null,timer=null;
 function stop(){if(timer){clearInterval(timer);timer=null;}if(cur){const c=cur;cur=null;const im=c.querySelector('.swimg');const p=SW.list[+c.dataset.k];if(im&&p&&p.photos&&p.photos[0]&&im.dataset.ok)fade(im,p.photos[0].src);}}
 function fade(im,src){let l=im.querySelector('.swl');if(!l){l=document.createElement('div');l.className='swl';im.prepend(l);}
  const pre=new Image();pre.onload=()=>{l.style.backgroundImage=`url('${src}')`;l.classList.remove('snap');void l.offsetWidth;l.classList.add('on');
   setTimeout(()=>{im.style.backgroundImage=`url('${src}')`;l.classList.add('snap');l.classList.remove('on');},750);};pre.src=src;}
 document.addEventListener('pointerover',e=>{if(e.pointerType!=='mouse'||RM.matches||!SW.open)return;const c=e.target.closest&&e.target.closest('#swtrack .swc');if(c===cur)return;stop();if(!c)return;
  const p=SW.list[+c.dataset.k];if(!p||!p.photos||p.photos.length<2)return;cur=c;let i=0;const im=c.querySelector('.swimg');
  const pre=new Image();pre.src=p.photos[1].src;
  timer=setInterval(()=>{if(cur!==c||!SW.open){stop();return;}i=(i+1)%p.photos.length;fade(im,p.photos[i].src);const nx=new Image();nx.src=p.photos[(i+1)%p.photos.length].src;},2200);});
 document.addEventListener('mouseleave',stop);addEventListener('hashchange',stop);})();
