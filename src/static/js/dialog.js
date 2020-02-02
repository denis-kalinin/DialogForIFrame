(function(w) {
    function domReady(callbackFunction){
        if(document.readyState != 'loading')
          callbackFunction(event)
        else
          document.addEventListener("DOMContentLoaded", callbackFunction)
      }
    var dialogInitialized = false;
    var tabs = [];
    function _init() { 
        //document.removeEventListener( "DOMContentLoaded", arguments.callee, false );
        if(dialogInitialized===true) return;
        dialogInitialized = true;
        var dialog = document.body.querySelector('dialog[role=topdialog]');
        var tabWindow = dialog.querySelector('.tabwindow');
        var iframeCounter = 0;
        /* rememeber body overflow to restore it after dialog is closed */
        var bodyOverflow = document.body.style.overflow;
        dialog.addEventListener('close', function(){
                document.body.style.overflow = bodyOverflow;
                while(tabs.length > 0){
                    tabWindow.removeChild(tabs.pop());
                }
            });

        w.dialogPolyfill.registerDialog(dialog);
        function _createDialog(iframeUrl){
            document.body.style.overflow = 'hidden';
            var iframe = document.createElement('iframe');
            iframe.src = iframeUrl;
            iframe.dataset.counter = ++iframeCounter;
            if(tabs.length>0) for( var k = 0; k < tabs.length; k++){
                tabs[k].style.display='none';
            } else {
                dialog.showModal();
            }
            tabs[tabs.length] = iframe;
            tabWindow.appendChild(iframe);
            _redrawBreadcrumbs(iframeCounter);
        }
        function _closeTab(countnum){
            for(var i=0; i<tabs.length; i++){
                if(tabs[i].dataset.counter == countnum){
                    tabWindow.removeChild(tabs[i]);
                    tabs.splice(i, 1);
                    if(tabs.length>0){
                        var ifr = tabs[tabs.length-1];
                        ifr.style.display='block';
                        _redrawBreadcrumbs(ifr.dataset.counter);
                    } else {
                        dialog.close();
                    }
                    return;
                }
            }
        }
        function _messageListerner(evt){
            if(evt.data && evt.data.hasOwnProperty('dialog')){
                if(evt.data.dialog && evt.data.dialog.url){
                    _createDialog(evt.data.dialog.url);
                } else if( evt.data.dialog && evt.data.dialog.close) {
                    _closeTab(evt.data.dialog.close);
                } else {
                    var allIrames = tabWindow.querySelectorAll('iframe');
                    for(var u=0; u<allIrames.length; u++){
                        var ifr = allIrames[u];
                        if(ifr.style.display!='none'){
                            _closeTab(ifr.dataset.counter);
                        }
                    }
                }
            }
        }
        function _redrawBreadcrumbs(){
            var nav = dialog.querySelector('nav');
            var frag = document.createDocumentFragment();
            var breadCrumbs = document.createElement('div');
            for( var i=0; i<tabs.length; i++ ){
                var crumb = document.createElement('span');
                var ifr = tabs[i];
                if(counter == ifr.dataset.counter){
                    // TODO do not apend arrow
                } else {
                    // TODO: append arrow
                }
                var xButton = document.createElement('div');
                xButton.classList.add('xbutton');
                xButton.addEventListener('click', function(evt){
                    postMessage({ dialog:{ close: ifr.dataset.counter } }, '*');
                });
                breadCrumbs.appendChild(xButton);
                if(!ifr.dataset.title){
                    crumb.appendChild(document.createTextNode('... loading ...'));
                } else {
                    crumb.appendChild(ifr.dataset.title);
                }
                breadCrumbs.appendChild(crumb);
            }
            while (nav.lastChild) { nav.removeChild(nav.lastChild); }
            frag.appendChild(breadCrumbs);
            nav.appendChild(frag);
        }
        function _redrawTabs(counter){
            var nav = dialog.querySelector('nav');
            var frag = document.createDocumentFragment();
            for( var i=0; i<tabs.length; i++ ){
                var tab = document.createElement('div');
                tab.classList.add('tab');
                var ifr = tabs[i];
                if(counter == ifr.dataset.counter){
                    tab.classList.add('active');
                }
                var xButton = document.createElement('div');
                xButton.classList.add('xbutton');
                xButton.addEventListener('click', function(evt){
                    postMessage({dialog:{close: ifr.dataset.counter}}, '*');
                });
                tab.appendChild(xButton);
                if(!ifr.dataset.title){
                    /* get title for the tab */
                    ifr.onload = function(){
                        try{
                            var doc = ifr.contentDocument? ifr.contentDocument: ifr.contentWindow.document;
                            if(doc && doc.title){
                                ifr.dataset.title=doc.title;
                            } else {
                                ifr.dataset.title=ifr.src;
                            }
                            tab.appendChild(document.createTextNode(ifr.dataset.title));
                        } catch(error){
                            ifr.dataset.title = ifr.src;
                            tab.appendChild(document.createTextNode(ifr.dataset.title));
                        }
                    }
                } else {
                    tab.appendChild(document.createTextNode(ifr.dataset.title));
                }
                frag.appendChild(tab);
            }
            while (nav.lastChild) { nav.removeChild(nav.lastChild); }
            nav.appendChild(frag);
        }
        w.addEventListener('message', _messageListerner, false);
    };
    domReady(_init);
})( window.self );
