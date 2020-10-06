(function() {
    function domReady(callbackFunction){
        if(document.readyState != 'loading')
          callbackFunction();
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
            if(doc && doc.head){
                var script = doc.createElement('script');
                script.textContent = "function close(){function getTopWindow(checkWindow){if(!checkWindow) checkWindow = window.self;try {if(checkWindow.parent && !checkWindow.parent.noDialog){return getTopWindow(checkWindow.parent);}}catch(e){}return checkWindow;};if(!self.AL.detaching && self.opener && self.opener.onOpeneeClosed) setTimeout(self.opener.onOpeneeClosed(),0);getTopWindow().postMessage({dialog:null},'*')}";
                doc.head.appendChild(script);
            }
        },
        /**
         *  gets default value of an iframe without height
         */
        getZeroHeight: function() {
            return "180px";
        },
        /**
         * Gets the window, that we set as `opener` for the dialog's iframe
         * @param {Event} evt 
         */
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
        },
        /**
         * 
         * @param {*} iframe 
         * @returns div wrapper around iframe to handle focus
         */
        wrapIframe: function(iframe, isMinimized){
            var ifrWrapper = document.createElement('div');
            ifrWrapper.classList.add('ifrWrapper');
            if(isMinimized) ifrWrapper.classList.add('minimized');
            var enterFocusInput = document.createElement('input');
            enterFocusInput.addEventListener('focus', function(event){
                event.target.parentNode.querySelector('span[data-focus-direction="fromEnd"]').focus();
            });
            enterFocusInput.classList.add('focusLocker');
            ifrWrapper.appendChild(enterFocusInput);

            
            var forwardCircle = document.createElement('span');
            forwardCircle.classList.add('forwardcircle');
            forwardCircle.setAttribute('tabindex', '-1');
            forwardCircle.dataset.focusDirection="fromStart";
            ifrWrapper.appendChild(forwardCircle);
            

            ifrWrapper.appendChild(iframe);


            var backcircleInput = document.createElement('span');
            backcircleInput.classList.add('backcircle')
            backcircleInput.setAttribute('tabindex', '-1');
            backcircleInput.dataset.focusDirection="fromEnd"
            ifrWrapper.appendChild(backcircleInput);

            var exitFocusInput = document.createElement('input');
            exitFocusInput.addEventListener('focus', function(event){
                event.target.parentNode.querySelector('span[data-focus-direction="fromStart"]').focus();
            });
            exitFocusInput.classList.add('focusLocker');
            ifrWrapper.appendChild(exitFocusInput);

            return ifrWrapper;
        },
        /**
         * Saves dialog's size to localStorage
         * @param {string} name dialog name
         * @param {string} width
         * @param {string} height
         */
        saveSize: function(name, width, height){
            if (typeof(Storage) !== "undefined" && name && width && height) {
                localStorage.setItem('topdialog_'+name, JSON.stringify({width: width, height: height}));
            }
        },
        /**
         * Gets size of the dialog
         * @param {string} name dialog's name
         * @throws error if not found or invalid format
         */
        getSize: function(name){
            if (typeof(Storage) !== "undefined" && name ) {
                var val = localStorage.getItem('topdialog_'+name);
                if(val){
                    return JSON.parse(val);
                }
            }
            throw new Error('value for ' + name + ' is not found in localStorage');
        }
    };
    var dialogInitialized = false;
    var crumbs = [];
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
                while(crumbs.length > 0){
                    tabWindow.removeChild(crumbs.pop().iframe.parentNode);
                }
            });

        window.dialogPolyfill.registerDialog(dialog);
        dialog.setSize = function(size, iframe){
            function fixSize(sizeName, sizeVal, theIframe){
                if(sizeVal){
                    var mySize;
                    if(isNaN(sizeVal)){
                        /* e.g. 20px or 15% */
                        var sizeRegex = /^(\d+)(px|%|em|rem|vw|vh)?/gi
                        var match = sizeRegex.exec(sizeVal);
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
                        dialog.style[sizeName] = mySize;
                        return;
                    }
                }
                theIframe.removeAttribute('data-d'+sizeName);
                dialog.style[sizeName] = null;
            }
            try {
                size = utils.getSize(iframe.dataset.watirName);
            } catch (e) {
                size = size || {};
            }
            fixSize('width', size.width, iframe);
            fixSize('height', size.height, iframe);
        }
        dialog.getCrumbIndex = function(evtSource){
            if(evtSource && evtSource.frameElement){
                for(var i=crumbs.length; i--;) {
                    if (crumbs[i].iframe==evtSource.frameElement){
                        return i;
                    }
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
                tifr.parentNode.classList.add('minimized');
            }
            var ifr = crumbs[activeCrumbIndex].iframe;
            if(ifr.dataset.dwidth) dialog.style.width=ifr.dataset.dwidth;
            else dialog.style.width=null;
            if(ifr.dataset.dheight) dialog.style.height=ifr.dataset.dheight;
            else dialog.style.height=null;         
            ifr.parentNode.classList.remove('minimized');
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
                tabDiv.addEventListener('mousedown', function(event){
                    event.stopPropagation();
                });
                if(isActiveTab){
                    tabDiv.classList.add('active');
                    for(var i=0; i<crumbsIndexes.length; i++){
                        var crumb = document.createElement('div');
                        crumb.classList.add('crumb');
                        var ifr = crumbs[crumbsIndexes[i]].iframe;
                        if(activeDialogId != ifr.dataset.dialogId){
                            var title = ifr.dataset.title?ifr.dataset.title:'...';
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
                            ifr.parentNode.classList.add('minimized');
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
                            } else if(!ifr.dataset.title) {}
                            var textNode = document.createTextNode(ifr.dataset.title?ifr.dataset.title:'');
                            crumb.appendChild( textNode );
                            //ifr.classList.remove('minimized');
                            //DETACHABLE
                            var dialogbuttons = dialog.querySelector('nav > .dialogbuttons');
                            //var popoutButtons = dialog.querySelectorAll('nav > .dialogbuttons > .popoutButton');
                            var popoutButton = dialog.querySelector('nav > .dialogbuttons > .popoutButton');
                            if(!ifr.dataset.detachable){
                                /*
                                if(popoutButtons && popoutButtons.length > 0){
                                    for( var k = popoutButtons.length; k-- > 0;){
                                        dialogbuttons.removeChild(popoutButtons[k]);
                                    }
                                }
                                */
                                if(popoutButton) popoutButton.parentNode.removeChild(popoutButton);

                            } else {
                                if(!popoutButton){
                                    var popoutButton = document.createElement('div');
                                    popoutButton.classList.add('popoutButton');
                                    popoutButton.onclick = function(){
                                        if(ifr.contentWindow.AL)
                                            ifr.contentWindow.AL.detachWrapper();
                                    }
                                    dialogbuttons.appendChild(popoutButton);
                                }
                            }
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
            var activeDialogToRemoveCrumbIndex = -1;
            for(var k=tabsInfo.activeCrumbIndex; k<tabsInfo.activeCrumbIndex+delCounter; k ++){
                var iframeToRemove = crumbs[k].iframe;
                var iframeToRemoveId = iframeToRemove.dataset.dialogId;
                iframeToRemove.dispatchEvent(utils.createEvent('dialog-destroyed'));
                tabWindow.removeChild(iframeToRemove.parentNode);
                if(dialog.activeDialogId == iframeToRemoveId){
                    activeDialogToRemoveCrumbIndex = k;
                }
            }
            function setFocusOnOpener(ifrOpener){
                if(ifrOpener && ifrOpener.topdialog && ifrOpener.topdialog.support &&
                    ifrOpener.topdialog.support.restoreFocusAfterDialogClosed){
                    ifrOpener.topdialog.support.restoreFocusAfterDialogClosed.apply(ifrOpener);
                }
            }
            var ifrOpener;
            if(activeDialogToRemoveCrumbIndex>-1){
                ifrOpener = crumbs[activeDialogToRemoveCrumbIndex].opener;
            }
            if(nextCrumbIndex>-1){
                if(activeDialogToRemoveCrumbIndex>-1){
                    var ifr = crumbs[nextCrumbIndex].iframe;
                    if(ifr.dataset.dwidth) dialog.style.width=ifr.dataset.dwidth;
                    else dialog.style.width=null;
                    if(ifr.dataset.dheight) dialog.style.height=ifr.dataset.dheight;
                    else dialog.style.height=null;         
                    ifr.parentNode.classList.remove('minimized');
                    crumbs.splice(tabsInfo.activeCrumbIndex, delCounter);
                    dialogPolyfill.reposition(dialog);
                    dialog.updateBreadcrumbs(ifr.dataset.dialogId);
                    setFocusOnOpener(ifrOpener);
                    ifr.dispatchEvent(utils.createEvent('dialog-focus'));
                    return -1;//we don't advise a crumb to show;
                } else {
                    crumbs.splice(tabsInfo.activeCrumbIndex, delCounter);
                    dialog.updateBreadcrumbs();
                    setFocusOnOpener(ifrOpener);
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
                setFocusOnOpener(ifrOpener);
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
        dialog.getActiveIframe = function(){
            if(dialog.activeDialogId){
                var idx = utils.getActiveTab(crumbs, dialog.activeDialogId).activeCrumbIndex;
                return crumbs[idx].iframe;
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
                    tifr.parentNode.classList.add('minimized');
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
                iframe.parentNode.classList.remove('minimized');
            } else {
                tabWindow.appendChild(utils.wrapIframe(iframe));
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
            return iframe.dataset.dialogId;
        }
        function _messageListerner(evt){
            if(evt.data && evt.data.hasOwnProperty('dialog')){
                if(evt.data.dialog && (evt.data.dialog.url || evt.data.dialog.html)){
                    var theDialogId = _createDialog(evt.data.dialog, utils.getContextOpener(evt));
                    evt.source.postMessage({dialogResult:'urlOrHtml', dialogId: theDialogId}, '*');
                } else if (evt.data.dialog && evt.data.dialog.hasOwnProperty('close')) {
                    dialog.closeDialog(evt.data.dialog.close);
                } else if (evt.data.dialog && evt.data.dialog.update) {
                    var crumbIndex = dialog.getCrumbIndex(evt.source);
                    if(crumbIndex<0) throw new Error('crumbIndex not found for', evt.source);
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
                                    if(evt.data.dialog.loaded){
                                        var loadedCounter = parseInt(ifr.dataset.loaded, 10);
                                        loadedCounter = isNaN(loadedCounter) ? 1 : loadedCounter + 1;
                                        ifr.dataset.loaded = loadedCounter;
                                        var title = ifr.contentWindow ? ifr.contentDocument.title : ifr.document.title;
                                        //title = title && title.length>0 ? title : 'No title ' + i;
                                        title = title && title.length>0 ? title : '...';
                                        ifr.dataset.title = title;
                                    }
                                    if(evt.data.dialog.detachable){
                                        ifr.dataset.detachable = true;
                                    } else {
                                        delete ifr.dataset.detachable;
                                    }
                                    dialog.updateBreadcrumbs();
                                }
                                if(crumbs[i].opener && evt.data.dialog.loaded){
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
                    var theDialogId = _createDialog(evt.data.dialog, evt.source);
                    evt.source.postMessage({dialogResult:'namedWindow', dialogId: theDialogId}, '*');
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
                            return supported || mime.type == type;
                        }, supported);
                    }, false);
                }
                var dialogObj = evt.data.downloader;
                dialogObj.downloader = true;
                if(isMimeSupported(mime)){
                    /* Chrome */
                    _createDialog(dialogObj, evt.source);
                } else {
                    var url = dialogObj.url;
                    delete dialogObj.url;
                    var difr = document.createElement('iframe');
                    difr.src=url;
                    difr.setAttribute('id', 'testdifr');
                    tabWindow.appendChild(utils.wrapIframe(difr, true));
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
                        } else {
                            isDialogAlreadyOpened = true;
                            difr.width=0;
                            difr.height=0;
                        }
                        _createDialog(dialogObj, evt.source, difr);
                    } else {
                        difr.parentNode.classList.add('minimized');
                    }
                    if(ie){
                        /* IE11 */
                        difr.contentWindow.addEventListener('DOMContentLoaded', (function(dialogConfig, evtSource, ifr, doc) {
                            function checkPDF(remains){
                                try {
                                    var activeElementTagname = doc.activeElement.tagName.toLocaleLowerCase();
                                    if (activeElementTagname === 'object') {
                                        if(!isDialogAlreadyOpened){
                                            dialog.classList.remove('minimized');
                                            dialogPolyfill.reposition(dialog);
                                            ifr.focus();  
                                            //_createDialog(dialogConfig, evtSource, ifr);
                                        }                                        
                                    } else if(activeElementTagname === 'body'){
                                        /* body: HTML or download */
                                        if(doc.activeElement.childNodes.length>0){
                                            /* HTML */
                                            if(!isDialogAlreadyOpened){
                                                dialog.classList.remove('minimized');
                                                dialogPolyfill.reposition(dialog);
                                            }
                                        } else {
                                            /* download */
                                            dialog.closeDialog(ifr.dataset.dialogId);
                                            if(!isDialogAlreadyOpened){}
                                        }
                                    } else {
                                        //unknown active element, activeElementTagname
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
                        // NOT IE browser
                        function downloadListener (){
                            try {
                                var difrProtocol = difr.contentWindow.location.protocol;
                                if(difr.src.substr(0, difrProtocol.length) === difrProtocol){
                                    //browser is Chrome or Edge
                                    _createDialog(dialogObj, evt.source, difr);
                                } else {
                                    /* downloading file in Firefox */
                                    tabWindow.removeChild(difr.parentNode);
                                }
                            } catch (e) {
                                //browser is Firefox
                                difr.removeEventListener('load', downloadListener);
                                _createDialog(dialogObj, evt.source, difr);
                            }
                        }
                        difr.addEventListener('load', downloadListener);
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
                    var doc = ifr.contentDocument ? ifr.contentDocument : ifr.document;
                    if(doc && doc.title) {
                        ifr.dataset.title=doc.title;
                    } else if(!oldTitle){
                        //ifr.dataset.title = 'No title # ' + noTitleIndex;
                        ifr.dataset.title = '....';
                    }
                    dialog.updateBreadcrumbs();
                }
                var iWin = ifr.contentWindow || ifr;
                if(!!iWin.isDialogCloseable){
                    return;
                }
                iWin.opener = ifrOpener;
                var doc = ifr.contentWindow ? ifr.contentDocument : ifr.document;
                utils.overrideCloseFunction(doc);
                iWin.isDialogCloseable = true;
            } catch(error){
                if(!ifr.dataset.title) ifr.dataset.title = '.....';
                dialog.updateBreadcrumbs();
            }
        }
        function getDefaultTopDialog(){
            var dialog = document.createElement("dialog");
            dialog.setAttribute("role", "topdialog");
            dialog.classList.add('topdialog');
            var tabbedDiv = document.createElement("div");
            tabbedDiv.classList.add("tabbed");
            var nav = document.createElement("nav");
            nav.classList.add('SIModalTitle');
            var dialogtabs = document.createElement('div');
            dialogtabs.classList.add('dialogtabs');
            nav.appendChild(dialogtabs);
            //buttons
            var dialogButtons = document.createElement('div');
            dialogButtons.classList.add('dialogbuttons');
            dialogButtons.addEventListener('mousedown', function(event){
                event.stopPropagation();
            });
            var xButton = document.createElement('div');
            xButton.classList.add('xbutton');
            xButton.classList.add('SIModalXButton');
            xButton.addEventListener('click', function(){ 
                postMessage({ dialog:{ close: 0 } }, '*');
            });
            dialogButtons.appendChild(xButton);
            /*
            var resizer = document.createElement('div');
            resizer.classList.add('resizer');
            resizer.classList.add('SIModalXButton');
            dialogButtons.appendChild(resizer);
            */
            nav.appendChild(dialogButtons);
            var tabWindow = document.createElement("div");
            tabWindow.classList.add("tabwindow");            
            tabbedDiv.appendChild(nav);
            tabbedDiv.appendChild(tabWindow);
            dialog.appendChild(tabbedDiv);
            //resier
            //bottom-right
            var resizeBR = document.createElement('div');
            resizeBR.classList.add('dialog-resize-br');
            var resizeBRMarker = document.createElement('div');
            resizeBRMarker.classList.add('dialog-resize-br-marker');
            resizeBR.appendChild(resizeBRMarker);
            dialog.appendChild(resizeBR);
            //middle-left
            var resizeML = document.createElement('div');
            resizeML.classList.add('dialog-resize-ml');
            var resizeMLMarker = document.createElement('div');
            resizeMLMarker.classList.add('dialog-resize-ml-marker');
            resizeML.appendChild(resizeMLMarker);
            dialog.appendChild(resizeML);
            //middle-right
            var resizeMR = document.createElement('div');
            resizeMR.classList.add('dialog-resize-mr');
            var resizeMRMarker = document.createElement('div');
            resizeMRMarker.classList.add('dialog-resize-mr-marker');
            resizeMR.appendChild(resizeMRMarker);
            dialog.appendChild(resizeMR);
            //bottom-middle
            var resizeBM = document.createElement('div');
            resizeBM.classList.add('dialog-resize-bm');
            var resizeBMMarker = document.createElement('div');
            resizeBMMarker.classList.add('dialog-resize-bm-marker');
            resizeBM.appendChild(resizeBMMarker);
            dialog.appendChild(resizeBM);
            
            document.body.appendChild(dialog);
            //resizeHandlerPolyfill(tabbedDiv, true);
            return dialog;
        }
        window.addEventListener('message', _messageListerner, false);
        ///// DRAG-RESIZE  /////
        (function(elem){
            if(!elem) return;
            var moveHandler = elem.querySelector('nav');
            var dragresize = new DragResize('dialog-resize',
                {
                    enabled: true,
                    handles: ['ml', 'mr', 'bm', 'br'],
                    //element: elem,
                    minWidth: 200,
                    minHeight: 200,
                    allowBlur: false,
                    minLeft: -9999,
                    //minTop: 0,
                    //maxLeft: 1800,
                    //maxTop: 1800,
                    zIndex: window.getComputedStyle(elem, null).getPropertyValue("z-index")
                }
            );

            dragresize.isElement = function(elm){
                //if (elm.className && elm.className.indexOf('drsElement') > -1)
                var isElement = elm === elem;
                if(isElement){
                    var rect = elem.getBoundingClientRect();
                    elem.style.left = rect.left+'px';
                    elem.style.top = rect.top+'px';
                    elem.style.margin = 0;
                    //dragresize.select(elem);
                    dragresize.elmX = parseInt(elem.style.left);
                    dragresize.elmY = parseInt(elem.style.top);
                    dragresize.elmW = elem.clientWidth || elem.offsetWidth;
                    dragresize.elmH = elem.clientHeight || elem.offsetHeight;
                }
                return isElement;
            };
            dragresize.isHandle = function(elm){
                //if (elm.className && elm.className.indexOf('drsMoveHandle') > -1)
                return elm === moveHandler;
            };

            //dragresize.resizeHandleSet = function(elm, show) {}
            //dragresize.ondragfocus = function() {};
            dragresize.ondragstart = function(isResize) {
                var iframes = elem.querySelectorAll('iframe');
                for(var k=iframes.length; k--;){
                    iframes[k].style.pointerEvents = 'none';
                }
                if(isResize){

                } else {

                }
            };
            //dragresize.ondragmove = function(isResize) {};
            dragresize.ondragend = function(isResize) {
                elem.style.margin='auto';
                elem.style.top = null;
                elem.style.left = null;
                dialogPolyfill.reposition(elem);
                var iframes = elem.querySelectorAll('iframe');
                for(var k=iframes.length; k--;){
                    iframes[k].style.pointerEvents = null;
                }
                if(isResize){
                    var activeIframe = dialog.getActiveIframe();
                    if(activeIframe){
                        activeIframe.dataset.dwidth=elem.style.width;
                        activeIframe.dataset.dheight=elem.style.height;
                        if(activeIframe.dataset.watirName){
                            utils.saveSize(activeIframe.dataset.watirName, elem.style.width, elem.style.height );
                        }
                    }
                }
            };
            dragresize.ondragblur = function() {};
            dragresize.apply(document);
        })(dialog);
    };
    domReady(_init);
    self.dialogInitialized = true;
    self.dispatchEvent(utils.createEvent('dialog-initialized'));
})();