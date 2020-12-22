(function() {
    function domReady(callbackFunction){
        if(document.readyState != 'loading')
          callbackFunction();
        else
          document.addEventListener('DOMContentLoaded', callbackFunction);
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
                script.textContent = 'function close(){function getTopWindow(checkWindow){if(!checkWindow) checkWindow = window.self; try{ if(checkWindow!=window.top && checkWindow.parent && !checkWindow.parent.noDialog) return getTopWindow(checkWindow.parent); } catch(e){} return checkWindow;} try{ if((self.AL ? !self.AL.detaching : true) && self.opener && self.opener.onOpeneeClosed) self.opener.onOpeneeClosed() } catch(e){} getTopWindow().postMessage({dialog:null},"*");}';
                doc.head.appendChild(script);
            }
        },
        /**
         *  gets default value of an iframe without height
         */
        getZeroHeight: function() {
            return '180px';
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
            if(isMinimized) {
                ifrWrapper.classList.add('minimized');
            }
            var enterFocusInput = document.createElement('input');
            enterFocusInput.addEventListener('focus', function(event){
                event.target.parentNode.querySelector('span[data-focus-direction="fromEnd"]').focus();
            });
            enterFocusInput.classList.add('focusLocker');
            ifrWrapper.appendChild(enterFocusInput);

            
            var forwardCircle = document.createElement('span');
            forwardCircle.classList.add('forwardcircle');
            forwardCircle.setAttribute('tabindex', '-1');
            forwardCircle.dataset.focusDirection='fromStart';
            ifrWrapper.appendChild(forwardCircle);
            

            ifrWrapper.appendChild(iframe);


            var backcircleInput = document.createElement('span');
            backcircleInput.classList.add('backcircle')
            backcircleInput.setAttribute('tabindex', '-1');
            backcircleInput.dataset.focusDirection='fromEnd'
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
            if (typeof(Storage) !== 'undefined' && name && width && height) {
                localStorage.setItem('topdialog_'+name, JSON.stringify({width: width, height: height}));
            }
        },
        /**
         * Gets size of the dialog
         * @param {string} name dialog's name
         * @throws error if not found or invalid format
         */
        getSize: function(name){
            if (typeof(Storage) !== 'undefined' && name ) {
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

        dialog.maximized = false;
        dialog.deriveSize = function(iframe){
            if(dialog.maximized){
                dialog.style.width = null;
                dialog.style.height = null;
            } else {
                if(iframe.dataset.dwidth) dialog.style.width=iframe.dataset.dwidth;
                else dialog.style.width=null;
                if(iframe.dataset.dheight) dialog.style.height=iframe.dataset.dheight;
                else dialog.style.height=null; 
            }
        }

        var dialogButtons = dialog.querySelector('nav > .dialogbuttons');
        var btn = document.createElement('div');
        var svgElem = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        var useElem = document.createElementNS('http://www.w3.org/2000/svg', 'use');
        useElem.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '#icon-maximize');
        //svgElem.classList.add("icon", "sm");
        svgElem.appendChild(useElem);
        btn.appendChild(svgElem);
        btn.addEventListener('click', function(){
            dialog.maximize(!dialog.maximized);
        });
        btn.classList.add('maximizeButton', 'svgButton');
        dialogButtons.appendChild(btn);
        dialog.maximize = function(maxSize){
            dialog.maximized = maxSize;
            useElem.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', dialog.maximized ? '#icon-restore' : '#icon-maximize');
            var activeIframe = dialog.getActiveIframe();
            if(activeIframe){
                dialog.deriveSize(activeIframe);
                dialogPolyfill.reposition(dialog);
            }
        }

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
                        dialog.style[sizeName] = dialog.maximized ? null : mySize;
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
                var tifr = crumbs[k].iframe;
                tifr.dispatchEvent(utils.createEvent('dialog-blur'));
                //FIXME minimize active only
                tifr.parentNode.classList.add('minimized');
            }
            var ifr = crumbs[activeCrumbIndex].iframe;
            dialog.deriveSize(ifr);      
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
                            //downloader location change FIX
                            ifr.parentNode.classList.remove('minimized');
                            //DETACHABLE
                            var dialogbuttons = dialog.querySelector('nav > .dialogbuttons');
                            //var popoutButtons = dialog.querySelectorAll('nav > .dialogbuttons > .popoutButton');
                            var popoutButton = dialog.querySelector('nav > .dialogbuttons > .popoutButton');
                            if(popoutButton) popoutButton.parentNode.removeChild(popoutButton);
                            if(!ifr.dataset.detachable){
                                /*
                                if(popoutButtons && popoutButtons.length > 0){
                                    for( var k = popoutButtons.length; k-- > 0;){
                                        dialogbuttons.removeChild(popoutButtons[k]);
                                    }
                                }
                                */
                            } else {
                                //if(!popoutButton){
                                    var popoutButton = document.createElement('div');
                                    var svgElem = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                                    var useElem = document.createElementNS('http://www.w3.org/2000/svg', 'use');
                                    useElem.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '#icon-external');
                                    svgElem.appendChild(useElem);
                                    popoutButton.appendChild(svgElem);
                                    popoutButton.classList.add('popoutButton', 'svgButton');
                                    popoutButton.addEventListener('click', (function(popoutIframe){
                                        return function(){
                                            if(popoutIframe.contentWindow.AL)
                                                popoutIframe.contentWindow.AL.detachWrapper();
                                        };
                                    })(ifr));
                                    dialogbuttons.appendChild(popoutButton);
                                    /*
                                    var popoutButton = document.createElement('div');
                                    popoutButton.classList.add('popoutButton');
                                    popoutButton.onclick = function(){
                                        if(ifr.contentWindow.AL)
                                            ifr.contentWindow.AL.detachWrapper();
                                    }
                                    dialogbuttons.appendChild(popoutButton);
                                    */
                                //}
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
                //openeeClosed API
                var iframeOpener = crumbs[k].opener;
                try{
                    if(iframeOpener && iframeOpener.onOpeneeClosed){
                        iframeOpener.onOpeneeClosed();
                    }
                } catch(e) {}
                iframeToRemove.dispatchEvent(utils.createEvent('dialog-destroyed'));
                tabWindow.removeChild(iframeToRemove.parentNode);
                if(dialog.activeDialogId == iframeToRemoveId){
                    activeDialogToRemoveCrumbIndex = k;
                }
            }
            function setFocusOnOpener(ifrOpener){
                try{
                    if(ifrOpener && ifrOpener.topdialog && ifrOpener.topdialog.support &&
                        ifrOpener.topdialog.support.restoreFocusAfterDialogClosed){
                        ifrOpener.topdialog.support.restoreFocusAfterDialogClosed.apply(ifrOpener);
                    }
                } catch(e) {}
            }
            var ifrOpener;
            if(activeDialogToRemoveCrumbIndex>-1){
                ifrOpener = crumbs[activeDialogToRemoveCrumbIndex].opener;
            }
            if(nextCrumbIndex>-1){
                if(activeDialogToRemoveCrumbIndex>-1){
                    var ifr = crumbs[nextCrumbIndex].iframe;
                    dialog.deriveSize(ifr);        
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
         *  size: { width: string, height:string },
         *  openerCallback: string
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
                    // pillars won't work without that:
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
                    //if(crumbIndex<0) throw new Error('crumbIndex not found for', evt.source);
                    if(crumbIndex>-1){
                        var iIfr = crumbs[crumbIndex].iframe;
                        var iIfrWin = iIfr.contentWindow || iIfr;
                        iIfrWin.opener = crumbs[crumbIndex].opener;
                        var title = iIfr.contentWindow ? iIfr.contentDocument.title : iIfr.document.title;
                        iIfr.dataset.title = title;
                        dialog.updateBreadcrumbs();
                        iIfrWin.postMessage({dialogResult:'updated'}, '*');
                    } else { //this is topdialog - it is still hidden
                        evt.source.postMessage({dialogResult:'update'}, '*');
                    }
                } else if (evt.data.dialog && evt.data.dialog.resizeBy){
                    if(!dialog.maximized){
                        var resizeByVal = evt.data.dialog.resizeBy;
                        var crumbIndex = dialog.getCrumbIndex(evt.source);
                        if(crumbIndex>-1){
                            var iIfr = crumbs[crumbIndex].iframe;
                            var dialogH = dialog.clientHeight + resizeByVal.y;
                            var dialogW = dialog.clientWidth + resizeByVal.x;
                            dialog.style.width=dialogW+'px';
                            dialog.style.height=dialogH+'px';
                        }
                    }
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
                                    try {
                                        crumbs[i].opener.dispatchEvent(utils.createEvent('dialog-loaded'));
                                    } catch(e){}
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
                // downloader dialog has a drawback that opener and close() are not available in onload
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
            var dialog = document.createElement('dialog');
            dialog.setAttribute('role', 'topdialog');
            dialog.classList.add('topdialog');
            //create SVG
            var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            //svg.setAttributeNS('http://www.w3.org/1999/xlink', 'xmlns:xlink', '');//xmlns:xlink="http://www.w3.org/1999/xlink"
            svg.setAttribute('version', '1.1');//version="1.1" 
            svg.setAttribute('aria-hidden', 'true');//aria-hidden="true"
            svg.style.display='none'; // style="position: absolute; width: 0; height: 0; overflow: hidden;"
            svg.innerHTML = `
            <defs>
            <symbol id="icon-profile" viewBox="0 0 32 32">
            <path d="M16 0c-8.84 0-16 7.16-16 16s7.16 16 16 16 16-7.16 16-16-7.16-16-16-16zM16 4.8c2.648 0 4.8 2.152 4.8 4.8 0 2.656-2.152 4.8-4.8 4.8s-4.8-2.144-4.8-4.8c0-2.648 2.152-4.8 4.8-4.8zM16 27.52c-4.008 0-7.528-2.048-9.6-5.152 0.040-3.176 6.408-4.928 9.6-4.928s9.552 1.752 9.6 4.928c-2.072 3.104-5.592 5.152-9.6 5.152z"></path>
            </symbol>
            <symbol id="icon-help" viewBox="0 0 32 32">
            <path d="M16.001 0c-8.834 0-16 7.157-16 15.992 0 8.843 7.166 16.008 16 16.008 8.838 0 15.999-7.166 15.999-16.008 0-8.834-7.16-15.992-15.999-15.992zM17.141 24.894c-0.372 0.331-0.802 0.497-1.29 0.497-0.505 0-0.945-0.163-1.321-0.49s-0.565-0.784-0.565-1.371c0-0.521 0.182-0.959 0.546-1.315s0.81-0.533 1.34-0.533c0.521 0 0.959 0.178 1.315 0.533s0.534 0.794 0.534 1.315c-0.001 0.579-0.187 1.034-0.559 1.364zM21.774 13.407c-0.285 0.529-0.625 0.986-1.018 1.371-0.392 0.385-1.097 1.032-2.115 1.941-0.281 0.257-0.507 0.482-0.676 0.676s-0.296 0.372-0.378 0.534c-0.083 0.161-0.147 0.323-0.192 0.484s-0.113 0.445-0.205 0.85c-0.157 0.86-0.649 1.29-1.476 1.29-0.43 0-0.791-0.14-1.086-0.422-0.293-0.281-0.44-0.699-0.44-1.253 0-0.694 0.108-1.296 0.323-1.805 0.214-0.509 0.5-0.955 0.855-1.34s0.835-0.841 1.44-1.371c0.529-0.463 0.912-0.813 1.147-1.048s0.434-0.499 0.595-0.788c0.162-0.29 0.242-0.604 0.242-0.943 0-0.662-0.245-1.22-0.738-1.674s-1.127-0.682-1.905-0.682c-0.91 0-1.58 0.229-2.010 0.688s-0.793 1.135-1.091 2.028c-0.282 0.935-0.816 1.402-1.6 1.402-0.463 0-0.854-0.163-1.173-0.49s-0.477-0.68-0.477-1.061c0-0.785 0.252-1.582 0.757-2.388s1.241-1.474 2.209-2.003c0.967-0.529 2.097-0.795 3.386-0.795 1.199 0 2.258 0.222 3.175 0.664s1.627 1.044 2.128 1.805c0.5 0.761 0.75 1.588 0.75 2.481 0.001 0.702-0.142 1.318-0.427 1.847z"></path>
            </symbol>
            <symbol id="icon-setup" viewBox="0 0 32 32">
            <path d="M30.306 12.525l-2.507-0.319c-0.207-0.636-0.461-1.249-0.759-1.832l1.548-1.993c0.627-0.807 0.553-1.945-0.163-2.639l-2.1-2.1c-0.7-0.723-1.839-0.795-2.646-0.169l-1.991 1.548c-0.583-0.297-1.196-0.552-1.834-0.759l-0.319-2.503c-0.12-1.004-0.972-1.76-1.981-1.76h-2.987c-1.009 0-1.861 0.756-1.981 1.756l-0.319 2.507c-0.637 0.207-1.251 0.46-1.833 0.759l-1.992-1.548c-0.805-0.625-1.944-0.553-2.639 0.163l-2.1 2.099c-0.723 0.701-0.796 1.84-0.169 2.648l1.548 1.992c-0.299 0.583-0.552 1.196-0.759 1.832l-2.503 0.319c-1.004 0.12-1.76 0.972-1.76 1.981v2.987c0 1.009 0.756 1.861 1.756 1.981l2.507 0.319c0.207 0.636 0.461 1.25 0.759 1.832l-1.548 1.993c-0.627 0.807-0.553 1.945 0.163 2.639l2.1 2.1c0.701 0.721 1.839 0.793 2.646 0.168l1.992-1.548c0.583 0.299 1.196 0.553 1.832 0.759l0.319 2.501c0.12 1.007 0.972 1.763 1.981 1.763h2.987c1.009 0 1.861-0.756 1.981-1.756l0.319-2.507c0.636-0.207 1.25-0.461 1.832-0.759l1.993 1.548c0.807 0.627 1.945 0.553 2.639-0.163l2.1-2.1c0.723-0.701 0.796-1.839 0.169-2.646l-1.548-1.992c0.299-0.583 0.553-1.196 0.759-1.832l2.501-0.319c1.004-0.12 1.76-0.972 1.76-1.981v-2.987c0.001-1.009-0.755-1.861-1.755-1.981zM16.063 22.667c-3.676 0-6.667-2.991-6.667-6.667s2.991-6.667 6.667-6.667 6.667 2.991 6.667 6.667-2.991 6.667-6.667 6.667z"></path>
            </symbol>
            <symbol id="icon-external" viewBox="0 0 375 375">
            <g><polygon points="337.5,187.5 337.5,337.5 37.5,337.5 37.5,37.5 187.5,37.5 187.5,0 0,0 0,375 375,375 375,187.5 "/></g><g><polygon points="225,0 279,54 172.7,160.3 214.7,202.3 321,96 375,150 375,0 "/></g>
            </symbol>
            <symbol id="icon-maximize" viewBox="0 0 375 375">
            <g><path d="M0,0v375h375V0H0z M337.5,337.5h-300v-300h300V337.5z"/></g>
            </symbol>
            <symbol id="icon-restore" viewBox="0 0 375.1 375.1">
            <path d="M281.35,93.8V0H0.05v281.3h93.7v93.8h281.3V93.8H281.35z M37.55,243.8V37.5h206.3v206.3H37.55z M337.55,337.5h-206.2 v-56.3h150v-150h56.2V337.5z"/>
            </symbol>
            </defs>`;
            dialog.appendChild(svg);
            var tabbedDiv = document.createElement('div');
            tabbedDiv.classList.add('tabbed');
            var nav = document.createElement('nav');
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
            /*
            var maximizeButton = document.createElement('div');
            maximizeButton.classList.add('maximizeButton');
            maximizeButton.onclick = function(){
                if(ifr.contentWindow.AL)
                    ifr.contentWindow.AL.detachWrapper();
            }
            dialogButtons.appendChild(maximizeButton);
            */
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
            var tabWindow = document.createElement('div');
            tabWindow.classList.add('tabwindow');            
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
            //bottom-left
            var resizeBL = document.createElement('div');
            resizeBL.classList.add('dialog-resize-bl');
            dialog.appendChild(resizeBL);
            //top-right
            var resizeTR = document.createElement('div');
            resizeTR.classList.add('dialog-resize-tr');
            dialog.appendChild(resizeTR);
            //top-left
            var resizeTL = document.createElement('div');
            resizeTL.classList.add('dialog-resize-tl');
            dialog.appendChild(resizeTL);
            //left
            var resizeML = document.createElement('div');
            resizeML.classList.add('dialog-resize-ml');
            dialog.appendChild(resizeML);
            //right
            var resizeMR = document.createElement('div');
            resizeMR.classList.add('dialog-resize-mr');
            dialog.appendChild(resizeMR);
            //bottom
            var resizeBM = document.createElement('div');
            resizeBM.classList.add('dialog-resize-bm');
            dialog.appendChild(resizeBM);
            //top
            var resizeTM = document.createElement('div');
            resizeTM.classList.add('dialog-resize-tm');
            dialog.appendChild(resizeTM);
            
            document.body.appendChild(dialog);
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
                    handles: ['ml', 'mr', 'bm', 'br', 'bl', 'tr', 'tl', 'tm'],
                    //element: elem,
                    minWidth: 200,
                    minHeight: 200,
                    allowBlur: false,
                    minLeft: -9999,
                    //minTop: 0,
                    //maxLeft: 1800,
                    //maxTop: 1800,
                    zIndex: window.getComputedStyle(elem, null).getPropertyValue('z-index')
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
                        dialog.maximize(false);
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