!function(e){var t={};function a(o){if(t[o])return t[o].exports;var i=t[o]={i:o,l:!1,exports:{}};return e[o].call(i.exports,i,i.exports,a),i.l=!0,i.exports}a.m=e,a.c=t,a.d=function(e,t,o){a.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:o})},a.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},a.t=function(e,t){if(1&t&&(e=a(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var o=Object.create(null);if(a.r(o),Object.defineProperty(o,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var i in e)a.d(o,i,function(t){return e[t]}.bind(null,i));return o},a.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return a.d(t,"a",t),t},a.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},a.p="",a(a.s=1)}([,function(e,t,a){"use strict";a.r(t);a(2),a(3),a(4)},function(e,t,a){},function(e,t,a){},function(e,t){var a,o,i;o=!1,i=[],a=function(){if(!0!==o){o=!0;var e=document.body.querySelector("dialog[role=topdialog]");e||(e=function(){var e=document.createElement("dialog");e.setAttribute("role","topdialog");var t=document.createElement("div");t.classList.add("tabbed");var a=document.createElement("nav");a.classList.add("SIModalTitle");var o=document.createElement("div");return o.classList.add("tabwindow"),t.appendChild(a),t.appendChild(o),e.appendChild(t),document.body.appendChild(e),e}());var t=e.querySelector(".tabwindow"),a=0,n=document.body.style.overflow;e.addEventListener("close",(function(){for(document.body.style.overflow=n;i.length>0;)t.removeChild(i.pop())})),window.dialogPolyfill.registerDialog(e),window.addEventListener("message",(function(a){if(a.data&&a.data.hasOwnProperty("dialog"))if(a.data.dialog&&(a.data.dialog.url||a.data.dialog.html))d(a.data.dialog,a.source);else if(a.data.dialog&&a.data.dialog.close)c(a.data.dialog.close);else if(a.data.dialog&&a.data.dialog.update){if(!(v=l(a.source)))throw new Error("IframeAndTabIndex not found for",a.source);for(var o=v.tabIndex,n=0;n<i.length;n++)if(o==n){var r=i[n].iframe,f=r.contentWindow||r;f.opener=i[n].opener;var m=r.contentWindow?r.contentDocument.title:r.document.title;r.dataset.title=m,r.dataset.loaded=!0,u(r.dataset.dialogId,!0),f.postMessage({},"*")}}else if(a.data.dialog&&a.data.dialog.title){var p=(v=l(a.source)).iframe;p.dataset.title=a.data.dialog.title,p.dataset.loaded=!0,u(p.dataset.dialogId,!0)}else if(a.data.dialog&&a.data.dialog.windowName)d(a.data.dialog,a.source),a.source.postMessage({},"*");else{var v;(v=l(a.source))&&s(v)}else if(a.data&&a.data.hasOwnProperty("downloader")){var g=a.data.downloader.mime,h=a.data.downloader;if(h.ignoreOnLoad=!0,(L=g)&&Array.prototype.reduce.call(navigator.plugins,(function(e,t){return e||Array.prototype.reduce.call(t,(function(e,t){return console.debug("browser plugin mime:",t.type),e||t.type==L}),e)}),!1))console.info("MIME",g,"supported!"),d(h,a.source);else{var y=h.url;delete h.url;var b=document.createElement("iframe");b.src=y,b.setAttribute("id","testdifr");var w=function(){var e=-1,t=window.navigator.userAgent,a=t.indexOf("MSIE "),o=t.indexOf("Trident/");if(a>0)e=parseInt(t.substring(a+5,t.indexOf(".",a)),10);else if(o>0){var i=t.indexOf("rv:");e=parseInt(t.substring(i+3,t.indexOf(".",i)),10)}return e>-1?e:void 0}(),C=!1;w?0==i.length?(e.style.width="0px",e.style.height="0px",e.style.position="absolute",e.style.top="10px",e.style.left="10px",e.style.display="block",e.querySelector("nav").style.display="none",t.appendChild(b)):(C=!0,b.width=0,b.height=0,t.appendChild(b),d(h,a.source,b)):(b.classList.add("inactive"),b.classList.add("minimized"),t.appendChild(b)),w?(console.info("browser: IE",w),b.contentWindow.addEventListener("DOMContentLoaded",function(a,o,i,n){console.debug("window - DOMContentLoaded - capture"),setTimeout((function r(l){console.debug("waitForActiveElement :",l);try{console.debug("activeElement",n.activeElement),"object"===n.activeElement.tagName.toLocaleLowerCase()?C||(e.style.removeAttribute("width"),e.style.removeAttribute("height"),e.style.removeAttribute("position"),e.style.removeAttribute("top"),e.style.removeAttribute("left"),e.style.removeAttribute("display"),e.querySelector("nav").style.removeAttribute("display"),d(a,o,i)):C?c(i.dataset.dialogId):(e.style.removeAttribute("width"),e.style.removeAttribute("height"),e.style.removeAttribute("position"),e.style.removeAttribute("top"),e.style.removeAttribute("left"),e.style.removeAttribute("display"),e.querySelector("nav").style.removeAttribute("display"),console.debug("Dialog before removing downaload iframe",e),t.removeChild(i))}catch(e){l>0?setTimeout(r,1e3,l-1):console.error(e)}}),500,30)}(h,a.source,b,b.contentDocument),!0)):(console.info("browser: NOT IE"),b.addEventListener("load",(function e(){try{var t=b.contentWindow.location.protocol;b.src.substr(0,t.length)===t&&(console.info("browser is Chrome or Edge"),d(h,a.source,b))}catch(t){console.info("Browser is Firefox"),b.removeEventListener("load",e),d(h,a.source,b)}})))}}var L}),!1)}function d(o,n,d){document.body.style.overflow="hidden";var l=d||document.createElement("iframe");if(l.dataset.dialogId=++a,l.dataset.shortcutStopPropagation="",o.name&&(l.dataset.watirName=o.name),o.title&&(l.dataset.title=o.title),o.size?r(o.size.width,o.size.height,l):r(null,null,l),o.minimizeOpener&&n&&n.frameElement&&(n.frameElement.dataset.minimzed="1"),i.length>0)for(var s=0;s<i.length;s++){var c=i[s].iframe.dataset.minimzed?"minimized":"inactive";i[s].iframe.classList.add(c)}else e.showModal();dialogPolyfill.reposition(e),i[i.length]={iframe:l,opener:n},d?(l.classList.remove("inactive"),l.classList.remove("minimized")):t.appendChild(l);try{l.contentWindow.opener=n}catch(e){}if(o.windowName){try{l.contentWindow.name=o.windowName}catch(e){}l.name=o.windowName}o.url?l.src=o.url:o.html&&(l.contentDocument.open(),l.contentDocument.write(o.html),l.contentDocument.close()),u(l.dataset.dialogId,!!o.ignoreOnLoad)}function r(t,a,o){var i=t?isNaN(t)?t:t+"px":null;if(o.dataset.dwidth=i,e.style.width=i,!a)return e.style.height=null,void(o.dataset.dheight=null);if(isNaN(a)){var n=a.replace(/\D+/g,"");if(isNaN(n))return e.style.height=null,void(o.dataset.dheight=null);if(parseInt(n,10)>0)return e.style.height=a,void(o.dataset.dheight=a);var d="180px";return e.style.height=d,void(o.dataset.dheight=d)}if(parseInt(a,10)>0)return d=a+"px",e.style.height=d,void(o.dataset.dheight=d);d="180px",e.style.height=d,o.dataset.dheight=d}function l(e){for(var t=0;t<i.length;t++){var a=i[t].iframe;if(a.contentWindow==e)return{iframe:a,tabIndex:t}}}function s(a){for(;t.lastChild;){if(t.lastChild===a.iframe){t.removeChild(t.lastChild);break}t.removeChild(t.lastChild)}if(i.splice(a.tabIndex),i.length>0){var o=i[i.length-1].iframe;o.classList.remove("inactive"),o.classList.remove("minimized"),e.style.width=o.dataset.dwidth,e.style.height=o.dataset.dheight,dialogPolyfill.reposition(e),u(o.dataset.dialogId,!0)}else e.close()}function c(e){for(var t=0;t<i.length;t++)if(i[t].iframe.dataset.dialogId==e)return void s({iframe:i[t].iframe,tabIndex:t})}function u(t,a){console.debug("redrawing breadcrumbs, ignoreOnLoad",a);for(var o=e.querySelector("nav"),n=document.createDocumentFragment(),d=0;d<i.length;d++){var r=document.createElement("div");r.classList.add("crumb");var l=i[d].iframe;if(t!=l.dataset.dialogId){var c=l.dataset.title?l.dataset.title:"No title "+d,u=document.createTextNode(c);if(r.classList.add("SIModalTitlePrev"),r.appendChild(u),d<i.length-1){var f=d+1;r.addEventListener("click",function(e,t){return function(){s({iframe:e,tabIndex:t})}}(i[f].iframe,f)),r.setAttribute("title",c)}}else{var m=document.createElement("div");if(m.classList.add("xbutton"),m.classList.add("SIModalXButton"),m.addEventListener("click",(l.dataset.dialogId,function(){postMessage({dialog:{close:l.dataset.dialogId}},"*")})),r.appendChild(m),r.classList.add("active"),r.classList.add("SIModalTitleActive"),!l.dataset.loaded&&!l.dataset.title&&a){(v=document.createElement("div")).classList.add("lds-ellipsis");for(var p=0;p<4;p++)v.appendChild(document.createElement("div"));r.appendChild(v)}if(u=document.createTextNode(l.dataset.title?l.dataset.title:""),r.appendChild(u),l.classList.remove("minimized"),null==l.onload&&!a){console.debug("applying ifr.onload");var v=r.querySelector(".lds-ellipsis"),g=i[d].opener;l.onload=function(){try{l.dataset.loaded=!0;var e=l.contentWindow||l,t=l.contentWindow?l.contentDocument:l.document;if(v&&v.parentNode&&v.parentNode.removeChild(v),l.dataset.title||(t&&t.title?l.dataset.title=t.title:l.dataset.title="No title "+d),e.isDialogCloseable)return console.debug("ifr.onload is not applied because of isDialogCloseable==true"),void(u.nodeValue=l.dataset.title);console.debug("ifr.onload is applied!"),e.opener=g;var a=t.createElement("script");a.textContent="function close(){console.debug('close() is defined by topdialog');function getTopWindow(checkWindow){if(!checkWindow) checkWindow = window.self;try {if(checkWindow.parent && !checkWindow.parent.noDialog){return getTopWindow(checkWindow.parent);}}catch(e){}return checkWindow;};getTopWindow().postMessage({dialog:null},'*')}",t.head.appendChild(a),e.isDialogCloseable=!0}catch(e){l.dataset.title||(l.dataset.title="No title #"+d),v&&v.parentNode&&v.parentNode.removeChild(v)}u.nodeValue=l.dataset.title}}}n.appendChild(r)}for(;o.lastChild;)o.removeChild(o.lastChild);o.appendChild(n)}},"loading"!=document.readyState?a(event):document.addEventListener("DOMContentLoaded",a)}]);