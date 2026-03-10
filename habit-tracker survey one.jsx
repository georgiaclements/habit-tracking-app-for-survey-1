import { useState, useEffect, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

// ─── Constants ────────────────────────────────────────────────────────────────
const ADMIN_USER = "admin";
const ADMIN_PASS = "admin123";

const CATEGORIES = [
  { id: "exercise",  label: "Exercise",  icon: "🏃", color: "#a8e6cf", accent: "#5ec49a" },
  { id: "wellbeing", label: "Wellbeing", icon: "🧘", color: "#d4a5f5", accent: "#a855f7" },
  { id: "nutrition", label: "Nutrition", icon: "🥗", color: "#ffd3b6", accent: "#f59e42" },
  { id: "learning",  label: "Learning",  icon: "📖", color: "#a0c4ff", accent: "#60a5fa" },
  { id: "social",    label: "Social",    icon: "👥", color: "#f5a5c8", accent: "#ec4899" },
  { id: "other",     label: "Other",     icon: "⭐", color: "#e8e8a0", accent: "#c4b300" },
];
const CAT_MAP = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));
const HABIT_ICONS = ["🏃","🚴","🏋️","🧘","🚶","💧","🥗","🍎","📖","✍️","🎯","💡","👥","🛌","☀️","🎨","🎵","💰","🧹","⭐"];

const todayKey = () => new Date().toISOString().split("T")[0];
const getLast7 = () => {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    days.push({ key: d.toISOString().split("T")[0], label: i === 0 ? "Today" : d.toLocaleDateString("en-GB",{weekday:"short"}) });
  }
  return days;
};

const genCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

// ─── Storage ──────────────────────────────────────────────────────────────────
const simpleHash = str => { let h=0; for(let i=0;i<str.length;i++) h=(Math.imul(31,h)+str.charCodeAt(i))|0; return h.toString(36); };
const sg = async k => { try { const r=await window.storage.get(k); return r?JSON.parse(r.value):null; } catch{return null;} };
const ss = async (k,v) => { try { await window.storage.set(k,JSON.stringify(v)); } catch{} };
const loadUser     = async u  => sg(`user:${u}`);
const saveUser     = async (u,ph) => ss(`user:${u}`,{username:u,passwordHash:ph,createdAt:Date.now()});
const loadData     = async u  => sg(`data:${u}`);
const saveData     = async (u,d) => ss(`data:${u}`,d);
const loadUserList = async () => (await sg("userlist")) || [];
const saveUserList = async l  => ss("userlist",l);
const loadChallenges = async () => (await sg("challenges")) || [];
const saveChallenges = async c => ss("challenges", c);

// ─── Style tokens ─────────────────────────────────────────────────────────────
const T = {
  bg:"#09090f", surface:"#0d0d1f", border:"#191932", muted:"#2a2a50",
  dim:"#3a3a68", sub:"#5a5a90", text:"#dcdcff", bright:"#f0f0ff",
  blue:"#8aabff", font:"'DM Sans','Segoe UI',sans-serif"
};
const inp = { width:"100%", background:"#0d0d1f", border:`1px solid ${T.border}`, borderRadius:11, color:T.text, fontSize:14, padding:"11px 14px", outline:"none", fontFamily:T.font, boxSizing:"border-box", transition:"border-color 0.2s" };
const primaryBtn = { width:"100%", padding:"12px", background:"linear-gradient(135deg,#2e2e8a,#1e3a8a)", border:"none", borderRadius:11, color:T.bright, fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:T.font, transition:"opacity 0.2s" };

// ─── Edit Modal ───────────────────────────────────────────────────────────────
function EditHabitModal({ habit, onSave, onClose }) {
  const [draft, setDraft] = useState({ ...habit });
  const overlayRef = useRef(null);
  const handleOverlayClick = e => { if (e.target === overlayRef.current) onClose(); };
  useEffect(() => {
    const handler = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  const cat = CAT_MAP[draft.category] || CAT_MAP.other;
  return (
    <div ref={overlayRef} onClick={handleOverlayClick} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", backdropFilter:"blur(4px)", display:"flex", alignItems:"flex-end", justifyContent:"center", zIndex:100, padding:"0 0 0 0", animation:"fadeIn 0.18s ease" }}>
      <div style={{ width:"100%", maxWidth:480, background:T.surface, border:`1px solid ${T.border}`, borderRadius:"20px 20px 0 0", padding:"20px 20px 36px", animation:"slideUp 0.22s cubic-bezier(0.34,1.1,0.64,1)" }}>
        <div style={{ width:36, height:3, background:T.muted, borderRadius:2, margin:"0 auto 18px" }} />
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
          <h3 style={{ margin:0, fontSize:16, fontWeight:700, color:T.bright }}>Edit habit</h3>
          <button onClick={onClose} style={{ background:"none", border:"none", color:T.dim, cursor:"pointer", fontSize:20, padding:"0 4px", lineHeight:1 }}>×</button>
        </div>
        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:10, color:T.dim, textTransform:"uppercase", letterSpacing:"0.08em", display:"block", marginBottom:7 }}>Category</label>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
            {CATEGORIES.map(c => (
              <button key={c.id} onClick={() => setDraft(d => ({ ...d, category:c.id, color:c.color }))} style={{ padding:"5px 11px", borderRadius:20, border:"1px solid", borderColor: draft.category===c.id ? c.accent : T.border, background: draft.category===c.id ? `${c.accent}18` : "transparent", color: draft.category===c.id ? c.accent : T.dim, fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:T.font }}>{c.icon} {c.label}</button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:10, color:T.dim, textTransform:"uppercase", letterSpacing:"0.08em", display:"block", marginBottom:7 }}>Icon</label>
          <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
            {HABIT_ICONS.map(ic => (
              <button key={ic} onClick={() => setDraft(d => ({ ...d, icon:ic }))} style={{ width:34, height:34, borderRadius:9, border:"1px solid", borderColor: draft.icon===ic ? T.blue : T.border, background: draft.icon===ic ? "rgba(138,171,255,0.1)" : "transparent", fontSize:17, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>{ic}</button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:10, color:T.dim, textTransform:"uppercase", letterSpacing:"0.08em", display:"block", marginBottom:7 }}>Name</label>
          <input value={draft.name} onChange={e => setDraft(d => ({ ...d, name:e.target.value }))} style={inp} placeholder="Habit name…" onKeyDown={e => e.key==="Enter" && draft.name.trim() && onSave(draft)} autoFocus />
        </div>
        <div style={{ marginBottom:20 }}>
          <label style={{ fontSize:10, color:T.dim, textTransform:"uppercase", letterSpacing:"0.08em", display:"block", marginBottom:7 }}>Points</label>
          <div style={{ display:"flex", gap:7 }}>
            {[5,10,15,20,30,50].map(pt => (
              <button key={pt} onClick={() => setDraft(d => ({ ...d, points:pt }))} style={{ padding:"5px 11px", borderRadius:8, border:"1px solid", borderColor: draft.points===pt ? T.blue : T.border, background: draft.points===pt ? "rgba(138,171,255,0.08)" : "transparent", color: draft.points===pt ? T.blue : T.dim, fontSize:12, cursor:"pointer", fontFamily:T.font }}>{pt}</button>
            ))}
          </div>
        </div>
        <div style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:13, padding:"12px 14px", marginBottom:16, display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:24, height:24, borderRadius:7, background:cat.color, display:"flex", alignItems:"center", justifyContent:"center" }}><span style={{ fontSize:12, color:"#0a0a18", fontWeight:700 }}>✓</span></div>
          <span style={{ fontSize:16 }}>{draft.icon}</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{draft.name || "Habit name…"}</div>
            <div style={{ fontSize:11, color:T.dim, marginTop:1 }}>{cat.icon} {cat.label} · +{draft.points} pts</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={() => draft.name.trim() && onSave(draft)} style={{ ...primaryBtn, flex:1, opacity: draft.name.trim() ? 1 : 0.4 }}>Save changes</button>
          <button onClick={onClose} style={{ padding:"11px 16px", background:"transparent", border:`1px solid ${T.border}`, borderRadius:11, color:T.dim, cursor:"pointer", fontFamily:T.font, fontSize:13 }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ─── Create Challenge Modal ───────────────────────────────────────────────────
function CreateChallengeModal({ username, habits, onClose, onCreated }) {
  const [name, setName] = useState("");
  const [selectedHabit, setSelectedHabit] = useState(habits[0]?.id || null);
  const [duration, setDuration] = useState(7);
  const [isPrivate, setIsPrivate] = useState(false);
  const overlayRef = useRef(null);

  const create = async () => {
    if (!name.trim() || !selectedHabit) return;
    const habit = habits.find(h => h.id === selectedHabit);
    const challenge = {
      id: Date.now(),
      name: name.trim(),
      habit: { ...habit },
      creator: username,
      participants: [username],
      duration,
      startDate: todayKey(),
      endDate: (() => {
        const d = new Date();
        d.setDate(d.getDate() + duration - 1);
        return d.toISOString().split("T")[0];
      })(),
      scores: { [username]: 0 },
      completions: { [username]: {} },
      isPrivate,
      inviteCode: isPrivate ? genCode() : null
    };
    const challenges = await loadChallenges();
    await saveChallenges([...challenges, challenge]);
    onCreated();
    onClose();
  };

  return (
    <div ref={overlayRef} onClick={e => e.target === overlayRef.current && onClose()} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", backdropFilter:"blur(4px)", display:"flex", alignItems:"flex-end", justifyContent:"center", zIndex:100, animation:"fadeIn 0.18s ease" }}>
      <div style={{ width:"100%", maxWidth:480, background:T.surface, border:`1px solid ${T.border}`, borderRadius:"20px 20px 0 0", padding:"20px 20px 36px", animation:"slideUp 0.22s cubic-bezier(0.34,1.1,0.64,1)" }}>
        <div style={{ width:36, height:3, background:T.muted, borderRadius:2, margin:"0 auto 18px" }} />
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
          <h3 style={{ margin:0, fontSize:16, fontWeight:700, color:T.bright }}>Create Challenge</h3>
          <button onClick={onClose} style={{ background:"none", border:"none", color:T.dim, cursor:"pointer", fontSize:20, padding:"0 4px", lineHeight:1 }}>×</button>
        </div>

        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:10, color:T.dim, textTransform:"uppercase", letterSpacing:"0.08em", display:"block", marginBottom:7 }}>Challenge Name</label>
          <input value={name} onChange={e => setName(e.target.value)} style={inp} placeholder="e.g. 7-Day Morning Run" autoFocus />
        </div>

        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:10, color:T.dim, textTransform:"uppercase", letterSpacing:"0.08em", display:"block", marginBottom:7 }}>Habit to Track</label>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {habits.map(h => {
              const cat = CAT_MAP[h.category] || CAT_MAP.other;
              return (
                <button key={h.id} onClick={() => setSelectedHabit(h.id)} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:11, border:"1px solid", borderColor: selectedHabit===h.id ? T.blue : T.border, background: selectedHabit===h.id ? "rgba(138,171,255,0.07)" : T.bg, cursor:"pointer", textAlign:"left", fontFamily:T.font }}>
                  <span style={{ fontSize:16 }}>{h.icon}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{h.name}</div>
                    <div style={{ fontSize:11, color:T.dim }}>{cat.icon} {cat.label}</div>
                  </div>
                  {selectedHabit===h.id && <span style={{ fontSize:13, color:T.blue }}>✓</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:10, color:T.dim, textTransform:"uppercase", letterSpacing:"0.08em", display:"block", marginBottom:7 }}>Duration</label>
          <div style={{ display:"flex", gap:7 }}>
            {[3,7,14,30].map(d => (
              <button key={d} onClick={() => setDuration(d)} style={{ padding:"7px 13px", borderRadius:9, border:"1px solid", borderColor: duration===d ? T.blue : T.border, background: duration===d ? "rgba(138,171,255,0.08)" : "transparent", color: duration===d ? T.blue : T.dim, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:T.font }}>{d} days</button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom:20 }}>
          <label style={{ fontSize:10, color:T.dim, textTransform:"uppercase", letterSpacing:"0.08em", display:"block", marginBottom:7 }}>Privacy</label>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={() => setIsPrivate(false)} style={{ flex:1, padding:"10px 12px", borderRadius:11, border:"1px solid", borderColor: !isPrivate ? T.blue : T.border, background: !isPrivate ? "rgba(138,171,255,0.07)" : T.bg, cursor:"pointer", fontFamily:T.font }}>
              <div style={{ fontSize:13, fontWeight:600, color: !isPrivate ? T.blue : T.text }}>🌍 Public</div>
              <div style={{ fontSize:10, color:T.dim, marginTop:2 }}>Anyone can join</div>
            </button>
            <button onClick={() => setIsPrivate(true)} style={{ flex:1, padding:"10px 12px", borderRadius:11, border:"1px solid", borderColor: isPrivate ? T.blue : T.border, background: isPrivate ? "rgba(138,171,255,0.07)" : T.bg, cursor:"pointer", fontFamily:T.font }}>
              <div style={{ fontSize:13, fontWeight:600, color: isPrivate ? T.blue : T.text }}>🔒 Private</div>
              <div style={{ fontSize:10, color:T.dim, marginTop:2 }}>Invite code required</div>
            </button>
          </div>
        </div>

        <div style={{ display:"flex", gap:8 }}>
          <button onClick={create} style={{ ...primaryBtn, flex:1, opacity: name.trim() && selectedHabit ? 1 : 0.4 }}>Create Challenge</button>
          <button onClick={onClose} style={{ padding:"11px 16px", background:"transparent", border:`1px solid ${T.border}`, borderRadius:11, color:T.dim, cursor:"pointer", fontFamily:T.font, fontSize:13 }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ─── Join by Code Modal ───────────────────────────────────────────────────────
function JoinByCodeModal({ username, onClose, onJoin }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const join = async () => {
    setError("");
    if (!code.trim()) { setError("Please enter an invite code"); return; }
    setLoading(true);
    const challenges = await loadChallenges();
    const challenge = challenges.find(c => c.inviteCode === code.trim().toUpperCase());
    if (!challenge) {
      setError("Invalid invite code");
      setLoading(false);
      return;
    }
    if (challenge.participants.includes(username)) {
      setError("You're already in this challenge");
      setLoading(false);
      return;
    }
    onJoin(challenge);
    setLoading(false);
    onClose();
  };

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", backdropFilter:"blur(4px)", display:"flex", alignItems:"flex-end", justifyContent:"center", zIndex:100, animation:"fadeIn 0.18s ease" }}>
      <div style={{ width:"100%", maxWidth:480, background:T.surface, border:`1px solid ${T.border}`, borderRadius:"20px 20px 0 0", padding:"20px 20px 36px", animation:"slideUp 0.22s cubic-bezier(0.34,1.1,0.64,1)" }}>
        <div style={{ width:36, height:3, background:T.muted, borderRadius:2, margin:"0 auto 18px" }} />
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
          <h3 style={{ margin:0, fontSize:16, fontWeight:700, color:T.bright }}>Join Private Challenge</h3>
          <button onClick={onClose} style={{ background:"none", border:"none", color:T.dim, cursor:"pointer", fontSize:20, padding:"0 4px", lineHeight:1 }}>×</button>
        </div>

        <div style={{ marginBottom:16 }}>
          <label style={{ fontSize:10, color:T.dim, textTransform:"uppercase", letterSpacing:"0.08em", display:"block", marginBottom:7 }}>Invite Code</label>
          <input 
            value={code} 
            onChange={e => setCode(e.target.value.toUpperCase())} 
            style={{ ...inp, textTransform:"uppercase", letterSpacing:"2px", fontSize:16, fontWeight:700 }} 
            placeholder="ABC123" 
            maxLength={6}
            autoFocus
            onKeyDown={e => e.key === "Enter" && join()}
          />
          {error && <div style={{ marginTop:8, fontSize:12, color:"#ff8080" }}>{error}</div>}
        </div>

        <div style={{ display:"flex", gap:8 }}>
          <button onClick={join} disabled={loading} style={{ ...primaryBtn, flex:1, opacity: code.trim().length === 6 && !loading ? 1 : 0.4 }}>
            {loading ? "..." : "Join Challenge"}
          </button>
          <button onClick={onClose} style={{ padding:"11px 16px", background:"transparent", border:`1px solid ${T.border}`, borderRadius:11, color:T.dim, cursor:"pointer", fontFamily:T.font, fontSize:13 }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ─── Challenge Detail Modal ───────────────────────────────────────────────────
function ChallengeDetailModal({ challenge, username, onClose, onJoin, onLeave, onUpdate, onDelete }) {
  const isParticipant = challenge.participants.includes(username);
  const isCreator = challenge.creator === username;
  const cat = CAT_MAP[challenge.habit.category] || CAT_MAP.other;
  const [copied, setCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const leaderboard = challenge.participants.map(u => ({
    username: u,
    score: challenge.scores[u] || 0,
    completions: Object.keys(challenge.completions[u] || {}).filter(d => challenge.completions[u][d]).length
  })).sort((a, b) => b.score - a.score);

  const daysLeft = (() => {
    const end = new Date(challenge.endDate);
    const now = new Date(todayKey());
    return Math.max(0, Math.ceil((end - now) / (1000*60*60*24)) + 1);
  })();

  const myCompletions = challenge.completions[username] || {};
  const last7 = getLast7().filter(d => d.key >= challenge.startDate && d.key <= challenge.endDate);
  const chartData = last7.map(({ key, label }) => ({
    label,
    points: myCompletions[key] ? challenge.habit.points : 0
  }));

  const copyCode = () => {
    if (challenge.inviteCode) {
      navigator.clipboard.writeText(challenge.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDelete = () => {
    onDelete(challenge.id);
    onClose();
  };

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", backdropFilter:"blur(4px)", display:"flex", alignItems:"flex-end", justifyContent:"center", zIndex:100, animation:"fadeIn 0.18s ease" }}>
      <div style={{ width:"100%", maxWidth:480, maxHeight:"85vh", overflowY:"auto", background:T.surface, border:`1px solid ${T.border}`, borderRadius:"20px 20px 0 0", padding:"20px 20px 36px", animation:"slideUp 0.22s cubic-bezier(0.34,1.1,0.64,1)" }}>
        <div style={{ width:36, height:3, background:T.muted, borderRadius:2, margin:"0 auto 18px" }} />
        
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:18 }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <h3 style={{ margin:0, fontSize:18, fontWeight:700, color:T.bright }}>{challenge.name}</h3>
              {challenge.isPrivate && <span style={{ fontSize:18 }}>🔒</span>}
            </div>
            <p style={{ margin:"4px 0 0", fontSize:12, color:T.dim }}>
              {daysLeft > 0 ? `${daysLeft} days left` : "Challenge ended"}
            </p>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:T.dim, cursor:"pointer", fontSize:20, padding:"0 4px", lineHeight:1 }}>×</button>
        </div>

        {/* Invite code (if private & creator) */}
        {challenge.isPrivate && isCreator && (
          <div style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:11, padding:"12px 14px", marginBottom:16 }}>
            <div style={{ fontSize:10, color:T.dim, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>Invite Code</div>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ flex:1, fontSize:20, fontWeight:800, letterSpacing:"3px", color:T.blue }}>{challenge.inviteCode}</div>
              <button onClick={copyCode} style={{ padding:"6px 12px", background:copied?"rgba(100,200,100,0.15)":"rgba(138,171,255,0.1)", border:`1px solid ${copied?"rgba(100,200,100,0.3)":T.blue}`, borderRadius:8, color:copied?"#6cc86c":T.blue, cursor:"pointer", fontSize:11, fontWeight:600, fontFamily:T.font }}>
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <div style={{ fontSize:11, color:T.dim, marginTop:6 }}>Share this code with friends to invite them</div>
          </div>
        )}

        {/* Habit card */}
        <div style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:13, padding:"12px 14px", marginBottom:16, display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:28, height:28, borderRadius:8, background:cat.color, display:"flex", alignItems:"center", justifyContent:"center" }}><span style={{ fontSize:14, color:"#0a0a18", fontWeight:700 }}>✓</span></div>
          <span style={{ fontSize:18 }}>{challenge.habit.icon}</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, fontWeight:600, color:T.text }}>{challenge.habit.name}</div>
            <div style={{ fontSize:11, color:T.dim, marginTop:1 }}>{cat.icon} {cat.label} · +{challenge.habit.points} pts/day</div>
          </div>
        </div>

        {/* My progress */}
        {isParticipant && (
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:10, color:T.dim, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>Your Progress</div>
            <div style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:13, padding:"14px 16px" }}>
              <ResponsiveContainer width="100%" height={100}>
                <LineChart data={chartData} margin={{top:5,right:10,left:-22,bottom:5}}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false}/>
                  <XAxis dataKey="label" tick={{fill:T.muted,fontSize:9}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fill:T.muted,fontSize:9}} axisLine={false} tickLine={false}/>
                  <Line type="monotone" dataKey="points" stroke={cat.accent} strokeWidth={2} dot={{fill:cat.accent,r:3,strokeWidth:0}}/>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Leaderboard */}
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:10, color:T.dim, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>Leaderboard</div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {leaderboard.map((p, idx) => (
              <div key={p.username} style={{ background:p.username===username?"rgba(138,171,255,0.06)":T.bg, border:`1px solid ${T.border}`, borderRadius:11, padding:"12px 14px", display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:28, height:28, borderRadius:"50%", background: idx===0 ? "linear-gradient(135deg,#ffd700,#ffed4e)" : idx===1 ? "linear-gradient(135deg,#c0c0c0,#e0e0e0)" : idx===2 ? "linear-gradient(135deg,#cd7f32,#e6a672)" : T.muted, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:800, color: idx<3 ? "#000" : T.dim }}>
                  {idx + 1}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:T.text }}>@{p.username}</div>
                  <div style={{ fontSize:11, color:T.dim }}>{p.completions}/{challenge.duration} days completed</div>
                </div>
                <div style={{ fontSize:16, fontWeight:800, color:T.blue }}>{p.score}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        {!showDeleteConfirm ? (
          <div style={{ display:"flex", gap:8 }}>
            {!isParticipant ? (
              <button onClick={onJoin} style={{ ...primaryBtn, flex:1 }}>Join Challenge</button>
            ) : isCreator ? (
              <button onClick={() => setShowDeleteConfirm(true)} style={{ flex:1, padding:"11px", background:"transparent", border:"1px solid rgba(255,80,80,0.3)", borderRadius:11, color:"#ff6666", cursor:"pointer", fontFamily:T.font, fontSize:13, fontWeight:600 }}>
                Delete Challenge
              </button>
            ) : (
              <button onClick={onLeave} style={{ flex:1, padding:"11px", background:"transparent", border:`1px solid ${T.border}`, borderRadius:11, color:T.dim, cursor:"pointer", fontFamily:T.font, fontSize:13 }}>Leave Challenge</button>
            )}
          </div>
        ) : (
          <div>
            <div style={{ background:"rgba(255,80,80,0.08)", border:"1px solid rgba(255,80,80,0.2)", borderRadius:11, padding:"12px 14px", marginBottom:12 }}>
              <div style={{ fontSize:13, fontWeight:600, color:"#ff8080", marginBottom:4 }}>⚠️ Delete this challenge?</div>
              <div style={{ fontSize:12, color:T.dim }}>This will remove the challenge for all {challenge.participants.length} participant{challenge.participants.length !== 1 ? "s" : ""}. This cannot be undone.</div>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={handleDelete} style={{ flex:1, padding:"11px", background:"linear-gradient(135deg,#8a2e2e,#6a1e3a)", border:"none", borderRadius:11, color:"#ffcccc", cursor:"pointer", fontFamily:T.font, fontSize:13, fontWeight:600 }}>
                Yes, Delete
              </button>
              <button onClick={() => setShowDeleteConfirm(false)} style={{ flex:1, padding:"11px", background:"transparent", border:`1px solid ${T.border}`, borderRadius:11, color:T.text, cursor:"pointer", fontFamily:T.font, fontSize:13 }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Auth Screen ──────────────────────────────────────────────────────────────
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [u, setU] = useState(""); const [p, setP] = useState("");
  const [err, setErr] = useState(""); const [loading, setLoading] = useState(false);
  const [focus, setFocus] = useState(null);
  const [vis, setVis] = useState(false);
  useEffect(() => { setTimeout(() => setVis(true), 40); }, []);

  const handle = async () => {
    setErr("");
    if (!u.trim() || !p.trim()) { setErr("Please fill in all fields."); return; }
    if (p.length < 4) { setErr("Password must be at least 4 characters."); return; }
    setLoading(true);
    const uname = u.trim().toLowerCase(); const hash = simpleHash(p);
    if (mode === "signup") {
      if (uname === ADMIN_USER) { setErr("That username is reserved."); setLoading(false); return; }
      const existing = await loadUser(uname);
      if (existing) { setErr("That username is taken."); setLoading(false); return; }
      await saveUser(uname, hash);
      const list = await loadUserList(); if (!list.includes(uname)) await saveUserList([...list, uname]);
      await saveData(uname, { habits:[], streaks:{}, completedDates:{} });
      onAuth(uname, false);
    } else {
      if (uname === ADMIN_USER && p === ADMIN_PASS) { onAuth(ADMIN_USER, true); setLoading(false); return; }
      const user = await loadUser(uname);
      if (!user || user.passwordHash !== hash) { setErr("Incorrect username or password."); setLoading(false); return; }
      onAuth(uname, false);
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight:"100vh", background:T.bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:T.font, padding:20, position:"relative", overflow:"hidden" }}>
      <div style={{ position:"fixed", top:"5%", left:"10%", width:360, height:360, borderRadius:"50%", background:"radial-gradient(circle,rgba(60,40,160,0.12) 0%,transparent 70%)", pointerEvents:"none" }} />
      <div style={{ position:"fixed", bottom:"5%", right:"10%", width:280, height:280, borderRadius:"50%", background:"radial-gradient(circle,rgba(20,60,140,0.10) 0%,transparent 70%)", pointerEvents:"none" }} />
      <div style={{ width:"100%", maxWidth:370, opacity:vis?1:0, transform:vis?"translateY(0)":"translateY(18px)", transition:"all 0.5s cubic-bezier(0.34,1.1,0.64,1)" }}>
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{ fontSize:30, marginBottom:6 }}>✦</div>
          <h1 style={{ margin:0, fontSize:30, fontWeight:800, color:T.bright, letterSpacing:"-1px" }}>Ritual</h1>
          <p style={{ margin:"5px 0 0", fontSize:13, color:T.dim }}>Build habits that stick.</p>
        </div>
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:20, padding:26, boxShadow:"0 20px 60px rgba(0,0,0,0.5)" }}>
          <div style={{ display:"flex", background:T.bg, borderRadius:11, padding:3, marginBottom:22 }}>
            {[["login","Sign in"],["signup","Create account"]].map(([k,l]) => (
              <button key={k} onClick={() => { setMode(k); setErr(""); }} style={{ flex:1, padding:"8px 0", borderRadius:9, border:"none", cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:T.font, background:mode===k?"#181838":"transparent", color:mode===k?T.blue:T.dim, transition:"all 0.2s", boxShadow:mode===k?"0 1px 6px rgba(0,0,0,0.4)":"none" }}>{l}</button>
            ))}
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:11 }}>
            {[["Username","text",u,setU,"u","yourname"],["Password","password",p,setP,"p","••••••"]].map(([lbl,type,val,set,fk,ph]) => (
              <div key={fk}>
                <label style={{ fontSize:10, color:T.dim, textTransform:"uppercase", letterSpacing:"0.08em", display:"block", marginBottom:5 }}>{lbl}</label>
                <input type={type} value={val} onChange={e=>set(e.target.value)} onFocus={()=>setFocus(fk)} onBlur={()=>setFocus(null)} placeholder={ph} style={{ ...inp, borderColor:focus===fk?"#5050a8":T.border }} onKeyDown={e=>e.key==="Enter"&&handle()} autoComplete={type==="password"?(mode==="signup"?"new-password":"current-password"):"username"} />
              </div>
            ))}
            {err && <div style={{ background:"rgba(255,70,70,0.06)", border:"1px solid rgba(255,70,70,0.16)", borderRadius:9, padding:"9px 13px", fontSize:13, color:"#ff8080" }}>{err}</div>}
            <button onClick={handle} disabled={loading} style={{ ...primaryBtn, marginTop:3, opacity:loading?0.6:1 }} onMouseEnter={e=>!loading&&(e.currentTarget.style.opacity="0.8")} onMouseLeave={e=>(e.currentTarget.style.opacity=loading?"0.6":"1")}>
              {loading?"...":mode==="login"?"Sign in →":"Create account →"}
            </button>
          </div>
        </div>
        <p style={{ textAlign:"center", fontSize:11, color:T.border, marginTop:16 }}>Your habits are private — only visible to you.</p>
      </div>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap'); *{box-sizing:border-box} input::placeholder{color:${T.muted}} @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}} @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
    </div>
  );
}

// ─── Admin View ───────────────────────────────────────────────────────────────
function AdminView({ onLogout }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const list = await loadUserList();
      const details = await Promise.all(list.map(async u => {
        const data = await loadData(u);
        const streaks = data?.streaks || {};
        const cd = data?.completedDates || {};
        const activeDays = Object.keys(cd).filter(d => Object.values(cd[d]).some(Boolean)).length;
        const totalPoints = Object.values(cd).reduce((sum, day) => sum + (data?.habits||[]).reduce((s,h)=>s+(day[h.id]?h.points:0),0), 0);
        return { username:u, totalHabits:data?.habits?.length||0, bestStreak:Math.max(0,...Object.values(streaks)), activeDays, totalPoints };
      }));
      setUsers(details); setLoading(false);
    })();
  }, []);

  return (
    <div style={{ minHeight:"100vh", background:T.bg, fontFamily:T.font, color:T.text, padding:"28px 20px 60px" }}>
      <div style={{ maxWidth:860, margin:"0 auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:28 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:20 }}>✦</span>
            <h1 style={{ margin:0, fontSize:22, fontWeight:800, color:T.bright }}>Ritual</h1>
            <span style={{ background:"rgba(138,171,255,0.1)", border:"1px solid rgba(138,171,255,0.2)", borderRadius:6, padding:"2px 8px", fontSize:11, color:T.blue, fontWeight:600 }}>ADMIN</span>
          </div>
          <button onClick={onLogout} style={{ background:"none", border:`1px solid ${T.border}`, borderRadius:9, color:T.dim, cursor:"pointer", fontSize:12, padding:"7px 14px", fontFamily:T.font }}>Sign out</button>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
          {[["Total Users",users.length,T.blue],["Total Habits",users.reduce((s,u)=>s+u.totalHabits,0),"#a8e6cf"],["Total Points",users.reduce((s,u)=>s+u.totalPoints,0),"#ffd3b6"]].map(([l,v,c])=>(
            <div key={l} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:14, padding:16 }}>
              <div style={{ fontSize:10, color:T.dim, textTransform:"uppercase", letterSpacing:"0.08em" }}>{l}</div>
              <div style={{ fontSize:24, fontWeight:800, color:c, marginTop:6 }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Habit App (continues in next part due to length) ────────────────────────
function HabitApp({ username, onLogout }) {
  const [habits, setHabits] = useState([]);
  const [streaks, setStreaks] = useState({});
  const [todayCompleted, setTodayCompleted] = useState({});
  const [completedDates, setCompletedDates] = useState({});
  const [activeTab, setActiveTab] = useState("today");
  const [activeCat, setActiveCat] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [newHabit, setNewHabit] = useState({ name:"", points:10, icon:"⭐", category:"other" });
  const [justCompleted, setJustCompleted] = useState(null);
  const [pointsPopup, setPointsPopup] = useState(null);
  const [editingHabit, setEditingHabit] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const saveRef = useRef(null);
  const [challenges, setChallenges] = useState([]);
  const [showCreateChallenge, setShowCreateChallenge] = useState(false);
  const [showJoinByCode, setShowJoinByCode] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState(null);

  useEffect(() => {
    (async () => {
      const data = await loadData(username);
      if (data) {
        setHabits(data.habits||[]);
        setStreaks(data.streaks||{});
        const cd = data.completedDates||{};
        setCompletedDates(cd);
        setTodayCompleted(cd[todayKey()]||{});
      }
      const ch = await loadChallenges();
      setChallenges(ch);
      setLoaded(true);
    })();
  }, [username]);

  const persist = (h,s,tc,cd) => {
    clearTimeout(saveRef.current);
    saveRef.current = setTimeout(() => saveData(username,{ habits:h, streaks:s, completedDates:{ ...cd, [todayKey()]:tc } }), 350);
  };

  const todayPoints = habits.reduce((s,h)=>s+(todayCompleted[h.id]?h.points:0),0);
  const last7 = getLast7();
  const graphData = last7.map(({ key, label }) => {
    const day = completedDates[key]||(key===todayKey()?todayCompleted:{});
    return { label, total:habits.reduce((s,h)=>s+(day[h.id]?h.points:0),0) };
  });
  const hasAnyData = graphData.some(d=>d.total>0);

  const toggleHabit = async (id) => {
    const already = todayCompleted[id];
    const habit = habits.find(h=>h.id===id);
    const newTC = { ...todayCompleted, [id]:!already };
    if (!already) {
      setJustCompleted(id);
      setPointsPopup({ id, pts:habit.points });
      setTimeout(()=>setJustCompleted(null),600);
      setTimeout(()=>setPointsPopup(null),1200);
    }
    const ns = { ...streaks, [id]:already?Math.max(0,(streaks[id]||1)-1):(streaks[id]||0)+1 };
    const newCD = { ...completedDates, [todayKey()]:newTC };
    setTodayCompleted(newTC); setStreaks(ns); setCompletedDates(newCD);
    persist(habits, ns, newTC, completedDates);
    const updated = challenges.map(ch => {
      if (!ch.participants.includes(username)) return ch;
      if (ch.habit.id !== id && ch.habit.name !== habit.name) return ch;
      const today = todayKey();
      if (today < ch.startDate || today > ch.endDate) return ch;
      const userCompletions = { ...ch.completions[username], [today]: !already };
      return {
        ...ch,
        completions: { ...ch.completions, [username]: userCompletions },
        scores: { ...ch.scores, [username]: Object.values(userCompletions).filter(Boolean).length * ch.habit.points }
      };
    });
    setChallenges(updated);
    await saveChallenges(updated);
  };

  const addHabit = () => {
    if (!newHabit.name.trim()) return;
    const id = Date.now();
    const cat = CAT_MAP[newHabit.category]||CAT_MAP.other;
    const upd = [...habits, { ...newHabit, id, color:cat.color }];
    const ns = { ...streaks, [id]:0 };
    setHabits(upd); setStreaks(ns);
    setNewHabit({ name:"", points:10, icon:"⭐", category:"other" }); setShowAdd(false);
    persist(upd, ns, todayCompleted, completedDates);
  };

  const removeHabit = id => {
    const upd = habits.filter(h=>h.id!==id);
    const newTC = { ...todayCompleted }; delete newTC[id];
    setHabits(upd); setTodayCompleted(newTC);
    persist(upd, streaks, newTC, completedDates);
  };

  const saveEdit = updated => {
    const upd = habits.map(h => h.id===updated.id ? { ...updated } : h);
    setHabits(upd); setEditingHabit(null);
    persist(upd, streaks, todayCompleted, completedDates);
  };

  const refreshChallenges = async () => {
    const ch = await loadChallenges();
    setChallenges(ch);
  };

  const joinChallenge = async (challenge) => {
    const challengeId = challenge.id;
    const updated = challenges.map(ch => {
      if (ch.id !== challengeId) return ch;
      if (ch.participants.includes(username)) return ch;
      return {
        ...ch,
        participants: [...ch.participants, username],
        scores: { ...ch.scores, [username]: 0 },
        completions: { ...ch.completions, [username]: {} }
      };
    });
    setChallenges(updated);
    await saveChallenges(updated);
    setSelectedChallenge(updated.find(c => c.id === challengeId));
  };

  const leaveChallenge = async (challengeId) => {
    const updated = challenges.map(ch => {
      if (ch.id !== challengeId) return ch;
      const newParticipants = ch.participants.filter(u => u !== username);
      const newScores = { ...ch.scores }; delete newScores[username];
      const newCompletions = { ...ch.completions }; delete newCompletions[username];
      return { ...ch, participants: newParticipants, scores: newScores, completions: newCompletions };
    });
    setChallenges(updated);
    await saveChallenges(updated);
    setSelectedChallenge(null);
  };

  const deleteChallenge = async (challengeId) => {
    const updated = challenges.filter(ch => ch.id !== challengeId);
    setChallenges(updated);
    await saveChallenges(updated);
  };

  const completedToday = habits.filter(h=>todayCompleted[h.id]).length;
  const totalWeekPts = graphData.reduce((s,d)=>s+d.total,0);
  const filteredHabits = activeCat==="all" ? habits : habits.filter(h=>h.category===activeCat);
  const myChallenges = challenges.filter(c => c.participants.includes(username));
  const availableChallenges = challenges.filter(c => !c.participants.includes(username) && !c.isPrivate);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active||!payload?.length) return null;
    return <div style={{ background:"#1a1a30", border:`1px solid ${T.border}`, borderRadius:9, padding:"7px 13px", fontSize:12, color:T.text }}><p style={{ margin:0, fontWeight:600 }}>{label}</p><p style={{ margin:0, color:T.blue }}>{payload[0].value} pts</p></div>;
  };

  if (!loaded) return <div style={{ minHeight:"100vh", background:T.bg, display:"flex", alignItems:"center", justifyContent:"center" }}><div style={{ color:T.muted, fontSize:13, fontFamily:T.font }}>Loading...</div></div>;

  return (
    <div style={{ minHeight:"100vh", background:T.bg, fontFamily:T.font, color:T.text, position:"relative" }}>
      {editingHabit && <EditHabitModal habit={editingHabit} onSave={saveEdit} onClose={()=>setEditingHabit(null)} />}
      {showCreateChallenge && <CreateChallengeModal username={username} habits={habits} onClose={()=>setShowCreateChallenge(false)} onCreated={refreshChallenges} />}
      {showJoinByCode && <JoinByCodeModal username={username} onClose={()=>setShowJoinByCode(false)} onJoin={joinChallenge} />}
      {selectedChallenge && <ChallengeDetailModal challenge={selectedChallenge} username={username} onClose={()=>setSelectedChallenge(null)} onJoin={()=>joinChallenge(selectedChallenge)} onLeave={()=>leaveChallenge(selectedChallenge.id)} onUpdate={refreshChallenges} onDelete={deleteChallenge} />}

      <div style={{ position:"fixed", top:"-15%", left:"50%", transform:"translateX(-50%)", width:500, height:260, borderRadius:"50%", background:"radial-gradient(ellipse,rgba(70,50,160,0.08) 0%,transparent 70%)", pointerEvents:"none" }} />

      <div style={{ maxWidth:480, margin:"0 auto", padding:"26px 18px 80px" }}>
        <div style={{ marginBottom:24 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div>
              <h1 style={{ margin:0, fontSize:25, fontWeight:800, color:T.bright, letterSpacing:"-0.5px" }}>Ritual</h1>
              <p style={{ margin:"3px 0 0", fontSize:12, color:T.dim }}>{new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"})}</p>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:11 }}>
              <div style={{ background:"linear-gradient(135deg,#161636,#122030)", border:`1px solid ${T.border}`, borderRadius:13, padding:"9px 15px", textAlign:"center" }}>
                <div style={{ fontSize:19, fontWeight:800, color:T.blue, lineHeight:1 }}>{todayPoints}</div>
                <div style={{ fontSize:9, color:T.dim, marginTop:2, textTransform:"uppercase", letterSpacing:"0.08em" }}>pts today</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:11, fontWeight:600, color:T.sub, marginBottom:4 }}>@{username}</div>
                <button onClick={onLogout} style={{ background:"none", border:"none", color:T.muted, cursor:"pointer", fontFamily:T.font, fontSize:11 }} onMouseEnter={e=>e.currentTarget.style.color=T.sub} onMouseLeave={e=>e.currentTarget.style.color=T.muted}>Sign out</button>
              </div>
            </div>
          </div>
          <div style={{ marginTop:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
              <span style={{ fontSize:11, color:T.dim }}>{completedToday} of {habits.length} done</span>
              <span style={{ fontSize:11, color:T.dim }}>{habits.length>0?Math.round((completedToday/habits.length)*100):0}%</span>
            </div>
            <div style={{ height:3, background:"#0f0f26", borderRadius:3, overflow:"hidden" }}>
              <div style={{ height:"100%", borderRadius:3, width:`${habits.length>0?(completedToday/habits.length)*100:0}%`, background:"linear-gradient(90deg,#4040a8,#8aabff)", transition:"width 0.5s cubic-bezier(0.34,1.56,0.64,1)" }} />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", gap:3, marginBottom:18, background:T.surface, borderRadius:11, padding:3 }}>
          {[["today","Today"],["progress","Progress"],["challenges","Challenges"]].map(([k,l])=>(
            <button key={k} onClick={()=>setActiveTab(k)} style={{ flex:1, padding:"7px 0", borderRadius:9, border:"none", cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:T.font, transition:"all 0.2s", background:activeTab===k?"#181838":"transparent", color:activeTab===k?T.blue:T.dim, boxShadow:activeTab===k?"0 1px 5px rgba(0,0,0,0.3)":"none" }}>{l}</button>
          ))}
        </div>

        {/* TODAY TAB - keeping existing implementation */}
        {activeTab==="today" && (
          <div>
            <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:4, marginBottom:16, scrollbarWidth:"none" }}>
              <button onClick={()=>setActiveCat("all")} style={{ flexShrink:0, padding:"5px 12px", borderRadius:20, border:"1px solid", borderColor:activeCat==="all"?T.blue:T.border, background:activeCat==="all"?"rgba(138,171,255,0.08)":"transparent", color:activeCat==="all"?T.blue:T.dim, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:T.font, whiteSpace:"nowrap" }}>All</button>
              {CATEGORIES.map(cat=>(
                <button key={cat.id} onClick={()=>setActiveCat(cat.id)} style={{ flexShrink:0, padding:"5px 12px", borderRadius:20, border:"1px solid", borderColor:activeCat===cat.id?cat.accent:T.border, background:activeCat===cat.id?`${cat.accent}15`:"transparent", color:activeCat===cat.id?cat.accent:T.dim, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:T.font, whiteSpace:"nowrap" }}>{cat.icon} {cat.label}</button>
              ))}
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
              {filteredHabits.length===0 && <div style={{ textAlign:"center", padding:"36px 20px", color:T.muted, fontSize:13 }}>{habits.length===0?"No habits yet — add one below ↓":`No ${activeCat} habits yet`}</div>}
              {filteredHabits.map(habit => {
                const done = !!todayCompleted[habit.id];
                const streak = streaks[habit.id]||0;
                const popping = justCompleted===habit.id;
                const cat = CAT_MAP[habit.category]||CAT_MAP.other;
                return (
                  <div key={habit.id} style={{ background:done?"rgba(70,70,160,0.05)":T.surface, border:`1px solid ${done?"rgba(138,171,255,0.14)":T.border}`, borderRadius:15, padding:"13px 15px", display:"flex", alignItems:"center", gap:11, transition:"all 0.22s ease", transform:popping?"scale(1.018)":"scale(1)", position:"relative", overflow:"hidden" }}>
                    {done && <div style={{ position:"absolute", inset:0, background:`linear-gradient(90deg,transparent,${cat.color}09,transparent)`, pointerEvents:"none" }} />}
                    <div onClick={()=>toggleHabit(habit.id)} style={{ width:25, height:25, borderRadius:7, flexShrink:0, border:done?"none":`2px solid ${T.muted}`, background:done?cat.color:"transparent", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.22s cubic-bezier(0.34,1.56,0.64,1)", transform:popping?"scale(1.3) rotate(8deg)":"scale(1)", cursor:"pointer" }}>
                      {done && <span style={{ fontSize:12, color:"#0a0a18", fontWeight:700 }}>✓</span>}
                    </div>
                    <span style={{ fontSize:16, cursor:"pointer" }} onClick={()=>toggleHabit(habit.id)}>{habit.icon}</span>
                    <div style={{ flex:1, cursor:"pointer" }} onClick={()=>toggleHabit(habit.id)}>
                      <div style={{ fontSize:13, fontWeight:600, color:done?"#b8b8e8":T.sub, transition:"color 0.2s" }}>{habit.name}</div>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:2 }}>
                        <span style={{ fontSize:10, color:T.muted }}>+{habit.points} pts</span>
                        <span style={{ fontSize:10, color:activeCat==="all"?T.muted:cat.accent }}>{cat.icon} {cat.label}</span>
                        {streak>0 && <span style={{ fontSize:10, color:streak>=7?"#ffb347":T.muted }}>🔥 {streak}d</span>}
                      </div>
                    </div>
                    {pointsPopup?.id===habit.id && <div style={{ position:"absolute", right:56, top:5, color:cat.color, fontSize:12, fontWeight:700, animation:"floatUp 1.2s ease forwards", pointerEvents:"none" }}>+{habit.points}</div>}
                    <button onClick={e=>{e.stopPropagation(); setEditingHabit({ ...habit });}} style={{ background:"none", border:"none", color:T.muted, cursor:"pointer", fontSize:13, padding:"4px 5px", lineHeight:1, transition:"color 0.15s", flexShrink:0 }} onMouseEnter={e=>e.currentTarget.style.color=T.blue} onMouseLeave={e=>e.currentTarget.style.color=T.muted} title="Edit">✏️</button>
                    <button onClick={e=>{e.stopPropagation(); removeHabit(habit.id);}} style={{ background:"none", border:"none", color:T.border, cursor:"pointer", fontSize:17, padding:"0 3px", lineHeight:1, transition:"color 0.15s", flexShrink:0 }} onMouseEnter={e=>e.currentTarget.style.color=T.sub} onMouseLeave={e=>e.currentTarget.style.color=T.border}>×</button>
                  </div>
                );
              })}
            </div>
            {!showAdd ? (
              <button onClick={()=>setShowAdd(true)} style={{ width:"100%", marginTop:9, padding:"12px", background:"transparent", border:`1.5px dashed ${T.border}`, borderRadius:15, color:T.muted, fontSize:13, cursor:"pointer", transition:"all 0.2s", fontFamily:T.font }} onMouseEnter={e=>{e.currentTarget.style.borderColor=T.dim;e.currentTarget.style.color=T.sub;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.muted;}}>+ Add habit</button>
            ) : (
              <div style={{ marginTop:9, background:T.surface, border:`1px solid ${T.border}`, borderRadius:15, padding:15 }}>
                <div style={{ marginBottom:12 }}>
                  <div style={{ fontSize:10, color:T.dim, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:7 }}>Category</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                    {CATEGORIES.map(cat=>(
                      <button key={cat.id} onClick={()=>setNewHabit(p=>({ ...p, category:cat.id, icon:p.icon==="⭐"?cat.icon:p.icon }))} style={{ padding:"5px 11px", borderRadius:20, border:"1px solid", borderColor:newHabit.category===cat.id?cat.accent:T.border, background:newHabit.category===cat.id?`${cat.accent}18`:"transparent", color:newHabit.category===cat.id?cat.accent:T.dim, fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:T.font }}>{cat.icon} {cat.label}</button>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom:11 }}>
                  <div style={{ fontSize:10, color:T.dim, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:7 }}>Icon</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                    {HABIT_ICONS.map(ic=>(
                      <button key={ic} onClick={()=>setNewHabit(p=>({ ...p, icon:ic }))} style={{ width:32, height:32, borderRadius:8, border:"1px solid", borderColor:newHabit.icon===ic?T.blue:T.border, background:newHabit.icon===ic?"rgba(138,171,255,0.1)":"transparent", fontSize:16, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>{ic}</button>
                    ))}
                  </div>
                </div>
                <div style={{ display:"flex", gap:8, marginBottom:10 }}>
                  <input value={newHabit.name} onChange={e=>setNewHabit(p=>({ ...p, name:e.target.value }))} placeholder="Habit name…" autoFocus style={inp} onKeyDown={e=>e.key==="Enter"&&addHabit()} />
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:12 }}>
                  <span style={{ fontSize:11, color:T.dim }}>Points:</span>
                  {[5,10,15,20,30].map(pt=>(
                    <button key={pt} onClick={()=>setNewHabit(p=>({ ...p, points:pt }))} style={{ padding:"4px 9px", borderRadius:7, border:"1px solid", borderColor:newHabit.points===pt?T.blue:T.border, background:newHabit.points===pt?"rgba(138,171,255,0.08)":"transparent", color:newHabit.points===pt?T.blue:T.dim, fontSize:12, cursor:"pointer", fontFamily:T.font }}>{pt}</button>
                  ))}
                </div>
                <div style={{ display:"flex", gap:7 }}>
                  <button onClick={addHabit} style={{ ...primaryBtn, flex:1 }}>Add habit</button>
                  <button onClick={()=>setShowAdd(false)} style={{ padding:"10px 15px", background:"transparent", border:`1px solid ${T.border}`, borderRadius:11, color:T.dim, cursor:"pointer", fontFamily:T.font, fontSize:13 }}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PROGRESS TAB - keeping existing implementation but shortened for token limit */}
        {activeTab==="progress" && (
          <div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:9, marginBottom:18 }}>
              {[["This week",totalWeekPts+" pts",T.blue],["Best streak",Math.max(0,...(Object.values(streaks).length?Object.values(streaks):[0]))+" days","#ffd3b6"]].map(([l,v,c])=>(
                <div key={l} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:13, padding:"14px 16px" }}>
                  <div style={{ fontSize:10, color:T.dim, textTransform:"uppercase", letterSpacing:"0.08em" }}>{l}</div>
                  <div style={{ fontSize:21, fontWeight:700, color:c, marginTop:5 }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:14, padding:"16px 8px 10px", marginBottom:14 }}>
              <div style={{ fontSize:10, color:T.dim, marginLeft:12, marginBottom:12, textTransform:"uppercase", letterSpacing:"0.08em" }}>Daily Points — Last 7 Days</div>
              {!hasAnyData ? <div style={{ height:130, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", color:T.muted, fontSize:13, gap:6 }}><span style={{ fontSize:22 }}>📊</span>Complete habits to see your graph</div> : <ResponsiveContainer width="100%" height={150}><LineChart data={graphData} margin={{top:5,right:10,left:-22,bottom:5}}><CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false}/><XAxis dataKey="label" tick={{fill:T.muted,fontSize:10}} axisLine={false} tickLine={false}/><YAxis tick={{fill:T.muted,fontSize:10}} axisLine={false} tickLine={false}/><Tooltip content={<CustomTooltip/>}/><Line type="monotone" dataKey="total" stroke={T.blue} strokeWidth={2.5} dot={{fill:T.blue,r:4,strokeWidth:0}} activeDot={{fill:"#fff",r:5,strokeWidth:0}}/></LineChart></ResponsiveContainer>}
            </div>
          </div>
        )}

        {/* CHALLENGES TAB */}
        {activeTab==="challenges" && (
          <div>
            <div style={{ marginBottom:20 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                <div style={{ fontSize:10, color:T.dim, textTransform:"uppercase", letterSpacing:"0.08em" }}>My Challenges</div>
                <div style={{ display:"flex", gap:6 }}>
                  <button onClick={()=>setShowJoinByCode(true)} style={{ background:"none", border:`1px solid ${T.border}`, borderRadius:8, color:T.dim, cursor:"pointer", fontSize:11, padding:"4px 10px", fontFamily:T.font, fontWeight:600 }}>🔒 Join</button>
                  <button onClick={()=>setShowCreateChallenge(true)} disabled={habits.length===0} style={{ background:"none", border:`1px solid ${habits.length>0?T.blue:T.border}`, borderRadius:8, color:habits.length>0?T.blue:T.dim, cursor:habits.length>0?"pointer":"not-allowed", fontSize:11, padding:"4px 10px", fontFamily:T.font, fontWeight:600 }}>+ Create</button>
                </div>
              </div>
              {myChallenges.length===0 ? (
                <div style={{ textAlign:"center", padding:"32px 20px", color:T.muted, fontSize:13, background:T.surface, border:`1px solid ${T.border}`, borderRadius:13 }}>
                  <span style={{ fontSize:28, display:"block", marginBottom:8 }}>🏆</span>
                  {habits.length===0 ? "Add habits first to create challenges" : "No active challenges — create one to compete!"}
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
                  {myChallenges.map(ch => {
                    const myRank = ch.participants.map(u => ({ u, s: ch.scores[u]||0 })).sort((a,b)=>b.s-a.s).findIndex(p=>p.u===username) + 1;
                    const daysLeft = (() => { const end=new Date(ch.endDate); const now=new Date(todayKey()); return Math.max(0,Math.ceil((end-now)/(1000*60*60*24))+1); })();
                    const cat = CAT_MAP[ch.habit.category]||CAT_MAP.other;
                    return (
                      <div key={ch.id} onClick={()=>setSelectedChallenge(ch)} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:13, padding:"13px 15px", cursor:"pointer", transition:"all 0.2s" }} onMouseEnter={e=>e.currentTarget.style.borderColor=T.muted} onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                          <div style={{ flex:1, display:"flex", alignItems:"center", gap:6 }}>
                            <div style={{ fontSize:14, fontWeight:700, color:T.text }}>{ch.name}</div>
                            {ch.isPrivate && <span style={{ fontSize:12 }}>🔒</span>}
                          </div>
                          <div style={{ textAlign:"right" }}>
                            <div style={{ fontSize:16, fontWeight:800, color:myRank===1?"#ffd700":T.blue }}>#{myRank}</div>
                            <div style={{ fontSize:10, color:T.dim }}>{daysLeft}d left</div>
                          </div>
                        </div>
                        <div style={{ fontSize:11, color:T.dim, marginBottom:8 }}>{ch.habit.icon} {ch.habit.name} · {ch.participants.length} competing</div>
                        <div style={{ height:2, background:T.border, borderRadius:2, overflow:"hidden" }}>
                          <div style={{ height:"100%", width:`${((ch.duration-daysLeft)/ch.duration)*100}%`, background:`linear-gradient(90deg,${cat.accent}66,${cat.accent})`, borderRadius:2 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {availableChallenges.length > 0 && (
              <div>
                <div style={{ fontSize:10, color:T.dim, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:12 }}>Public Challenges</div>
                <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
                  {availableChallenges.map(ch => (
                    <div key={ch.id} onClick={()=>setSelectedChallenge(ch)} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:13, padding:"13px 15px", cursor:"pointer", transition:"all 0.2s" }} onMouseEnter={e=>e.currentTarget.style.borderColor=T.muted} onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
                      <div style={{ fontSize:14, fontWeight:700, color:T.text }}>{ch.name}</div>
                      <div style={{ fontSize:11, color:T.dim, marginTop:2 }}>{ch.habit.icon} {ch.habit.name} · Created by @{ch.creator}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
        @keyframes floatUp { 0%{opacity:1;transform:translateY(0)} 100%{opacity:0;transform:translateY(-20px)} }
        input::placeholder { color: ${T.muted}; }
        ::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    try { const u=sessionStorage.getItem("ritual_user"); const a=sessionStorage.getItem("ritual_admin"); if(u){setUser(u);setIsAdmin(a==="1");} } catch {}
    setChecking(false);
  }, []);

  const handleAuth = (username, admin) => {
    try { sessionStorage.setItem("ritual_user",username); sessionStorage.setItem("ritual_admin",admin?"1":"0"); } catch {}
    setUser(username); setIsAdmin(admin);
  };
  const handleLogout = () => {
    try { sessionStorage.removeItem("ritual_user"); sessionStorage.removeItem("ritual_admin"); } catch {}
    setUser(null); setIsAdmin(false);
  };

  if (checking) return null;
  if (!user) return <AuthScreen onAuth={handleAuth} />;
  if (isAdmin) return <AdminView onLogout={handleLogout} />;
  return <HabitApp username={user} onLogout={handleLogout} />;
}
