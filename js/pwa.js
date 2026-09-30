(function(){
  "use strict";
  var status=document.getElementById("pwaStatus"),statusText=document.getElementById("pwaStatusText"),banner=document.getElementById("pwaUpdate"),btn=document.getElementById("pwaUpdateBtn");
  function setStatus(text,show){if(!status)return;statusText.textContent=text;status.hidden=!show;}
  if(!("serviceWorker" in navigator) || location.protocol==="file:"){setStatus("Versão web: cache offline indisponível neste protocolo",false);return;}
  window.addEventListener("load",function(){
    navigator.serviceWorker.register("./service-worker.js",{scope:"./"}).then(function(reg){
      navigator.serviceWorker.ready.then(function(){setStatus("Base disponível offline",true);setTimeout(function(){if(status)status.hidden=true},5000);});
      function showUpdate(worker){if(!worker||!navigator.serviceWorker.controller)return;banner.hidden=false;btn.onclick=function(){btn.disabled=true;btn.textContent="Atualizando…";worker.postMessage({type:"SKIP_WAITING"});};}
      if(reg.waiting)showUpdate(reg.waiting);
      reg.addEventListener("updatefound",function(){var nw=reg.installing;if(!nw)return;nw.addEventListener("statechange",function(){if(nw.state==="installed"&&navigator.serviceWorker.controller)showUpdate(nw);});});
    }).catch(function(){setStatus("A central continua funcionando online; cache offline não pôde ser preparado",true);});
    var refreshing=false;navigator.serviceWorker.addEventListener("controllerchange",function(){if(refreshing)return;refreshing=true;location.reload();});
  });
})();
