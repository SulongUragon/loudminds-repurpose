const CORS={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, POST, DELETE, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization'};
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{...CORS,'Content-Type':'application/json'}})}
function redirect(url){return Response.redirect(url,302)}
function base64url(buffer){return btoa(String.fromCharCode(...new Uint8Array(buffer))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'')}
async function generatePKCE(){const verifier=base64url(crypto.getRandomValues(new Uint8Array(32)));const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier));return{verifier,challenge:base64url(digest)}}
function randomState(){return base64url(crypto.getRandomValues(new Uint8Array(16)))}
function redirectToApp(platform,status,info){return redirect(`https://repurpose.loudminds.club?oauth=${platform}&status=${status}&info=${encodeURIComponent(info)}`)}

// ── GOOGLE AUTH ───────────────────────────────────────────────────────────────
async function googleStart(env){
  const state=randomState();
  await env.LMC_KV.put(`google_state:${state}`,'1',{expirationTtl:600});
  const params=new URLSearchParams({
    client_id:env.GOOGLE_CLIENT_ID,
    redirect_uri:`${env.WORKER_URL}/auth/google/callback`,
    response_type:'code',
    scope:'openid email profile',
    state,
    access_type:'offline',
    prompt:'select_account',
  });
  return redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}

async function googleCallback(url,env){
  const code=url.searchParams.get('code');
  const state=url.searchParams.get('state');
  const error=url.searchParams.get('error');
  if(error)return redirect(`https://repurpose.loudminds.club?google=error&msg=${encodeURIComponent(error)}`);
  const valid=await env.LMC_KV.get(`google_state:${state}`);
  if(!valid)return redirect(`https://repurpose.loudminds.club?google=error&msg=invalid_state`);

  const tokenRes=await fetch('https://oauth2.googleapis.com/token',{
    method:'POST',
    headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({
      code,
      client_id:env.GOOGLE_CLIENT_ID,
      client_secret:env.GOOGLE_CLIENT_SECRET,
      redirect_uri:`${env.WORKER_URL}/auth/google/callback`,
      grant_type:'authorization_code',
    }),
  });
  const tokens=await tokenRes.json();
  if(tokens.error)return redirect(`https://repurpose.loudminds.club?google=error&msg=${encodeURIComponent(tokens.error)}`);

  const profileRes=await fetch('https://www.googleapis.com/oauth2/v3/userinfo',{
    headers:{Authorization:`Bearer ${tokens.access_token}`},
  });
  const profile=await profileRes.json();

  const userId=profile.sub;
  const userData={
    userId,
    email:profile.email,
    name:profile.name,
    picture:profile.picture,
    firstSeen:Date.now(),
    lastSeen:Date.now(),
    visits:1,
  };

  // Check if existing user
  const existing=await env.LMC_KV.get(`user:${userId}`);
  if(existing){
    const prev=JSON.parse(existing);
    userData.firstSeen=prev.firstSeen;
    userData.visits=(prev.visits||1)+1;
  }

  await env.LMC_KV.put(`user:${userId}`,JSON.stringify(userData));
  await env.LMC_KV.put(`user_email:${profile.email}`,userId);
  await env.LMC_KV.delete(`google_state:${state}`);

  // Create a session token
  const sessionToken=base64url(crypto.getRandomValues(new Uint8Array(32)));
  await env.LMC_KV.put(`session:${sessionToken}`,userId,{expirationTtl:60*60*24*30}); // 30 days

  return redirect(`https://repurpose.loudminds.club?google=success&session=${sessionToken}&name=${encodeURIComponent(profile.name)}&email=${encodeURIComponent(profile.email)}&picture=${encodeURIComponent(profile.picture||'')}`);
}

async function verifySession(request,env){
  const{token}=await request.json();
  if(!token)return json({valid:false},401);
  const userId=await env.LMC_KV.get(`session:${token}`);
  if(!userId)return json({valid:false},401);
  const raw=await env.LMC_KV.get(`user:${userId}`);
  if(!raw)return json({valid:false},401);
  const user=JSON.parse(raw);
  // Update last seen
  user.lastSeen=Date.now();
  await env.LMC_KV.put(`user:${userId}`,JSON.stringify(user));
  return json({valid:true,user});
}

// ── ADMIN ─────────────────────────────────────────────────────────────────────
async function listUsers(request,env){
  const auth=request.headers.get('Authorization');
  if(auth!==`Bearer ${env.ADMIN_SECRET}`)return json({error:'Unauthorized'},401);
  const list=await env.LMC_KV.list({prefix:'user:'});
  const users=[];
  for(const key of list.keys){
    if(key.name.includes('user_email:'))continue;
    const raw=await env.LMC_KV.get(key.name);
    if(raw)users.push(JSON.parse(raw));
  }
  users.sort((a,b)=>b.lastSeen-a.lastSeen);
  return json({users,total:users.length});
}

// ── GENERATE ──────────────────────────────────────────────────────────────────
async function handleGenerate(request,env){
  const body=await request.json();
  const{apiKey,...claudeBody}=body;
  const key=apiKey||env.CLAUDE_API_KEY;
  if(!key)return json({error:'No API key'},401);
  const res=await fetch('https://api.anthropic.com/v1/messages',{
    method:'POST',
    headers:{'Content-Type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01'},
    body:JSON.stringify(claudeBody),
  });
  const data=await res.json();
  return json(data,res.status);
}

// ── TWITTER ───────────────────────────────────────────────────────────────────
async function twitterStart(env){const{verifier,challenge}=await generatePKCE();const state=randomState();await env.LMC_KV.put(`pkce:${state}`,verifier,{expirationTtl:600});const params=new URLSearchParams({response_type:'code',client_id:env.TWITTER_CLIENT_ID,redirect_uri:`${env.WORKER_URL}/auth/twitter/callback`,scope:'tweet.read tweet.write users.read offline.access',state,code_challenge:challenge,code_challenge_method:'S256'});return redirect(`https://twitter.com/i/oauth2/authorize?${params}`)}
async function twitterCallback(url,env){const code=url.searchParams.get('code');const state=url.searchParams.get('state');if(url.searchParams.get('error'))return redirectToApp('twitter','error',url.searchParams.get('error'));const verifier=await env.LMC_KV.get(`pkce:${state}`);if(!verifier)return redirectToApp('twitter','error','invalid_state');const tokenRes=await fetch('https://api.twitter.com/2/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',Authorization:`Basic ${btoa(`${env.TWITTER_CLIENT_ID}:${env.TWITTER_CLIENT_SECRET}`)}`},body:new URLSearchParams({code,grant_type:'authorization_code',redirect_uri:`${env.WORKER_URL}/auth/twitter/callback`,code_verifier:verifier})});const tokens=await tokenRes.json();if(tokens.error)return redirectToApp('twitter','error',tokens.error);const{data:user}=await(await fetch('https://api.twitter.com/2/users/me',{headers:{Authorization:`Bearer ${tokens.access_token}`}})).json();await env.LMC_KV.put(`account:twitter:${user.id}`,JSON.stringify({platform:'twitter',userId:user.id,username:user.username,name:user.name,accessToken:tokens.access_token,refreshToken:tokens.refresh_token,expiresAt:Date.now()+(tokens.expires_in*1000),connectedAt:Date.now()}));await env.LMC_KV.delete(`pkce:${state}`);return redirectToApp('twitter','success',user.username)}
async function twitterRefresh(account,env){if(Date.now()<account.expiresAt-60000)return account;const tokenRes=await fetch('https://api.twitter.com/2/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',Authorization:`Basic ${btoa(`${env.TWITTER_CLIENT_ID}:${env.TWITTER_CLIENT_SECRET}`)}`},body:new URLSearchParams({grant_type:'refresh_token',refresh_token:account.refreshToken})});const tokens=await tokenRes.json();if(tokens.error)throw new Error(`Token refresh failed: ${tokens.error}`);const updated={...account,accessToken:tokens.access_token,refreshToken:tokens.refresh_token||account.refreshToken,expiresAt:Date.now()+(tokens.expires_in*1000)};await env.LMC_KV.put(`account:twitter:${account.userId}`,JSON.stringify(updated));return updated}
async function publishTwitter(content,accountId,env){const raw=await env.LMC_KV.get(`account:twitter:${accountId}`);if(!raw)throw new Error('Twitter account not connected');let account=await twitterRefresh(JSON.parse(raw),env);const blocks=content.split(/\n\n+/).filter(b=>b.trim()).map(b=>b.trim());const tweets=[];for(const block of blocks){if(block.length<=280){tweets.push(block)}else{let r=block;while(r.length>0){tweets.push(r.slice(0,278));r=r.slice(278)}}}let replyToId=null;const posted=[];for(const tweet of tweets.slice(0,25)){const body={text:tweet};if(replyToId)body.reply={in_reply_to_tweet_id:replyToId};const res=await fetch('https://api.twitter.com/2/tweets',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${account.accessToken}`},body:JSON.stringify(body)});const data=await res.json();if(data.errors)throw new Error(data.errors[0].message);replyToId=data.data.id;posted.push(data.data.id);if(tweets.length>1)await new Promise(r=>setTimeout(r,500))}return{url:`https://twitter.com/${account.username}/status/${posted[0]}`,count:posted.length}}

// ── LINKEDIN ──────────────────────────────────────────────────────────────────
async function linkedinStart(env){const state=randomState();await env.LMC_KV.put(`li:${state}`,'1',{expirationTtl:600});const params=new URLSearchParams({response_type:'code',client_id:env.LINKEDIN_CLIENT_ID,redirect_uri:`${env.WORKER_URL}/auth/linkedin/callback`,scope:'openid profile email w_member_social',state});return redirect(`https://www.linkedin.com/oauth/v2/authorization?${params}`)}
async function linkedinCallback(url,env){const code=url.searchParams.get('code');const state=url.searchParams.get('state');if(url.searchParams.get('error'))return redirectToApp('linkedin','error',url.searchParams.get('error'));const valid=await env.LMC_KV.get(`li:${state}`);if(!valid)return redirectToApp('linkedin','error','invalid_state');const tokenRes=await fetch('https://www.linkedin.com/oauth/v2/accessToken',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'authorization_code',code,redirect_uri:`${env.WORKER_URL}/auth/linkedin/callback`,client_id:env.LINKEDIN_CLIENT_ID,client_secret:env.LINKEDIN_CLIENT_SECRET})});const tokens=await tokenRes.json();if(tokens.error)return redirectToApp('linkedin','error',tokens.error);const profile=await(await fetch('https://api.linkedin.com/v2/userinfo',{headers:{Authorization:`Bearer ${tokens.access_token}`}})).json();await env.LMC_KV.put(`account:linkedin:${profile.sub}`,JSON.stringify({platform:'linkedin',userId:profile.sub,username:profile.email,name:profile.name,picture:profile.picture,accessToken:tokens.access_token,expiresAt:Date.now()+(tokens.expires_in*1000),connectedAt:Date.now()}));await env.LMC_KV.delete(`li:${state}`);return redirectToApp('linkedin','success',profile.name)}
async function publishLinkedIn(content,accountId,env){const raw=await env.LMC_KV.get(`account:linkedin:${accountId}`);if(!raw)throw new Error('LinkedIn account not connected');const account=JSON.parse(raw);if(Date.now()>account.expiresAt-60000)throw new Error('LinkedIn token expired — please reconnect');const res=await fetch('https://api.linkedin.com/v2/ugcPosts',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${account.accessToken}`,'X-Restli-Protocol-Version':'2.0.0'},body:JSON.stringify({author:`urn:li:person:${account.userId}`,lifecycleState:'PUBLISHED',specificContent:{'com.linkedin.ugc.ShareContent':{shareCommentary:{text:content},shareMediaCategory:'NONE'}},visibility:{'com.linkedin.ugc.MemberNetworkVisibility':'PUBLIC'}})});if(!res.ok){const e=await res.json();throw new Error(e.message||`LinkedIn error ${res.status}`)}const data=await res.json();return{id:data.id,url:`https://www.linkedin.com/feed/update/${data.id}/`}}

// ── ACCOUNTS ──────────────────────────────────────────────────────────────────
async function listAccounts(env){const result={twitter:[],linkedin:[]};for(const platform of['twitter','linkedin']){const list=await env.LMC_KV.list({prefix:`account:${platform}:`});for(const key of list.keys){const raw=await env.LMC_KV.get(key.name);if(!raw)continue;const a=JSON.parse(raw);result[platform].push({userId:a.userId,username:a.username,name:a.name,picture:a.picture||null,platform:a.platform,connectedAt:a.connectedAt,expired:Date.now()>a.expiresAt})}}return result}

// ── ROUTER ────────────────────────────────────────────────────────────────────
export default{async fetch(request,env){
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:CORS});
  const url=new URL(request.url);
  const path=url.pathname;
  try{
    if(path==='/generate'&&request.method==='POST')return handleGenerate(request,env);
    if(path==='/auth/google/start')return googleStart(env);
    if(path==='/auth/google/callback')return googleCallback(url,env);
    if(path==='/auth/verify-session'&&request.method==='POST')return verifySession(request,env);
    if(path==='/admin/users'&&request.method==='GET')return listUsers(request,env);
    if(path==='/auth/twitter/start')return twitterStart(env);
    if(path==='/auth/twitter/callback')return twitterCallback(url,env);
    if(path==='/auth/linkedin/start')return linkedinStart(env);
    if(path==='/auth/linkedin/callback')return linkedinCallback(url,env);
    if(path==='/accounts'&&request.method==='GET')return json({accounts:await listAccounts(env)});
    if(path.startsWith('/accounts/')&&request.method==='DELETE'){const[,,platform,userId]=path.split('/');await env.LMC_KV.delete(`account:${platform}:${userId}`);return json({success:true})}
    if(path==='/publish/twitter'&&request.method==='POST'){const{content,accountId,format}=await request.json();const result=await publishTwitter(content,accountId,env);await env.LMC_KV.put(`log:${Date.now()}`,JSON.stringify({platform:'twitter',format,result,publishedAt:new Date().toISOString()}),{expirationTtl:86400*30});return json({success:true,result})}
    if(path==='/publish/linkedin'&&request.method==='POST'){const{content,accountId,format}=await request.json();const result=await publishLinkedIn(content,accountId,env);await env.LMC_KV.put(`log:${Date.now()}`,JSON.stringify({platform:'linkedin',format,result,publishedAt:new Date().toISOString()}),{expirationTtl:86400*30});return json({success:true,result})}
    return json({error:'Not found'},404);
  }catch(e){return json({error:e.message},500)}
}};
