(function() {
    function domReady(callbackFunction){
        if(document.readyState != 'loading')
          callbackFunction(event)
        else
          document.addEventListener("DOMContentLoaded", callbackFunction);
    }
    var utils = {
        createEvent: function(eventName) {
            if(typeof(Event) === 'function') {
                return new Event(eventName);
            } else {
                var ieEvent = document.createEvent('Event');
                ieEvent.initEvent(eventName, false, true);
                return ieEvent
            }
        },
        /**
         * Overriding window.close() in the document &ndash;
         * window.close() can be overriden in IE by function declaration only
         * @param {document} doc 
         */
        overrideCloseFunction: function(doc){
            /** window.close() can be overriden in IE by function declaration only */
            var script = doc.createElement('script');
            script.textContent = "function close(){console.debug('close() is defined by topdialog');function getTopWindow(checkWindow){if(!checkWindow) checkWindow = window.self;try {if(checkWindow.parent && !checkWindow.parent.noDialog){return getTopWindow(checkWindow.parent);}}catch(e){}return checkWindow;};getTopWindow().postMessage({dialog:null},'*')}";
            doc.head.appendChild(script);
        },
        /**
         *  gets default value of an iframe without height
         */
        getZeroHeight: function() {
            return "180px";
        },
        getContextOpener: function(evt) {
            if(!evt) throw new Error('dialog event is undefined');
            if(!evt.data || !evt.data.dialog) throw new Error('dialog is undefined in event data');
            if(evt.data.dialog.contextWindow && evt.source.topdialog && evt.source.topdialog.support){
                return evt.source.topdialog.support[evt.data.dialog.contextWindow].call();
            } else {
                return evt.source;
            }
        }
    };
    var dialogInitialized = false;
    var tabs = [];
    function _init() {
        if(dialogInitialized===true) return;
        console.info('dialog initialized');
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
        /**
         * 
         * @param {{
         *  url: string,
         *  name: string,
         *  windowName: string,
         *  title: string,
         *  size: { width: string, height:string }
         * }} dialogObj 
         * @param { window } dialogOpenerWindow
         * @param { HTMLIFrameElement } targetIframe with the content of the dialog and appended to the dialog
         */
        function _createDialog(dialogObj, dialogOpenerWindow, targetIframe){
            document.body.style.overflow = 'hidden';
            var iframe = targetIframe || document.createElement('iframe');         
            iframe.dataset.dialogId = ++iframeCounter;
            iframe.setAttribute('data-shortcut-stop-propagation', '');
            if(dialogObj.name) iframe.dataset.watirName = dialogObj.name;
            if(dialogObj.title) iframe.dataset.title = dialogObj.title;
            if(dialogObj.size){
                _setDialogSize(dialogObj.size.width, dialogObj.size.height, iframe);
            } else {
                _setDialogSize(null, null, iframe);
            }
            if(tabs.length>0){
                for( var k = 0; k < tabs.length; k++ ){
                    var tifr = tabs[k].iframe;
                    tifr.dispatchEvent(utils.createEvent('dialog-blur'));
                    tifr.classList.add('minimized');
                }
            } else {                
                dialog.showModal();
            }
            dialogPolyfill.reposition(dialog);
            if(iframe.dataset.pages){
                if(iframe.dataset.title) iframe.removeAttribute('data-title');
            } else {
                tabs[tabs.length] = {iframe:iframe,opener:dialogOpenerWindow};
            }
            if(targetIframe){
                iframe.classList.remove('minimized');
            } else {
                tabWindow.appendChild(iframe);
            }
            try {
                iframe.contentWindow.opener = dialogOpenerWindow;
            } catch(e) {}
            if(dialogObj.windowName){
                try{
                    iframe.contentWindow.name = dialogObj.windowName;
                }catch(e){}
                iframe.name = dialogObj.windowName;
            }
            if(dialogObj.html){
                iframe.contentDocument.open();
                iframe.contentDocument.write(dialogObj.html);
                iframe.contentDocument.close();
                loadListener(iframe, dialogOpenerWindow, tabs.length);
            } else if (dialogObj.downloader) {
                loadListener(iframe, dialogOpenerWindow, tabs.length);
            } else {
                (function(index){
                    iframe.onload = function(){loadListener(iframe, dialogOpenerWindow, index);}
                })(tabs.length);
                if(dialogObj.url) iframe.src = dialogObj.url;
            }
            _redrawBreadcrumbs(iframe.dataset.dialogId);
        }
        function _setDialogSize(width, height, iframe){
            function fixSize(sizeName, size, theIframe, theDialog){
                if(size){
                    var mySize;
                    if(isNaN(size)){
                        /* e.g. 20px or 15% */
                        var sizeRegex = /^(\d+)(px|%|em|rem|vw|vh)?/gi
                        var match = sizeRegex.exec(size);
                        if(match && match.length>0){
                            var sizeValue = match[1];
                            var sizeUnit = match[2];
                            if(parseInt(sizeValue,10) > 0){
                                mySize = sizeValue + (!sizeUnit ? '' : sizeUnit.toLowerCase());
                            }
                        }
                    } else {
                        if(size>0){
                            mySize = size+'px';
                        }
                    }
                    if(mySize){
                        theIframe.dataset['d'+sizeName] = mySize;
                        theDialog.style[sizeName] = mySize;
                        return;
                    }
                }
                theIframe.removeAttribute('data-d'+sizeName);
                theDialog.style[sizeName] = null;
            }
            fixSize('width', width, iframe, dialog);
            fixSize('height', height, iframe, dialog);
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
            while(tabWindow.lastChild){
                var lastIframe = tabWindow.lastChild;
                var doStop = lastIframe === iframeAndTabIndex.iframe;
                //lastIframe.classList.add('minimized');
                lastIframe.dispatchEvent(utils.createEvent('dialog-destroyed'));
                tabWindow.removeChild(lastIframe);
                if(doStop){
                    var ifrOpenerData = tabs[iframeAndTabIndex.tabIndex];
                    var ifrOpener = ifrOpenerData.opener;
                    if(ifrOpener && ifrOpener.topdialog && ifrOpener.topdialog.support &&
                        ifrOpener.topdialog.support.restoreFocusAfterDialogClosed){
                        ifrOpener.topdialog.support.restoreFocusAfterDialogClosed.apply(ifrOpener);
                    }
                    break;
                };
            }
            tabs.splice(iframeAndTabIndex.tabIndex);
            if(tabs.length>0){
                var ifr = tabs[tabs.length-1].iframe;
                if(ifr.dataset.dwidth) dialog.style.width=ifr.dataset.dwidth;
                else dialog.style.width=null;
                if(ifr.dataset.dheight) dialog.style.height=ifr.dataset.dheight;
                else dialog.style.height=null;         
                ifr.classList.remove('minimized');
                dialogPolyfill.reposition(dialog);
                _redrawBreadcrumbs(ifr.dataset.dialogId);
                ifr.dispatchEvent(utils.createEvent('dialog-focus'));
            } else {
                var nav = dialog.querySelector('nav');
                while (nav.lastChild) {
                    nav.removeChild(nav.lastChild);
                }
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
                if(evt.data.dialog && (evt.data.dialog.url || evt.data.dialog.html)){
                    _createDialog(evt.data.dialog, utils.getContextOpener(evt));
                    evt.source.postMessage({dialogResult:'urlOrHtml'}, '*');
                } else if (evt.data.dialog && evt.data.dialog.close) {
                    _closeTabByDialogId(evt.data.dialog.close);
                } else if (evt.data.dialog && evt.data.dialog.update) {
                    var iframeAndTabIndex = _findEventSourceIframe(evt.source);
                    if(!iframeAndTabIndex) throw new Error('IframeAndTabIndex not found for', evt.source);
                    var updateTabId = iframeAndTabIndex.tabIndex;
                    for( var i=0; i<tabs.length; i++ ){
                        if(updateTabId == i){
                            var iIfr = tabs[i].iframe;
                            var iIfrWin = iIfr.contentWindow || iIfr;
                            iIfrWin.opener = tabs[i].opener;
                            var title = iIfr.contentWindow ? iIfr.contentDocument.title : iIfr.document.title;
                            iIfr.dataset.title = title;
                            _redrawBreadcrumbs();
                            iIfrWin.postMessage({dialogResult:'updated'}, '*');
                        }
                    }
                } else if (evt.data.dialog && evt.data.dialog.loaded){
                    //notifies that dialog's content is fully loaded
                    var iframeAndTabIndex = _findEventSourceIframe(evt.source);
                    if(iframeAndTabIndex){
                        var activeTabId = iframeAndTabIndex.tabIndex;
                        for( var i=0; i<tabs.length; i++ ){
                            if(activeTabId == i){
                                var ifr = tabs[i].iframe;
                                if(ifr) {
                                    var loadedCounter = parseInt(ifr.dataset.loaded, 10);
                                    loadedCounter = isNaN(loadedCounter) ? 1 : loadedCounter + 1;
                                    ifr.dataset.loaded = loadedCounter;
                                    var title = ifr.contentWindow ? ifr.contentDocument.title : ifr.document.title;
                                    title = title && title.length>0 ? title : 'No title ' + i;
                                    ifr.dataset.title = title;
                                    _redrawBreadcrumbs();
                                }
                                if(tabs[i].opener){
                                    tabs[i].opener.dispatchEvent(utils.createEvent('dialog-loaded'));
                                }
                                break;
                            }
                        }
                    }
                } else if (evt.data.dialog && evt.data.dialog.title){
                    /* update title */
                    var iframeAndTabIndex = _findEventSourceIframe(evt.source);
                    var ifr = iframeAndTabIndex.iframe;
                    ifr.dataset.title = evt.data.dialog.title;
                    _redrawBreadcrumbs();
                } else if (evt.data.dialog && evt.data.dialog.windowName) {
                    /* post message evt.source is de-facto opener */
                    _createDialog(evt.data.dialog, evt.source);
                    evt.source.postMessage({dialogResult:'namedWindow'}, '*');
                } else {
                    var iframeAndTabIndex = _findEventSourceIframe(evt.source);
                    debugger;
                    if(iframeAndTabIndex) {
                        _removeIframe(iframeAndTabIndex);
                    }
                }
            } else if(evt.data && evt.data.hasOwnProperty('downloader')){
                var mime = evt.data.downloader.mime;
                function isMimeSupported (type) {
                    if(!type) return false;
                    return Array.prototype.reduce.call(navigator.plugins, function (supported, plugin) {
                        return supported || Array.prototype.reduce.call(plugin, function (supported, mime) {
                            console.debug('browser plugin mime:', mime.type);
                            return supported || mime.type == type;
                        }, supported);
                    }, false);
                }
                var dialogObj = evt.data.downloader;
                dialogObj.downloader = true;
                if(isMimeSupported(mime)){
                    /* Chrome */
                    console.info('MIME', mime, 'supported!');
                    _createDialog(dialogObj, evt.source);
                } else {
                    var url = dialogObj.url;
                    delete dialogObj.url;
                    var difr = document.createElement('iframe');
                    difr.src=url;
                    difr.setAttribute('id', 'testdifr');
                    var ie = (function(){
                        var undef,rv = -1; /* Return value assumes failure.*/
                        var ua = window.navigator.userAgent;
                        var msie = ua.indexOf('MSIE ');
                        var trident = ua.indexOf('Trident/');
                        if (msie > 0) {
                            /* IE 10 or older => return version number */
                            rv = parseInt(ua.substring(msie + 5, ua.indexOf('.', msie)), 10);
                        } else if (trident > 0) {
                            /* IE 11 (or newer) => return version number */
                            var rvNum = ua.indexOf('rv:');
                            rv = parseInt(ua.substring(rvNum + 3, ua.indexOf('.', rvNum)), 10);
                        }
                        return ((rv > -1) ? rv : undef);
                    }());
                    var isDialogAlreadyOpened = false;
                    if(ie){
                        if(tabs.length==0){
                            dialog.classList.add('minimized');
                            tabWindow.appendChild(difr);
                        } else {
                            isDialogAlreadyOpened = true;
                            difr.width=0;
                            difr.height=0;
                            tabWindow.appendChild(difr);
                        }
                        _createDialog(dialogObj, evt.source, difr);
                    } else {
                        difr.classList.add('minimized');
                    }
                    if(ie){
                        /* IE11 */
                        console.info('browser: IE', ie);
                        difr.contentWindow.addEventListener('DOMContentLoaded', (function(dialogConfig, evtSource, ifr, doc) {
                            console.debug('window - DOMContentLoaded - capture'); // 1st
                            function checkPDF(remains){
                                console.debug('waitForActiveElement :', remains);
                                try {
                                    console.debug('activeElement', doc.activeElement);
                                    var activeElementTagname = doc.activeElement.tagName.toLocaleLowerCase();
                                    if (activeElementTagname === 'object') {
                                        if(!isDialogAlreadyOpened){
                                            dialog.classList.remove('minimized');              
                                            _createDialog(dialogConfig, evtSource, ifr);
                                        }                                        
                                    } else if(activeElementTagname === 'body'){
                                        /* body: HTML or download */
                                        if(doc.activeElement.childNodes.length>0){
                                            /* HTML */
                                            if(!isDialogAlreadyOpened){
                                                dialog.classList.remove("minimized");
                                                dialogPolyfill.reposition(dialog);
                                            }
                                            //_createDialog(dialogConfig, evtSource, ifr);
                                        } else {
                                            /* download */
                                            _closeTabByDialogId(ifr.dataset.dialogId);
                                            if(!isDialogAlreadyOpened){
                                                dialog.classList.remove("minimized");
                                                console.debug('Dialog before removing downaload iframe', dialog);
                                                //tabWindow.removeChild(ifr);
                                            }
                                        }
                                    } else {
                                        console.warn('unknown active element', activeElementTagname);
                                    }
                                } catch (e) {
                                    if(remains > 0){
                                        setTimeout(checkPDF, 1000, remains-1);
                                    } else {
                                        console.error(e);
                                    }
                                }
                            }
                            setTimeout(checkPDF, 500, 30);
                        })(dialogObj, evt.source, difr, difr.contentDocument ), true);
                    } else {
                        console.info('browser: NOT IE');
                        function downloadListener (){
                            try {
                                var difrProtocol = difr.contentWindow.location.protocol;
                                if(difr.src.substr(0, difrProtocol.length) === difrProtocol){
                                    console.info('browser is Chrome or Edge')
                                    _createDialog(dialogObj, evt.source, difr);
                                } else {
                                    /* downloading */
                                    console.info('downloading file in Firefox...');
                                    tabWindow.removeChild(difr);
                                }
                            } catch (e) {
                                console.info('Browser is Firefox');
                                difr.removeEventListener('load', downloadListener);
                                _createDialog(dialogObj, evt.source, difr);
                            }
                        }
                        difr.addEventListener('load', downloadListener);
                        tabWindow.appendChild(difr);
                    }
                }
            }
        }
        function _redrawBreadcrumbs(activeDialogId){
            var nav = dialog.querySelector('nav');
            var frag = document.createDocumentFragment();
            if(!activeDialogId) {
                activeDialogId = tabs[tabs.length-1].iframe.dataset.dialogId;
            }
            for( var i=0; i<tabs.length; i++ ){
                var crumb = document.createElement('div');
                crumb.classList.add('crumb');
                var ifr = tabs[i].iframe;
                if(activeDialogId != ifr.dataset.dialogId){
                    var title = ifr.dataset.title?ifr.dataset.title:'No title '+i+1;
                    var textNode = document.createTextNode(title);
                    crumb.classList.add('SIModalTitlePrev');
                    crumb.appendChild( textNode );
                    if(i<tabs.length-1 ){
                        var delIndex = i+1;
                        crumb.addEventListener('click', (function(deleteIframe, deleteTabIndex){
                            return function(){ _removeIframe({ iframe: deleteIframe, tabIndex: deleteTabIndex }); };
                        })(tabs[delIndex].iframe, delIndex));
                        crumb.setAttribute('title', title);
                    }
                } else {
                    var xButton = document.createElement('div');
                    xButton.classList.add('xbutton');
                    xButton.classList.add('SIModalXButton');
                    xButton.addEventListener('click', (function(dialogId){
                        return function(){ postMessage({ dialog:{ close: ifr.dataset.dialogId } }, '*'); };
                    })(ifr.dataset.dialogId));
                    crumb.appendChild(xButton);
                    crumb.classList.add('active');
                    crumb.classList.add('SIModalTitleActive');
                    if(!ifr.dataset.loaded && !ifr.dataset.title){
                        /** add spinner to show loading process */                    
                        var spinner = document.createElement('div');
                        spinner.classList.add('lds-ellipsis');
                        for(var u=0; u<4; u++){
                            spinner.appendChild(document.createElement('div'));
                        }
                        crumb.appendChild(spinner);
                    } else if(!ifr.dataset.title) {
                        console.warn('Set title in the page at', ifr.src);
                    }
                    var textNode = document.createTextNode(ifr.dataset.title?ifr.dataset.title:'');
                    crumb.appendChild( textNode );
                    ifr.classList.remove('minimized');
                }                    
                frag.appendChild(crumb);
            }
            while (nav.lastChild) { nav.removeChild(nav.lastChild); }
            nav.appendChild(frag);
        }
        function loadListener(ifr, ifrOpener, index){
            var pagesCounter = parseInt(ifr.dataset.pages, 10);
            pagesCounter = isNaN(pagesCounter) ? 1 : pagesCounter + 1;
            ifr.dataset.pages = pagesCounter;
            try{
                var oldTitle = ifr.dataset.title;
                if(!oldTitle || pagesCounter>1){
                    var iWin = ifr.contentWindow || ifr;
                    var doc = ifr.contentWindow ? ifr.contentDocument : ifr.document;
                    if(doc && doc.title) {
                        ifr.dataset.title=doc.title;
                    } else if(!oldTitle){
                        ifr.dataset.title = 'No title # ' + index;
                    }
                    _redrawBreadcrumbs();
                }
                var iWin = ifr.contentWindow || ifr;
                if(!!iWin.isDialogCloseable){
                    console.debug('ifr.onload is not applied because of isDialogCloseable==true');
                    return;
                }
                console.debug('ifr.onload is applied!');
                iWin.opener = ifrOpener;
                var doc = ifr.contentWindow ? ifr.contentDocument : ifr.document;
                utils.overrideCloseFunction(doc);
                iWin.isDialogCloseable = true;
            } catch(error){
                console.warn('onload error', error);
                if(!ifr.dataset.title) ifr.dataset.title = 'No title ##'+ index;
                _redrawBreadcrumbs();
            }
        }
        function getDefaultTopDialog(){
            var dialog = document.createElement("dialog");
            dialog.setAttribute("role", "topdialog");
            var tabbedDiv = document.createElement("div");
            tabbedDiv.classList.add("tabbed");
            var nav = document.createElement("nav");
            nav.classList.add('SIModalTitle');
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
    self.dialogInitialized = true;
    self.dispatchEvent(utils.createEvent('dialog-initialized'));
})();