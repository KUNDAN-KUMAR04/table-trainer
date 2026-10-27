/* Table Trainer service worker: the whole site works offline. Bump CACHE when you publish a new version. */
const CACHE="tt-final-2",PRE=["./","index.html","donate.html","privacy.html","manifest.webmanifest","404.html","assets/icon-192.png","assets/icon-512.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>Promise.all(PRE.map(u=>c.add(new Request(u,{cache:"reload"})).catch(()=>{})))).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x.startsWith("tt-")&&x!==CACHE).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{const r=e.request;if(r.method!=="GET")return;const u=new URL(r.url);
  const ok=/(^|\.)(fonts\.googleapis\.com|fonts\.gstatic\.com|www\.gstatic\.com|cdnjs\.cloudflare\.com)$/.test(u.hostname);
  if(u.origin!==location.origin&&!ok)return;              /* Firestore / Auth / other APIs are never cached */
  if(u.origin===location.origin&&/\/dev\.html$/.test(u.pathname))return;   /* developer console always fresh */
  e.respondWith((async()=>{const c=await caches.open(CACHE),hit=await c.match(r,{ignoreSearch:true});
    const net=fetch(r).then(res=>{if(res&&(res.ok||res.type==="opaque"))c.put(r,res.clone());return res}).catch(()=>null);
    if(hit){e.waitUntil(net);return hit}                  /* cached copy now, refreshed in the background */
    const res=await net;if(res)return res;
    if(r.mode==="navigate"){const f=await c.match("index.html");if(f)return f}
    return new Response("Offline",{status:503,statusText:"Offline"})})())});
