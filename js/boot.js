(function(){
  "use strict";
  var root=document.documentElement;
  root.className=(root.className||"").replace(/\bno-js\b/g,"").replace(/\s+/g," ").trim()+" js-booting";
  var d=window.CentralDiagnostics=window.CentralDiagnostics||{errors:[],databaseLoaded:false,recordCount:0,priceRowCount:0,bootTime:null,storageAvailable:false,platform:navigator.userAgent||"unknown",protocol:location.protocol||"unknown",isLocalFile:(location.protocol==="file:"),theme:"light",compatibilityMode:false};
  d.bootStartedAt=Date.now();
  function rec(type,msg,src,line,col,err){try{d.errors.push({type:type,message:String(msg||"Erro desconhecido"),source:src||"",line:line||0,column:col||0,stack:err&&err.stack?String(err.stack):"",time:(new Date()).toISOString()})}catch(ignore){}}
  window.onerror=function(msg,src,line,col,err){rec("error",msg,src,line,col,err);return false};
  window.onunhandledrejection=function(ev){rec("promise",ev&&ev.reason?ev.reason:"Promise rejeitada","",0,0,ev&&ev.reason)};
  window.__centralWatchdog=setTimeout(function(){
    if((" "+root.className+" ").indexOf(" app-ready ")>=0)return;
    rec("watchdog","A aplicação não concluiu a inicialização no tempo esperado");
    root.className=(root.className||"").replace(/\bjs-booting\b/g,"").replace(/\s+/g," ").trim()+" compat-mode";
    d.compatibilityMode=true;
    try{
      var msg=document.getElementById("bootMessage"),hint=document.getElementById("bootHint"),retry=document.getElementById("bootRetry");
      if(msg)msg.textContent="O carregamento demorou mais que o esperado.";
      if(hint)hint.textContent="Tente recarregar. O pacote também inclui uma versão HTML offline independente.";
      if(retry)retry.hidden=false;
    }catch(ignore){}
  },8000);
})();
