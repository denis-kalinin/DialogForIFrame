import dialogPolyfill from 'dialog-polyfill';
export class TopDialog {
    /**
    * DialogForIframe is not esm enabled, because we need
    * to support IE11
    */
    /**
     * A Dialog (native or polyfill) to show iframe
     * @constructs DialogForIFrame
     */
    constructor(){

        const _domReady = (callbackFunction) => {
            if(document.readyState != 'loading')
                callbackFunction(event)
            else
                document.addEventListener("DOMContentLoaded", callbackFunction)
        }

        let dialogInitialized = false;
        const tabs = [];
        const w = window;
        let iframeCounter = 0;
        let dialog, tabWindow, bodyOverflow;

        const _redrawTabs = (counter) =>  {
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

        const _closeTab = (countnum) => {
            for(var i=0; i<tabs.length; i++){
                if(tabs[i].dataset.counter == countnum){
                    tabWindow.removeChild(tabs[i]);
                    tabs.splice(i, 1);
                    if(tabs.length>0){
                        var ifr = tabs[tabs.length-1];
                        ifr.style.display='block';
                        _redrawTabs(ifr.dataset.counter);
                    } else {
                        dialog.close();
                    }
                    return;
                }
            }
        }

        const _createDialog = (iframeUrl) => {
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
            _redrawTabs(iframeCounter);
        }

        const _messageListerner = (evt) => {
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

        const _init = () => {
            if(dialogInitialized===true) return;
            dialogInitialized = true;
            dialog = document.body.querySelector('dialog[role=topdialog]');
            tabWindow = dialog.querySelector('.tabwindow');
            /* rememeber body overflow to restore it after dialog is closed */
            bodyOverflow = document.body.style.overflow;
            dialog.addEventListener('close', function(){
                    document.body.style.overflow = bodyOverflow;
                    while(tabs.length > 0){
                        tabWindow.removeChild(tabs.pop());
                    }
                });
    
            dialogPolyfill.registerDialog(dialog);
            w.addEventListener('message', _messageListerner, false);
        }
        _domReady(_init);
    }
}
