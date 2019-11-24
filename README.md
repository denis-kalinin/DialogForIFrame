Window-wide dialog (native or polyfill) to show iframe within it.

Demo: https://denis-kalinin.github.io/DialogForIFrame/

```html
<head>
    .....
    <!-- Dialog -->
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/dialog-polyfill@0.5.0/dist/dialog-polyfill.css" />
    <link rel="stylesheet" type="text/css" href="https://denis-kalinin.github.io/DialogForIFrame/static/css/dialog.css" />
    <!-- order is important: polyfill before dialog.js -->
    <script src="https://unpkg.com/dialog-polyfill@0.5.0/dist/dialog-polyfill.js"></script>
    <script src="https://denis-kalinin.github.io/DialogForIFrame/static/js/dialog.js"></script>
    ...
</head>
<body>
    ...
    <dialog style="width:95%; height:90%; border:0; padding:0;">
        <div class="tabbed">
            <nav></nav>
            <div class="tabwindow"></div>
        </div>
    </dialog>
</body>
```
&ndash; set style to your dialog approprietely.

To open a new dialog send message from the iframe to the parent window (or `window.top`):
```javascript
window.parent.postMessage({dialog:{ur:'http://example.com'}}, '*');
```
