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
  ];

  const HOLD_MS = 2600; // how long each adjective stays on screen
  const TRANSITION_MS = 450; // must match the CSS transition duration

  const container = document.getElementById("adjective");
  const track = document.getElementById("adjective-track");
  let currentEl = document.getElementById("word-current");
  let nextEl = document.getElementById("word-next");

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  );

  let index = 0; // ADJECTIVES[0] is already in the markup

  function fitContainerTo(el) {
    // Measure the word off-layout so the container can animate to its width.
    container.style.width = `${el.scrollWidth}px`;
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
