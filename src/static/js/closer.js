(function(w, loadHandlers){
    function getTopWindow(checkWindow){
        if(!checkWindow) checkWindow = window.self;
        try {if(checkWindow.parent && !checkWindow.parent.noDialog){
            return getTopWindow(checkWindow.parent);}
        }catch(e){}
        return checkWindow;
    }
    function _isDialog(){
        var dialogTag = 'DIALOG', el = w.frameElement || {};
        while( (el=el.parentElement) && el.tagName.toUpperCase()!==dialogTag );
        return !!el;
    }
    var isInDialog = _isDialog();
    var hasOpener = !!w.opener;
    if(isInDialog){
        w.isALDialog = true; //gof's Set mark of dialog to be able use it in comparisons later along with self==top
        if(!w.isDialogCloseable){
            console.debug('self.isDialogCloseable is false. Overriding self.close()');
            w.isDialogCloseable = true;
            var script = w.document.createElement('script');
            script.textContent = "function close(){console.debug('close() is defined by newclose');function getTopWindow(checkWindow){if(!checkWindow) checkWindow = window.self;try {if(checkWindow.parent && !checkWindow.parent.noDialog){return getTopWindow(checkWindow.parent);}}catch(e){}return checkWindow;};getTopWindow().postMessage({dialog:null},'*');}";
            w.document.head.appendChild(script);
        }
    }
    if(loadHandlers.length>1) throw new Error('More than one loader. That is not implemented yet!');
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
        if(isInDialog && !hasOpener){
            (function(funcName, loadHandler){
                console.debug('registered listener for deferred', funcName);
                console.debug('openerset listener in', w.document);
                w[funcName] = function(){
                      console.debug('running deferred', funcName);
                      loadHandler.apply(w);
                      getTopWindow().postMessage({dialog: {loaded:true}}, '*');
                  };
                w.addEventListener('openerset', function(){
                  w[funcName] = function(){
                      console.debug('running deferred', funcName);
                      loadHandler.apply(w);
                      getTopWindow().postMessage({dialog: {loaded:true}}, '*');
                  };
                  console.debug('Now', funcName, 'is:', w[funcName].toString());
                });
            })(funcName, loadHandler);
        } else {
          console.debug('onload is direct');
          w[funcName] = function(){
            loadHandler.apply(w);
            getTopWindow().postMessage({dialog: {loaded: true}}, '*');
          };
        }
    }
    if(isInDialog && !hasOpener){
        (function(w){
            w.addEventListener('message', function(){
                console.debug('Opener is set, proceed to onload functions');
                w.dispatchEvent(new Event('openerset'));
            });
        })(w);
        console.debug('Request for opener');
        getTopWindow().postMessage({dialog: {update: true}}, '*');
    }
  })(window.self, [onPageLoad]);