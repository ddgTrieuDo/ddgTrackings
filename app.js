const SUPABASE_URL='https://qxigevxcqkdsapxosvhh.supabase.co';
const SUPABASE_KEY='sb_publishable_G_lto6J9yokrmYH8ib7trQ_KP1Lajbn';
const createClient = window.supabase && window.supabase.createClient;
if (typeof createClient !== 'function') {
  const el=document.getElementById('loginMsg');
  if(el) el.textContent='Supabase library is not available.';
  throw new Error('Supabase library is not available.');
}
const sb=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storageKey:'ddg-tracking-web-auth'}});


const DEFAULT_PROJECT_PHASES = [
  '1. Project Setup',
  '2. Modeling',
  '3. Engineering & Supports',
  '4. Coordination',
  '5. Shop Drawings',
  '6. Spooling',
  '7. BOM / Reports',
  '8. Fabrication Support',
  '9. QC / Final Review',
  '10. As-Built / Closeout'
];
const state={profile:null,page:'dashboard',jobsTab:'setup',tasksTab:'mine',attendanceTab:'live',setupProjectId:'',projects:[],tasks:[],profiles:[],members:[],assignees:[],timeEntries:[],phaseBudgets:[],changeOrders:[],devices:[],leaveRequests:[],shifts:[],specialDays:[],screenshots:[],dailyProgress:[]};
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=(v='')=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const num=v=>Number(v)||0; const fmt=v=>num(v).toFixed(2); const fmtTime=h=>`${Math.floor(num(h))}:${String(Math.round((num(h)%1)*60)).padStart(2,'0')}`;
const isoDay=()=>new Date().toISOString().slice(0,10);
function setSync(t){const e=$('#syncStatus');if(e)e.textContent=t}
function roleIsAdmin(){return state.profile?.role==='Admin'} function roleIsManager(){return ['Admin','Manager'].includes(state.profile?.role)}
function pById(id){return state.projects.find(x=>x.id===id)} function tById(id){return state.tasks.find(x=>x.id===id)} function prof(id){return state.profiles.find(x=>x.id===id)} function nameOf(id){const p=prof(id);return p?.display_name||p?.employee_id||p?.email||'—'}
function projectMembers(pid){return state.members.filter(x=>x.project_id===pid)} function projectLead(pid){return projectMembers(pid).find(x=>String(x.role_in_project).toLowerCase()==='lead')}
function isLead(pid){return projectLead(pid)?.user_id===state.profile?.id} function canManageProject(pid){return roleIsAdmin()||roleIsManager()||isLead(pid)}
function canManageAnyProject(){return roleIsManager()||state.projects.some(p=>isLead(p.id))}
function managedProjects(){return roleIsManager()?state.projects:state.projects.filter(p=>isLead(p.id))}
function projectLink(p){if(!p)return '—';return canManageProject(p.id)?`<button class="project-link" data-open-project="${p.id}">${esc(p.name)}</button>`:esc(p.name)}
function openProjectSetup(pid){if(!canManageProject(pid))return;state.setupProjectId=pid;state.jobsTab='setup';state.page='jobs';$$('.nav-btn[data-page]').forEach(x=>x.classList.toggle('active',x.dataset.page==='jobs'));$$('.page').forEach(p=>p.classList.add('hidden'));const target=$('#page-jobs');if(target)target.classList.remove('hidden');render()}
function hookProjectOpenLinks(root=document){root.querySelectorAll('[data-open-project]').forEach(b=>b.onclick=e=>{e.preventDefault();e.stopPropagation();openProjectSetup(b.dataset.openProject)})}
async function safe(table,query='*'){try{const {data,error}=await sb.from(table).select(query);if(error)throw error;return data||[]}catch(e){console.warn(table,e);return[]}}
async function loadAll(){setSync('Loading...');const [projects,tasks,profiles,members,assignees,timeEntries,phaseBudgets,changeOrders,devices,leaveRequests,shifts,specialDays,screenshots,dailyProgress]=await Promise.all([
 safe('projects'),safe('tasks'),safe('profiles'),safe('project_members'),safe('task_assignees'),safe('time_entries'),safe('project_phase_budgets'),safe('change_orders'),safe('devices'),safe('leave_requests'),safe('work_shift_settings'),safe('special_work_days'),safe('screenshots'),safe('task_progress_daily')]);
 Object.assign(state,{projects:projects.filter(x=>x.active!==false),tasks:tasks.filter(x=>x.active!==false),profiles,members,assignees,timeEntries,phaseBudgets,changeOrders,devices,leaveRequests,shifts,specialDays,screenshots,dailyProgress});setSync('Supabase ✓');render();}
function effectiveEntryHours(x){const now=Date.now();if(num(x.duration_seconds)>0)return num(x.duration_seconds)/3600;if(!x.started_at)return 0;const start=new Date(x.started_at).getTime();if(x.ended_at)return Math.max(0,(new Date(x.ended_at).getTime()-start)/3600000);let end=now;if(x.updated_at){const hb=new Date(x.updated_at).getTime();if(Number.isFinite(hb)&&now-hb>30000)end=hb}return Math.max(0,(end-start)/3600000)}
function taskHours(tid){return state.timeEntries.filter(x=>x.task_id===tid).reduce((s,x)=>s+effectiveEntryHours(x),0)}
function projectHours(pid){return state.tasks.filter(t=>t.project_id===pid).reduce((s,t)=>s+taskHours(t.id),0)}
function originalHours(pid){return state.phaseBudgets.filter(x=>x.project_id===pid).reduce((s,x)=>s+num(x.estimated_hours),0)}
function approvedHours(pid){return state.changeOrders.filter(x=>x.project_id===pid&&String(x.status).toLowerCase()==='approved').reduce((s,x)=>s+num(x.approved_hours??x.requested_hours),0)}
function openCO(pid){return state.changeOrders.filter(x=>x.project_id===pid&&!['approved','rejected'].includes(String(x.status).toLowerCase())).length}
function statusClass(s){s=String(s||'').toLowerCase();return s.includes('approved')||s.includes('track')||s.includes('done')||s==='tracking'?'good':s.includes('pending')||s.includes('progress')||s.includes('risk')?'warn':s.includes('reject')||s.includes('over')||s.includes('offline')?'bad':''}
function modal(title,html,onSave,saveText='Save'){ $('#modal').innerHTML=`<h3>${esc(title)}</h3>${html}<div class="modal-actions"><button id="mCancel">Cancel</button>${onSave?`<button id="mSave" class="primary">${esc(saveText)}</button>`:''}</div>`;$('#modalBackdrop').classList.remove('hidden');$('#mCancel').onclick=closeModal;if(onSave)$('#mSave').onclick=onSave} function closeModal(){$('#modalBackdrop').classList.add('hidden')}

async function getProfile(user){const {data}=await sb.from('profiles').select('*').eq('id',user.id).maybeSingle();return data||{id:user.id,email:user.email,display_name:user.email,role:'Employee'}}
async function showMain(user){state.profile=await getProfile(user);$('#loginView').classList.add('hidden');$('#mainView').classList.remove('hidden');$('#monitorNav').classList.toggle('hidden',!roleIsManager());$('#employeesNav').classList.toggle('hidden',!roleIsAdmin());$('#userSummary').innerHTML=`<b>${esc(state.profile.display_name||state.profile.email)}</b><br>${esc(state.profile.employee_id||'')} · ${esc(state.profile.role||'Employee')}`;await loadAll()}
async function loginWithRestFallback(email,password){
  const ctrl=new AbortController();
  const timer=setTimeout(()=>ctrl.abort(),20000);
  try{
    const r=await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`,{
      method:'POST',
      signal:ctrl.signal,
      headers:{
        'apikey':SUPABASE_KEY,
        'Authorization':`Bearer ${SUPABASE_KEY}`,
        'Content-Type':'application/json'
      },
      body:JSON.stringify({email,password})
    });
    const raw=await r.text();
    let body={};
    try{body=raw?JSON.parse(raw):{}}catch{body={message:raw}}
    if(!r.ok){
      const m=body?.msg||body?.message||body?.error_description||body?.error||`HTTP ${r.status}`;
      throw new Error(`Supabase Auth: ${m} (HTTP ${r.status})`);
    }
    if(!body.access_token||!body.refresh_token) throw new Error('Supabase Auth returned no session token.');
    const {data,error}=await sb.auth.setSession({access_token:body.access_token,refresh_token:body.refresh_token});
    if(error) throw error;
    return data;
  }finally{clearTimeout(timer)}
}

$('#loginBtn').onclick=async()=>{
  const btn=$('#loginBtn'), msg=$('#loginMsg');
  const email=$('#loginEmail').value.trim();
  const password=$('#loginPassword').value;
  msg.textContent='';
  if(!email||!password){msg.textContent='Please enter email and password.';return;}
  btn.disabled=true; btn.textContent='Signing in...';
  try{
    let data=null;
    let sdkError=null;
    try{
      const result=await Promise.race([
        sb.auth.signInWithPassword({email,password}),
        new Promise((_,reject)=>setTimeout(()=>reject(new Error('Supabase SDK login timed out.')),15000))
      ]);
      if(result?.error) sdkError=result.error; else data=result?.data||null;
    }catch(e){sdkError=e}

    if(!data?.user){
      console.warn('Supabase SDK login failed; trying direct Auth REST endpoint.',sdkError);
      msg.textContent='Retrying authentication...';
      data=await loginWithRestFallback(email,password);
    }
    if(!data?.user){
      const {data:ud,error:ue}=await sb.auth.getUser();
      if(ue) throw ue;
      data={user:ud?.user};
    }
    if(!data?.user) throw new Error('Login succeeded but no user session was returned.');
    msg.textContent='Login successful. Loading data...';
    await showMain(data.user);
  }catch(e){
    console.error('Login error',e);
    msg.textContent=e?.name==='AbortError'?'Connection to Supabase timed out.':(e?.message||'Unable to connect to Supabase.');
  }finally{btn.disabled=false;btn.textContent='Login';}
};
$('#loginPassword').addEventListener('keydown',e=>{if(e.key==='Enter')$('#loginBtn').click()});
$('#logoutBtn').onclick=async()=>{await sb.auth.signOut();location.reload()};$('#reloadBtn').onclick=loadAll;
$$('.nav-btn[data-page]').forEach(b=>b.onclick=()=>{state.page=b.dataset.page;$$('.nav-btn[data-page]').forEach(x=>x.classList.toggle('active',x===b));$$('.page').forEach(p=>p.classList.add('hidden'));$(`#page-${state.page}`).classList.remove('hidden');render()});

function render(){const titles={dashboard:['Dashboard','Project portfolio overview'],jobs:['Jobs','Project setup, list, change orders and project time'],tasks:['Tasks','My work and task management'],production:['Production','Task production progress'],screenshots:['Screenshots','Cloud screenshots from Tracking desktop agent'],attendance:['Attendance','Live team, leave, schedules and leave balances'],monitor:['Team Monitor','Employee screenshots by date'],employees:['Employees','Employee accounts, roles and leave balances'],settings:['Settings','Web portal preferences'],about:['About','DDG Tracking Web']};const t=titles[state.page]||['Tracking',''];$('#pageTitle').textContent=t[0];$('#pageSubtitle').textContent=t[1];({dashboard:renderDashboard,jobs:renderJobs,tasks:renderTasks,production:renderProduction,screenshots:renderScreenshots,attendance:renderAttendance,monitor:renderMonitor,employees:renderEmployees,settings:renderSettings,about:renderAbout}[state.page]||(()=>{}))();hookProjectOpenLinks(document)}

function renderDashboard(){const active=state.projects.length,atRisk=state.projects.filter(p=>p.status==='At Risk').length,over=state.projects.filter(p=>projectHours(p.id)>originalHours(p.id)+approvedHours(p.id)&&originalHours(p.id)+approvedHours(p.id)>0).length,hold=state.projects.filter(p=>p.status==='On Hold').length,pending=state.changeOrders.filter(c=>String(c.status).toLowerCase()==='pending').length,unapproved=state.changeOrders.filter(c=>String(c.status).toLowerCase()==='pending').reduce((s,c)=>s+num(c.requested_hours),0);const attention=state.projects.filter(p=>['At Risk','Over Hours','On Hold'].includes(p.status)||openCO(p.id));const coRows=[...state.changeOrders].sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0)).slice(0,12);
 $('#page-dashboard').innerHTML=`<div class="grid kpis">${[['Active Projects',active],['Projects At Risk',atRisk],['Projects Over Hours',over],['Projects On Hold',hold],['Pending Change Orders',pending],['Unapproved Hours',fmt(unapproved)]].map(x=>`<div class="kpi"><div class="label">${x[0]}</div><div class="value">${x[1]}</div></div>`).join('')}</div>
 <div class="card"><div class="section-title">Project Portfolio (${state.projects.length} Projects)</div>${projectPortfolioTable()}</div>
 <div class="grid three-col" style="margin-top:12px"><div class="card"><div class="section-title">Projects Requiring Attention</div><div class="table-wrap"><table class="table"><thead><tr><th>Project</th><th>Main Issue</th><th>Progress</th><th>Status</th></tr></thead><tbody>${attention.map(p=>`<tr><td>${projectLink(p)}</td><td>${openCO(p.id)?'Pending Change Order':esc(p.status)}</td><td>${num(p.overall_progress).toFixed(0)}%</td><td>${esc(p.status||'Not Started')}</td></tr>`).join('')}</tbody></table></div></div>
 <div class="card"><div class="section-title">Change Orders Requiring Action</div><div class="table-wrap"><table class="table"><thead><tr><th>CO</th><th>Project</th><th>Description</th><th>Requested</th><th>Status</th></tr></thead><tbody>${coRows.map(c=>`<tr><td>${esc(c.co_no||'—')}</td><td>${projectLink(pById(c.project_id))}</td><td>${esc(c.description||'')}</td><td>${fmt(c.requested_hours)}</td><td><span class="status ${statusClass(c.status)}">${esc(c.status||'Pending')}</span></td></tr>`).join('')}</tbody></table></div></div>
 <div class="card"><div class="section-title">Estimated vs Used Hours (Top 5)</div>${state.projects.slice().sort((a,b)=>(originalHours(b.id)+approvedHours(b.id))-(originalHours(a.id)+approvedHours(a.id))).slice(0,5).map(p=>{const est=originalHours(p.id)+approvedHours(p.id),used=projectHours(p.id),pct=est?Math.min(100,used/est*100):0;return`<div style="margin:13px 0"><b>${esc(p.name)}</b><div class="muted small">${fmt(used)} / ${fmt(est)} h</div><div class="progressbar" style="width:100%;margin-top:4px"><i style="width:${pct}%"></i></div></div>`}).join('')}</div></div>`}
function projectPortfolioTable(){return `<div class="table-wrap"><table class="table"><thead><tr><th>Project</th><th>Customer</th><th>Project Manager</th><th>Current Phase</th><th>Due</th><th>Original Hours</th><th>Original Used</th><th>Approved CO Hours</th><th>CO Hours Used</th><th>Revised Hours</th><th>Hours Used</th><th>Over Approved</th><th>Remaining Hours</th><th>Overall Progress</th><th>Budget Used %</th><th>Status</th><th>Open COs</th></tr></thead><tbody>${state.projects.map(p=>{const o=originalHours(p.id),a=approvedHours(p.id),u=projectHours(p.id),r=o+a,rem=Math.max(0,r-u),over=Math.max(0,u-r),pct=r?Math.min(999,u/r*100):0;return`<tr><td>${projectLink(p)}</td><td>${esc(p.customer||'—')}</td><td>${esc(p.project_manager||'—')}</td><td>${esc(p.current_phase||'—')}</td><td>${esc(p.due_date||'—')}</td><td>${fmt(o)}</td><td>${fmt(Math.min(u,o))}</td><td>${fmt(a)}</td><td>${fmt(Math.max(0,u-o))}</td><td>${fmt(r)}</td><td>${fmt(u)}</td><td>${fmt(over)}</td><td>${fmt(rem)}</td><td>${num(p.overall_progress).toFixed(0)}%</td><td>${pct.toFixed(0)}%</td><td><span class="status ${statusClass(p.status)}">${esc(p.status||'Not Started')}</span></td><td>${openCO(p.id)}</td></tr>`}).join('')}</tbody></table></div>`}

function tabs(items,active,handler){return `<div class="tabbar">${items.map(([key,label])=>`<button class="tab-btn ${active===key?'active':''}" data-subtab="${key}">${label}</button>`).join('')}</div>`}
function hookTabs(container,setter){container.querySelectorAll('[data-subtab]').forEach(b=>b.onclick=()=>{setter(b.dataset.subtab);render()})}
function renderJobs(){const el=$('#page-jobs');const items=[];if(canManageAnyProject())items.push(['setup','Project Setup']);items.push(['list','Project List']);if(roleIsManager())items.push(['co','Change Orders']);items.push(['time','Project Time']);if(!items.some(x=>x[0]===state.jobsTab))state.jobsTab=items[0][0];el.innerHTML=tabs(items,state.jobsTab)+`<div id="jobsBody"></div>`;hookTabs(el,v=>state.jobsTab=v);if(state.jobsTab==='setup')renderProjectSetup();if(state.jobsTab==='list')$('#jobsBody').innerHTML=`<div class="card">${projectPortfolioTable()}</div>`;if(state.jobsTab==='co')renderCO(true);if(state.jobsTab==='time')renderProjectTime()}
function projectOptions(selected=''){return state.projects.map(p=>`<option value="${p.id}" ${p.id===selected?'selected':''}>${esc(p.name)}</option>`).join('')}
function renderProjectSetup(){const body=$('#jobsBody');const allowed=managedProjects();let pid=state.setupProjectId&&allowed.some(p=>p.id===state.setupProjectId)?state.setupProjectId:(allowed[0]?.id||'');state.setupProjectId=pid;const opts=allowed.map(p=>`<option value="${p.id}" ${p.id===pid?'selected':''}>${esc(p.name)}</option>`).join('');body.innerHTML=`<div class="toolbar"><div class="field grow"><label>Project</label><select id="setupProject">${opts}</select></div>${roleIsAdmin()?'<button id="newProject">+ New Project</button><button id="renameProject">Rename</button><button id="deleteProject" class="danger">Delete</button>':''}<button id="saveSetup" class="primary" ${pid?'':'disabled'}>Save Project Setup</button></div><div id="setupForm"></div>`;const sel=$('#setupProject');sel.onchange=()=>{state.setupProjectId=sel.value;drawSetupForm(sel.value)};drawSetupForm(pid);if(roleIsAdmin()){ $('#newProject').onclick=()=>projectModal();$('#renameProject').onclick=()=>projectModal(pById(sel.value),true);$('#deleteProject').onclick=()=>archiveProject(sel.value)}$('#saveSetup').onclick=()=>saveProjectSetup(sel.value)}
function uniqueVals(field){return [...new Set(state.projects.map(p=>p[field]).filter(Boolean))].sort()}
function drawSetupForm(pid){const p=pById(pid),box=$('#setupForm');if(!p){box.innerHTML='<div class="notice">No project selected.</div>';return}const ms=projectMembers(pid),lead=projectLead(pid),phases=state.phaseBudgets.filter(x=>x.project_id===pid).sort((a,b)=>num(a.sort_order)-num(b.sort_order));box.innerHTML=`
 <div class="card"><div class="section-title">Project Information</div><div class="form-grid">
 <div class="field"><label>Project / Job Number</label><input id="pjJob" value="${esc(p.job_number||p.package_no||'')}"></div>
 <div class="field"><label>Customer</label><input id="pjCustomer" list="customerList" value="${esc(p.customer||'')}"><datalist id="customerList">${uniqueVals('customer').map(v=>`<option value="${esc(v)}">`).join('')}</datalist></div>
 <div class="field"><label>Project Manager</label><input id="pjPM" list="pmList" value="${esc(p.project_manager||'')}"><datalist id="pmList">${[...new Set([...uniqueVals('project_manager'),...state.profiles.map(x=>x.display_name).filter(Boolean)])].map(v=>`<option value="${esc(v)}">`).join('')}</datalist></div>
 <div class="field"><label>Office</label><input id="pjOffice" list="officeList" value="${esc(p.office||'')}"><datalist id="officeList">${uniqueVals('office').map(v=>`<option value="${esc(v)}">`).join('')}</datalist></div>
 <div class="field"><label>Current Phase</label><select id="pjPhase"><option value="">—</option>${phases.map(x=>`<option ${x.phase===p.current_phase?'selected':''}>${esc(x.phase)}</option>`).join('')}</select></div>
 <div class="field"><label>Current Status</label><select id="pjStatus">${['Not Started','On Track','At Risk','Over Hours','On Hold','Completed'].map(v=>`<option ${v===p.status?'selected':''}>${v}</option>`).join('')}</select></div>
 <div class="field"><label>Start Date</label><input id="pjStart" type="date" value="${esc(p.start_date||'')}"></div><div class="field"><label>Due Date</label><input id="pjDue" type="date" value="${esc(p.due_date||'')}"></div>
 <div class="field"><label>Priority</label><select id="pjPriority">${['','Low','Normal','High','Urgent'].map(v=>`<option ${v===p.priority?'selected':''}>${v||'—'}</option>`).join('')}</select></div>
 <div class="field"><label>Project Lead</label><select id="pjLead" ${roleIsAdmin()?'':'disabled'}><option value="">No Project Lead</option>${ms.map(m=>`<option value="${m.user_id}" ${lead?.user_id===m.user_id?'selected':''}>${esc(nameOf(m.user_id))}</option>`).join('')}</select></div>
 <div class="field span2"><label>Assigned Team Members</label><input id="assignedTeamMembers" class="clickable-readonly" readonly title="Click to manage project members" value="${esc(ms.map(m=>nameOf(m.user_id)).join(' · '))}"></div></div></div>
 <div class="card" style="margin-top:12px"><div class="section-title">Hours & Progress</div><div class="metric-grid">${[['Original Hours',originalHours(pid)],['Original Hours Used',Math.min(projectHours(pid),originalHours(pid))],['Approved Change Order Hours',approvedHours(pid)],['CO Hours Used',Math.max(0,projectHours(pid)-originalHours(pid))],['Remaining CO Hours',Math.max(0,approvedHours(pid)-Math.max(0,projectHours(pid)-originalHours(pid)))],['Over Approved Hours',Math.max(0,projectHours(pid)-originalHours(pid)-approvedHours(pid))],['Revised Hours',originalHours(pid)+approvedHours(pid)],['Hours Used',projectHours(pid)],['Remaining Hours',Math.max(0,originalHours(pid)+approvedHours(pid)-projectHours(pid))]].map(([l,v])=>`<div class="metric"><div class="label">${l} [AUTO]</div><div class="value">${fmt(v)}</div></div>`).join('')}<div class="field"><label>Overall Progress %</label><input id="pjProgress" type="number" min="0" max="100" value="${num(p.overall_progress)}"></div></div></div>
 <div class="card" style="margin-top:12px"><div class="toolbar"><div class="section-title grow">Progress by Phase</div>${canManageProject(pid)?'<button id="addPhase">+ Add Phase</button>':''}</div><div class="table-wrap"><table class="table"><thead><tr><th>Phase</th><th>Estimated Hours</th><th>Hours Used</th><th>Remaining Hours</th><th>Progress</th><th>Status</th><th>Action</th></tr></thead><tbody>${phases.map(ph=>{const used=state.tasks.filter(t=>t.project_id===pid&&t.phase===ph.phase).reduce((s,t)=>s+taskHours(t.id),0),est=num(ph.estimated_hours),pct=est?Math.min(100,used/est*100):0;return`<tr><td>${esc(ph.phase)}</td><td>${fmt(est)}</td><td>${fmt(used)}</td><td>${fmt(Math.max(0,est-used))}</td><td>${pct.toFixed(0)}%</td><td>${used<=0?'Not Started':used<est?'On Track':'Completed'}</td><td>${canManageProject(pid)?`<button data-edit-phase="${ph.id}">Edit</button> <button class="danger" data-del-phase="${ph.id}">Remove</button>`:''}</td></tr>`}).join('')}</tbody></table></div></div>`;
 const atm=$('#assignedTeamMembers');if(atm&&roleIsAdmin()){atm.onclick=()=>teamModal(pid);atm.style.cursor='pointer'}else if(atm){atm.style.cursor='default';atm.title='Only Admin can change Project Team'}
 if($('#addPhase'))$('#addPhase').onclick=()=>phaseModal(pid);$$('[data-edit-phase]').forEach(b=>b.onclick=()=>phaseModal(pid,phases.find(x=>x.id===b.dataset.editPhase)));$$('[data-del-phase]').forEach(b=>b.onclick=()=>deletePhase(b.dataset.delPhase,pid))}
async function saveProjectSetup(pid){state.setupProjectId=pid;const row={job_number:$('#pjJob').value.trim(),customer:$('#pjCustomer').value.trim(),project_manager:$('#pjPM').value.trim(),office:$('#pjOffice').value.trim(),current_phase:$('#pjPhase').value||null,status:$('#pjStatus').value,start_date:$('#pjStart').value||null,due_date:$('#pjDue').value||null,priority:$('#pjPriority').value||null,overall_progress:num($('#pjProgress').value)};const {error}=await sb.from('projects').update(row).eq('id',pid);if(error)return alert(error.message);if(roleIsAdmin())await setProjectLead(pid,$('#pjLead').value);await loadAll()}
async function setProjectLead(pid,uid){const ms=projectMembers(pid);for(const m of ms.filter(x=>String(x.role_in_project).toLowerCase()==='lead'&&x.user_id!==uid))await sb.from('project_members').update({role_in_project:'member'}).eq('project_id',pid).eq('user_id',m.user_id);if(uid)await sb.from('project_members').update({role_in_project:'lead'}).eq('project_id',pid).eq('user_id',uid)}
function phaseModal(pid,ph=null){modal(ph?'Edit Phase':'Add Phase',`<div class="form-grid"><div class="field"><label>Phase</label><input id="phName" value="${esc(ph?.phase||'')}"></div><div class="field"><label>Estimated Hours</label><input id="phHours" type="number" min="0" step="0.25" value="${num(ph?.estimated_hours)}"></div></div>`,async()=>{state.setupProjectId=pid;const row={project_id:pid,phase:$('#phName').value.trim(),estimated_hours:num($('#phHours').value),sort_order:ph?.sort_order??state.phaseBudgets.filter(x=>x.project_id===pid).length+1};if(!row.phase)return alert('Phase is required.');let r=ph?await sb.from('project_phase_budgets').update(row).eq('id',ph.id):await sb.from('project_phase_budgets').insert(row);if(r.error)return alert(r.error.message);closeModal();await loadAll()})}
async function deletePhase(id,pid){state.setupProjectId=pid;const ph=state.phaseBudgets.find(x=>x.id===id);if(state.tasks.some(t=>t.project_id===pid&&t.phase===ph?.phase))return alert('Move Tasks to another Phase first.');if(!confirm('Remove this Phase?'))return;const {error}=await sb.from('project_phase_budgets').delete().eq('id',id);if(error)alert(error.message);else await loadAll()}
function projectModal(p=null,renameOnly=false){
 if(renameOnly){
  modal('Rename Project',`<div class="field"><label>Project Name</label><input id="mName" value="${esc(p?.name||'')}"></div>`,async()=>{
   const name=$('#mName').value.trim();if(!name)return alert('Project Name is required.');
   const r=await sb.from('projects').update({name}).eq('id',p.id);if(r.error)return alert(r.error.message);closeModal();await loadAll();
  });return;
 }
 const people=state.profiles.filter(x=>x.active!==false);
 const customers=uniqueVals('customer'),pms=[...new Set([...uniqueVals('project_manager'),...people.map(x=>x.display_name).filter(Boolean)])].sort(),offices=uniqueVals('office');
 const options=(arr)=>arr.map(x=>`<option value="${esc(x)}"></option>`).join('');
 const html=`<div class="form-grid">
  <div class="field"><label>Project Name</label><input id="mName"></div>
  <div class="field"><label>Project / Job Number</label><input id="mJob"></div>
  <div class="field"><label>Customer</label><input id="mCustomer" list="mCustomerList"><datalist id="mCustomerList">${options(customers)}</datalist></div>
  <div class="field"><label>Project Manager</label><input id="mPM" list="mPMList"><datalist id="mPMList">${options(pms)}</datalist></div>
  <div class="field"><label>Office</label><input id="mOffice" list="mOfficeList"><datalist id="mOfficeList">${options(offices)}</datalist></div>
  <div class="field"><label>Status</label><select id="mStatus">${['Not Started','On Track','At Risk','Over Hours','On Hold','Completed'].map(x=>`<option>${x}</option>`).join('')}</select></div>
  <div class="field"><label>Priority</label><select id="mPriority">${['Low','Normal','High','Urgent'].map(x=>`<option ${x==='Normal'?'selected':''}>${x}</option>`).join('')}</select></div>
  <div class="field"><label>Start Date</label><input id="mStart" type="date"></div>
  <div class="field"><label>Due Date</label><input id="mDue" type="date"></div>
  <div class="span3"><b>Assigned Team Members</b><div class="check-list" id="mTeamList">${people.map(x=>`<label><input class="newProjectMember" type="checkbox" value="${x.id}"> ${esc(x.display_name||x.email)}${x.employee_id?' ('+esc(x.employee_id)+')':''}</label>`).join('')||'No active employees'}</div></div>
  <div class="field span3"><label>Project Lead</label><select id="mLead"><option value="">No Project Lead</option></select></div>
  <div class="span3 muted small"><b>Default phases will be created automatically:</b> 1. Project Setup through 10. As-Built / Closeout. Estimated Hours start at 0.00 and can be edited later in Project Setup.</div>
 </div>`;
 modal('New Project',html,async()=>{
  const name=$('#mName').value.trim();if(!name)return alert('Project Name is required.');
  if(state.projects.some(x=>String(x.name).toLowerCase()===name.toLowerCase()))return alert('This Project already exists.');
  const memberIds=$$('.newProjectMember:checked').map(x=>x.value),lead=$('#mLead').value||'';
  if(lead&&!memberIds.includes(lead))return alert('Project Lead must be one of the Assigned Team Members.');
  const row={name,job_number:$('#mJob').value.trim(),customer:$('#mCustomer').value.trim(),project_manager:$('#mPM').value.trim(),office:$('#mOffice').value.trim(),current_phase:DEFAULT_PROJECT_PHASES[0],status:$('#mStatus').value,priority:$('#mPriority').value,start_date:$('#mStart').value||null,due_date:$('#mDue').value||null,overall_progress:0,original_hours:0,approved_co_hours:0,active:true,created_by:state.profile.id};
  const r=await sb.from('projects').insert(row).select('id').single();if(r.error)return alert(r.error.message);const pid=r.data?.id;if(!pid)return alert('Project was created but no Project ID was returned.');
  const ph=await sb.from('project_phase_budgets').insert(DEFAULT_PROJECT_PHASES.map((phase,i)=>({project_id:pid,phase,estimated_hours:0,sort_order:(i+1)*10})));if(ph.error)return alert('Project created, but default phases could not be created: '+ph.error.message);
  if(memberIds.length){const a=await sb.from('project_members').upsert(memberIds.map(user_id=>({project_id:pid,user_id,role_in_project:user_id===lead?'lead':'member',assigned_by:state.profile.id})),{onConflict:'project_id,user_id'});if(a.error)return alert('Project created, but Team assignment could not be completed: '+a.error.message)}
  closeModal();await loadAll();
 });
 const rebuildLead=()=>{const ids=$$('.newProjectMember:checked').map(x=>x.value),sel=$('#mLead'),old=sel.value;sel.innerHTML='<option value="">No Project Lead</option>'+people.filter(x=>ids.includes(x.id)).map(x=>`<option value="${x.id}">${esc(x.display_name||x.email)}${x.employee_id?' ('+esc(x.employee_id)+')':''}</option>`).join('');if(ids.includes(old))sel.value=old};
 $$('.newProjectMember').forEach(x=>x.onchange=rebuildLead);rebuildLead();
}
async function archiveProject(id){if(!confirm('Delete/archive this Project? Historical time stays in Supabase.'))return;const {error}=await sb.from('projects').update({active:false}).eq('id',id);if(error)alert(error.message);else loadAll()}
function teamModal(pid){const old=projectMembers(pid),selected=old.map(m=>m.user_id),currentLead=old.find(m=>String(m.role_in_project).toLowerCase()==='lead')?.user_id||'';const people=state.profiles.filter(p=>p.active!==false||selected.includes(p.id));const html=`<div class="field"><label>Project Lead</label><select id="teamLead"></select></div><div class="field" style="margin-top:12px"><label>Assigned Team Members</label><div class="check-list">${people.map(p=>`<label><input class="teamCheck" type="checkbox" value="${p.id}" ${selected.includes(p.id)?'checked':''}> ${esc(p.display_name||p.email)} ${p.employee_id?'('+esc(p.employee_id)+')':''}</label>`).join('')}</div></div><div class="muted small" style="margin-top:8px">Select all employees assigned to this Project. Project Lead must be one of the selected members.</div>`;modal('Manage Project Team',html,async()=>{const ids=$$('.teamCheck:checked').map(x=>x.value),lead=$('#teamLead').value||'';if(lead&&!ids.includes(lead))return alert('Project Lead must also be an Assigned Team Member.');for(const uid of ids.filter(x=>!old.some(m=>m.user_id===x))){const r=await sb.from('project_members').upsert({project_id:pid,user_id:uid,role_in_project:'member'},{onConflict:'project_id,user_id'});if(r.error)return alert(r.error.message)}for(const m of old.filter(x=>String(x.role_in_project).toLowerCase()==='lead'&&x.user_id!==lead&&ids.includes(x.user_id))){const r=await sb.from('project_members').update({role_in_project:'member'}).eq('project_id',pid).eq('user_id',m.user_id);if(r.error)return alert(r.error.message)}if(lead){const r=await sb.from('project_members').upsert({project_id:pid,user_id:lead,role_in_project:'lead'},{onConflict:'project_id,user_id'});if(r.error)return alert(r.error.message)}for(const m of old.filter(x=>!ids.includes(x.user_id))){const r=await sb.from('project_members').delete().eq('project_id',pid).eq('user_id',m.user_id);if(r.error)return alert(r.error.message)}closeModal();await loadAll()});const rebuild=()=>{const ids=$$('.teamCheck:checked').map(x=>x.value),sel=$('#teamLead'),prev=sel.value||currentLead;sel.innerHTML='<option value="">No Project Lead</option>'+people.filter(p=>ids.includes(p.id)).map(p=>`<option value="${p.id}">${esc(p.display_name||p.email)}${p.employee_id?' ('+esc(p.employee_id)+')':''}</option>`).join('');if(ids.includes(prev))sel.value=prev;else sel.value=''};$$('.teamCheck').forEach(x=>x.onchange=rebuild);rebuild()}
function renderProjectTime(){const rows=state.projects;$('#jobsBody').innerHTML=`<div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Project</th><th>Today</th><th>This Week</th><th>All Task Hours</th></tr></thead><tbody>${rows.map(p=>{const entries=state.timeEntries.filter(x=>x.project_id===p.id),today=entryHours(entries.filter(x=>String(x.started_at||'').slice(0,10)===isoDay())),week=entryHours(entries.filter(x=>new Date(x.started_at||0)>new Date(Date.now()-7*86400000)));return`<tr><td>${esc(p.name)}</td><td>${fmtTime(today)}</td><td>${fmtTime(week)}</td><td>${fmt(projectHours(p.id))}</td></tr>`}).join('')}</tbody></table></div></div>`}
function entryHours(rows){return rows.reduce((s,x)=>s+effectiveEntryHours(x),0)}

function taskAssigneeNames(taskId){return state.assignees.filter(a=>a.task_id===taskId).map(a=>nameOf(a.user_id)).filter(Boolean)}
function taskProgressValue(task){return Math.max(0,Math.min(100,num(task?.progress_percent)))}
function taskSearchBlob(task){const p=pById(task.project_id),assignees=taskAssigneeNames(task.id).join(', ');return [p?.customer,p?.office,p?.name,task.name,task.status,task.phase,task.trade,task.level,task.building,task.system_name,assignees,task.planned_delivery,task.actual_delivery].join(' ').toLowerCase()}
function taskTradeOptions(selected=''){const base=['No trade','Plumbing','Piping','Duct','Fire Protection'];const items=base.includes(selected)||!selected?base:[...base,selected];return items.map(x=>`<option value="${x==='No trade'?'':esc(x)}" ${((selected||'')===x||(!selected&&x==='No trade'))?'selected':''}>${esc(x)}</option>`).join('')}
function taskStatusOptions(selected=''){const items=['Ready','In Progress','On Hold','Done'];if(selected&&!items.includes(selected))items.push(selected);return items.map(x=>`<option value="${esc(x)}" ${x===selected?'selected':''}>${esc(x)}</option>`).join('')}
function phaseOptions(pid,selected=''){const phases=state.phaseBudgets.filter(x=>x.project_id===pid).map(x=>x.phase).filter(Boolean);const uniq=[...new Set(phases)];if(selected&&!uniq.includes(selected))uniq.push(selected);return `<option value="">No phase</option>${uniq.map(x=>`<option value="${esc(x)}" ${x===selected?'selected':''}>${esc(x)}</option>`).join('')}`}
function renderTasks(){const el=$('#page-tasks');const items=[['mine','My Tasks']];if(canManageAnyProject())items.push(['manage','Task Management']);if(roleIsManager())items.push(['all','All Tasks']);if(!items.some(x=>x[0]===state.tasksTab))state.tasksTab='mine';el.innerHTML=tabs(items,state.tasksTab)+`<div id="tasksBody"></div>`;hookTabs(el,v=>{state.tasksTab=v;if(v!=='manage')state.selectedManagedTaskId=''});if(state.tasksTab==='mine')renderMyTasks();else if(state.tasksTab==='manage')renderTaskManagement();else renderAllTasks()}
function renderMyTasks(){const mine=state.tasks.filter(t=>state.assignees.some(a=>a.task_id===t.id&&a.user_id===state.profile.id));const pidOptions=['<option value="">All Projects</option>',...Array.from(new Set(mine.map(t=>t.project_id).filter(Boolean))).map(pid=>`<option value="${pid}" ${state.myTasksProjectId===pid?'selected':''}>${esc(pById(pid)?.name||'—')}</option>`)].join('');const rows=mine.filter(t=>!state.myTasksProjectId||t.project_id===state.myTasksProjectId);const totalHours=rows.reduce((s,t)=>s+taskHours(t.id),0);$('#tasksBody').innerHTML=`<div class="toolbar"><div class="field"><label>Project</label><select id="myTaskProject">${pidOptions}</select></div><div class="field grow"><label>Search</label><input id="myTaskSearch" placeholder="Search my tasks..."></div></div><div class="notice">${rows.length} tasks assigned to you • ${fmt(totalHours)} h tracked</div><div class="card"><div class="table-wrap"><table class="table my-tasks-table"><thead><tr><th>Project</th><th>Task</th><th>Status</th><th>Phase</th><th>Trade</th><th>Level</th><th>Building</th><th>System</th><th>% Complete</th><th>Tracked Hours</th><th>Assignees</th><th>People</th></tr></thead><tbody>${rows.map(t=>{const as=taskAssigneeNames(t.id),p=pById(t.project_id);return `<tr data-my-task-row data-search="${esc(taskSearchBlob(t))}"><td>${esc(p?.name||'—')}</td><td>${esc(t.name||'—')}</td><td>${esc(t.status||'Ready')}</td><td>${esc(t.phase||'—')}</td><td>${esc(t.trade||'—')}</td><td>${esc(t.level||'—')}</td><td>${esc(t.building||'—')}</td><td>${esc(t.system_name||'—')}</td><td>${taskProgressValue(t)}%</td><td>${fmt(taskHours(t.id))} h</td><td>${esc(as.join(', ')||'—')}</td><td>${as.length}</td></tr>`}).join('')||'<tr><td colspan="12" class="muted">No tasks assigned.</td></tr>'}</tbody></table></div></div>`;$('#myTaskProject').onchange=e=>{state.myTasksProjectId=e.target.value;renderMyTasks()};$('#myTaskSearch').oninput=e=>{const q=e.target.value.toLowerCase();$$('[data-my-task-row]').forEach(r=>r.classList.toggle('hidden',q&&!r.dataset.search.includes(q)))}}
function renderAllTasks(){const projectOptions=['<option value="">All Projects</option>',...state.projects.map(p=>`<option value="${p.id}" ${state.allTasksProjectId===p.id?'selected':''}>${esc(p.name)}</option>`)].join('');const rows=state.tasks.filter(t=>!state.allTasksProjectId||t.project_id===state.allTasksProjectId);$('#tasksBody').innerHTML=`<div class="toolbar"><div class="field"><label>Project</label><select id="allTaskProject">${projectOptions}</select></div><div class="field grow"><label>Search</label><input id="allTaskSearch" placeholder="Search tasks..."></div></div><div class="card"><div class="table-wrap"><table class="table all-tasks-table"><thead><tr><th>Customer</th><th>Project</th><th>Task</th><th>Status</th><th>Phase</th><th>Trade</th><th>Level</th><th>Building</th><th>System</th><th>% Complete</th><th>Tracked Hours</th><th>Assignees</th><th>People</th><th>Created Date</th><th>Planned Delivery</th><th>Task Deadline</th></tr></thead><tbody>${rows.map(t=>{const p=pById(t.project_id),as=taskAssigneeNames(t.id);return `<tr data-all-task-row data-search="${esc(taskSearchBlob(t))}"><td>${esc(p?.customer||'—')}</td><td>${esc(p?.name||'—')}</td><td>${esc(t.name||'—')}</td><td>${esc(t.status||'Ready')}</td><td>${esc(t.phase||'—')}</td><td>${esc(t.trade||'—')}</td><td>${esc(t.level||'—')}</td><td>${esc(t.building||'—')}</td><td>${esc(t.system_name||'—')}</td><td>${taskProgressValue(t)}%</td><td>${fmt(taskHours(t.id))} h</td><td>${esc(as.join(', ')||'—')}</td><td>${as.length}</td><td>${esc(String(t.created_at||'').slice(0,10)||'—')}</td><td>${esc(t.planned_delivery||'—')}</td><td>${esc(t.actual_delivery||'—')}</td></tr>`}).join('')||'<tr><td colspan="16" class="muted">No tasks found.</td></tr>'}</tbody></table></div></div>`;$('#allTaskProject').onchange=e=>{state.allTasksProjectId=e.target.value;renderAllTasks()};$('#allTaskSearch').oninput=e=>{const q=e.target.value.toLowerCase();$$('[data-all-task-row]').forEach(r=>r.classList.toggle('hidden',q&&!r.dataset.search.includes(q)))}}
function updateTaskManagementButtons(pid){const hasSelection=!!state.selectedManagedTaskId&&state.tasks.some(t=>t.id===state.selectedManagedTaskId&&t.project_id===pid);const edit=$('#editTaskBtn'),del=$('#deleteTaskBtn'),add=$('#newTaskBtn');if(edit)edit.disabled=!hasSelection;if(del)del.disabled=!hasSelection;if(add)add.disabled=!pid}
function renderTaskManagement(){const allowed=managedProjects();if(!allowed.some(p=>p.id===state.taskManageProjectId))state.taskManageProjectId=allowed[0]?.id||'';const pid=state.taskManageProjectId||'';const opts=allowed.map(p=>`<option value="${p.id}" ${p.id===pid?'selected':''}>${esc(p.name)}</option>`).join('');$('#tasksBody').innerHTML=`<div class="toolbar"><div class="field"><label>Project</label><select id="taskProject">${opts}</select></div><button id="editTaskBtn" ${state.selectedManagedTaskId?'':'disabled'}>Edit Selected</button><button id="deleteTaskBtn" class="danger" ${state.selectedManagedTaskId?'':'disabled'}>Delete Selected</button><button id="newTaskBtn" class="primary" ${pid?'':'disabled'}>+ New Task</button></div><div id="taskSelectionInfo" class="notice"></div><div id="taskGrid"></div><div class="muted small" style="margin-top:8px">Task Management matches the Desktop app fields: Task, Status, Phase, Trade, Level, Building, System, % Complete, Tracked Hours, Assignees and People.</div>`;const s=$('#taskProject');if(s)s.onchange=()=>{state.taskManageProjectId=s.value;state.selectedManagedTaskId='';renderTaskManagement()};$('#newTaskBtn').onclick=()=>taskModal(pid);$('#editTaskBtn').onclick=()=>{const task=tById(state.selectedManagedTaskId);if(task)taskModal(pid,task)};$('#deleteTaskBtn').onclick=()=>state.selectedManagedTaskId&&archiveTask(state.selectedManagedTaskId);drawTaskGrid(pid);updateTaskManagementButtons(pid)}
function drawTaskGrid(pid){const rows=state.tasks.filter(t=>t.project_id===pid);const selected=rows.find(t=>t.id===state.selectedManagedTaskId)||null;const info=$('#taskSelectionInfo');if(info)info.textContent=selected?`Task: ${selected.name}  •  Status: ${selected.status||'Ready'}  •  Tracked: ${fmt(taskHours(selected.id))} h  •  Assigned: ${taskAssigneeNames(selected.id).length} people`:'Click a row to select. Use Edit Selected to change Task Name, Status, Phase, Trade, Level, Building, System, % Complete and Assignees.';$('#taskGrid').innerHTML=`<div class="card"><div class="table-wrap"><table class="table task-management-table"><thead><tr><th>Task</th><th>Status</th><th>Phase</th><th>Trade</th><th>Level</th><th>Building</th><th>System</th><th>% Complete</th><th>Tracked Hours</th><th>Assignees</th><th>People</th></tr></thead><tbody>${rows.map(t=>{const as=taskAssigneeNames(t.id);return `<tr class="${t.id===state.selectedManagedTaskId?'selected':''}" data-task-row="${t.id}"><td>${esc(t.name||'—')}</td><td>${esc(t.status||'Ready')}</td><td>${esc(t.phase||'—')}</td><td>${esc(t.trade||'—')}</td><td>${esc(t.level||'—')}</td><td>${esc(t.building||'—')}</td><td>${esc(t.system_name||'—')}</td><td>${taskProgressValue(t)}%</td><td>${fmt(taskHours(t.id))} h</td><td>${esc(as.join(', ')||'—')}</td><td>${as.length}</td></tr>`}).join('')||'<tr><td colspan="11" class="muted">No tasks in this project.</td></tr>'}</tbody></table></div></div>`;$$('[data-task-row]').forEach(r=>{r.onclick=()=>{state.selectedManagedTaskId=r.dataset.taskRow;drawTaskGrid(pid);updateTaskManagementButtons(pid)};r.ondblclick=()=>{const task=tById(r.dataset.taskRow);if(task)taskModal(pid,task)}})}
function taskModal(pid,t=null){const ms=projectMembers(pid),selected=state.assignees.filter(a=>a.task_id===t?.id).map(a=>a.user_id);modal(t?'Edit Task':'New Task',`<div class="form-grid"><div class="field"><label>Task Name</label><input id="tName" value="${esc(t?.name||'')}"></div><div class="field"><label>Status</label><select id="tStatus">${taskStatusOptions(t?.status||'Ready')}</select></div><div class="field"><label>Phase</label><select id="tPhase">${phaseOptions(pid,t?.phase||'')}</select></div><div class="field"><label>Trade</label><select id="tTrade">${taskTradeOptions(t?.trade||'')}</select></div><div class="field"><label>Level</label><input id="tLevel" value="${esc(t?.level||'')}"></div><div class="field"><label>Building</label><input id="tBuilding" value="${esc(t?.building||'')}"></div><div class="field span2"><label>System</label><input id="tSystem" value="${esc(t?.system_name||'')}"></div><div class="field"><label>% Completed</label><input id="tProgress" type="number" min="0" max="100" step="1" value="${taskProgressValue(t)}"></div><div class="field"><label>Planned Delivery</label><input id="tPlanned" type="date" value="${esc(t?.planned_delivery||'')}"></div><div class="field"><label>Task Deadline</label><input id="tDeadline" type="date" value="${esc(t?.actual_delivery||'')}"></div><div class="span3"><div class="notice">Customer / Group / Project come from Project Setup. Tracked Hours and Detailers come from Tracking.</div></div><div class="span3"><b>Assignees</b><div class="check-list">${ms.map(m=>`<label><input type="checkbox" class="asg" value="${m.user_id}" ${selected.includes(m.user_id)?'checked':''}> ${esc(nameOf(m.user_id))}</label>`).join('')||'No Project Members'}</div></div></div>`,async()=>{const taskName=$('#tName').value.trim();if(!taskName)return alert('Task Name is required.');const row={project_id:pid,name:taskName,status:$('#tStatus').value,phase:$('#tPhase').value||null,trade:$('#tTrade').value||null,level:$('#tLevel').value.trim()||null,building:$('#tBuilding').value.trim()||null,system_name:$('#tSystem').value.trim()||null,progress_percent:Math.max(0,Math.min(100,Math.round(num($('#tProgress').value)))),planned_delivery:$('#tPlanned').value||null,actual_delivery:$('#tDeadline').value||null,active:true};let tid=t?.id,r;if(t)r=await sb.from('tasks').update(row).eq('id',t.id);else{r=await sb.from('tasks').insert(row).select('id').single();tid=r.data?.id}if(r.error)return alert(r.error.message);await sb.from('task_assignees').delete().eq('task_id',tid);const ids=$$('.asg:checked').map(x=>x.value);if(ids.length){const a=await sb.from('task_assignees').insert(ids.map(user_id=>({task_id:tid,user_id})));if(a.error)return alert(a.error.message)}closeModal();state.selectedManagedTaskId=tid||t?.id||'';await loadAll()})}
async function archiveTask(id){if(!confirm('Delete this Task? Tracking history is kept.'))return;const {error}=await sb.from('tasks').update({active:false}).eq('id',id);if(error)alert(error.message);else{if(state.selectedManagedTaskId===id)state.selectedManagedTaskId='';loadAll()}}

function renderCO(inJobs=false){const target=inJobs?'#jobsBody':'#page-changeorders',rows=state.changeOrders;$(target).innerHTML=`<div class="toolbar"><div class="field"><label>Project</label><select id="coFilter"><option value="">All Projects</option>${projectOptions()}</select></div><div class="grow"></div><button id="newCO">+ New Change Order</button></div><div class="grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:12px">${[['Requested Hours',rows.reduce((s,x)=>s+num(x.requested_hours),0)],['Approved Hours',rows.filter(x=>String(x.status).toLowerCase()==='approved').reduce((s,x)=>s+num(x.approved_hours??x.requested_hours),0)],['Pending Request',rows.filter(x=>String(x.status).toLowerCase()==='pending').length],['Change Orders',rows.length]].map(([l,v])=>`<div class="kpi"><div class="label">${l}</div><div class="value">${typeof v==='number'?fmt(v):v}</div></div>`).join('')}</div><div id="coGrid"></div>`;$('#newCO').onclick=()=>coModal();$('#coFilter').onchange=()=>drawCOGrid($('#coFilter').value);drawCOGrid('')}
function drawCOGrid(pid){const rows=state.changeOrders.filter(c=>!pid||c.project_id===pid);$('#coGrid').innerHTML=`<div class="table-wrap"><table class="table"><thead><tr><th>CO No.</th><th>Project</th><th>Description</th><th>Requested</th><th>Approved</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead><tbody>${rows.map(c=>`<tr><td>${esc(c.co_no||'—')}</td><td>${esc(pById(c.project_id)?.name||'—')}</td><td>${esc(c.description||'')}</td><td>${fmt(c.requested_hours)}</td><td>${c.approved_hours==null?'—':fmt(c.approved_hours)}</td><td><span class="status ${statusClass(c.status)}">${esc(c.status||'Pending')}</span></td><td>${esc((c.created_at||'').slice(0,10))}</td><td><button data-edit-co="${c.id}">Edit</button> <button class="success" data-approve-co="${c.id}">Approve</button> <button data-reject-co="${c.id}">Reject</button> <button class="danger" data-delete-co="${c.id}">Delete</button></td></tr>`).join('')}</tbody></table></div>`;$$('[data-edit-co]').forEach(b=>b.onclick=()=>coModal(state.changeOrders.find(x=>x.id===b.dataset.editCo)));$$('[data-approve-co]').forEach(b=>b.onclick=()=>approveCO(b.dataset.approveCo));$$('[data-reject-co]').forEach(b=>b.onclick=()=>setCOStatus(b.dataset.rejectCo,'Rejected'));$$('[data-delete-co]').forEach(b=>b.onclick=()=>deleteCO(b.dataset.deleteCo))}
function coModal(c=null){modal(c?'Edit Change Order':'New Change Order',`<div class="form-grid"><div class="field"><label>Project</label><select id="coProject">${projectOptions(c?.project_id)}</select></div><div class="field"><label>CO No.</label><input id="coNo" value="${esc(c?.co_no||'')}"></div><div class="field"><label>Requested Hours</label><input id="coReq" type="number" min="0" step="0.25" value="${num(c?.requested_hours)}"></div><div class="field span3"><label>Description</label><textarea id="coDesc" rows="3">${esc(c?.description||'')}</textarea></div></div>`,async()=>{const row={project_id:$('#coProject').value,co_no:$('#coNo').value.trim(),requested_hours:num($('#coReq').value),description:$('#coDesc').value.trim(),status:c?.status||'Pending'};const r=c?await sb.from('change_orders').update(row).eq('id',c.id):await sb.from('change_orders').insert(row);if(r.error)return alert(r.error.message);closeModal();await loadAll()})}
function approveCO(id){const c=state.changeOrders.find(x=>x.id===id);modal('Approve Change Order',`<div class="field"><label>Approved Hours</label><input id="apHours" type="number" min="0" step="0.25" value="${num(c?.approved_hours??c?.requested_hours)}"></div>`,async()=>{const h=num($('#apHours').value);const {error}=await sb.from('change_orders').update({approved_hours:h,status:'Approved'}).eq('id',id);if(error)return alert(error.message);closeModal();await loadAll()},'Approve')}
async function setCOStatus(id,status){const {error}=await sb.from('change_orders').update({status}).eq('id',id);if(error)alert(error.message);else loadAll()} async function deleteCO(id){if(!confirm('Delete this Change Order?'))return;const {error}=await sb.from('change_orders').delete().eq('id',id);if(error)alert(error.message);else loadAll()}

function renderProduction(){
  const dateKey=v=>{
    const d=new Date(v);
    if(!Number.isFinite(d.getTime())) return '';
    const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  };
  const fmtDate=v=>{
    if(!v)return '—';
    const [y,m,d]=String(v).split('-');
    return y&&m&&d?`${m}/${d}/${y}`:v;
  };
  const progressFor=(task,date)=>{
    const exact=state.dailyProgress.find(x=>String(x.task_id)===String(task.id)&&String(x.progress_date||'').slice(0,10)===date);
    if(exact)return Math.max(0,Math.min(100,num(exact.progress_percent)));
    if(date===dateKey(new Date()))return Math.max(0,Math.min(100,num(task.progress_percent)));
    return 0;
  };

  const groups=new Map();
  state.timeEntries.forEach(e=>{
    if(!e.project_id||!e.task_id||!e.started_at)return;
    const task=tById(e.task_id),project=pById(e.project_id);
    if(!task||!project)return;
    const date=dateKey(e.started_at);
    if(!date)return;
    const key=`${date}|${e.project_id}|${e.task_id}`;
    let g=groups.get(key);
    if(!g){g={date,project,task,hours:0,users:new Set()};groups.set(key,g)}
    g.hours+=effectiveEntryHours(e);
    if(e.user_id)g.users.add(e.user_id);
  });

  const rows=[...groups.values()].sort((a,b)=>b.date.localeCompare(a.date)||String(a.project.name||'').localeCompare(String(b.project.name||''))||String(a.task.name||'').localeCompare(String(b.task.name||'')));
  const total=rows.reduce((s,r)=>s+r.hours,0);
  const rowHtml=rows.map(r=>`<tr>
    <td>${esc(fmtDate(r.date))}</td>
    <td>${esc(r.project.customer||'—')}</td>
    <td>${esc(r.project.office||'—')}</td>
    <td>${projectLink(r.project)}</td>
    <td>${esc(r.task.phase||'—')}</td>
    <td>${esc(r.task.level||'—')}</td>
    <td>${esc(r.task.building||'—')}</td>
    <td>${esc(r.task.system_name||'—')}</td>
    <td>${esc(r.task.name||'—')}</td>
    <td>${esc([...r.users].map(nameOf).filter(Boolean).join(', ')||'—')}</td>
    <td>${progressFor(r.task,r.date).toFixed(0)}%</td>
    <td>${fmtTime(r.hours)}</td>
    <td>${fmtTime(r.hours)}</td>
    <td>0:00</td>
    <td>0:00</td>
    <td>0:00</td>
  </tr>`).join('');

  $('#page-production').innerHTML=`
    <div class="grid kpis" style="grid-template-columns:repeat(6,minmax(130px,1fr));margin-bottom:12px">
      ${[['Rows',rows.length],['Total',fmt(total)],['Regular Time',fmt(total)],['Overtime','0.00'],['Additional In Scope','0.00'],['Additional Out of Scope','0.00']].map(x=>`<div class="kpi"><div class="label">${x[0]}</div><div class="value">${x[1]}</div></div>`).join('')}
    </div>
    <div class="card">
      <div class="section-title">Daily Task Progress</div>
      <div class="muted small" style="margin-bottom:10px">Read-only report. Edit Task metadata in Tasks.</div>
      <div class="table-wrap"><table class="table production-daily-table">
        <thead><tr>
          <th>Date</th><th>Customer</th><th>Group</th><th>Project</th><th>Phase</th><th>Level</th><th>Building</th><th>System</th><th>Task</th><th>Detailers</th><th>% Completed</th><th>Total</th><th>Regular</th><th>OT</th><th>Additional In</th><th>Additional Out</th>
        </tr></thead>
        <tbody>${rowHtml}</tbody>
      </table></div>
    </div>`;
}

async function signedShot(path){if(!path)return'';for(const bucket of ['screenshots','tracking-screenshots']){const {data,error}=await sb.storage.from(bucket).createSignedUrl(path,600);if(!error&&data?.signedUrl)return data.signedUrl}return''}
function renderScreenshots(){const mine=state.screenshots.filter(s=>s.user_id===state.profile.id).sort((a,b)=>new Date(b.captured_at||0)-new Date(a.captured_at||0)).slice(0,100);$('#page-screenshots').innerHTML=`<div class="notice">Desktop screenshots are captured by the DDG Tracking desktop agent and synced to Supabase. The browser portal displays synced images.</div><div id="myShots" class="screenshot-grid"></div>`;drawShotCards(mine,$('#myShots'))}
async function drawShotCards(shots,el){el.innerHTML=shots.length?'<div class="muted">Loading previews...</div>':'<div class="muted">No screenshots.</div>';if(!shots.length)return;const cards=[];for(const s of shots){const url=await signedShot(s.storage_path);cards.push(`<article class="shot-card" data-url="${esc(url)}"><div class="shot-thumb">${url?`<img src="${esc(url)}" loading="lazy">`:'Preview unavailable'}</div><div class="shot-meta"><b>${s.captured_at?new Date(s.captured_at).toLocaleString():'—'}</b><span>${esc(pById(s.project_id)?.name||'No project')} · ${esc(tById(s.task_id)?.name||'No task')}</span></div></article>`)}el.innerHTML=cards.join('');el.querySelectorAll('[data-url]').forEach(x=>x.onclick=()=>x.dataset.url&&window.open(x.dataset.url,'_blank'))}

function renderAttendance(){const el=$('#page-attendance');el.innerHTML=tabs([['live','Live Team'],['leave','Leave Requests'],['schedule','Work Schedule & Holidays'],['balance','Leave Balances']],state.attendanceTab)+`<div id="attendanceBody"></div>`;hookTabs(el,v=>state.attendanceTab=v);({live:drawLiveTeam,leave:drawLeave,schedule:drawSchedule,balance:drawBalances}[state.attendanceTab]||drawLiveTeam)()}
function drawLiveTeam(){const now=Date.now(),today=new Date();const approved=state.leaveRequests.filter(l=>String(l.status).toLowerCase()==='approved'&&new Date(l.start_date)<=today&&new Date(l.end_date)>=today);$('#attendanceBody').innerHTML=`<div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Employee</th><th>Employee ID</th><th>Role</th><th>Status</th><th>Project</th><th>Task</th><th>Device</th><th>Last Seen</th></tr></thead><tbody>${state.profiles.filter(p=>p.active!==false).map(p=>{const d=state.devices.filter(x=>x.user_id===p.id).sort((a,b)=>new Date(b.last_seen||0)-new Date(a.last_seen||0))[0],onLeave=approved.some(l=>l.user_id===p.id),recent=d&&now-new Date(d.last_seen||0).getTime()<5*60000,status=onLeave?'On Leave':!recent?'Absent / Offline':d.is_tracking?'Tracking':'Not Tracking';return`<tr><td>${esc(nameOf(p.id))}</td><td>${esc(p.employee_id||'—')}</td><td>${esc(p.role||'Employee')}</td><td><span class="live-dot ${status==='Tracking'?'green':status==='Absent / Offline'?'red':status==='On Leave'?'amber':'gray'}"></span>${status}</td><td>${esc(pById(d?.project_id)?.name||d?.project_name||'No project')}</td><td>${esc(tById(d?.task_id)?.name||d?.task_name||'No task')}</td><td>${esc(d?.device_name||'—')}</td><td>${d?.last_seen?new Date(d.last_seen).toLocaleString():'—'}</td></tr>`}).join('')}</tbody></table></div></div>`}
function drawLeave(){
  const canReview=roleIsManager();
  const rows=state.leaveRequests.map(l=>{
    const isPending=String(l.status||'').toLowerCase()==='pending';
    const canEdit=l.user_id===state.profile.id&&isPending;
    let actions='';
    if(canEdit) actions+=`<button data-edit-leave="${esc(l.id)}">Edit</button>`;
    if(canReview&&isPending){
      actions+=`${actions?' ':''}<button class="success" data-approve-leave="${esc(l.id)}">Approve</button> <button class="danger" data-reject-leave="${esc(l.id)}">Reject</button>`;
    }
    return `<tr>
      <td>${esc(nameOf(l.user_id))}</td>
      <td>${esc(l.leave_type||'')}</td>
      <td>${esc(l.start_date||'')}</td>
      <td>${esc(l.end_date||'')}</td>
      <td>${esc(l.portion||'')}</td>
      <td>${esc(l.reason||'')}</td>
      <td>${esc(l.status||'Pending')}</td>
      <td>${esc(l.reviewer_comment||'')}</td>
      <td>${actions}</td>
    </tr>`;
  }).join('');
  $('#attendanceBody').innerHTML=`
    <div class="toolbar"><button id="newLeave">+ New Leave Request</button></div>
    <div class="card"><div class="table-wrap"><table class="table">
      <thead><tr><th>Employee</th><th>Leave Type</th><th>Start Date</th><th>End Date</th><th>Portion</th><th>Reason</th><th>Status</th><th>Reviewer Comment</th><th>Actions</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div></div>`;
  $('#newLeave').onclick=()=>leaveModal();
  $$('[data-edit-leave]').forEach(b=>b.onclick=()=>leaveModal(state.leaveRequests.find(x=>x.id===b.dataset.editLeave)));
  $$('[data-approve-leave]').forEach(b=>b.onclick=()=>reviewLeave(b.dataset.approveLeave,'Approved'));
  $$('[data-reject-leave]').forEach(b=>b.onclick=()=>reviewLeave(b.dataset.rejectLeave,'Rejected'));
}


function leaveModal(l=null){const ent=num(state.profile.annual_leave_days),used=usedLeave(state.profile.id);modal(l?'Edit Leave Request':'New Leave Request',`<div class="notice">Annual Leave: Entitlement ${fmt(ent)} · Used ${fmt(used)} · Remaining ${fmt(Math.max(0,ent-used))}</div><div class="form-grid"><div class="field"><label>Leave Type</label><select id="lvType">${['Annual Leave','Unpaid Leave','Sick Leave','Other'].map(x=>`<option ${l?.leave_type===x?'selected':''}>${x}</option>`).join('')}</select></div><div class="field"><label>Start Date</label><input id="lvStart" type="date" value="${esc(l?.start_date||isoDay())}"></div><div class="field"><label>End Date</label><input id="lvEnd" type="date" value="${esc(l?.end_date||isoDay())}"></div><div class="field"><label>Portion</label><select id="lvPortion">${['Full Day','Morning Half','Afternoon Half'].map(x=>`<option ${l?.portion===x?'selected':''}>${x}</option>`).join('')}</select></div><div class="field span3"><label>Reason</label><textarea id="lvReason">${esc(l?.reason||'')}</textarea></div></div>`,async()=>{const row={user_id:state.profile.id,leave_type:$('#lvType').value,start_date:$('#lvStart').value,end_date:$('#lvEnd').value,portion:$('#lvPortion').value,reason:$('#lvReason').value.trim(),status:'Pending'};const r=l?await sb.from('leave_requests').update(row).eq('id',l.id):await sb.from('leave_requests').insert(row);if(r.error)return alert(r.error.message);closeModal();await loadAll()})}
function reviewLeave(id,status){modal(`${status} Leave Request`,`<div class="field"><label>Reviewer Comment</label><textarea id="reviewComment"></textarea></div>`,async()=>{const {error}=await sb.from('leave_requests').update({status,reviewer_comment:$('#reviewComment').value.trim()}).eq('id',id);if(error)return alert(error.message);closeModal();await loadAll()},status)}
function usedLeave(uid){const y=new Date().getFullYear();return state.leaveRequests.filter(l=>l.user_id===uid&&String(l.status).toLowerCase()==='approved'&&String(l.leave_type||'').toLowerCase().includes('annual')&&new Date(l.start_date).getFullYear()===y).reduce((s,l)=>{if(String(l.portion).toLowerCase().includes('half'))return s+.5;let a=new Date(l.start_date),b=new Date(l.end_date),n=0;while(a<=b){if(![0,6].includes(a.getDay()))n++;a.setDate(a.getDate()+1)}return s+Math.max(1,n)},0)}
function defaultWeekShifts(){
  return [
    {day_of_week:1,is_workday:true,morning_start:'07:30',morning_end:'12:00',afternoon_start:'13:00',afternoon_end:'17:30',ot_start:'18:30',ot_end:'23:30'},
    {day_of_week:2,is_workday:true,morning_start:'07:30',morning_end:'12:00',afternoon_start:'13:00',afternoon_end:'17:30',ot_start:'18:30',ot_end:'23:30'},
    {day_of_week:3,is_workday:true,morning_start:'07:30',morning_end:'12:00',afternoon_start:'13:00',afternoon_end:'17:30',ot_start:'18:30',ot_end:'23:30'},
    {day_of_week:4,is_workday:true,morning_start:'07:30',morning_end:'12:00',afternoon_start:'13:00',afternoon_end:'17:30',ot_start:'18:30',ot_end:'23:30'},
    {day_of_week:5,is_workday:true,morning_start:'07:30',morning_end:'12:00',afternoon_start:'13:00',afternoon_end:'17:30',ot_start:'18:30',ot_end:'23:30'},
    {day_of_week:6,is_workday:true,morning_start:'07:30',morning_end:'12:00',afternoon_start:'13:00',afternoon_end:'17:30',ot_start:'18:30',ot_end:'23:30'},
    {day_of_week:7,is_workday:false,morning_start:null,morning_end:null,afternoon_start:null,afternoon_end:null,ot_start:null,ot_end:null}
  ];
}
async function setDefaultWeek(){
  if(!roleIsManager()) return;
  const replacing=state.shifts.length>0;
  const msg=replacing
    ? 'Replace the current Weekly Work Shift with the DDG default schedule?'
    : 'Create the DDG default Weekly Work Shift?\n\nMonday-Saturday: 07:30-12:00 / 13:00-17:30 / OT 18:30-23:30\nSunday: Off';
  if(!confirm(msg)) return;
  const {error}=await sb.from('work_shift_settings').upsert(defaultWeekShifts(),{onConflict:'day_of_week'});
  if(error) return alert(error.message);
  await loadAll();
}
function drawSchedule(){
  if(!roleIsManager()){
    $('#attendanceBody').innerHTML='<div class="notice">Admin/Manager access required.</div>';
    return;
  }

  // Keep the same day numbering as the Desktop App and the database:
  // 1=Monday ... 7=Sunday.
  const days=[
    [1,'Monday'],[2,'Tuesday'],[3,'Wednesday'],[4,'Thursday'],
    [5,'Friday'],[6,'Saturday'],[7,'Sunday']
  ];
  const defaults=defaultWeekShifts();

  const shiftRows=days.map(([dayNo,dayName])=>{
    const sh=state.shifts.find(x=>num(x.day_of_week)===dayNo)
      || defaults.find(x=>num(x.day_of_week)===dayNo)
      || {};
    const range=(a,b)=>(a||b)?`${a||''} - ${b||''}`:'—';
    return `<tr>
      <td>${esc(dayName)}</td>
      <td>${sh.is_workday===false?'Off':'Workday'}</td>
      <td>${esc(range(sh.morning_start,sh.morning_end))}</td>
      <td>${esc(range(sh.afternoon_start,sh.afternoon_end))}</td>
      <td>${esc(range(sh.ot_start,sh.ot_end))}</td>
      <td><button data-shift-day="${dayNo}">Edit</button></td>
    </tr>`;
  }).join('');

  const specialRows=state.specialDays.map(sp=>`<tr>
      <td>${esc(sp.work_date)}</td>
      <td>${esc(sp.name||'')}</td>
      <td>${sp.is_workday?'Special Workday':'Holiday'}</td>
      <td>${esc((sp.morning_start||'')+' - '+(sp.morning_end||''))}</td>
      <td>${esc((sp.afternoon_start||'')+' - '+(sp.afternoon_end||''))}</td>
      <td>${esc((sp.ot_start||'')+' - '+(sp.ot_end||''))}</td>
      <td><button data-edit-special="${esc(sp.id)}">Edit</button> <button class="danger" data-del-special="${esc(sp.id)}">Delete</button></td>
    </tr>`).join('');

  $('#attendanceBody').innerHTML=`
    <div class="card">
      <div class="toolbar">
        <div class="section-title grow">Weekly Work Shift</div>
        <button id="setDefaultWeek">+ Set Default Week</button>
      </div>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Day</th><th>Work Day</th><th>Morning</th><th>Afternoon</th><th>OT</th><th>Action</th></tr></thead>
        <tbody>${shiftRows}</tbody>
      </table></div>
    </div>
    <div class="card" style="margin-top:12px">
      <div class="toolbar"><div class="section-title grow">Holidays / Special Work Days</div><button id="addSpecial">+ Add Day</button></div>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Date</th><th>Name</th><th>Type</th><th>Morning</th><th>Afternoon</th><th>OT</th><th>Actions</th></tr></thead>
        <tbody>${specialRows}</tbody>
      </table></div>
    </div>`;

  $('#setDefaultWeek').onclick=setDefaultWeek;
  $$('[data-shift-day]').forEach(b=>b.onclick=()=>shiftModal(num(b.dataset.shiftDay)));
  $('#addSpecial').onclick=()=>specialDayModal();
  $$('[data-edit-special]').forEach(b=>b.onclick=()=>specialDayModal(state.specialDays.find(x=>x.id===b.dataset.editSpecial)));
  $$('[data-del-special]').forEach(b=>b.onclick=()=>deleteSpecial(b.dataset.delSpecial));
}
function shiftModal(day){const s=state.shifts.find(x=>num(x.day_of_week)===day)||defaultWeekShifts().find(x=>num(x.day_of_week)===day)||{};modal('Edit Work Schedule',`<div class="form-grid"><div class="field"><label>Workday</label><select id="shWork"><option value="true" ${s.is_workday!==false?'selected':''}>Workday</option><option value="false" ${s.is_workday===false?'selected':''}>Off</option></select></div>${[['Morning Start','morning_start'],['Morning End','morning_end'],['Afternoon Start','afternoon_start'],['Afternoon End','afternoon_end'],['OT Start','ot_start'],['OT End','ot_end']].map(([l,k])=>`<div class="field"><label>${l}</label><input id="${k}" type="time" value="${esc(s[k]||'')}"></div>`).join('')}</div>`,async()=>{const row={day_of_week:day,is_workday:$('#shWork').value==='true',morning_start:$('#morning_start').value||null,morning_end:$('#morning_end').value||null,afternoon_start:$('#afternoon_start').value||null,afternoon_end:$('#afternoon_end').value||null,ot_start:$('#ot_start').value||null,ot_end:$('#ot_end').value||null};const {error}=await sb.from('work_shift_settings').upsert(row,{onConflict:'day_of_week'});if(error)return alert(error.message);closeModal();await loadAll()})}
function specialDayModal(s=null){modal(s?'Edit Special Day':'Add Special Day',`<div class="form-grid"><div class="field"><label>Date</label><input id="sdDate" type="date" value="${esc(s?.work_date||isoDay())}"></div><div class="field"><label>Name</label><input id="sdName" value="${esc(s?.name||'')}"></div><div class="field"><label>Type</label><select id="sdWork"><option value="false" ${s?.is_workday?'':'selected'}>Holiday</option><option value="true" ${s?.is_workday?'selected':''}>Special Workday</option></select></div></div>`,async()=>{const row={work_date:$('#sdDate').value,name:$('#sdName').value.trim(),is_workday:$('#sdWork').value==='true'};const r=s?await sb.from('special_work_days').update(row).eq('id',s.id):await sb.from('special_work_days').upsert(row,{onConflict:'work_date'});if(r.error)return alert(r.error.message);closeModal();await loadAll()})} async function deleteSpecial(id){if(!confirm('Delete this day?'))return;const {error}=await sb.from('special_work_days').delete().eq('id',id);if(error)alert(error.message);else loadAll()}
function drawBalances(){if(!roleIsManager()){$('#attendanceBody').innerHTML='<div class="notice">Admin/Manager access required.</div>';return}$('#attendanceBody').innerHTML=`<div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Employee</th><th>Employee ID</th><th>Annual Entitlement</th><th>Used</th><th>Remaining</th><th>Action</th></tr></thead><tbody>${state.profiles.filter(p=>p.active!==false).map(p=>{const e=num(p.annual_leave_days),u=usedLeave(p.id);return`<tr><td>${esc(nameOf(p.id))}</td><td>${esc(p.employee_id||'—')}</td><td>${fmt(e)}</td><td>${fmt(u)}</td><td>${fmt(Math.max(0,e-u))}</td><td><button data-leave-bal="${p.id}">Edit</button></td></tr>`}).join('')}</tbody></table></div></div>`;$$('[data-leave-bal]').forEach(b=>b.onclick=()=>leaveBalanceModal(b.dataset.leaveBal))}
function leaveBalanceModal(uid){const p=prof(uid);modal('Annual Leave Entitlement',`<div class="field"><label>${esc(nameOf(uid))}</label><input id="leaveEnt" type="number" min="0" step="0.5" value="${num(p?.annual_leave_days)}"></div>`,async()=>{const {error}=await sb.from('profiles').update({annual_leave_days:num($('#leaveEnt').value)}).eq('id',uid);if(error)return alert(error.message);closeModal();await loadAll()})}

function renderMonitor(){if(!roleIsManager()){$('#page-monitor').innerHTML='<div class="notice">Admin/Manager access required.</div>';return}const people=state.profiles.filter(p=>p.active!==false);$('#page-monitor').innerHTML=`<div class="toolbar"><div class="field"><label>Employee</label><select id="monEmp">${people.map(p=>`<option value="${p.id}">${esc(nameOf(p.id))} (${esc(p.employee_id||'')}) · ${esc(p.role||'Employee')}</option>`).join('')}</select></div><div class="field"><label>Date</label><input id="monDate" type="date" value="${isoDay()}"></div><button id="monLoad" class="primary">Reload</button></div><div id="monInfo" class="muted small"></div><div id="monShots" class="screenshot-grid" style="margin-top:12px"></div>`;$('#monLoad').onclick=loadMonitor;$('#monEmp').onchange=loadMonitor;$('#monDate').onchange=loadMonitor;loadMonitor()}
async function loadMonitor(){const uid=$('#monEmp').value,day=$('#monDate').value,shots=state.screenshots.filter(s=>s.user_id===uid&&String(s.captured_at||'').slice(0,10)===day).sort((a,b)=>new Date(b.captured_at)-new Date(a.captured_at));$('#monInfo').textContent=`${nameOf(uid)}: ${shots.length} screenshots on ${day}.`;await drawShotCards(shots,$('#monShots'))}

function renderEmployees(){if(!roleIsAdmin()){$('#page-employees').innerHTML='<div class="notice">Admin access required.</div>';return}const rows=state.profiles;$('#page-employees').innerHTML=`<div class="toolbar"><button id="newEmployee">+ New Employee</button><div class="field grow"><label>Search</label><input id="empSearch" placeholder="Search employee..."></div></div><div class="grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:12px">${[['Employees',rows.length],['Active',rows.filter(x=>x.active!==false).length],['Admins',rows.filter(x=>x.role==='Admin').length],['Managers',rows.filter(x=>x.role==='Manager').length]].map(([l,v])=>`<div class="kpi"><div class="label">${l}</div><div class="value">${v}</div></div>`).join('')}</div><div class="table-wrap"><table class="table"><thead><tr><th>Employee</th><th>Employee ID</th><th>Email</th><th>Role</th><th>Annual Leave</th><th>Used</th><th>Remaining</th><th>Status</th><th>Action</th></tr></thead><tbody>${rows.map(p=>{const e=num(p.annual_leave_days),u=usedLeave(p.id);return`<tr data-emp-row data-search="${esc([p.display_name,p.employee_id,p.email,p.role].join(' ').toLowerCase())}"><td>${esc(nameOf(p.id))}</td><td>${esc(p.employee_id||'—')}</td><td>${esc(p.email||'—')}</td><td>${esc(p.role||'Employee')}</td><td>${fmt(e)}</td><td>${fmt(u)}</td><td>${fmt(Math.max(0,e-u))}</td><td>${p.active===false?'Inactive':'Active'}</td><td><button data-edit-emp="${p.id}">Edit</button> <button class="${p.active===false?'success':'danger'}" data-toggle-emp="${p.id}">${p.active===false?'Activate':'Deactivate'}</button></td></tr>`}).join('')}</tbody></table></div>`;$('#newEmployee').onclick=()=>employeeModal();$('#empSearch').oninput=e=>{const q=e.target.value.toLowerCase();$$('[data-emp-row]').forEach(r=>r.classList.toggle('hidden',q&&!r.dataset.search.includes(q)))};$$('[data-edit-emp]').forEach(b=>b.onclick=()=>employeeModal(prof(b.dataset.editEmp)));$$('[data-toggle-emp]').forEach(b=>b.onclick=()=>toggleEmployee(b.dataset.toggleEmp))}
async function createAuthEmployee(email,password,metadata){const temp=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});const {data,error}=await temp.auth.signUp({email,password,options:{data:metadata}});try{await temp.auth.signOut()}catch{}if(error)throw error;return data.user}
function employeeModal(p=null){modal(p?'Edit Employee':'New Employee',`<div class="form-grid"><div class="field"><label>Display Name</label><input id="eName" value="${esc(p?.display_name||'')}"></div><div class="field"><label>Employee ID</label><input id="eId" value="${esc(p?.employee_id||'')}"></div><div class="field"><label>Email</label><input id="eEmail" type="email" value="${esc(p?.email||'')}" ${p?'readonly':''}></div><div class="field"><label>Role</label><select id="eRole">${['Employee','Manager','Admin'].map(r=>`<option ${p?.role===r?'selected':''}>${r}</option>`).join('')}</select></div><div class="field"><label>Annual Leave Days</label><input id="eLeave" type="number" step="0.5" min="0" value="${num(p?.annual_leave_days)}"></div>${p?'':`<div class="field"><label>Temporary Password</label><input id="ePass" type="password"></div>`}</div>`,async()=>{let uid=p?.id;const row={display_name:$('#eName').value.trim(),employee_id:$('#eId').value.trim(),email:$('#eEmail').value.trim().toLowerCase(),role:$('#eRole').value,annual_leave_days:num($('#eLeave').value),active:p?.active!==false};if(!p){try{const u=await createAuthEmployee(row.email,$('#ePass').value,{display_name:row.display_name,employee_id:row.employee_id});uid=u?.id}catch(e){return alert(e.message)}}for(let i=0;i<8&&!p;i++){const {data}=await sb.from('profiles').select('id').eq('id',uid).maybeSingle();if(data)break;await new Promise(r=>setTimeout(r,250))}const {error}=await sb.from('profiles').update(row).eq('id',uid);if(error)return alert(error.message);closeModal();await loadAll()})}
async function toggleEmployee(uid){const p=prof(uid),next=p?.active===false;if(uid===state.profile.id&&!next)return alert('You cannot deactivate yourself.');const {error}=await sb.from('profiles').update({active:next}).eq('id',uid);if(error)alert(error.message);else loadAll()}

function renderSettings(){$('#page-settings').innerHTML=`<div class="card" style="max-width:900px"><div class="section-title">Web Portal Settings</div><div class="notice">Tracking capture settings remain in the Windows desktop agent because a browser cannot monitor global keyboard/mouse activity, detect all desktop applications, or capture the entire desktop in the background.</div><div class="form-grid"><div class="field"><label>Supabase</label><input readonly value="Connected"></div><div class="field"><label>Portal</label><input readonly value="DDG Tracking Web"></div><div class="field"><label>Signed screenshot URL lifetime</label><input readonly value="10 minutes"></div></div></div>`}
function renderAbout(){$('#page-about').innerHTML=`<div class="card" style="max-width:900px"><div class="section-title">DDG Tracking Web</div><p>Web management portal synchronized with the DDG Tracking Windows desktop agent through Supabase.</p><p><b>Shared management features:</b> Dashboard, Project Setup/List/Time, Change Orders, My Tasks, Task Management, All Tasks, Production, Screenshots, Attendance/Leave/Schedules, Team Monitor and Employee Management.</p><p><b>Desktop agent:</b> Start/Stop tracking, keyboard/mouse activity, active applications, automatic screenshots, offline/background tracking and system tray operation.</p><p class="muted">Version Web 4.16 Full Task Sync</p></div>`}

async function bootstrapAuth(){
  try{
    const {data,error}=await sb.auth.getSession();
    if(error) console.warn('Session restore error',error);
    if(data?.session?.user) await showMain(data.session.user);
  }catch(e){console.error('Auth bootstrap error',e);}
}
sb.auth.onAuthStateChange((event,session)=>{
  console.log('Auth state:',event);
  if(event==='SIGNED_OUT'){
    $('#mainView')?.classList.add('hidden');
    $('#loginView')?.classList.remove('hidden');
  }
});
bootstrapAuth();
