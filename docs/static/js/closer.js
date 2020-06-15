(function(w, loadHandlers){
    var utils = {
        getTopWindow: function(checkWindow) {
            if(!checkWindow) checkWindow = window.self;
            try {if(checkWindow.parent && !checkWindow.parent.noDialog){
                return utils.getTopWindow(checkWindow.parent);}
            }catch(e){}
            return checkWindow;
        },
        isDialog: function(){
            var dialogTag = 'DIALOG', el = w.frameElement || {};
            while( (el=el.parentElement) && el.tagName.toUpperCase()!==dialogTag );
            return !!el;
        },
        createEvent: function(eventName) {
            if(typeof(Event) === 'function') {
                return new Event(eventName);
            } else {
                var ieEvent = document.createEvent('Event');
                ieEvent.initEvent(eventName, false, true);
                return ieEvent;
            }
        },
        requestDialogUpdate: function(){
            console.debug('[requestDialogUpdate] Request for opener');
            utils.getTopWindow().postMessage({dialog: {update: true}}, '*');
        },
        runHandler: function(dialogWindow, theLoadHandler, isSendUpdate) {
            console.debug('[runHandler] Running deferred', funcName);
            theLoadHandler.apply(dialogWindow);
            if(isSendUpdate) utils.getTopWindow().postMessage({dialog: {loaded:true}}, '*');
                    
        }
    };
    var isInDialog = utils.isDialog();
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
            var sendUpdate = k===loadHandlers.length-1 ? true: false;
            if(!hasOpener){
                (function(funcName, loadHandler, isSendUpdate){
                    console.debug('registering listener for deferred onload:', funcName);
                    //FF
                    function openersetListener(){
                        w.removeEventListener('openerset', openersetListener);
                        w.removeEventListener('openerset', openersetListener2);
                        console.debug('opener is set [Firefox], call body.onload=', funcName);
                        utils.runHandler(w, loadHandler, isSendUpdate);
                    }
                    w[funcName] = function(){
                        console.debug(funcName, 'for Firefox');
                        w.removeEventListener('openerset', openersetListener2);
                        w.addEventListener('openerset', openersetListener);
                    };
                    //Chrome
                    function openersetListener2(){
                        console.debug('opener is set [Chrome], waiting for calling body.onload =', funcName);
                        w.removeEventListener('openerset', openersetListener);
                        w.removeEventListener('openerset', openersetListener2);
                        w[funcName] = function(){
                            console.debug(funcName, 'for Chrome');
                            utils.runHandler(w, loadHandler, isSendUpdate);
                        };
                    }
                    w.addEventListener('openerset', openersetListener2);
                })(funcName, loadHandler, sendUpdate);
            } else {
                w[funcName] = function(){
                    console.debug('onload is direct:', funcName);
                    loadHandler.apply(w);
                };
            }
        } else {
            w[funcName] = function(){
                console.debug('closer.js is not in a dialog');
                loadHandler.apply(w);
            };
        }
    }
    if(isInDialog && !hasOpener){
        (function(w){
            w.addEventListener('message', function(){
                console.debug('Opener is set, proceed to onload functions');
                w.dispatchEvent(utils.createEvent('openerset'));
            });
        })(w);
        utils.requestDialogUpdate();
    }
  })(window.self, [onPageLoad]);