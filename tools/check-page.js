// In-page layout check. Paste this function into Playwright's browser_evaluate on the built deck.
// It visits every slide (Reveal hides distant slides, so each one must be shown before measuring)
// and reports content that is clipped, scrolls inside a box, or lacks a source footer.
async (only = "") => {
  const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const wanted = (s) =>
    !only || only.split(",").some((p) => s.id.startsWith(p) || (s.parentElement && s.parentElement.id === p));
  await document.fonts.ready;
  const exempt = (s) =>
    s.id === "title" || s.classList.contains("part-divider") || s.classList.contains("chapter-title");
  const failures = [];
  const slides = Reveal.getSlides().filter(wanted);
  for (const s of slides) {
    const { h, v } = Reveal.getIndices(s);
    Reveal.slide(h, v ?? 0);
    await frame();
    const where = `${h}/${v ?? 0}`;
    const add = (kind, detail) => failures.push({ index: where, id: s.id, kind, detail });
    if (s.scrollHeight > s.clientHeight + 1) add("height", `${s.scrollHeight}px > ${s.clientHeight}px`);
    if (s.scrollWidth > s.clientWidth + 1) add("width", `${s.scrollWidth}px > ${s.clientWidth}px`);
    // Content must end above the source footer (or above the bottom padding when there is no footer).
    const footer = s.querySelector(":scope > .src");
    const limit = footer
      ? footer.offsetTop - 4
      : s.clientHeight - parseFloat(getComputedStyle(s).paddingBottom || "0");
    let bottom = 0;
    for (const child of s.children) {
      if (child === footer || getComputedStyle(child).position === "absolute") continue;
      bottom = Math.max(bottom, child.offsetTop + child.offsetHeight);
    }
    if (bottom > limit + 1) add("overlap", `content ends at ${bottom}px, limit ${Math.round(limit)}px`);
    for (const el of s.querySelectorAll("*")) {
      if (el.closest(".scroll-y")) continue;
      const cs = getComputedStyle(el);
      if (cs.overflowX !== "visible" && el.scrollWidth > el.clientWidth + 1) {
        add("scroll-x", `${el.tagName.toLowerCase()}.${el.className || ""} ${el.scrollWidth}>${el.clientWidth}`);
      }
      if (cs.overflowY !== "visible" && el.scrollHeight > el.clientHeight + 1) {
        add("scroll-y", `${el.tagName.toLowerCase()}.${el.className || ""} ${el.scrollHeight}>${el.clientHeight}`);
      }
    }
    if (!exempt(s) && !s.querySelector(".src")) add("no-src", "");
  }
  Reveal.slide(0, 0);
  return { total: slides.length, failures };
};
