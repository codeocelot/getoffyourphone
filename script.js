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
    "surveillance",
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

  function fitContainerTo(el) {
    // Measure the word off-layout so the container can animate to its size.
    // Words too wide for the viewport wrap onto a second line instead of
    // overflowing it.
    const { width, height } = measure(el.textContent);
    container.style.width = `${width}px`;
    container.style.height = `${height}px`;
  }

  function swapRoles() {
    currentEl.classList.replace("is-current", "is-next");
    nextEl.classList.replace("is-next", "is-current");
    currentEl.setAttribute("aria-hidden", "true");
    nextEl.removeAttribute("aria-hidden");
    [currentEl, nextEl] = [nextEl, currentEl];
  }

  function advance() {
    index = (index + 1) % ADJECTIVES.length;
    nextEl.textContent = ADJECTIVES[index];

    if (reducedMotion.matches) {
      swapRoles();
      fitContainerTo(currentEl);
      return;
    }

    // Force a reflow so the new word's resting position is committed
    // before the animating class triggers the scroll transition.
    void track.offsetHeight;

    fitContainerTo(nextEl);
    track.classList.add("is-animating");

    window.setTimeout(() => {
      track.classList.remove("is-animating");
      swapRoles();
    }, TRANSITION_MS);
  }

  // Lock in the initial width once fonts have settled, so the very first
  // transition doesn't jump.
  function init() {
    fitContainerTo(currentEl);
    window.setInterval(advance, HOLD_MS);
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
      fitContainerTo(currentEl);
      void container.offsetHeight;
      container.style.transition = "";
    }, 100);
  });
})();
