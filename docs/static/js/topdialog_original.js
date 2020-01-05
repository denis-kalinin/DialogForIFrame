(function () {
    var polyfillCss = "dialog{position:absolute;left:0;right:0;width:-moz-fit-content;width:-webkit-fit-content;width:fit-content;height:-moz-fit-content;height:-webkit-fit-content;height:fit-content;margin:auto;border:solid;padding:1em;background:white;color:black;display:block}dialog:not([open]){display:none}dialog+.backdrop{position:fixed;top:0;right:0;bottom:0;left:0;background:rgba(0,0,0,0.1)}._dialog_overlay{position:fixed;top:0;right:0;bottom:0;left:0}dialog.fixed{position:fixed;top:50%;transform:translate(0, -50%)}";
    var dialogCss = "dialog::backdrop,dialog+.backdrop{position:fixed;top:0;left:0;right:0;bottom:0;background-color:rgba(0,0,0,0.5)}dialog+.backdrop{position:fixed;top:0;left:0;right:0;bottom:0;background-color:rgba(0,0,0,0.5)}dialog[role=topdialog]{width:95%;height:90%;border:0;padding:0}dialog nav{border:1px solid #ccc;background-color:#ccc;border-bottom-width:2px;height:2em;min-height:30px;display:flex}dialog nav .tab{border-left:1px solid #ccc;color:lightgrey;background-color:dimgray;flex-basis:100%;padding-left:0.5em;display:flex;align-items:center;text-overflow:ellipsis;white-space:nowrap;overflow:hidden}dialog nav .tab.active{background-color:inherit;color:inherit;min-width:28px;margin-right:30px}dialog nav .tab:first-child{border:none}dialog nav .tab .xbutton{display:none;width:24px;height:24px;position:absolute;top:3px;right:3px;border-radius:6px}dialog nav .tab.active .xbutton{display:block}dialog nav .tab .xbutton:hover{background-color:red}dialog nav .tab .xbutton:before,dialog nav .tab .xbutton:after{content:'';position:absolute;width:20px;height:4px;background-color:white;border-radius:2px;top:10px}dialog nav .tab .xbutton:before{-webkit-transform:rotate(45deg);-moz-transform:rotate(45deg);transform:rotate(45deg);left:2px}dialog nav .tab .xbutton:after{-webkit-transform:rotate(-45deg);-moz-transform:rotate(-45deg);transform:rotate(-45deg);right:2px}dialog>.tabbed>.tabwindow{flex:1 1 auto;display:flex;flex-flow:column}dialog>.tabbed>.tabwindow>iframe{flex-flow:column;flex:1 1 auto;border:0;width:100%}dialog>.tabbed{height:100%;padding:0;border:0;display:flex;flex-flow:column}.lds-ellipsis{display:inline-block;position:relative;width:80px;height:80px;min-width:80px}.lds-ellipsis div{position:absolute;top:33px;width:13px;height:13px;border-radius:50%;background:#fff;animation-timing-function:cubic-bezier(0, 1, 1, 0)}.lds-ellipsis div:nth-child(1){left:8px;animation:lds-ellipsis1 0.6s infinite}.lds-ellipsis div:nth-child(2){left:8px;animation:lds-ellipsis2 0.6s infinite}.lds-ellipsis div:nth-child(3){left:32px;animation:lds-ellipsis2 0.6s infinite}.lds-ellipsis div:nth-child(4){left:56px;animation:lds-ellipsis3 0.6s infinite}@keyframes lds-ellipsis1{0%{transform:scale(0)}100%{transform:scale(1)}}@keyframes lds-ellipsis3{0%{transform:scale(1)}100%{transform:scale(0)}}@keyframes lds-ellipsis2{0%{transform:translate(0, 0)}100%{transform:translate(24px, 0)}}";
    var head = document.head || document.getElementsByTagName('head')[0];
    var style = document.createElement('style');
    head.appendChild(style);
    style.type = 'text/css';
    style.appendChild(document.createTextNode(polyfillCss+dialogCss));
})();
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = global || self, global.dialogPolyfill = factory());
  }(this, function () { 'use strict';
  
    // nb. This is for IE10 and lower _only_.
    var supportCustomEvent = window.CustomEvent;
    if (!supportCustomEvent || typeof supportCustomEvent === 'object') {
      supportCustomEvent = function CustomEvent(event, x) {
        x = x || {};
        var ev = document.createEvent('CustomEvent');
        ev.initCustomEvent(event, !!x.bubbles, !!x.cancelable, x.detail || null);
        return ev;
      };
      supportCustomEvent.prototype = window.Event.prototype;
    }
  
    /**
     * @param {Element} el to check for stacking context
     * @return {boolean} whether this el or its parents creates a stacking context
     */
    function createsStackingContext(el) {
      while (el && el !== document.body) {
        var s = window.getComputedStyle(el);
        var invalid = function(k, ok) {
          return !(s[k] === undefined || s[k] === ok);
        };
        
        if (s.opacity < 1 ||
            invalid('zIndex', 'auto') ||
            invalid('transform', 'none') ||
            invalid('mixBlendMode', 'normal') ||
            invalid('filter', 'none') ||
            invalid('perspective', 'none') ||
            s['isolation'] === 'isolate' ||
            s.position === 'fixed' ||
            s.webkitOverflowScrolling === 'touch') {
          return true;
        }
        el = el.parentElement;
      }
      return false;
    }
  
    /**
     * Finds the nearest <dialog> from the passed element.
     *
     * @param {Element} el to search from
     * @return {HTMLDialogElement} dialog found
     */
    function findNearestDialog(el) {
      while (el) {
        if (el.localName === 'dialog') {
          return /** @type {HTMLDialogElement} */ (el);
        }
        el = el.parentElement;
      }
      return null;
    }
  
    /**
     * Blur the specified element, as long as it's not the HTML body element.
     * This works around an IE9/10 bug - blurring the body causes Windows to
     * blur the whole application.
     *
     * @param {Element} el to blur
     */
    function safeBlur(el) {
      if (el && el.blur && el !== document.body) {
        el.blur();
      }
    }
  
    /**
     * @param {!NodeList} nodeList to search
     * @param {Node} node to find
     * @return {boolean} whether node is inside nodeList
     */
    function inNodeList(nodeList, node) {
      for (var i = 0; i < nodeList.length; ++i) {
        if (nodeList[i] === node) {
          return true;
        }
      }
      return false;
    }
  
    /**
     * @param {HTMLFormElement} el to check
     * @return {boolean} whether this form has method="dialog"
     */
    function isFormMethodDialog(el) {
      if (!el || !el.hasAttribute('method')) {
        return false;
      }
      return el.getAttribute('method').toLowerCase() === 'dialog';
    }
  
    /**
     * @param {!HTMLDialogElement} dialog to upgrade
     * @constructor
     */
    function dialogPolyfillInfo(dialog) {
      this.dialog_ = dialog;
      this.replacedStyleTop_ = false;
      this.openAsModal_ = false;
  
      // Set a11y role. Browsers that support dialog implicitly know this already.
      if (!dialog.hasAttribute('role')) {
        dialog.setAttribute('role', 'dialog');
      }
  
      dialog.show = this.show.bind(this);
      dialog.showModal = this.showModal.bind(this);
      dialog.close = this.close.bind(this);
  
      if (!('returnValue' in dialog)) {
        dialog.returnValue = '';
      }
  
      if ('MutationObserver' in window) {
        var mo = new MutationObserver(this.maybeHideModal.bind(this));
        mo.observe(dialog, {attributes: true, attributeFilter: ['open']});
      } else {
        // IE10 and below support. Note that DOMNodeRemoved etc fire _before_ removal. They also
        // seem to fire even if the element was removed as part of a parent removal. Use the removed
        // events to force downgrade (useful if removed/immediately added).
        var removed = false;
        var cb = function() {
          removed ? this.downgradeModal() : this.maybeHideModal();
          removed = false;
        }.bind(this);
        var timeout;
        var delayModel = function(ev) {
          if (ev.target !== dialog) { return; }  // not for a child element
          var cand = 'DOMNodeRemoved';
          removed |= (ev.type.substr(0, cand.length) === cand);
          window.clearTimeout(timeout);
          timeout = window.setTimeout(cb, 0);
        };
        ['DOMAttrModified', 'DOMNodeRemoved', 'DOMNodeRemovedFromDocument'].forEach(function(name) {
          dialog.addEventListener(name, delayModel);
        });
      }
      // Note that the DOM is observed inside DialogManager while any dialog
      // is being displayed as a modal, to catch modal removal from the DOM.
  
      Object.defineProperty(dialog, 'open', {
        set: this.setOpen.bind(this),
        get: dialog.hasAttribute.bind(dialog, 'open')
      });
  
      this.backdrop_ = document.createElement('div');
      this.backdrop_.className = 'backdrop';
      this.backdrop_.addEventListener('click', this.backdropClick_.bind(this));
    }
  
    dialogPolyfillInfo.prototype = {
  
      get dialog() {
        return this.dialog_;
      },
  
      /**
       * Maybe remove this dialog from the modal top layer. This is called when
       * a modal dialog may no longer be tenable, e.g., when the dialog is no
       * longer open or is no longer part of the DOM.
       */
      maybeHideModal: function() {
        if (this.dialog_.hasAttribute('open') && document.body.contains(this.dialog_)) { return; }
        this.downgradeModal();
      },
  
      /**
       * Remove this dialog from the modal top layer, leaving it as a non-modal.
       */
      downgradeModal: function() {
        if (!this.openAsModal_) { return; }
        this.openAsModal_ = false;
        this.dialog_.style.zIndex = '';
  
        // This won't match the native <dialog> exactly because if the user set top on a centered
        // polyfill dialog, that top gets thrown away when the dialog is closed. Not sure it's
        // possible to polyfill this perfectly.
        if (this.replacedStyleTop_) {
          this.dialog_.style.top = '';
          this.replacedStyleTop_ = false;
        }
  
        // Clear the backdrop and remove from the manager.
        this.backdrop_.parentNode && this.backdrop_.parentNode.removeChild(this.backdrop_);
        dialogPolyfill.dm.removeDialog(this);
      },
  
      /**
       * @param {boolean} value whether to open or close this dialog
       */
      setOpen: function(value) {
        if (value) {
          this.dialog_.hasAttribute('open') || this.dialog_.setAttribute('open', '');
        } else {
          this.dialog_.removeAttribute('open');
          this.maybeHideModal();  // nb. redundant with MutationObserver
        }
      },
  
      /**
       * Handles clicks on the fake .backdrop element, redirecting them as if
       * they were on the dialog itself.
       *
       * @param {!Event} e to redirect
       */
      backdropClick_: function(e) {
        if (!this.dialog_.hasAttribute('tabindex')) {
          // Clicking on the backdrop should move the implicit cursor, even if dialog cannot be
          // focused. Create a fake thing to focus on. If the backdrop was _before_ the dialog, this
          // would not be needed - clicks would move the implicit cursor there.
          var fake = document.createElement('div');
          this.dialog_.insertBefore(fake, this.dialog_.firstChild);
          fake.tabIndex = -1;
          fake.focus();
          this.dialog_.removeChild(fake);
        } else {
          this.dialog_.focus();
        }
  
        var redirectedEvent = document.createEvent('MouseEvents');
        redirectedEvent.initMouseEvent(e.type, e.bubbles, e.cancelable, window,
            e.detail, e.screenX, e.screenY, e.clientX, e.clientY, e.ctrlKey,
            e.altKey, e.shiftKey, e.metaKey, e.button, e.relatedTarget);
        this.dialog_.dispatchEvent(redirectedEvent);
        e.stopPropagation();
      },
  
      /**
       * Focuses on the first focusable element within the dialog. This will always blur the current
       * focus, even if nothing within the dialog is found.
       */
      focus_: function() {
        // Find element with `autofocus` attribute, or fall back to the first form/tabindex control.
        var target = this.dialog_.querySelector('[autofocus]:not([disabled])');
        if (!target && this.dialog_.tabIndex >= 0) {
          target = this.dialog_;
        }
        if (!target) {
          // Note that this is 'any focusable area'. This list is probably not exhaustive, but the
          // alternative involves stepping through and trying to focus everything.
          var opts = ['button', 'input', 'keygen', 'select', 'textarea'];
          var query = opts.map(function(el) {
            return el + ':not([disabled])';
          });
          // TODO(samthor): tabindex values that are not numeric are not focusable.
          query.push('[tabindex]:not([disabled]):not([tabindex=""])');  // tabindex != "", not disabled
          target = this.dialog_.querySelector(query.join(', '));
        }
        safeBlur(document.activeElement);
        target && target.focus();
      },
  
      /**
       * Sets the zIndex for the backdrop and dialog.
       *
       * @param {number} dialogZ
       * @param {number} backdropZ
       */
      updateZIndex: function(dialogZ, backdropZ) {
        if (dialogZ < backdropZ) {
          throw new Error('dialogZ should never be < backdropZ');
        }
        this.dialog_.style.zIndex = dialogZ;
        this.backdrop_.style.zIndex = backdropZ;
      },
  
      /**
       * Shows the dialog. If the dialog is already open, this does nothing.
       */
      show: function() {
        if (!this.dialog_.open) {
          this.setOpen(true);
          this.focus_();
        }
      },
  
      /**
       * Show this dialog modally.
       */
      showModal: function() {
        if (this.dialog_.hasAttribute('open')) {
          throw new Error('Failed to execute \'showModal\' on dialog: The element is already open, and therefore cannot be opened modally.');
        }
        if (!document.body.contains(this.dialog_)) {
          throw new Error('Failed to execute \'showModal\' on dialog: The element is not in a Document.');
        }
        if (!dialogPolyfill.dm.pushDialog(this)) {
          throw new Error('Failed to execute \'showModal\' on dialog: There are too many open modal dialogs.');
        }
  
        if (createsStackingContext(this.dialog_.parentElement)) {
          console.warn('A dialog is being shown inside a stacking context. ' +
              'This may cause it to be unusable. For more information, see this link: ' +
              'https://github.com/GoogleChrome/dialog-polyfill/#stacking-context');
        }
  
        this.setOpen(true);
        this.openAsModal_ = true;
  
        // Optionally center vertically, relative to the current viewport.
        if (dialogPolyfill.needsCentering(this.dialog_)) {
          dialogPolyfill.reposition(this.dialog_);
          this.replacedStyleTop_ = true;
        } else {
          this.replacedStyleTop_ = false;
        }
  
        // Insert backdrop.
        this.dialog_.parentNode.insertBefore(this.backdrop_, this.dialog_.nextSibling);
  
        // Focus on whatever inside the dialog.
        this.focus_();
      },
  
      /**
       * Closes this HTMLDialogElement. This is optional vs clearing the open
       * attribute, however this fires a 'close' event.
       *
       * @param {string=} opt_returnValue to use as the returnValue
       */
      close: function(opt_returnValue) {
        if (!this.dialog_.hasAttribute('open')) {
          throw new Error('Failed to execute \'close\' on dialog: The element does not have an \'open\' attribute, and therefore cannot be closed.');
        }
        this.setOpen(false);
  
        // Leave returnValue untouched in case it was set directly on the element
        if (opt_returnValue !== undefined) {
          this.dialog_.returnValue = opt_returnValue;
        }
  
        // Triggering "close" event for any attached listeners on the <dialog>.
        var closeEvent = new supportCustomEvent('close', {
          bubbles: false,
          cancelable: false
        });
        this.dialog_.dispatchEvent(closeEvent);
      }
  
    };
  
    var dialogPolyfill = {};
  
    dialogPolyfill.reposition = function(element) {
      var scrollTop = document.body.scrollTop || document.documentElement.scrollTop;
      var topValue = scrollTop + (window.innerHeight - element.offsetHeight) / 2;
      element.style.top = Math.max(scrollTop, topValue) + 'px';
    };
  
    dialogPolyfill.isInlinePositionSetByStylesheet = function(element) {
      for (var i = 0; i < document.styleSheets.length; ++i) {
        var styleSheet = document.styleSheets[i];
        var cssRules = null;
        // Some browsers throw on cssRules.
        try {
          cssRules = styleSheet.cssRules;
        } catch (e) {}
        if (!cssRules) { continue; }
        for (var j = 0; j < cssRules.length; ++j) {
          var rule = cssRules[j];
          var selectedNodes = null;
          // Ignore errors on invalid selector texts.
          try {
            selectedNodes = document.querySelectorAll(rule.selectorText);
          } catch(e) {}
          if (!selectedNodes || !inNodeList(selectedNodes, element)) {
            continue;
          }
          var cssTop = rule.style.getPropertyValue('top');
          var cssBottom = rule.style.getPropertyValue('bottom');
          if ((cssTop && cssTop !== 'auto') || (cssBottom && cssBottom !== 'auto')) {
            return true;
          }
        }
      }
      return false;
    };
  
    dialogPolyfill.needsCentering = function(dialog) {
      var computedStyle = window.getComputedStyle(dialog);
      if (computedStyle.position !== 'absolute') {
        return false;
      }
  
      // We must determine whether the top/bottom specified value is non-auto.  In
      // WebKit/Blink, checking computedStyle.top == 'auto' is sufficient, but
      // Firefox returns the used value. So we do this crazy thing instead: check
      // the inline style and then go through CSS rules.
      if ((dialog.style.top !== 'auto' && dialog.style.top !== '') ||
          (dialog.style.bottom !== 'auto' && dialog.style.bottom !== '')) {
        return false;
      }
      return !dialogPolyfill.isInlinePositionSetByStylesheet(dialog);
    };
  
    /**
     * @param {!Element} element to force upgrade
     */
    dialogPolyfill.forceRegisterDialog = function(element) {
      if (window.HTMLDialogElement || element.showModal) {
        console.warn('This browser already supports <dialog>, the polyfill ' +
            'may not work correctly', element);
      }
      if (element.localName !== 'dialog') {
        throw new Error('Failed to register dialog: The element is not a dialog.');
      }
      new dialogPolyfillInfo(/** @type {!HTMLDialogElement} */ (element));
    };
  
    /**
     * @param {!Element} element to upgrade, if necessary
     */
    dialogPolyfill.registerDialog = function(element) {
      if (!element.showModal) {
        dialogPolyfill.forceRegisterDialog(element);
      }
    };
  
    /**
     * @constructor
     */
    dialogPolyfill.DialogManager = function() {
      /** @type {!Array<!dialogPolyfillInfo>} */
      this.pendingDialogStack = [];
  
      var checkDOM = this.checkDOM_.bind(this);
  
      // The overlay is used to simulate how a modal dialog blocks the document.
      // The blocking dialog is positioned on top of the overlay, and the rest of
      // the dialogs on the pending dialog stack are positioned below it. In the
      // actual implementation, the modal dialog stacking is controlled by the
      // top layer, where z-index has no effect.
      this.overlay = document.createElement('div');
      this.overlay.className = '_dialog_overlay';
      this.overlay.addEventListener('click', function(e) {
        this.forwardTab_ = undefined;
        e.stopPropagation();
        checkDOM([]);  // sanity-check DOM
      }.bind(this));
  
      this.handleKey_ = this.handleKey_.bind(this);
      this.handleFocus_ = this.handleFocus_.bind(this);
  
      this.zIndexLow_ = 100000;
      this.zIndexHigh_ = 100000 + 150;
  
      this.forwardTab_ = undefined;
  
      if ('MutationObserver' in window) {
        this.mo_ = new MutationObserver(function(records) {
          var removed = [];
          records.forEach(function(rec) {
            for (var i = 0, c; c = rec.removedNodes[i]; ++i) {
              if (!(c instanceof Element)) {
                continue;
              } else if (c.localName === 'dialog') {
                removed.push(c);
              }
              removed = removed.concat(c.querySelectorAll('dialog'));
            }
          });
          removed.length && checkDOM(removed);
        });
      }
    };
  
    /**
     * Called on the first modal dialog being shown. Adds the overlay and related
     * handlers.
     */
    dialogPolyfill.DialogManager.prototype.blockDocument = function() {
      document.documentElement.addEventListener('focus', this.handleFocus_, true);
      document.addEventListener('keydown', this.handleKey_);
      this.mo_ && this.mo_.observe(document, {childList: true, subtree: true});
    };
  
    /**
     * Called on the first modal dialog being removed, i.e., when no more modal
     * dialogs are visible.
     */
    dialogPolyfill.DialogManager.prototype.unblockDocument = function() {
      document.documentElement.removeEventListener('focus', this.handleFocus_, true);
      document.removeEventListener('keydown', this.handleKey_);
      this.mo_ && this.mo_.disconnect();
    };
  
    /**
     * Updates the stacking of all known dialogs.
     */
    dialogPolyfill.DialogManager.prototype.updateStacking = function() {
      var zIndex = this.zIndexHigh_;
  
      for (var i = 0, dpi; dpi = this.pendingDialogStack[i]; ++i) {
        dpi.updateZIndex(--zIndex, --zIndex);
        if (i === 0) {
          this.overlay.style.zIndex = --zIndex;
        }
      }
  
      // Make the overlay a sibling of the dialog itself.
      var last = this.pendingDialogStack[0];
      if (last) {
        var p = last.dialog.parentNode || document.body;
        p.appendChild(this.overlay);
      } else if (this.overlay.parentNode) {
        this.overlay.parentNode.removeChild(this.overlay);
      }
    };
  
    /**
     * @param {Element} candidate to check if contained or is the top-most modal dialog
     * @return {boolean} whether candidate is contained in top dialog
     */
    dialogPolyfill.DialogManager.prototype.containedByTopDialog_ = function(candidate) {
      while (candidate = findNearestDialog(candidate)) {
        for (var i = 0, dpi; dpi = this.pendingDialogStack[i]; ++i) {
          if (dpi.dialog === candidate) {
            return i === 0;  // only valid if top-most
          }
        }
        candidate = candidate.parentElement;
      }
      return false;
    };
  
    dialogPolyfill.DialogManager.prototype.handleFocus_ = function(event) {
      if (this.containedByTopDialog_(event.target)) { return; }
  
      if (document.activeElement === document.documentElement) { return; }
  
      event.preventDefault();
      event.stopPropagation();
      safeBlur(/** @type {Element} */ (event.target));
  
      if (this.forwardTab_ === undefined) { return; }  // move focus only from a tab key
  
      var dpi = this.pendingDialogStack[0];
      var dialog = dpi.dialog;
      var position = dialog.compareDocumentPosition(event.target);
      if (position & Node.DOCUMENT_POSITION_PRECEDING) {
        if (this.forwardTab_) {
          // forward
          dpi.focus_();
        } else if (event.target !== document.documentElement) {
          // backwards if we're not already focused on <html>
          document.documentElement.focus();
        }
      }
  
      return false;
    };
  
    dialogPolyfill.DialogManager.prototype.handleKey_ = function(event) {
      this.forwardTab_ = undefined;
      if (event.keyCode === 27) {
        event.preventDefault();
        event.stopPropagation();
        var cancelEvent = new supportCustomEvent('cancel', {
          bubbles: false,
          cancelable: true
        });
        var dpi = this.pendingDialogStack[0];
        if (dpi && dpi.dialog.dispatchEvent(cancelEvent)) {
          dpi.dialog.close();
        }
      } else if (event.keyCode === 9) {
        this.forwardTab_ = !event.shiftKey;
      }
    };
  
    /**
     * Finds and downgrades any known modal dialogs that are no longer displayed. Dialogs that are
     * removed and immediately readded don't stay modal, they become normal.
     *
     * @param {!Array<!HTMLDialogElement>} removed that have definitely been removed
     */
    dialogPolyfill.DialogManager.prototype.checkDOM_ = function(removed) {
      // This operates on a clone because it may cause it to change. Each change also calls
      // updateStacking, which only actually needs to happen once. But who removes many modal dialogs
      // at a time?!
      var clone = this.pendingDialogStack.slice();
      clone.forEach(function(dpi) {
        if (removed.indexOf(dpi.dialog) !== -1) {
          dpi.downgradeModal();
        } else {
          dpi.maybeHideModal();
        }
      });
    };
  
    /**
     * @param {!dialogPolyfillInfo} dpi
     * @return {boolean} whether the dialog was allowed
     */
    dialogPolyfill.DialogManager.prototype.pushDialog = function(dpi) {
      var allowed = (this.zIndexHigh_ - this.zIndexLow_) / 2 - 1;
      if (this.pendingDialogStack.length >= allowed) {
        return false;
      }
      if (this.pendingDialogStack.unshift(dpi) === 1) {
        this.blockDocument();
      }
      this.updateStacking();
      return true;
    };
  
    /**
     * @param {!dialogPolyfillInfo} dpi
     */
    dialogPolyfill.DialogManager.prototype.removeDialog = function(dpi) {
      var index = this.pendingDialogStack.indexOf(dpi);
      if (index === -1) { return; }
  
      this.pendingDialogStack.splice(index, 1);
      if (this.pendingDialogStack.length === 0) {
        this.unblockDocument();
      }
      this.updateStacking();
    };
  
    dialogPolyfill.dm = new dialogPolyfill.DialogManager();
    dialogPolyfill.formSubmitter = null;
    dialogPolyfill.useValue = null;
  
    /**
     * Installs global handlers, such as click listers and native method overrides. These are needed
     * even if a no dialog is registered, as they deal with <form method="dialog">.
     */
    if (window.HTMLDialogElement === undefined) {
  
      /**
       * If HTMLFormElement translates method="DIALOG" into 'get', then replace the descriptor with
       * one that returns the correct value.
       */
      var testForm = document.createElement('form');
      testForm.setAttribute('method', 'dialog');
      if (testForm.method !== 'dialog') {
        var methodDescriptor = Object.getOwnPropertyDescriptor(HTMLFormElement.prototype, 'method');
        if (methodDescriptor) {
          // nb. Some older iOS and older PhantomJS fail to return the descriptor. Don't do anything
          // and don't bother to update the element.
          var realGet = methodDescriptor.get;
          methodDescriptor.get = function() {
            if (isFormMethodDialog(this)) {
              return 'dialog';
            }
            return realGet.call(this);
          };
          var realSet = methodDescriptor.set;
          methodDescriptor.set = function(v) {
            if (typeof v === 'string' && v.toLowerCase() === 'dialog') {
              return this.setAttribute('method', v);
            }
            return realSet.call(this, v);
          };
          Object.defineProperty(HTMLFormElement.prototype, 'method', methodDescriptor);
        }
      }
  
      /**
       * Global 'click' handler, to capture the <input type="submit"> or <button> element which has
       * submitted a <form method="dialog">. Needed as Safari and others don't report this inside
       * document.activeElement.
       */
      document.addEventListener('click', function(ev) {
        dialogPolyfill.formSubmitter = null;
        dialogPolyfill.useValue = null;
        if (ev.defaultPrevented) { return; }  // e.g. a submit which prevents default submission
  
        var target = /** @type {Element} */ (ev.target);
        if (!target || !isFormMethodDialog(target.form)) { return; }
  
        var valid = (target.type === 'submit' && ['button', 'input'].indexOf(target.localName) > -1);
        if (!valid) {
          if (!(target.localName === 'input' && target.type === 'image')) { return; }
          // this is a <input type="image">, which can submit forms
          dialogPolyfill.useValue = ev.offsetX + ',' + ev.offsetY;
        }
  
        var dialog = findNearestDialog(target);
        if (!dialog) { return; }
  
        dialogPolyfill.formSubmitter = target;
  
      }, false);
  
      /**
       * Replace the native HTMLFormElement.submit() method, as it won't fire the
       * submit event and give us a chance to respond.
       */
      var nativeFormSubmit = HTMLFormElement.prototype.submit;
      var replacementFormSubmit = function () {
        if (!isFormMethodDialog(this)) {
          return nativeFormSubmit.call(this);
        }
        var dialog = findNearestDialog(this);
        dialog && dialog.close();
      };
      HTMLFormElement.prototype.submit = replacementFormSubmit;
  
      /**
       * Global form 'dialog' method handler. Closes a dialog correctly on submit
       * and possibly sets its return value.
       */
      document.addEventListener('submit', function(ev) {
        var form = /** @type {HTMLFormElement} */ (ev.target);
        if (!isFormMethodDialog(form)) { return; }
        ev.preventDefault();
  
        var dialog = findNearestDialog(form);
        if (!dialog) { return; }
  
        // Forms can only be submitted via .submit() or a click (?), but anyway: sanity-check that
        // the submitter is correct before using its value as .returnValue.
        var s = dialogPolyfill.formSubmitter;
        if (s && s.form === form) {
          dialog.close(dialogPolyfill.useValue || s.value);
        } else {
          dialog.close();
        }
        dialogPolyfill.formSubmitter = null;
  
      }, true);
    }
  
    return dialogPolyfill;
  
  }));
  
  (function() {
    function domReady(callbackFunction){
        if(document.readyState != 'loading')
          callbackFunction(event)
        else
          document.addEventListener("DOMContentLoaded", callbackFunction)
      }
    var dialogInitialized = false;
    var tabs = [];
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
                while(tabs.length > 0){
                    tabWindow.removeChild(tabs.pop());
                }
            });

        window.dialogPolyfill.registerDialog(dialog);

        function _createDialog(iframeUrl, dialogOpenerWindow, title){
            document.body.style.overflow = 'hidden';
            var iframe = document.createElement('iframe');
            iframe.src = iframeUrl;
            iframe.dataset.dialogId = ++iframeCounter;
            if(title) iframe.dataset.title = title;
            if(tabs.length>0) for( var k = 0; k < tabs.length; k++ ){
                tabs[k].iframe.style.display='none';
            } else {
                dialog.showModal();
            }
            tabs[tabs.length] = {iframe:iframe,opener:dialogOpenerWindow};
            tabWindow.appendChild(iframe);
            _redrawTabs(iframe.dataset.dialogId);
        }
        function _findEventSourceIframe( sourceWindow ){
            for(var i=0; i<tabs.length; i++) {
                var f = tabs[i].iframe;
                if (f.contentWindow==sourceWindow){
                    return {iframe:f, tabIndex:i};
                }
            }
        }
        function _removeIframe(iframeAndTabIndex) {
            tabWindow.removeChild(iframeAndTabIndex.iframe);
            tabs.splice(iframeAndTabIndex.tabIndex, 1);
            if(tabs.length>0){
                var ifr = tabs[tabs.length-1].iframe;
                ifr.style.display='block';
                _redrawTabs(ifr.dataset.dialogId);
            } else {
                dialog.close();
            }
        }
        function _closeTabByDialogId(dialogId){
            for (var i=0; i<tabs.length; i++){
                if(tabs[i].iframe.dataset.dialogId == dialogId){
                    _removeIframe({iframe:tabs[i].iframe, tabIndex:i});
                    return;
                }
            }
        }
        function _messageListerner(evt){
            if(evt.data && evt.data.hasOwnProperty('dialog')){
                if(evt.data.dialog && evt.data.dialog.url){
                    _createDialog(evt.data.dialog.url, evt.source, evt.data.dialog.title);
                } else if (evt.data.dialog && evt.data.dialog.close) {
                    _closeTabByDialogId(evt.data.dialog.close);
                }else {
                    var iframeAndTabIndex = _findEventSourceIframe(evt.source);
                    if(iframeAndTabIndex) {
                        _removeIframe(iframeAndTabIndex);
                    }
                }
            }
        }
        function _redrawTabs(activeDialogId){
            var nav = dialog.querySelector('nav');
            var frag = document.createDocumentFragment();
            for( var i=0; i<tabs.length; i++ ){
                var tab = document.createElement('div');
                tab.classList.add('tab');
                var ifr = tabs[i].iframe;
                //if(i===tabs.length-1){
                    var xButton = document.createElement('div');
                    xButton.classList.add('xbutton');
                    xButton.addEventListener('click', function(evt){
                        window.top.postMessage({dialog:{close: ifr.dataset.dialogId}}, '*');
                    });
                //}
                tab.appendChild(xButton);
                if(activeDialogId != ifr.dataset.dialogId){
                    var textNode = document.createTextNode(ifr.dataset.title?ifr.dataset.title:ifr.src);
                    tab.appendChild( textNode );
                } else {
                  tab.classList.add('active');
                  if(!ifr.dataset.loaded){ /** add spinner to show loading process */                    
                    var spinner = document.createElement('div');
                    spinner.classList.add('lds-ellipsis');
                    for(var u=0; u<4; u++){
                        spinner.appendChild(document.createElement('div'));
                    }
                    tab.appendChild(spinner);
                  }
                  var textNode = document.createTextNode(ifr.dataset.title?ifr.dataset.title:ifr.src);
                  tab.appendChild( textNode );
                  if(ifr.onload==null){
                    var ifrOpener = tabs[i].opener;
                    var iWin = ifr.contentWindow;
                    ifr.onload = function(){
                      try{
                          ifr.dataset.loaded = true;
                          var spinner = tab.querySelector('.lds-ellipsis');
                          if(spinner){
                              spinner.parentElement.removeChild(spinner);
                          }
                          var doc = ifr.contentDocument? ifr.contentDocument : iWin.document;
                          /** window.close() can be overriden in IE by function declaration only */
                          var script = doc.createElement('script');
                          script.textContent = "function close(){window.top.postMessage({dialog:null},'*')}";
                          doc.head.appendChild(script);
                          iWin.opener = ifrOpener;
                          iWin.postMessage({dialog:{opener:true}}, '*');
                          if(!ifr.dataset.title){
                            if(doc && doc.title){
                                ifr.dataset.title=doc.title;
                            } else {
                                ifr.dataset.title=ifr.src;
                            }
                          }
                      } catch(error){
                          if(!ifr.dataset.title) ifr.dataset.title = ifr.src;
                      }
                      textNode.nodeValue = ifr.dataset.title;
                    }
                  }
                }
                frag.appendChild(tab);
            }
            while (nav.lastChild) { nav.removeChild(nav.lastChild); }
            nav.appendChild(frag);
        }
        function getDefaultTopDialog(){
            var dialog = document.createElement("dialog");
            dialog.setAttribute("role", "topdialog");
            var tabbedDiv = document.createElement("div");
            tabbedDiv.classList.add("tabbed");
            var nav = document.createElement("nav");
            var tabWindow = document.createElement("div");
            tabWindow.classList.add("tabwindow");            
            tabbedDiv.appendChild(nav);
            tabbedDiv.appendChild(tabWindow);
            dialog.appendChild(tabbedDiv);
            document.body.appendChild(dialog);
            return dialog;
        }
        window.addEventListener('message', _messageListerner, false);
    };
    domReady(_init);
})();