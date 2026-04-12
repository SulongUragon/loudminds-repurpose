import { useState, useEffect, useCallback } from "react";

const WORKER_URL = import.meta.env.VITE_WORKER_URL || "https://lmc-repurpose-api.sulonguragon.workers.dev";

const PLATFORM_META = {
  twitter:  { label: "Twitter / X", icon: "𝕏", color: "#1DA1F2" },
  linkedin: { label: "LinkedIn",    icon: "in", color: "#0A66C2" },
  tiktok:   { label: "TikTok",      icon: "▶", color: "#c8ff00" },
};

const FORMAT_META = {
  tiktok_script:     { label: "TikTok Script",    icon: "▶" },
  twitter_thread:    { label: "Twitter Thread",   icon: "𝕏" },
  instagram_caption: { label: "IG Caption",       icon: "◈" },
  linkedin_post:     { label: "LinkedIn Post",    icon: "in" },
  email_newsletter:  { label: "Email Newsletter", icon: "✉" },
  carousel_slides:   { label: "Carousel Slides",  icon: "⊞" },
  youtube_short:     { label: "YouTube Short",    icon: "▷" },
  blog_post:         { label: "Blog Post",        icon: "✍" },
};

// ── Scheduled posts stored in localStorage ───────────────────────────────────
function getQueue() {
  try { return JSON.parse(localStorage.getItem("lmc_queue") || "[]"); } catch { return []; }
}
function saveQueue(q) {
  localStorage.setItem("lmc_queue", JSON.stringify(q));
}
function getHistory() {
  try { return JSON.parse(localStorage.getItem("lmc_history") || "[]"); } catch { return []; }
}
function saveHistory(h) {
  localStorage.setItem("lmc_history", JSON.stringify(h));
}

function GrainOverlay() {
  return (
    <svg style={{position:"fixed",top:0,left:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:0,opacity:0.03}}>
      <filter id="grain2"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
      <rect width="100%" height="100%" filter="url(#grain2)"/>
    </svg>
  );
}

function Spinner({size=14}) {
  return <div style={{width:size,height:size,border:"2px solid #c8ff00",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.7s linear infinite",display:"inline-block"}}/>;
}

function StatCard({label, value, sub}) {
  return (
    <div style={{background:"#080808",border:"1px solid #141414",padding:"24px 28px",animation:"fadeUp 0.4s ease forwards"}}>
      <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:"#333",letterSpacing:2,marginBottom:12}}>{label}</div>
      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:48,color:"#c8ff00",lineHeight:1}}>{value}</div>
      {sub && <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:"#2a2a2a",marginTop:8,letterSpacing:1}}>{sub}</div>}
    </div>
  );
}

function QueueItem({item, onPublishNow, onDelete, accounts}) {
  const fmt = FORMAT_META[item.format] || {label: item.format, icon: "·"};
  const isScheduled = item.scheduledFor && new Date(item.scheduledFor) > new Date();
  const isDue = item.scheduledFor && new Date(item.scheduledFor) <= new Date();
  const canPublish = item.platform && accounts[item.platform]?.length > 0;
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState(null);

  const publish = async () => {
    if (!canPublish) return;
    setPublishing(true);
    try {
      const res = await fetch(`${WORKER_URL}/publish/${item.platform}`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({content: item.content, accountId: accounts[item.platform][0].userId, format: item.format}),
      });
      const data = await res.json();
      if (data.success) {
        setResult({ok: true, url: data.result?.url});
        onPublishNow(item.id, data.result);
      } else {
        setResult({ok: false, error: data.error});
      }
    } catch(e) {
      setResult({ok: false, error: e.message});
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div style={{background:"#080808",border:`1px solid ${isDue?"#2a3a1a":"#141414"}`,padding:"20px 24px",animation:"fadeUp 0.3s ease forwards",position:"relative"}}>
      {isDue && <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:"#c8ff00",opacity:0.5}}/>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontFamily:"'DM Mono',monospace",fontSize:16,opacity:0.4}}>{fmt.icon}</span>
          <div>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:14,color:"#fff",letterSpacing:2}}>{fmt.label}</div>
            {item.platform && (
              <div style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:"#c8ff00",letterSpacing:2,marginTop:2}}>
                → {PLATFORM_META[item.platform]?.label || item.platform}
              </div>
            )}
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {item.scheduledFor && (
            <span style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:isDue?"#c8ff00":"#333",letterSpacing:1,padding:"3px 8px",border:`1px solid ${isDue?"#2a3a1a":"#1a1a1a"}`}}>
              {isDue ? "● DUE" : new Date(item.scheduledFor).toLocaleString('en-US', {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}
            </span>
          )}
          <button onClick={() => onDelete(item.id)} style={{background:"none",border:"none",color:"#2a2a2a",cursor:"pointer",fontSize:14,padding:"2px 6px",transition:"color 0.2s"}} onMouseEnter={e=>e.target.style.color="#ff4444"} onMouseLeave={e=>e.target.style.color="#2a2a2a"}>✕</button>
        </div>
      </div>

      <pre style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:"#666",lineHeight:1.7,whiteSpace:"pre-wrap",wordBreak:"break-word",margin:"0 0 14px",maxHeight:80,overflowY:"hidden",maskImage:"linear-gradient(to bottom, #666 60%, transparent)"}}>
        {item.content}
      </pre>

      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        {item.platform && (
          canPublish ? (
            <button onClick={publish} disabled={publishing}
              style={{background:"none",border:`1px solid ${publishing?"#1a1a1a":"#1e3a1e"}`,color:publishing?"#444":"#c8ff00",padding:"4px 14px",fontFamily:"'DM Mono',monospace",fontSize:10,cursor:publishing?"not-allowed":"pointer",letterSpacing:1.5,display:"flex",alignItems:"center",gap:6}}>
              {publishing ? <><Spinner size={10}/> PUBLISHING...</> : "↑ PUBLISH NOW"}
            </button>
          ) : (
            <span style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:"#252525",letterSpacing:1}}>connect {item.platform} to publish</span>
          )
        )}
        {result && (
          <span style={{fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:1,color:result.ok?"#c8ff00":"#ff4444"}}>
            {result.ok ? <>✓ PUBLISHED{result.url && <> · <a href={result.url} target="_blank" rel="noreferrer" style={{color:"#c8ff00",opacity:0.5}}>VIEW ↗</a></>}</> : `✕ ${result.error}`}
          </span>
        )}
      </div>

      <div style={{marginTop:10,fontFamily:"'DM Mono',monospace",fontSize:9,color:"#1e1e1e",letterSpacing:1}}>
        ADDED {new Date(item.addedAt).toLocaleDateString('en-US', {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}
      </div>
    </div>
  );
}

function HistoryItem({item}) {
  const fmt = FORMAT_META[item.format] || {label: item.format, icon: "·"};
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  return (
    <div style={{background:"#080808",border:"1px solid #0f0f0f",padding:"16px 20px",cursor:"pointer",transition:"border-color 0.2s"}}
      onMouseEnter={e=>e.currentTarget.style.borderColor="#1e1e1e"}
      onMouseLeave={e=>e.currentTarget.style.borderColor="#0f0f0f"}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}} onClick={()=>setExpanded(v=>!v)}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{opacity:0.3,fontSize:12}}>{fmt.icon}</span>
          <div>
            <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:13,color:"#888",letterSpacing:2}}>{fmt.label}</span>
            {item.platform && <span style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:"#c8ff00",marginLeft:10,letterSpacing:1}}>→ {item.platform.toUpperCase()}</span>}
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:"#252525",letterSpacing:1}}>
            {new Date(item.publishedAt || item.addedAt).toLocaleDateString('en-US',{month:'short',day:'numeric'})}
          </span>
          {item.url && <a href={item.url} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:"#333",letterSpacing:1,textDecoration:"none"}}>VIEW ↗</a>}
          <span style={{color:"#2a2a2a",fontSize:10}}>{expanded?"▲":"▼"}</span>
        </div>
      </div>

      {expanded && (
        <div style={{marginTop:14,paddingTop:14,borderTop:"1px solid #0f0f0f"}}>
          <pre style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:"#555",lineHeight:1.8,whiteSpace:"pre-wrap",wordBreak:"break-word",margin:"0 0 12px",maxHeight:200,overflowY:"auto"}}>
            {item.content}
          </pre>
          <button onClick={()=>{navigator.clipboard.writeText(item.content);setCopied(true);setTimeout(()=>setCopied(false),1500);}}
            style={{background:"none",border:"1px solid #1e1e1e",color:copied?"#c8ff00":"#444",padding:"3px 12px",fontFamily:"'DM Mono',monospace",fontSize:9,cursor:"pointer",letterSpacing:1.5}}>
            {copied?"COPIED ✓":"COPY"}
          </button>
        </div>
      )}
    </div>
  );
}

function ScheduleModal({item, onSchedule, onClose}) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [platform, setPlatform] = useState("twitter");

  const submit = () => {
    if (!date || !time) return;
    const scheduledFor = new Date(`${date}T${time}`).toISOString();
    onSchedule({...item, scheduledFor, platform});
    onClose();
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={onClose}>
      <div style={{background:"#0a0a0a",border:"1px solid #1e1e1e",padding:"32px",width:400,animation:"fadeUp 0.2s ease"}} onClick={e=>e.stopPropagation()}>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,letterSpacing:3,color:"#fff",marginBottom:24}}>SCHEDULE POST</div>

        <div style={{marginBottom:16}}>
          <label style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:"#333",letterSpacing:2,display:"block",marginBottom:8}}>PLATFORM</label>
          <div style={{display:"flex",gap:8}}>
            {["twitter","linkedin"].map(p=>(
              <button key={p} onClick={()=>setPlatform(p)}
                style={{background:platform===p?"#0c120c":"none",border:`1px solid ${platform===p?"#c8ff00":"#1e1e1e"}`,color:platform===p?"#c8ff00":"#444",padding:"6px 16px",fontFamily:"'DM Mono',monospace",fontSize:10,cursor:"pointer",letterSpacing:1,flex:1}}>
                {PLATFORM_META[p].icon} {PLATFORM_META[p].label}
              </button>
            ))}
          </div>
        </div>

        <div style={{marginBottom:16}}>
          <label style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:"#333",letterSpacing:2,display:"block",marginBottom:8}}>DATE</label>
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} min={new Date().toISOString().split("T")[0]}
            style={{width:"100%",background:"#080808",border:"1px solid #1e1e1e",color:"#ccc",padding:"8px 12px",fontFamily:"'DM Mono',monospace",fontSize:12}}/>
        </div>

        <div style={{marginBottom:24}}>
          <label style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:"#333",letterSpacing:2,display:"block",marginBottom:8}}>TIME</label>
          <input type="time" value={time} onChange={e=>setTime(e.target.value)}
            style={{width:"100%",background:"#080808",border:"1px solid #1e1e1e",color:"#ccc",padding:"8px 12px",fontFamily:"'DM Mono',monospace",fontSize:12}}/>
        </div>

        <div style={{display:"flex",gap:8}}>
          <button onClick={submit} disabled={!date||!time}
            style={{flex:1,background:"#c8ff00",border:"none",color:"#000",padding:"12px",fontFamily:"'Bebas Neue',sans-serif",fontSize:16,letterSpacing:3,cursor:"pointer",opacity:(!date||!time)?0.4:1}}>
            SCHEDULE
          </button>
          <button onClick={onClose}
            style={{background:"none",border:"1px solid #1e1e1e",color:"#444",padding:"12px 20px",fontFamily:"'DM Mono',monospace",fontSize:10,cursor:"pointer",letterSpacing:1}}>
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard({onNavigate, pendingItem, accounts}) {
  const [queue, setQueue] = useState(getQueue);
  const [history, setHistory] = useState(getHistory);
  const [activeTab, setActiveTab] = useState("queue");
  const [scheduleTarget, setScheduleTarget] = useState(null);

  // If a new item comes in from the repurposer
  useEffect(() => {
    if (pendingItem) {
      const newItem = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
        ...pendingItem,
        addedAt: new Date().toISOString(),
      };
      const updated = [newItem, ...queue];
      setQueue(updated);
      saveQueue(updated);
    }
  }, [pendingItem]);

  const deleteFromQueue = (id) => {
    const updated = queue.filter(i => i.id !== id);
    setQueue(updated);
    saveQueue(updated);
  };

  const handlePublishNow = (id, result) => {
    const item = queue.find(i => i.id === id);
    if (item) {
      const historyItem = {...item, publishedAt: new Date().toISOString(), url: result?.url};
      const newHistory = [historyItem, ...history];
      setHistory(newHistory);
      saveHistory(newHistory);
    }
    deleteFromQueue(id);
  };

  const handleSchedule = (scheduledItem) => {
    const updated = queue.map(i => i.id === scheduledItem.id ? scheduledItem : i);
    setQueue(updated);
    saveQueue(updated);
  };

  const clearHistory = () => {
    setHistory([]);
    saveHistory([]);
  };

  // Stats
  const totalPublished = history.length;
  const scheduled = queue.filter(i => i.scheduledFor && new Date(i.scheduledFor) > new Date()).length;
  const due = queue.filter(i => i.scheduledFor && new Date(i.scheduledFor) <= new Date()).length;
  const twitterCount = history.filter(i => i.platform === "twitter").length;
  const linkedinCount = history.filter(i => i.platform === "linkedin").length;

  return (
    <div style={{minHeight:"100vh",background:"#050505",color:"#fff",fontFamily:"'DM Mono',monospace",position:"relative"}}>
      <GrainOverlay/>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Mono:wght@300;400;500&display=swap');
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-thumb{background:#1e1e1e}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        input[type="date"]::-webkit-calendar-picker-indicator,input[type="time"]::-webkit-calendar-picker-indicator{filter:invert(0.3)}
        input:focus{outline:none;border-color:#333!important}
      `}</style>

      {/* HEADER */}
      <header style={{borderBottom:"1px solid #0f0f0f",padding:"18px 48px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,background:"rgba(5,5,5,0.95)",backdropFilter:"blur(12px)",zIndex:100}}>
        <div style={{display:"flex",alignItems:"baseline",gap:10}}>
          <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,letterSpacing:5,color:"#fff"}}>LOUDMINDS</span>
          <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,letterSpacing:5,color:"#c8ff00"}}>DASHBOARD</span>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>onNavigate("repurpose")}
            style={{background:"none",border:"1px solid #1a1a1a",color:"#444",padding:"6px 16px",fontFamily:"'DM Mono',monospace",fontSize:10,cursor:"pointer",letterSpacing:2,transition:"all 0.2s"}}
            onMouseEnter={e=>{e.target.style.borderColor="#c8ff00";e.target.style.color="#c8ff00"}}
            onMouseLeave={e=>{e.target.style.borderColor="#1a1a1a";e.target.style.color="#444"}}>
            ← REPURPOSE
          </button>
        </div>
      </header>

      <main style={{maxWidth:1140,margin:"0 auto",padding:"48px 48px 80px"}}>

        {/* STATS ROW */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:48}}>
          <StatCard label="TOTAL PUBLISHED" value={totalPublished} sub="all time"/>
          <StatCard label="IN QUEUE" value={queue.length} sub={due>0?`${due} DUE NOW`:undefined}/>
          <StatCard label="SCHEDULED" value={scheduled} sub="upcoming"/>
          <StatCard label="PLATFORMS" value={`${twitterCount}𝕏 ${linkedinCount}in`} sub="published"/>
        </div>

        {/* TABS */}
        <div style={{display:"flex",gap:0,marginBottom:32,borderBottom:"1px solid #0f0f0f"}}>
          {[
            {id:"queue", label:`QUEUE (${queue.length})`},
            {id:"history", label:`HISTORY (${history.length})`},
          ].map(tab=>(
            <button key={tab.id} onClick={()=>setActiveTab(tab.id)}
              style={{background:"none",border:"none",borderBottom:`2px solid ${activeTab===tab.id?"#c8ff00":"transparent"}`,color:activeTab===tab.id?"#c8ff00":"#333",padding:"12px 24px 14px",fontFamily:"'Bebas Neue',sans-serif",fontSize:14,letterSpacing:3,cursor:"pointer",transition:"all 0.2s",marginBottom:-1}}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* QUEUE TAB */}
        {activeTab === "queue" && (
          <div>
            {queue.length === 0 ? (
              <div style={{textAlign:"center",padding:"80px 0",color:"#1e1e1e"}}>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:32,letterSpacing:4,marginBottom:12}}>QUEUE IS EMPTY</div>
                <div style={{fontFamily:"'DM Mono',monospace",fontSize:11,letterSpacing:1}}>
                  Generate content and add it to the queue from the repurposer
                </div>
                <button onClick={()=>onNavigate("repurpose")}
                  style={{marginTop:24,background:"#c8ff00",border:"none",color:"#000",padding:"12px 32px",fontFamily:"'Bebas Neue',sans-serif",fontSize:16,letterSpacing:3,cursor:"pointer"}}>
                  GO TO REPURPOSE →
                </button>
              </div>
            ) : (
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(460px,1fr))",gap:12}}>
                {queue.map(item=>(
                  <div key={item.id}>
                    <QueueItem item={item} onPublishNow={handlePublishNow} onDelete={deleteFromQueue} accounts={accounts}/>
                    {item.platform && !item.scheduledFor && (
                      <button onClick={()=>setScheduleTarget(item)}
                        style={{width:"100%",background:"none",border:"1px solid #0f0f0f",borderTop:"none",color:"#252525",padding:"6px",fontFamily:"'DM Mono',monospace",fontSize:9,cursor:"pointer",letterSpacing:2,transition:"all 0.2s"}}
                        onMouseEnter={e=>{e.target.style.color="#555";e.target.style.borderColor="#1e1e1e"}}
                        onMouseLeave={e=>{e.target.style.color="#252525";e.target.style.borderColor="#0f0f0f"}}>
                        + SCHEDULE THIS POST
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === "history" && (
          <div>
            {history.length > 0 && (
              <div style={{display:"flex",justifyContent:"flex-end",marginBottom:16}}>
                <button onClick={clearHistory}
                  style={{background:"none",border:"1px solid #1a1a1a",color:"#2a2a2a",padding:"5px 14px",fontFamily:"'DM Mono',monospace",fontSize:9,cursor:"pointer",letterSpacing:1.5,transition:"all 0.2s"}}
                  onMouseEnter={e=>{e.target.style.color="#ff4444";e.target.style.borderColor="#ff4444"}}
                  onMouseLeave={e=>{e.target.style.color="#2a2a2a";e.target.style.borderColor="#1a1a1a"}}>
                  CLEAR HISTORY
                </button>
              </div>
            )}
            {history.length === 0 ? (
              <div style={{textAlign:"center",padding:"80px 0",color:"#1e1e1e"}}>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:32,letterSpacing:4,marginBottom:12}}>NO HISTORY YET</div>
                <div style={{fontFamily:"'DM Mono',monospace",fontSize:11,letterSpacing:1}}>Published posts will appear here</div>
              </div>
            ) : (
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                {history.map(item=>(
                  <HistoryItem key={item.id} item={item}/>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {scheduleTarget && (
        <ScheduleModal item={scheduleTarget} onSchedule={handleSchedule} onClose={()=>setScheduleTarget(null)}/>
      )}

      <footer style={{borderTop:"1px solid #0a0a0a",padding:"20px 48px",display:"flex",justifyContent:"space-between",color:"#1a1a1a",fontSize:10,letterSpacing:2}}>
        <span>LOUDMINDSCLUB</span>
        <span>DASHBOARD v1.0 — FLOW C</span>
      </footer>
    </div>
  );
}
