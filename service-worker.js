const CACHE_NAME="central-humana-bb-ui-v10-2026.09.30.10";
const CORE=[
  "./",
  "./index.html",
  "./css/app.css",
  "./css/interface.css",
  "./js/boot.js",
  "./js/xlsx-native.js",
  "./js/app.js",
  "./js/enhancements.js",
  "./js/pwa.js",
  "./data/database.js",
  "./manifest.webmanifest",
  "./favicon.ico",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./assets/logos/humana-saude.png",
  "./assets/logos/bb-saude-seguros.png"
];
self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(CORE)));});
self.addEventListener("activate",event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME&&k.startsWith("central-humana-bb-")).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener("message",event=>{if(event.data&&event.data.type==="SKIP_WAITING")self.skipWaiting();});
self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET")return;
  const url=new URL(event.request.url);if(url.origin!==self.location.origin)return;
  if(event.request.mode==="navigate"){event.respondWith(fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE_NAME).then(c=>c.put("./index.html",copy));return response;}).catch(()=>caches.match("./index.html")));return;}
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{if(response&&response.ok){const copy=response.clone();caches.open(CACHE_NAME).then(c=>c.put(event.request,copy));}return response;})));
});
