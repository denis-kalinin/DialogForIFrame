Window-wide dialog (native or polyfill) to show iframe within it.

Demo: https://denis-kalinin.github.io/DialogForIFrame/

```html
<head>
    .....
    <!-- Dialog -->
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/dialog-polyfill@0.5.0/dist/dialog-polyfill.css" />
    <link rel="stylesheet" type="text/css" href="https://denis-kalinin.github.io/DialogForIFrame/static/css/dialog.css" />
    <script src="https://unpkg.com/dialog-polyfill@0.5.0/dist/dialog-polyfill.js"></script>
    <script src="https://denis-kalinin.github.io/DialogForIFrame/static/js/dialog.js"></script>
    ...
</head>
<body>
    ...
    <dialog style="width:95%;height100%;padding:0;border:0">
        <div class="xbutton" onclick="postMessage({dialog:null}, '*')"></div>
    </dialog>
</body>
```

From iframe send message to the parent window to open a new dialog:
```javascript
window.parent.postMessage('http://example.com', '*');
```
