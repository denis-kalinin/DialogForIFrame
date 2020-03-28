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
        /**
         * 
         * @param {{
         *  url: string,
         *  name: string,
         *  windowName: string,
         *  ignoreOnLoad: boolean,
         *  title: string,
         *  size: { width: string, height:s tring }
         * }} dialogObj 
         * @param { window } dialogOpenerWindow
         * @param { HTMLIFrameElement } targetIframe with the content of the dialog and appended to the dialog
         */
        function _createDialog(dialogObj, dialogOpenerWindow, targetIframe){
            document.body.style.overflow = 'hidden';
            var iframe = targetIframe || document.createElement('iframe');           
            iframe.dataset.dialogId = ++iframeCounter;
            iframe.dataset.shortcutStopPropagation = '';
            if(dialogObj.name) iframe.dataset.watirName = dialogObj.name;
            if(dialogObj.title) iframe.dataset.title = dialogObj.title;
            if(dialogObj.size){
                _setDialogSize(dialogObj.size.width, dialogObj.size.height, iframe);
            } else {
                _setDialogSize(null, null, iframe);
            }
            if(tabs.length>0){ 
                for( var k = 0; k < tabs.length; k++ ){
                    tabs[k].iframe.style.display='none';
                }
            } else {                
                dialog.showModal();
            }
            dialogPolyfill.reposition(dialog);
            tabs[tabs.length] = {iframe:iframe,opener:dialogOpenerWindow};
            if(!targetIframe) {
                tabWindow.appendChild(iframe);
            } else {
                iframe.style.display='block';
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
            // iframe.opener = dialogOpenerWindow;
            // var ignoreOnLoad = dialogObj.ignoreOnLoad || true;
            if(dialogObj.url){
                iframe.src = dialogObj.url;
                //ignoreOnLoad = false;
            }
            _redrawBreadcrumbs(iframe.dataset.dialogId, !!dialogObj.ignoreOnLoad);
        }
        function _setDialogSize(width, height, iframe){
            var w = width ? ( isNaN(width) ? width : width+"px" ) : null;
            iframe.dataset.dwidth=w;
            dialog.style.width=w;
            //if height 0 - set height = header + iframe heights
            if(!height){
                dialog.style.height = null;
                iframe.dataset.dheight=null;
                return;            
            }
            if(isNaN(height)){//e.g. 20px or 15%
                var zeroH = height.replace( /\D+/g, '');
                if(isNaN(zeroH)){// wrong height - without digits at all
                    dialog.style.height = null;
                    iframe.dataset.dheight=null;
                    return;
                }
                if(parseInt(zeroH, 10) > 0 ){
                    dialog.style.height = height;
                    iframe.dataset.dheight = height;
                    return;
                }
                var h = _getZeroHeight();
                dialog.style.height = h;
                iframe.dataset.dheight = h;
                return;
            }
            if(parseInt(height, 10) > 0){
                var h = height+"px";
                dialog.style.height = h;
                iframe.dataset.dheight = h;
                return;
            }
            var h = _getZeroHeight();
            dialog.style.height = h;
            iframe.dataset.dheight = h;
        }
        function _getZeroHeight(){
            // default value of an iframe without height
            return "180px";
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
                if(tabWindow.lastChild === iframeAndTabIndex.iframe){
                    tabWindow.removeChild(tabWindow.lastChild);
                    break;
                } else {
                    tabWindow.removeChild(tabWindow.lastChild);
                }
            }
            // tabWindow.removeChild(iframeAndTabIndex.iframe);
            tabs.splice(iframeAndTabIndex.tabIndex);
            if(tabs.length>0){
                var ifr = tabs[tabs.length-1].iframe;
                ifr.style.display='block';
                dialog.style.width=ifr.dataset.dwidth;
                dialog.style.height=ifr.dataset.dheight;
                dialogPolyfill.reposition(dialog);
                _redrawBreadcrumbs(ifr.dataset.dialogId, true);
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
                    _createDialog(evt.data.dialog, evt.source);
                } else if (evt.data.dialog && evt.data.dialog.close) {
                    _closeTabByDialogId(evt.data.dialog.close);
                } else if (evt.data.dialog && evt.data.dialog.update) {
                    var iframeAndTabIndex = _findEventSourceIframe(evt.source);
                    if(!iframeAndTabIndex) throw new Error('IframeAndTabIndex not found for', evt.source);
                    var activeTabId = iframeAndTabIndex.tabIndex;
                    for( var i=0; i<tabs.length; i++ ){
                        if(activeTabId == i){
                            var iIfr = tabs[i].iframe;
                            var iIfrWin = iIfr.contentWindow || iIfr;
                            iIfrWin.opener = tabs[i].opener;
                            var title = iIfr.contentWindow ? iIfr.contentDocument.title : iIfr.document.title;
                            iIfr.dataset.title = title;
                            iIfr.dataset.loaded = true;
                            _redrawBreadcrumbs(iIfr.dataset.dialogId, true);
                            iIfrWin.postMessage({}, '*');
                        }
                    }
                } else if (evt.data.dialog && evt.data.dialog.title){
                    //update title
                    var iframeAndTabIndex = _findEventSourceIframe(evt.source);
                    var ifr = iframeAndTabIndex.iframe;
                    ifr.dataset.title = evt.data.dialog.title;
                    ifr.dataset.loaded = true;
                    _redrawBreadcrumbs(ifr.dataset.dialogId, true);
                } else if (evt.data.dialog && evt.data.dialog.windowName) {
                    // post message 
                    _createDialog(evt.data.dialog, evt.source);
                    evt.source.postMessage({}, '*');
                } else {
                    var iframeAndTabIndex = _findEventSourceIframe(evt.source);
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
                dialogObj.ignoreOnLoad = true;
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
                    //tabWindow.appendChild(difr);
                    //chrome reaches onload if url displayed
                    //firefox reaches onload and need
                    /* 
                    difr.addEventListener('load', function(){
                        console.debug('difr loaded');
                        difr.dataset.loaded = true;
                        //console.debug('ContentWindow', difr.contentWindow.location.href);
                        console.debug('contentDocument', difr.contentDocument);
                        console.debug('difr.src', difr.src);
                        console.debug('contentWindow', difr.contentWindow);
                    });
                    */
                    //add after listener for IE
                    var ie = (function(){
                        var undef,rv = -1; // Return value assumes failure.
                        var ua = window.navigator.userAgent;
                        var msie = ua.indexOf('MSIE ');
                        var trident = ua.indexOf('Trident/');
                        if (msie > 0) {
                            // IE 10 or older => return version number
                            rv = parseInt(ua.substring(msie + 5, ua.indexOf('.', msie)), 10);
                        } else if (trident > 0) {
                            // IE 11 (or newer) => return version number
                            var rvNum = ua.indexOf('rv:');
                            rv = parseInt(ua.substring(rvNum + 3, ua.indexOf('.', rvNum)), 10);
                        }
                        return ((rv > -1) ? rv : undef);
                    }());
                    var isDialogAlreadyOpened = false;
                    if(ie){
                        if(tabs.length==0){
                            dialog.style.width='0px';
                            dialog.style.height='0px';
                            //dialog.style.margin='0px';
                            //dialog.style.padding='0px';
                            dialog.style.position='absolute';
                            dialog.style.top='10px';
                            dialog.style.left='10px';
                            dialog.style.display='block';
                            tabWindow.appendChild(difr);
                        } else {
                            isDialogAlreadyOpened = true;
                            difr.width=0;
                            difr.height=0;
                            tabWindow.appendChild(difr);
                            _createDialog(dialogObj, evt.source, difr);
                        }
                    } else {
                        difr.style.display='none';
                        tabWindow.appendChild(difr);
                    }
                    if(ie){
                        /* IE11 */
                        console.info('browser: IE', ie);
                        difr.contentWindow.addEventListener('DOMContentLoaded', (function(dialogConfig, evtSource, ifr, doc) {
                            console.log('window - DOMContentLoaded - capture'); // 1st
                            var waitForActiveElement = 30;
                            var intervalId = setInterval(function(){
                                console.debug('waitForActiveElement :', waitForActiveElement--);
                                try {
                                    if (doc.activeElement.tagName.toLocaleLowerCase() === 'object') {
                                        clearInterval(intervalId);
                                        if(!isDialogAlreadyOpened){
                                            dialog.removeAttribute("style");                     
                                            _createDialog(dialogConfig, evtSource, ifr);
                                        }                                        
                                    } else { //download
                                        clearInterval(intervalId);
                                        if(isDialogAlreadyOpened){
                                            _closeTabByDialogId(ifr.dataset.dialogId);
                                        } else {
                                            console.debug(dialog);
                                            dialog.style.removeAttribute("width");
                                            dialog.style.removeAttribute("height");
                                            //dialog.style.removeAttribute("margin");
                                            //dialog.style.removeAttribute("padding");
                                            dialog.style.removeAttribute("position");
                                            dialog.style.removeAttribute("top");
                                            dialog.style.removeAttribute("left");
                                            dialog.style.removeAttribute("display");
                                            console.debug(dialog);
                                            tabWindow.removeChild(ifr);
                                        }
                                    }
                                } catch (e) {
                                    if(waitForActiveElement<=0){
                                        clearInterval(intervalId);
                                        console.error(e);
                                    }
                                }
                            }, 1000);
                        })(dialogObj, evt.source, difr, difr.contentDocument ), true);
                    } else {
                        console.info('browser: NOT IE');
                        function loadListener (){
                            try {
                                var difrProtocol = difr.contentWindow.location.protocol;
                                if(difr.src.substr(0, difrProtocol.length) === difrProtocol){
                                    console.info('browser is Chrome or Edge')
                                    _createDialog(dialogObj, evt.source, difr);
                                }
                            } catch (e) {
                                console.info('Browser is Firefox');
                                difr.removeEventListener('load', loadListener);
                                _createDialog(dialogObj, evt.source, difr);
                            }
                        }
                        difr.addEventListener('load', loadListener);
                    }
                    /*
                    difr.contentDocument.addEventListener('DOMContentLoaded', function() {
                        console.log('document - DOMContentLoaded - capture'); // 2nd
                    }, true);
                    */
                    console.debug(difr.contentDocument);
                    console.debug('document protocol', difr.contentDocument.location.protocol);
                    /*
                    difr.contentWindow.onload = function(){
                        console.info('IE contentWindow onload');
                    }
                    difr.contentWindow.addEventListener('load', function(){
                        console.debug('IE contentWidnow load event');
                    });
                    difr.contentWindow.addEventListener('onload', function(){
                        console.debug('IE contentWidnow onload event');
                    });
                    */
                    /*
                    try {
                        var difrProtocol = difr.contentWindow.location.protocol;
                        console.debug('difrProtocol', difrProtocol);
                        console.debug('before 2s timeout', difr);
                        setTimeout( (function(pdfDoc){
                            return function(){
                                console.debug('after 2s timeout');
                                console.debug(pdfDoc);
                                console.debug('Active element: ', pdfDoc.activeElement);
                            }
                        })(difr.contentDocument), 2000);

                        if(difr.src.substr(0, difrProtocol.length) === difrProtocol){
                            //_createDialog(dialogObj, evt.source, difr);
                        }
                    } catch (e) {
                        console.warn(e);
                        // i.e. FF and rendered
                        _createDialog(dialogObj, evt.source, difr);
                    }
                    */
                }
            }
        }
        function _redrawBreadcrumbs(activeDialogId, ignoreOnLoad){
            console.debug('redrawing breadcrumbs, ignoreOnLoad', ignoreOnLoad);
            var nav = dialog.querySelector('nav');
            var frag = document.createDocumentFragment();
            for( var i=0; i<tabs.length; i++ ){
                var crumb = document.createElement('div');
                crumb.classList.add('crumb');
                var ifr = tabs[i].iframe;
                if(activeDialogId != ifr.dataset.dialogId){
                    var title = ifr.dataset.title?ifr.dataset.title:'No title '+i;
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
                    if(!ifr.dataset.loaded && !ifr.dataset.title && ignoreOnLoad){ /** add spinner to show loading process */                    
                        var spinner = document.createElement('div');
                        spinner.classList.add('lds-ellipsis');
                        for(var u=0; u<4; u++){
                            spinner.appendChild(document.createElement('div'));
                        }
                        crumb.appendChild(spinner);
                    }
                    var textNode = document.createTextNode(ifr.dataset.title?ifr.dataset.title:'');
                    crumb.appendChild( textNode );
                    if(ifr.onload==null && !ignoreOnLoad){
                        console.debug('applying ifr.onload')
                        var spinner = crumb.querySelector('.lds-ellipsis');
                        var ifrOpener = tabs[i].opener;
                        ifr.onload = function(){
                            try{
                                ifr.dataset.loaded = true;
                                var iWin = ifr.contentWindow || ifr;
                                var doc = ifr.contentWindow ? ifr.contentDocument : ifr.document;
                                if(spinner && spinner.parentNode){
                                    spinner.parentNode.removeChild(spinner);
                                }
                                if(!ifr.dataset.title) {
                                    if(doc && doc.title) {
                                        ifr.dataset.title=doc.title;
                                    } else {
                                        ifr.dataset.title = 'No title ' + i;
                                    }
                                }
                                if(!!iWin.isDialogCloseable){
                                    console.debug('ifr.onload is not applied because of isDialogCloseable==true');
                                    textNode.nodeValue = ifr.dataset.title;
                                    return;
                                }
                                console.debug('ifr.onload is applied!');
                                iWin.opener = ifrOpener;
                                /** window.close() can be overriden in IE by function declaration only */
                                var script = doc.createElement('script');
                                script.textContent = "function close(){console.debug('close() is defined by topdialog');function getTopWindow(checkWindow){if(!checkWindow) checkWindow = window.self;try {if(checkWindow.parent && !checkWindow.parent.noDialog){return getTopWindow(checkWindow.parent);}}catch(e){}return checkWindow;};getTopWindow().postMessage({dialog:null},'*')}";
                                doc.head.appendChild(script);
                                iWin.isDialogCloseable = true;
                            } catch(error){
                                if(!ifr.dataset.title) ifr.dataset.title = 'No title #'+ i;
                                if(spinner && spinner.parentNode){
                                    spinner.parentNode.removeChild(spinner);
                                }
                            }
                            textNode.nodeValue = ifr.dataset.title;
                        }
                    }
                }                    
                frag.appendChild(crumb);
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
})();