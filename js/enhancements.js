(function(){
  "use strict";
  var PREFIX="central-humana:enhanced:";
  function $(s,r){return (r||document).querySelector(s)}
  function $$(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
  function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]})}
  function uniq(arr){var seen=Object.create(null),out=[];(arr||[]).forEach(function(v){v=String(v||"").trim();var k=v.toLocaleLowerCase("pt-BR");if(v&&!seen[k]){seen[k]=1;out.push(v)}});return out}
  function ageBand(v){var n=parseInt(v,10);if(!isFinite(n)||n<0)return "";if(n<=18)return "00-18";if(n<=23)return "19-23";if(n<=28)return "24-28";if(n<=33)return "29-33";if(n<=38)return "34-38";if(n<=43)return "39-43";if(n<=48)return "44-48";if(n<=53)return "49-53";if(n<=58)return "54-58";return "59+"}
  var MEMORY=Object.create(null);
  function read(key,fallback){try{var x=localStorage.getItem(PREFIX+key);if(x)return JSON.parse(x)}catch(e){}return Object.prototype.hasOwnProperty.call(MEMORY,key)?MEMORY[key]:fallback}
  function write(key,value){MEMORY[key]=value;try{localStorage.setItem(PREFIX+key,JSON.stringify(value));return true}catch(e){return false}}
  function notify(msg){var t=$("#toast");if(!t)return;t.textContent=msg;t.classList.add("show");clearTimeout(notify.timer);notify.timer=setTimeout(function(){t.classList.remove("show")},2200)}
  function fire(el,type){if(!el)return;try{el.dispatchEvent(new Event(type,{bubbles:true}))}catch(e){var ev=document.createEvent("Event");ev.initEvent(type,true,true);el.dispatchEvent(ev)}}
  function setSelect(el,value){if(!el)return;var found=false;Array.prototype.forEach.call(el.options,function(o){if(o.value===value){found=true}});el.value=found?value:"";fire(el,"change")}
  function fillSelect(el,values,first){if(!el)return;var current=el.value;el.innerHTML='<option value="">'+esc(first)+'</option>'+values.map(function(v){return '<option value="'+esc(v)+'">'+esc(v)+'</option>'}).join("");if(values.indexOf(current)>=0)el.value=current}
  function quickSetup(app){
    var db=app.database||{},records=db.records||[];
    fillSelect($("#quickContract"),uniq(records.map(function(r){return r.contract})).sort(),"Todas");
    fillSelect($("#quickPlan"),uniq(records.map(function(r){return r.plan})).sort(function(a,b){return a.localeCompare(b,"pt-BR")}),"Todos os planos");
    var state=$("#quickState"),contract=$("#quickContract"),plan=$("#quickPlan"),age=$("#quickAge"),btn=$("#quickSearchBtn"),hint=$("#quickSearchHint");
    function refreshPlans(){var st=state.value,ct=contract.value;var plans=uniq(records.filter(function(r){return (!st||r.state===st)&&(!ct||r.contract===ct)}).map(function(r){return r.plan})).sort(function(a,b){return a.localeCompare(b,"pt-BR")});fillSelect(plan,plans,"Todos os planos");if(hint){var count=records.filter(function(r){return (!st||r.state===st)&&(!ct||r.contract===ct)&&(!plan.value||r.plan===plan.value)}).length;hint.textContent=count+" configurações compatíveis antes da faixa etária."}}
    state.addEventListener("change",refreshPlans);contract.addEventListener("change",refreshPlans);plan.addEventListener("change",refreshPlans);refreshPlans();
    if(age){age.addEventListener("input",function(){age.setCustomValidity("")})}
    btn.addEventListener("click",function(){
      // A manual quotation must not silently treat invalid ages as 59+.
      if(age && age.value!=="" && (!/^\d+$/.test(age.value) || Number(age.value)>120)){
        age.setCustomValidity("Informe uma idade válida entre 0 e 120 anos.");
        age.reportValidity();age.focus();return;
      }
      var sf=$("#stateFilter"),cf=$("#contractFilter"),pf=$("#planFilter"),af=$("#ageFilter"),an=$("#ageNumber"),ps=$("#planSearch");
      if(ps)ps.value="";
      if(sf){sf.value=state.value||""}
      if(cf){cf.value=contract.value||""}
      if(pf){pf.value=plan.value||""}
      if(an)an.value=age.value||"";
      if(af)af.value=age.value?ageBand(age.value):"";
      if($("#ageDetected"))$("#ageDetected").textContent=age.value?("Faixa detectada: "+ageBand(age.value)+" anos"):"Nenhuma idade informada";
      if(app.state){app.state.pinnedAge="";app.state.mobileFullTable=false;app.state.shouldAutoScrollAge=!!age.value;app.state.visibleLimit=60}
      app.renderPlans();
      var target=$("#consulta");if(target){location.hash="consulta";var directAge=!!age.value;setTimeout(function(){var mobile=window.matchMedia("(max-width:900px)").matches;var result=directAge?document.querySelector(mobile?".mobile-band-view":".commercial-table-block .age-highlight"):null;(result||target).scrollIntoView({behavior:"auto",block:mobile?"start":"center"})},80)}
      notify("Filtros aplicados à consulta");
    });
  }
  function currentQuery(){
    var ids=["stateFilter","contractFilter","planFilter","ageFilter","copayFilter","accommodationFilter","segmentFilter","regionFilter"];
    var data={name:"",search:$("#planSearch")?$("#planSearch").value:"",ageNumber:$("#ageNumber")?$("#ageNumber").value:"",filters:{}};
    ids.forEach(function(id){var el=$("#"+id);data.filters[id]=el?el.value:""});
    var parts=[];if(data.filters.stateFilter)parts.push(data.filters.stateFilter);if(data.filters.contractFilter)parts.push(data.filters.contractFilter);if(data.filters.planFilter)parts.push(data.filters.planFilter);if(data.filters.ageFilter)parts.push(data.filters.ageFilter);if(data.search)parts.push(data.search);
    data.name=parts.slice(0,4).join(" • ")||"Consulta personalizada";return data
  }
  function savedSetup(app){
    var host=$("#savedQueryChips"),save=$("#saveQueryBtn");if(!host||!save)return;
    function list(){return read("queries",[])}
    function persist(arr){write("queries",arr.slice(0,8))}
    function render(){var arr=list();if(!arr.length){host.innerHTML='<span class="saved-query-empty">Nenhuma consulta salva ainda</span>';return}host.innerHTML=arr.map(function(q,i){return '<span class="saved-query-pill"><button type="button" data-run-saved="'+i+'">'+esc(q.name)+'</button><button class="saved-query-remove" type="button" data-remove-saved="'+i+'" aria-label="Excluir consulta salva">×</button></span>'}).join("")}
    function apply(q){if(!q)return;var ps=$("#planSearch");if(ps)ps.value=q.search||"";Object.keys(q.filters||{}).forEach(function(id){var el=$("#"+id);if(el)el.value=q.filters[id]||""});var an=$("#ageNumber");if(an)an.value=q.ageNumber||"";var ad=$("#ageDetected");if(ad)ad.textContent=q.ageNumber?("Faixa detectada: "+ageBand(q.ageNumber)+" anos"):"Nenhuma idade informada";if(app.state){app.state.pinnedAge="";app.state.mobileFullTable=false;app.state.visibleLimit=60;app.state.shouldAutoScrollAge=!!q.ageNumber}app.renderPlans();var target=$("#consulta");if(target)target.scrollIntoView({behavior:"smooth",block:"start"});notify("Consulta salva aplicada")}
    save.addEventListener("click",function(){var q=currentQuery(),arr=list();var sig=JSON.stringify({s:q.search,a:q.ageNumber,f:q.filters});arr=arr.filter(function(x){return JSON.stringify({s:x.search,a:x.ageNumber,f:x.filters})!==sig});arr.unshift(q);persist(arr);render();notify("Consulta salva neste dispositivo")});
    host.addEventListener("click",function(e){var run=e.target.closest("[data-run-saved]");if(run){apply(list()[+run.dataset.runSaved]);return}var rem=e.target.closest("[data-remove-saved]");if(rem){var arr=list();arr.splice(+rem.dataset.removeSaved,1);persist(arr);render();notify("Consulta removida")}});render();
  }
  function shortcutsSetup(){
    document.addEventListener("keydown",function(e){
      if((e.key==="/"||((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"))&&!/input|select|textarea/i.test(document.activeElement&&document.activeElement.tagName||"")){e.preventDefault();var search=$("#planSearch");if(search){search.focus();search.scrollIntoView({behavior:"smooth",block:"center"})}}
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="p"){e.preventDefault();window.print()}
    });
  }
  function visualPolishSetup(){
    var topSearch=$("#globalSearch");if(topSearch)topSearch.setAttribute("title","Atalho: Ctrl/Cmd + K ou /");
    var content=$(".content");if(content)content.setAttribute("data-enhanced","true");
    var current=location.hash.replace("#","")||"inicio";document.documentElement.setAttribute("data-current-section",current);
    window.addEventListener("hashchange",function(){document.documentElement.setAttribute("data-current-section",location.hash.replace("#","")||"inicio")});
  }
  function init(){var app=window.CentralApp;if(!app||!app.database)return;quickSetup(app);savedSetup(app);shortcutsSetup();visualPolishSetup();document.documentElement.classList.add("experience-pro")}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",function(){setTimeout(init,0)});else setTimeout(init,0);
})();
