import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL='https://qxigevxcqkdsapxosvhh.supabase.co';
const SUPABASE_KEY='sb_publishable_G_lto6J9yokrmYH8ib7trQ_KP1Lajbn';
const supabase=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});

const state={profile:null,projects:[],tasks:[],members:[],profiles:[],assignees:[],timeEntries:[],phaseBudgets:[],changeOrders:[],devices:[],leaveRequests:[],page:'dashboard'};
const $=s=>document.querySelector(s); const $$=s=>[...document.querySelectorAll(s)];

function esc(v=''){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function num(v){return Number(v||0)}
function fmtH(v){return num(v).toFixed(2)}
function roleIsManager(){return ['Admin','Manager'].includes(state.profile?.role)}
function roleIsAdmin(){return state.profile?.role==='Admin'}
function projectById(id){return state.projects.find(x=>x.id===id)}
function taskById(id){return state.tasks.find(x=>x.id===id)}
function displayName(uid){return state.profiles.find(x=>x.id===uid)?.display_name||uid?.slice(0,8)||'—'}
function setSync(t,bad=false){$('#syncStatus').textContent=t;$('#syncStatus').style.color=bad?'#b42318':'#246b45'}

async function safe(table,query='*'){
  try{const {data,error}=await supabase.from(table).select(query); if(error) throw error; return data||[]}catch(e){console.warn(table,e);return []}
}

async function loadAll(){
  setSync('Loading...');
  const [projects,tasks,profiles,members,assignees,timeEntries,phaseBudgets,changeOrders,devices,leaveRequests]=await Promise.all([
    safe('projects','*'),safe('tasks','*'),safe('profiles','*'),safe('project_members','*'),safe('task_assignees','*'),safe('time_entries','*'),safe('project_phase_budgets','*'),safe('change_orders','*'),safe('devices','*'),safe('leave_requests','*')
  ]);
  Object.assign(state,{projects:projects.filter(x=>x.active!==false),tasks:tasks.filter(x=>x.active!==false),profiles,members,assignees,timeEntries,phaseBudgets,changeOrders,devices,leaveRequests});
  render();setSync('Synced');
}

function taskHours(taskId){
  const now=Date.now();return state.timeEntries.filter(x=>x.task_id===taskId).reduce((s,x)=>{
    if(num(x.duration_seconds)>0)return s+num(x.duration_seconds)/3600;
    if(x.started_at && !x.ended_at)return s+(now-new Date(x.started_at).getTime())/3600000;
    if(x.started_at&&x.ended_at)return s+(new Date(x.ended_at)-new Date(x.started_at))/3600000;return s;
  },0)
}
function projectHours(projectId){return state.tasks.filter(t=>t.project_id===projectId).reduce((s,t)=>s+taskHours(t.id),0)}
function originalHours(pid){return state.phaseBudgets.filter(x=>x.project_id===pid).reduce((s,x)=>s+num(x.estimated_hours),0)}
function approvedHours(pid){return state.changeOrders.filter(x=>x.project_id===pid&&String(x.status).toLowerCase()==='approved').reduce((s,x)=>s+num(x.approved_hours??x.requested_hours),0)}
function openCO(pid){return state.changeOrders.filter(x=>x.project_id===pid&&String(x.status).toLowerCase()!=='approved'&&String(x.status).toLowerCase()!=='rejected').length}

function showMain(profile){state.profile=profile;$('#loginView').classList.add('hidden');$('#mainView').classList.remove('hidden');$('#employeesNav')?.classList.toggle('hidden',!roleIsAdmin());$('#userSummary').innerHTML=`<b>${esc(profile.display_name||profile.email)}</b><br>${esc(profile.employee_id||'')} · ${esc(profile.role||'Employee')}`;loadAll()}
async function getProfile(user){const {data}=await supabase.from('profiles').select('*').eq('id',user.id).maybeSingle();return data||{id:user.id,email:user.email,display_name:user.email,role:'Employee'}}

$('#loginBtn').onclick=async()=>{const email=$('#loginEmail').value.trim(),password=$('#loginPassword').value;$('#loginMsg').textContent='';const {data,error}=await supabase.auth.signInWithPassword({email,password});if(error){$('#loginMsg').textContent=error.message;return}showMain(await getProfile(data.user));}
$('#logoutBtn').onclick=async()=>{await supabase.auth.signOut();location.reload()}
$('#reloadBtn').onclick=loadAll;

$$('.nav-btn[data-page]').forEach(b=>b.onclick=()=>{state.page=b.dataset.page;$$('.nav-btn[data-page]').forEach(x=>x.classList.toggle('active',x===b));$$('.page').forEach(p=>p.classList.add('hidden'));$(`#page-${state.page}`).classList.remove('hidden');render();});

function render(){
  const titles={dashboard:['Dashboard','Project portfolio overview'],projects:['Projects','Project setup and team management'],tasks:['Tasks','Task management and tracked hours'],changeorders:['Change Orders','Requested and approved project changes'],attendance:['Attendance','Live team and leave requests'],employees:['Employees','Employee accounts, roles and leave balances']};
  $('#pageTitle').textContent=titles[state.page][0];$('#pageSubtitle').textContent=titles[state.page][1];
  if(state.page==='dashboard')renderDashboard(); if(state.page==='projects')renderProjects(); if(state.page==='tasks')renderTasks(); if(state.page==='changeorders')renderCO(); if(state.page==='attendance')renderAttendance(); if(state.page==='employees')renderEmployees();
}

function renderDashboard(){
 const active=state.projects.length, atRisk=state.projects.filter(p=>p.status==='At Risk').length, over=state.projects.filter(p=>projectHours(p.id)>originalHours(p.id)+approvedHours(p.id)&&originalHours(p.id)+approvedHours(p.id)>0).length, hold=state.projects.filter(p=>p.status==='On Hold').length, pending=state.changeOrders.filter(c=>String(c.status).toLowerCase()==='pending').length, unapproved=state.changeOrders.filter(c=>String(c.status).toLowerCase()==='pending').reduce((s,c)=>s+num(c.requested_hours),0);
 $('#page-dashboard').innerHTML=`<div class="grid kpis">${[['Active Projects',active],['Projects At Risk',atRisk],['Projects Over Hours',over],['Projects On Hold',hold],['Pending Change Orders',pending],['Unapproved Hours',fmtH(unapproved)]].map(x=>`<div class="kpi"><div class="label">${x[0]}</div><div class="value">${x[1]}</div></div>`).join('')}</div><div class="card"><div class="section-title">Project Portfolio</div><div class="table-wrap"><table class="table"><thead><tr><th>Project</th><th>Customer</th><th>Project Manager</th><th>Current Phase</th><th>Original Hours</th><th>Approved CO Hours</th><th>Revised Hours</th><th>Hours Used</th><th>Remaining</th><th>Status</th><th>Open COs</th></tr></thead><tbody>${state.projects.map(p=>{const o=originalHours(p.id),a=approvedHours(p.id),u=projectHours(p.id),r=o+a;return`<tr><td>${esc(p.name)}</td><td>${esc(p.customer||'—')}</td><td>${esc(p.project_manager||'—')}</td><td>${esc(p.current_phase||'—')}</td><td>${fmtH(o)}</td><td>${fmtH(a)}</td><td>${fmtH(r)}</td><td>${fmtH(u)}</td><td>${fmtH(Math.max(0,r-u))}</td><td>${esc(p.status||'Not Started')}</td><td>${openCO(p.id)}</td></tr>`}).join('')}</tbody></table></div></div>`;
}

function renderProjects(){
 const can=roleIsManager();
 $('#page-projects').innerHTML=`<div class="toolbar"><div class="field"><label>Project</label><select id="projSel">${state.projects.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select></div>${can?`<button id="newProj" class="primary">+ New Project</button><button id="editProj">Edit Project</button><button id="delProj" class="danger">Archive Project</button>`:''}</div><div id="projectDetail"></div>`;
 const sel=$('#projSel'); if(sel){sel.onchange=()=>renderProjectDetail(sel.value); if(sel.value)renderProjectDetail(sel.value)}
 if(can){$('#newProj').onclick=()=>projectModal();$('#editProj').onclick=()=>projectModal(projectById(sel.value));$('#delProj').onclick=()=>archiveProject(sel.value)}
}
function renderProjectDetail(pid){const p=projectById(pid);if(!p){$('#projectDetail').innerHTML='';return}const ms=state.members.filter(x=>x.project_id===pid);const lead=ms.find(x=>x.role_in_project==='lead');const phases=state.phaseBudgets.filter(x=>x.project_id===pid);$('#projectDetail').innerHTML=`<div class="grid two-col"><div class="card"><div class="section-title">Project Information</div><div class="form-grid"><div><b>Project / Job Number</b><div>${esc(p.job_number||p.package_no||'—')}</div></div><div><b>Customer</b><div>${esc(p.customer||'—')}</div></div><div><b>Project Manager</b><div>${esc(p.project_manager||'—')}</div></div><div><b>Office</b><div>${esc(p.office||'—')}</div></div><div><b>Current Phase</b><div>${esc(p.current_phase||'—')}</div></div><div><b>Project Lead</b><div>${esc(lead?displayName(lead.user_id):'—')}</div></div><div class="span3"><b>Assigned Team</b><div>${ms.map(m=>esc(displayName(m.user_id))+(m.role_in_project==='lead'?' (Lead)':'')).join(' · ')||'—'}</div></div></div></div><div class="card"><div class="section-title">Hours & Progress</div><div class="form-grid"><div><b>Original Hours</b><div>${fmtH(originalHours(pid))}</div></div><div><b>Approved CO Hours</b><div>${fmtH(approvedHours(pid))}</div></div><div><b>Hours Used</b><div>${fmtH(projectHours(pid))}</div></div><div><b>Remaining</b><div>${fmtH(Math.max(0,originalHours(pid)+approvedHours(pid)-projectHours(pid)))}</div></div><div><b>Status</b><div>${esc(p.status||'Not Started')}</div></div><div><b>Overall Progress</b><div>${num(p.overall_progress).toFixed(0)}%</div></div></div></div></div><div class="card" style="margin-top:12px"><div class="section-title">Progress by Phase</div><div class="table-wrap"><table class="table"><thead><tr><th>Phase</th><th>Estimated Hours</th><th>Hours Used</th><th>Remaining</th></tr></thead><tbody>${phases.map(ph=>{const used=state.tasks.filter(t=>t.project_id===pid&&t.phase===ph.phase).reduce((s,t)=>s+taskHours(t.id),0);return`<tr><td>${esc(ph.phase)}</td><td>${fmtH(ph.estimated_hours)}</td><td>${fmtH(used)}</td><td>${fmtH(Math.max(0,num(ph.estimated_hours)-used))}</td></tr>`}).join('')}</tbody></table></div></div>`}

function renderTasks(){
 const opts=state.projects.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('');$('#page-tasks').innerHTML=`<div class="toolbar"><div class="field"><label>Project</label><select id="taskProject">${opts}</select></div>${roleIsManager()?'<button id="newTask" class="primary">+ New Task</button>':''}</div><div id="taskTable"></div>`;const s=$('#taskProject');s.onchange=()=>renderTaskTable(s.value);if(s.value)renderTaskTable(s.value);if(roleIsManager())$('#newTask').onclick=()=>taskModal(s.value)}
function renderTaskTable(pid){const rows=state.tasks.filter(t=>t.project_id===pid);$('#taskTable').innerHTML=`<div class="table-wrap"><table class="table"><thead><tr><th>Task</th><th>Status</th><th>Phase</th><th>Tracked Hours</th><th>Assignees</th><th>People</th><th>Actions</th></tr></thead><tbody>${rows.map(t=>{const us=state.assignees.filter(a=>a.task_id===t.id).map(a=>displayName(a.user_id));return`<tr><td>${esc(t.name)}</td><td>${esc(t.status||'Ready')}</td><td>${esc(t.phase||'—')}</td><td>${fmtH(taskHours(t.id))} h</td><td>${esc(us.join(', ')||'—')}</td><td>${us.length}</td><td>${roleIsManager()?`<button data-edit-task="${t.id}">Edit</button> <button class="danger" data-del-task="${t.id}">Delete</button>`:''}</td></tr>`}).join('')}</tbody></table></div>`;$$('[data-edit-task]').forEach(b=>b.onclick=()=>taskModal(pid,taskById(b.dataset.editTask)));$$('[data-del-task]').forEach(b=>b.onclick=()=>archiveTask(b.dataset.delTask))}

function renderCO(){const rows=state.changeOrders;$('#page-changeorders').innerHTML=`<div class="toolbar">${roleIsManager()?'<button id="newCO" class="primary">+ New Change Order</button>':''}</div><div class="grid kpis" style="grid-template-columns:repeat(4,1fr)">${[['Requested Hours',rows.reduce((s,x)=>s+num(x.requested_hours),0)],['Approved Hours',rows.filter(x=>String(x.status).toLowerCase()==='approved').reduce((s,x)=>s+num(x.approved_hours??x.requested_hours),0)],['Pending',rows.filter(x=>String(x.status).toLowerCase()==='pending').length],['Change Orders',rows.length]].map(x=>`<div class="kpi"><div class="label">${x[0]}</div><div class="value">${typeof x[1]==='number'?fmtH(x[1]):x[1]}</div></div>`).join('')}</div><div class="table-wrap"><table class="table"><thead><tr><th>CO No.</th><th>Project</th><th>Description</th><th>Requested</th><th>Approved</th><th>Status</th><th>Created</th></tr></thead><tbody>${rows.map(c=>`<tr><td>${esc(c.co_no||'—')}</td><td>${esc(projectById(c.project_id)?.name||'—')}</td><td>${esc(c.description||'')}</td><td>${fmtH(c.requested_hours)}</td><td>${c.approved_hours==null?'—':fmtH(c.approved_hours)}</td><td>${esc(c.status||'Pending')}</td><td>${esc((c.created_at||'').slice(0,10))}</td></tr>`).join('')}</tbody></table></div>`;if(roleIsManager())$('#newCO').onclick=()=>coModal()}

function renderAttendance(){
 const activeNow=Date.now();const leaveToday=state.leaveRequests.filter(l=>String(l.status).toLowerCase()==='approved'&&new Date(l.start_date)<=new Date()&&new Date(l.end_date)>=new Date());
 $('#page-attendance').innerHTML=`<div class="card"><div class="section-title">Live Team</div><div class="table-wrap"><table class="table"><thead><tr><th>Employee</th><th>Employee ID</th><th>Role</th><th>Status</th><th>Project</th><th>Task</th><th>Device</th><th>Last Seen</th></tr></thead><tbody>${state.profiles.map(p=>{const d=state.devices.filter(x=>x.user_id===p.id).sort((a,b)=>new Date(b.last_seen||0)-new Date(a.last_seen||0))[0];const onLeave=leaveToday.some(l=>l.user_id===p.id);const recent=d&&activeNow-new Date(d.last_seen||0).getTime()<5*60*1000;const status=onLeave?'On Leave':!recent?'Absent / Offline':d.is_tracking?'Tracking':'Not Tracking';return`<tr><td>${esc(p.display_name||p.email)}</td><td>${esc(p.employee_id||'—')}</td><td>${esc(p.role||'Employee')}</td><td>${esc(status)}</td><td>${esc(projectById(d?.project_id)?.name||d?.project_name||'No project')}</td><td>${esc(taskById(d?.task_id)?.name||d?.task_name||'No task')}</td><td>${esc(d?.device_name||'—')}</td><td>${d?.last_seen?new Date(d.last_seen).toLocaleString():'—'}</td></tr>`}).join('')}</tbody></table></div></div><div class="card" style="margin-top:12px"><div class="section-title">Leave Requests</div><div class="table-wrap"><table class="table"><thead><tr><th>Employee</th><th>Type</th><th>Start</th><th>End</th><th>Portion</th><th>Reason</th><th>Status</th></tr></thead><tbody>${state.leaveRequests.map(l=>`<tr><td>${esc(displayName(l.user_id))}</td><td>${esc(l.leave_type||'')}</td><td>${esc(l.start_date||'')}</td><td>${esc(l.end_date||'')}</td><td>${esc(l.portion||'')}</td><td>${esc(l.reason||'')}</td><td>${esc(l.status||'Pending')}</td></tr>`).join('')}</tbody></table></div></div>`}

function employeeUsedLeave(userId){
  const year=new Date().getFullYear();
  return state.leaveRequests.filter(l=>l.user_id===userId&&String(l.status).toLowerCase()==='approved'&&String(l.leave_type||'').toLowerCase().includes('annual')&&new Date(l.start_date).getFullYear()===year).reduce((sum,l)=>{
    if(String(l.portion||'').toLowerCase().includes('half')) return sum+0.5;
    const a=new Date(l.start_date),b=new Date(l.end_date);
    if(!Number.isFinite(a.getTime())||!Number.isFinite(b.getTime())) return sum;
    let days=0,d=new Date(a.getFullYear(),a.getMonth(),a.getDate());
    const end=new Date(b.getFullYear(),b.getMonth(),b.getDate());
    while(d<=end){const wd=d.getDay();if(wd!==0&&wd!==6)days++;d.setDate(d.getDate()+1)}
    return sum+Math.max(1,days);
  },0);
}

function renderEmployees(){
  if(!roleIsAdmin()){ $('#page-employees').innerHTML='<div class="card"><b>Admin access required.</b></div>'; return; }
  const rows=[...state.profiles].sort((a,b)=>String(a.display_name||a.email||'').localeCompare(String(b.display_name||b.email||'')));
  $('#page-employees').innerHTML=`<div class="toolbar employee-toolbar"><button id="newEmployee" class="primary">+ New Employee</button><div class="field grow"><label>Search</label><input id="employeeSearch" placeholder="Search employee, ID or email..."></div></div>
  <div class="grid employee-kpis"><div class="kpi"><div class="label">Employees</div><div class="value">${rows.length}</div></div><div class="kpi"><div class="label">Active</div><div class="value">${rows.filter(x=>x.active!==false).length}</div></div><div class="kpi"><div class="label">Admins</div><div class="value">${rows.filter(x=>x.role==='Admin').length}</div></div><div class="kpi"><div class="label">Managers</div><div class="value">${rows.filter(x=>x.role==='Manager').length}</div></div></div>
  <div class="table-wrap"><table class="table" id="employeeTable"><thead><tr><th>Employee</th><th>Employee ID</th><th>Email</th><th>Role</th><th>Annual Leave</th><th>Used</th><th>Remaining</th><th>Status</th><th>Actions</th></tr></thead><tbody>${rows.map(p=>{const entitlement=num(p.annual_leave_days),used=employeeUsedLeave(p.id),remaining=Math.max(0,entitlement-used);return `<tr data-employee-row data-search="${esc([p.display_name,p.employee_id,p.email,p.role].join(' ').toLowerCase())}"><td><b>${esc(p.display_name||p.email||'—')}</b></td><td>${esc(p.employee_id||'—')}</td><td>${esc(p.email||'—')}</td><td>${esc(p.role||'Employee')}</td><td>${fmtH(entitlement)}</td><td>${fmtH(used)}</td><td>${fmtH(remaining)}</td><td><span class="status ${p.active===false?'bad':'good'}">${p.active===false?'Inactive':'Active'}</span></td><td><button data-edit-employee="${p.id}">Edit</button> <button class="${p.active===false?'success':'danger'}" data-toggle-employee="${p.id}">${p.active===false?'Activate':'Deactivate'}</button></td></tr>`}).join('')}</tbody></table></div>
  <div class="muted small" style="margin-top:10px">Employee accounts use Supabase Auth. Deactivate keeps historical projects, tasks and time entries.</div>`;
  $('#newEmployee').onclick=()=>employeeModal();
  $('#employeeSearch').oninput=e=>{const q=e.target.value.trim().toLowerCase();$$('[data-employee-row]').forEach(r=>r.classList.toggle('hidden',q&&!r.dataset.search.includes(q)))};
  $$('[data-edit-employee]').forEach(b=>b.onclick=()=>employeeModal(state.profiles.find(p=>p.id===b.dataset.editEmployee)));
  $$('[data-toggle-employee]').forEach(b=>b.onclick=()=>toggleEmployee(b.dataset.toggleEmployee));
}

async function createAuthEmployee(email,password,metadata){
  const temp=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  const {data,error}=await temp.auth.signUp({email,password,options:{data:metadata}});
  try{await temp.auth.signOut()}catch{}
  if(error)throw error;
  return data.user;
}

function employeeModal(p=null){
  const editing=!!p;
  modal(editing?'Edit Employee':'New Employee',`<div class="form-grid">
    <div class="field"><label>Display Name</label><input id="eName" value="${esc(p?.display_name||'')}"></div>
    <div class="field"><label>Employee ID</label><input id="eEmployeeId" value="${esc(p?.employee_id||'')}"></div>
    <div class="field"><label>Email</label><input id="eEmail" type="email" value="${esc(p?.email||'')}" ${editing?'readonly':''}></div>
    <div class="field"><label>Role</label><select id="eRole">${['Employee','Manager','Admin'].map(r=>`<option ${p?.role===r?'selected':''}>${r}</option>`).join('')}</select></div>
    <div class="field"><label>Annual Leave Days</label><input id="eLeave" type="number" min="0" step="0.5" value="${num(p?.annual_leave_days)}"></div>
    ${editing?'':`<div class="field"><label>Temporary Password</label><input id="ePassword" type="password" minlength="6" placeholder="Minimum 6 characters"></div>`}
    <div class="field span3"><label><input id="eActive" type="checkbox" ${p?.active===false?'':'checked'}> Active employee</label></div>
  </div>`,async()=>{
    const display_name=$('#eName').value.trim(),employee_id=$('#eEmployeeId').value.trim(),email=$('#eEmail').value.trim().toLowerCase(),role=$('#eRole').value,annual_leave_days=num($('#eLeave').value),active=$('#eActive').checked;
    if(!display_name||!employee_id||!email)return alert('Display Name, Employee ID and Email are required.');
    let userId=p?.id;
    if(!editing){const password=$('#ePassword').value;if(password.length<6)return alert('Temporary password must be at least 6 characters.');try{const user=await createAuthEmployee(email,password,{display_name,employee_id});if(!user?.id)return alert('Account was not created. Check Supabase Auth settings.');userId=user.id}catch(e){return alert(e.message||String(e))}
      for(let i=0;i<8;i++){const {data}=await supabase.from('profiles').select('id').eq('id',userId).maybeSingle();if(data)break;await new Promise(r=>setTimeout(r,250))}
    }
    const row={display_name,employee_id,email,role,annual_leave_days,active};
    const {error}=await supabase.from('profiles').update(row).eq('id',userId);
    if(error)return alert(error.message);closeModal();await loadAll();
  });
}

async function toggleEmployee(id){
  const p=state.profiles.find(x=>x.id===id);if(!p)return;if(id===state.profile?.id&&p.active!==false)return alert('You cannot deactivate your own account from this page.');
  const next=p.active===false;if(!confirm(`${next?'Activate':'Deactivate'} ${p.display_name||p.email}?`))return;
  const {error}=await supabase.from('profiles').update({active:next}).eq('id',id);if(error)alert(error.message);else loadAll();
}

function modal(title,html,onSave){$('#modal').innerHTML=`<h3>${esc(title)}</h3>${html}<div class="modal-actions"><button id="modalCancel">Cancel</button><button id="modalSave" class="primary">Save</button></div>`;$('#modalBackdrop').classList.remove('hidden');$('#modalCancel').onclick=closeModal;$('#modalSave').onclick=onSave}
function closeModal(){$('#modalBackdrop').classList.add('hidden')}

function projectModal(p=null){modal(p?'Edit Project':'New Project',`<div class="form-grid"><div class="field"><label>Project Name</label><input id="mName" value="${esc(p?.name||'')}"></div><div class="field"><label>Customer</label><input id="mCustomer" value="${esc(p?.customer||'')}"></div><div class="field"><label>Project Manager</label><input id="mPM" value="${esc(p?.project_manager||'')}"></div><div class="field"><label>Office</label><input id="mOffice" value="${esc(p?.office||'')}"></div><div class="field"><label>Current Phase</label><input id="mPhase" value="${esc(p?.current_phase||'')}"></div><div class="field"><label>Status</label><select id="mStatus">${['Not Started','On Track','At Risk','Over Hours','On Hold','Completed'].map(s=>`<option ${p?.status===s?'selected':''}>${s}</option>`).join('')}</select></div></div>`,async()=>{const row={name:$('#mName').value.trim(),customer:$('#mCustomer').value.trim(),project_manager:$('#mPM').value.trim(),office:$('#mOffice').value.trim(),current_phase:$('#mPhase').value.trim(),status:$('#mStatus').value,active:true};let error;if(p)({error}=await supabase.from('projects').update(row).eq('id',p.id));else({error}=await supabase.from('projects').insert(row));if(error)return alert(error.message);closeModal();await loadAll()})}
async function archiveProject(id){if(!confirm('Archive this project?'))return;const {error}=await supabase.from('projects').update({active:false}).eq('id',id);if(error)alert(error.message);else loadAll()}

function taskModal(pid,t=null){const phases=state.phaseBudgets.filter(x=>x.project_id===pid);const projectMembers=state.members.filter(x=>x.project_id===pid);const selected=state.assignees.filter(a=>a.task_id===t?.id).map(a=>a.user_id);modal(t?'Edit Task':'New Task',`<div class="form-grid"><div class="field"><label>Task Name</label><input id="tName" value="${esc(t?.name||'')}"></div><div class="field"><label>Status</label><select id="tStatus">${['Ready','In Progress','On Hold','Done'].map(s=>`<option ${t?.status===s?'selected':''}>${s}</option>`).join('')}</select></div><div class="field"><label>Phase</label><select id="tPhase"><option value="">No phase</option>${phases.map(ph=>`<option ${t?.phase===ph.phase?'selected':''}>${esc(ph.phase)}</option>`).join('')}</select></div><div class="span3"><b>Assignees</b>${projectMembers.map(m=>`<label style="display:block;margin:6px 0"><input type="checkbox" class="asg" value="${m.user_id}" ${selected.includes(m.user_id)?'checked':''}> ${esc(displayName(m.user_id))}</label>`).join('')||'<div class="muted">No project members</div>'}</div></div>`,async()=>{const row={project_id:pid,name:$('#tName').value.trim(),status:$('#tStatus').value,phase:$('#tPhase').value||null,active:true};let taskId=t?.id,error;if(t)({error}=await supabase.from('tasks').update(row).eq('id',t.id));else{const r=await supabase.from('tasks').insert(row).select('id').single();error=r.error;taskId=r.data?.id}if(error)return alert(error.message);if(taskId){await supabase.from('task_assignees').delete().eq('task_id',taskId);const ids=$$('.asg:checked').map(x=>x.value);if(ids.length){const r=await supabase.from('task_assignees').insert(ids.map(user_id=>({task_id:taskId,user_id})));if(r.error)alert(r.error.message)}}closeModal();await loadAll()})}
async function archiveTask(id){if(!confirm('Delete this task? Tracking history will be kept.'))return;const {error}=await supabase.from('tasks').update({active:false}).eq('id',id);if(error)alert(error.message);else loadAll()}

function coModal(){modal('New Change Order',`<div class="form-grid"><div class="field"><label>Project</label><select id="coProject">${state.projects.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select></div><div class="field"><label>CO No.</label><input id="coNo"></div><div class="field"><label>Requested Hours</label><input id="coHours" type="number" step="0.25" min="0"></div><div class="field span3"><label>Description</label><textarea id="coDesc" rows="3"></textarea></div></div>`,async()=>{const row={project_id:$('#coProject').value,co_no:$('#coNo').value.trim(),requested_hours:num($('#coHours').value),description:$('#coDesc').value.trim(),status:'Pending'};const {error}=await supabase.from('change_orders').insert(row);if(error)return alert(error.message);closeModal();loadAll()})}

supabase.auth.getSession().then(async({data})=>{if(data.session?.user)showMain(await getProfile(data.session.user))});
