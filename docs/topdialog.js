
/* DragResize */
// Common API code.

if (typeof addEvent != 'function')
{
 var addEvent = function(o, t, f, l)
 {
  var d = 'addEventListener', n = 'on' + t, rO = o, rT = t, rF = f, rL = l;
  if (o[d] && !l) return o[d](t, f, false);
  if (!o._evts) o._evts = {};
  if (!o._evts[t])
  {
   o._evts[t] = o[n] ? { b: o[n] } : {};
   o[n] = new Function('e',
    'var r = true, o = this, a = o._evts["' + t + '"], i; for (i in a) {' +
     'o._f = a[i]; r = o._f(e||window.event) != false && r; o._f = null;' +
     '} return r');
   if (t != 'unload') addEvent(window, 'unload', function() {
    removeEvent(rO, rT, rF, rL);
   });
  }
  if (!f._i) f._i = addEvent._i++;
  o._evts[t][f._i] = f;
 };
 addEvent._i = 1;
 var removeEvent = function(o, t, f, l)
 {
  var d = 'removeEventListener';
  if (o[d] && !l) return o[d](t, f, false);
  if (o._evts && o._evts[t] && f._i) delete o._evts[t][f._i];
 };
}


function cancelEvent(e, c)
{
 e.returnValue = false;
 if (e.preventDefault) e.preventDefault();
 if (c)
 {
  e.cancelBubble = true;
  if (e.stopPropagation) e.stopPropagation();
 }
};







// *** DRAG/RESIZE CODE ***

function DragResize(myName, config)
{
 var props = {
  myName: myName,                  // Name of the object.
  enabled: true,                   // Global toggle of drag/resize.
  handles: ['tl', 'tm', 'tr',
   'ml', 'mr', 'bl', 'bm', 'br'],  // Array of drag handles: top/mid/bot/right.
  isElement: null,                 // Function ref to test for an element.
  isHandle: null,                  // Function ref to test for move handle.
  element: null,                   // The currently selected element.
  handle: null,                    // Active handle reference of the element.
  minWidth: 10, minHeight: 10,     // Minimum pixel size of elements.
  minLeft: 0, maxLeft: 9999,       // Bounding box area, in pixels.
  minTop: 0, maxTop: 9999,
  gridX: 1, gridY: 1,              // Grid granularity.
  zIndex: 1,                       // The highest Z-Index yet allocated.
  mouseX: 0, mouseY: 0,            // Current mouse position, recorded live.
  lastMouseX: 0, lastMouseY: 0,    // Last processed mouse positions.
  mOffX: 0, mOffY: 0,              // A known offset between position & mouse.
  elmX: 0, elmY: 0,                // Element position.
  elmW: 0, elmH: 0,                // Element size.
  allowBlur: true,                 // Whether to allow automatic blur onclick.
  ondragfocus: null,               // Event handler functions.
  ondragstart: null,
  ondragmove: null,
  ondragend: null,
  ondragblur: null
 };

 for (var p in props)
  this[p] = (typeof config[p] == 'undefined') ? props[p] : config[p];
};


DragResize.prototype.apply = function(node)
{
 // Adds object event handlers to the specified DOM node.

 var obj = this;
 addEvent(node, 'mousedown', function(e) { obj.mouseDown(e) } );
 addEvent(node, 'mousemove', function(e) { obj.mouseMove(e) } );
 addEvent(node, 'mouseup', function(e) { obj.mouseUp(e) } );
 addEvent(node, 'touchstart', function(e) { obj.mouseDown(e) } );
 addEvent(node, 'touchmove', function(e) { obj.mouseMove(e) } );
 addEvent(node, 'touchend', function(e) { obj.mouseUp(e) } );
};


DragResize.prototype.select = function(newElement) { with (this)
{
 // Selects an element for dragging.

 if (!document.getElementById || !enabled) return;

 // Activate and record our new dragging element.
 if (newElement && (newElement != element) && enabled)
 {
  element = newElement;
  // Elevate it and give it resize handles.
  element.style.zIndex = ++zIndex;
  if (this.resizeHandleSet) this.resizeHandleSet(element, true);
  // Handle (badly) right/bottom positioned elements.
  var eCS = element.currentStyle || window.getComputedStyle(element, null);
  if (eCS.right)
  {
   element.style.left = element.offsetLeft + 'px';
   element.style.right = '';
  }
  if (eCS.bottom)
  {
   element.style.top = element.offsetTop + 'px';
   element.style.bottom = '';
  }
  // Record element attributes for mouseMove().
  elmX = parseInt(element.style.left);
  elmY = parseInt(element.style.top);
  elmW = element.clientWidth || element.offsetWidth;
  elmH = element.clientHeight || element.offsetHeight;
  if (ondragfocus) this.ondragfocus();
 }
}};


DragResize.prototype.deselect = function(delHandles) { with (this)
{
 // Immediately stops dragging an element. If 'delHandles' is true, this
 // remove the handles from the element and clears the element flag,
 // completely resetting the element.

 if (!document.getElementById || !enabled) return;

 if (delHandles)
 {
  if (ondragblur) this.ondragblur();
  if (this.resizeHandleSet) this.resizeHandleSet(element, false);
  element = null;
 }

 handle = null;
 mOffX = 0;
 mOffY = 0;
}};


DragResize.prototype.mouseDown = function(e) { with (this)
{
 // Suitable elements are selected for drag/resize on mousedown.
 // We also initialise the resize boxes, and drag parameters like mouse position etc.
 if (!document.getElementById || !enabled) return true;

 // Fake a mousemove for touch devices.
 if (e.touches && e.touches.length) this.mouseMove(e);

 var elm = e.target || e.srcElement,
  newElement = null,
  newHandle = null,
  hRE = new RegExp(myName + '-([trmbl]{2})', '');

 while (elm)
 {
  // Loop up the DOM looking for matching elements. Remember one if found.
  if (elm.className)
  {
   if (!newHandle && (hRE.test(elm.className) || isHandle(elm))) newHandle = elm;
   if (isElement(elm)) { newElement = elm; break }
  }
  elm = elm.parentNode;
 }

 // If this isn't on the last dragged element, call deselect(),
 // which will hide its handles and clear element.
 if (element && (element != newElement) && allowBlur) deselect(true);

 // If we have a new matching element, call select().
 if (newElement && (!element || (newElement == element)))
 {
  // Stop mouse selections if we're dragging a handle.
  if (newHandle) cancelEvent(e);
  select(newElement, newHandle);
  handle = newHandle;
  if (handle && ondragstart) this.ondragstart(hRE.test(handle.className));
 }
}};


DragResize.prototype.mouseMove = function(e) { with (this)
{
 // This continually offsets the dragged element by the difference between the
 // last recorded mouse position (mouseX/Y) and the current mouse position.
 if (!document.getElementById || !enabled) return true;

 // We always record the current mouse/touch position.
 var mt = (e.touches && e.touches.length) ? e.touches[0] : e;
 mouseX = mt.pageX || mt.clientX + document.documentElement.scrollLeft;
 mouseY = mt.pageY || mt.clientY + document.documentElement.scrollTop;
 // Record the relative mouse movement, in case we're dragging.
 // Add any previously stored & ignored offset to the calculations.
 var diffX = mouseX - lastMouseX + mOffX;
 var diffY = mouseY - lastMouseY + mOffY;
 mOffX = mOffY = 0;
 // Update last processed mouse positions.
 lastMouseX = mouseX;
 lastMouseY = mouseY;

 // That's all we do if we're not dragging anything.
 if (!handle) return true;

 // If included in the script, run the resize handle drag routine.
 // Let it create an object representing the drag offsets.
 var isResize = false;
 if (this.resizeHandleDrag && this.resizeHandleDrag(diffX, diffY))
 {
  isResize = true;
 }
 else
 {
  // If the resize drag handler isn't set or returns false (to indicate the drag was
  // not on a resize handle), we must be dragging the whole element, so move that.
  // Bounds check left-right...
  var dX = diffX, dY = diffY;
  if (elmX + dX < minLeft) mOffX = (dX - (diffX = minLeft - elmX));
  else if (elmX + elmW + dX > maxLeft) mOffX = (dX - (diffX = maxLeft - elmX - elmW));
  // ...and up-down.
  if (elmY + dY < minTop) mOffY = (dY - (diffY = minTop - elmY));
  else if (elmY + elmH + dY > maxTop) mOffY = (dY - (diffY = maxTop - elmY - elmH));
  elmX += diffX;
  elmY += diffY;
 }

 // Assign new info back to the element, with minimum dimensions / grid align.
 element.style.left =   (Math.round(elmX / gridX) * gridX) + 'px';
 element.style.top =    (Math.round(elmY / gridY) * gridY) + 'px';
 if (isResize)
 {
  element.style.width =  (Math.round(elmW / gridX) * gridX) + 'px';
  element.style.height = (Math.round(elmH / gridY) * gridY) + 'px';
 }

 // Evil, dirty, hackish Opera select-as-you-drag fix.
 if (window.opera && document.documentElement)
 {
  var oDF = document.getElementById('op-drag-fix');
  if (!oDF)
  {
   var oDF = document.createElement('input');
   oDF.id = 'op-drag-fix';
   oDF.style.display = 'none';
   document.body.appendChild(oDF);
  }
  oDF.focus();
 }

 if (ondragmove) this.ondragmove(isResize);

 // Stop a normal drag event.
 cancelEvent(e);
}};


DragResize.prototype.mouseUp = function(e) { with (this)
{
 // On mouseup, stop dragging, but don't reset handler visibility.
 if (!document.getElementById || !enabled) return;

 var hRE = new RegExp(myName + '-([trmbl]{2})', '');
 if (handle && ondragend) this.ondragend(hRE.test(handle.className));
 deselect(false);
}};



/* Resize Code -- can be deleted if you're not using it. */

DragResize.prototype.resizeHandleSet = function(elm, show) {
  if(!elm) return;
  with (this){
    // Either creates, shows or hides the resize handles within an element.
    // If we're showing them, and no handles have been created, create 4 new ones.
    if (!elm._handle_tr){
      for (var h = 0; h < handles.length; h++){
      // Create 4 news divs, assign each a generic + specific class.
      var hDiv = document.createElement('div');
      hDiv.className = myName + ' ' +  myName + '-' + handles[h];
      elm['_handle_' + handles[h]] = elm.appendChild(hDiv);
      }
    }
    // We now have handles. Find them all and show/hide.
    for (var h = 0; h < handles.length; h++){
      elm['_handle_' + handles[h]].style.visibility = show ? 'inherit' : 'hidden';
    }
  }
};


DragResize.prototype.resizeHandleDrag = function(diffX, diffY) { with (this)
{
 // Passed the mouse movement amounts. This function checks to see whether the
 // drag is from a resize handle created above; if so, it changes the stored
 // elm* dimensions and mOffX/Y.

 var hClass = handle && handle.className &&
  handle.className.match(new RegExp(myName + '-([tmblr]{2})')) ? RegExp.$1 : '';

 // If the hClass is one of the resize handles, resize one or two dimensions.
 // Bounds checking is the hard bit -- basically for each edge, check that the
 // element doesn't go under minimum size, and doesn't go beyond its boundary.
 var dY = diffY, dX = diffX, processed = false;
 if (hClass.indexOf('t') >= 0)
 {
  if (elmH - dY < minHeight) mOffY = (dY - (diffY = elmH - minHeight));
  else if (elmY + dY < minTop) mOffY = (dY - (diffY = minTop - elmY));
  elmY += diffY;
  elmH -= diffY;
  processed = true;
 }
 if (hClass.indexOf('b') >= 0)
 {
  if (elmH + dY < minHeight) mOffY = (dY - (diffY = minHeight - elmH));
  else if (elmY + elmH + dY > maxTop) mOffY = (dY - (diffY = maxTop - elmY - elmH));
  elmH += diffY;
  processed = true;
 }
 if (hClass.indexOf('l') >= 0)
 {
  if (elmW - dX < minWidth) mOffX = (dX - (diffX = elmW - minWidth));
  else if (elmX + dX < minLeft) mOffX = (dX - (diffX = minLeft - elmX));
  elmX += diffX;
  elmW -= diffX;
  processed = true;
 }
 if (hClass.indexOf('r') >= 0)
 {
  if (elmW + dX < minWidth) mOffX = (dX - (diffX = minWidth - elmW));
  else if (elmX + elmW + dX > maxLeft) mOffX = (dX - (diffX = maxLeft - elmX - elmW));
  elmW += diffX;
  processed = true;
 }

 return processed;
}};
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = global || self, global.dialogPolyfill = factory());
  }(this, function () { 'use strict';

    //Solution to 100907 - always force the polyfill to be used
    //if(window.HTMLDialogElement) {
    //  delete window.HTMLDialogElement;
    //}
  
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
      // patch for 100907
      //if (window.HTMLDialogElement || element.showModal) {
      //  console.warn('This browser already supports <dialog>, the polyfill ' +
      //      'may not work correctly', element);
      //}
      if (element.localName !== 'dialog') {
        throw new Error('Failed to register dialog: The element is not a dialog.');
      }
      new dialogPolyfillInfo(/** @type {!HTMLDialogElement} */ (element));
    };
  
    /**
     * @param {!Element} element to upgrade, if necessary
     */
    dialogPolyfill.registerDialog = function(element) {
      // Solution to 100907 - always force the polyfill to be used
      // if (!element.showModal) {
        dialogPolyfill.forceRegisterDialog(element);
      //}
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
    //if (window.HTMLDialogElement === undefined) {
      if(true){
  
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