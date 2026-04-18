// IntersectionObserver-driven reveal + in-view toggle for tiles.
// Spec §7.6 + §8.1.

export function observeReveals(root = document) {
  if (!("IntersectionObserver" in window)) {
    // Fallback: show everything.
    root.querySelectorAll(".reveal").forEach((el) => el.classList.add("is-visible"));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        io.unobserve(entry.target);
      }
    }
  }, { threshold: 0.08, rootMargin: "0px 0px -8% 0px" });

  root.querySelectorAll(".reveal").forEach((el) => io.observe(el));
}

export function observeTilesInView(root = document) {
  if (!("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      entry.target.dataset.inView = entry.isIntersecting ? "true" : "false";
    }
  }, { threshold: 0.2 });

  root.querySelectorAll(".tile").forEach((el) => io.observe(el));
}
