
(function(){
  "use strict";
  window.CENTRAL_BUILD_INFO={version:"2026.09.30.10",databaseSha256:"cfe78bf96052db78c9113977ec2107fc49a7f1d32f5be85ee2a4e38c103ca69d",records:114,priceRows:1140,campaigns:18,procedures:94,sources:74,states:["MA", "PI"]};


  /* =========================================================
     DATABASE / STATE
     ========================================================= */
  var DB = null;
  var EXPECTED = {records:114,priceRows:1140,campaigns:18,procedures:94,states:2,ageBands:10};
  var PRICE_ROWS = [];
  var ROW_INDEX = Object.create(null);
  var RECORD_INDEX = Object.create(null);
  var COMMERCIAL_GROUP_INDEX = Object.create(null);
  var SEARCH_TIMER = null;
  var TOAST_TIMER = null;
  var ACTIVE_SUGGESTION = -1;
  var DIAG = window.CentralDiagnostics=window.CentralDiagnostics||{errors:[]};
  function registerEarlyError(module,error){try{DIAG.errors=DIAG.errors||[];DIAG.errors.push({type:"module",module:module,message:String(error&&error.message?error.message:error),stack:error&&error.stack?String(error.stack):"",time:(new Date()).toISOString()})}catch(e){}}
  if(!Array.from)Array.from=function(x){return Array.prototype.slice.call(x||[])};
  if(typeof window.Set!=="function"){window.Set=function(items){this._v=[];this.size=0;var self=this;(items||[]).forEach(function(x){self.add(x)})};window.Set.prototype.has=function(x){return this._v.indexOf(x)>=0};window.Set.prototype.add=function(x){if(!this.has(x)){this._v.push(x);this.size=this._v.length}return this};window.Set.prototype.delete=function(x){var i=this._v.indexOf(x);if(i<0)return false;this._v.splice(i,1);this.size=this._v.length;return true};window.Set.prototype.forEach=function(fn,ctx){var self=this;this._v.slice().forEach(function(x){fn.call(ctx,x,x,self)})}}
  if(window.Element&&!Element.prototype.matches)Element.prototype.matches=Element.prototype.msMatchesSelector||Element.prototype.webkitMatchesSelector;
  if(window.Element&&!Element.prototype.closest)Element.prototype.closest=function(sel){var el=this;while(el&&el.nodeType===1){if(el.matches(sel))return el;el=el.parentElement||el.parentNode}return null};
  if(window.Element&&!Element.prototype.remove)Element.prototype.remove=function(){if(this.parentNode)this.parentNode.removeChild(this)};
  if(!window.requestAnimationFrame)window.requestAnimationFrame=function(cb){return setTimeout(cb,16)};
  function safeMatchMedia(q){try{if(window.matchMedia)return window.matchMedia(q)}catch(e){}return {matches:false,addListener:function(){},removeListener:function(){}}}
  var BREAKPOINT_WIDE=safeMatchMedia("(min-width:901px)");
  function safeParse(value,fallback){try{return JSON.parse(value)}catch(e){return fallback}}
  var StorageService=(function(){var memory=Object.create(null),available=false,prefix="central-humana:";try{var t=prefix+"__test__";window.localStorage.setItem(t,"1");window.localStorage.removeItem(t);available=true}catch(e){available=false}DIAG.storageAvailable=available;return {available:available,get:function(key,fallback){var raw=null;try{raw=available?window.localStorage.getItem(prefix+key):(Object.prototype.hasOwnProperty.call(memory,key)?memory[key]:null)}catch(e){raw=Object.prototype.hasOwnProperty.call(memory,key)?memory[key]:null;registerEarlyError("storage.get",e)}return raw===null||raw===undefined?fallback:safeParse(raw,fallback)},set:function(key,value){var raw;try{raw=JSON.stringify(value)}catch(e){registerEarlyError("storage.stringify",e);return false}memory[key]=raw;if(!available)return false;try{window.localStorage.setItem(prefix+key,raw);return true}catch(e){available=false;DIAG.storageAvailable=false;registerEarlyError("storage.set",e);return false}},remove:function(key){delete memory[key];if(available)try{window.localStorage.removeItem(prefix+key)}catch(e){registerEarlyError("storage.remove",e)}}}})();
  function storageGet(key,fallback){return StorageService.get(key,fallback)}
  function storageSet(key,value){return StorageService.set(key,value)}
  function arrayToSet(arr){var s=new Set();(arr||[]).forEach(function(x){s.add(x)});return s}
  function setToArray(set){var out=[];if(set&&set.forEach)set.forEach(function(x){out.push(x)});return out}

  var STATE = {
    view: storageGet("price-view","table"),
    density: storageGet("density","comfortable"),
    favorites: arrayToSet(storageGet("favorites",[])),
    configFavorites: arrayToSet(storageGet("config-favorites",[])),
    compare: [],
    favoritesOnly:false,
    visibleLimit:60,
    campaignState:"Todos",
    copayMode:"complete",
    openCommercialGroups:new Set(),
    pinnedAge:"",
    mobileFullTable:false,
    mobilePriceMode:storageGet("mobile-price-mode","compact")==="detail"?"detail":"compact",
    shouldAutoScrollAge:false,
    sidebarCollapsed:!!storageGet("sidebar-collapsed",false)
  };

  /* =========================================================
     HELPERS
     ========================================================= */
  if(!window.CSS)window.CSS={};if(!window.CSS.escape)window.CSS.escape=function(value){return String(value).replace(/[^a-zA-Z0-9_-]/g,function(ch){return "\\"+ch})};
  function $(sel,root){return (root||document).querySelector(sel)}
  function $$(sel,root){return Array.prototype.slice.call((root||document).querySelectorAll(sel))}
  function esc(value){
    return String(value===null||value===undefined?"":value).replace(/[&<>"']/g,function(ch){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch];
    });
  }
  function norm(value){
    var s=String(value===null||value===undefined?"":value).toLowerCase();
    try{s=s.normalize("NFD").replace(/[\u0300-\u036f]/g,"")}catch(e){}
    s=s.replace(/pessoa\s+fisica/g,"pf").replace(/pessoa\s+juridica/g,"pme").replace(/copay/g,"coparticipacao");
    return s.replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim();
  }
  function uniq(arr){
    var seen=Object.create(null),out=[];
    arr.forEach(function(v){
      if(v===null||v===undefined||String(v).trim()==="")return;
      var k=norm(v);
      if(!seen[k]){seen[k]=true;out.push(String(v))}
    });
    return out;
  }
  function sortText(arr){return arr.slice().sort(function(a,b){return String(a).localeCompare(String(b),"pt-BR",{sensitivity:"base",numeric:true})})}
  function moneyNum(v){
    var s=String(v===0?0:(v||"")).replace(/[^\d,.-]/g,"").replace(/\./g,"").replace(",",".");
    var n=parseFloat(s);return isFinite(n)?n:Infinity;
  }
  function moneyBR(n){
    if(!isFinite(n))return "—";
    try{return n.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}catch(e){return "R$ "+n.toFixed(2).replace(".",",")}
  }
  function keyOf(record,row){return record.id+"::"+row.age}
  function icon(name){var ref="#i-"+name;return '<svg class="icon" aria-hidden="true"><use href="'+ref+'" xlink:href="'+ref+'"></use></svg>'}
  function debounceRender(){
    clearTimeout(SEARCH_TIMER);
    SEARCH_TIMER=setTimeout(function(){STATE.visibleLimit=60;renderPlans()},120);
  }
  function toast(message){
    var el=$("#toast");if(!el)return;
    el.textContent=message;el.classList.add("show");
    clearTimeout(TOAST_TIMER);
    TOAST_TIMER=setTimeout(function(){el.classList.remove("show")},1900);
  }
  function safeScrollIntoView(el,block){if(!el)return;try{el.scrollIntoView({behavior:"smooth",block:block||"start",inline:"nearest"})}catch(e){try{el.scrollIntoView(block==="end"?false:true)}catch(ignore){}}}
  function scrollToId(id){safeScrollIntoView(document.getElementById(id),"start")}
  function openManualCopy(text){openModal("Copiar informações","Toque e segure o texto para selecionar e copiar.",'<textarea class="manual-copy" readonly aria-label="Texto para copiar">'+esc(text)+'</textarea>','<button class="btn btn-blue" type="button" data-modal-close>Fechar</button>');setTimeout(function(){var ta=$(".manual-copy");if(ta)try{ta.focus();ta.select()}catch(e){}},0)}
  function copyText(text,success){function fallback(){var ta=document.createElement("textarea"),ok=false;ta.value=text;ta.setAttribute("readonly","");ta.style.position="fixed";ta.style.left="-9999px";ta.style.top="0";ta.style.fontSize="16px";document.body.appendChild(ta);try{ta.focus();ta.select();ok=!!document.execCommand&&document.execCommand("copy")}catch(e){ok=false}ta.remove();if(ok)toast(success||"Informações copiadas");else openManualCopy(text)}try{if(navigator.clipboard&&window.isSecureContext&&navigator.clipboard.writeText)navigator.clipboard.writeText(text).then(function(){toast(success||"Informações copiadas")}).catch(fallback);else fallback()}catch(e){fallback()}}
  function renderValue(v){
    return norm(v)==="zero"?'<span class="zero">ZERO</span>':esc(v||"—");
  }
  function ageBand(age){
    var n=parseInt(age,10);
    if(!isFinite(n)||n<0||n>120)return "";
    if(n<=18)return "00-18";
    if(n<=23)return "19-23";
    if(n<=28)return "24-28";
    if(n<=33)return "29-33";
    if(n<=38)return "34-38";
    if(n<=43)return "39-43";
    if(n<=48)return "44-48";
    if(n<=53)return "49-53";
    if(n<=58)return "54-58";
    return "59+";
  }

  /* =========================================================
     DATABASE PREPARATION / VALIDATION
     ========================================================= */
  function loadDatabase(){var el=document.getElementById("central-database"),external=window.CENTRAL_DATABASE||null;if(el){DB=JSON.parse(el.textContent||el.innerText||"")}else if(external){DB=external}else{throw new Error("Base comercial não encontrada")};if(!DB||!DB.records||!DB.promotions||!DB.proc_examples)throw new Error("Estrutura da base comercial inválida");DIAG.databaseLoaded=true;DIAG.recordCount=DB.records.length;DIAG.databaseChecksum=(window.CENTRAL_DATABASE_META&&window.CENTRAL_DATABASE_META.sha256)||(document.querySelector('meta[name="central-database-sha256"]')&&document.querySelector('meta[name="central-database-sha256"]' ).content)||"cfe78bf96052db78c9113977ec2107fc49a7f1d32f5be85ee2a4e38c103ca69d";return DB}
  function safeInit(name,fn){try{return fn()}catch(error){registerEarlyError(name,error);return null}}
  function activateCompatibilityMode(error){registerEarlyError("boot",error||new Error("Falha ao iniciar a Central"));DIAG.compatibilityMode=true;var root=document.documentElement;root.className=(root.className||"").replace(/\bjs-booting\b/g,"").replace(/\bapp-ready\b/g,"").replace(/\s+/g," ")+" compat-mode";document.body.className=(document.body.className||"").replace(/\bapp-booting\b/g,"")+" app-compatibility";var msg=document.getElementById("bootMessage"),hint=document.getElementById("bootHint"),retry=document.getElementById("bootRetry");if(msg)msg.textContent="Não foi possível concluir o carregamento da Central.";if(hint)hint.textContent="Recarregue a página. Se o problema continuar, abra a versão offline incluída no pacote.";if(retry)retry.hidden=false}
  function markAppReady(){var root=document.documentElement;root.className=(root.className||"").replace(/\bjs-booting\b/g,"").replace(/\bcompat-mode\b/g,"").replace(/\s+/g," ")+" app-ready";document.body.classList.remove("app-booting","app-compatibility");if(window.__centralWatchdog)clearTimeout(window.__centralWatchdog);DIAG.compatibilityMode=false;DIAG.bootTime=(new Date()).getTime()-(DIAG.bootStartedAt||((new Date()).getTime()));DIAG.priceRowCount=PRICE_ROWS.length;DIAG.protocol=location.protocol;DIAG.platform=navigator.userAgent||"unknown";DIAG.theme=document.documentElement.getAttribute("data-theme")||"light"}
  function scheduleSecondaryModules(){var tasks=[["campaigns",renderCampaigns],["waitingPeriods",renderWaitingPeriods],["prc",renderPrcDefinitions],["copay",renderCopay],["procedures",renderProcedures],["entities",renderEntities],["adhesion",renderAdhesionRules],["network",renderNetwork],["dental",renderDental],["sources",renderSources]],i=0;function next(){if(i>=tasks.length)return;var t=tasks[i++];safeInit(t[0],t[1]);setTimeout(next,0)}if(window.requestIdleCallback){try{requestIdleCallback(function(){next()},{timeout:180})}catch(e){setTimeout(next,16)}}else setTimeout(next,16)}
  function buildPriceRows(){
    PRICE_ROWS=[];
    DB.records.forEach(function(r){
      RECORD_INDEX[r.id]=r;
      (r.rows||[]).forEach(function(row){
        var item={record:r,row:row,key:keyOf(r,row)};
        item.search=norm([
          r.state,r.contract,r.plan,r.region,r.coverage,r.accommodation,r.copay,r.ans,r.segment,r.obstetrics,r.source,r.version,
          r.entity_group,r.footnote,row.age,String(row.age||"").replace(/^00/,"0"),row.health,row.essential,row.dental
        ].join(" "));
        PRICE_ROWS.push(item);
        ROW_INDEX[item.key]=item;
      });
    });
  }
  function validateDatabase(){
    var ids=Object.create(null),dupes=[],missingPlan=[],missingPrice=[],ages=Object.create(null),states=Object.create(null);
    DB.records.forEach(function(r){
      if(ids[r.id])dupes.push(r.id);ids[r.id]=true;
      if(!r.plan)missingPlan.push(r.id);
      states[r.state]=true;
      (r.rows||[]).forEach(function(row){
        ages[row.age]=true;
        if(!row.health)missingPrice.push(r.id+"::"+row.age);
      });
    });
    var procCount=Object.keys(DB.proc_examples||{}).reduce(function(sum,k){return sum+(DB.proc_examples[k]||[]).length},0);
    var report={
      registros:DB.records.length,
      linhasDePreco:PRICE_ROWS.length,
      campanhas:DB.promotions.length,
      procedimentos:procCount,
      estados:Object.keys(states).sort().join(", "),
      faixasEtarias:Object.keys(ages).length,
      idsDuplicados:dupes.length,
      registrosSemPlano:missingPlan.length,
      linhasSemPreco:missingPrice.length
    };
    report.integridade =
      report.registros===EXPECTED.records &&
      report.linhasDePreco===EXPECTED.priceRows &&
      report.campanhas===EXPECTED.campaigns &&
      report.procedimentos===EXPECTED.procedures &&
      Object.keys(states).length===EXPECTED.states &&
      report.faixasEtarias===EXPECTED.ageBands &&
      report.idsDuplicados===0 &&
      report.registrosSemPlano===0 &&
      report.linhasSemPreco===0;
    window.CENTRAL_VALIDATION=report;
    document.documentElement.setAttribute("data-integrity",report.integridade?"ok":"warning");
    try{
      console.groupCollapsed("[Central Comercial] Validação da base");
      console.table(report);
      if(!report.integridade)console.warn("A validação encontrou divergências. Os dados foram preservados sem correção automática.");
      console.groupEnd();
    }catch(e){}
    return report;
  }

  /* =========================================================
     METRICS / SELECTS
     ========================================================= */
  function setSelect(id,values,allLabel){
    var el=$(id);if(!el)return;
    var current=el.value;
    var html=allLabel!==null?'<option value="">'+esc(allLabel||"Todos")+'</option>':"";
    values.forEach(function(v){html+='<option value="'+esc(v)+'">'+esc(v)+'</option>'});
    el.innerHTML=html;
    if(values.indexOf(current)>=0||current==="")el.value=current;
  }
  function initMetrics(){
    $("#metricRecords").textContent=DB.records.length;
    $("#metricRows").textContent=PRICE_ROWS.length.toLocaleString("pt-BR");
    $("#metricCampaigns").textContent=DB.promotions.length;
    var proc=Object.keys(DB.proc_examples).reduce(function(n,k){return n+DB.proc_examples[k].length},0);
    $("#metricProcedures").textContent=proc;
    $("#entityCount").textContent=DB.entities.length+" entidades";
  }
  function initPlanFilters(){
    setSelect("#stateFilter",sortText(uniq(DB.records.map(function(r){return r.state}))),"Todos");
    setSelect("#contractFilter",sortText(uniq(DB.records.map(function(r){return r.contract}))),"Todos");
    setSelect("#planFilter",sortText(uniq(DB.records.map(function(r){return r.plan}))),"Todos");
    setSelect("#ageFilter",["00-18","19-23","24-28","29-33","34-38","39-43","44-48","49-53","54-58","59+"],"Todas");
    setSelect("#copayFilter",sortText(uniq(DB.records.map(function(r){return r.copay}))),"Todos");
    setSelect("#accommodationFilter",sortText(uniq(DB.records.map(function(r){return r.accommodation}))),"Todos");
    setSelect("#segmentFilter",sortText(uniq(DB.records.map(function(r){return r.segment}))),"Todos");
    setSelect("#regionFilter",sortText(uniq(DB.records.map(function(r){return r.region}))),"Todas");
  }

  /* =========================================================
     SEARCH ASSIST / RECENTS / POPULAR
     ========================================================= */
  var RECOMMENDED=["PME PI","PME MA","PF PI","PF MA","Vital","Ideal","Superior","Premium Nacional","0-18","19-23","24-28","29-33","34-38","39-43","44-48","49-53","54-58","59+"];
  var SUGGESTION_POOL=[];
  function buildSuggestionPool(){
    var items=RECOMMENDED.slice();
    DB.records.forEach(function(r){
      items.push(r.plan,r.region,r.ans,r.state+" "+r.contract);
    });
    SUGGESTION_POOL=uniq(items);
  }
  function getRecents(){return storageGet("recents",[])}
  function saveRecent(term){
    term=String(term||"").trim();if(!term)return;
    var arr=getRecents().filter(function(x){return norm(x)!==norm(term)});
    arr.unshift(term);arr=arr.slice(0,8);storageSet("recents",arr);bumpHit(term);renderRecommendations();
  }
  function bumpHit(term){
    term=String(term||"").trim();if(!term)return;
    var hits=storageGet("hits",{});
    var canonical=term.length>48?term.slice(0,48):term;
    hits[canonical]=(hits[canonical]||0)+1;
    storageSet("hits",hits);
  }
  function getPopular(){
    var hits=storageGet("hits",{});
    return Object.keys(hits).sort(function(a,b){return hits[b]-hits[a]}).slice(0,6);
  }
  function chipsHtml(arr){
    return arr.map(function(v){return '<button class="reco-chip" type="button" data-reco="'+esc(v)+'">'+esc(v)+'</button>'}).join("");
  }
  function renderRecommendations(){
    $("#recommendedChips").innerHTML=chipsHtml(RECOMMENDED);
    var rec=getRecents(),pop=getPopular();
    $("#recentGroup").hidden=!rec.length;$("#recentChips").innerHTML=chipsHtml(rec);
    $("#popularGroup").hidden=!pop.length;$("#popularChips").innerHTML=chipsHtml(pop);
  }
  function showSuggestions(query){
    var box=$("#suggestionPopover"),nq=norm(query);
    ACTIVE_SUGGESTION=-1;
    if(!nq){box.hidden=true;return}
    var tokens=nq.split(" ");
    var found=SUGGESTION_POOL.filter(function(v){
      var n=norm(v);return tokens.every(function(t){return n.indexOf(t)>=0});
    }).slice(0,8);
    if(!found.length){box.hidden=true;return}
    box.innerHTML=found.map(function(v){return '<button class="suggestion-item" type="button" data-suggestion="'+esc(v)+'">'+icon("search")+'<span>'+esc(v)+'</span></button>'}).join("");
    box.hidden=false;
  }
  function applySearchTerm(term,remember){
    $("#planSearch").value=term||"";$("#suggestionPopover").hidden=true;if(remember&&term)saveRecent(term);
    STATE.visibleLimit=60;STATE.mobileFullTable=false;STATE.shouldAutoScrollAge=!!parseQueryContext(term).ageBand;renderPlans();
  }

  /* =========================================================
     PLAN SEARCH / FILTERS / COMMERCIAL TABLE RENDERER
     ========================================================= */
  var AGE_ORDER=["00-18","19-23","24-28","29-33","34-38","39-43","44-48","49-53","54-58","59+"];
  var PRODUCT_DEFS=[
    {key:"health",label:"Saúde",className:"health"},
    {key:"essential",label:"Essencial",className:"essential"},
    {key:"dental",label:"Pleno",className:"pleno",detailLabel:"Pleno (Odonto)"}
  ];
  var FILTERS=[
    ["stateFilter","state","Estado"],
    ["contractFilter","contract","Contratação"],
    ["planFilter","plan","Plano"],
    ["ageFilter","age","Faixa"],
    ["copayFilter","copay","Coparticipação"],
    ["accommodationFilter","accommodation","Acomodação"],
    ["segmentFilter","segment","Segmentação"],
    ["regionFilter","region","Região"]
  ];
  function currentFilterValues(){
    var o={};
    FILTERS.forEach(function(f){o[f[1]]=$("#"+f[0]).value});
    return o;
  }
  function canonicalAgeBand(value){
    var s=String(value||"").replace(/\s/g,"").replace(/–/g,"-");
    if(s==="0-18"||s==="00-18")return "00-18";
    if(AGE_ORDER.indexOf(s)>=0)return s;
    return "";
  }
  function parseQueryContext(query){
    var raw=String(query||"").trim(),band="",cleaned=raw,match;
    match=raw.match(/(?:^|\s)(00?\s*[-–]\s*18|19\s*[-–]\s*23|24\s*[-–]\s*28|29\s*[-–]\s*33|34\s*[-–]\s*38|39\s*[-–]\s*43|44\s*[-–]\s*48|49\s*[-–]\s*53|54\s*[-–]\s*58|59\s*\+)(?=\s|$)/i);
    if(match){band=canonicalAgeBand(match[1]);cleaned=(raw.slice(0,match.index)+" "+raw.slice(match.index+match[0].length)).replace(/\s+/g," ").trim()}
    if(!band){
      match=raw.match(/(?:^|\s)(\d{1,3})(?:\s*anos?)?(?=\s|$)/i);
      if(match){var n=parseInt(match[1],10);if(isFinite(n)&&n>=0&&n<=120){band=ageBand(n);cleaned=(raw.slice(0,match.index)+" "+raw.slice(match.index+match[0].length)).replace(/\s+/g," ").trim()}}
    }
    return {raw:raw,text:cleaned,ageBand:band};
  }
  function selectedAgeBand(){
    var explicit=$("#ageFilter").value;
    if(explicit)return explicit;
    var queryBand=parseQueryContext($("#planSearch").value).ageBand;
    if(queryBand)return queryBand;
    return STATE.pinnedAge||"";
  }
  function queryHints(query){
    var context=parseQueryContext(query),nq=norm(context.text),padded=" "+nq+" ",state="",contract="",plan="";
    if(padded.indexOf(" pi ")>=0)state="PI";else if(padded.indexOf(" ma ")>=0)state="MA";
    if(padded.indexOf(" pme ")>=0)contract="PME";else if(padded.indexOf(" pf ")>=0)contract="PF";else if(padded.indexOf(" adesao ")>=0)contract="Adesão";
    var plans=uniq(DB.records.map(function(r){return r.plan})).sort(function(a,b){return norm(b).length-norm(a).length});
    for(var i=0;i<plans.length;i++){var pn=norm(plans[i]);if(pn&&padded.indexOf(" "+pn+" ")>=0){plan=pn;break}}
    var remaining=" "+nq+" ";
    if(state)remaining=remaining.replace(new RegExp("\\s"+state.toLowerCase()+"\\s","g")," ");
    if(contract)remaining=remaining.replace(new RegExp("\\s"+norm(contract)+"\\s","g")," ");
    if(plan)remaining=remaining.replace(" "+plan+" "," ");
    return {state:state,contract:contract,plan:plan,tokens:norm(remaining).split(" ").filter(Boolean)};
  }
  function recordSearch(r){
    if(r.__commercialSearch)return r.__commercialSearch;
    r.__commercialSearch=norm([
      r.state,r.contract,r.plan,r.region,r.coverage,r.accommodation,r.copay,r.ans,r.segment,r.obstetrics,r.source,r.version,r.entity_group,r.footnote,
      (r.rows||[]).map(function(row){return [row.age,row.health,row.essential,row.dental].join(" ")}).join(" ")
    ].join(" "));
    return r.__commercialSearch;
  }
  function queryHintsMatchRecord(r,hints){
    if(hints.state&&r.state!==hints.state)return false;
    if(hints.contract&&norm(r.contract)!==norm(hints.contract))return false;
    if(hints.plan&&norm(r.plan).indexOf(hints.plan)!==0)return false;
    return true;
  }
  function matchesQuery(item,query){
    var context=parseQueryContext(query),nq=norm(context.text);if(!nq)return true;
    var hints=queryHints(query);if(!queryHintsMatchRecord(item.record,hints))return false;
    return hints.tokens.every(function(t){return item.search.indexOf(t)>=0});
  }
  function recordMatchesQuery(r,query){
    var context=parseQueryContext(query),nq=norm(context.text);if(!nq)return true;
    var hints=queryHints(query);if(!queryHintsMatchRecord(r,hints))return false;
    var hay=recordSearch(r);return hints.tokens.every(function(t){return hay.indexOf(t)>=0});
  }
  function recordHasFavorite(r){
    if(STATE.configFavorites.has(r.id))return true;
    return (r.rows||[]).some(function(row){return STATE.favorites.has(keyOf(r,row))});
  }
  function getFilteredRows(){
    var q=$("#planSearch").value, context=parseQueryContext(q), f=currentFilterValues();
    var rows=PRICE_ROWS.filter(function(item){
      var r=item.record,row=item.row;
      if(STATE.favoritesOnly&&!STATE.favorites.has(item.key)&&!STATE.configFavorites.has(r.id))return false;
      if(f.state&&r.state!==f.state)return false;
      if(f.contract&&r.contract!==f.contract)return false;
      if(f.plan&&r.plan!==f.plan)return false;
      if(f.age&&row.age!==f.age)return false;
      if(!f.age&&context.ageBand&&row.age!==context.ageBand)return false;
      if(f.copay&&r.copay!==f.copay)return false;
      if(f.accommodation&&r.accommodation!==f.accommodation)return false;
      if(f.segment&&r.segment!==f.segment)return false;
      if(f.region&&r.region!==f.region)return false;
      return matchesQuery(item,context.text);
    });
    var sort=$("#sortFilter").value;
    rows.sort(function(a,b){
      if(sort==="priceDesc")return moneyNum(b.row.health)-moneyNum(a.row.health);
      if(sort==="planAsc")return a.record.plan.localeCompare(b.record.plan,"pt-BR",{sensitivity:"base"})||moneyNum(a.row.health)-moneyNum(b.row.health);
      if(sort==="stateAsc")return a.record.state.localeCompare(b.record.state)||a.record.plan.localeCompare(b.record.plan,"pt-BR");
      return moneyNum(a.row.health)-moneyNum(b.row.health);
    });
    return rows;
  }
  function getCommercialRecords(){
    var q=$("#planSearch").value,f=currentFilterValues();
    var records=DB.records.filter(function(r){
      if(STATE.favoritesOnly&&!recordHasFavorite(r))return false;
      if(f.state&&r.state!==f.state)return false;
      if(f.contract&&r.contract!==f.contract)return false;
      if(f.plan&&r.plan!==f.plan)return false;
      if(f.copay&&r.copay!==f.copay)return false;
      if(f.accommodation&&r.accommodation!==f.accommodation)return false;
      if(f.segment&&r.segment!==f.segment)return false;
      if(f.region&&r.region!==f.region)return false;
      return recordMatchesQuery(r,q);
    });
    records.sort(function(a,b){
      return a.plan.localeCompare(b.plan,"pt-BR",{sensitivity:"base"})||
        a.state.localeCompare(b.state)||a.contract.localeCompare(b.contract,"pt-BR")||
        accommodationRank(a.accommodation)-accommodationRank(b.accommodation)||copayRank(a.copay)-copayRank(b.copay);
    });
    return records;
  }
  function renderActiveFilters(){
    var f=currentFilterValues(),parts=[];
    FILTERS.forEach(function(def){
      var value=f[def[1]];
      if(value)parts.push('<button class="filter-chip" type="button" data-clear-filter="'+def[0]+'">'+esc(def[2])+': '+esc(value)+' <span class="x">×</span></button>');
    });
    var query=$("#planSearch").value.trim();
    if(query)parts.unshift('<button class="filter-chip" type="button" data-clear-filter="planSearch">Busca: '+esc(query)+' <span class="x">×</span></button>');
    if(STATE.favoritesOnly)parts.push('<button class="filter-chip" type="button" data-clear-filter="favoritesOnly">Somente favoritos <span class="x">×</span></button>');
    $("#activeFilters").innerHTML=parts.join("")||'<span class="muted" style="font-size:11px">Nenhum filtro ativo</span>';
  }
  function renderQueryContext(){
    var f=currentFilterValues(),parts=[];
    if(f.state)parts.push(f.state);if(f.contract)parts.push(f.contract);if(f.plan)parts.push(f.plan);
    var band=selectedAgeBand();if(band)parts.push(band+" anos");
    if(f.accommodation)parts.push(f.accommodation);if(f.copay)parts.push(f.copay);
    var query=$("#planSearch").value.trim();if(query&&!parts.length)parts.push('“'+query+'”');
    var box=$("#queryContext");
    box.hidden=!parts.length&&!STATE.favoritesOnly;
    $("#queryContextText").textContent=(parts.join(" / ")||(STATE.favoritesOnly?"Favoritos":"Filtros ativos"));
  }
  function renderOverview(rows,records,groups){
    var band=selectedAgeBand(),values=[];
    records.forEach(function(r){
      (r.rows||[]).forEach(function(row){
        if(band&&row.age!==band)return;
        PRODUCT_DEFS.forEach(function(p){var n=moneyNum(row[p.key]);if(isFinite(n))values.push(n)});
      });
    });
    var min=values.length?Math.min.apply(Math,values):Infinity,max=values.length?Math.max.apply(Math,values):-Infinity;
    $("#overviewCount").textContent=(STATE.view==="table"?records.length:rows.length).toLocaleString("pt-BR");
    $("#overviewMin").textContent=moneyBR(min);
    var overviewMax=$("#overviewMax");if(overviewMax)overviewMax.textContent=moneyBR(max);
    var overviewConfigs=$("#overviewConfigs");if(overviewConfigs)overviewConfigs.textContent=records.length.toLocaleString("pt-BR")+" "+(records.length===1?"configuração":"configurações");
    $("#overviewAge").textContent=band||"Todas";
    $("#overviewState").textContent=$("#stateFilter").value||"PI + MA";
    if(STATE.view==="table")$("#priceCount").textContent=groups.length.toLocaleString("pt-BR")+" tabelas • "+records.length.toLocaleString("pt-BR")+" configurações";
    else $("#priceCount").textContent=rows.length.toLocaleString("pt-BR")+" valores";
  }
  function favoriteButton(item){
    var active=STATE.favorites.has(item.key);
    return '<button class="small-action '+(active?"active":"")+'" type="button" data-favorite="'+esc(item.key)+'" aria-label="'+(active?"Remover dos favoritos":"Adicionar aos favoritos")+'" title="Favoritar">'+icon("heart")+'</button>';
  }
  function healthSelectionKey(item){return item.key+"::health"}
  function compareButton(item){
    var sel=healthSelectionKey(item),active=STATE.compare.indexOf(sel)>=0||STATE.compare.indexOf(item.key)>=0;
    return '<button class="small-action '+(active?"compare-active":"")+'" type="button" data-compare="'+esc(sel)+'" aria-label="'+(active?"Remover da comparação":"Adicionar à comparação")+'" title="Comparar">'+icon("compare")+'</button>';
  }
  function planCard(item){
    var r=item.record,row=item.row;
    return '<article class="card plan-result">'+
      '<div class="plan-accent"></div><div class="plan-body">'+
      '<div class="plan-head"><span class="state-badge">'+esc(r.state)+'</span><div class="plan-title"><h3>'+esc(r.plan)+'</h3><div class="plan-sub">'+esc(r.contract)+' • '+esc(r.version)+' • faixa '+esc(row.age)+'</div></div>'+
      '<div class="plan-actions-top">'+favoriteButton(item)+compareButton(item)+'</div></div>'+
      '<div class="main-price product-health-card"><div><span>Saúde • valor mensal</span><b>'+esc(row.health||"—")+'</b></div><small>Faixa etária<br><strong>'+esc(row.age)+'</strong></small></div>'+
      '<div class="secondary-prices"><div class="secondary-price product-essential-card"><span>Essencial</span><b>'+esc(row.essential||"—")+'</b></div><div class="secondary-price product-pleno-card" title="Combo Odonto Pleno"><span>Pleno</span><b>'+esc(row.dental||"—")+'</b></div></div>'+
      '<div class="plan-meta">'+
        '<div class="meta-cell"><span>Contratação</span><b>'+esc(r.contract||"—")+'</b></div>'+
        '<div class="meta-cell"><span>Coparticipação</span><b>'+esc(r.copay||"—")+'</b></div>'+
        '<div class="meta-cell"><span>Acomodação</span><b>'+esc(r.accommodation||"—")+'</b></div>'+
        '<div class="meta-cell"><span>Segmentação</span><b>'+esc(r.segment||"—")+'</b></div>'+
        '<div class="meta-cell"><span>Cobertura / região</span><b>'+esc(r.coverage||r.region||"—")+'</b></div>'+
        '<div class="meta-cell"><span>ANS</span><b>'+esc(r.ans||"—")+'</b></div>'+
      '</div>'+
      '<div class="plan-source"><span>'+esc(r.source)+'</span><span>Pág. '+esc(r.page)+'</span></div>'+
      '<div class="plan-footer">'+
        '<button class="btn btn-soft" type="button" data-copy-plan="'+esc(item.key)+'">'+icon("copy")+'Copiar</button>'+
        '<button class="btn btn-ghost" type="button" data-compare="'+esc(healthSelectionKey(item))+'">'+icon("compare")+(STATE.compare.indexOf(healthSelectionKey(item))>=0?"Selecionado":"Comparar")+'</button>'+
        '<button class="btn btn-ghost details-btn" type="button" data-plan-details="'+esc(item.key)+'">'+icon("info")+'Condições</button>'+
      '</div></div></article>';
  }
  function renderCards(rows){
    var visible=rows.slice(0,STATE.visibleLimit);
    if(!visible.length){
      $("#planCards").innerHTML='<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">'+icon("search")+'</div><b>Nenhum plano encontrado</b><p>Experimente remover um filtro ou pesquisar por outro produto.</p><button class="btn btn-blue" type="button" data-clear-all>Limpar filtros</button></div>';
      return;
    }
    $("#planCards").innerHTML=visible.map(planCard).join("");
  }
  function accommodationRank(v){
    var n=norm(v),order=["ambulatorial","enfermaria","coletiva","apartamento","individual"];
    var i=order.indexOf(n);return i<0?99:i;
  }
  function copayRank(v){var n=norm(v);if(n.indexOf("completa")>=0)return 0;if(n.indexOf("basica")>=0)return 1;if(n.indexOf("nao se aplica")>=0)return 2;return 9}
  function hashString(value){
    var s=String(value||""),h=2166136261;
    for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h+=(h<<1)+(h<<4)+(h<<7)+(h<<8)+(h<<24)}
    return (h>>>0).toString(36);
  }
  function commercialGroupKey(r){
    return [r.state,r.contract,r.plan,r.obstetrics||"",r.segment||"",r.coverage||r.region||"",r.version||"",r.entity_group||""].join("¦");
  }
  function groupCommercialRecords(records){
    var map=Object.create(null),out=[];COMMERCIAL_GROUP_INDEX=Object.create(null);
    records.forEach(function(r){
      var key=commercialGroupKey(r),g=map[key];
      if(!g){
        g=map[key]={id:"ct-"+hashString(key),key:key,state:r.state,contract:r.contract,plan:r.plan,obstetrics:r.obstetrics||"",segment:r.segment||"",coverage:r.coverage||r.region||"",region:r.region||"",version:r.version||"",entityGroup:r.entity_group||"",records:[]};
        out.push(g);
      }
      g.records.push(r);
    });
    out.forEach(function(g){g.records.sort(function(a,b){return accommodationRank(a.accommodation)-accommodationRank(b.accommodation)||copayRank(a.copay)-copayRank(b.copay)||String(a.ans).localeCompare(String(b.ans))});COMMERCIAL_GROUP_INDEX[g.id]=g});
    out.sort(function(a,b){return a.plan.localeCompare(b.plan,"pt-BR",{sensitivity:"base"})||a.state.localeCompare(b.state)||a.contract.localeCompare(b.contract,"pt-BR")||String(a.obstetrics).localeCompare(String(b.obstetrics),"pt-BR")});
    return out;
  }
  function productsForRecord(r){
    return PRODUCT_DEFS.filter(function(p){return (r.rows||[]).some(function(row){var v=row[p.key];return v!==null&&v!==undefined&&String(v).trim()!==""&&String(v).trim()!=="—"})});
  }
  function rowForAge(r,age){for(var i=0;i<(r.rows||[]).length;i++)if(r.rows[i].age===age)return r.rows[i];return null}
  function productLabel(key,detail){
    for(var i=0;i<PRODUCT_DEFS.length;i++)if(PRODUCT_DEFS[i].key===key)return detail?(PRODUCT_DEFS[i].detailLabel||PRODUCT_DEFS[i].label):PRODUCT_DEFS[i].label;
    return key;
  }
  function formatPriceValue(v){var n=moneyNum(v);return isFinite(n)?moneyBR(n):"—"}
  function commercialTitle(g){return [g.plan,g.contract,g.obstetrics].filter(Boolean).join(" ").toUpperCase()}
  function groupMetaChips(g){
    var chips=['<span class="commercial-meta-chip"><small>Estado</small><b>'+esc(g.state)+'</b></span>','<span class="commercial-meta-chip"><small>Contratação</small><b>'+esc(g.contract)+'</b></span>'];
    if(g.segment)chips.push('<span class="commercial-meta-chip"><small>Segmentação</small><b>'+esc(g.segment)+'</b></span>');
    if(g.coverage)chips.push('<span class="commercial-meta-chip"><small>Abrangência</small><b>'+esc(g.coverage)+'</b></span>');
    if(g.entityGroup)chips.push('<span class="commercial-meta-chip"><small>Entidades</small><b>'+esc(g.entityGroup)+'</b></span>');
    return chips.join("");
  }
  function groupColumns(g){
    return g.records.map(function(r,idx){return {record:r,index:idx,products:productsForRecord(r),groupToken:g.id+"-g"+idx}}).filter(function(x){return x.products.length});
  }
  function groupSourceText(g){
    var sources=uniq(g.records.map(function(r){return r.source+" • "+r.version+" • pág. "+r.page}));
    return sources.join(" | ");
  }
  function configFavoriteButton(r){
    var active=STATE.configFavorites.has(r.id);
    return '<button type="button" class="group-fav '+(active?"active":"")+'" data-favorite-config="'+esc(r.id)+'" aria-label="'+(active?"Remover configuração dos favoritos":"Favoritar configuração")+'" title="Favoritar configuração">'+icon("heart")+'</button>';
  }
  function commercialPriceButton(g,r,row,product,groupToken){
    if(!row||row[product.key]===null||row[product.key]===undefined||String(row[product.key]).trim()===""||!isFinite(moneyNum(row[product.key])))return '<span class="commercial-price missing" data-group="'+esc(groupToken)+'" title="Valor não disponível na base">—</span>';
    var value=formatPriceValue(row[product.key]);
    return '<button type="button" class="commercial-price price-'+product.className+'" data-group="'+esc(groupToken)+'" data-price-record="'+esc(r.id)+'" data-price-age="'+esc(row.age)+'" data-price-product="'+esc(product.key)+'" title="Abrir detalhes de '+esc(product.label)+' • '+esc(row.age)+'">'+esc(value)+'</button>';
  }
  function commercialToolbar(g,selectedBand,isMobileAgeView){
    var jump='<label class="age-jump"><span>Ir para faixa</span><select data-jump-age="'+esc(g.id)+'"><option value="">Selecionar</option>'+AGE_ORDER.map(function(age){return '<option value="'+esc(age)+'" '+(selectedBand===age?'selected':'')+'>'+esc(age)+'</option>'}).join("")+'</select></label>';
    var exportMenu='<details class="export-menu"><summary class="btn btn-ghost">'+icon("download")+'Exportar</summary><div class="export-menu-popover">'+
      '<button type="button" data-export-commercial-excel="'+esc(g.id)+'"><span class="export-format-badge excel">XLSX</span><span><b>Excel nativo</b><small>Uma linha por faixa etária</small></span></button>'+ 
      '<button type="button" data-export-commercial-pdf="'+esc(g.id)+'"><span class="export-format-badge pdf">PDF</span><span><b>PDF compacto</b><small>A4 paisagem, pronto para compartilhar</small></span></button>'+ 
      '<button type="button" data-export-commercial="'+esc(g.id)+'"><span class="export-format-badge csv">CSV</span><span><b>CSV detalhado</b><small>Máxima compatibilidade</small></span></button>'+ 
      '</div></details>';
    return '<div class="commercial-table-actions">'+jump+
      (selectedBand?'<button class="btn btn-ghost mobile-age-toggle" type="button" data-mobile-table-mode="'+(isMobileAgeView?'full':'age')+'">'+(isMobileAgeView?'Tabela completa':'Somente faixa')+'</button>':'')+
      '<details class="mobile-table-more"><summary class="btn btn-ghost">'+icon("menu")+'Ações da tabela</summary><div class="mobile-table-more-panel">'+
      '<button class="btn btn-ghost" type="button" data-expand-commercial="'+esc(g.id)+'">'+icon("external")+'Ampliar</button>'+exportMenu+
      '<button class="btn btn-ghost" type="button" data-source-commercial="'+esc(g.id)+'">'+icon("file")+'Fonte</button>'+ 
      '</div></details></div>';
  }
  /* V10: purpose-built single-age comparison; detail layout remains available. */
  function renderCommercialMobileAge(g,columns,selectedBand){
    var matches=columns.filter(function(col){return !!rowForAge(col.record,selectedBand)});
    var compact=STATE.mobilePriceMode!=="detail";
    var context=[g.plan,g.state,g.contract,selectedBand+" anos"].filter(Boolean).join("  ·  ");
    var html='<div class="mobile-band-view" data-mobile-layout="'+(compact?'compact':'detail')+'">'+
      '<div class="mobile-price-context" role="status" aria-label="Contexto atual da tabela">'+
        '<span class="context-overline">CONSULTA SELECIONADA</span><strong>'+esc(context)+'</strong></div>'+
      '<div class="mobile-result-tools"><div class="mobile-result-heading"><b>'+matches.length+' '+(matches.length===1?'configuração':'configurações')+'</b><span>Valores da faixa '+esc(selectedBand)+'</span></div>'+
        '<div class="mobile-layout-switch" role="group" aria-label="Apresentação dos preços">'+
          '<button type="button" data-mobile-price-mode="compact" aria-pressed="'+compact+'" class="'+(compact?'active':'')+'">Lista</button>'+
          '<button type="button" data-mobile-price-mode="detail" aria-pressed="'+(!compact)+'" class="'+(!compact?'active':'')+'">Detalhes</button>'+ 
        '</div></div>';
    if(compact){
      html+='<div class="mobile-compare-list" role="list" aria-label="Comparação das configurações">';
      matches.forEach(function(col){
        var r=col.record,row=rowForAge(r,selectedBand);
        html+='<article class="mobile-compare-row" role="listitem">'+
          '<div class="mobile-compare-header"><div class="mobile-compare-identity"><b>'+esc(r.accommodation||"Configuração")+' <span class="meta-divider">/</span> '+esc(r.copay||"Sem indicação")+'</b>'+
          '<span>ANS '+esc(r.ans||"Não informado")+'</span></div>'+configFavoriteButton(r)+'</div>'+
          '<div class="mobile-compare-prices">';
        col.products.forEach(function(product){html+='<div class="mobile-compare-price product-'+esc(product.className)+'"><span>'+esc(product.label)+'</span>'+commercialPriceButton(g,r,row,product,col.groupToken)+'</div>'});
        html+='</div></article>';
      });
      html+='</div>';
    }else{
      matches.forEach(function(col){
        var r=col.record,row=rowForAge(r,selectedBand);
        html+='<section class="mobile-band-group"><div class="mobile-band-group-head"><div><b>'+esc(r.accommodation||"Configuração")+' • '+esc(r.copay||"—")+'</b><span title="Código de registro do produto na ANS">ANS '+esc(r.ans||"—")+'</span></div>'+configFavoriteButton(r)+'</div><div class="mobile-band-products">';
        col.products.forEach(function(product){html+='<div class="mobile-band-product product-'+product.className+'"><span>'+esc(product.label)+'</span>'+commercialPriceButton(g,r,row,product,col.groupToken)+'</div>'});
        html+='</div></section>';
      });
    }
    html+='</div>';
    return html;
  }
  function renderCommercialMobileAgePicker(g,columns){
    var available=AGE_ORDER.filter(function(age){return columns.some(function(col){return !!rowForAge(col.record,age)})});
    return '<div class="mobile-age-browser"><div class="mobile-age-browser-head"><b>Escolha a faixa etária</b><span>Toque em uma faixa para ver somente os valores correspondentes, sem precisar arrastar uma tabela larga.</span></div><div class="mobile-age-grid">'+available.map(function(age){return '<button type="button" class="mobile-age-option" data-pin-age="'+esc(age)+'"><span><strong>'+esc(age)+'</strong><span>Ver valores desta faixa</span></span>'+icon("chevron")+'</button>'}).join("")+'</div></div>';
  }
  function renderCommercialFullTable(g,columns,selectedBand){
    var totalCols=columns.reduce(function(sum,c){return sum+c.products.length},0),minWidth=Math.max(920,150+totalCols*126);
    var h1='<tr class="group-head-row"><th class="age-sticky age-head" scope="col" rowspan="2">FAIXA</th>'+
      columns.map(function(col){var r=col.record;return '<th class="commercial-group-head" scope="colgroup" colspan="'+col.products.length+'" data-group="'+esc(col.groupToken)+'"><div><strong>'+esc(r.accommodation||"Configuração")+' • '+esc(r.copay||"—")+'</strong><span title="Código de registro do produto na ANS">ANS '+esc(r.ans||"—")+'</span></div>'+configFavoriteButton(r)+'</th>'}).join("")+'</tr>';
    var h2='<tr class="product-head-row">'+columns.map(function(col){return col.products.map(function(p){return '<th scope="col" class="product-head product-'+p.className+'" data-group="'+esc(col.groupToken)+'"><span>'+esc(p.label)+'</span></th>'}).join("")}).join("")+'</tr>';
    var body=AGE_ORDER.map(function(age){
      var exists=columns.some(function(col){return !!rowForAge(col.record,age)});if(!exists)return "";
      var selected=selectedBand===age;
      var cells=columns.map(function(col){var row=rowForAge(col.record,age);return col.products.map(function(p){return '<td data-group="'+esc(col.groupToken)+'">'+commercialPriceButton(g,col.record,row,p,col.groupToken)+'</td>'}).join("")}).join("");
      return '<tr class="'+(selected?'age-highlight ':'')+'" data-age-row="'+esc(age)+'"><th class="age-sticky age-cell" scope="row"><button type="button" data-pin-age="'+esc(age)+'"><span>'+esc(age)+'</span>'+(selected?'<small>Faixa consultada</small>':'')+'</button></th>'+cells+'</tr>';
    }).join("");
    return '<div class="commercial-scroll-wrap"><div class="commercial-scroll-hint">Deslize para comparar os valores →</div><div class="commercial-scroll" data-commercial-scroll="'+esc(g.id)+'"><table class="commercial-price-table" style="min-width:'+minWidth+'px" aria-label="Tabela comercial '+esc(commercialTitle(g))+'"><thead>'+h1+h2+'</thead><tbody>'+body+'</tbody></table></div></div>';
  }
  function renderCommercialPriceTable(g,open,index){
    var title=commercialTitle(g),selectedBand=selectedAgeBand(),columns=groupColumns(g);
    if(!open){
      var prices=[];g.records.forEach(function(r){(r.rows||[]).forEach(function(row){PRODUCT_DEFS.forEach(function(p){var n=moneyNum(row[p.key]);if(isFinite(n)&&n>0)prices.push(n)})})});
      var minPrice=prices.length?moneyBR(Math.min.apply(Math,prices)):"—",maxPrice=prices.length?moneyBR(Math.max.apply(Math,prices)):"—";
      return '<article class="commercial-collapsed" data-commercial-block="'+esc(g.id)+'"><div class="collapsed-main"><span>'+esc(g.state)+' • '+esc(g.contract)+(g.obstetrics?' • '+esc(g.obstetrics):'')+'</span><h4>'+esc(g.plan)+'</h4><p>'+columns.length+' configurações • '+esc(g.coverage||"Abrangência conforme base")+'</p><div class="collapsed-stats"><span><small>A partir de</small><b>'+esc(minPrice)+'</b></span><span><small>Até</small><b>'+esc(maxPrice)+'</b></span><span><small>Faixas</small><b>'+AGE_ORDER.length+'</b></span></div></div><button class="btn btn-blue" type="button" data-open-table-group="'+esc(g.id)+'">Abrir tabela '+icon("chevron")+'</button></article>';
    }
    var mobileCompact=!BREAKPOINT_WIDE.matches&&!STATE.mobileFullTable;
    var mobileAgeView=mobileCompact&&!!selectedBand;
    var mobileAgePicker=mobileCompact&&!selectedBand;
    return '<article class="commercial-table-block" data-commercial-block="'+esc(g.id)+'">'+
      '<header class="commercial-table-header"><div class="commercial-title-wrap"><span class="commercial-eyebrow">Tabela comercial • '+esc(g.state)+'</span><h3>'+esc(title)+'</h3><div class="commercial-meta-row">'+groupMetaChips(g)+'</div></div>'+commercialToolbar(g,selectedBand,mobileAgeView)+'</header>'+
      '<div class="table-reading-guide"><span>Toque em um valor para conferir condições e fonte.</span></div>'+
      (mobileAgeView?renderCommercialMobileAge(g,columns,selectedBand):(mobileAgePicker?renderCommercialMobileAgePicker(g,columns):renderCommercialFullTable(g,columns,selectedBand)))+
      '<footer class="commercial-source-line"><span>'+icon("database")+'Dados gerados diretamente da base local</span><span>'+esc(groupSourceText(g))+'</span><button type="button" data-close-table-group="'+esc(g.id)+'">Recolher tabela</button></footer>'+
      '</article>';
  }
  function renderCommercialResults(groups){
    var host=$("#planTableWrap");
    if(!groups.length){host.innerHTML='<div class="empty-state"><div class="empty-icon">'+icon("search")+'</div><b>Nenhuma tabela de preço disponível para essa combinação.</b><p>Revise os filtros selecionados.</p><button class="btn btn-blue" type="button" data-clear-all>Limpar filtros</button></div>';return}
    var byPlan=Object.create(null),planOrder=[];
    groups.forEach(function(g){var k=norm(g.plan);if(!byPlan[k]){byPlan[k]=[];planOrder.push(k)}byPlan[k].push(g)});
    var automaticOpen=BREAKPOINT_WIDE.matches?3:1,globalIndex=0,html="";
    planOrder.forEach(function(k){
      var list=byPlan[k],plan=list[0].plan;
      html+='<section class="commercial-plan-section"><div class="commercial-plan-heading"><div><span>Resultados por plano</span><h3>'+esc(plan.toUpperCase())+'</h3></div><b>'+list.length+' '+(list.length===1?'tabela':'tabelas')+'</b></div><div class="commercial-plan-stack">';
      list.forEach(function(g){var open=STATE.openCommercialGroups.has(g.id)||globalIndex<automaticOpen;html+=renderCommercialPriceTable(g,open,globalIndex);globalIndex++});
      html+='</div></section>';
    });
    host.innerHTML=html;
    $$("[data-commercial-scroll]",host).forEach(updateScrollShadow);
    if(STATE.shouldAutoScrollAge&&selectedAgeBand()){
      STATE.shouldAutoScrollAge=false;
      requestAnimationFrame(function(){
        var target,blockMode="center";
        if(!BREAKPOINT_WIDE.matches){target=$(".commercial-table-block");blockMode="start"}else target=$(".commercial-table-block .age-highlight")||$(".commercial-table-block");
        if(target)safeScrollIntoView(target,blockMode);
      });
    }
  }
  function updateScrollShadow(el){
    if(!el)return;
    var update=function(){el.classList.toggle("can-scroll-left",el.scrollLeft>4);el.classList.toggle("can-scroll-right",el.scrollLeft+el.clientWidth<el.scrollWidth-4)};
    update();el.addEventListener("scroll",update,{passive:true});
  }
  function renderPlans(){
    var rows=getFilteredRows(),records=getCommercialRecords(),groups=groupCommercialRecords(records);
    STATE.lastRows=rows;STATE.lastCommercialRecords=records;STATE.lastCommercialGroups=groups;
    renderActiveFilters();renderQueryContext();renderOverview(rows,records,groups);
    var useTable=STATE.view==="table";
    $("#planCards").hidden=useTable;$("#planTableWrap").hidden=!useTable;
    if(useTable)renderCommercialResults(groups);else renderCards(rows);
    var more=$("#loadMoreBtn");
    more.hidden=useTable||rows.length<=STATE.visibleLimit;
    if(!more.hidden)more.textContent="Mostrar mais ("+(rows.length-STATE.visibleLimit).toLocaleString("pt-BR")+" restantes)";
    $("#favCount").textContent=STATE.favorites.size+STATE.configFavorites.size;
    var mobileCount=$("#mobileFilterResultsCount");if(mobileCount)mobileCount.textContent=rows.length.toLocaleString("pt-BR");
    $("#favoritesOnlyBtn").classList.toggle("active",STATE.favoritesOnly);
    $$("#viewToggle button").forEach(function(b){b.classList.toggle("active",b.dataset.view===STATE.view)});
    $$("#densityToggle button").forEach(function(b){b.classList.toggle("active",b.dataset.density===STATE.density)});
    renderCompareTray();
  }
  function clearPlanFilters(){
    $("#planSearch").value="";$("#ageNumber").value="";$("#ageDetected").textContent="Nenhuma idade informada";
    FILTERS.forEach(function(f){$("#"+f[0]).value=""});
    STATE.favoritesOnly=false;STATE.visibleLimit=60;STATE.pinnedAge="";STATE.mobileFullTable=false;STATE.shouldAutoScrollAge=false;
    $("#suggestionPopover").hidden=true;renderPlans();
  }
  function planCopyText(item){
    var r=item.record,row=item.row;
    return [
      "Humana Saúde — "+r.plan,
      "Estado: "+r.state,
      "Contratação: "+r.contract,
      "Faixa etária: "+row.age,
      "Saúde: "+(row.health||"—"),
      "Essencial: "+(row.essential||"—"),
      "Pleno (Odonto): "+(row.dental||"—"),
      "Coparticipação: "+(r.copay||"—"),
      "Acomodação: "+(r.accommodation||"—"),
      "Segmentação: "+(r.segment||"—"),
      "Cobertura/Região: "+(r.coverage||r.region||"—"),
      "ANS: "+(r.ans||"—"),
      "Fonte: "+r.source+" — pág. "+r.page
    ].join("\n");
  }
  function toggleFavorite(key){
    if(STATE.favorites.has(key)){STATE.favorites.delete(key);toast("Removido dos favoritos")}
    else{STATE.favorites.add(key);toast("Adicionado aos favoritos");var it=ROW_INDEX[key];if(it)bumpHit(it.record.plan)}
    storageSet("favorites",setToArray(STATE.favorites));renderPlans();
  }
  function toggleConfigFavorite(recordId){
    var r=RECORD_INDEX[recordId];if(!r)return;
    if(STATE.configFavorites.has(recordId)){STATE.configFavorites.delete(recordId);toast("Configuração removida dos favoritos")}
    else{STATE.configFavorites.add(recordId);toast("Configuração favoritada");bumpHit(r.plan)}
    storageSet("config-favorites",setToArray(STATE.configFavorites));renderPlans();
  }

  /* =========================================================
     COMPARE — SAME SOURCE OBJECT USED BY TABLES AND CARDS
     ========================================================= */
  function compareSelectionKey(record,row,productKey){return keyOf(record,row)+"::"+(productKey||"health")}
  function compareItemFromKey(key){
    var parts=String(key||"").split("::"),productKey="health",base=String(key||"");
    if(parts.length>=3&&["health","essential","dental"].indexOf(parts[parts.length-1])>=0){productKey=parts.pop();base=parts.join("::")}
    var item=ROW_INDEX[base];if(!item)return null;
    return {record:item.record,row:item.row,key:item.key,selectionKey:compareSelectionKey(item.record,item.row,productKey),productKey:productKey};
  }
  function toggleCompare(key){
    var item=compareItemFromKey(key);if(!item)return;
    var canonical=item.selectionKey,i=STATE.compare.indexOf(canonical);
    if(i>=0){STATE.compare.splice(i,1)}
    else{
      if(STATE.compare.length>=3){toast("O comparador aceita até 3 opções");return}
      STATE.compare.push(canonical);bumpHit(item.record.plan);
    }
    // A selected price opens a modal. Closing it here exposes the compare tray
    // immediately; otherwise the modal blocks the Compare button on mobile.
    if($("#modal").classList.contains("open"))closeModal();
    renderPlans();
  }
  function renderCompareTray(){
    var tray=$("#compareTray"),n=STATE.compare.length;
    tray.classList.toggle("show",n>0);$("#compareTrayText").textContent=n+" de 3 opções selecionadas";$("#openCompareBtn").disabled=n<2;
  }
  function compareField(item,field){
    var r=item.record,row=item.row,value=row[item.productKey]||"—";
    var map={
      price:value,product:productLabel(item.productKey,true),age:row.age||"—",state:r.state||"—",plan:r.plan||"—",contract:r.contract||"—",
      accommodation:r.accommodation||"—",copay:r.copay||"—",segment:r.segment||"—",ans:r.ans||"—",coverage:r.coverage||r.region||"—"
    };
    return map[field];
  }
  function openCompare(){
    var items=STATE.compare.map(compareItemFromKey).filter(Boolean);
    if(items.length<2){toast("Selecione pelo menos 2 opções");return}
    var defs=[["price","Valor"],["product","Produto"],["age","Faixa etária"],["state","Estado"],["plan","Plano"],["contract","Contratação"],["accommodation","Acomodação"],["copay","Coparticipação"],["segment","Segmentação"],["ans","ANS"],["coverage","Cobertura"]];
    var head='<tr><th>Informação</th>'+items.map(function(it){return '<th>'+esc(it.record.plan)+'<br><span style="font-weight:500;opacity:.8">'+esc(productLabel(it.productKey,false))+' • '+esc(it.record.state)+' • '+esc(it.row.age)+'</span></th>'}).join("")+'</tr>';
    var body=defs.map(function(def){var values=items.map(function(it){return compareField(it,def[0])}),different=uniq(values).length>1;return '<tr><td>'+esc(def[1])+'</td>'+values.map(function(v){return '<td class="'+(different?'diff':'')+'">'+esc(v)+'</td>'}).join("")+'</tr>'}).join("");
    openModal("Comparar planos",items.length+" opções selecionadas",'<div class="table-wrap"><table class="data-table compare-table"><thead>'+head+'</thead><tbody>'+body+'</tbody></table></div>',
      '<button class="btn btn-ghost" type="button" data-modal-close>Fechar</button><button class="btn btn-blue" type="button" id="copyCompareBtn">'+icon("copy")+'Copiar comparação</button>');
    setTimeout(function(){var b=$("#copyCompareBtn");if(b)b.addEventListener("click",function(){copyText(compareCopyText(items),"Comparação copiada")})},0);
  }
  function compareCopyText(items){
    var lines=["COMPARAÇÃO DE PLANOS — HUMANA SAÚDE"];
    items.forEach(function(it,i){
      lines.push("\nOPÇÃO "+(i+1)+" — "+it.record.plan,"Produto: "+productLabel(it.productKey,true),"Valor: "+(it.row[it.productKey]||"—"),"Faixa: "+it.row.age,"Estado: "+it.record.state,"Contratação: "+it.record.contract,"Acomodação: "+(it.record.accommodation||"—"),"Coparticipação: "+(it.record.copay||"—"),"Segmentação: "+(it.record.segment||"—"),"ANS: "+(it.record.ans||"—"),"Cobertura: "+(it.record.coverage||it.record.region||"—"));
    });
    return lines.join("\n");
  }

  /* =========================================================
     PLAN DETAILS MODAL
     ========================================================= */
  function openPlanDetails(key){
    var item=ROW_INDEX[key];if(!item)return;
    var r=item.record,row=item.row;
    var commercial=[
      ["Estado",r.state],["Plano",r.plan],["Faixa etária",row.age],["Contratação",r.contract],
      ["Acomodação",r.accommodation||"—"],["Coparticipação",r.copay||"—"],["Segmentação",r.segment||"—"],["Obstetrícia",r.obstetrics||"—"]
    ];
    var coverage=[["Região",r.region||"—"],["Abrangência / cobertura",r.coverage||r.region||"—"],["ANS",r.ans||"—"]];
    if(r.entity_group)coverage.push(["Entidade / grupo",r.entity_group]);
    function grid(items){return '<div class="detail-grid">'+items.map(function(c){return '<div class="detail-cell"><span>'+esc(c[0])+'</span><b>'+esc(c[1]||"—")+'</b></div>'}).join("")+'</div>'}
    var values='<div class="detail-values">'+
      '<div class="detail-value health"><span>Saúde</span><strong>'+esc(row.health||"—")+'</strong></div>'+
      '<div class="detail-value essential"><span>Essencial</span><strong>'+esc(row.essential||"—")+'</strong></div>'+
      '<div class="detail-value pleno"><span>Pleno</span><strong>'+esc(row.dental||"—")+'</strong></div></div>';
    var provenance='<div class="detail-provenance">'+
      '<div><span>Documento-fonte</span><b>'+esc(r.source||"Não informado na base")+'</b></div>'+
      '<div><span>Referência</span><b>'+esc(r.version||"Não informado na base")+'</b></div>'+
      '<div><span>Página</span><b>'+esc(r.page||"—")+'</b></div>'+
      '<div><span>ID do registro</span><b>'+esc(r.id||"—")+'</b></div></div>';
    var body=''+
      '<section class="detail-section"><div class="detail-section-head"><div><span>Resumo comercial</span><b>'+esc(r.plan)+' • '+esc(row.age)+' anos</b></div><span class="data-version-badge">Base local</span></div><div class="detail-section-body">'+values+'</div></section>'+
      '<section class="detail-section"><div class="detail-section-head"><div><span>Configuração</span><b>Condições do produto</b></div></div><div class="detail-section-body">'+grid(commercial)+'</div></section>'+
      '<section class="detail-section"><div class="detail-section-head"><div><span>Cobertura e registro</span><b>Rastreabilidade comercial</b></div></div><div class="detail-section-body">'+grid(coverage)+'</div></section>'+
      '<section class="detail-section"><div class="detail-section-head"><div><span>Fonte</span><b>Origem deste registro</b></div></div><div class="detail-section-body">'+provenance+'</div></section>'+
      '<section class="detail-section"><div class="detail-section-head"><div><span>Condições completas</span><b>Observações comerciais preservadas</b></div></div><div class="detail-section-body"><div class="long-note">'+esc(r.footnote||"Não há observação adicional registrada para esta configuração.")+'</div></div></section>';
    openModal(r.plan,r.state+" • "+r.contract+" • faixa "+row.age,body,
      '<button class="btn btn-ghost" type="button" data-modal-close>Fechar</button><button class="btn btn-blue" type="button" id="copyDetailBtn">'+icon("copy")+'Copiar resumo</button>'
    );
    setTimeout(function(){var b=$("#copyDetailBtn");if(b)b.addEventListener("click",function(){copyText(planCopyText(item),"Informações copiadas")})},0);
  }

  function priceSelectionText(record,row,productKey){
    return [
      "Humana Saúde","","Plano: "+record.plan,"Produto: "+productLabel(productKey,true),"Estado: "+record.state,"Faixa etária: "+row.age,
      "Acomodação: "+(record.accommodation||"—"),"Coparticipação: "+(record.copay||"—"),"Valor: "+formatPriceValue(row[productKey]),"ANS: "+(record.ans||"—")
    ].join("\n");
  }
  function openPriceCell(recordId,age,productKey){
    var r=RECORD_INDEX[recordId];if(!r)return;var row=rowForAge(r,age);if(!row)return;
    var selection=compareSelectionKey(r,row,productKey),baseKey=keyOf(r,row),value=formatPriceValue(row[productKey]);
    var cells=[["Plano",r.plan],["Produto",productLabel(productKey,true)],["Faixa etária",row.age],["Acomodação",r.accommodation||"—"],["Coparticipação",r.copay||"—"],["Valor",value],["ANS",r.ans||"—"],["Estado",r.state],["Contratação",r.contract],["Segmentação",r.segment||"—"],["Abrangência",r.coverage||r.region||"—"],["Fonte",r.source||"—"],["Referência",r.version||"—"],["Página",r.page||"—"]];
    var body='<div class="price-detail-value"><span>Valor selecionado</span><strong>'+esc(value)+'</strong><small>'+esc(r.plan)+' • '+esc(productLabel(productKey,false))+'</small></div><div class="detail-grid">'+cells.map(function(c){return '<div class="detail-cell"><span>'+esc(c[0])+'</span><b>'+esc(c[1])+'</b></div>'}).join("")+'</div>';
    openModal(r.plan,productLabel(productKey,false)+" • "+row.age+" anos",body,
      '<button class="btn btn-soft" type="button" data-copy-price="'+esc(selection)+'">'+icon("copy")+'Copiar valor</button><button class="btn btn-ghost" type="button" data-plan-details="'+esc(baseKey)+'">'+icon("info")+'Ver detalhes</button><button class="btn btn-blue" type="button" data-compare="'+esc(selection)+'">'+icon("compare")+'Adicionar à comparação</button>');
  }
  function copyPriceSelection(selection){var it=compareItemFromKey(selection);if(!it)return;copyText(priceSelectionText(it.record,it.row,it.productKey),"Valor copiado")}
  function openCommercialSources(groupId){
    var g=COMMERCIAL_GROUP_INDEX[groupId];if(!g)return;
    var seen=Object.create(null),items=[];
    g.records.forEach(function(r){var key=[r.source,r.version,r.page].join("|");if(seen[key])return;seen[key]=true;items.push('<div class="source-item"><div><b>'+esc(r.source)+'</b><span>'+esc(r.version)+' • pág. '+esc(r.page)+'</span></div><span class="badge">'+esc(r.state)+'</span></div>')});
    openModal("Fontes da tabela",commercialTitle(g),'<div class="sources-list">'+items.join("")+'</div>','<button class="btn btn-ghost" type="button" data-modal-close>Fechar</button>');
  }
  function safeFilename(value){return norm(value||"arquivo").replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"")||"arquivo"}
  function compactExportHeader(){return ["UF","Contratação","Plano","Faixa","Saúde","Essencial","Pleno","Acomodação","Coparticipação","ANS"]}
  function compactRowsFromItems(items){
    var out=[compactExportHeader()];
    (items||[]).forEach(function(item){var r=item.record,row=item.row;out.push([r.state,r.contract,r.plan,row.age,row.health||"",row.essential||"",row.dental||"",r.accommodation||"",r.copay||"",r.ans||""])});
    return out;
  }
  function detailedRowsFromItems(items){
    var out=[["Estado","Contratação","Plano","Faixa","Saúde","Essencial","Pleno","Acomodação","Coparticipação","Segmentação","Abrangência","ANS","Fonte","Versão","Página","Observação"]];
    (items||[]).forEach(function(item){var r=item.record,row=item.row;out.push([r.state,r.contract,r.plan,row.age,row.health||"",row.essential||"",row.dental||"",r.accommodation||"",r.copay||"",r.segment||"",r.coverage||r.region||"",r.ans||"",r.source||"",r.version||"",r.page||"",r.footnote||""])});
    return out;
  }
  function itemsFromCommercialGroup(g){var items=[];(g.records||[]).forEach(function(r){(r.rows||[]).forEach(function(row){items.push({record:r,row:row})})});return items}
  function triggerBlobDownload(blob,name){
    try{if(typeof Blob!=="function"||!window.URL||!URL.createObjectURL)throw new Error("Download indisponível");var url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){try{URL.revokeObjectURL(url)}catch(e){}},1400);return true}catch(e){registerEarlyError("download",e);return false}
  }
  function xmlHtmlEscape(v){return String(v===null||v===undefined?"":v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}
  // XLSX is actual Open XML ZIP, not HTML renamed as an Excel file.
  function downloadExcel(rows,filename,title,subtitle,sourceRows){
    if(!rows||rows.length<2){toast("Nenhum resultado para exportar");return}
    try{
      if(!window.CentralXLSX)throw new Error("Módulo XLSX local indisponível");
      var blob=window.CentralXLSX.create(rows,title,subtitle,sourceRows);
      if(triggerBlobDownload(blob,(filename||"central_humana.xlsx").replace(/\.xls$/i,".xlsx")))toast("Planilha XLSX preparada");
      else toast("O navegador não permitiu baixar o arquivo; tente outro navegador");
    }catch(err){registerEarlyError("xlsx-native",err);toast("Não foi possível gerar o XLSX")}
  }
  function winAnsiByteString(value){
    var map={"€":128,"‚":130,"ƒ":131,"„":132,"…":133,"†":134,"‡":135,"ˆ":136,"‰":137,"Š":138,"‹":139,"Œ":140,"Ž":142,"‘":145,"’":146,"“":147,"”":148,"•":149,"–":150,"—":151,"˜":152,"™":153,"š":154,"›":155,"œ":156,"ž":158,"Ÿ":159};
    var s=String(value===null||value===undefined?"":value),out="";for(var i=0;i<s.length;i++){var c=s.charAt(i),n=s.charCodeAt(i);if(map[c]!=null)n=map[c];else if(n>255)n=63;out+=String.fromCharCode(n)}return out
  }
  function pdfString(value){return winAnsiByteString(value).replace(/\\/g,"\\\\").replace(/\(/g,"\\(").replace(/\)/g,"\\)").replace(/[\r\n]+/g," ")}
  function pdfFit(value,width,fontSize){var s=String(value===null||value===undefined?"":value),max=Math.max(2,Math.floor((width-6)/(fontSize*.52)));return s.length>max?s.slice(0,Math.max(1,max-1))+"…":s}
  function buildCompactPdf(rows,title,subtitle){
    var pageW=842,pageH=595,margin=23,top=pageH-28,rowH=17,headH=21,font=8.0,headerFont=8.0;
    var widths=[32,85,123,46,73,73,73,83,110,95],tableW=widths.reduce(function(a,b){return a+b},0),startX=margin,cols=rows[0]||[],data=rows.slice(1),rowsPerPage=27,pages=[];
    function textCmd(x,y,text,size,bold,color){return (color||'0.08 0.14 0.24')+' rg BT /'+(bold?'F2':'F1')+' '+size+' Tf '+x.toFixed(1)+' '+y.toFixed(1)+' Td ('+pdfString(text)+') Tj ET\n'}
    function rectCmd(x,y,w,h,fill){return (fill?fill+' rg '+x.toFixed(1)+' '+y.toFixed(1)+' '+w.toFixed(1)+' '+h.toFixed(1)+' re f\n':'')+'0.80 G 0.35 w '+x.toFixed(1)+' '+y.toFixed(1)+' '+w.toFixed(1)+' '+h.toFixed(1)+' re S\n'}
    for(var offset=0;offset<Math.max(1,data.length);offset+=rowsPerPage){
      var chunk=data.slice(offset,offset+rowsPerPage),cmd='1 1 1 rg 0 0 '+pageW+' '+pageH+' re f\n';
      cmd+=textCmd(margin,top,title||'Central Comercial Humana + B&B',13,true);cmd+=textCmd(margin,top-14,subtitle||'Exportação compacta',7.5,false,'0.30 0.36 0.45');cmd+=textCmd(pageW-margin-110,top-3,'Página '+(pages.length+1),7,false,'0.35 0.40 0.48');
      var y=top-38,x=startX;for(var h=0;h<cols.length;h++){var w=widths[h]||60;cmd+=rectCmd(x,y-headH,w,headH,'0.05 0.21 0.50');cmd+=textCmd(x+3,y-13,pdfFit(cols[h],w,headerFont),headerFont,true,'1 1 1');x+=w}
      y-=headH;
      chunk.forEach(function(row,ri){x=startX;var fill=ri%2?'0.965 0.975 0.99':null;for(var c=0;c<cols.length;c++){var w=widths[c]||60;cmd+=rectCmd(x,y-rowH,w,rowH,fill);cmd+=textCmd(x+3,y-12,pdfFit(row[c],w,font),font,(c>=4&&c<=6),c===4?'0.09 0.31 0.59':c===5?'0.63 0.28 0.05':c===6?'0.02 0.43 0.36':'0.08 0.14 0.24');x+=w}y-=rowH});
      cmd+=textCmd(margin,16,'Dados locais • Ref. documental: set/2026 • Confirme vigência • '+new Date().toLocaleDateString('pt-BR'),6.5,false,'0.38 0.43 0.50');pages.push(cmd)
    }
    var objects=[null,'<< /Type /Catalog /Pages 2 0 R >>','', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'],kids=[];
    pages.forEach(function(content){var pageObj=objects.length,contentObj=pageObj+1;kids.push(pageObj+' 0 R');objects.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+pageW+' '+pageH+'] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents '+contentObj+' 0 R >>');objects.push('<< /Length '+content.length+' >>\nstream\n'+content+'endstream')});objects[2]='<< /Type /Pages /Kids ['+kids.join(' ')+'] /Count '+kids.length+' >>';
    var pdf='%PDF-1.4\n%'+String.fromCharCode(226,227,207,211)+'\n',offsets=[0];for(var i=1;i<objects.length;i++){offsets[i]=pdf.length;pdf+=i+' 0 obj\n'+objects[i]+'\nendobj\n'}var xref=pdf.length;pdf+='xref\n0 '+objects.length+'\n0000000000 65535 f \n';for(var j=1;j<objects.length;j++)pdf+=(String(offsets[j]).padStart(10,'0'))+' 00000 n \n';pdf+='trailer\n<< /Size '+objects.length+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF';var bytes=new Uint8Array(pdf.length);for(var k=0;k<pdf.length;k++)bytes[k]=pdf.charCodeAt(k)&255;return new Blob([bytes],{type:'application/pdf'})
  }
  function downloadCompactPdf(rows,filename,title,subtitle){if(!rows||rows.length<2){toast("Nenhum resultado para exportar");return}try{var blob=buildCompactPdf(rows,title,subtitle);if(triggerBlobDownload(blob,filename||"central_humana.pdf"))toast("PDF compacto exportado")}catch(e){registerEarlyError("pdf",e);toast("Não foi possível gerar o PDF")}}
  function exportCommercialGroup(groupId){
    var g=COMMERCIAL_GROUP_INDEX[groupId];if(!g)return;var items=itemsFromCommercialGroup(g),name=safeFilename(g.plan+"_"+g.state+"_"+g.contract);
    downloadCSV(detailedRowsFromItems(items),"tabela_"+name+".csv");
  }
  function exportCommercialGroupExcel(groupId){var g=COMMERCIAL_GROUP_INDEX[groupId];if(!g)return;var name=safeFilename(g.plan+"_"+g.state+"_"+g.contract);downloadExcel(compactRowsFromItems(itemsFromCommercialGroup(g)),"tabela_"+name+".xlsx",commercialTitle(g),g.state+" • "+g.contract+" • "+(g.coverage||g.region||"Base comercial"),detailedRowsFromItems(itemsFromCommercialGroup(g)))}
  function exportCommercialGroupPdf(groupId){var g=COMMERCIAL_GROUP_INDEX[groupId];if(!g)return;var name=safeFilename(g.plan+"_"+g.state+"_"+g.contract);downloadCompactPdf(compactRowsFromItems(itemsFromCommercialGroup(g)),"tabela_"+name+".pdf",commercialTitle(g),g.state+" • "+g.contract+" • "+(g.coverage||g.region||"Base comercial"))}
  function downloadCSV(rows,filename){var csv="\ufeff"+rows.map(function(line){return line.map(csvEscape).join(";")}).join("\r\n"),name=filename||"central_humana.csv";function fallback(){try{if(navigator.share){navigator.share({title:name,text:csv}).then(function(){toast("Dados compartilhados")}).catch(function(){copyText(csv,"CSV copiado")});return}}catch(e){}copyText(csv,"CSV copiado")}try{if(typeof Blob!=="function"||!window.URL||!URL.createObjectURL){fallback();return}var blob=new Blob([csv],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){try{URL.revokeObjectURL(url)}catch(e){}},1000);toast("CSV detalhado exportado")}catch(e){registerEarlyError("csv",e);fallback()}}
  function printCommercialGroup(groupId){
    var block=$("[data-commercial-block='"+CSS.escape(groupId)+"']");if(!block)return;
    block.classList.add("print-target");document.body.classList.add("print-single-table");
    var cleanup=function(){block.classList.remove("print-target");document.body.classList.remove("print-single-table");window.removeEventListener("afterprint",cleanup)};
    window.addEventListener("afterprint",cleanup);window.print();setTimeout(cleanup,1500);
  }
  function toggleCommercialExpanded(groupId){
    var block=$("[data-commercial-block='"+CSS.escape(groupId)+"']");if(!block)return;
    var active=block.classList.toggle("expanded");document.body.classList.toggle("table-focus-mode",active);
    if(active){block.scrollTop=0;var close=document.createElement("button");close.type="button";close.className="focus-exit";close.setAttribute("data-expand-commercial",groupId);close.textContent="Sair da visualização ampliada";block.appendChild(close)}
    else{$$(".focus-exit",block).forEach(function(x){x.remove()})}
  }

  /* =========================================================
     CAMPAIGNS
     ========================================================= */
  var MONTHS={janeiro:0,fevereiro:1,marco:2,"março":2,abril:3,maio:4,junho:5,julho:6,agosto:7,setembro:8,outubro:9,novembro:10,dezembro:11};
  function campaignStatus(period){
    var text=String(period||""),dates=[],m;
    var re=/(\d{1,2})\/(\d{1,2})\/(\d{4})/g;
    while((m=re.exec(text)))dates.push(new Date(+m[3],+m[2]-1,+m[1],23,59,59));
    var end=null;
    if(dates.length)end=dates[dates.length-1];
    if(!end){
      var n=norm(text),parts=n.match(/(janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+(\d{4})/);
      if(parts){var mi=MONTHS[parts[1]];end=new Date(+parts[2],mi+1,0,23,59,59)}
    }
    if(!end)return {label:"Período não confirmado",cls:"badge"};
    return new Date()>end?{label:"Prazo na base encerrado",cls:"badge"}:{label:"Confirme a vigência",cls:"badge badge-orange"};
  }
  function renderCampaigns(){
    var q=norm($("#campaignSearch").value),state=STATE.campaignState;
    var arr=DB.promotions.filter(function(p){
      if(state!=="Todos"&&p.state!==state)return false;
      if(!q)return true;
      return norm([p.title,p.period,p.prc,p.source].concat(p.benefits||[]).join(" ")).indexOf(q)>=0;
    });
    $("#campaignCount").textContent=arr.length+" campanhas";
    if(!arr.length){
      $("#campaignGrid").innerHTML='<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">'+icon("tag")+'</div><b>Nenhuma campanha encontrada</b><p>Altere o estado ou pesquise por outra condição comercial.</p></div>';
      return;
    }
    $("#campaignGrid").innerHTML=arr.map(function(p){
      var st=campaignStatus(p.period),benefits=p.benefits||[],main=benefits[0]||"Condição comercial cadastrada";
      return '<article class="card campaign-card">'+
        '<div class="campaign-top"><span class="badge badge-blue">'+esc(p.state)+'</span><span class="badge '+st.cls+'">'+esc(st.label)+'</span></div>'+
        '<h3>'+esc(p.title)+'</h3><div class="campaign-period">'+esc(p.period||"Período não informado")+'</div>'+
        '<div class="campaign-highlight"><span class="field-label" style="margin-bottom:4px">Benefício principal</span><b>'+esc(main)+'</b></div>'+
        '<ul class="campaign-benefits">'+benefits.slice(1).map(function(b){return '<li>'+esc(b)+'</li>'}).join("")+'</ul>'+
        '<div class="campaign-bottom"><span class="campaign-source">Fonte: '+esc(p.source||"—")+'</span>'+(p.prc?'<span class="badge badge-orange">'+esc(p.prc)+'</span>':"")+'</div>'+
      '</article>';
    }).join("");
  }

  /* =========================================================
     WAITING PERIODS / PRC
     ========================================================= */
  var CARE_HEADERS=["Grupo","Procedimento","Exemplos","Contrato","PRC 1.0 M","PRC 3.0 M","PRC 6.0 M","PRC 12.0 M","PRC 24.1 M"];
  function renderWaitingPeriods(){
    var st=$("#careState").value,contract=$("#careContract").value;
    var rows=(DB.carencias[st]&&DB.carencias[st][contract])||[];
    $("#careSummary").textContent=st+" • "+contract+" • "+rows.length+" grupos";
    $("#careTableHead").innerHTML='<tr>'+CARE_HEADERS.map(function(h){return '<th>'+esc(h)+'</th>'}).join("")+'</tr>';
    $("#careTableBody").innerHTML=rows.map(function(row){
      return '<tr>'+row.map(function(v){return '<td>'+renderValue(v)+'</td>'}).join("")+'</tr>';
    }).join("");
    $("#careCards").innerHTML=rows.map(function(row){
      return '<article class="card data-record"><h3>'+esc(row[1]||("Grupo "+row[0]))+'</h3><div class="kv-list">'+
        row.map(function(v,i){return '<div class="kv"><span>'+esc(CARE_HEADERS[i])+'</span><div>'+renderValue(v)+'</div></div>'}).join("")+
      '</div></article>';
    }).join("");
  }
  function renderPrcDefinitions(){
    $("#prcDefinitions").innerHTML=(DB.prc_defs||[]).map(function(p){
      return '<details class="accordion"><summary><span><span class="badge badge-blue" style="margin-right:7px">'+esc(p.code)+'</span>'+esc(p.code)+'</span></summary><div class="accordion-content"><p>'+esc(p.description)+'</p></div></details>';
    }).join("");
  }

  /* =========================================================
     COPAY
     ========================================================= */
  var COPAY_LABELS=["Consulta eletiva","Pronto-socorro","Exames simples","Exames especiais","Terapias grupo 1","Terapias grupo 2","Terapias grupo 3","Internação"];
  function renderCopay(){
    var st=$("#copayState").value;
    var groups=(DB.copay[st]&&DB.copay[st][STATE.copayMode])||{};
    var names=Object.keys(groups);
    $("#copayHead").innerHTML='<tr><th>Procedimento</th>'+names.map(function(n){return '<th>'+esc(n)+'</th>'}).join("")+'</tr>';
    $("#copayBody").innerHTML=COPAY_LABELS.map(function(label,i){
      return '<tr><td><strong>'+esc(label)+'</strong></td>'+names.map(function(n){return '<td><span class="table-price" style="font-size:12px">'+esc((groups[n]||[])[i]||"—")+'</span></td>'}).join("")+'</tr>';
    }).join("");
    $("#copayCards").innerHTML=COPAY_LABELS.map(function(label,i){
      return '<article class="card data-record"><h3>'+esc(label)+'</h3><div class="kv-list">'+names.map(function(n){
        return '<div class="kv"><span>'+esc(n)+'</span><div>'+esc((groups[n]||[])[i]||"—")+'</div></div>';
      }).join("")+'</div></article>';
    }).join("");
  }

  /* =========================================================
     PROCEDURES
     ========================================================= */
  function initProcedureClasses(){
    var all=[];
    Object.keys(DB.proc_examples).forEach(function(st){DB.proc_examples[st].forEach(function(p){all.push(p["class"]||"—")})});
    setSelect("#procedureClass",sortText(uniq(all)),"Todas");
  }
  function renderProcedures(){
    var st=$("#procedureState").value,q=norm($("#procedureSearch").value),cls=$("#procedureClass").value;
    var arr=(DB.proc_examples[st]||[]).filter(function(p){
      if(cls&&(p["class"]||"—")!==cls)return false;
      if(!q)return true;
      return norm([p.group,p.code,p.procedure,p["class"]].concat(p.values||[]).join(" ")).indexOf(q)>=0;
    });
    $("#procedureCount").textContent=arr.length+" procedimentos";
    if(!arr.length){
      $("#procedureGrid").innerHTML='<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">'+icon("activity")+'</div><b>Nenhum procedimento encontrado</b><p>Pesquise outro termo ou altere estado e categoria.</p></div>';
      return;
    }
    $("#procedureGrid").innerHTML=arr.map(function(p){
      return '<article class="card procedure-card"><div class="procedure-head"><div class="procedure-title"><h3>'+esc(p.procedure||"—")+'</h3><p>TUSS '+esc(p.code||"—")+'</p></div><span class="badge badge-blue">'+esc(st)+'</span></div>'+
        '<div class="proc-meta"><span class="pill">Grupo '+esc(p.group||"—")+'</span><span class="pill">'+esc(p["class"]||"—")+'</span></div>'+
        '<div class="field-label" style="margin-top:11px">Valores cadastrados</div><div class="proc-values">'+
        (p.values||[]).map(function(v,i){return '<span class="proc-value '+(norm(v)==="isento"?"isento":"")+'" title="Valor '+(i+1)+'">'+esc(v)+'</span>'}).join("")+
      '</div></article>';
    }).join("");
  }

  /* =========================================================
     ADHESION
     ========================================================= */
  function renderEntities(){
    $("#entityGrid").innerHTML=(DB.entities||[]).map(function(e){
      return '<article class="card entity-card"><div class="entity-code">'+esc(e.code)+'</div><h3>'+esc(e.name)+'</h3>'+
        '<details><summary>Quem pode aderir</summary><p>'+esc(e.who||"—")+'</p></details>'+
        '<details><summary>Documentação</summary><p>'+esc(e.docs||"—")+'</p></details></article>';
    }).join("");
  }
  function listHtml(items){return '<ul>'+((items||[]).map(function(v){return '<li>'+esc(v)+'</li>'}).join(""))+'</ul>'}
  function renderAdhesionRules(){
    var r=DB.adhesion_rules||{},cards=[];
    cards.push(["Documentação",listHtml(r.documents)]);
    cards.push(["Idade máxima",'<p>'+esc(r.max_age||"—")+'</p>']);
    cards.push(["Dependentes",listHtml(r.dependents)]);
    var commercial=Object.keys(r.commercialization||{}).map(function(k){return '<p><strong>'+esc(k)+':</strong> '+esc(r.commercialization[k])+'</p>'}).join('<hr style="border:0;border-top:1px solid var(--border);margin:9px 0">');
    cards.push(["Comercialização",commercial]);
    var billing=(r.billing||[]).map(function(b){return '<p><strong>Vigência:</strong> '+esc(b.vigencia||"—")+' → <strong>Vencimento:</strong> '+esc(b.vencimento||"—")+'</p>'}).join("");
    cards.push(["Cobrança",billing||"<p>—</p>"]);
    cards.push(["Reajuste",'<p>'+esc(r.reajuste||"—")+'</p>']);
    cards.push(["Rede",listHtml(r.network)]);
    cards.push(["Odontologia de emergência",listHtml(r.dental_emergency)]);
    $("#adhesionRules").innerHTML=cards.map(function(c){
      return '<details class="accordion"><summary>'+esc(c[0])+'</summary><div class="accordion-content">'+c[1]+'</div></details>';
    }).join("");
  }

  /* =========================================================
     NETWORK
     ========================================================= */
  function renderNetwork(){
    var m=DB.med_imagem||{},ma=DB.ma_clinic||{};
    var pi='<article class="card network-card"><div class="campaign-top"><span class="badge badge-blue">PI</span><span class="badge">Med Imagem</span></div>'+
      '<h3>Laboratório Med Imagem</h3><p>'+esc(m.about||"")+'</p>'+
      '<div class="stat-list">'+(m.stats||[]).map(function(s){return '<div class="network-stat">'+esc(s)+'</div>'}).join("")+'</div>'+
      '<div class="unit-list">'+(m.units||[]).map(function(u){return '<div class="unit-row"><b>'+esc(u.name||"Unidade")+'</b><span>'+esc(u.desc||"")+'</span><span>'+esc(u.address||"")+'</span></div>'}).join("")+'</div>'+
      '<div class="notice" style="margin-top:11px">'+icon("info")+'<div>'+esc(m.contact||"")+(m.site?' • '+esc(m.site):"")+(m.instagram?' • '+esc(m.instagram):"")+'</div></div></article>';
    var maCard='<article class="card network-card"><div class="campaign-top"><span class="badge badge-blue">MA</span><span class="badge">Humana Clinic</span></div>'+
      '<h3>Humana Clinic • Maranhão</h3><p>'+esc(ma.annual_visits||"")+'</p>'+
      '<div class="field-label">Unidades</div><div class="tags">'+(ma.units||[]).map(function(u){return '<span class="pill">'+esc(u)+'</span>'}).join("")+'</div>'+
      '<div class="field-label" style="margin-top:14px">Especialidades</div><div class="tags">'+(ma.specialties||[]).map(function(s){return '<span class="pill">'+esc(s)+'</span>'}).join("")+'</div></article>';
    var benefits='<article class="card network-card" style="grid-column:1/-1"><div class="campaign-top"><span class="badge badge-orange">Benefícios gerais</span></div>'+
      '<div class="tags" style="margin-top:10px">'+(DB.benefits||[]).map(function(b){return '<span class="pill">'+esc(b)+'</span>'}).join("")+'</div></article>';
    $("#networkLayout").innerHTML=pi+maCard+benefits;
  }

  /* =========================================================
     DENTAL
     ========================================================= */
  function renderDental(){
    var groups=[["PI — PME",DB.odonto.PI_PME||[]],["MA — PF",DB.odonto.MA_PF||[]]];
    $("#dentalGrid").innerHTML=groups.map(function(g){
      return '<article class="card dental-group"><div class="dental-group-title"><h3>'+esc(g[0])+'</h3><span class="badge badge-orange">Odonto</span></div>'+
        g[1].map(function(o){
          return '<div class="dental-plan"><div class="dental-plan-head"><div><h4>'+esc(o.name)+'</h4><span class="badge">ANS '+esc(o.ans||"—")+'</span></div><div class="dental-price">'+esc(o.from||"—")+'</div></div>'+
          '<div class="tags">'+(o.coverage||[]).map(function(c){return '<span class="pill">'+esc(c)+'</span>'}).join("")+'</div></div>';
        }).join("")+'</article>';
    }).join("");
  }

  /* =========================================================
     SOURCES
     ========================================================= */
  function renderSources(){
    var groups=Object.create(null);
    DB.records.forEach(function(r){
      if(!groups[r.source])groups[r.source]={versions:[],states:[],contracts:[],pages:[],count:0};
      var g=groups[r.source];g.count++;
      [r.version].forEach(function(v){if(g.versions.indexOf(v)<0)g.versions.push(v)});
      [r.state].forEach(function(v){if(g.states.indexOf(v)<0)g.states.push(v)});
      [r.contract].forEach(function(v){if(g.contracts.indexOf(v)<0)g.contracts.push(v)});
      if(g.pages.indexOf(r.page)<0)g.pages.push(r.page);
    });
    var names=sortText(Object.keys(groups));
    $("#sourceCount").textContent=names.length+" documentos-base";
    $("#sourcesList").innerHTML=names.map(function(name){
      var g=groups[name];g.pages.sort(function(a,b){return (+a||0)-(+b||0)});
      return '<article class="card source-item"><h3>'+esc(name)+'</h3><div class="source-meta">'+
        '<div><span>Registros</span><b>'+g.count+'</b></div>'+
        '<div><span>Versão</span><b>'+esc(g.versions.join(", "))+'</b></div>'+
        '<div><span>Estado</span><b>'+esc(g.states.join(", "))+'</b></div>'+
        '<div><span>Contratação</span><b>'+esc(g.contracts.join(", "))+'</b></div>'+
        '<div style="grid-column:1/-1"><span>Páginas referenciadas</span><b>'+esc(g.pages.join(", "))+'</b></div>'+
      '</div></article>';
    }).join("");
  }

  /* =========================================================
     MOBILE FILTER SHEET
     ========================================================= */
  var FILTER_LAST_FOCUS=null;
  function openAdvancedFilters(){var sheet=$("#advancedFilterSheet"),back=$("#filterSheetBackdrop");if(!sheet||!back)return;FILTER_LAST_FOCUS=document.activeElement;sheet.classList.add("open");sheet.setAttribute("aria-hidden","false");back.classList.add("open");back.setAttribute("aria-hidden","false");$("#mobileMoreFiltersBtn").setAttribute("aria-expanded","true");document.body.classList.add("no-scroll")}
  function closeAdvancedFilters(){var sheet=$("#advancedFilterSheet"),back=$("#filterSheetBackdrop");if(!sheet||!back)return;sheet.classList.remove("open");sheet.setAttribute("aria-hidden","true");back.classList.remove("open");back.setAttribute("aria-hidden","true");$("#mobileMoreFiltersBtn").setAttribute("aria-expanded","false");document.body.classList.remove("no-scroll");if(FILTER_LAST_FOCUS&&FILTER_LAST_FOCUS.focus)try{FILTER_LAST_FOCUS.focus()}catch(e){}}
  function clearAdvancedFilters(){["copayFilter","accommodationFilter","segmentFilter","regionFilter"].forEach(function(id){var el=$("#"+id);if(el)el.value=""});STATE.visibleLimit=60;renderPlans()}

  /* =========================================================
     MODAL / SHEET
     ========================================================= */
  var LAST_FOCUS=null;
  function openModal(title,sub,body,footer){
    LAST_FOCUS=document.activeElement;
    $("#modalHeading").textContent=title||"Detalhes";
    $("#modalSubheading").textContent=sub||"";
    $("#modalBody").innerHTML=body||"";
    $("#modalFooter").innerHTML=footer||'<button class="btn btn-ghost" type="button" data-modal-close>Fechar</button>';
    $("#modalBackdrop").classList.add("open");$("#modal").classList.add("open");$("#modal").setAttribute("aria-hidden","false");
    document.body.classList.add("no-scroll");
    setTimeout(function(){$("#closeModal").focus()},0);
  }
  function closeModal(){
    $("#modalBackdrop").classList.remove("open");$("#modal").classList.remove("open");$("#modal").setAttribute("aria-hidden","true");
    document.body.classList.remove("no-scroll");
    if(LAST_FOCUS&&typeof LAST_FOCUS.focus==="function")LAST_FOCUS.focus();
  }
  function openSheet(){
    $("#sheetBackdrop").classList.add("open");$("#mobileSheet").classList.add("open");$("#mobileSheet").setAttribute("aria-hidden","false");
    $("#moreBtn").setAttribute("aria-expanded","true");document.body.classList.add("no-scroll");
  }
  function closeSheet(){
    $("#sheetBackdrop").classList.remove("open");$("#mobileSheet").classList.remove("open");$("#mobileSheet").setAttribute("aria-hidden","true");
    $("#moreBtn").setAttribute("aria-expanded","false");document.body.classList.remove("no-scroll");
  }

  /* =========================================================
     THEME / DENSITY / VIEW
     ========================================================= */
  function applyTheme(theme){
    document.documentElement.setAttribute("data-theme",theme);
    storageSet("theme",theme);
    var use=$("#themeIcon use");
    if(use){var ref=theme==="dark"?"#i-sun":"#i-moon";use.setAttribute("href",ref);try{use.setAttributeNS("http://www.w3.org/1999/xlink","xlink:href",ref)}catch(e){use.setAttribute("xlink:href",ref)}}
    var meta=$('meta[name="theme-color"]');if(meta)meta.setAttribute("content",theme==="dark"?"#0d1725":"#f5f7fb");
    var themeButton=$("#themeBtn"),themeLabel=$("#themeLabel"),nextTheme=theme==="dark"?"claro":"escuro";
    if(themeLabel)themeLabel.textContent=theme==="dark"?"Tema escuro":"Tema claro";
    if(themeButton){themeButton.setAttribute("aria-label","Ativar tema "+nextTheme);themeButton.title="Ativar tema "+nextTheme;themeButton.setAttribute("aria-pressed",theme==="dark"?"true":"false");}
    DIAG.theme=theme;
  }
  function initTheme(){
    var saved=storageGet("theme",null);
    if(saved!=="dark"&&saved!=="light")saved=(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches)?"dark":"light";
    applyTheme(saved);
  }
  function applyDensity(value){
    STATE.density=value==="compact"?"compact":"comfortable";
    document.body.classList.toggle("density-compact",STATE.density==="compact");
    storageSet("density",STATE.density);renderPlans();
  }
  function applyView(value){
    STATE.view=value==="cards"?"cards":"table";
    storageSet("price-view",STATE.view);renderPlans();
  }
  function applySidebarState(){document.body.classList.toggle("sidebar-collapsed",STATE.sidebarCollapsed);var b=$("#sidebarToggle");if(b)b.setAttribute("aria-pressed",STATE.sidebarCollapsed?"true":"false")}
  function toggleSidebar(){STATE.sidebarCollapsed=!STATE.sidebarCollapsed;storageSet("sidebar-collapsed",STATE.sidebarCollapsed);applySidebarState()}

  /* =========================================================
     CSV / PRINT
     ========================================================= */
  function csvEscape(v){var s=String(v===null||v===undefined?"":v);if(/^[\s\t]*[=+@-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'}
  function exportCSV(){var rows=getFilteredRows();if(!rows.length){toast("Nenhum resultado para exportar");return}downloadCSV(detailedRowsFromItems(rows),"central_humana_consulta_detalhada.csv")}
  function exportExcel(){var rows=getFilteredRows();if(!rows.length){toast("Nenhum resultado para exportar");return}downloadExcel(compactRowsFromItems(rows),"central_humana_consulta_compacta.xlsx","Consulta comercial filtrada",queryContextText(),detailedRowsFromItems(rows))}
  function exportPDF(){var rows=getFilteredRows();if(!rows.length){toast("Nenhum resultado para exportar");return}downloadCompactPdf(compactRowsFromItems(rows),"central_humana_consulta_compacta.pdf","Consulta Comercial Humana + B&B",queryContextText())}
  function queryContextText(){var el=$("#queryContextText");return el?el.textContent:"Dados da consulta atual"}

  /* =========================================================
     NAVIGATION / GLOBAL SEARCH
     ========================================================= */
  var NAV_LABELS={inicio:"Início",consulta:"Consulta de planos",campanhas:"Campanhas",carencias:"Carências",coparticipacao:"Coparticipação",procedimentos:"Procedimentos",adesao:"Adesão",rede:"Rede credenciada",odonto:"Odontológico",fontes:"Fontes"};
  function setActiveNav(id){
    $$(".side-link").forEach(function(a){var on=a.dataset.nav===id;a.classList.toggle("active",on);if(on)a.setAttribute("aria-current","page");else a.removeAttribute("aria-current")});
    $$("[data-mobile-nav]").forEach(function(a){var on=a.dataset.mobileNav===id;a.classList.toggle("active",on);if(on)a.setAttribute("aria-current","page");else a.removeAttribute("aria-current")});
    var more=$("#moreBtn");
    if(more)more.classList.toggle("active",["carencias","coparticipacao","procedimentos","adesao","odonto","fontes"].indexOf(id)>=0);
    $("#breadcrumbCurrent").textContent=NAV_LABELS[id]||"Central";
  }
  var scrollTick=false;
  function updateScrollState(){
    scrollTick=false;
    var sections=$$("main .section"),active="inicio",offset=110;
    if(window.scrollY>45){sections.forEach(function(sec){var r=sec.getBoundingClientRect();if(r.height>0&&r.top<=offset)active=sec.id})}
    setActiveNav(active);
    $("#backTop").classList.toggle("show",window.scrollY>600);
  }
  function onScroll(){
    if(!scrollTick){scrollTick=true;requestAnimationFrame(updateScrollState)}
  }
  function globalSearch(query){
    query=String(query||"").trim();if(!query)return;
    var nq=norm(query);
    var planMatch=PRICE_ROWS.some(function(it){return matchesQuery(it,query)});
    if(planMatch){
      applySearchTerm(query,true);scrollToId("consulta");return;
    }
    var foundProc=null,foundState=null;
    Object.keys(DB.proc_examples).some(function(st){
      var hit=(DB.proc_examples[st]||[]).some(function(p){return norm([p.code,p.procedure,p["class"]].join(" ")).indexOf(nq)>=0});
      if(hit){foundState=st;foundProc=true;return true}return false;
    });
    if(foundProc){
      $("#procedureState").value=foundState;$("#procedureSearch").value=query;renderProcedures();bumpHit(query);scrollToId("procedimentos");return;
    }
    var promo=DB.promotions.some(function(p){return norm([p.title,p.period].concat(p.benefits||[]).join(" ")).indexOf(nq)>=0});
    if(promo){
      $("#campaignSearch").value=query;STATE.campaignState="Todos";renderCampaigns();bumpHit(query);scrollToId("campanhas");return;
    }
    applySearchTerm(query,true);scrollToId("consulta");
  }

  /* =========================================================
     EVENTS
     ========================================================= */
  function bindEvents(){
    $("#themeBtn").addEventListener("click",function(){applyTheme(document.documentElement.getAttribute("data-theme")==="dark"?"light":"dark")});
    $("#globalSearchForm").addEventListener("submit",function(e){e.preventDefault();globalSearch($("#globalSearch").value)});
    $("#planSearch").addEventListener("input",function(){showSuggestions(this.value);debounceRender()});
    $("#planSearch").addEventListener("focus",function(){showSuggestions(this.value)});
    var clearSearchBtn=$("#clearSearchOnly");if(clearSearchBtn)clearSearchBtn.addEventListener("click",function(){$("#planSearch").value="";$("#suggestionPopover").hidden=true;renderPlans();$("#planSearch").focus()});
    $("#planSearch").addEventListener("keydown",function(e){
      var items=$$(".suggestion-item",$("#suggestionPopover"));
      if(!items.length)return;
      if(e.key==="ArrowDown"){e.preventDefault();ACTIVE_SUGGESTION=(ACTIVE_SUGGESTION+1)%items.length}
      else if(e.key==="ArrowUp"){e.preventDefault();ACTIVE_SUGGESTION=(ACTIVE_SUGGESTION-1+items.length)%items.length}
      else if(e.key==="Enter"&&ACTIVE_SUGGESTION>=0){e.preventDefault();items[ACTIVE_SUGGESTION].click();return}
      else return;
      items.forEach(function(b,i){b.classList.toggle("active",i===ACTIVE_SUGGESTION)});
    });
    $("#planSearchBtn").addEventListener("click",function(){var q=$("#planSearch").value.trim();if(q)saveRecent(q);STATE.visibleLimit=60;STATE.mobileFullTable=false;STATE.shouldAutoScrollAge=!!parseQueryContext(q).ageBand;renderPlans()});
    $("#planSearch").addEventListener("keydown",function(e){if(e.key==="Enter"&&ACTIVE_SUGGESTION<0){e.preventDefault();$("#planSearchBtn").click()}});
    $("#clearRecents").addEventListener("click",function(){storageSet("recents",[]);renderRecommendations()});
    FILTERS.forEach(function(f){$("#"+f[0]).addEventListener("change",function(){STATE.visibleLimit=60;STATE.mobileFullTable=false;if(f[0]==="ageFilter")STATE.pinnedAge="";renderPlans()})});
    $("#ageNumber").addEventListener("input",function(){
      var invalid=this.value!==""&&(!/^\d+$/.test(this.value)||Number(this.value)>120);
      this.setCustomValidity(invalid?"Informe uma idade válida de 0 a 120 anos.":"");
      this.setAttribute("aria-invalid",invalid?"true":"false");
      if(invalid){$("#ageDetected").textContent="Idade inválida: use 0 a 120 anos";return;}
      var band=ageBand(this.value);$("#ageFilter").value=band;STATE.pinnedAge="";STATE.mobileFullTable=false;STATE.shouldAutoScrollAge=!!band;
      $("#ageDetected").textContent=band?("Faixa detectada: "+band+" anos"):"Nenhuma idade informada";
      STATE.visibleLimit=60;renderPlans();
    });
    $("#clearFiltersBtn").addEventListener("click",clearPlanFilters);
    $("#mobileMoreFiltersBtn").addEventListener("click",openAdvancedFilters);
    $("#closeAdvancedFilters").addEventListener("click",closeAdvancedFilters);
    $("#applyAdvancedFilters").addEventListener("click",closeAdvancedFilters);
    $("#clearAdvancedFilters").addEventListener("click",clearAdvancedFilters);
    $("#filterSheetBackdrop").addEventListener("click",closeAdvancedFilters);
    $("#sortFilter").addEventListener("change",function(){renderPlans()});
    $("#favoritesOnlyBtn").addEventListener("click",function(){STATE.favoritesOnly=!STATE.favoritesOnly;STATE.visibleLimit=60;renderPlans()});
    $("#exportBtn").addEventListener("click",exportCSV);
    if($("#exportExcelBtn"))$("#exportExcelBtn").addEventListener("click",exportExcel);
    if($("#exportPdfBtn"))$("#exportPdfBtn").addEventListener("click",exportPDF);
    $("#printBtn").addEventListener("click",function(){window.print()});
    $("#loadMoreBtn").addEventListener("click",function(){STATE.visibleLimit+=60;renderPlans()});
    $("#viewToggle").addEventListener("click",function(e){var b=e.target.closest("[data-view]");if(b)applyView(b.dataset.view)});
    if($("#sidebarToggle"))$("#sidebarToggle").addEventListener("click",toggleSidebar);
    if($("#editFiltersBtn"))$("#editFiltersBtn").addEventListener("click",function(){var el=$(".search-shell");if(el)safeScrollIntoView(el,"start")});
    $("#densityToggle").addEventListener("click",function(e){var b=e.target.closest("[data-density]");if(b)applyDensity(b.dataset.density)});
    $("#campaignSearch").addEventListener("input",renderCampaigns);
    $("#campaignTabs").addEventListener("click",function(e){
      var b=e.target.closest("[data-campaign-state]");if(!b)return;
      STATE.campaignState=b.dataset.campaignState;
      $$("[data-campaign-state]").forEach(function(x){var on=x===b;x.classList.toggle("active",on);x.setAttribute("aria-selected",on?"true":"false")});
      renderCampaigns();
    });
    $("#careState").addEventListener("change",renderWaitingPeriods);
    $("#careContract").addEventListener("change",renderWaitingPeriods);
    $("#copayState").addEventListener("change",renderCopay);
    $("#copayMode").addEventListener("click",function(e){
      var b=e.target.closest("[data-copay-mode]");if(!b)return;
      STATE.copayMode=b.dataset.copayMode;
      $$("[data-copay-mode]").forEach(function(x){x.classList.toggle("active",x===b)});
      renderCopay();
    });
    $("#procedureSearch").addEventListener("input",renderProcedures);
    $("#procedureState").addEventListener("change",renderProcedures);
    $("#procedureClass").addEventListener("change",renderProcedures);
    $("#moreBtn").addEventListener("click",openSheet);
    $("#closeSheet").addEventListener("click",closeSheet);
    $("#sheetBackdrop").addEventListener("click",closeSheet);
    $$(".sheet-link").forEach(function(a){a.addEventListener("click",closeSheet)});
    $("#modalBackdrop").addEventListener("click",closeModal);
    $("#closeModal").addEventListener("click",closeModal);
    $("#openCompareBtn").addEventListener("click",openCompare);
    $("#clearCompareBtn").addEventListener("click",function(){STATE.compare=[];renderPlans()});
    $("#backTop").addEventListener("click",function(){window.scrollTo({top:0,behavior:"smooth"})});
    document.addEventListener("click",function(e){
      var b=e.target.closest("[data-suggestion]");if(b){applySearchTerm(b.dataset.suggestion,true);return}
      b=e.target.closest("[data-reco]");if(b){applySearchTerm(b.dataset.reco,true);scrollToId("consulta");return}
      b=e.target.closest("[data-clear-filter]");if(b){
        var id=b.dataset.clearFilter;
        if(id==="planSearch")$("#planSearch").value="";
        else if(id==="favoritesOnly")STATE.favoritesOnly=false;
        else $("#"+id).value="";
        STATE.visibleLimit=60;renderPlans();return;
      }
      b=e.target.closest("[data-clear-all]");if(b){clearPlanFilters();return}
      b=e.target.closest("[data-favorite]");if(b){toggleFavorite(b.dataset.favorite);return}
      b=e.target.closest("[data-compare]");if(b){toggleCompare(b.dataset.compare);return}
      b=e.target.closest("[data-copy-plan]");if(b){var it=ROW_INDEX[b.dataset.copyPlan];if(it){copyText(planCopyText(it),"Informações copiadas");bumpHit(it.record.plan)}return}
      b=e.target.closest("[data-plan-details]");if(b){openPlanDetails(b.dataset.planDetails);return}
      b=e.target.closest("[data-favorite-config]");if(b){toggleConfigFavorite(b.dataset.favoriteConfig);return}
      b=e.target.closest("[data-price-record]");if(b){openPriceCell(b.dataset.priceRecord,b.dataset.priceAge,b.dataset.priceProduct);return}
      b=e.target.closest("[data-copy-price]");if(b){copyPriceSelection(b.dataset.copyPrice);return}
      b=e.target.closest("[data-open-table-group]");if(b){STATE.openCommercialGroups.add(b.dataset.openTableGroup);renderPlans();return}
      b=e.target.closest("[data-close-table-group]");if(b){STATE.openCommercialGroups.delete(b.dataset.closeTableGroup);var block=b.closest("[data-commercial-block]");if(block)safeScrollIntoView(block,"center");renderPlans();return}
      b=e.target.closest("[data-expand-commercial]");if(b){toggleCommercialExpanded(b.dataset.expandCommercial);return}
      b=e.target.closest("[data-export-commercial-excel]");if(b){exportCommercialGroupExcel(b.dataset.exportCommercialExcel);var menuX=b.closest(".export-menu");if(menuX)menuX.removeAttribute("open");return}
      b=e.target.closest("[data-export-commercial-pdf]");if(b){exportCommercialGroupPdf(b.dataset.exportCommercialPdf);var menuP=b.closest(".export-menu");if(menuP)menuP.removeAttribute("open");return}
      b=e.target.closest("[data-export-commercial]");if(b){exportCommercialGroup(b.dataset.exportCommercial);var menuC=b.closest(".export-menu");if(menuC)menuC.removeAttribute("open");return}
      b=e.target.closest("[data-print-commercial]");if(b){printCommercialGroup(b.dataset.printCommercial);return}
      b=e.target.closest("[data-source-commercial]");if(b){openCommercialSources(b.dataset.sourceCommercial);return}
      b=e.target.closest("[data-pin-age]");if(b){STATE.pinnedAge=b.dataset.pinAge;STATE.mobileFullTable=false;renderPlans();return}
      b=e.target.closest("[data-mobile-price-mode]");if(b){
        STATE.mobilePriceMode=b.dataset.mobilePriceMode==="detail"?"detail":"compact";
        storageSet("mobile-price-mode",STATE.mobilePriceMode);
        var contextId=b.closest("[data-commercial-block]")?.dataset.commercialBlock;
        renderPlans();
        if(contextId){var current=document.querySelector('[data-commercial-block="'+CSS.escape(contextId)+'"] .mobile-result-tools');if(current)requestAnimationFrame(function(){safeScrollIntoView(current,"nearest")})}
        return;
      }
      b=e.target.closest("[data-mobile-table-mode]");if(b){STATE.mobileFullTable=b.dataset.mobileTableMode==="full";renderPlans();return}
      b=e.target.closest("[data-modal-close]");if(b){closeModal();return}
      if(!e.target.closest(".export-menu"))$$(".export-menu[open]").forEach(function(m){m.removeAttribute("open")});
      if(!e.target.closest(".search-main-row"))$("#suggestionPopover").hidden=true;
    });
    document.addEventListener("change",function(e){var s=e.target.closest("[data-jump-age]");if(!s||!s.value)return;var groupId=s.closest("[data-commercial-block]")?.dataset.commercialBlock,band=s.value;STATE.pinnedAge=band;renderPlans();var block=groupId?document.querySelector('[data-commercial-block="'+CSS.escape(groupId)+'"]'):null;var row=block?$("[data-age-row='"+band+"']",block):null;if(row)safeScrollIntoView(row,"center")});
    document.addEventListener("mouseover",function(e){var c=e.target.closest("[data-group]");if(!c||!c.closest(".commercial-price-table"))return;var table=c.closest(".commercial-price-table"),token=c.dataset.group;$$("[data-group='"+token+"']",table).forEach(function(x){x.classList.add("column-hover")})});
    document.addEventListener("mouseout",function(e){var table=e.target.closest?e.target.closest(".commercial-price-table"):null;if(table)$$(".column-hover",table).forEach(function(x){x.classList.remove("column-hover")})});
    document.addEventListener("keydown",function(e){if(e.key==="Escape"){if($("#modal").classList.contains("open"))closeModal();if($("#mobileSheet").classList.contains("open"))closeSheet();if($("#advancedFilterSheet").classList.contains("open"))closeAdvancedFilters();var expanded=$(".commercial-table-block.expanded");if(expanded){expanded.classList.remove("expanded");document.body.classList.remove("table-focus-mode")}return}if(e.key==="Tab"){var scope=$("#modal.open")||$("#mobileSheet.open")||$("#advancedFilterSheet.open");if(!scope)return;var focusables=$$("button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex='-1'])",scope).filter(function(x){return x.offsetParent!==null});if(!focusables.length)return;var first=focusables[0],last=focusables[focusables.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});
    window.addEventListener("scroll",onScroll,{passive:true});
    var printRestore=null;
    window.addEventListener("beforeprint",function(){if(!BREAKPOINT_WIDE.matches){printRestore=STATE.mobileFullTable;STATE.mobileFullTable=true;renderPlans()}});
    window.addEventListener("afterprint",function(){if(printRestore!==null){STATE.mobileFullTable=printRestore;printRestore=null;renderPlans()}});
    var wasWide=BREAKPOINT_WIDE.matches;
    var resizeTimer=null;function handleViewportChange(){clearTimeout(resizeTimer);resizeTimer=setTimeout(function(){var nowWide=BREAKPOINT_WIDE.matches;if(nowWide!==wasWide){wasWide=nowWide;STATE.mobileFullTable=false;renderPlans()}updateScrollState()},90)}
    window.addEventListener("resize",handleViewportChange,{passive:true});window.addEventListener("orientationchange",handleViewportChange,{passive:true});
  }

  /* =========================================================
     INIT
     ========================================================= */
  function bootApplication(){try{loadDatabase();safeInit("price-index",buildPriceRows);var validation=validateDatabase();if(!validation||!validation.integridade)registerEarlyError("integrity",new Error("Validação comercial com divergência; dados preservados sem alteração"));safeInit("theme",initTheme);safeInit("sidebar",applySidebarState);document.body.classList.toggle("density-compact",STATE.density==="compact");safeInit("metrics",initMetrics);safeInit("filters",initPlanFilters);safeInit("suggestions",function(){buildSuggestionPool();renderRecommendations()});safeInit("procedures-classes",initProcedureClasses);renderPlans();bindEvents();updateScrollState();window.CentralApp={database:DB,state:STATE,validation:validation,getFilteredRows:getFilteredRows,compactRowsFromItems:compactRowsFromItems,detailedRowsFromItems:detailedRowsFromItems,renderPlans:renderPlans,renderCampaigns:renderCampaigns,renderProcedures:renderProcedures,clearPlanFilters:clearPlanFilters,storage:StorageService};markAppReady();requestAnimationFrame(updateScrollState);scheduleSecondaryModules()}catch(error){activateCompatibilityMode(error)}}

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bootApplication);else bootApplication();
})();
