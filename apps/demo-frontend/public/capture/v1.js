/*
 * ASAP Demos cursor capture, v1.
 *
 * Dropped into the page being demoed as
 *   <script src="https://<host>/capture/v1.js#project.PROJECT.TOKEN" async></script>
 * and, for a bookmark saved before that shape existed,
 *   <script src="https://<host>/capture/v1.js#SESSION.TOKEN" async></script>
 *
 * It records where the pointer went and what it touched, and posts the stream
 * to /api/capture. The recording is raw and immutable: the studio derives
 * ripples, spotlights and zooms from it afterwards, and the creator edits those.
 *
 * The project form is the one to save: the bookmark is set up once and the
 * server routes its events to whichever session the studio has open, so a new
 * recording never means a new bookmark. The session form still works, and still
 * only ever reaches the one session it was minted for.
 *
 * Two deliberate choices:
 *  - the ids and the token ride in the URL fragment, which the browser never
 *    sends to a server, so the credentials stay out of proxy and CDN logs;
 *  - batches are posted as text/plain with mode 'no-cors', which keeps the
 *    request "simple" so the host page never pays for a CORS preflight. The
 *    response is opaque, so a batch is never retried.
 *
 * Nothing here may throw into the host page: every listener is wrapped.
 */
(function () {
  'use strict';

  var FLUSH_INTERVAL_MS = 5000;
  var FLUSH_AT_EVENTS = 2000;
  var MOVE_INTERVAL_MS = 50; // about 20Hz
  var MOVE_MIN_DISTANCE_PX = 4;
  var COARSE_INTERVAL_MS = 200; // scroll and resize
  var MAX_EVENTS = 200000;
  var MAX_SELECTOR_LENGTH = 120;

  var INTERACTIVE =
    'a,button,input,select,textarea,label,summary,[role="button"],[role="link"],[role="tab"],[role="menuitem"]';

  var script = currentScript();
  if (!script) {
    return;
  }

  // ids carry no dot and the token is base64url, so the fragment splits cleanly
  var credentials = String(script.src || '').split('#')[1] || '';
  var parts = credentials.split('.');
  var projectId = '';
  var sessionId = '';
  var token = '';
  if (parts.length === 3 && parts[0] === 'project') {
    projectId = parts[1];
    token = parts[2];
  } else if (parts.length === 2) {
    sessionId = parts[0];
    token = parts[1];
  }
  if ((!projectId && !sessionId) || !token) {
    return;
  }

  /*
   * One reporter per page. The bookmark appends a fresh copy of this script on
   * every click, and nothing used to stop the second copy from running: each
   * one reported the same pointer under its own event ids, so every click
   * arrived twice or three times over. A live reporter for the same project or
   * session now stays and the new copy bows out; a reporter for something else
   * is stopped and replaced, so a new bookmark takes over from an old one.
   */
  var REGISTRY = '__asapDemoCaptureV1';
  // the token is part of the key: a rotated bookmark carries a new token and
  // must replace the old reporter, which keeps posting a revoked one into
  // silent 204s otherwise
  var registryKey =
    (projectId ? 'project.' + projectId : 'session.' + sessionId) + '.' + token;
  var previous = window[REGISTRY];
  if (previous) {
    try {
      if (previous.key === registryKey && !previous.stopped()) {
        return;
      }
      previous.stop();
    } catch (error) {
      // a broken older copy must not stop this one from starting
    }
  }

  var captureUrl = originOf(script.src) + '/api/capture';

  // one id per tab: several tabs share a session when the whole screen is being
  // recorded, and each keeps its own batch numbering
  var clientId = randomId();

  var queue = [];
  var seq = 0;
  var eventId = 0;
  var total = 0;
  var stopped = false;
  var lastMove = { t: 0, x: 0, y: 0, screenX: 0, screenY: 0 };
  var lastCoarse = 0;

  function randomId() {
    var bytes = new Uint8Array(8);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(bytes);
    } else {
      for (var i = 0; i < bytes.length; i += 1) {
        bytes[i] = Math.floor(Math.random() * 256);
      }
    }
    return Array.prototype.map
      .call(bytes, function (byte) {
        return ('0' + byte.toString(16)).slice(-2);
      })
      .join('');
  }

  function currentScript() {
    if (document.currentScript) {
      return document.currentScript;
    }
    // an async script that has already run loses document.currentScript
    var scripts = document.getElementsByTagName('script');
    for (var index = scripts.length - 1; index >= 0; index -= 1) {
      if (String(scripts[index].src || '').indexOf('/capture/v1.js#') !== -1) {
        return scripts[index];
      }
    }
    return null;
  }

  function originOf(url) {
    var anchor = document.createElement('a');
    anchor.href = url;
    return anchor.protocol + '//' + anchor.host;
  }

  function guard(handler) {
    return function (nativeEvent) {
      if (stopped) {
        return;
      }
      try {
        handler(nativeEvent);
      } catch (error) {
        // the host page is not ours to break
      }
    };
  }

  function viewportWidth() {
    return window.innerWidth || document.documentElement.clientWidth || 0;
  }

  function viewportHeight() {
    return window.innerHeight || document.documentElement.clientHeight || 0;
  }

  function number(value) {
    return typeof value === 'number' && isFinite(value) ? value : 0;
  }

  /*
   * Where this page sits on the screen, in the same CSS pixels the pointer's
   * screenX and screenY are reported in. The studio has no idea whether the
   * creator shared a tab, this window or the whole screen, so everything the
   * three mappings could need is recorded and it picks.
   *
   * screen.availLeft and availTop are the origin of the display this window is
   * on, inside the virtual desktop that screenX counts from. Without them a
   * pointer on a second monitor reads as off the right hand edge of the first,
   * or as a negative number on a monitor placed to the left.
   *
   * Recorded on every event rather than once, so a window dragged, resized or
   * moved to another display mid recording is still mapped correctly from the
   * moment it moved.
   */
  function placement() {
    var screen = window.screen || {};
    return {
      screenW: number(screen.width),
      screenH: number(screen.height),
      screenLeft: number(screen.availLeft),
      screenTop: number(screen.availTop),
      winX: number(window.screenX),
      winY: number(window.screenY),
      winW: number(window.outerWidth),
      winH: number(window.outerHeight),
    };
  }

  function record(type, nativeEvent, extra) {
    if (total >= MAX_EVENTS) {
      // what is already queued still has to land before the reporter goes
      try {
        flush(false);
      } catch (error) {
        // a failed farewell flush must not break the host page
      }
      stop();
      return;
    }

    eventId += 1;
    var x =
      nativeEvent && nativeEvent.clientX != null
        ? nativeEvent.clientX
        : lastMove.x;
    var y =
      nativeEvent && nativeEvent.clientY != null
        ? nativeEvent.clientY
        : lastMove.y;
    var where = placement();
    var event = {
      id: 'e' + eventId,
      // every copy of the reporter numbers from e1, so the tab is what tells
      // one page's e5 from another's
      client: clientId,
      type: type,
      t: Date.now(),
      x: x,
      y: y,
      viewportW: viewportWidth(),
      viewportH: viewportHeight(),
      devicePixelRatio: window.devicePixelRatio || 1,
      // a scroll or a resize carries no pointer of its own, so it reports the
      // last position that did rather than inventing one
      screenX:
        nativeEvent && nativeEvent.screenX != null
          ? nativeEvent.screenX
          : lastMove.screenX,
      screenY:
        nativeEvent && nativeEvent.screenY != null
          ? nativeEvent.screenY
          : lastMove.screenY,
      screenW: where.screenW,
      screenH: where.screenH,
      screenLeft: where.screenLeft,
      screenTop: where.screenTop,
      winX: where.winX,
      winY: where.winY,
      winW: where.winW,
      winH: where.winH,
      // a Wayland desktop fabricates the window position and a Windows one
      // does not, and only the platform can say which kind this stream is
      platform: navigator.platform || '',
    };

    if (extra) {
      for (var key in extra) {
        if (Object.prototype.hasOwnProperty.call(extra, key)) {
          event[key] = extra[key];
        }
      }
    }

    queue.push(event);
    total += 1;
    if (queue.length >= FLUSH_AT_EVENTS) {
      flush(false);
    }
  }

  // tag, id and one class: enough for the studio to label an effect, not enough
  // to reconstruct the page
  function selectorOf(element) {
    var selector = String(element.tagName || '').toLowerCase();
    if (element.id) {
      selector += '#' + element.id;
    } else if (typeof element.className === 'string' && element.className) {
      var first = element.className.split(/\s+/)[0];
      if (first) {
        selector += '.' + first;
      }
    }
    return selector.slice(0, MAX_SELECTOR_LENGTH);
  }

  function interactiveAncestor(target) {
    if (!target || target.nodeType !== 1 || !target.closest) {
      return null;
    }
    return target.closest(INTERACTIVE);
  }

  function flush(useBeacon) {
    if (!queue.length) {
      return;
    }
    seq += 1;
    var batch = {
      token: token,
      clientId: clientId,
      seq: seq,
      events: queue,
    };
    if (projectId) {
      batch.projectId = projectId;
    } else {
      batch.sessionId = sessionId;
    }
    queue = [];
    send(JSON.stringify(batch), useBeacon);
  }

  function send(body, useBeacon) {
    try {
      if (useBeacon && navigator.sendBeacon) {
        navigator.sendBeacon(
          captureUrl,
          new Blob([body], { type: 'text/plain;charset=UTF-8' }),
        );
        return;
      }
      if (window.fetch) {
        window
          .fetch(captureUrl, {
            method: 'POST',
            mode: 'no-cors',
            credentials: 'omit',
            keepalive: true,
            headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
            body: body,
          })
          .catch(function () {});
        return;
      }
      var request = new XMLHttpRequest();
      request.open('POST', captureUrl, true);
      request.setRequestHeader('Content-Type', 'text/plain;charset=UTF-8');
      request.send(body);
    } catch (error) {
      // a batch that cannot be sent is dropped; the take carries on
    }
  }

  function stop() {
    if (stopped) {
      return;
    }
    stopped = true;
    if (timer) {
      clearInterval(timer);
    }
    // a handed over copy must go completely quiet, not keep listening for the
    // life of the page
    window.removeEventListener('pointermove', onMove, true);
    window.removeEventListener('pointerdown', onDown, true);
    window.removeEventListener('click', onClick, true);
    window.removeEventListener('pointerover', onOver, true);
    window.removeEventListener('scroll', onScroll, true);
    window.removeEventListener('resize', onResize, true);
    document.removeEventListener('visibilitychange', onVisibility, true);
    window.removeEventListener('pagehide', onPageHide, true);
    window.removeEventListener('blur', onBlur, true);
  }

  // a replacement bookmark stops this copy through here, so what it already
  // captured is sent rather than left in the queue
  function handOver() {
    try {
      flush(false);
    } catch (error) {
      // nothing captured is worth breaking the host page over
    }
    stop();
  }

  var onMove = guard(function (nativeEvent) {
    var now = Date.now();
    var dx = nativeEvent.clientX - lastMove.x;
    var dy = nativeEvent.clientY - lastMove.y;
    // throttled and distance-decimated: a pointer that barely moved adds a
    // point the derivation would resample away anyway
    if (
      now - lastMove.t < MOVE_INTERVAL_MS ||
      dx * dx + dy * dy < MOVE_MIN_DISTANCE_PX * MOVE_MIN_DISTANCE_PX
    ) {
      return;
    }
    lastMove = {
      t: now,
      x: nativeEvent.clientX,
      y: nativeEvent.clientY,
      screenX: nativeEvent.screenX,
      screenY: nativeEvent.screenY,
    };
    record('move', nativeEvent);
  });

  // a down and a click are what the ripples are derived from, so neither is
  // ever throttled away
  var onDown = guard(function (nativeEvent) {
    lastMove = {
      t: Date.now(),
      x: nativeEvent.clientX,
      y: nativeEvent.clientY,
      screenX: nativeEvent.screenX,
      screenY: nativeEvent.screenY,
    };
    record('down', nativeEvent);
  });

  var onClick = guard(function (nativeEvent) {
    var element = interactiveAncestor(nativeEvent.target);
    record(
      'click',
      nativeEvent,
      element ? { target: selectorOf(element) } : null,
    );
  });

  var onOver = guard(function (nativeEvent) {
    var element = interactiveAncestor(nativeEvent.target);
    if (!element) {
      return;
    }
    var rect = element.getBoundingClientRect();
    record('over', nativeEvent, {
      target: selectorOf(element),
      rect: {
        x: Math.round(rect.left),
        y: Math.round(rect.top),
        w: Math.round(rect.width),
        h: Math.round(rect.height),
      },
    });
  });

  var onScroll = guard(function () {
    var now = Date.now();
    if (now - lastCoarse < COARSE_INTERVAL_MS) {
      return;
    }
    lastCoarse = now;
    record('scroll', null, {
      scrollX: Math.round(window.pageXOffset || 0),
      scrollY: Math.round(window.pageYOffset || 0),
    });
  });

  var onResize = guard(function () {
    var now = Date.now();
    if (now - lastCoarse < COARSE_INTERVAL_MS) {
      return;
    }
    lastCoarse = now;
    record('resize', null, null);
  });

  var onVisibility = guard(function () {
    record('visibility', null, {
      visible: document.visibilityState === 'visible',
    });
    if (document.visibilityState === 'hidden') {
      flush(true);
    }
  });

  var onPageHide = guard(function () {
    flush(true);
  });

  // switching to the studio in another window never hides this tab, so the
  // tail of the take flushes on losing focus as well
  var onBlur = guard(function () {
    flush(false);
  });

  var timer = setInterval(function () {
    try {
      flush(false);
    } catch (error) {
      // never let the interval surface an error in the host page
    }
  }, FLUSH_INTERVAL_MS);

  window[REGISTRY] = {
    key: registryKey,
    stop: handOver,
    stopped: function () {
      return stopped;
    },
  };

  window.addEventListener('pointermove', onMove, true);
  window.addEventListener('pointerdown', onDown, true);
  window.addEventListener('click', onClick, true);
  window.addEventListener('pointerover', onOver, true);
  window.addEventListener('scroll', onScroll, true);
  window.addEventListener('resize', onResize, true);
  document.addEventListener('visibilitychange', onVisibility, true);
  window.addEventListener('pagehide', onPageHide, true);
  window.addEventListener('blur', onBlur, true);
})();
