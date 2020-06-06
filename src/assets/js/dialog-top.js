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
        },
        getTabs: function(crumbsArray){
            var tabs = [];
            for ( var i=0; i<crumbsArray.length; i++ ){
                if(tabs.length == 0){
                    tabs[0] = [i];
                } else {
                    var ifr = crumbsArray[i].iframe;
                    if(ifr.dataset.pillar){
                        var idx = tabs.length;
                        tabs[idx] = [i];
                    } else {
                        var idx = tabs.length-1;
                        tabs[idx].push(i);
                    }
                }
            }
            return tabs;
        },
        /**
         * @typedef {Object} TabsInfo
         * @property {[[number]]} tabs - Crumbs grouped in array of arrays (tabs)
         * @property {number} activeTabIndex - The index of the active tab
         * @property {number} activeCrumbIndex - The index of the active crumb
         */
        /**
         * 
         * @param {[[number]]} crumbsArray 
         * @param {number} dialogId
         * @returns {TabsInfo}
         *  information about tabs
         */
        getActiveTab : function(crumbsArray, dialogId){
            var tabs = [];
            var activeCrumbIndex, activeTabIndex = 0;
            for ( var i=0; i<crumbsArray.length; i++ ){
                var ifr = crumbsArray[i].iframe;
                if(tabs.length == 0){
                    tabs[0] = [i];
                } else {
                    var isActiveCrumb = dialogId == ifr.dataset.dialogId;
                    if(ifr.dataset.pillar){
                        var tabIndex = tabs.length;
                        tabs[tabIndex] = [i];
                        if(isActiveCrumb) activeTabIndex = tabIndex;
                    } else {
                        var tabIndex = tabs.length-1;
                        tabs[tabIndex].push(i);
                        if(isActiveCrumb) activeTabIndex = tabIndex;
                    }
                }
                if(dialogId == ifr.dataset.dialogId) activeCrumbIndex = i;
            }
            return { tabs:tabs, activeTabIndex:activeTabIndex, activeCrumbIndex: activeCrumbIndex };
        }
    };
    var dialogInitialized = false;
    var crumbs = [];
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
                while(crumbs.length > 0){
                    tabWindow.removeChild(crumbs.pop());
                }
            });

        window.dialogPolyfill.registerDialog(dialog);
        dialog.setSize = function(size, iframe){
            function fixSize(sizeName, sizeVal, theIframe, theDialog){
                if(sizeVal){
                    var mySize;
                    if(isNaN(sizeVal)){
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
                        if(sizeVal>0){
                            mySize = sizeVal+'px';
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
            size = size || {};
            fixSize('width', size.width, iframe, this);
            fixSize('height', size.height, iframe, this);
        }
        dialog.getCrumbIndex = function(theWindow){
            for(var i=crumbs.length; i--;) {
                var f = crumbs[i].iframe;
                if (f.contentWindow==theWindow){
                    return i;
                }
            }
            return -1;
        }
        dialog.switchTab = function(tabIndex){
            var tabs =  utils.getTabs(crumbs);
            var crumbsInNewActiveTab = tabs[tabIndex];
            var activeCrumbIndex = crumbsInNewActiveTab[crumbsInNewActiveTab.length-1];
            for( var k = 0; k < crumbs.length; k++ ){
                //FIXME minimize active only
                var tifr = crumbs[k].iframe;
                tifr.dispatchEvent(utils.createEvent('dialog-blur'));
                tifr.classList.add('minimized');
            }
            var ifr = crumbs[activeCrumbIndex].iframe;
            if(ifr.dataset.dwidth) dialog.style.width=ifr.dataset.dwidth;
            else dialog.style.width=null;
            if(ifr.dataset.dheight) dialog.style.height=ifr.dataset.dheight;
            else dialog.style.height=null;         
            ifr.classList.remove('minimized');
            dialog.activeDialogId = ifr.dataset.dialogId;
            dialogPolyfill.reposition(dialog);
            dialog.updateBreadcrumbs(ifr.dataset.dialogId);
            ifr.dispatchEvent(utils.createEvent('dialog-focus'));
        }
        dialog.updateBreadcrumbs = function(activeDialogId){
            if(activeDialogId) {
                dialog.activeDialogId = activeDialogId;
            } else {
                activeDialogId = dialog.activeDialogId || crumbs[crumbs.length-1].iframe.dataset.dialogId;
            }
            function appendTab(crumbsIndexes, htmlFragment, isActiveTab, tabIndex){ //[0,1,2]
                var tabDiv = document.createElement('div');
                tabDiv.classList.add('dialogtab');
                if(isActiveTab){
                    tabDiv.classList.add('active');
                    for(var i=0; i<crumbsIndexes.length; i++){
                        var crumb = document.createElement('div');
                        crumb.classList.add('crumb');
                        var ifr = crumbs[crumbsIndexes[i]].iframe;
                        if(activeDialogId != ifr.dataset.dialogId){
                            var title = ifr.dataset.title?ifr.dataset.title:'No title '+i+1;
                            var textNode = document.createTextNode(title);
                            crumb.classList.add('SIModalTitlePrev');
                            crumb.appendChild( textNode );
                            if(i<crumbsIndexes.length-1 ){
                                var delIndex = crumbsIndexes[i]+1;
                                crumb.addEventListener('click', (function(dialogToOpenId){
                                    return function(){
                                        //_removeIframe(deleteTabIndex);
                                        dialog.openCrumb(dialogToOpenId);
                                    };
                                })(ifr.dataset.dialogId));
                                crumb.setAttribute('title', title);
                            }
                            ifr.classList.add('minimized');
                        } else {
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
                            //ifr.classList.remove('minimized');
                        }
                        tabDiv.appendChild(crumb);
                    }
                } else {
                    tabDiv.appendChild(document.createTextNode(tabIndex+1));
                    tabDiv.addEventListener('click', (function(activateTabIndex){
                        return function(){ dialog.switchTab(activateTabIndex); };
                    })(tabIndex));
                }
                htmlFragment.appendChild(tabDiv);
                
            }
            var tabsInfo = utils.getActiveTab(crumbs, activeDialogId);
            // we have tabs = [[0,1,2],[3,4,5]]
            var navTabs = dialog.querySelector('nav > div.dialogtabs');
            var frag = document.createDocumentFragment();
            for (var k = 0; k<tabsInfo.tabs.length; k++){
                appendTab(tabsInfo.tabs[k], frag, k==tabsInfo.activeTabIndex, k);
            }
            while (navTabs.lastChild) { navTabs.removeChild(navTabs.lastChild); }
            navTabs.appendChild(frag);          
        }
        /**
         * Closes the dialog and its crumb and et seq. in the same tab.
         * @param {number} dialogId
         * @returns next advised crumb to be opened
         */
        dialog.closeDialog = function(dialogId){
            dialogId = dialogId || dialog.activeDialogId;
            var tabsInfo = utils.getActiveTab(crumbs, dialogId);
            var currentTab = tabsInfo.tabs[tabsInfo.activeTabIndex];
            var nextCrumbIndex = -1; //advised crumb to open
            var delCounter = 0;
            if(currentTab[0] == tabsInfo.activeCrumbIndex){//close the whole tab
                delCounter = currentTab.length;
                var nextTabIndex = (tabsInfo.tabs.length > tabsInfo.activeTabIndex + 1) ?
                    tabsInfo.activeTabIndex + 1 : tabsInfo.activeTabIndex - 1;
                if(nextTabIndex>-1){
                    var nextTab = tabsInfo.tabs[nextTabIndex];
                    nextCrumbIndex = nextTab[nextTab.length-1];
                }
            } else {
                nextCrumbIndex = tabsInfo.activeCrumbIndex - 1;
                for(var k = currentTab.length; k--;){
                    delCounter++;
                    if(currentTab[k] == tabsInfo.activeCrumbIndex) break;
                }
            }
            var wasActiveDialogRemoved = false;
            for(var k=tabsInfo.activeCrumbIndex; k<tabsInfo.activeCrumbIndex+delCounter; k ++){
                var iframeToRemove = crumbs[k].iframe;
                if(dialog.activeDialogId == iframeToRemove.dataset.dialogId){
                    wasActiveDialogRemoved = true;
                }
                iframeToRemove.dispatchEvent(utils.createEvent('dialog-destroyed'));
                tabWindow.removeChild(iframeToRemove);
            }
            if(nextCrumbIndex>-1){
                if(wasActiveDialogRemoved){
                    var ifr = crumbs[nextCrumbIndex].iframe;
                    if(ifr.dataset.dwidth) dialog.style.width=ifr.dataset.dwidth;
                    else dialog.style.width=null;
                    if(ifr.dataset.dheight) dialog.style.height=ifr.dataset.dheight;
                    else dialog.style.height=null;         
                    ifr.classList.remove('minimized');
                    crumbs.splice(tabsInfo.activeCrumbIndex, delCounter);
                    dialogPolyfill.reposition(dialog);
                    dialog.updateBreadcrumbs(ifr.dataset.dialogId);
                    ifr.dispatchEvent(utils.createEvent('dialog-focus'));
                    return -1;//we don't advise a crumb to show;
                } else {
                    crumbs.splice(tabsInfo.activeCrumbIndex, delCounter);
                    dialog.updateBreadcrumbs();
                    return nextCrumbIndex; //we may advise, as visible dialog hasn't been affected
                    // so one could handle that situation what he likes
                }
            } else {
                crumbs = [];
                var navTabs = dialog.querySelector('nav > div.dialogtabs');
                while (navTabs.lastChild) {
                    navTabs.removeChild(navTabs.lastChild);
                }
                dialog.close();
                return -1;
            }
        }
        dialog.openCrumb = function(dialogId){
            var tabsInfo = utils.getActiveTab(crumbs, dialogId);
            var currentTab = tabsInfo.tabs[tabsInfo.activeTabIndex];
            if(currentTab.length>0 && currentTab[currentTab.length-1] != tabsInfo.activeCrumbIndex){
                var closeDialogId = crumbs[tabsInfo.activeCrumbIndex + 1].iframe.dataset.dialogId;
                dialog.closeDialog(closeDialogId);
            }
        }
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
            if(dialogObj.pillar) iframe.dataset.pillar = true;
            dialog.setSize(dialogObj.size, iframe);
            if(crumbs.length>0){
                for( var k = 0; k < crumbs.length; k++ ){
                    //FIXME minimize active only
                    var tifr = crumbs[k].iframe;
                    tifr.dispatchEvent(utils.createEvent('dialog-blur'));
                    tifr.classList.add('minimized');
                }
            } else {                
                dialog.showModal();
            }
            dialogPolyfill.reposition(dialog);
            var noTitleIndex;
            if(iframe.dataset.pages){
                if(iframe.dataset.title) iframe.removeAttribute('data-title');
            } else {
                if(iframe.dataset.pillar){
                    crumbs[crumbs.length] = {iframe:iframe,opener:dialogOpenerWindow};
                } else {
                    //FIXME add to active tab
                    if(crumbs.length==0){
                        crumbs[crumbs.length] = {iframe:iframe,opener:dialogOpenerWindow};
                        noTitleIndex = 1;
                    } else {
                        var tabInfo = utils.getActiveTab(crumbs, dialog.activeDialogId);
                        var newCrumbPosition = tabInfo.activeCrumbIndex+1;
                        crumbs.splice(newCrumbPosition, 0, {iframe:iframe,opener:dialogOpenerWindow});
                        noTitleIndex = newCrumbPosition + 1;
                    }
                }
                dialog.activeDialogId = iframe.dataset.dialogId;
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
            var crumbPos = noTitleIndex || crumbs.length;
            if(dialogObj.html){
                iframe.contentDocument.open();
                iframe.contentDocument.write(dialogObj.html);
                iframe.contentDocument.close();
                loadListener(iframe, dialogOpenerWindow, crumbPos);
            } else if (dialogObj.downloader) {
                loadListener(iframe, dialogOpenerWindow, crumbPos);
            } else {
                (function(index){
                    iframe.onload = function(){loadListener(iframe, dialogOpenerWindow, index);}
                })(crumbPos);
                if(dialogObj.url) iframe.src = dialogObj.url;
            }
            dialog.updateBreadcrumbs(iframe.dataset.dialogId);
        }
        function _removeIframe(crumbIndex) {
            // TODO if tab is closed - activate the last crumb in the next tab
            var tabInfo = utils.getTabs(crumbs);
            var delCount = 0;
            var wasActiveDialogRemoved = false;
            for( var k = crumbIndex; k<crumbs.length; k++ ){
                var doRemove = false;
                if(k==crumbIndex){
                    doRemove = true;
                } else if (!crumbs[k].iframe.dataset.pillar){
                    doRemove = true;
                }
                if(doRemove){
                    delCount++;
                    var removedIframe = crumbs[k].iframe;
                    if(dialog.activeDialogId == removedIframe.dataset.dialogId){
                        wasActiveDialogRemoved = true;
                    }
                    removedIframe.dispatchEvent(utils.createEvent('dialog-destroyed'));
                    tabWindow.removeChild(removedIframe);
                } else {
                    break;
                }
            }
            crumbs.splice(crumbIndex, delCount);
            if(crumbs.length>0){
                if(wasActiveDialogRemoved){
                    var activateCrumb = crumbIndex > 0 ? crumbIndex - 1 : 0;
                    var ifr = crumbs[activateCrumb].iframe;
                    if(ifr.dataset.dwidth) dialog.style.width=ifr.dataset.dwidth;
                    else dialog.style.width=null;
                    if(ifr.dataset.dheight) dialog.style.height=ifr.dataset.dheight;
                    else dialog.style.height=null;         
                    ifr.classList.remove('minimized');
                    dialogPolyfill.reposition(dialog);
                    dialog.updateBreadcrumbs(ifr.dataset.dialogId);
                    ifr.dispatchEvent(utils.createEvent('dialog-focus'));
                } else {
                    dialog.updateBreadcrumbs();
                }
            } else {
                var navTabs = dialog.querySelector('nav > div.dialogtabs');
                while (navTabs.lastChild) {
                    navTabs.removeChild(navTabs.lastChild);
                }
                dialog.close();
            }
        }
        function _closeTabByDialogId(dialogId){
            for (var i=crumbs.length; i--;){
                if(crumbs[i].iframe.dataset.dialogId == dialogId){
                    _removeIframe(i);
                    return;
                }
            }
        }
        function _messageListerner(evt){
            if(evt.data && evt.data.hasOwnProperty('dialog')){
                if(evt.data.dialog && (evt.data.dialog.url || evt.data.dialog.html)){
                    _createDialog(evt.data.dialog, utils.getContextOpener(evt));
                    evt.source.postMessage({dialogResult:'urlOrHtml'}, '*');
                } else if (evt.data.dialog && evt.data.dialog.hasOwnProperty('close')) {
                    dialog.closeDialog(evt.data.dialog.close);
                } else if (evt.data.dialog && evt.data.dialog.update) {
                    var crumbIndex = dialog.getCrumbIndex(evt.source);
                    if(!crumbIndex) throw new Error('crumbIndex not found for', evt.source);
                    var iIfr = crumbs[crumbIndex].iframe;
                    var iIfrWin = iIfr.contentWindow || iIfr;
                    iIfrWin.opener = crumbs[crumbIndex].opener;
                    var title = iIfr.contentWindow ? iIfr.contentDocument.title : iIfr.document.title;
                    iIfr.dataset.title = title;
                    dialog.updateBreadcrumbs();
                    iIfrWin.postMessage({dialogResult:'updated'}, '*');
                } else if (evt.data.dialog && evt.data.dialog.loaded){
                    //notifies that dialog's content is fully loaded
                    var crumbIndex = dialog.getCrumbIndex(evt.source);
                    if(crumbIndex > -1){
                        for( var i=crumbs.length; i--; ){
                            if(crumbIndex == i){
                                var ifr = crumbs[i].iframe;
                                if(ifr) {
                                    var loadedCounter = parseInt(ifr.dataset.loaded, 10);
                                    loadedCounter = isNaN(loadedCounter) ? 1 : loadedCounter + 1;
                                    ifr.dataset.loaded = loadedCounter;
                                    var title = ifr.contentWindow ? ifr.contentDocument.title : ifr.document.title;
                                    title = title && title.length>0 ? title : 'No title ' + i;
                                    ifr.dataset.title = title;
                                    dialog.updateBreadcrumbs();
                                }
                                if(crumbs[i].opener){
                                    crumbs[i].opener.dispatchEvent(utils.createEvent('dialog-loaded'));
                                }
                                break;
                            }
                        }
                    }
                } else if (evt.data.dialog && evt.data.dialog.title){
                    /* update title */
                    var crumbIndex = dialog.getCrumbIndex(evt.source);
                    if(crumbIndex > -1){
                        var ifr = crumbs[crumbIndex].iframe;
                        ifr.dataset.title = evt.data.dialog.title;
                        dialog.updateBreadcrumbs();
                    }
                } else if (evt.data.dialog && evt.data.dialog.windowName) {
                    /* post message evt.source is de-facto opener */
                    _createDialog(evt.data.dialog, evt.source);
                    evt.source.postMessage({dialogResult:'namedWindow'}, '*');
                } else {
                    var crumbIndex = dialog.getCrumbIndex(evt.source);
                    if(crumbIndex > -1) {
                        //_removeIframe(crumbIndex);
                        dialog.closeDialog(crumbs[crumbIndex].iframe.dataset.dialogId);
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
                        if(crumbs.length==0){
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
                                                dialog.classList.remove('minimized');
                                                dialogPolyfill.reposition(dialog);
                                            }
                                            //_createDialog(dialogConfig, evtSource, ifr);
                                        } else {
                                            /* download */
                                            //_closeTabByDialogId(ifr.dataset.dialogId);
                                            dialog.closeDialog(ifr.dataset.dialogId);
                                            if(!isDialogAlreadyOpened){
                                                dialog.classList.remove('minimized');
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
        function loadListener(ifr, ifrOpener, noTitleIndex){
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
                        ifr.dataset.title = 'No title # ' + noTitleIndex;
                    }
                    dialog.updateBreadcrumbs();
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
                if(!ifr.dataset.title) ifr.dataset.title = 'No title ##'+ noTitleIndex;
                dialog.updateBreadcrumbs();
            }
        }
        function getDefaultTopDialog(){
            var dialog = document.createElement("dialog");
            dialog.setAttribute("role", "topdialog");
            var tabbedDiv = document.createElement("div");
            tabbedDiv.classList.add("tabbed");
            var nav = document.createElement("nav");
            nav.classList.add('SIModalTitle');
            var dialogtabs = document.createElement('div');
            dialogtabs.classList.add('dialogtabs');
            nav.appendChild(dialogtabs);
            var xButton = document.createElement('div');
            xButton.classList.add('xbutton');
            xButton.classList.add('SIModalXButton');
            xButton.addEventListener('click', function(){ 
                postMessage({ dialog:{ close: 0 } }, '*');
            });
            nav.appendChild(xButton);
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