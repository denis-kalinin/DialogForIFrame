(function(w, loadHandlers){
    var utils = {
        getTopWindow: function(checkWindow) {
            if(!checkWindow) checkWindow = window.self;
            try {
                if(checkWindow.parent && !checkWindow.parent.noDialog){
                    return utils.getTopWindow(checkWindow.parent);
                }
            }catch(e){}
            return checkWindow;
        },
        isDialog: function(checkWindow){
            if(!checkWindow) throw new Error('checkWindow is undefined or null');
            var dialogTag = 'DIALOG', el = checkWindow.frameElement || {};
            while( 
                (el=el.parentElement) && 
                el.tagName.toUpperCase()!==dialogTag
            );
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
            //console.debug('[requestDialogUpdate] Request for opener');
            utils.getTopWindow().postMessage({dialog: {update: true}}, '*');
        },
        runHandler: function(dialogWindow, theLoadHandler, isSendUpdate) {
            //console.debug('[runHandler] Running deferred', funcName);
            theLoadHandler.apply(dialogWindow);
            if(isSendUpdate){
                var isDetachable = dialogWindow.AL && dialogWindow.AL.detachable ? true : false;
                utils.getTopWindow().postMessage({
                    dialog: {
                        loaded: true,
                        detachable: isDetachable
                    }
                }, '*');
            }
                    
        }
    };
    var isInDialog = utils.isDialog(self);
    var hasOpener = !!w.opener;
    if(!w.AL){
        w.AL = {};
    }
    w.AL.getTopWindow = utils.getTopWindow;
    w.AL.isDialog = utils.isDialog;
    if(!w.AL.detach) w.AL.detach = function(){
        if(w.opener){
            w.opener.open(w.location);
            w.close();
        }
    }
    w.AL.detachWrapper = function(){
        w.AL.detaching = true;
        w.AL.detach();
    }
    if(isInDialog){
        console.debug('is in dialog');
        w.isALDialog = true; //gof's Set mark of dialog to be able use it in comparisons later along with self==top
        if(!w.isDialogCloseable){
            //console.debug('self.isDialogCloseable is false. Overriding self.close()');
            w.isDialogCloseable = true;
            var script = w.document.createElement('script');
            script.textContent = "function close(){function getTopWindow(checkWindow){if(!checkWindow) checkWindow = window.self;try {if(checkWindow.parent && !checkWindow.parent.noDialog){return getTopWindow(checkWindow.parent);}}catch(e){}return checkWindow;};console.debug('self.AL', self.AL);if(!self.AL.detaching && self.opener && self.opener.onOpeneeClosed){console.debug('calling onOpeneeClosed');self.opener.onOpeneeClosed();}else{console.debug('invalid for onOpeneeClosed', self.opener);};getTopWindow().postMessage({dialog:null},'*');}";
            w.document.head.appendChild(script);
        }
    } else {
        console.debug('detached window');
        if(hasOpener){
            if(w.opener.monitorOpenee) w.opener.monitorOpenee(self);
            w.AL.detached = true;
            w._original_close = window.close;
            var script = w.document.createElement('script');
            script.textContent = "function close(){if(!self.AL.detaching && self.opener && self.opener.onOpeneeClosed) self.opener.onOpeneeClosed();self._original_close();}";
            w.document.head.appendChild(script);
        } else {
            console.warn('The page has no opener', w.location);
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
                    //console.debug('registering listener for deferred onload:', funcName);
                    //FF IE Edge Safari
                    function openersetListener(){
                        w.removeEventListener('openerset', openersetListener);
                        w.removeEventListener('openerset', openersetListener2);
                        //console.debug('opener is set [Firefox/IE/Edge/Safari], call body.onload=', funcName);
                        utils.runHandler(w, loadHandler, isSendUpdate);
                    }
                    w[funcName] = function(){
                        //console.debug(funcName, 'for Firefox/IE/Edge/Safari');
                        w.removeEventListener('openerset', openersetListener2);
                        w.addEventListener('openerset', openersetListener);
                    };
                    //Chrome
                    function openersetListener2(){
                        //console.debug('opener is set [Chrome], waiting for calling body.onload =', funcName);
                        w.removeEventListener('openerset', openersetListener);
                        w.removeEventListener('openerset', openersetListener2);
                        w[funcName] = function(){
                            //console.debug(funcName, 'for Chrome');
                            utils.runHandler(w, loadHandler, isSendUpdate);
                        };
                    }
                    w.addEventListener('openerset', openersetListener2);
                })(funcName, loadHandler, sendUpdate);
            } else {
                w[funcName] = function(){
                    loadHandler.apply(w);
                    var isDetachable = w.AL && w.AL.detachable ? true : false;
                    //console.debug('onload is direct:', funcName, 'detachable', isDetachable);
                    utils.getTopWindow().postMessage({
                        dialog: {
                            loaded: true,
                            detachable: isDetachable
                        }
                    }, '*');
                };
            }
        } else {
            w[funcName] = function(){
                //console.debug('closer.js is not in a dialog');
                w.AL.detached = true;
                loadHandler.apply(w);
            };
        }
    }
    if(isInDialog && !hasOpener){
        (function(w){
            w.addEventListener('message', function(){
                //console.debug('Opener is set, proceed to onload functions');
                w.dispatchEvent(utils.createEvent('openerset'));
            });
        })(w);
        utils.requestDialogUpdate();
    }
  })(window.self, [onPageLoad]);