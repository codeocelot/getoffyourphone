(() => {
  "use strict";

  const ADJECTIVES = [
    "fucking",
    "distracting",
    "spying",
    "addicting",
    "soul-crushing",
    "doomscrolling",
    "lying",
    "boring",
    "attention-farming",
    "alienating",
    "dopamine-dealing",
    "rage-baiting",
    "sleep-stealing",
    "ad-riddled",
    "brain-rotting",
    "life-shortening",
    "posture-ruining",
    "friendship-simulating",
    "outrage-optimized",
    "battery-draining",
    "joy-flattening",
    "algorithm-worshipping",
    "surveilling",
    "landfill-bound",
    "conversation-killing",
    "enshitifying",
    "billionaire-backed",
    "unethically-made"
  ];

  const HOLD_MS = 2600; // how long each adjective stays on screen
  const TRANSITION_MS = 450; // must match the CSS transition duration

  const hero = document.querySelector(".hero");
  const container = document.getElementById("adjective");
  const track = document.getElementById("adjective-track");
  let currentEl = document.getElementById("word-current");
  let nextEl = document.getElementById("word-next");

  // Off-screen probe used to measure how wide/tall a word would render,
  // so long words wrap onto a second line instead of overflowing the viewport.
  const probe = document.createElement("span");
  probe.style.display = "block";
  probe.style.position = "fixed";
  probe.style.visibility = "hidden";
  probe.style.left = "-9999px";
  probe.style.top = "0";
  document.body.appendChild(probe);

  function availableWidth() {
    const cs = getComputedStyle(hero);
    const paddingX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    return hero.clientWidth - paddingX;
  }

  // Extra room per line over the tight 1.02 line-height, so descenders
  // (e.g. the "g" in "addicting") don't get clipped by the carousel mask.
  const LINE_BUFFER = 1.1;

  function measure(text) {
    const cs = getComputedStyle(container);
    const fontSize = parseFloat(cs.fontSize);
    const lineHeightPx = parseFloat(cs.lineHeight);
    probe.style.fontFamily = cs.fontFamily;
    probe.style.fontSize = cs.fontSize;
    probe.style.fontWeight = cs.fontWeight;
    probe.style.letterSpacing = cs.letterSpacing;
    probe.style.lineHeight = cs.lineHeight;
    probe.textContent = text;

    probe.style.whiteSpace = "nowrap";
    probe.style.width = "auto";
    // scrollWidth rounds to a whole pixel, but actual sub-pixel text layout
    // can be a hair wider; pad it so single-line words never wrap by a hair.
    const naturalWidth = probe.scrollWidth + 1;

    const width = Math.min(naturalWidth, availableWidth());

    probe.style.whiteSpace = "normal";
    probe.style.overflowWrap = "break-word";
    probe.style.wordBreak = "break-word";
    probe.style.width = `${width}px`;
    const lines = Math.max(1, Math.round(probe.scrollHeight / lineHeightPx));
    const height = lines * fontSize * LINE_BUFFER;

    return { width, height };
  }

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  );

  let index = 0; // ADJECTIVES[0] is already in the markup

  // Fraction of the outgoing word's height used as a visual gap between it
  // and the incoming word, so they don't appear to touch while stacked.
  const GAP_RATIO = 0.1;

  let currentHeight = 0; // px height of whichever word is currently resting at top:0

  function fitWord(el) {
    // Measure the word off-layout so it (and the container) can be sized
    // to it. Words too wide for the viewport wrap onto a second line
    // instead of overflowing it.
    const { width, height } = measure(el.textContent);

    // Fix the word's own width AND height immediately (no transition)
    // rather than leaving them driven by the animating container.
    //
    // Width: a word with a natural break opportunity (e.g. a hyphen)
    // re-wraps between 1 and 2 lines at whatever intermediate width the
    // container is passing through mid-transition, which reads as a
    // mid-animation jump.
    //
    // Height: sizing this per-word rather than off the container keeps
    // each word's own box a stable, known quantity to position against.
    el.style.width = `${width}px`;
    el.style.height = `${height}px`;

    return { width, height };
  }

  function positionWord(el, top) {
    el.style.top = `${top}px`;
  }

  function swapRoles(newHeight) {
    currentEl.setAttribute("aria-hidden", "true");
    nextEl.removeAttribute("aria-hidden");
    [currentEl, nextEl] = [nextEl, currentEl];
    currentHeight = newHeight;

    // The word that just finished being current is now the "next" role
    // again, but it's still sitting at top:0 — exactly where it needs to
    // be while visible, and exactly where it must NOT be once it's not.
    // Tuck it below the fold so it doesn't sit there overlapping the new
    // current word for the whole hold period until it's needed again.
    positionWord(nextEl, currentHeight + currentHeight * GAP_RATIO);
  }

  function advance() {
    index = (index + 1) % ADJECTIVES.length;
    nextEl.textContent = ADJECTIVES[index];
    const { width: nextWidth, height: nextHeight } = fitWord(nextEl);

    if (reducedMotion.matches) {
      positionWord(nextEl, 0);
      container.style.width = `${nextWidth}px`;
      container.style.height = `${nextHeight}px`;
      swapRoles(nextHeight);
      return;
    }

    // Park the incoming word directly beneath wherever the outgoing word's
    // bottom edge currently sits — NOT beneath its own height. That's the
    // only start position guaranteed not to overlap the outgoing word no
    // matter how their line counts compare (e.g. 1 line -> 2 lines), since
    // the two words then occupy disjoint regions in the track's local
    // coordinate space before, during, and after the animation: a single
    // shared transform on the track can slide them both without either
    // ever entering the other's territory.
    const travel = currentHeight + currentHeight * GAP_RATIO;
    positionWord(nextEl, travel);

    // Double rAF: the first frame commits the parked position above;
    // only once that's actually painted do we trigger the track's
    // transform transition, so it always starts from a rendered frame
    // instead of racing the browser's paint schedule.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        container.style.width = `${nextWidth}px`;
        container.style.height = `${nextHeight}px`;
        track.style.transform = `translateY(-${travel}px)`;

        window.setTimeout(() => {
          // Snap the track back to its resting transform instantly, and
          // move the (about to become current) word to top:0 to match —
          // a same-distance reset in both, so nothing visibly moves.
          track.style.transition = "none";
          track.style.transform = "translateY(0)";
          positionWord(nextEl, 0);

          swapRoles(nextHeight);

          void track.offsetHeight; // commit before re-enabling the transition
          track.style.transition = "";
        }, TRANSITION_MS);
      });
    });
  }

  let timer = null;

  function scheduleNext() {
    timer = window.setTimeout(() => {
      advance();
      scheduleNext();
    }, HOLD_MS);
  }

  function stop() {
    if (timer !== null) {
      window.clearTimeout(timer);
      timer = null;
    }
  }

  // Pause the cycle while the tab/screen is hidden (background tab, phone
  // locked) and resume fresh on return, instead of letting a throttled
  // timer fire a jarring catch-up transition when it comes back.
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stop();
    } else if (timer === null) {
      scheduleNext();
    }
  });

  // Lock in the initial width once fonts have settled, so the very first
  // transition doesn't jump.
  function init() {
    const { width, height } = fitWord(currentEl);
    positionWord(currentEl, 0);
    container.style.width = `${width}px`;
    container.style.height = `${height}px`;
    currentHeight = height;
    scheduleNext();
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(init);
  } else {
    init();
  }

  // Re-fit on resize/orientation change since font size is viewport-relative.
  let resizeTimer;
  window.addEventListener("resize", () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      container.style.transition = "none";
      const { width, height } = fitWord(currentEl);
      container.style.width = `${width}px`;
      container.style.height = `${height}px`;
      currentHeight = height;
      void container.offsetHeight;
      container.style.transition = "";
    }, 100);
  });
})();
