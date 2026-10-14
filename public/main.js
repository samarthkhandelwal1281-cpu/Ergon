const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

const sampleTranscript = [
  "Aman: Okay team, Avartan registrations open next month. Sponsor list pe kaam karna hai.",
  "Riya: I'll look into the sponsor list, maybe we can reach out to a few companies.",
  "Karan: Poster design kaun karega?",
  "Sneha: I'll do the posters, will share the first draft by Friday.",
  "Aman: Great. Someone should also update the website with the event schedule.",
  "Karan: Haan, dekhte hain. Let's see what time we get.",
  "Riya: Also we need to talk to the college about the auditorium booking, soon.",
  "Aman: Karan, please confirm the auditorium booking with the dean's office by Thursday 5 PM.",
  "Karan: Done, I will do that.",
  "Sneha: And someone needs to send the reminder mail to all volunteers.",
  "Aman: Okay, let's wrap up. Thanks everyone."
].join("\n");

const sampleCommitments = [
  {id:"sponsor-outreach",speaker:"Riya",quote:"I'll look into the sponsor list, maybe we can reach out to a few companies.",title:"Sponsor list outreach",owner:"Riya",deadline:"",deliverable:"Sponsor list outreach",hedges:["look into","maybe"],conditional:false,score:50,label:"vague",status:"pending",sample:true},
  {id:"poster-draft",speaker:"Sneha",quote:"I'll do the posters, will share the first draft by Friday.",title:"Poster design first draft",owner:"Sneha",deadline:"Friday",deliverable:"Poster design first draft",hedges:[],conditional:false,score:0,label:"clear",status:"pending",sample:true},
  {id:"website-schedule",speaker:"Aman",quote:"Someone should also update the website with the event schedule.",title:"Website event schedule update",owner:"",deadline:"",deliverable:"Website event schedule update",hedges:[],conditional:false,score:60,label:"vague",status:"pending",sample:true},
  {id:"auditorium-booking",speaker:"Aman",quote:"Karan, please confirm the auditorium booking with the dean's office by Thursday 5 PM.",title:"Auditorium booking confirmation",owner:"Karan",deadline:"Thursday 5 PM",deliverable:"Auditorium booking confirmation",hedges:[],conditional:false,score:0,label:"clear",status:"pending",sample:true},
  {id:"volunteer-reminder",speaker:"Sneha",quote:"And someone needs to send the reminder mail to all volunteers.",title:"Volunteer reminder mail",owner:"",deadline:"",deliverable:"Volunteer reminder mail",hedges:[],conditional:false,score:60,label:"vague",status:"pending",sample:true}
];

const state = {view:"profile", transcript:"", sample:false, commitments:[], tasks:[], debtBefore:null, lastDebt:null, isAnalyzed:false, sourceLabel:"Awaiting transcript"};
const profileState = {name:"", role:"", about:"", meetingsAttended:"", teams:[]};
const nodes = {
  transcriptInput:$("#transcript-input"), file:$("#transcript-file"), title:$("#meeting-title"), date:$("#meeting-date"),
  charCount:$("#char-count"), sourceState:$("#source-state"), message:$("#analysis-message"), analyze:$("#analyze-button"),
  progress:$("#progress-wrap"), progressFill:$("#progress-fill"), progressLabel:$("#progress-label"), results:$("#transcript-results"),
  transcriptScroll:$("#transcript-scroll"), inspector:$("#inspector-list"), inspectorTotal:$("#inspector-total"),
  emptyResults:$("#empty-results"), analysisMode:$("#analysis-mode"), minimap:$("#minimap-track"), viewport:$("#minimap-viewport"), toast:$("#toast-region")
};
let motion = null;
try {
  const loaded = await import("./motion-kit.js");
  motion = loaded.ergonMotion;
  await motion.ready();
} catch (error) {
  // Motion is progressive enhancement: all content and controls remain usable without it.
  motion = null;
}

function displayLabel(label) { return label.charAt(0).toUpperCase() + label.slice(1); }
function genericOwner(value) { return !value.trim() || /^(we|someone|somebody|team|everyone|anyone|koi|sab)$/i.test(value.trim()); }
function calculateScore(c) {
  let score = 0; const missing = []; const reasons = [];
  if (genericOwner(c.owner || "")) { score += 30; missing.push("Owner"); reasons.push("Owner is missing or not specific"); }
  if (!String(c.deadline || "").trim() || /^(soon|sometime|later|asap|baad mein|dekhte hain)$/i.test(String(c.deadline || "").trim())) { score += 30; missing.push("Deadline"); reasons.push("Deadline is missing or vague"); }
  const words = String(c.deliverable || "").trim().split(/\s+/).filter(w => w.length > 2);
  if (words.length < 2) { score += 20; missing.push("Deliverable"); reasons.push("Deliverable needs a specific outcome"); }
  if ((c.hedges || []).length) { score += 20; reasons.push("Hedge language: " + c.hedges.join(", ")); }
  score = Math.min(score, 100);
  const label = score <= 15 ? "clear" : score <= 45 ? "fuzzy" : "vague";
  return {score,label,missing,reasons};
}
function refreshScore(c) { Object.assign(c, calculateScore(c)); }
function debtNow() {
  const live = state.commitments.filter(c => c.status !== "rejected");
  return live.length ? Math.round(live.reduce((sum,c) => sum + calculateScore(c).score, 0) / live.length) : 0;
}
function toast(message, type = "info") {
  const el = document.createElement("div"); el.className = "toast " + type;
  const dot = document.createElement("span"); dot.className = "toast-mark";
  const text = document.createElement("span"); text.textContent = message;
  el.append(dot,text); nodes.toast.append(el);
  if (motion) motion.toastElement(el); else setTimeout(() => el.remove(), 3000);
}
function bindMotion(scope = document) { if (motion) motion.bindControls(scope); }
function setSourceLabel(text) { state.sourceLabel = text; nodes.sourceState.textContent = text; }
function syncInput() {
  state.transcript = nodes.transcriptInput.value;
  nodes.charCount.textContent = state.transcript.length.toLocaleString() + " characters";
  if (state.isAnalyzed) { state.isAnalyzed = false; state.commitments = []; state.tasks = []; state.debtBefore = null; state.lastDebt = null; renderAll(); }
  if (state.transcript.trim()) setSourceLabel(state.sample ? "Provided example" : "Local transcript");
  else setSourceLabel("Awaiting transcript");
}
nodes.transcriptInput.addEventListener("input", () => { state.sample = false; syncInput(); });
$("#load-example").addEventListener("click", () => {
  nodes.transcriptInput.value = sampleTranscript; state.sample = true; nodes.title.value = "Avartan planning — example";
  syncInput(); setSourceLabel("Provided example"); toast("Example transcript loaded. This is fixture content, not a live meeting.", "success");
});
nodes.file.addEventListener("change", async event => {
  const file = event.target.files?.[0]; if (!file) return;
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!["txt","vtt","srt"].includes(ext)) { toast("Choose a .txt, .vtt, or .srt transcript.", "error"); nodes.file.value = ""; return; }
  try { nodes.transcriptInput.value = await file.text(); state.sample = false; syncInput(); setSourceLabel("Local file · " + file.name); toast("Transcript opened locally in this browser.", "success"); }
  catch { toast("This transcript could not be opened. Try pasting its text instead.", "error"); }
  nodes.file.value = "";
});
const inputWrap = $("#input-wrap");
inputWrap.addEventListener("dragover", event => { event.preventDefault(); inputWrap.classList.add("is-dragover"); });
inputWrap.addEventListener("dragleave", () => inputWrap.classList.remove("is-dragover"));
inputWrap.addEventListener("drop", async event => {
  event.preventDefault(); inputWrap.classList.remove("is-dragover"); const file = event.dataTransfer.files?.[0]; if (!file) return;
  if (!/\.(txt|vtt|srt)$/i.test(file.name)) { toast("Choose a .txt, .vtt, or .srt transcript.", "error"); return; }
  try { nodes.transcriptInput.value = await file.text(); state.sample = false; syncInput(); setSourceLabel("Local file · " + file.name); toast("Transcript opened locally in this browser.", "success"); }
  catch { toast("This transcript could not be opened.", "error"); }
});

function parseLocalTranscript(text) {
  const turns = text.split(/\r?\n/).map(line => line.trim()).filter(line => line && !/^WEBVTT$/i.test(line) && !/^\d+$/.test(line) && !/\d{2}:\d{2}:\d{2}[,.]\d{3}\s+-->/.test(line));
  const found = [];
  for (const line of turns) {
    const match = line.match(/^([^:]{1,48}):\s*(.+)$/); if (!match) continue;
    const speaker = match[1].trim(), body = match[2].trim();
    if (/\?\s*$/.test(body) || /\b(can't|cannot|won't|already|sent|finished|completed)\b/i.test(body)) continue;
    if (!/\b(i['’]?ll|i will|we will|will|should|need to|needs to|please|kar dunga|kar dungi|bhej dunga|bhej dungi)\b/i.test(body)) continue;
    const hedges = [...body.matchAll(/\b(maybe|try|look into|let'?s see|soon|later|dekhte hain|dekh lunga|shayad)\b/ig)].map(m => m[0].toLowerCase());
    let owner = speaker;
    if (/\b(someone|somebody|anyone|team|everyone|koi|sab)\b/i.test(body)) owner = "";
    const assigned = body.match(/^([A-Z][a-z]+)\s+will\b/); if (assigned) owner = assigned[1];
    let deadline = ""; const dateMatch = body.match(/\bby\s+([^,.!?]+?)(?:[,.!?]|$)/i); if (dateMatch) deadline = dateMatch[1].trim();
    let deliverable = body.replace(/^(?:and\s+)?(?:i['’]?ll|i will|we will|someone should|someone needs to|please|[A-Z][a-z]+ will|will|should|need to|needs to)\s*/i, "");
    deliverable = deliverable.replace(/\bby\s+[^,.!?]+/i, "").replace(/\b(maybe|try|look into|let'?s see|soon|later|dekhte hain|shayad)\b/ig, "").replace(/[,.!?]+$/g, "").trim();
    if (deliverable.length > 110) deliverable = deliverable.slice(0,110).trim();
    const title = deliverable ? deliverable.charAt(0).toUpperCase() + deliverable.slice(1) : "Unspecified deliverable";
    const c = {id:"local-" + found.length + "-" + Math.random().toString(36).slice(2,7),speaker,quote:body,title,owner,deadline,deliverable,hedges,conditional:/^if\b/i.test(body),status:"pending",sample:false}; refreshScore(c); found.push(c);
  }
  return found;
}
function setProgress(value, label) {
  nodes.progress.hidden = false; nodes.progressLabel.textContent = label;
  if (motion) motion.progress(nodes.progressFill, value); else nodes.progressFill.style.transform = "scaleX(" + value + ")";
}
function analyzeTranscript() {
  const text = nodes.transcriptInput.value.trim();
  if (!text) { nodes.message.textContent = "Add a transcript before starting a review."; toast("Add a transcript first.", "error"); nodes.transcriptInput.focus(); return; }
  nodes.message.textContent = "Reading the transcript in this browser…"; nodes.analyze.disabled = true; nodes.analyze.querySelector("span").textContent = "Reading transcript";
  nodes.progress.hidden = false; setProgress(.06,"Preparing transcript");
  let p = .06; const steps = ["Reading transcript turns","Checking commitment language","Preparing review notes"];
  const stepTimer = setInterval(() => { p = Math.min(.94,p + .22); setProgress(p,steps[Math.min(2,Math.floor(p*3))]); },120);
  setTimeout(() => {
    clearInterval(stepTimer); state.commitments = state.sample ? sampleCommitments.map(c => ({...c,hedges:[...c.hedges],status:"pending"})) : parseLocalTranscript(text);
    state.tasks = []; state.isAnalyzed = true; state.debtBefore = state.commitments.length ? Math.round(state.commitments.reduce((sum,c) => sum + calculateScore(c).score,0)/state.commitments.length) : 0; state.lastDebt = null;
    setProgress(1,"Review prepared");
    setTimeout(() => { nodes.progress.hidden = true; nodes.analyze.disabled = false; nodes.analyze.querySelector("span").textContent = "Review commitments";
      nodes.message.textContent = state.sample ? "Example fixture loaded; this is a local preview, not AI output." : "Local rules preview only — no AI or API is connected.";
      nodes.analysisMode.textContent = state.sample ? "PROVIDED EXAMPLE" : "LOCAL RULES PREVIEW";
      renderAll(); if (!state.commitments.length) toast("No commitment lines found. Check speaker names and wording.","error"); else toast(state.commitments.length + " commitment" + (state.commitments.length===1?"":"s") + " ready to review.","success");
    }, 160);
  }, 540);
}
nodes.analyze.addEventListener("click", analyzeTranscript);

function statusClass(label) { return "hl-" + label; }
function renderTranscript() {
  nodes.transcriptScroll.replaceChildren(); nodes.minimap.replaceChildren();
  const lines = state.transcript.split(/\r?\n/);
  const active = state.commitments.filter(c => c.status !== "rejected");
  lines.forEach((line, index) => {
    const row = document.createElement("div"); row.className = "turn"; row.id = "turn-" + index;
    const match = line.match(/^([^:]{1,48}):\s*(.*)$/);
    const speaker = document.createElement("span"); speaker.className = "speaker-label"; speaker.textContent = match ? match[1].trim() : "Transcript";
    const copy = document.createElement("span"); copy.className = "turn-copy";
    const body = match ? match[2] : line;
    const matches = active.map(c => ({c,at:body.indexOf(c.quote)})).filter(x=>x.at>=0).sort((a,b)=>a.at-b.at);
    let pos=0;
    for (const item of matches) {
      if (item.at < pos) continue;
      copy.append(document.createTextNode(body.slice(pos,item.at)));
      const result=calculateScore(item.c);const mark = document.createElement("span"); mark.className = "promise-mark " + statusClass(result.label); mark.dataset.id = item.c.id; mark.tabIndex = 0; mark.setAttribute("role","button"); mark.setAttribute("aria-label",displayLabel(result.label)+" promise, score "+result.score+". Jump to inspector.");
      const fill = document.createElement("i"); fill.className="hl-fill"; fill.setAttribute("aria-hidden","true"); mark.append(fill,document.createTextNode(item.c.quote));
      const badge = document.createElement("span"); badge.className="mark-label"; badge.textContent=displayLabel(result.label); mark.append(badge); copy.append(mark); pos=item.at+item.c.quote.length;
    }
    copy.append(document.createTextNode(body.slice(pos))); row.append(speaker,copy); nodes.transcriptScroll.append(row);
  });
  active.forEach((c,i) => {
    const mark = $('.promise-mark[data-id="'+CSS.escape(c.id)+'"]',nodes.transcriptScroll); if (!mark) return;
    const t = document.createElement("i"); t.className="minimap-tick "+statusClass(calculateScore(c).label); t.style.top = Math.max(1,Math.min(99,((mark.closest(".turn").offsetTop/nodes.transcriptScroll.scrollHeight)*100)))+"%"; t.title=displayLabel(calculateScore(c).label)+" promise "+(i+1); nodes.minimap.append(t);
  });
  if (motion) { motion.sweep($$(".promise-mark",nodes.transcriptScroll)); motion.syncMinimap(nodes.transcriptScroll,nodes.viewport); }
  nodes.transcriptScroll.onscroll = () => { const max=nodes.transcriptScroll.scrollHeight-nodes.transcriptScroll.clientHeight; const pct=max>0?nodes.transcriptScroll.scrollTop/max:0; nodes.viewport.style.transform="translateY("+(pct*Math.max(0,nodes.transcriptScroll.clientHeight-22))+"px)"; };
}
function makeChip(text, className="") { const chip=document.createElement("span"); chip.className="slot-chip "+className; chip.textContent=text; return chip; }
function makePromiseCard(c,index) {
  const card=document.createElement("article"); card.className="promise-card"+(c.status==="accepted"?" is-resolved":""); card.dataset.id=c.id; card.dataset.label=calculateScore(c).label;
  card.innerHTML='<div class="promise-top"><div class="gauge-wrap"><svg class="gauge" viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="14"/><circle class="gauge-value" cx="18" cy="18" r="14"/></svg><span class="gauge-score">0</span></div><div class="promise-heading"><h4></h4><span class="risk-label"></span></div><span class="card-index mono"></span></div><blockquote class="promise-quote"></blockquote><div class="score-evidence"></div><div class="slot-chips"></div><div class="promise-fields"><label>OWNER<input data-field="owner" type="text" autocomplete="off" /></label><label>DEADLINE<input data-field="deadline" type="text" autocomplete="off" /></label><label class="deliverable-field">DELIVERABLE<input data-field="deliverable" type="text" autocomplete="off" /></label></div><div class="card-actions"><p class="clarity-hint"></p><div class="action-buttons"><button class="reject-button text-button" data-action="reject" type="button">Reject</button><button class="accept-button" data-action="accept" type="button">Approve</button></div></div>';
  $("h4",card).textContent=c.title; $(".promise-quote",card).textContent='“'+c.quote+'”'; $(".card-index",card).textContent=String(index+1).padStart(2,"0");
  for(const input of $$("[data-field]",card)){const field=input.dataset.field; input.value=c[field]||"";input.placeholder=field==="owner"?"Name":field==="deadline"?"Add a date or time":"What will be delivered";input.disabled=c.status==="accepted";}
  const actions=$(".action-buttons",card), hint=$(".clarity-hint",card);
  if(c.status==="accepted"){actions.replaceChildren();const label=document.createElement("span");label.className="accepted-note";label.textContent="APPROVED · ON BOARD";actions.append(label);hint.textContent="Ready for follow-through.";}
  else {hint.textContent="Confirm before it becomes a task.";}
  updateCardVisual(c,card);
  return card;
}
function updateCardVisual(c,card) {
  if(!card) card=$('.promise-card[data-id="'+CSS.escape(c.id)+'"]',nodes.inspector); if(!card)return;
  const result=calculateScore(c); Object.assign(c,result); card.dataset.label=result.label;
  const scoreText=$(".gauge-score",card);const priorScore=Number(scoreText.textContent)||0;if(motion)motion.countTo(scoreText,priorScore,result.score,{duration:.32});else scoreText.textContent=String(result.score);const path=$(".gauge-value",card); const circ=2*Math.PI*14; path.style.strokeDasharray=String(circ); if(motion)motion.gauge(path,result.score);else path.style.strokeDashoffset=String(circ*(1-result.score/100));
  const risk=$(".risk-label",card); risk.textContent=displayLabel(result.label); risk.className="risk-label "+result.label;
  const evidence=$(".score-evidence",card); evidence.replaceChildren();
  if(result.reasons.length){const lead=document.createElement("strong");lead.textContent="Why this score";evidence.append(lead);for(const reason of result.reasons){const line=document.createElement("span");line.textContent="+ "+reason;evidence.append(line);}}
  else {const ok=document.createElement("span");ok.textContent="Owner, deadline and deliverable are specific; no hedge detected.";evidence.append(ok);}
  const chips=$(".slot-chips",card); chips.replaceChildren();
  for(const slot of ["Owner","Deadline","Deliverable"]) chips.append(makeChip((result.missing.includes(slot)?"Missing · ":"")+slot,result.missing.includes(slot)?"missing":""));
  if(c.conditional)chips.append(makeChip("Conditional","conditional"));
  if(c.ownerConfirmed===false)chips.append(makeChip("Owner not acknowledged","unconfirmed"));
  const mark=$('.promise-mark[data-id="'+CSS.escape(c.id)+'"]',nodes.transcriptScroll);
  if(mark){mark.className="promise-mark "+statusClass(result.label);const fill=$(".hl-fill",mark); if(fill)fill.style.background="var(--"+result.label+"-tint)";const label=$(".mark-label",mark);if(label)label.textContent=displayLabel(result.label);mark.setAttribute("aria-label",displayLabel(result.label)+" promise, score "+result.score+". Jump to inspector.");}
}
function renderInspector() {
  nodes.inspector.replaceChildren(); const active=state.commitments.filter(c=>c.status!=="rejected").sort((a,b)=>calculateScore(b).score-calculateScore(a).score);
  nodes.inspectorTotal.textContent=String(active.length).padStart(2,"0");
  if(!state.isAnalyzed||!active.length){const empty=document.createElement("div");empty.className="inspector-empty";const rule=document.createElement("span");rule.className="empty-rule";const p=document.createElement("p");p.textContent=state.isAnalyzed?"No promises to review.":"Your promises will appear here after review.";const mono=document.createElement("span");mono.className="mono";mono.textContent="OWNER · DEADLINE · DELIVERABLE";empty.append(rule,p,mono);nodes.inspector.append(empty);return;}
  active.forEach((c,index)=>nodes.inspector.append(makePromiseCard(c,index)));
  bindMotion(nodes.inspector); if(motion)motion.reveal($$(".promise-card",nodes.inspector));
}
function updateCounters() {
  const pending=state.commitments.filter(c=>c.status==="pending").length; $("#review-count").textContent=state.isAnalyzed?String(pending):"—";
  $("#board-count").textContent=String(state.tasks.length);
}
function renderTranscriptArea() {
  nodes.results.hidden=!state.isAnalyzed; nodes.emptyResults.hidden=!(state.isAnalyzed&&!state.commitments.length);
  if(state.isAnalyzed&&state.commitments.length)renderTranscript(); else {nodes.transcriptScroll.replaceChildren();nodes.minimap.replaceChildren();}
}
function renderProfile(){
  const nameField=$("#profile-name"),roleField=$("#profile-role"),aboutField=$("#profile-about"),meetingField=$("#profile-meetings-attended");
  if(document.activeElement!==nameField)nameField.value=profileState.name;
  if(document.activeElement!==roleField)roleField.value=profileState.role;
  if(document.activeElement!==aboutField)aboutField.value=profileState.about;
  if(document.activeElement!==meetingField)meetingField.value=profileState.meetingsAttended;
  const name=profileState.name.trim();$("#profile-display-name").textContent=name||"Your profile";$("#profile-role-summary").textContent=profileState.role.trim()||"Role not set";
  const avatar=$("#profile-avatar");if(name){const initials=name.split(/\s+/).slice(0,2).map(part=>part[0]).join("").toUpperCase();avatar.replaceChildren(document.createTextNode(initials));avatar.classList.add("has-initials");}else{avatar.classList.remove("has-initials");if(!avatar.querySelector("svg"))avatar.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M4.5 20c.8-3.5 3.4-5.5 7.5-5.5s6.7 2 7.5 5.5"/></svg>';}
  const scored=state.commitments.filter(c=>c.status!=="rejected");const score=state.isAnalyzed&&scored.length?Math.round(scored.reduce((sum,c)=>sum+calculateScore(c).score,0)/scored.length):null;
  $("#profile-vague-score").textContent=score===null?"—":String(score).padStart(2,"0");$("#profile-vague-score").style.color=score===null?"var(--bronze)":colourForScore(score);$("#profile-clarified-count").textContent=String(state.tasks.length);
  const activeTeams=profileState.teams.filter(team=>team.status==="active");$("#profile-team-count").textContent=String(activeTeams.length);
  const history=$("#team-history");history.replaceChildren();
  if(!profileState.teams.length){const empty=document.createElement("p");empty.className="team-empty";empty.textContent="No team history yet. Add a team you belong to, or use Join team to record one here.";history.append(empty);return;}
  for(const team of [...profileState.teams].reverse()){
    const row=document.createElement("div");row.className="team-row";const info=document.createElement("div");const strong=document.createElement("strong");strong.textContent=team.name;const small=document.createElement("small");small.textContent=team.status==="active"?"Added in this session":"Previous team · left in this session";info.append(strong,small);const actions=document.createElement("div");const badge=document.createElement("span");badge.className="team-state"+(team.status==="active"?"":" previous");badge.textContent=team.status==="active"?"Active":"Previous";actions.append(badge);if(team.status==="active"){const leave=document.createElement("button");leave.className="text-button team-leave";leave.type="button";leave.dataset.teamAction="leave";leave.dataset.teamId=team.id;leave.textContent="Leave team";actions.append(leave);}row.append(info,actions);history.append(row);
  }
}
$("#profile-form").addEventListener("submit",event=>event.preventDefault());
$("#profile-form").addEventListener("input",event=>{const key={"profile-name":"name","profile-role":"role","profile-about":"about"}[event.target.id];if(!key)return;profileState[key]=event.target.value;renderProfile();});
$("#profile-meetings-attended").addEventListener("input",event=>{profileState.meetingsAttended=event.target.value;});
$("#open-team-form").addEventListener("click",()=>{const form=$("#join-team-form");form.hidden=false;$("#open-team-form").hidden=true;$("#team-name-input").focus();});
$("#join-team-form").addEventListener("submit",event=>{event.preventDefault();const input=$("#team-name-input"),name=input.value.trim();if(!name)return;if(profileState.teams.some(team=>team.status==="active"&&team.name.toLowerCase()===name.toLowerCase())){toast("That team is already listed as active.","error");return;}profileState.teams.push({id:"team-"+Date.now()+"-"+Math.random().toString(36).slice(2,6),name,status:"active"});input.value="";$("#join-team-form").hidden=true;$("#open-team-form").hidden=false;renderProfile();toast("Team added to this local profile.","success");});
$("#team-history").addEventListener("click",event=>{const button=event.target.closest("[data-team-action=leave]");if(!button)return;const team=profileState.teams.find(item=>item.id===button.dataset.teamId);if(!team)return;team.status="previous";renderProfile();toast("Marked as a previous team in this browser session.","info");});
function renderAll(options={}) { renderTranscriptArea();renderInspector();renderBoard();renderDashboard(options);renderProfile();updateCounters(); }


nodes.inspector.addEventListener("input",event=>{
  const input=event.target.closest("[data-field]");if(!input)return;const card=input.closest(".promise-card");const c=state.commitments.find(x=>x.id===card.dataset.id);if(!c||c.status!=="pending")return;
  c[input.dataset.field]=input.value;updateCardVisual(c,card);renderDashboard({animateDebt:true});
});
nodes.inspector.addEventListener("click",async event=>{
  const clickedCard=event.target.closest(".promise-card");
  if(clickedCard&&!event.target.closest("button,input")){const selected=state.commitments.find(x=>x.id===clickedCard.dataset.id);if(selected)selectPromise(selected);return;}
  const button=event.target.closest("[data-action]");if(!button)return;const card=button.closest(".promise-card");const c=state.commitments.find(x=>x.id===card.dataset.id);if(!c)return;
  if(button.dataset.action==="reject"){c.status="rejected";renderAll({animateDebt:true});toast("Promise rejected and removed from Meeting Debt.","info");return;}
  if(button.dataset.action==="accept"){
    for(const input of $$("[data-field]",card))c[input.dataset.field]=input.value;
    refreshScore(c);
    if(genericOwner(c.owner||"")||!String(c.deadline||"").trim()||!String(c.deliverable||"").trim()){
      const missing=calculateScore(c).missing.join(", ");toast("Clarify "+(missing||"the task details")+" before approving.","error");card.classList.add("needs-clarity");setTimeout(()=>card.classList.remove("needs-clarity"),500);return;
    }
    if(motion)await motion.flight(card,$('[data-view="board"]'));
    c.status="accepted";const task={id:"task-"+c.id,commitmentId:c.id,title:c.deliverable.trim(),owner:c.owner.trim(),deadline:c.deadline.trim(),status:"todo",quote:c.quote,speaker:c.speaker};state.tasks.push(task);
    renderAll({animateDebt:true});toast("Approved task added to To Do.","success");
  }
});
nodes.transcriptScroll.addEventListener("click",event=>{const mark=event.target.closest(".promise-mark");if(mark){const c=state.commitments.find(x=>x.id===mark.dataset.id);if(c)selectPromise(c);}});
nodes.transcriptScroll.addEventListener("keydown",event=>{if((event.key==="Enter"||event.key===" ")&&event.target.matches(".promise-mark")){event.preventDefault();const c=state.commitments.find(x=>x.id===event.target.dataset.id);if(c)selectPromise(c);}});
function selectPromise(c){const card=$('.promise-card[data-id="'+CSS.escape(c.id)+'"]',nodes.inspector);if(!card)return;$$('.promise-card',nodes.inspector).forEach(el=>el.classList.toggle("is-selected",el===card));const mark=$('.promise-mark[data-id="'+CSS.escape(c.id)+'"]',nodes.transcriptScroll);if(mark){mark.scrollIntoView({behavior:motion&&motion.reduced()?"auto":"smooth",block:"center"});if(motion)motion.pulse(mark);}card.scrollIntoView({behavior:"smooth",block:"nearest"});}

function makeTaskCard(task) {
  const card=document.createElement("article");card.className="task-card";card.dataset.id=task.id;
  card.innerHTML='<h3></h3><div class="task-detail"><span><b>OWNER</b><span data-task-owner></span></span><span><b>BY</b><span data-task-deadline></span></span></div><p class="task-quote"></p><div class="task-footer"><span class="task-state"></span><button class="task-move text-button" type="button" data-move="next"></button></div>';
  $("h3",card).textContent=task.title;$("[data-task-owner]",card).textContent=task.owner||"Unassigned";$("[data-task-deadline]",card).textContent=task.deadline||"Not set";$(".task-quote",card).textContent='“'+task.quote+'”';$(".task-state",card).textContent=task.status==="todo"?"TO DO":task.status==="doing"?"DOING":"DONE";
  const move=$(".task-move",card);move.textContent=task.status==="todo"?"Move to Doing →":task.status==="doing"?"Move to Done →":"Move to To Do ↺";
  return card;
}
function renderBoard() {
  for(const status of ["todo","doing","done"]){const list=$('[data-task-list="'+status+'"]');list.replaceChildren();const tasks=state.tasks.filter(t=>t.status===status);$('[data-column-count="'+status+'"]').textContent=String(tasks.length);
    if(!tasks.length){const empty=document.createElement("p");empty.className="column-empty";empty.textContent=status==="todo"?"Nothing queued.":status==="doing"?"Nothing in progress.":"Nothing completed yet.";list.append(empty);} else tasks.forEach(task=>list.append(makeTaskCard(task)));
  }
  $("#board-caption").textContent=state.tasks.length?state.tasks.length+" approved task"+(state.tasks.length===1?"":"s")+" from this review session.":"No approved tasks yet. Confirm a promise in Review to add it here.";
  bindMotion($("#board-grid"));
}
$("#board-grid").addEventListener("click",event=>{
  const button=event.target.closest("[data-move]");if(!button)return;const task=state.tasks.find(t=>t.id===button.closest(".task-card").dataset.id);if(!task)return;
  const to=task.status==="todo"?"doing":task.status==="doing"?"done":"todo";
  const mutate=()=>{task.status=to;renderBoard();renderDashboard({animateDebt:false});updateCounters();};
  if(motion)motion.flip($("#board-grid"),mutate);else mutate();toast("Task moved to "+labelsForStatus(to)+".","success");
});
function labelsForStatus(status){return status==="todo"?"To Do":status==="doing"?"Doing":"Done";}

function colourForScore(score){if(score<=15)return getComputedStyle(document.documentElement).getPropertyValue("--clear").trim();if(score<=45)return getComputedStyle(document.documentElement).getPropertyValue("--fuzzy").trim();return getComputedStyle(document.documentElement).getPropertyValue("--vague").trim();}
function renderDashboard(options={}) {
  const current=state.isAnalyzed?debtNow():null;const before=state.debtBefore;
  const debtEl=$("#debt-now"),beforeEl=$("#debt-before"),bar=$("#debt-bar-fill");
  if(current===null){debtEl.textContent="—";beforeEl.textContent="—";$("#debt-change").textContent="No reviewed promises yet";bar.style.width="0%";}
  else {
    beforeEl.textContent=String(before??current).padStart(2,"0");const from=state.lastDebt===null?current:state.lastDebt;
    if(options.animateDebt&&motion&&state.lastDebt!==null&&from!==current)motion.debt(debtEl,from,current);
    else debtEl.textContent=String(current).padStart(2,"0");
    debtEl.style.color=colourForScore(current);bar.style.width=Math.max(2,current)+"%";bar.style.background=colourForScore(current);
    $("#debt-change").textContent=current<(before??current)?"Down "+(before-current)+" points after clarification":current>(before??current)?"Up "+(current-before)+" points since analysis":"Compared with the analysis-time baseline";
    state.lastDebt=current;
  }
  const live=state.commitments.filter(c=>c.status!=="rejected");$("#promise-total").textContent=live.length+" PROMISE"+(live.length===1?"":"S");
  const clarity={clear:0,fuzzy:0,vague:0};live.forEach(c=>clarity[calculateScore(c).label]++);
  const mix=$("#mix-content");mix.replaceChildren();
  if(!state.isAnalyzed||!live.length){const empty=document.createElement("div");empty.className="mix-empty";empty.textContent="Your clarity mix appears after transcript review.";mix.append(empty);}
  else {
    const pie=document.createElement("div");pie.className="pie-chart";const total=live.length;const clearDeg=clarity.clear/total*360;const fuzzyDeg=clearDeg+clarity.fuzzy/total*360;pie.style.background="conic-gradient(var(--clear) 0deg "+clearDeg+"deg,var(--fuzzy) "+clearDeg+"deg "+fuzzyDeg+"deg,var(--vague) "+fuzzyDeg+"deg 360deg)";pie.setAttribute("role","img");pie.setAttribute("aria-label","Pie chart: "+clarity.clear+" clear, "+clarity.fuzzy+" fuzzy, "+clarity.vague+" vague promises out of "+total+".");const legend=document.createElement("div");legend.className="mix-legend";
    for(const [key,label] of [["clear","Clear"],["fuzzy","Fuzzy"],["vague","Vague"]]){const row=document.createElement("div");row.className="mix-row";const dot=document.createElement("i");dot.className="legend-dot "+key+"-dot";const txt=document.createElement("span");txt.textContent=label;const num=document.createElement("b");num.textContent=String(clarity[key]);const share=document.createElement("span");share.className="mix-share";share.textContent=Math.round(clarity[key]/total*100)+"%";row.append(dot,txt,num,share);legend.append(row);}mix.append(pie,legend);
  }
  const scoreChart=$("#score-bar-chart");scoreChart.replaceChildren();if(!state.isAnalyzed||!live.length){const empty=document.createElement("p");empty.className="mix-empty";empty.textContent="The bar chart appears after transcript review.";scoreChart.append(empty);}else{const maxCount=Math.max(1,clarity.clear,clarity.fuzzy,clarity.vague);for(const [key,label] of [["clear","Clear"],["fuzzy","Fuzzy"],["vague","Vague"]]){const slot=document.createElement("div");slot.className="score-bar-slot "+key;slot.setAttribute("aria-label",label+": "+clarity[key]+" promises");const value=document.createElement("span");value.className="score-bar-value";value.textContent=String(clarity[key]);const track=document.createElement("span");track.className="score-bar-track";const fill=document.createElement("span");fill.className="score-bar-fill";fill.style.height=(clarity[key]?Math.max(4,clarity[key]/maxCount*100):0)+"%";track.append(fill);const category=document.createElement("span");category.className="score-bar-label";category.textContent=label;slot.append(value,track,category);scoreChart.append(slot);}}
  const owners={};for(const task of state.tasks){const name=task.owner||"Unassigned";owners[name]=(owners[name]||0)+1;}
  const load=$("#load-content");load.replaceChildren();const ownerRows=Object.entries(owners).sort((a,b)=>b[1]-a[1]);
  if(!ownerRows.length){const empty=document.createElement("div");empty.className="mix-empty";empty.textContent="Owner workload is empty until tasks are approved.";load.append(empty);}else for(const [name,count] of ownerRows){const row=document.createElement("div");row.className="load-row";const who=document.createElement("span");who.textContent=name;const track=document.createElement("span");track.className="load-track";const fill=document.createElement("span");fill.style.width=(count/Math.max(...ownerRows.map(x=>x[1]))*100)+"%";track.append(fill);const value=document.createElement("b");value.textContent=String(count).padStart(2,"0");row.append(who,track,value);load.append(row);}
  const orphans=live.filter(c=>genericOwner(c.owner||""));$("#orphan-copy").textContent=state.isAnalyzed?(orphans.length?orphans.length+" promise"+(orphans.length===1?" has":"s have")+" no confirmed owner. Clarify in Review before approval.":"Every remaining promise has a named owner."):"No transcript has been reviewed in this session.";
  renderReminders();renderProfile();
}
function renderReminders(){
  const root=$("#reminder-list");root.replaceChildren();const dated=state.tasks.filter(t=>parseISODate(t.deadline));
  if(!dated.length){const p=document.createElement("p");p.className="reminder-empty";p.textContent=state.tasks.length?"Add a full date (YYYY-MM-DD) to an approved task to create a calendar reminder link.":"Approve a task with a due date to create a calendar reminder link.";root.append(p);return;}
  for(const task of dated){const row=document.createElement("div");row.className="reminder-item";const info=document.createElement("div");const strong=document.createElement("strong");strong.textContent=task.title;const small=document.createElement("small");small.textContent=task.owner+" · due "+task.deadline;info.append(strong,small);const links=document.createElement("div");links.className="reminder-links";const url=calendarUrl(task);const add=document.createElement("a");add.className="text-button";add.href=url;add.target="_blank";add.rel="noopener noreferrer";add.textContent="Add to Google Calendar ↗";const copy=document.createElement("button");copy.className="text-button";copy.type="button";copy.textContent="Copy reminder";copy.addEventListener("click",async()=>{const text="Reminder: "+task.title+" — owned by "+task.owner+", due "+task.deadline+".";try{await navigator.clipboard.writeText(text);toast("Reminder copied to clipboard.","success");}catch{toast(text,"info");}});links.append(add,copy);row.append(info,links);root.append(row);}
  bindMotion(root);
}
function parseISODate(value){return /^\d{4}-\d{2}-\d{2}$/.test(String(value||""))?String(value):null;}
function calendarUrl(task){const date=parseISODate(task.deadline);const next=new Date(date+"T00:00:00");next.setDate(next.getDate()+1);const ymd=d=>d.toISOString().slice(0,10).replaceAll("-","");const title=encodeURIComponent(task.title);const details=encodeURIComponent("Owner: "+task.owner+"\nFrom Ergon frontend preview.");return "https://calendar.google.com/calendar/render?action=TEMPLATE&text="+title+"&dates="+ymd(new Date(date+"T00:00:00"))+"/"+ymd(next)+"&details="+details;}
function downloadTasksCSV(){if(!state.tasks.length){toast("No approved tasks to export yet.","error");return;}const rows=[["Summary","Owner","Deadline","Status","Evidence"],...state.tasks.map(t=>[t.title,t.owner,t.deadline,labelsForStatus(t.status),t.quote])];const csv=rows.map(row=>row.map(v=>'"'+String(v??"").replaceAll('"','""')+'"').join(",")).join("\r\n");const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="ergon-approved-tasks.csv";a.click();URL.revokeObjectURL(url);toast("Approved tasks CSV downloaded.","success");}
$("#board-export").addEventListener("click",downloadTasksCSV);$("#dashboard-export").addEventListener("click",downloadTasksCSV);

$("#reset-session").addEventListener("click",()=>{
  state.transcript="";state.sample=false;state.commitments=[];state.tasks=[];state.debtBefore=null;state.lastDebt=null;state.isAnalyzed=false;
  nodes.transcriptInput.value="";nodes.title.value="";nodes.date.value="";nodes.message.textContent="Add a transcript to begin. Speaker names help anchor each promise.";nodes.analyze.disabled=false;nodes.analyze.querySelector("span").textContent="Review commitments";nodes.progress.hidden=true;nodes.progressFill.style.transform="scaleX(0)";nodes.charCount.textContent="0 characters";setSourceLabel("Awaiting transcript");renderAll();toast("Session review and approved tasks cleared.","success");switchView("profile");
});
let viewSequence=0;
async function switchView(name){if(!["profile","review","board","dashboard","settings","help"].includes(name)||name===state.view)return;const current=$('[data-view-panel="'+state.view+'"]'),next=$('[data-view-panel="'+name+'"]');const seq=++viewSequence;
  if(motion)await motion.changeView(current,next);else{current.hidden=true;next.hidden=false;}
  if(seq!==viewSequence)return;state.view=name;$$('.nav-link').forEach(button=>{const active=button.dataset.view===name;button.classList.toggle("is-active",active);if(active)button.setAttribute("aria-current","page");else button.removeAttribute("aria-current");});$("#current-section").textContent=name.charAt(0).toUpperCase()+name.slice(1);if(motion)motion.reveal($$("[data-enter]",next));
}
$$('.nav-link').forEach(button=>button.addEventListener("click",()=>switchView(button.dataset.view)));
$$('[data-go-view]').forEach(button=>button.addEventListener("click",()=>switchView(button.dataset.goView)));
function toggleTheme(){const dark=document.documentElement.dataset.theme!=="dark";document.documentElement.dataset.theme=dark?"dark":"paper";const label=dark?"Switch to Paper theme":"Switch to Night theme";$("#theme-toggle").setAttribute("aria-pressed",String(dark));$("#theme-toggle").setAttribute("aria-label",label);$("#theme-toggle").setAttribute("title",label);$("#theme-toggle-label").textContent=label;renderDashboard();}
$("#theme-toggle").addEventListener("click",toggleTheme);$("#settings-theme-toggle").addEventListener("click",toggleTheme);

// State is deliberately in memory only: transcript content is not written to localStorage or sent to a server.
if(motion){motion.startDrift($$(".wash"));bindMotion(document);motion.reveal($$("[data-enter]",$('[data-view-panel="profile"]')));}
renderAll();
