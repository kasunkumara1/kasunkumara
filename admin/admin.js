const API_ROOT = "https://api.github.com";
const DATA_PATHS = { projects: "data/projects.json", categories: "data/categories.json", site: "data/site.json" };
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const state = { repo: null, token: "", projects: [], categories: [], site: {}, shas: {}, currentView: "dashboard", editingProject: null };

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function toast(message, type = "ok") {
  const el = $("#toast");
  el.textContent = message;
  el.className = `toast show${type === "error" ? " error" : ""}`;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.className = "toast", 3600);
}
function slugify(value) { return String(value || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70); }
function safeFilename(name) { const parts = name.split("."); const ext = parts.length > 1 ? `.${parts.pop().toLowerCase().replace(/[^a-z0-9]/g, "")}` : ""; return `${slugify(parts.join("-")) || "media"}${ext}`; }
function encodeUtf8Base64(text) { const bytes = new TextEncoder().encode(text); let binary = ""; for (let i=0;i<bytes.length;i+=0x8000) binary += String.fromCharCode(...bytes.subarray(i,i+0x8000)); return btoa(binary); }
function decodeUtf8Base64(base64) { const clean = base64.replace(/\n/g, ""); const binary = atob(clean); const bytes = Uint8Array.from(binary, c => c.charCodeAt(0)); return new TextDecoder().decode(bytes); }
function fileToBase64(file) { return new Promise((resolve,reject)=>{ const r=new FileReader(); r.onload=()=>resolve(String(r.result).split(",")[1]); r.onerror=reject; r.readAsDataURL(file); }); }
function repoStorage() { try { return JSON.parse(localStorage.getItem("gk-cms-repo") || "null"); } catch { return null; } }
function inferRepo() {
  const host = location.hostname;
  if (!host.endsWith(".github.io")) return null;
  const owner = host.replace(/\.github\.io$/, "");
  const parts = location.pathname.split("/").filter(Boolean);
  const repo = parts.length && parts[0] !== "admin" ? parts[0] : `${owner}.github.io`;
  return { owner, repo, branch: "main" };
}
function saveRepoSettings(repo) { localStorage.setItem("gk-cms-repo", JSON.stringify(repo)); }
function tokenFromSession() { return sessionStorage.getItem("gk-cms-token") || ""; }
function setToken(token) { state.token = token; if (token) sessionStorage.setItem("gk-cms-token", token); else sessionStorage.removeItem("gk-cms-token"); }

async function api(path, options = {}) {
  if (!state.token) throw new Error("GitHub token is not connected.");
  const response = await fetch(`${API_ROOT}${path}`, {
    ...options,
    headers: { "Accept":"application/vnd.github+json", "Authorization":`Bearer ${state.token}`, "X-GitHub-Api-Version":"2022-11-28", ...(options.headers || {}) }
  });
  let payload = null;
  const text = await response.text();
  if (text) { try { payload = JSON.parse(text); } catch { payload = text; } }
  if (!response.ok) {
    const detail = payload?.message || `${response.status} ${response.statusText}`;
    throw new Error(detail);
  }
  return payload;
}
function repoPath(path) { const { owner, repo } = state.repo; return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path.split("/").map(encodeURIComponent).join("/")}`; }
async function getRepoFile(path) {
  const data = await api(`${repoPath(path)}?ref=${encodeURIComponent(state.repo.branch)}`);
  return { data: JSON.parse(decodeUtf8Base64(data.content)), sha: data.sha };
}
async function putBase64(path, base64, message, sha = null) {
  const body = { message, content: base64, branch: state.repo.branch };
  if (sha) body.sha = sha;
  return api(repoPath(path), { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body) });
}
async function saveJson(path, value, sha, message) {
  const result = await putBase64(path, encodeUtf8Base64(`${JSON.stringify(value, null, 2)}\n`), message, sha);
  return result.content?.sha || result.commit?.sha || sha;
}
async function getRawFileMeta(path) { return api(`${repoPath(path)}?ref=${encodeURIComponent(state.repo.branch)}`); }
async function deleteRepoFile(path, sha, message) { return api(repoPath(path), { method:"DELETE", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ message, sha, branch:state.repo.branch }) }); }

async function connectAndLoad(repo, token) {
  state.repo = repo;
  setToken(token);
  await api(`/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.repo)}`);
  saveRepoSettings(repo);
  await loadCmsData();
  $("#connect-modal").classList.remove("open");
  $("#connect-modal").setAttribute("aria-hidden","true");
  $("#connection-led").classList.add("online");
  $("#connection-label").textContent = `${repo.owner}/${repo.repo}`;
  renderAll();
  toast("GitHub portfolio connected.");
}
async function loadCmsData() {
  const entries = await Promise.all(Object.entries(DATA_PATHS).map(async ([key,path]) => {
    const result = await getRepoFile(path);
    return [key, result];
  }));
  entries.forEach(([key, result]) => { state[key] = result.data; state.shas[key] = result.sha; });
}
function showConnect() {
  const saved = repoStorage() || inferRepo() || { owner:"", repo:"", branch:"main" };
  $("#repo-owner").value = saved.owner || "";
  $("#repo-name").value = saved.repo || "";
  $("#repo-branch").value = saved.branch || "main";
  $("#repo-token").value = tokenFromSession();
  $("#connect-modal").classList.add("open");
  $("#connect-modal").setAttribute("aria-hidden","false");
}
function disconnect() {
  setToken("");
  state.repo = null;
  $("#connection-led").classList.remove("online");
  $("#connection-label").textContent = "Not connected";
  showConnect();
  toast("Disconnected. Token cleared from this session.");
}

function setView(name) {
  state.currentView = name;
  $$(".view").forEach(view => view.classList.toggle("active", view.id === `view-${name}`));
  $$(".side-link").forEach(btn => btn.classList.toggle("active", btn.dataset.view === name));
  const labels = { dashboard:"Dashboard", projects:"Projects", categories:"Categories", settings:"Site Settings", backup:"Backup", guide:"Setup Guide" };
  $("#view-title").textContent = labels[name] || name;
  if (name === "projects") renderProjects();
  if (name === "categories") renderCategories();
  if (name === "settings") populateSiteForm();
}
function categoryLabel(id) { return state.categories.find(c => c.id === id)?.label || id || "Uncategorized"; }
function publicMediaUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  const root = location.pathname.includes("/admin/") ? "../" : "";
  return `${root}${path.replace(/^\/+/,"")}`;
}
function renderDashboard() {
  $("#stat-projects").textContent = state.projects.length;
  $("#stat-published").textContent = state.projects.filter(p => p.published !== false).length;
  $("#stat-categories").textContent = state.categories.length;
  $("#stat-featured").textContent = state.projects.filter(p => p.featured).length;
  const recent = [...state.projects].sort((a,b)=>(b.updatedAt || b.createdAt || "").localeCompare(a.updatedAt || a.createdAt || "")).slice(0,5);
  const wrap = $("#recent-projects"); wrap.replaceChildren();
  if (!recent.length) { wrap.innerHTML = '<div class="mini-project"><span>No projects yet.</span></div>'; return; }
  recent.forEach(project => {
    const row = document.createElement("div"); row.className="mini-project";
    const media = document.createElement(project.mediaType === "video" ? "video" : "img"); media.className="mini-thumb"; if (project.media) media.src=publicMediaUrl(project.media);
    const info=document.createElement("div"); const title=document.createElement("strong"); title.textContent=project.title; const meta=document.createElement("span"); meta.textContent=categoryLabel(project.category); info.append(title,meta);
    const status=document.createElement("em"); status.className=`status-pill${project.published===false?" draft":""}`; status.textContent=project.published===false?"DRAFT":"LIVE";
    row.append(media,info,status); wrap.appendChild(row);
  });
}
function renderProjectFilters() {
  const select=$("#project-filter"); const value=select.value; select.innerHTML='<option value="all">All categories</option>';
  state.categories.sort((a,b)=>(a.order||0)-(b.order||0)).forEach(c=>{ const o=document.createElement("option");o.value=c.id;o.textContent=c.label;select.appendChild(o); });
  if ([...select.options].some(o=>o.value===value)) select.value=value;
}
function filteredProjects() {
  const q=$("#project-search").value.trim().toLowerCase(); const cat=$("#project-filter").value; const status=$("#status-filter").value;
  return [...state.projects].sort((a,b)=>(a.order||999)-(b.order||999)).filter(p=>{
    const qok=!q||`${p.title} ${p.description} ${(p.tags||[]).join(" ")}`.toLowerCase().includes(q);
    const cok=cat==="all"||p.category===cat;
    const sok=status==="all"||(status==="published"&&p.published!==false)||(status==="draft"&&p.published===false)||(status==="featured"&&p.featured);
    return qok&&cok&&sok;
  });
}
function renderProjects() {
  renderProjectFilters();
  const list=$("#project-list"); list.replaceChildren(); const projects=filteredProjects();
  if (!projects.length) { list.innerHTML='<div class="panel form-card"><h2>No matching projects</h2><p>Add a project or change your filters.</p></div>'; return; }
  projects.forEach(project=>{
    const row=document.createElement("article"); row.className="project-row";
    const thumb=document.createElement("div");thumb.className="project-thumb";
    if(project.media){const media=document.createElement(project.mediaType==="video"?"video":"img");media.src=publicMediaUrl(project.media);media.muted=true;thumb.appendChild(media)} else thumb.textContent="NO MEDIA";
    const info=document.createElement("div");info.className="project-info"; const strong=document.createElement("strong");strong.textContent=project.title; const desc=document.createElement("span");desc.textContent=project.description||"";info.append(strong,desc);
    const cat=document.createElement("div");cat.className="project-category";cat.textContent=categoryLabel(project.category);
    const order=document.createElement("div");order.className="project-order";order.textContent=`Order ${project.order ?? "—"}`;
    const actions=document.createElement("div");actions.className="row-actions";
    const status=document.createElement("button");status.className="icon-button";status.textContent=project.published===false?"Publish":"Unpublish";status.onclick=()=>quickToggle(project.id,"published");
    const feature=document.createElement("button");feature.className="icon-button";feature.textContent=project.featured?"Unfeature":"Feature";feature.onclick=()=>quickToggle(project.id,"featured");
    const edit=document.createElement("button");edit.className="icon-button";edit.textContent="Edit";edit.onclick=()=>openProjectModal(project);
    const del=document.createElement("button");del.className="icon-button delete";del.textContent="Delete";del.onclick=()=>deleteProject(project);
    actions.append(status,feature,edit,del);row.append(thumb,info,cat,order,actions);list.appendChild(row);
  });
}
async function persistProjects(message="admin: update portfolio projects") { state.shas.projects=await saveJson(DATA_PATHS.projects,state.projects,state.shas.projects,message); renderAll(); }
async function quickToggle(id,field) {
  const p=state.projects.find(p=>p.id===id); if(!p)return; p[field]=!p[field]; p.updatedAt=new Date().toISOString();
  try{await persistProjects(`admin: ${p[field]?"enable":"disable"} ${field} for ${p.title}`);toast(`${field} updated.`)}catch(e){p[field]=!p[field];toast(e.message,"error")}
}
function populateProjectCategorySelect(select, value="") { select.replaceChildren(); state.categories.sort((a,b)=>(a.order||0)-(b.order||0)).forEach(c=>{const o=document.createElement("option");o.value=c.id;o.textContent=c.label;select.appendChild(o)}); if(value) select.value=value; }
function openProjectModal(project=null) {
  if(!state.token){showConnect();return}
  state.editingProject=project;
  const form=$("#project-form");form.reset();
  $("#project-modal-title").textContent=project?"Edit Project":"Add New Project";
  form.elements.editingId.value=project?.id||"";
  form.elements.title.value=project?.title||""; form.elements.id.value=project?.id||""; form.elements.id.disabled=Boolean(project); if (!project) delete form.elements.id.dataset.edited;
  populateProjectCategorySelect(form.elements.category,project?.category||state.categories[0]?.id||"");
  form.elements.description.value=project?.description||""; form.elements.tags.value=(project?.tags||[]).join(", ");
  form.elements.client.value=project?.client||"";form.elements.year.value=project?.year||new Date().getFullYear();form.elements.role.value=project?.role||"";form.elements.tools.value=project?.tools||"";form.elements.externalUrl.value=project?.externalUrl||"";
  form.elements.media.value=project?.media||"";form.elements.layout.value=project?.layout||"standard";form.elements.order.value=project?.order??state.projects.length+1;form.elements.published.checked=project?.published!==false;form.elements.featured.checked=Boolean(project?.featured);
  $("#media-file").value=""; renderUploadPreview(project?.media||"",project?.mediaType||"image");
  $("#project-modal").classList.add("open");$("#project-modal").setAttribute("aria-hidden","false");
}
function closeProjectModal(){ $("#project-modal").classList.remove("open");$("#project-modal").setAttribute("aria-hidden","true");state.editingProject=null;$("#project-form").elements.id.disabled=false; }
function renderUploadPreview(source="", type="image", file=null){ const wrap=$("#upload-preview");wrap.replaceChildren(); if(source||file){ const media=document.createElement(type==="video"?"video":"img"); media.controls=type==="video"; media.muted=type==="video"; media.src=file?URL.createObjectURL(file):publicMediaUrl(source); wrap.appendChild(media); return; } wrap.innerHTML='<b>＋</b><strong>Drop project media</strong><span>JPG, PNG, WEBP, GIF, MP4, WEBM, MOV<br />Recommended under 25 MB</span>'; }
async function uploadProjectMedia(file, projectId) {
  if(file.size>MAX_UPLOAD_BYTES) throw new Error("This CMS limits direct uploads to 25 MB. Compress the media or use an external video link.");
  const extName=safeFilename(file.name); const path=`assets/projects/${slugify(projectId)}/${Date.now()}-${extName}`;
  const base64=await fileToBase64(file); await putBase64(path,base64,`admin: upload media for ${projectId}`);
  return { media:path, mediaType:file.type.startsWith("video/")?"video":"image" };
}
async function saveProjectFromForm(event){
  event.preventDefault(); const form=event.currentTarget; const button=$("#save-project");button.disabled=true;button.textContent="Saving…";
  try{
    const editingId=form.elements.editingId.value; const id=editingId||slugify(form.elements.id.value||form.elements.title.value); if(!id)throw new Error("Project ID is required.");
    if(!editingId&&state.projects.some(p=>p.id===id))throw new Error("A project with this ID already exists.");
    let media=form.elements.media.value.trim(); let mediaType=state.editingProject?.mediaType||"image"; const file=$("#media-file").files[0];
    if(file){const uploaded=await uploadProjectMedia(file,id);media=uploaded.media;mediaType=uploaded.mediaType;}
    else if(media&&/\.(mp4|webm|mov)(\?|$)/i.test(media))mediaType="video"; else if(media)mediaType="image";
    const existing=state.projects.find(p=>p.id===editingId);
    const project={...(existing||{}),id,title:form.elements.title.value.trim(),category:form.elements.category.value,description:form.elements.description.value.trim(),tags:form.elements.tags.value.split(",").map(v=>v.trim()).filter(Boolean),media,mediaType,layout:form.elements.layout.value,published:form.elements.published.checked,featured:form.elements.featured.checked,client:form.elements.client.value.trim(),year:form.elements.year.value.trim(),role:form.elements.role.value.trim(),tools:form.elements.tools.value.trim(),externalUrl:form.elements.externalUrl.value.trim(),order:Number(form.elements.order.value)||0,updatedAt:new Date().toISOString(),createdAt:existing?.createdAt||new Date().toISOString()};
    if(existing)Object.assign(existing,project);else state.projects.push(project);
    await persistProjects(`admin: ${existing?"update":"add"} project ${project.title}`);closeProjectModal();toast(`Project ${existing?"updated":"created"}. GitHub Pages will publish the commit.`);
  }catch(e){toast(e.message,"error")}finally{button.disabled=false;button.textContent="Save Project"}
}
async function deleteProject(project){
  if(!confirm(`Delete “${project.title}” from the portfolio?`))return;
  const original=[...state.projects];state.projects=state.projects.filter(p=>p.id!==project.id);
  try{
    await persistProjects(`admin: delete project ${project.title}`);
    if(project.media&&project.media.startsWith("assets/projects/")&&confirm("Also delete this project's uploaded media file from the repository?")){
      try{const meta=await getRawFileMeta(project.media);await deleteRepoFile(project.media,meta.sha,`admin: delete media for ${project.title}`)}catch(e){toast(`Project deleted, but media cleanup failed: ${e.message}`,"error");return}
    }
    toast("Project deleted.");
  }catch(e){state.projects=original;renderAll();toast(e.message,"error")}
}

function renderCategories(){
  const wrap=$("#category-list");wrap.replaceChildren();
  state.categories.sort((a,b)=>(a.order||0)-(b.order||0)).forEach(c=>{
    const row=document.createElement("div");row.className="category-row";const info=document.createElement("div");const strong=document.createElement("strong");strong.textContent=c.label;const small=document.createElement("small");small.textContent=`${c.id} · ${state.projects.filter(p=>p.category===c.id).length} projects`;info.append(strong,small);
    const label=document.createElement("input");label.value=c.label;label.setAttribute("aria-label",`Rename ${c.label}`);label.onchange=()=>renameCategory(c.id,label.value);
    const del=document.createElement("button");del.className="icon-button delete";del.textContent="Delete";del.onclick=()=>deleteCategory(c.id);row.append(info,label,del);wrap.appendChild(row);
  });
}
async function persistCategories(message="admin: update categories"){state.shas.categories=await saveJson(DATA_PATHS.categories,state.categories,state.shas.categories,message);renderAll()}
async function addCategory(event){event.preventDefault();const label=$("#category-name").value.trim();const id=slugify($("#category-id").value||label);if(!id||!label)return;if(state.categories.some(c=>c.id===id)){toast("That category ID already exists.","error");return}state.categories.push({id,label,order:state.categories.length+1});try{await persistCategories(`admin: add category ${label}`);event.target.reset();toast("Category added.")}catch(e){state.categories=state.categories.filter(c=>c.id!==id);toast(e.message,"error")}}
async function renameCategory(id,label){const c=state.categories.find(c=>c.id===id);const old=c.label;c.label=label.trim()||old;try{await persistCategories(`admin: rename category ${id}`);toast("Category renamed.")}catch(e){c.label=old;renderCategories();toast(e.message,"error")}}
async function deleteCategory(id){const c=state.categories.find(c=>c.id===id);const used=state.projects.some(p=>p.category===id);if(used){toast("Move or delete projects in this category first.","error");return}if(!confirm(`Delete category “${c.label}”?`))return;const old=[...state.categories];state.categories=state.categories.filter(x=>x.id!==id);try{await persistCategories(`admin: delete category ${c.label}`);toast("Category deleted.")}catch(e){state.categories=old;renderCategories();toast(e.message,"error")}}

function populateSiteForm(){const form=$("#site-form");["availability","email","location","linkedin","fiverr","resume"].forEach(k=>form.elements[k].value=state.site[k]||"")}
async function saveSite(event){event.preventDefault();const form=event.currentTarget;const old={...state.site};["availability","email","location","linkedin","fiverr","resume"].forEach(k=>state.site[k]=form.elements[k].value.trim());try{state.shas.site=await saveJson(DATA_PATHS.site,state.site,state.shas.site,"admin: update public site settings");toast("Site settings saved.")}catch(e){state.site=old;toast(e.message,"error")}}
function exportBackup(){const blob=new Blob([JSON.stringify({version:1,exportedAt:new Date().toISOString(),projects:state.projects,categories:state.categories,site:state.site},null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`gk-portfolio-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href);toast("Backup downloaded.")}
async function importBackup(){const file=$("#import-file").files[0];if(!file){toast("Choose a backup JSON file first.","error");return}if(!confirm("Restore this backup? Current CMS data will be replaced."))return;try{const data=JSON.parse(await file.text());if(!Array.isArray(data.projects)||!Array.isArray(data.categories)||typeof data.site!=="object")throw new Error("Invalid backup format.");state.projects=data.projects;state.categories=data.categories;state.site=data.site;state.shas.projects=await saveJson(DATA_PATHS.projects,state.projects,state.shas.projects,"admin: restore projects backup");state.shas.categories=await saveJson(DATA_PATHS.categories,state.categories,state.shas.categories,"admin: restore categories backup");state.shas.site=await saveJson(DATA_PATHS.site,state.site,state.shas.site,"admin: restore site settings backup");renderAll();toast("Backup restored.")}catch(e){toast(e.message,"error")}}
function renderAll(){renderDashboard();renderProjectFilters();renderProjects();renderCategories();populateSiteForm()}

$("#connect-form").addEventListener("submit",async event=>{event.preventDefault();const btn=$("#connect-submit");btn.disabled=true;btn.textContent="Connecting…";try{await connectAndLoad({owner:$("#repo-owner").value.trim(),repo:$("#repo-name").value.trim(),branch:$("#repo-branch").value.trim()||"main"},$("#repo-token").value.trim())}catch(e){setToken("");toast(`Connection failed: ${e.message}`,"error")}finally{btn.disabled=false;btn.textContent="Connect & Load Portfolio"}});
$("#disconnect-btn").addEventListener("click",disconnect);
$$(".side-link").forEach(btn=>btn.addEventListener("click",()=>setView(btn.dataset.view)));
$$('[data-go]').forEach(btn=>btn.addEventListener("click",()=>setView(btn.dataset.go)));
$("#quick-add").addEventListener("click",()=>openProjectModal());$("#add-project-btn").addEventListener("click",()=>openProjectModal());
$("#close-project-modal").addEventListener("click",closeProjectModal);$("#cancel-project").addEventListener("click",closeProjectModal);$("#project-form").addEventListener("submit",saveProjectFromForm);
$("#project-search").addEventListener("input",renderProjects);$("#project-filter").addEventListener("change",renderProjects);$("#status-filter").addEventListener("change",renderProjects);
$("#category-form").addEventListener("submit",addCategory);$("#category-name").addEventListener("input",event=>{if(!$("#category-id").dataset.edited)$("#category-id").value=slugify(event.target.value)});$("#category-id").addEventListener("input",()=>$("#category-id").dataset.edited="1");
$("#site-form").addEventListener("submit",saveSite);$("#export-backup").addEventListener("click",exportBackup);$("#import-backup").addEventListener("click",importBackup);
const fileInput=$("#media-file"), uploadBox=$("#upload-box");fileInput.addEventListener("change",()=>{const file=fileInput.files[0];if(file)renderUploadPreview("",file.type.startsWith("video/")?"video":"image",file)});["dragenter","dragover"].forEach(type=>uploadBox.addEventListener(type,e=>{e.preventDefault();uploadBox.classList.add("drag")}));["dragleave","drop"].forEach(type=>uploadBox.addEventListener(type,e=>{e.preventDefault();uploadBox.classList.remove("drag")}));uploadBox.addEventListener("drop",e=>{const file=e.dataTransfer.files[0];if(file){const dt=new DataTransfer();dt.items.add(file);fileInput.files=dt.files;renderUploadPreview("",file.type.startsWith("video/")?"video":"image",file)}});
$("#project-form").elements.title.addEventListener("input",e=>{const id=$("#project-form").elements.id;if(!state.editingProject&&!id.dataset.edited)id.value=slugify(e.target.value)});$("#project-form").elements.id.addEventListener("input",e=>e.target.dataset.edited="1");
$("#project-modal").addEventListener("click",e=>{if(e.target.id==="project-modal")closeProjectModal()});document.addEventListener("keydown",e=>{if(e.key==="Escape"&&$("#project-modal").classList.contains("open"))closeProjectModal()});

(async function boot(){
  const repo=repoStorage()||inferRepo();const token=tokenFromSession();
  if(repo&&token){try{await connectAndLoad(repo,token);return}catch(e){setToken("");toast(`Reconnect required: ${e.message}`,"error")}}
  showConnect();
})();
