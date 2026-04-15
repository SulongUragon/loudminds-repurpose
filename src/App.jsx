import { useState, useRef, useEffect } from "react";
import QuoteCard from "./QuoteCard.jsx";

const WORKER_URL = import.meta.env.VITE_WORKER_URL || "https://lmc-repurpose-api.sulonguragon.workers.dev";

const FORMATS = [
  { id:"tiktok_script",     label:"TikTok Script",     icon:"▶", platform:"TikTok",       publishTo:null },
  { id:"twitter_thread",    label:"Twitter Thread",    icon:"𝕏", platform:"Twitter / X",  publishTo:"twitter" },
  { id:"instagram_caption", label:"IG Caption",        icon:"◈", platform:"Instagram",    publishTo:null },
  { id:"linkedin_post",     label:"LinkedIn Post",     icon:"in",platform:"LinkedIn",     publishTo:"linkedin" },
  { id:"email_newsletter",  label:"Email Newsletter",  icon:"✉", platform:"Email",        publishTo:null },
  { id:"carousel_slides",   label:"Carousel Slides",   icon:"⊞", platform:"IG / LinkedIn",publishTo:null },
  { id:"youtube_short",     label:"YouTube Short",     icon:"▷", platform:"YouTube",      publishTo:null },
  { id:"blog_post",         label:"Blog Post",         icon:"✍", platform:"Web / Medium", publishTo:null },
];

const INPUT_TYPES = [
  { id:"text",       label:"Raw Text / Idea",  icon:"T" },
  { id:"url",        label:"URL / Article",    icon:"⌁" },
  { id:"transcript", label:"Video Transcript", icon:"◎" },
  { id:"tweet",      label:"Tweet / Post",     icon:"⊹" },
];

const TONES = [
  "Dark & Psychological",
  "Brutal & Direct",
  "Stoic & Cold",
  "Motivational Edge",
  "Narrative & Cinematic",
];

const FORMAT_PROMPTS = {
  tiktok_script:`Write a TikTok video script. Structure:\n- HOOK (first 3 seconds — pattern interrupt, bold statement, or question)\n- BODY (3 punchy points, each 1-2 sentences, dark psychology or mindset angle)\n- CTA (soft close — follow, comment, or watch next)\nKeep total script under 60 seconds when spoken. No fluff. Label each section.`,
  twitter_thread:`Write a Twitter/X thread of 7-10 tweets. Rules:\n- Tweet 1: killer hook that stops the scroll (max 280 chars)\n- Tweets 2-9: one insight per tweet, numbered (2/10 etc.), punchy and standalone\n- Last tweet: restate the core lesson + soft CTA\nNo hashtags except 1-2 on final tweet. Each tweet max 280 chars.`,
  instagram_caption:`Write an Instagram caption. Structure:\n- Line 1: hook (bold statement or counterintuitive claim)\n- Body: 3-5 short paragraphs with line breaks for readability\n- CTA: question to drive comments\n- Hashtags: 8-12 relevant ones, mix of niche + broad\nTotal: 150-300 words.`,
  linkedin_post:`Write a LinkedIn post in authority style. Structure:\n- Opening line: bold, controversial, or data-driven hook (no "I" at start)\n- 3-5 short paragraphs: story, insight, lesson\n- Closing: actionable takeaway\n- Last line: question for engagement\n500-800 words. Professional but psychologically sharp.`,
  email_newsletter:`Write a newsletter email. Provide:\nSUBJECT LINE: (3 options, curiosity-gap style)\nPREVIEW TEXT: (one line)\nBODY: Full email — greeting, hook story, 3 key insights, call to action, sign-off\nTone: like a mentor who knows dark psychology. 400-600 words.`,
  carousel_slides:`Write a 10-slide carousel. For each slide provide:\nSLIDE [N]: [Title]\n[2-3 bullet points or 1-2 sentences of copy]\nSlide 1 = hook/cover. Slide 10 = CTA. Each slide is scannable in 3 seconds.`,
  youtube_short:`Write a YouTube Shorts script (60 seconds max). Structure:\n- 0-3s: Pattern interrupt hook (visual + verbal)\n- 3-45s: Core content, 3-4 punchy points\n- 45-60s: Callback to hook + CTA (subscribe / comment)\nInclude [VISUAL CUE] notes in brackets. Label timecodes.`,
  blog_post:`Write a full blog post. Structure:\nTITLE: (SEO + curiosity hybrid)\nMETA DESCRIPTION: (155 chars)\nINTRO: hook + thesis (150 words)\nH2 SECTIONS: 4-5 sections with subheadings, 150-200 words each\nCONCLUSION: summary + CTA\nTotal: 900-1200 words.`,
};

function GrainOverlay() {
  return (
    <svg style={{position:"fixed",top:0,left:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:0,opacity:0.03}}>
      <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
      <rect width="100%" height="100%" filter="url(#grain)"/>
    </svg>
  );
}

function Spinner({size=16,color="#c8ff00"}) {
  return <div style={{width:size,height:size,border:`2px solid ${color}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.7s linear infinite",display:"inline-block"}}/>;
}

function CopyBtn({text}) {
  const [copied,setCopied]=useState(false);
  return (
    <button onClick={()=>{navigator.clipboard.writeText(text);setCopied(true);setTimeout(()=>setCopied(false),1800);}}
      style={{background:"none",border:"1px solid #1e1e1e",color:copied?"#c8ff00":"#444",padding:"4px 14px",fontFamily:"'DM Mono',monospace",fontSize:10,cursor:"pointer",letterSpacing:1.5,transition:"all 0.2s"}}>
      {copied?"COPIED ✓":"COPY"}
    </button>
  );
}

function PlatformBar({accounts,onConnect,onDisconnect,loading}) {
  const platforms=[{id:"twitter",label:"Twitter / X",icon:"𝕏"},{id:"linkedin",label:"LinkedIn",icon:"in"}];
  return (
    <div style={{background:"#080808",borderBottom:"1px solid #0f0f0f",padding:"11px 48px",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
      <span style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:"#252525",letterSpacing:2,marginRight:6}}>PLATFORMS</span>
      {platforms.map(p=>{
        const accts=accounts[p.id]||[];
        const connected=accts.length>0;
        return (
          <button key={p.id} onClick={()=>connected?onDisconnect(p.id,accts[0].userId):onConnect(p.id)}
            style={{background:connected?"#0c120c":"none",border:`1px solid ${connected?"#1e3a1e":"#1a1a1a"}`,color:connected?"#c8ff00":"#444",padding:"5px 16px",fontFamily:"'DM Mono',monospace",fontSize:10,cursor:"pointer",letterSpacing:1.5,display:"flex",alignItems:"center",gap:8,transition:"all 0.2s"}}>
            {loading?<Spinner size={10}/>:<span>{p.icon}</span>}
            {connected?`● @${accts[0].username}`:`+ ${p.label}`}
          </button>
        );
      })}
      <span style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:"#1a1a1a",marginLeft:"auto",letterSpacing:1}}>TIKTOK: COPY + OPEN (API RESTRICTION)</span>
    </div>
  );
}

function OutputCard({format, content, loading, accounts, onAddToQueue}) {
  const fmt=FORMATS.find(f=>f.id===format);
  const [publishing,setPublishing]=useState(false);
  const [result,setResult]=useState(null);
  const [queued,setQueued]=useState(false);
  const canPublish=fmt?.publishTo&&(accounts[fmt.publishTo]?.length>0);

  const publish=async()=>{
    if(!canPublish||!content)return;
    setPublishing(true);setResult(null);
    const platform=fmt.publishTo;
    const accountId=accounts[platform][0].userId;
    try {
      const res=await fetch(`${WORKER_URL}/publish/${platform}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({content,accountId,format})});
      const data=await res.json();
      setResult(data.success?{ok:true,url:data.result?.url}:{ok:false,error:data.error});
    } catch(e){setResult({ok:false,error:e.message});}
    finally{setPublishing(false);}
  };

  const addToQueue=()=>{
    onAddToQueue({format,content,platform:fmt?.publishTo||null});
    setQueued(true);
  };

  return (
    <div style={{background:"#080808",border:"1px solid #141414",padding:"24px",animation:"fadeUp 0.4s ease forwards"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18}}>
        <div>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:11,color:"#c8ff00",letterSpacing:3,marginBottom:4}}>{fmt?.platform}</div>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,color:"#fff",letterSpacing:2}}>{fmt?.label}</div>
        </div>
        <span style={{fontSize:20,opacity:0.2}}>{fmt?.icon}</span>
      </div>

      {loading?(
        <div style={{display:"flex",alignItems:"center",gap:10,color:"#333",fontFamily:"'DM Mono',monospace",fontSize:11,padding:"20px 0"}}>
          <Spinner/><span style={{animation:"pulse 1.5s ease infinite"}}>generating...</span>
        </div>
      ):(
        <>
          <pre style={{fontFamily:"'DM Mono',monospace",fontSize:12,color:"#bbb",lineHeight:1.9,whiteSpace:"pre-wrap",wordBreak:"break-word",margin:0,maxHeight:380,overflowY:"auto",paddingRight:8}}>
            {content}
          </pre>
          <div style={{marginTop:16,display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
            <CopyBtn text={content}/>

            {/* Publish now */}
            {fmt?.publishTo&&(canPublish?(
              <button onClick={publish} disabled={publishing}
                style={{background:publishing?"none":"#0c120c",border:`1px solid ${publishing?"#1a1a1a":"#1e3a1e"}`,color:publishing?"#444":"#c8ff00",padding:"4px 16px",fontFamily:"'DM Mono',monospace",fontSize:10,cursor:publishing?"not-allowed":"pointer",letterSpacing:1.5,display:"flex",alignItems:"center",gap:6,transition:"all 0.2s"}}>
                {publishing?<><Spinner size={10}/> PUBLISHING...</>:`↑ PUBLISH TO ${fmt.publishTo.toUpperCase()}`}
              </button>
            ):(
              <span style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:"#252525",letterSpacing:1}}>connect {fmt.publishTo} above</span>
            ))}

            {/* Add to queue */}
            <button onClick={addToQueue} disabled={queued}
              style={{background:"none",border:`1px solid ${queued?"#1e3a1e":"#1a1a1a"}`,color:queued?"#c8ff00":"#444",padding:"4px 14px",fontFamily:"'DM Mono',monospace",fontSize:10,cursor:queued?"default":"pointer",letterSpacing:1.5,transition:"all 0.2s"}}>
              {queued?"✓ IN QUEUE":"+ QUEUE"}
            </button>

            {/* TikTok manual */}
            {fmt?.id==="tiktok_script"&&(
              <button onClick={()=>{navigator.clipboard.writeText(content);window.open("https://www.tiktok.com/creator-center/upload","_blank");}}
                style={{background:"none",border:"1px solid #1a1a1a",color:"#444",padding:"4px 16px",fontFamily:"'DM Mono',monospace",fontSize:10,cursor:"pointer",letterSpacing:1.5}}>
                ↗ COPY + OPEN TIKTOK
              </button>
            )}
          </div>

          {result&&(
            <div style={{marginTop:10,fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:1}}>
              {result.ok?(
                <span style={{color:"#c8ff00"}}>✓ PUBLISHED{result.url&&<> · <a href={result.url} target="_blank" rel="noreferrer" style={{color:"#c8ff00",opacity:0.5}}>VIEW ↗</a></>}</span>
              ):(
                <span style={{color:"#ff4444"}}>✕ {result.error}</span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function App({onNavigate, onAddToQueue, accounts, fetchAccounts, user, onLogout}) {
  const [apiKey,setApiKey]=useState(()=>localStorage.getItem("lmc_repurpose_key")||"");
  const [showKey,setShowKey]=useState(false);
  const [keyDraft,setKeyDraft]=useState("");
  const [inputType,setInputType]=useState("text");
  const [inputContent,setInputContent]=useState("");
  const [tone,setTone]=useState(TONES[0]);
  const [selectedFormats,setSelectedFormats]=useState(["tiktok_script","twitter_thread","instagram_caption"]);
  const [outputs,setOutputs]=useState({});
  const [loadingFormats,setLoadingFormats]=useState({});
  const [hasGenerated,setHasGenerated]=useState(false);
  const [loadingAccounts,setLoadingAccounts]=useState(false);
  const outputRef=useRef(null);
  const isGenerating=Object.values(loadingFormats).some(Boolean);

  useEffect(()=>{
    const params=new URLSearchParams(window.location.search);
    if(params.get("oauth")){
      if(params.get("status")==="success")fetchAccounts();
      window.history.replaceState({},"",window.location.pathname);
    }
  },[fetchAccounts]);

  const saveKey=()=>{localStorage.setItem("lmc_repurpose_key",keyDraft);setApiKey(keyDraft);setShowKey(false);setKeyDraft("");};
  const toggleFormat=id=>setSelectedFormats(prev=>prev.includes(id)?prev.filter(f=>f!==id):[...prev,id]);
  const connectPlatform=platform=>{window.location.href=`${WORKER_URL}/auth/${platform}/start`;};
  const disconnectPlatform=async(platform,userId)=>{await fetch(`${WORKER_URL}/accounts/${platform}/${userId}`,{method:"DELETE"});fetchAccounts();};

  const buildPrompt=format=>{
    const inputLabel=INPUT_TYPES.find(t=>t.id===inputType)?.label;
    return `You are the content engine for LoudMindsClub — a dark psychology and mindset brand. Aesthetic: sharp, cold, psychologically precise, no fluff.\n\nTONE: ${tone}\nINPUT TYPE: ${inputLabel}\nSOURCE CONTENT:\n---\n${inputContent}\n---\n\nTASK: ${FORMAT_PROMPTS[format]}\n\nWrite only the final output. No preamble.`;
  };

  const generate=async()=>{
    if(!inputContent.trim()||!selectedFormats.length)return;
    if(!apiKey){setShowKey(true);return;}
    setHasGenerated(true);setOutputs({});
    const loading={};selectedFormats.forEach(f=>{loading[f]=true;});setLoadingFormats(loading);
    setTimeout(()=>outputRef.current?.scrollIntoView({behavior:"smooth",block:"start"}),150);
    await Promise.all(selectedFormats.map(async format=>{
      try{
        const res=await fetch(`${WORKER_URL}/generate`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1500,messages:[{role:"user",content:buildPrompt(format)}],apiKey})});
        const data=await res.json();
        if(data.error)throw new Error(data.error.message);
        setOutputs(prev=>({...prev,[format]:data.content?.[0]?.text||"No content returned."}));
      }catch(e){setOutputs(prev=>({...prev,[format]:`Error: ${e.message}`}));}
      finally{setLoadingFormats(prev=>({...prev,[format]:false}));}
    }));
  };

  const allDone=hasGenerated&&selectedFormats.every(f=>outputs[f]&&!loadingFormats[f]);

  // Queue count from localStorage
  const queueCount = JSON.parse(localStorage.getItem("lmc_queue")||"[]").length;

  return (
    <div style={{minHeight:"100vh",background:"#050505",color:"#fff",fontFamily:"'DM Mono',monospace",position:"relative"}}>
      <GrainOverlay/>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Mono:wght@300;400;500&display=swap');
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-thumb{background:#1e1e1e}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
        @keyframes slideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
        .fc{transition:all 0.15s}.fc:hover{border-color:#c8ff00!important;color:#c8ff00!important}.fc.on{background:#c8ff00!important;border-color:#c8ff00!important;color:#000!important}
        .tb{transition:all 0.15s}.tb:hover{border-color:#2a2a2a!important;color:#777!important}.tb.on{border-color:#c8ff00!important;color:#c8ff00!important;background:#0c0c0c!important}
        .ib{transition:all 0.15s}.ib:hover{border-color:#2a2a2a!important;color:#777!important}.ib.on{border-color:#c8ff00!important;color:#c8ff00!important}
        .gb{transition:all 0.2s}.gb:hover:not(:disabled){background:#d4ff1a!important;transform:translateY(-2px);box-shadow:0 8px 32px rgba(200,255,0,0.15)!important}.gb:disabled{opacity:0.35;cursor:not-allowed}
        textarea:focus{outline:none;border-color:#222!important}
        input:focus{outline:none;border-color:#333!important}
      `}</style>

      {/* HEADER */}
      <header style={{borderBottom:"1px solid #0f0f0f",padding:"18px 48px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,background:"rgba(5,5,5,0.95)",backdropFilter:"blur(12px)",zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <img
            src="/logo.png"
            alt="LoudMindsClub"
            style={{
              height:48,
              width:48,
              objectFit:"cover",
              flexShrink:0,
              maskImage:"radial-gradient(ellipse 75% 75% at center, black 45%, transparent 100%)",
              WebkitMaskImage:"radial-gradient(ellipse 75% 75% at center, black 45%, transparent 100%)",
            }}
          />
          <div style={{display:"flex",alignItems:"baseline",gap:10}}>
            <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,letterSpacing:5,color:"#fff"}}>LOUDMINDS</span>
            <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,letterSpacing:5,color:"#c8ff00"}}>REPURPOSE</span>
            <span style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:"#252525",letterSpacing:3,marginLeft:6}}>v2.0</span>
          </div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {user&&(
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              {user.picture&&<img src={user.picture} alt={user.name} style={{width:28,height:28,borderRadius:"50%",border:"1px solid #1e1e1e"}}/>}
              <span style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:"#333",letterSpacing:1}}>{user.name?.split(" ")[0].toUpperCase()}</span>
              <button onClick={onLogout} style={{background:"none",border:"1px solid #1a1a1a",color:"#333",padding:"4px 10px",fontFamily:"'DM Mono',monospace",fontSize:9,cursor:"pointer",letterSpacing:1}}>OUT</button>
            </div>
          )}
          <button onClick={()=>onNavigate("dashboard")}
            style={{background:"none",border:"1px solid #1a1a1a",color:"#444",padding:"6px 16px",fontFamily:"'DM Mono',monospace",fontSize:10,cursor:"pointer",letterSpacing:2,transition:"all 0.2s",position:"relative"}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor="#c8ff00";e.currentTarget.style.color="#c8ff00"}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor="#1a1a1a";e.currentTarget.style.color="#444"}}>
            DASHBOARD {queueCount>0&&<span style={{color:"#c8ff00",marginLeft:4}}>{queueCount}</span>}
          </button>
          <button onClick={()=>{setShowKey(v=>!v);setKeyDraft(apiKey);}}
            style={{background:"none",border:`1px solid ${apiKey?"#1e2e0e":"#1a1a1a"}`,color:apiKey?"#c8ff00":"#444",padding:"6px 16px",fontFamily:"'DM Mono',monospace",fontSize:10,cursor:"pointer",letterSpacing:2}}>
            {apiKey?"● API":"○ API KEY"}
          </button>
        </div>
      </header>

      {/* API KEY */}
      {showKey&&(
        <div style={{background:"#080808",borderBottom:"1px solid #111",padding:"14px 48px",display:"flex",gap:10,alignItems:"center",animation:"slideDown 0.2s ease",zIndex:99,position:"relative"}}>
          <span style={{color:"#333",fontSize:10,letterSpacing:2,whiteSpace:"nowrap"}}>ANTHROPIC KEY</span>
          <input type="password" value={keyDraft} onChange={e=>setKeyDraft(e.target.value)} onKeyDown={e=>e.key==="Enter"&&saveKey()} placeholder="sk-ant-api03-..."
            style={{flex:1,background:"#0f0f0f",border:"1px solid #1e1e1e",color:"#ccc",padding:"8px 14px",fontFamily:"'DM Mono',monospace",fontSize:12}}/>
          <button onClick={saveKey} style={{background:"#c8ff00",border:"none",color:"#000",padding:"8px 24px",fontFamily:"'Bebas Neue',sans-serif",fontSize:15,letterSpacing:3,cursor:"pointer"}}>SAVE</button>
          {apiKey&&<button onClick={()=>{localStorage.removeItem("lmc_repurpose_key");setApiKey("");setShowKey(false);}} style={{background:"none",border:"1px solid #1a1a1a",color:"#444",padding:"8px 16px",fontFamily:"'DM Mono',monospace",fontSize:10,cursor:"pointer",letterSpacing:1}}>CLEAR</button>}
        </div>
      )}

      {/* PLATFORM BAR */}
      <PlatformBar accounts={accounts} onConnect={connectPlatform} onDisconnect={disconnectPlatform} loading={loadingAccounts}/>

      {/* MAIN */}
      <main style={{maxWidth:1140,margin:"0 auto",padding:"48px 48px 80px"}}>
        <div style={{marginBottom:48}}>
          <h1 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:52,letterSpacing:4,color:"#fff",lineHeight:1,marginBottom:10}}>
            ONE IDEA.<br/><span style={{color:"#c8ff00"}}>EVERY PLATFORM.</span>
          </h1>
          <p style={{fontFamily:"'DM Mono',monospace",fontSize:12,color:"#252525",letterSpacing:1}}>
            Generate + publish + queue in one flow.
          </p>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 300px",gap:40,alignItems:"start"}}>
          <div style={{display:"flex",flexDirection:"column",gap:36}}>

            {/* Source */}
            <section>
              <label style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:11,letterSpacing:4,color:"#333",display:"block",marginBottom:14}}>01 — SOURCE CONTENT</label>
              <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
                {INPUT_TYPES.map(t=>(
                  <button key={t.id} className={`ib${inputType===t.id?" on":""}`} onClick={()=>setInputType(t.id)}
                    style={{background:"none",border:`1px solid ${inputType===t.id?"#c8ff00":"#171717"}`,color:inputType===t.id?"#c8ff00":"#444",padding:"5px 14px",fontFamily:"'DM Mono',monospace",fontSize:10,cursor:"pointer",letterSpacing:1.5}}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
              <textarea value={inputContent} onChange={e=>setInputContent(e.target.value)}
                placeholder="Paste your idea, transcript, article, or post here..."
                style={{width:"100%",minHeight:160,background:"#080808",border:"1px solid #141414",color:"#ccc",padding:"16px",fontFamily:"'DM Mono',monospace",fontSize:12,lineHeight:1.8,resize:"vertical"}}/>
              <div style={{display:"flex",justifyContent:"flex-end",marginTop:6,color:"#1e1e1e",fontSize:10,letterSpacing:1}}>{inputContent.length} CHARS</div>
            </section>

            {/* Formats */}
            <section>
              <label style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:11,letterSpacing:4,color:"#333",display:"block",marginBottom:14}}>
                03 — OUTPUT FORMATS <span style={{color:"#c8ff00",marginLeft:8}}>{selectedFormats.length} SELECTED</span>
              </label>
              <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                {FORMATS.map(f=>(
                  <button key={f.id} className={`fc${selectedFormats.includes(f.id)?" on":""}`} onClick={()=>toggleFormat(f.id)}
                    style={{background:selectedFormats.includes(f.id)?"#c8ff00":"none",border:`1px solid ${selectedFormats.includes(f.id)?"#c8ff00":"#171717"}`,color:selectedFormats.includes(f.id)?"#000":"#444",padding:"8px 16px",fontFamily:"'DM Mono',monospace",fontSize:11,cursor:"pointer",letterSpacing:1,position:"relative"}}>
                    {f.icon} {f.label}
                    {f.publishTo&&<span style={{position:"absolute",top:3,right:3,width:4,height:4,borderRadius:"50%",background:accounts[f.publishTo]?.length>0?"#c8ff00":"#222"}}/>}
                  </button>
                ))}
              </div>
            </section>

            {/* Generate */}
            <div style={{display:"flex",alignItems:"center",gap:20}}>
              <button className="gb" onClick={generate} disabled={!inputContent.trim()||!selectedFormats.length||isGenerating}
                style={{background:"#c8ff00",border:"none",color:"#000",padding:"16px 52px",fontFamily:"'Bebas Neue',sans-serif",fontSize:20,letterSpacing:4,cursor:"pointer"}}>
                {isGenerating?`GENERATING...`:`REPURPOSE → ${selectedFormats.length} FORMAT${selectedFormats.length!==1?"S":""}`}
              </button>
              {allDone&&<span style={{color:"#c8ff00",fontSize:11,letterSpacing:2,animation:"fadeUp 0.3s ease"}}>✓ DONE</span>}
            </div>
          </div>

          {/* Tone + packs */}
          <div style={{position:"sticky",top:80}}>
            <label style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:11,letterSpacing:4,color:"#333",display:"block",marginBottom:14}}>02 — TONE</label>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {TONES.map(t=>(
                <button key={t} className={`tb${tone===t?" on":""}`} onClick={()=>setTone(t)}
                  style={{background:tone===t?"#0c0c0c":"none",border:`1px solid ${tone===t?"#c8ff00":"#141414"}`,color:tone===t?"#c8ff00":"#333",padding:"11px 16px",textAlign:"left",fontFamily:"'DM Mono',monospace",fontSize:11,cursor:"pointer",letterSpacing:1}}>
                  <span style={{marginRight:10,opacity:tone===t?1:0}}>▸</span>{t}
                </button>
              ))}
            </div>
            <div style={{marginTop:28,padding:"18px",background:"#080808",border:"1px solid #0f0f0f"}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:11,letterSpacing:3,color:"#222",marginBottom:10}}>QUICK SELECT</div>
              {[
                {label:"TikTok Pack",  formats:["tiktok_script","instagram_caption","carousel_slides"]},
                {label:"Written Pack", formats:["twitter_thread","linkedin_post","blog_post"]},
                {label:"All Formats",  formats:FORMATS.map(f=>f.id)},
              ].map(pack=>(
                <button key={pack.label} onClick={()=>setSelectedFormats(pack.formats)}
                  style={{display:"block",width:"100%",background:"none",border:"1px solid #141414",color:"#444",padding:"8px 14px",textAlign:"left",fontFamily:"'DM Mono',monospace",fontSize:10,cursor:"pointer",letterSpacing:1,marginBottom:6,transition:"all 0.15s"}}
                  onMouseEnter={e=>{e.target.style.borderColor="#2a2a2a";e.target.style.color="#888"}}
                  onMouseLeave={e=>{e.target.style.borderColor="#141414";e.target.style.color="#444"}}>
                  {pack.label} ({pack.formats.length})
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* OUTPUTS */}
        {hasGenerated&&(
          <div ref={outputRef} style={{marginTop:64}}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:11,letterSpacing:4,color:"#333",marginBottom:24}}>
              04 — OUTPUT {allDone&&<span style={{color:"#c8ff00",marginLeft:12}}>{selectedFormats.length} FORMATS READY</span>}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(500px,1fr))",gap:16}}>
              {selectedFormats.map(format=>(
                <OutputCard key={format} format={format} content={outputs[format]||""} loading={!!loadingFormats[format]} accounts={accounts} onAddToQueue={onAddToQueue}/>
              ))}
            </div>
          </div>
        )}
      </main>

            {hasGenerated && allDone && (
          <div style={{marginTop:48}}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:11,letterSpacing:4,color:"#333",marginBottom:24}}>05 — QUOTE CARD</div>
            <QuoteCard prefillText={outputs[selectedFormats[0]] ? outputs[selectedFormats[0]].split(String.fromCharCode(10)).find(l=>l.trim()&&!l.startsWith("**")&&l.length>20)||"" : ""} />
          </div>
        )}
      </main>
      <footer style={{borderTop:"1px solid #0a0a0a",padding:"20px 48px",display:"flex",justifyContent:"space-between",color:"#1a1a1a",fontSize:10,letterSpacing:2}}>
        <span>LOUDMINDSCLUB</span>
        <span>REPURPOSE ENGINE v2.0 — FLOW A+B+C</span>
      </footer>
    </div>
  );
}