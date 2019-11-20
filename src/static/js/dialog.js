(function(w) {
    function domReady(callbackFunction){
        if(document.readyState != 'loading')
          callbackFunction(event)
        else
          document.addEventListener("DOMContentLoaded", callbackFunction)
      }
    var dialogInitialized = false;
    function init() { 
        //document.removeEventListener( "DOMContentLoaded", arguments.callee, false );
        if(dialogInitialized===true) return;
        dialogInitialized = true;
        var dialog = document.body.querySelector('dialog');
        /* rememeber body overflow to restor it after dialog is closed */
        var bodyOverflow = document.body.style.overflow;
        dialog.addEventListener('close', function(){
                document.body.style.overflow = bodyOverflow;                      
                var iframeToDelete = dialog.querySelector('iframe');
                if(iframeToDelete) dialog.removeChild(iframeToDelete);
            });
        w.dialogPolyfill.registerDialog(dialog);
        function createDialog(iframeUrl){
            document.body.style.overflow = 'hidden';
            var iframe = document.createElement('iframe');
            iframe.src = iframeUrl;
            iframe.style.width = '100%';
            iframe.style.height = '100%';
            iframe.style.border = 0;
            dialog.appendChild(iframe);
            dialog.showModal();
        }
        function messageListerner(evt){
            if(evt.data && evt.data.hasOwnProperty('dialog')){
                if(evt.data.dialog && evt.data.dialog.url){
                    createDialog(evt.data.dialog.url);
                } else {
                    dialog.close();
                }
            }
        }
        w.addEventListener('message', messageListerner, false);
    };
    domReady(init);
})( window.self );
