(function() {
    function domReady(callbackFunction){
        if(document.readyState != 'loading')
          callbackFunction(event)
        else
          document.addEventListener("DOMContentLoaded", callbackFunction)
      }
    var dialogInitialized = false;
    var tabs = [];
    function _init() {
        if(dialogInitialized===true) return;
        dialogInitialized = true;
        var dialog = document.body.querySelector('dialog[role=topdialog]');
        if(!dialog) dialog = getDefaultTopDialog();
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

        window.dialogPolyfill.registerDialog(dialog);

        function _createDialog(iframeUrl, dialogOpenerWindow, title){
            document.body.style.overflow = 'hidden';
            var iframe = document.createElement('iframe');
            iframe.src = iframeUrl;
            iframe.dataset.dialogId = ++iframeCounter;
            if(title) iframe.dataset.title = title;
            if(tabs.length>0) for( var k = 0; k < tabs.length; k++ ){
                tabs[k].iframe.style.display='none';
            } else {
                dialog.showModal();
            }
            tabs[tabs.length] = {iframe:iframe,opener:dialogOpenerWindow};
            tabWindow.appendChild(iframe);
            _redrawTabs(iframe.dataset.dialogId);
        }
        function _findEventSourceIframe( sourceWindow ){
            for(var i=0; i<tabs.length; i++) {
                var f = tabs[i].iframe;
                if (f.contentWindow==sourceWindow){
                    return {iframe:f, tabIndex:i};
                }
            }
        }
        function _removeIframe(iframeAndTabIndex) {
            tabWindow.removeChild(iframeAndTabIndex.iframe);
            tabs.splice(iframeAndTabIndex.tabIndex, 1);
            if(tabs.length>0){
                var ifr = tabs[tabs.length-1].iframe;
                ifr.style.display='block';
                _redrawTabs(ifr.dataset.dialogId);
            } else {
                dialog.close();
            }
        }
        function _closeTabByDialogId(dialogId){
            for (var i=0; i<tabs.length; i++){
                if(tabs[i].iframe.dataset.dialogId == dialogId){
                    _removeIframe({iframe:tabs[i].iframe, tabIndex:i});
                    return;
                }
            }
        }
        function _messageListerner(evt){
            if(evt.data && evt.data.hasOwnProperty('dialog')){
                if(evt.data.dialog && evt.data.dialog.url){
                    _createDialog(evt.data.dialog.url, evt.source, evt.data.dialog.title);
                } else if (evt.data.dialog && evt.data.dialog.close) {
                    _closeTabByDialogId(evt.data.dialog.close);
                }else {
                    var iframeAndTabIndex = _findEventSourceIframe(evt.source);
                    if(iframeAndTabIndex) {
                        _removeIframe(iframeAndTabIndex);
                    }
                }
            }
        }
        function _redrawTabs(activeDialogId){
            var nav = dialog.querySelector('nav');
            var frag = document.createDocumentFragment();
            for( var i=0; i<tabs.length; i++ ){
                var tab = document.createElement('div');
                tab.classList.add('tab');
                var ifr = tabs[i].iframe;
                //if(i===tabs.length-1){
                    var xButton = document.createElement('div');
                    xButton.classList.add('xbutton');
                    xButton.addEventListener('click', function(evt){
                        window.top.postMessage({dialog:{close: ifr.dataset.dialogId}}, '*');
                    });
                //}
                tab.appendChild(xButton);
                if(activeDialogId != ifr.dataset.dialogId){
                    var textNode = document.createTextNode(ifr.dataset.title?ifr.dataset.title:ifr.src);
                    tab.appendChild( textNode );
                } else {
                  tab.classList.add('active');
                  if(!ifr.dataset.loaded){ /** add spinner to show loading process */                    
                    var spinner = document.createElement('div');
                    spinner.classList.add('lds-ellipsis');
                    for(var u=0; u<4; u++){
                        spinner.appendChild(document.createElement('div'));
                    }
                    tab.appendChild(spinner);
                  }
                  var textNode = document.createTextNode(ifr.dataset.title?ifr.dataset.title:ifr.src);
                  tab.appendChild( textNode );
                  if(ifr.onload==null){
                    var ifrOpener = tabs[i].opener;
                    var iWin = ifr.contentWindow;
                    ifr.onload = function(){
                      try{
                          ifr.dataset.loaded = true;
                          var spinner = tab.querySelector('.lds-ellipsis');
                          if(spinner){
                              spinner.parentElement.removeChild(spinner);
                          }
                          var doc = ifr.contentDocument? ifr.contentDocument : iWin.document;
                          /** window.close() can be overriden in IE by function declaration only */
                          var script = doc.createElement('script');
                          script.textContent = "function close(){window.top.postMessage({dialog:null},'*')}";
                          doc.head.appendChild(script);
                          iWin.opener = ifrOpener;
                          iWin.postMessage({dialog:{opener:true}}, '*');
                          if(!ifr.dataset.title){
                            if(doc && doc.title){
                                ifr.dataset.title=doc.title;
                            } else {
                                ifr.dataset.title=ifr.src;
                            }
                          }
                      } catch(error){
                          if(!ifr.dataset.title) ifr.dataset.title = ifr.src;
                      }
                      textNode.nodeValue = ifr.dataset.title;
                    }
                  }
                }
                frag.appendChild(tab);
            }
            while (nav.lastChild) { nav.removeChild(nav.lastChild); }
            nav.appendChild(frag);
        }
        function getDefaultTopDialog(){
            var dialog = document.createElement("dialog");
            dialog.setAttribute("role", "topdialog");
            var tabbedDiv = document.createElement("div");
            tabbedDiv.classList.add("tabbed");
            var nav = document.createElement("nav");
            var tabWindow = document.createElement("div");
            tabWindow.classList.add("tabwindow");            
            tabbedDiv.appendChild(nav);
            tabbedDiv.appendChild(tabWindow);
            dialog.appendChild(tabbedDiv);
            document.body.appendChild(dialog);
            return dialog;
        }
        window.addEventListener('message', _messageListerner, false);
    };
    domReady(_init);
})();