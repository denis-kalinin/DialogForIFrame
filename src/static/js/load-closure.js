(function(w, loadHandlers){
  function _isDialog(){
    var dialogTag = 'DIALOG', el = w.frameElement || {};
    while( (el=el.parentElement) && el.tagName.toUpperCase()!==dialogTag);
    return !!el;
  }
  var isInDialog = !w.opener && _isDialog();
  var openerUpdated = false;
  for(var k=0; k<loadHandlers.length; k++){
    var loadHandler = loadHandlers[k];
    if(!loadHandler) throw new Error("\"loadHandler["+k+"]\" is null or undefined. If \"loadHandler\" is a function expression put it somewhere above.");
    if (!loadHandler instanceof Function) throw new Error('loadHandler['+k+'] is not a function.');
    var funcName = loadHandler.name;
    if(!funcName){
        var result = /^function\s+([\w\$]+)\s*\(/.exec( loadHandler.toString() );
        if(!result) throw new Error("Function expression in IE! DECLARE loadHandler: \"function onPageLoad(){...}\", DON'T express like \"var onPageLoad=function(){...}\"");
        funcName = result[1];
    }
    if(isInDialog){
      (function(w, funcName, loadHandler){
        w[funcName] = function(){
          if(openerUpdated){
            loadHandler.apply(w);
          } else {
            w.addEventListener('message', function(){
              loadHandler.apply(w);
            }, false);
          }
        };
      })(w, funcName, loadHandler);
    } else {
      w[funcName] = function(){ loadHandler.apply(w); };
    }
  }
  if(isInDialog){
    var script = w.document.createElement('script');
    script.textContent = "function getTopWindow(checkWindow){if(!checkWindow) checkWindow = window.self;try {if(checkWindow.parent && !checkWindow.parent.noDialog){return getTopWindow(checkWindow.parent);}}catch(e){}return checkWindow;}function close(){getTopWindow().postMessage({dialog:null},'*')}";
    w.document.head.appendChild(script);
    (function(w){
      w.addEventListener('message', function(){
        openerUpdated = true;
      }, false);
    })(w);
    function getTopWindow(checkWindow){
      if(!checkWindow) checkWindow = window.self;
      try {
          if(checkWindow.parent && !checkWindow.parent.noDialog){
              return getTopWindow(checkWindow.parent);
          }
      } catch (e) {}
      return checkWindow;
    }
    getTopWindow(w).postMessage({dialog:{update:true}}, '*');
  }
})(window.self, [testOnload, onPageLoad, testOnload2]);