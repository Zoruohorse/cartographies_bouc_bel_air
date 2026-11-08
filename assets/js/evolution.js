 // Onglet « Évolution des acteurs » — graphique chronologique basé sur data/timeline.json.
 // Aucun acteur, mois ou total n'est codé en dur.
 const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const isoMonth = date => typeof date === 'string' && /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(date) && !Number.isNaN(Date.parse(date)) && new Date(date + 'T00:00:00Z').toISOString().slice(0, 10) === date ? date.slice(0, 7) : null;
 const monthLabel = key => new Intl.DateTimeFormat('fr-FR', {month:'short', year:'numeric', timeZone:'UTC'}).format(new Date(key + '-01T12:00:00Z'));
 const sourceLinks = (ids = []) => {
  const result = [];
  for (const id of ids) {
    const source = repositorySafeSource(id);
    if (!source || !/^https:\/\//i.test(source.url || '')) continue;
    result.push('<a href="' + escapeHtml(source.url) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(source.publisher || source.title || 'Source') + '</a>');
  }
  return [...new Set(result)].join(' · ') || 'Source à qualifier';
};
let repositorySafeSource = () => null;
const allMonths = (start, end) => {const result=[];let [y,m]=start.split('-').map(Number);const [ey,em]=end.split('-').map(Number);while(y<ey || y===ey && m<=em){result.push(`${y}-${String(m).padStart(2,'0')}`);m++;if(m>12){m=1;y++;}if(result.length>360)break;}return result;};
 const matchingCategory = (actor, config, event) => {
 const allowed = new Set(config.categories.map(x => x.id));
 return allowed.has(event.category) ? event.category : (config.fallback_category || 'other');
};

 export function initEvolution({repository, root}) {
   if (!root) return;
   repositorySafeSource = id => repository.sourceById.get(id);
   const config = repository.taxonomy?.timeline;
   if (!config || !Array.isArray(config.categories)) {
     root.innerHTML = '<article class="list-card">Configuration de l’évolution manquante dans <code>config/taxonomy.json</code>.</article>';
     return;
   }
   const colors = new Map(config.categories.map(c=>[c.id,c.color]));
   const categoryNames = new Map(config.categories.map(c=>[c.id,c.label]));
   const allowed = new Set(config.categories.map(c=>c.id));
   const excluded = new Set(config.excluded_actor_categories || []);
   const byActor = new Map();
   let incomplete = 0;
   for (const event of repository.timeline || []) {
     if (event.event_type !== config.event_type || event.status !== 'confirmed') continue;
     const actor = repository.actorById.get(event.actor_id);
     if (!actor || actor.id === repository.meta.id || (actor.categories || []).some(cat=>excluded.has(cat))) continue;
     const month = isoMonth(event.date);
     if (!month || ['year','unknown'].includes(event.date_precision)) {incomplete++;continue;}
     const existing = byActor.get(actor.id);
     if (!existing || event.date < existing.event.date) byActor.set(actor.id, {actor,event,month,category:matchingCategory(actor,config,event)});
   }
   const undated = (repository.timeline || []).filter(x => x.event_type === config.event_type && x.status === 'undated' && repository.actorById.has(x.actor_id));
   const entries = [...byActor.values()].sort((a,b)=>a.event.date.localeCompare(b.event.date) || a.actor.name.localeCompare(b.actor.name,'fr'));
   if (!entries.length) {
     root.innerHTML = `<article class="list-card evolution-empty"><h2>Évolution des acteurs</h2><p>Aucune première apparition documentaire datée exploitable n’est encore disponible.</p><p class="muted">Le graphique sera alimenté par <code>data/timeline.json</code>, sans modifier les fiches acteurs.</p>${incomplete?`<p>${incomplete} événement(s) avec date insuffisamment précise.</p>`:''}</article>`;
     return;
   }
   const months = allMonths(entries[0].month, entries[entries.length - 1].month);
   const categories = config.categories.filter(c=>allowed.has(c.id));
   const state = {mode:config.default_mode==='cumulative'?'cumulative':'new', month:months[months.length-1], visible:new Set(categories.map(c=>c.id)), search:''};
   root.innerHTML = `<div class="evolution-app">
     <div class="evolution-top"><div><h2>Évolution des acteurs</h2><p>Premières apparitions documentaires identifiées dans la base, par mois et typologie.</p><p class="evolution-method">Un acteur = une apparition à la date de sa première source datée disponible. Ce n’est pas sa première prise de position historique. Les chiffres sont cumulés par mois et ne reflètent pas nécessairement un soutien ou une opposition.</p></div><div class="evolution-modes" role="group" aria-label="Mode de comptage"><button type="button" data-mode="new">Nouveaux</button><button type="button" data-mode="cumulative">Cumulés</button></div></div>
     <div class="evolution-metrics" aria-live="polite"><div class="evolution-metric"><span>Acteurs datés dans le corpus</span><strong data-metric="total"></strong></div><div class="evolution-metric"><span>Acteurs dans la période</span><strong data-metric="period"></strong></div><div class="evolution-metric"><span>Typologies représentées</span><strong data-metric="categories"></strong></div></div>
     <section class="evolution-panel"><div class="evolution-section-title"><h3>Répartition chronologique</h3><label>Période sélectionnée <select data-month aria-label="Période sélectionnée"></select></label></div><div class="evolution-chart" data-chart role="group" aria-label="Histogramme empilé des acteurs par période"></div><div class="evolution-legend" data-legend aria-label="Filtrer les typologies"></div></section>
     <section class="evolution-panel"><div class="evolution-section-title"><h3>Acteurs concernés <span data-roster-count></span></h3><input type="search" data-search placeholder="Rechercher un acteur…" aria-label="Rechercher dans les acteurs de la période"></div><p class="evolution-hint" data-description></p><div class="evolution-roster" data-roster></div></section>
     <section class="evolution-panel evolution-unplaced"><h3>Acteurs en attente de datation (${undated.length})</h3><p class="evolution-hint">Ces acteurs figurent dans la base, mais ne sont pas intégrés aux histogrammes faute de date individualisée exploitable ou d'identité stable.</p><div class="evolution-roster">${undated.map(x=>{const a=repository.actorById.get(x.actor_id);return '<article class="evolution-person"><div><strong>'+escapeHtml(a?.name||'Acteur inconnu')+'</strong><small>'+escapeHtml(x.date_basis||'Date non établie')+'</small><small class="evolution-sources">'+sourceLinks(x.source_ids)+'</small></div></article>'}).join('')}</div></section>
     ${incomplete?`<p class="evolution-warning">${incomplete} autre(s) événement(s) invalides ignorés.</p>`:''}
   </div>`;
   const $ = selector => root.querySelector(selector);
   const selectedEntries = month => entries.filter(e=>state.visible.has(e.category) && (state.mode==='new'?e.month===month:e.month<=month));
   $('[data-month]').innerHTML = months.map(m=>`<option value="${m}">${escapeHtml(monthLabel(m))}</option>`).join('');
   const renderLegend = () => { $('[data-legend]').innerHTML = categories.map(c=>`<button type="button" class="evolution-legend-button ${state.visible.has(c.id)?'is-on':''}" data-category="${escapeHtml(c.id)}" aria-pressed="${state.visible.has(c.id)}"><span class="evolution-swatch" style="background:${escapeHtml(c.color)}"></span>${escapeHtml(c.label)}</button>`).join(''); };
   function renderChart() {
     const width=Math.max(560,months.length*75), height=270, left=42, right=15, top=20, bottom=54, plotWidth=width-left-right, plotHeight=height-top-bottom;
     const series=months.map(month=>({month,values:categories.map(cat=>entries.filter(e=>e.category===cat.id && state.visible.has(cat.id) && (state.mode==='new'?e.month===month:e.month<=month)).length)}));
     const max=Math.max(1,...series.map(s=>s.values.reduce((a,b)=>a+b,0)));
     const step=plotWidth/months.length,barWidth=Math.min(48,step*.7);
     let shapes='';
     for(let tick=0;tick<=4;tick++){const v=max*tick/4,y=top+plotHeight-v/max*plotHeight;shapes+=`<line x1="${left}" x2="${width-right}" y1="${y}" y2="${y}" stroke="#e2e8f0"/><text x="${left-8}" y="${y+4}" text-anchor="end" fill="#64748b" font-size="11">${Number.isInteger(v)?v:v.toFixed(1)}</text>`;}
     series.forEach((s,i)=>{const x=left+i*step+(step-barWidth)/2;let y=top+plotHeight;s.values.forEach((value,j)=>{if(!value)return;const h=value/max*plotHeight;y-=h;const cat=categories[j];shapes+=`<rect x="${x}" y="${y}" width="${barWidth}" height="${h}" fill="${escapeHtml(colors.get(cat.id)||'#64748b')}" rx="2"><title>${escapeHtml(monthLabel(s.month))} — ${escapeHtml(cat.label)} : ${value}</title></rect>`;});shapes+=`<rect data-chart-month="${s.month}" x="${left+i*step}" y="${top}" width="${step}" height="${plotHeight}" fill="transparent" role="button" tabindex="0" aria-label="Sélectionner ${escapeHtml(monthLabel(s.month))}" style="cursor:pointer"/>`;shapes+=`<text x="${left+i*step+step/2}" y="${height-23}" text-anchor="middle" font-size="11" fill="${s.month===state.month?'#1d4ed8':'#475569'}" font-weight="${s.month===state.month?'700':'400'}">${escapeHtml(monthLabel(s.month))}</text>`;if(s.month===state.month)shapes+=`<line x1="${left+i*step+4}" x2="${left+(i+1)*step-4}" y1="${height-12}" y2="${height-12}" stroke="#2563eb" stroke-width="3"/>`;});
     $('[data-chart]').innerHTML=`<svg viewBox="0 0 ${width} ${height}" width="100%" style="min-width:${width}px" aria-label="Histogramme empilé des acteurs">${shapes}</svg>`;
   }
   function render() {
     root.querySelectorAll('[data-mode]').forEach(b=>{const active=b.dataset.mode===state.mode;b.classList.toggle('is-active',active);b.setAttribute('aria-pressed',String(active));});
     $('[data-month]').value=state.month;
     const current=selectedEntries(state.month), text=state.search.trim().toLocaleLowerCase('fr');
     const roster=current.filter(e=>[e.actor.name,e.actor.description,categoryNames.get(e.category)].join(' ').toLocaleLowerCase('fr').includes(text));
     $('[data-metric="total"]').textContent=entries.filter(e=>state.visible.has(e.category)).length;
     $('[data-metric="period"]').textContent=current.length;
     $('[data-metric="categories"]').textContent=new Set(current.map(e=>e.category)).size;
     $('[data-roster-count]').textContent=`(${roster.length})`;
     $('[data-description]').textContent=`${state.mode==='new'?'Entrées durant':'Acteurs présents jusqu’à'} ${monthLabel(state.month)}. Les chiffres sont recalculés selon les typologies sélectionnées.`;
     $('[data-roster]').innerHTML=roster.length?roster.map(e=>`<article class="evolution-person"><span class="evolution-swatch" style="background:${escapeHtml(colors.get(e.category)||'#64748b')}"></span><div><strong>${escapeHtml(e.actor.name)}</strong><small>${escapeHtml(categoryNames.get(e.category)||'Autres')} · Premier repère : ${escapeHtml(e.event.date)} · ${escapeHtml(e.event.summary||e.actor.description||'')}</small><small class="evolution-sources">${sourceLinks(e.event.source_ids)}</small></div></article>`).join(''):'<p class="muted">Aucun acteur ne correspond à cette sélection.</p>';
     renderLegend();renderChart();
   }
   root.addEventListener('click',e=>{const mode=e.target.closest('[data-mode]'),category=e.target.closest('[data-category]'),month=e.target.closest('[data-chart-month]');if(mode){state.mode=mode.dataset.mode;render();}if(category){const id=category.dataset.category;state.visible.has(id)?state.visible.delete(id):state.visible.add(id);render();}if(month){state.month=month.dataset.chartMonth;render();}});
   root.addEventListener('change',e=>{if(e.target.matches('[data-month]')){state.month=e.target.value;render();}});
   root.addEventListener('input',e=>{if(e.target.matches('[data-search]')){state.search=e.target.value;render();}});
   root.addEventListener('keydown',e=>{const month=e.target.closest('[data-chart-month]');if(month&&(e.key==='Enter'||e.key===' ')){e.preventDefault();state.month=month.dataset.chartMonth;render();root.querySelector(`[data-chart-month="${state.month}"]`)?.focus();}});
   render();
 }
