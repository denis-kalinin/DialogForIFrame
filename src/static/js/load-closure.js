function close() { window.top.postMessage({dialog:null}, '*'); }(function(loadHandler){if(!loadHandler) throw new Error("\"loadHandler\" is null or undefined. If \"loadHandler\" is a function expression put it somewhere above.");if (!loadHandler instanceof Function) throw new Error('loadHandler is not a function.');var funcName = loadHandler.name;if(!funcName){var result = /^function\s+([\w\$]+)\s*\(/.exec( loadHandler.toString() );if(!result) throw new Error("Function expression in IE! DECLARE loadHandler: \"function onPageLoad(){...}\", DON'T express like \"var onPageLoad=function(){...}\"");funcName = result[1];}if(!window.opener){window[funcName] = function(){window.addEventListener('message', function(){loadHandler.apply(window);}, false);window.top.postMessage({dialog:{update:true}}, '*');}} else {loadHandler.apply(window);}})(onPageLoad);