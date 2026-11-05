/* =====================================================
   SkillBridge – single page app (vanilla JS)
   Pages: home → onboarding → profile → matches → match
          home → post → ranked → team → final
   ===================================================== */

/* ---------- helpers ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ini = n => (n || "?").split(" ").filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase();
const go = h => (location.hash = h);
const uniq = a => [...new Set(a)];
const norm = s => s.trim().toLowerCase();

function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove("show"), 2200);
}

/* ---------- state (persisted) ---------- */
const KEY = "skillbridge.v2";
const DEFAULT = {
  role: "student",
  user: { name: "", college: "", bio: "", github: "", skills: [] },
  need: { type: "Problem", title: "", text: "", skills: [], tasks: [], analyzed: false },
  saved: [],
  applied: [],
  team: [],
  teamFor: ""
};
const clone = o => JSON.parse(JSON.stringify(o));
function load() {
  try { return Object.assign(clone(DEFAULT), JSON.parse(localStorage.getItem(KEY) || "{}")); }
  catch { return clone(DEFAULT); }
}
let S = load();
const save = () => localStorage.setItem(KEY, JSON.stringify(S));
let ui = { tab: "why", errors: {}, loading: false };

/* ---------- data ---------- */
const OPPS = [
  { id: 0, icon: "🧁", name: "Local Bakery", desc: "Need online ordering & Instagram help", type: "Internship", mode: "Remote",
    skills: ["Web Development", "UI/UX Design", "Social Media"] },
  { id: 1, icon: "🛰️", name: "ISRO SAC (Research)", desc: "Satellite data analysis", type: "Job", mode: "Remote",
    skills: ["Python", "Machine Learning", "Data Analysis"] },
  { id: 2, icon: "💡", name: "TechNova (Company)", desc: "Build an AI assistant for internal use", type: "Internship", mode: "Remote",
    skills: ["Python", "React", "Machine Learning"] },
  { id: 3, icon: "📱", name: "FitTrack Startup", desc: "Mobile app for gym members", type: "Job", mode: "Hybrid",
    skills: ["Mobile Development", "React", "UI/UX Design"] }
];

const STUDENTS = [
  { name: "Sneha Roy", college: "JISCE", skills: ["Web Development", "UI/UX Design", "Figma"] },
  { name: "Arjun Saha", college: "JISCE", skills: ["Python", "Social Media", "Marketing"] },
  { name: "Priya Nair", college: "NIT Durgapur", skills: ["React", "Web Development", "Node.js"] },
  { name: "Karan Mehta", college: "IIT Kharagpur", skills: ["Machine Learning", "Python", "Data Analysis"] },
  { name: "Ananya Das", college: "JISCE", skills: ["Social Media", "Content Writing", "UI/UX Design"] },
  { name: "Rohit Sen", college: "MAKAUT", skills: ["Mobile Development", "React", "Web Development"] }
];

/* keyword → skill used by the "Analyze with AI" step */
const KEYWORDS = [
  [/web|website|online|ordering|e-?commerce|portal/i, "Web Development"],
  [/ui|ux|design|figma|interface/i, "UI/UX Design"],
  [/instagram|social|facebook|marketing|promotion|brand/i, "Social Media"],
  [/python|script|automation/i, "Python"],
  [/machine learning|\bml\b|\bai\b|model|prediction/i, "Machine Learning"],
  [/react|frontend|front-end/i, "React"],
  [/data|analytics|analysis|dashboard|report/i, "Data Analysis"],
  [/mobile|android|ios|\bapp\b/i, "Mobile Development"]
];
const TASK_FOR = {
  "Web Development": "Build the web platform",
  "UI/UX Design": "Design a clean user interface",
  "Social Media": "Improve social media presence",
  "Python": "Write backend / automation scripts",
  "Machine Learning": "Train and evaluate a model",
  "React": "Develop the frontend in React",
  "Data Analysis": "Provide basic analytics",
  "Mobile Development": "Build the mobile app"
};

/* ---------- matching ---------- */
const overlap = (have, need) => need.filter(n => have.some(h => norm(h) === norm(n)));
const missing = (have, need) => need.filter(n => !have.some(h => norm(h) === norm(n)));
const pct = (have, need) => need.length ? Math.round(45 + 53 * overlap(have, need).length / need.length) : 50;
const pillClass = p => (p >= 85 ? "" : p >= 65 ? "mid" : "low");

function rankStudents(needSkills) {
  const pool = STUDENTS.map(s => ({ ...s }));
  if (S.user.name && S.user.skills.length) pool.push({ name: S.user.name, college: S.user.college, skills: S.user.skills });
  return pool
    .map(s => ({ ...s, score: pct(s.skills, needSkills), hit: overlap(s.skills, needSkills) }))
    .sort((a, b) => b.score - a.score);
}

const profileDone = () => S.user.name && S.user.college && S.user.bio && S.user.skills.length > 0;
function strength() {
  let s = 0;
  if (S.user.name) s += 20;
  if (S.user.college) s += 20;
  if (S.user.bio) s += 20;
  if (S.user.github) s += 20;
  s += Math.min(20, S.user.skills.length * 7);
  return Math.min(100, s);
}

/* ---------- shared UI pieces ---------- */
const logo = `<a class="logo" onclick="go('#/home')"><i>S</i>SkillBridge</a>`;
const tags = (arr, cls = "") => arr.map(t => `<span class="tag ${cls}">${esc(t)}</span>`).join("");

function side(active) {
  const items = S.role === "org"
    ? [["post", "📝 Post a Need"], ["ranked", "🏅 Ranked Students"], ["settings", "⚙️ Settings"]]
    : [["profile", "👤 My Profile"], ["matches", "💜 My Matches"], ["saved", "🔖 Saved"], ["settings", "⚙️ Settings"]];
  return `<aside class="side">
    <div style="margin-bottom:14px">${logo}</div>
    ${items.map(([k, l]) => `<a class="${active === k ? "on" : ""}" onclick="go('#/${k}')">${l}</a>`).join("")}
    <p class="mute" style="margin-top:30px;font-size:12px"><b style="color:var(--ink)">SkillBridge</b><br>Building a skilled generation together.</p>
  </aside>`;
}
const field = (k) => (ui.errors[k] ? `<div class="err">${ui.errors[k]}</div>` : `<div class="err"></div>`);
const cls = k => (ui.errors[k] ? "bad" : "");
const dashboard = () => (S.role === "org" ? "#/post" : "#/matches");

/* ---------- pages ---------- */
const pages = {

  /* 1 ── landing */
  home() {
    return `<div class="fade">
      <div class="top">${logo}<nav><a onclick="go('#/final')">About</a><a onclick="go('#/final')">Features</a></nav></div>
      <section class="hero">
        <div>
          <h1>Bridge Skills.<br><span>Build Together.</span></h1>
          <p class="mute" style="font-size:18px;margin:18px 0 28px">AI-powered platform to connect students with real opportunities and teams.</p>
          <div class="row wrap-row">
            <button class="btn" onclick="chooseRole('student')">🎓 I'm a Student →</button>
            <button class="btn ghost" onclick="chooseRole('org')">💼 I'm an Organization →</button>
          </div>
          <div class="feat"><span>⚡ Smart Matching</span><span>🛡️ Skill-Based</span><span>🚀 Build Impact</span></div>
        </div>
        <div class="center big">🤝</div>
      </section></div>`;
  },

  /* 2 ── student onboarding */
  onboarding() {
    const u = S.user;
    return `<div class="fade">
      <div class="top">${logo}<a onclick="go('#/profile')">Skip →</a></div>
      <div class="wrap"><div class="card two">
        <div>
          <h2>🎓 Student Portal</h2><p class="mute">Tell us about yourself</p>
          <label>Your Name *</label>
          <input class="${cls("name")}" value="${esc(u.name)}" placeholder="e.g. Rahul Das" oninput="S.user.name=this.value;save()">${field("name")}
          <label>College / University *</label>
          <input class="${cls("college")}" value="${esc(u.college)}" placeholder="e.g. JISCE" oninput="S.user.college=this.value;save()">${field("college")}
          <label>Short Bio *</label>
          <textarea class="${cls("bio")}" placeholder="What do you love building?" oninput="S.user.bio=this.value;save()">${esc(u.bio)}</textarea>${field("bio")}
        </div>
        <div style="display:flex;flex-direction:column;justify-content:space-between">
          <div>
            <h3 style="margin-top:0">Connect Your GitHub</h3>
            <p class="mute">Link your public GitHub profile to showcase your projects.</p>
            <input style="margin-top:10px" value="${esc(u.github)}" placeholder="https://github.com/username" oninput="S.user.github=this.value;save()">
            <label>Your Skills * <span class="mute" style="font-weight:400">(press Enter to add)</span></label>
            <div class="add-row">
              <input id="skill-in" class="${cls("skills")}" placeholder="e.g. Python" list="skill-list" onkeydown="if(event.key==='Enter')addSkill('user')">
              <button class="btn sm" onclick="addSkill('user')">Add</button>
            </div>
            <datalist id="skill-list">${uniq(OPPS.flatMap(o => o.skills).concat(STUDENTS.flatMap(s => s.skills))).map(s => `<option value="${esc(s)}">`).join("")}</datalist>
            ${field("skills")}
            <div>${u.skills.map(s => `<span class="tag">${esc(s)}<button onclick="removeSkill('user','${esc(s)}')">×</button></span>`).join("")}</div>
          </div>
          <button class="btn full" style="margin-top:20px" onclick="buildProfile()">Build My Profile →</button>
        </div>
      </div></div></div>`;
  },

  /* 3 ── profile */
  profile() {
    const u = S.user, st = strength();
    return `<div class="layout fade">${side("profile")}<main class="card">
      <h2>My Profile <span class="tag g">${st >= 80 ? "Profile Completed ✓" : "In progress"}</span></h2>
      <div class="two" style="grid-template-columns:2fr 1fr;margin-top:16px">
        <div>
          <div class="row"><div class="avatar lg">${esc(ini(u.name))}</div>
            <div><h2 style="margin:0">${esc(u.name)}</h2><span class="mute">${esc(u.college)}</span></div></div>
          <p style="margin:16px 0">${esc(u.bio)}</p>
          ${u.github ? `<p class="mute" style="margin-bottom:10px"><a href="${esc(u.github)}" target="_blank" rel="noopener">🔗 ${esc(u.github.replace(/^https?:\/\//, ""))}</a></p>` : ""}
          <h3>Your Skills</h3>
          ${u.skills.map(s => `<div class="box line"><b>${esc(s)}</b>
            <button class="btn ghost sm" onclick="removeSkill('user','${esc(s)}')">Remove</button></div>`).join("")}
          <button class="btn ghost sm" onclick="go('#/onboarding')">✏️ Edit profile</button>
        </div>
        <div class="box center"><b>Profile Strength</b>
          <div class="ring" style="background:conic-gradient(var(--ok) ${st}%,#e8eaf6 0)"><span>${st}%</span></div>
          <b>${st >= 80 ? "Excellent!" : "Keep going"}</b>
          <p class="mute">${st >= 80 ? "You're all set." : "Add a GitHub link and more skills."}</p>
          <button class="btn sm full" style="margin-top:12px" onclick="go('#/matches')">See Matches →</button>
        </div>
      </div></main></div>`;
  },

  /* 4 ── matches */
  matches() {
    const list = OPPS.map(o => ({ ...o, score: pct(S.user.skills, o.skills) })).sort((a, b) => b.score - a.score);
    return `<div class="layout fade">${side("matches")}<main class="card">
      <div class="row between"><div><h2>✨ Your Matches</h2><p class="mute">AI found the best opportunities for you!</p></div>
        <button class="btn ghost sm" onclick="toast('Matches refreshed');render()">⟳ Refresh</button></div>
      ${list.map(m => `<div class="match row between wrap-row">
        <div class="row"><div class="logo-sq">${m.icon}</div>
          <div><b>${esc(m.name)}</b><div class="mute">${esc(m.desc)}</div>
          <div style="margin-top:6px">${tags([m.type], m.type === "Job" ? "o" : "")}${tags([m.mode], "g")}${S.applied.includes(m.id) ? tags(["Applied"], "g") : ""}</div></div></div>
        <div class="row"><div class="score"><b>${m.score}%</b><span class="mute">Match Score</span></div>
          <button class="btn sm" onclick="go('#/match/${m.id}')">View Details →</button></div>
      </div>`).join("")}
    </main></div>`;
  },

  /* 5 ── match detail */
  match(id) {
    const m = OPPS.find(o => o.id === +id) || OPPS[0];
    const have = overlap(S.user.skills, m.skills), gap = missing(S.user.skills, m.skills), score = pct(S.user.skills, m.skills);
    const isSaved = S.saved.includes(m.id);
    const intro = `Hi ${m.name} team! I'm ${S.user.name} from ${S.user.college}. I'm excited about "${m.desc}". My skills in ${S.user.skills.join(", ")} fit what you need${S.user.github ? ", and you can see my work at " + S.user.github : ""}. I'd love to help.`;
    let body = "";
    if (ui.tab === "why") body = `<div class="box"><b style="color:var(--ok)">Strong Match Because:</b>
      ${have.length ? have.map(h => `<p>✔ You have the required skill: ${esc(h)}</p>`).join("") : "<p>No direct skill overlap yet.</p>"}
      ${S.user.github ? "<p>✔ Your GitHub projects back up your skills</p>" : ""}</div>`;
    if (ui.tab === "gap") body = `<div class="box"><b style="color:var(--warn)">⚠ Skill Gap:</b>
      ${gap.length ? gap.map(g => `<p>• ${esc(g)} — worth learning before you apply</p>`).join("") : "<p>✔ You cover every required skill!</p>"}</div>`;
    if (ui.tab === "intro") body = `<div class="box"><b>Suggested Intro (editable):</b>
      <textarea id="intro-text" style="margin-top:8px">${esc(intro)}</textarea>
      <button class="btn ghost sm" style="margin-top:8px" onclick="copyIntro()">Copy</button></div>`;
    return `<div class="wrap fade"><a class="mute" onclick="go('#/matches')">← Back</a>
      <div class="card" style="margin-top:12px">
        <div class="row between wrap-row">
          <div class="row"><div class="logo-sq xl">${m.icon}</div><div><h2 style="margin:0">${esc(m.name)}</h2><span class="mute">${esc(m.desc)}</span></div></div>
          <span class="pill ${pillClass(score)}">${score}% Match</span></div>
        <div class="tabs">${[["why", "Why This Match?"], ["gap", "Skill Gap"], ["intro", "Draft Intro"]]
          .map(([k, l]) => `<button class="${ui.tab === k ? "on" : ""}" onclick="ui.tab='${k}';render()">${l}</button>`).join("")}</div>
        ${body}
        <div class="row" style="margin-top:20px">
          <button class="btn ghost full" onclick="toggleSave(${m.id})">${isSaved ? "★ Saved" : "🔖 Save"}</button>
          <button class="btn full" onclick="applyTo(${m.id})">${S.applied.includes(m.id) ? "Applied ✓ – View Team" : "Apply / Send Intro →"}</button>
        </div></div></div>`;
  },

  /* 6 ── post a need (organization) */
  post() {
    const n = S.need;
    return `<div class="layout fade">${side("post")}<main class="card">
      <h2>Post a Need</h2><p class="mute">Tell us what you need — a job, internship or a problem.</p>
      <div class="seg">${["Job", "Internship", "Problem"].map(t => `<button class="${n.type === t ? "on" : ""}" onclick="S.need.type='${t}';save();render()">${t}</button>`).join("")}</div>
      <div class="two">
        <div>
          <label>Title</label>
          <input value="${esc(n.title)}" placeholder="e.g. Bakery ordering system" oninput="S.need.title=this.value;save()">
          <label>Describe your need *</label>
          <textarea class="${cls("need")}" placeholder="What do you need built or solved?" oninput="S.need.text=this.value;S.need.analyzed=false;save()">${esc(n.text)}</textarea>${field("need")}
          <button class="btn full" id="analyze-btn" onclick="analyze()">Analyze with AI →</button>
        </div>
        <div class="box">${n.analyzed ? `
          <b>AI Breakdown (Editable) ✓</b>
          <p style="margin-top:8px"><b>Required Skills:</b></p>
          <div>${n.skills.map(s => `<span class="tag">${esc(s)}<button onclick="removeSkill('need','${esc(s)}')">×</button></span>`).join("")}</div>
          <div class="add-row" style="margin-top:8px"><input id="skill-in" placeholder="Add skill" onkeydown="if(event.key==='Enter')addSkill('need')"><button class="btn sm" onclick="addSkill('need')">Add</button></div>
          <p style="margin-top:12px"><b>Tasks:</b></p>
          <ol style="padding-left:18px">${n.tasks.map(t => `<li>${esc(t)}</li>`).join("")}</ol>
          <button class="btn full sm" style="margin-top:14px" onclick="findStudents()">Find Matching Students →</button>
        ` : `<span class="mute">Click “Analyze with AI” and the breakdown appears here.</span>`}</div>
      </div></main></div>`;
  },

  /* 7 ── ranked students */
  ranked() {
    const list = rankStudents(S.need.skills);
    return `<div class="wrap fade"><a class="mute" onclick="go('#/post')">← Back</a>
      <div class="card" style="margin-top:12px">
        <h2>Ranked Students</h2><p class="mute" style="margin-bottom:16px">Top matches for: ${esc(S.need.title || S.need.text.slice(0, 50))}</p>
        ${list.slice(0, 5).map((s, i) => `<div class="rank">
          <span class="n">${i + 1}.</span><div class="avatar">${esc(ini(s.name))}</div>
          <div><b>${esc(s.name)}</b><div class="mute">${esc(s.college)}</div></div>
          <div class="skills">${tags(s.skills)}</div>
          <div class="row"><span class="pill ${pillClass(s.score)}">${s.score}%</span>
            <button class="btn sm" onclick="formTeam(${i})">View</button></div></div>`).join("")}
        <button class="btn full" style="margin-top:10px" onclick="formTeam(0)">Form Team from Top 3 →</button>
      </div></div>`;
  },

  /* 8 ── team formed */
  team() {
    setTimeout(confetti, 150);
    const roles = ["Lead", "Developer", "Specialist"];
    return `<div class="wrap center fade" style="padding-top:60px">
      <div style="font-size:70px">🏆</div>
      <h1 style="font-size:36px">Team Formed! 🎉</h1>
      <p class="mute">Your team for ${esc(S.teamFor)} is ready.</p>
      <div class="team-row">${S.team.map((m, i) => `${i ? '<span class="plus">+</span>' : ""}
        <div><div class="avatar lg" style="margin:auto">${esc(ini(m.name))}</div>
        <b style="display:block;margin-top:8px">${esc(m.name)}</b><span class="mute">(${roles[i] || "Member"})</span></div>`).join("")}</div>
      <div class="row wrap-row" style="justify-content:center">
        <button class="btn" onclick="copyTeam()">View Team & Intro →</button>
        <button class="btn ghost" onclick="go('${dashboard()}')">Back to Dashboard</button>
      </div>
      <p style="margin-top:18px"><a class="mute" onclick="go('#/final')">Finish →</a></p></div>`;
  },

  /* 9 ── brand / closing page */
  final() {
    return `<div class="fade"><div class="top">${logo}</div>
      <section class="hero" style="margin-top:80px"><div>
        <h1 style="font-size:60px">SkillBridge</h1>
        <h2 style="font-size:28px;margin-top:10px">A smarter way to connect talent with opportunity.</h2>
        <p class="mute" style="margin:14px 0 24px">Because skills matter more than pedigree.</p>
        <button class="btn" onclick="go('#/home')">Let's Build the Future →</button>
        <div class="feat"><span>🧠 AI Matching</span><span>🛡️ Skill-Based</span><span>🚀 Real Impact</span></div>
      </div><div class="center big">🛰️</div></section></div>`;
  },

  /* extra sidebar pages */
  saved() {
    return `<div class="layout fade">${side("saved")}<main class="card"><h2>Saved</h2>
      ${S.saved.length ? S.saved.map(i => { const o = OPPS.find(x => x.id === i); return `<div class="match row between">
        <b>${o.icon} ${esc(o.name)}</b><button class="btn sm" onclick="go('#/match/${i}')">Open</button></div>`; }).join("")
        : '<p class="mute">Nothing saved yet. Open a match and tap Save.</p>'}</main></div>`;
  },
  settings() {
    return `<div class="layout fade">${side("settings")}<main class="card"><h2>Settings</h2>
      <p class="mute" style="margin-bottom:16px">Clear all saved data and start over.</p>
      <button class="btn" onclick="resetAll()">Reset everything</button></main></div>`;
  }
};

/* ---------- actions ---------- */
function chooseRole(r) {
  S.role = r; save();
  go(r === "student" ? (profileDone() ? "#/profile" : "#/onboarding") : "#/post");
}

function addSkill(who) {
  const inp = $("#skill-in"), v = inp.value.trim();
  if (!v) return;
  const arr = who === "user" ? S.user.skills : S.need.skills;
  if (arr.some(s => norm(s) === norm(v))) { toast("Already added"); return; }
  arr.push(v.replace(/\b\w/g, c => c.toUpperCase()));
  delete ui.errors.skills; save(); render();
  setTimeout(() => $("#skill-in")?.focus(), 0);
}
function removeSkill(who, skill) {
  const key = who === "user" ? S.user : S.need;
  key.skills = key.skills.filter(s => s !== skill);
  save(); render();
}

function buildProfile() {
  const u = S.user; ui.errors = {};
  if (!u.name.trim()) ui.errors.name = "Please enter your name";
  if (!u.college.trim()) ui.errors.college = "Please enter your college";
  if (!u.bio.trim()) ui.errors.bio = "Write a short bio";
  if (!u.skills.length) ui.errors.skills = "Add at least one skill";
  if (u.github && !/^https?:\/\//.test(u.github)) u.github = "https://" + u.github;
  if (Object.keys(ui.errors).length) { toast("Please fix the highlighted fields"); render(); return; }
  save(); toast("Profile built!"); go("#/profile");
}

function toggleSave(id) {
  S.saved = S.saved.includes(id) ? S.saved.filter(x => x !== id) : [...S.saved, id];
  save(); toast(S.saved.includes(id) ? "Saved" : "Removed from saved"); render();
}
function copyIntro() {
  const t = $("#intro-text").value;
  navigator.clipboard?.writeText(t).then(() => toast("Intro copied"), () => toast("Copy failed"));
}
function applyTo(id) {
  const o = OPPS.find(x => x.id === id);
  if (!S.applied.includes(id)) { S.applied.push(id); toast("Intro sent to " + o.name); }
  const mates = STUDENTS.map(s => ({ ...s, score: pct(s.skills, o.skills) })).sort((a, b) => b.score - a.score).slice(0, 2);
  S.team = [{ name: S.user.name, skills: S.user.skills }, ...mates];
  S.teamFor = o.name; save(); go("#/team");
}

function analyze() {
  const n = S.need; ui.errors = {};
  if (n.text.trim().length < 10) { ui.errors.need = "Describe your need in a few more words"; render(); return; }
  const btn = $("#analyze-btn"); btn.textContent = "Analyzing…"; btn.disabled = true;
  setTimeout(() => {
    n.skills = uniq(KEYWORDS.filter(([re]) => re.test(n.text + " " + n.title)).map(k => k[1]));
    if (!n.skills.length) toast("No skills detected – add them manually");
    n.tasks = n.skills.map(s => TASK_FOR[s]).filter(Boolean);
    n.analyzed = true; save(); render();
  }, 800);
}
function findStudents() {
  if (!S.need.skills.length) { toast("Add at least one required skill"); return; }
  go("#/ranked");
}
function formTeam(i) {
  const ranked = rankStudents(S.need.skills);
  S.team = i === 0 ? ranked.slice(0, 3) : [ranked[i], ...ranked.filter((_, k) => k !== i).slice(0, 2)];
  S.teamFor = S.need.title || "your project"; save(); go("#/team");
}
function copyTeam() {
  const roles = ["Lead", "Developer", "Specialist"];
  const text = `Team for ${S.teamFor}:\n` + S.team.map((m, i) => `- ${m.name} (${roles[i] || "Member"})`).join("\n");
  navigator.clipboard?.writeText(text).then(() => toast("Team details copied"), () => toast("Team ready!"));
}
function resetAll() {
  localStorage.removeItem(KEY); S = clone(DEFAULT); ui = { tab: "why", errors: {}, loading: false };
  toast("Data reset"); go("#/home");
}

function confetti() {
  if (document.querySelector(".confetti")) return;
  const c = document.createElement("div"); c.className = "confetti";
  const cols = ["#5b4bdb", "#f5a623", "#1fa971", "#e8505b", "#3b82f6"];
  for (let i = 0; i < 60; i++) {
    const e = document.createElement("i");
    e.style.cssText = `left:${Math.random() * 100}%;background:${cols[i % 5]};animation-duration:${2 + Math.random() * 2}s;animation-delay:${Math.random()}s`;
    c.appendChild(e);
  }
  document.body.appendChild(c); setTimeout(() => c.remove(), 5000);
}

/* ---------- router with guards ---------- */
function render() {
  let [, route = "home", param] = (location.hash || "#/home").split("/");
  if (!pages[route]) route = "home";
  if (["profile", "matches", "match", "saved"].includes(route) && !profileDone()) {
    toast("Complete your profile first"); S.role = "student"; return go("#/onboarding");
  }
  if (route === "ranked" && !S.need.analyzed) { toast("Analyze your need first"); return go("#/post"); }
  if (route === "team" && !S.team.length) return go("#/home");
  $("#app").innerHTML = pages[route](param);
}
window.addEventListener("hashchange", () => { ui.tab = "why"; ui.errors = {}; render(); window.scrollTo(0, 0); });
render();
