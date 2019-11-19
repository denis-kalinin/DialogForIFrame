//import { dialogPolyfill } from './dist/dialog-polyfill/dialog-polyfill'
class DialogForIFrame {
    /**
    * DialogForIframe is not esm enabled, because we need
    * to support IE11
    */
    /**
     * A Dialog (native or polyfill) to show iframe
     * @constructs DialogForIFrame
     * @param { string } iframeUrl
     * An URL to open in the iframe within the dialog
     * @param {HTMLTemplateElement | string} dialogTemplate
     * DOMElement or ID of a <template> where a <dialog> resides
     * @param { string } xButtonRole
     * The role attribute of the tag in a <dialog> that will close the dialog
     * when clicked.
     * @param { string } dialogCloseEventId
     */
    constructor(iframeUrl, dialogTemplate, xButtonRole = 'xButton', dialogCloseEventId = 'close-dialog'){
        if(!dialogTemplate) throw "Invalid argument dialogTemplate: undefined or null";
        let _dialogTemplate;
        if(typeof dialogTemplate == 'string' || dialogTemplate instanceof String){
            _dialogTemplate = document.getElementById(dialogTemplate);
        } else if (dialogTemplate instanceof HTMLTemplateElement) {
            _dialogTemplate = dialogTemplate
        } else {
            throw "Wrong type of dialogTemplate: string (id) or HTMLTemplateElement only";
        }
        let dialogTag = _dialogTemplate.content.cloneNode(true);
        document.body.appendChild(dialogTag);
        let dialogCollection = document.body.getElementsByTagName("dialog");
        /* rememeber body overflow to restor it after dialog is closed */
        const bodyOverflow = document.body.style.overflow;

        const dialog = dialogCollection[dialogCollection.length-1];
        dialog.addEventListener('close', () => {
            document.body.style.overflow = bodyOverflow;
            dialog.parentElement.removeChild(dialog);
        });
        dialogPolyfill.registerDialog(dialog);
        document.body.style.overflow = 'hidden';
        const iframe = document.createElement('iframe');
        iframe.src = iframeUrl;
        iframe.style.width = '95vw';
        iframe.style.height = '95vh';
        iframe.style.border = 0;
        dialog.appendChild(iframe);
        dialog.showModal();

        const dialogXButton = dialog.querySelector(`[role="${xButtonRole}"]`);
        //TODO maybe null
        dialogXButton.addEventListener('click', () => {
            dialog.close();
        });
    }
}
