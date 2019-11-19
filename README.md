Window-wide dialog (native or polyfill) to show iframe within it.

Demo: https://denis-kalinin.github.io/DialogForIFrame/

Usage:
```javascript
new DialogForIframe('wizard.html', 'dialogTemplate');

```
`wizard.html` - URL to open in the dialog
`dialogTemplate` - ID of the template element where dialog is defined
```html
<template id="dialogTemplate">
    <dialog style="width:100%;height100%;padding:0;border:0">
        <div class="xbutton" role="xButton"></div>
    </dialog>
</template>
```

From iframe send message to the parent window to open new dialog:
```javascript
window.parent.postMessage('http://example.com', '*');
```
