export class DialogForIFrame {
    /**
     * 
     * @param {HTMLTemplateElement | string} dialogTemplate 
     */
    constructor(dialogTemplate){
        if(!!dialogTemplate) throw "Invalid argument dialogTemplate: undefined or null";
        let _dialogTemplate;
        if(dialogTemplate instanceof string){
            _dialogTemplate = document.getElementById(dialogTemplate);
        } else if (dialogTemplate instanceof HTMLTemplateElement) {
            _dialogTemplate = dialogTemplate
        } else {
            throw "Unapproprieate type of dialogTemplate";
        }
        let dialog = _dialogTemplate.childNodes[0];
    }
}