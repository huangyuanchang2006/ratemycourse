const bayAsset = (name) => new URL(`assets/bay/${name}`, import.meta.url).href;

const BAY_MOTION = Object.freeze({
  desktop: Object.freeze({
    backdropStart: 0.66,
    firstFadeStart: 0.66,
    firstFadeEnd: 0.74,
    firstInert: 0.7,
    stageTwoStart: 0.74,
    stageTwoExpose: 0.765,
    stageTwoEnd: 0.79,
    farScale: 1.1,
    nearScale: 1.5,
  }),
  mobile: Object.freeze({
    backdropStart: 0.61,
    firstFadeStart: 0.61,
    firstFadeEnd: 0.7,
    firstInert: 0.655,
    stageTwoStart: 0.7,
    stageTwoExpose: 0.72,
    stageTwoEnd: 0.74,
    farScale: 1.08,
    nearScale: 1.42,
  }),
});

const FOLIAGE_CROP_STOPS = Object.freeze([
  { ratio: 320 / 740, scale: 0.9, height: 740, x: 606, y: 42 },
  { ratio: 390 / 844, scale: 0.97, height: 844, x: 594, y: 0 },
  { ratio: 1440 / 900, scale: 1.64, height: 900, x: 246, y: 67 },
  { ratio: 1440 / 810, scale: 1.68, height: 810, x: 256, y: 90 },
  { ratio: 2560 / 1080, scale: 2.32, height: 1080, x: 254, y: 90 },
]);

const BLUE_FOLIAGE_FILTER =
  '<svg class="bay-filter-defs" aria-hidden="true" focusable="false" width="0" height="0">' +
  '<defs><filter id="tokyo-blue-foliage" color-interpolation-filters="sRGB" x="0%" y="0%" width="100%" height="100%">' +
  '<feColorMatrix type="matrix" values=".52 .25 .12 0 0 .12 .73 .17 0 0 .11 .28 .80 0 .006 0 0 0 1 0"></feColorMatrix>' +
  "</filter></defs></svg>";

function foliageCrop(width, height) {
  const ratio = width / height;
  let lower = FOLIAGE_CROP_STOPS[0];
  let upper = FOLIAGE_CROP_STOPS.at(-1);
  for (let i = 1; i < FOLIAGE_CROP_STOPS.length; i += 1) {
    if (ratio <= FOLIAGE_CROP_STOPS[i].ratio) {
      lower = FOLIAGE_CROP_STOPS[i - 1];
      upper = FOLIAGE_CROP_STOPS[i];
      break;
    }
    lower = upper = FOLIAGE_CROP_STOPS[i];
  }
  const range = upper.ratio - lower.ratio;
  const mix = range ? Math.max(0, Math.min(1, (ratio - lower.ratio) / range)) : 0;
  const scalePerReferencePixel =
    lower.scale / lower.height +
    (upper.scale / upper.height - lower.scale / lower.height) * mix;
  let scale = scalePerReferencePixel * height;
  let x = lower.x + (upper.x - lower.x) * mix;
  let y = lower.y + (upper.y - lower.y) * mix;

  // Keep the center opening balanced on ultra-wide canvases where the headline keeps its CSS size.
  const wideMix = Math.max(
    0,
    Math.min(1, (ratio - 16 / 9) / (2560 / 1080 - 16 / 9)),
  );
  if (wideMix > 0) scale = Math.max(scale, 1.68 + (2.06 - 1.68) * wideMix);

  scale = Math.max(scale, width / 1440, height / 1162);
  x = Math.max(0, Math.min(x, 1440 - width / scale));
  y = Math.max(0, Math.min(y, 1162 - height / scale));
  return { scale, x, y };
}

let enginePromise;

function loadVendorScript(name) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = new URL(`vendor/${name}`, import.meta.url).href;
    script.addEventListener("load", resolve, { once: true });
    script.addEventListener("error", reject, { once: true });
    document.head.append(script);
  });
}

function getMotionEngine() {
  enginePromise ??= (async () => {
    if (!window.gsap) await loadVendorScript("gsap.min.js");
    if (!window.ScrollTrigger) await loadVendorScript("ScrollTrigger.min.js");
    const { gsap, ScrollTrigger } = window;
    gsap.registerPlugin(ScrollTrigger);
    return { gsap, ScrollTrigger };
  })().catch((error) => {
    enginePromise = undefined;
    throw error;
  });
  return enginePromise;
}

export function renderBayHero(t) {
  return `<section class="bay-hero scroll-container" aria-label="${t("Tokyo bay course journey", "东京湾选课旅程")}">
    <div class="bay-stage sticky-container" tabindex="-1" aria-label="${t("Course discovery story", "课程发现故事")}">
      <div class="bg-main" aria-hidden="true">
        <picture class="bay-backdrop">
          <source media="(max-width: 700px)" srcset="${bayAsset("bay-phone.webp")}" width="390" height="844">
          <img src="${bayAsset("bay-desktop.webp")}" alt="" width="1440" height="900" fetchpriority="high">
        </picture>
        <picture class="bay-city">
          <source media="(max-width: 700px)" srcset="${bayAsset("city-mobile.webp")}" width="816" height="960">
          <img src="${bayAsset("city.webp")}" alt="" width="1920" height="960" fetchpriority="high">
        </picture>
        <div class="bay-water">
          <div class="bay-vessel" aria-hidden="true">
            <img class="bay-reflection" src="${bayAsset("night-reflection.webp")}" alt="" width="301" height="298">
            <img class="bay-sail" src="${bayAsset("night-sail.webp")}" alt="" width="301" height="500">
          </div>
        </div>
      </div>
      <div class="bg-scroll" aria-hidden="true">
        ${BLUE_FOLIAGE_FILTER}
        <div class="bay-foliage">
          <img class="bay-foliage-art" src="${bayAsset("background-min-3.png")}" alt="" width="1440" height="1162">
        </div>
      </div>
      <div class="hero-parent">
        <h1 id="bay-title" lang="en">Chart your <span>own course</span></h1>
        <p class="bay-intro">${t(
          "Explore Waseda’s university-wide open courses through firsthand student reviews.",
          "从早稻田同学的修课经历出发，发现专业之外的全校开放课程。",
        )}</p>
        <a class="bay-cta" href="./#/browse" data-gate="./#/browse">${t("Explore courses", "探索课程")}</a>
      </div>
      <div class="overlay" aria-hidden="true"></div>
      <div class="intro-parent" inert aria-hidden="true">
        <h2 tabindex="-1" lang="en">RateMyCourse</h2>
        <p class="bay-stage-description">${t(
          "Your Major is a Starting Point. RateMyCourse helps Waseda students discover courses beyond their major through peer reviews, and we’re building an AI adviser that uses those reviews and official credit requirements to help them plan what to take.",
          "你的专业是一个起点。RateMyCourse 帮助早稻田学生通过同学的课程评价，发现专业之外的课程。我们也在开发一位 AI 选课顾问，结合这些评价和官方学分要求，帮助学生规划选课。",
        )}</p>
      </div>
      <div class="bay-route" aria-hidden="true"><span></span></div>
      <svg class="bay-scroll-cue" viewBox="0 0 42 29" aria-hidden="true" focusable="false">
        <path d="M20.5 3v18M20.5 3 10 17h10.5V3ZM21.5 6l10 11h-10V6ZM5 22h32c-3.3 4-8.3 5.5-16 5.5S8.3 26 5 22Z"></path>
      </svg>
    </div>
  </section>`;
}

export function updateBayHeroCopy(hero, t) {
  if (!hero) return;
  hero.setAttribute("aria-label", t("Tokyo bay course journey", "东京湾选课旅程"));
  hero
    .querySelector(".bay-stage")
    ?.setAttribute("aria-label", t("Course discovery story", "课程发现故事"));
  const intro = hero.querySelector(".bay-intro");
  if (intro)
    intro.textContent = t(
      "Explore Waseda’s university-wide open courses through firsthand student reviews.",
      "从早稻田同学的修课经历出发，发现专业之外的全校开放课程。",
    );
  const cta = hero.querySelector(".bay-cta");
  if (cta) cta.textContent = t("Explore courses", "探索课程");
  const desc = hero.querySelector(".bay-stage-description");
  if (desc)
    desc.textContent = t(
      "Your Major is a Starting Point. RateMyCourse helps Waseda students discover courses beyond their major through peer reviews, and we’re building an AI adviser that uses those reviews and official credit requirements to help them plan what to take.",
      "你的专业是一个起点。RateMyCourse 帮助早稻田学生通过同学的课程评价，发现专业之外的课程。我们也在开发一位 AI 选课顾问，结合这些评价和官方学分要求，帮助学生规划选课。",
    );
}

export function renderBayCredits(t) {
  return `<p class="bay-credit">
    <span>${t("Tokyo city artwork adapted with AI assistance from", "东京城市图以 AI 辅助改编自")}
    <a href="https://www.flickr.com/photos/batardy_sebastien/4092898500/" target="_blank" rel="noreferrer">“Tokyo tower” by sebastien batardy</a>,
    <a href="https://creativecommons.org/licenses/by/2.0/" target="_blank" rel="noreferrer">CC BY 2.0</a>${t("; recomposed, color graded, cropped and vertically inverted.", "；经重新构图、调色、裁切与上下倒置。")}</span>
    <span>${t("Original bay foliage artwork by Joseph Berry at", "海湾枝叶原作为 Joseph Berry 创作于")}
    <a href="https://the-goonies.webflow.io/" target="_blank" rel="noreferrer">The Goonies</a>${t("; blue-toned adaptation used with the project owner’s authorization.", "；蓝调改编经项目负责人授权使用。")}</span>
  </p>`;
}

export function mountBayScroll(hero) {
  if (!hero) return () => {};
  let disposed = false;
  let media;

  const stage = hero.querySelector(".bay-stage");
  const first = hero.querySelector(".hero-parent");
  const second = hero.querySelector(".intro-parent");
  const secondHeading = second.querySelector("h2");
  const description = second.querySelector(".bay-stage-description");
  const foliageArt = hero.querySelector(".bay-foliage-art");
  const route = hero.querySelector(".bay-route span");
  const scrollCue = hero.querySelector(".bay-scroll-cue");

  let foliageFrame = 0;
  const updateFoliageCrop = () => {
    if (!foliageArt || !stage) return;
    const { width, height } = stage.getBoundingClientRect();
    if (!width || !height) return;
    const crop = foliageCrop(width, height);
    foliageArt.style.left = `${-crop.x * crop.scale}px`;
    foliageArt.style.top = `${-crop.y * crop.scale}px`;
    foliageArt.style.width = `${1440 * crop.scale}px`;
    foliageArt.style.height = "auto";
    foliageArt.dataset.cropScale = crop.scale.toFixed(6);
  };
  const scheduleFoliageCrop = () => {
    cancelAnimationFrame(foliageFrame);
    foliageFrame = requestAnimationFrame(updateFoliageCrop);
  };
  updateFoliageCrop();
  window.addEventListener("resize", scheduleFoliageCrop, { passive: true });
  const stageObserver =
    typeof ResizeObserver === "function"
      ? new ResizeObserver(scheduleFoliageCrop)
      : null;
  stageObserver?.observe(stage);

  let motion = BAY_MOTION.desktop;
  const setExposure = (progress) => {
    const hideFirst = progress >= motion.firstInert;
    const showSecond = progress >= motion.stageTwoExpose;
    if (first.inert === hideFirst && second.inert === !showSecond) return;

    if (hideFirst && first.contains(document.activeElement))
      stage.focus({ preventScroll: true });
    if (!showSecond && second.contains(document.activeElement))
      stage.focus({ preventScroll: true });
    first.inert = hideFirst;
    first.setAttribute("aria-hidden", String(hideFirst));
    second.inert = !showSecond;
    second.setAttribute("aria-hidden", String(!showSecond));
  };

  // Fallback keeps both stages accessible in normal flow under reduced motion or short viewports.
  const resetExposure = () => {
    first.inert = false;
    first.setAttribute("aria-hidden", "false");
    second.inert = false;
    second.setAttribute("aria-hidden", "false");
  };
  resetExposure();

  getMotionEngine()
    .then(({ gsap, ScrollTrigger }) => {
      if (disposed) return;
      media = gsap.matchMedia();
      media.add(
        {
          motion: "(prefers-reduced-motion: no-preference)",
          tall: "(min-height: 560px)",
          mobile: "(max-width: 700px)",
        },
        ({ conditions }) => {
          if (disposed || !conditions.motion || !conditions.tall) return;
          const mobile = conditions.mobile;
          motion = BAY_MOTION[mobile ? "mobile" : "desktop"];

          hero.classList.add("bay-motion");
          updateFoliageCrop();
          first.inert = false;
          second.inert = true;
          first.setAttribute("aria-hidden", "false");
          second.setAttribute("aria-hidden", "true");

          const timeline = gsap.timeline({
            defaults: { ease: "none" },
            scrollTrigger: {
              trigger: hero,
              start: "top top",
              end: "bottom bottom",
              scrub: 0.32,
              invalidateOnRefresh: true,
              onUpdate: (self) => setExposure(self.animation?.progress() ?? 0),
              onRefresh: (self) =>
                setExposure(
                  self.animation?.progress() ?? timeline.progress() ?? 0,
                ),
            },
          });

          timeline
            .to(hero, { "--progress": 1, duration: 1 }, 0)
            .to(
              ".bg-main",
              {
                scale: motion.farScale,
                duration: motion.firstFadeEnd,
                ease: "power1.in",
              },
              0,
            )
            .to(
              ".bay-city",
              {
                height: mobile ? "54%" : "61%",
                scaleX: 1.06,
                duration: motion.firstFadeEnd - motion.firstFadeStart,
                ease: "power1.in",
              },
              motion.firstFadeStart,
            )
            .to(
              ".bg-scroll",
              {
                scale: motion.nearScale,
                y: () => -stage.offsetHeight * 0.06,
                duration: motion.firstFadeEnd,
                ease: "power1.in",
              },
              0,
            )
            .to(".hero-parent", { y: -28, duration: motion.firstFadeStart }, 0)
            .to(".overlay", { opacity: 0.85, duration: 0.08 }, motion.backdropStart)
            .to(
              ".hero-parent",
              {
                y: -58,
                opacity: 0,
                duration: motion.firstFadeEnd - motion.firstFadeStart,
              },
              motion.firstFadeStart,
            )
            .to(
              ".intro-parent",
              {
                y: 0,
                opacity: 1,
                duration: motion.stageTwoEnd - motion.stageTwoStart,
              },
              motion.stageTwoStart,
            )
            .fromTo(
              secondHeading,
              { y: 20 },
              { y: 0, duration: 0.07, ease: "power2.out" },
              motion.stageTwoStart,
            )
            .fromTo(
              description,
              { y: 28, opacity: 0 },
              { y: 0, opacity: 1, duration: 0.09, ease: "power2.out" },
              motion.stageTwoStart + 0.02,
            )
            .to(
              scrollCue,
              { autoAlpha: 0, duration: 0.07, ease: "power2.out" },
              motion.stageTwoStart,
            )
            .fromTo(
              route,
              { yPercent: -100 },
              {
                yPercent: 0,
                duration: 0.91 - motion.stageTwoEnd,
                ease: "sine.inOut",
              },
              motion.stageTwoEnd,
            )
            .to(
              route,
              { yPercent: 100, duration: 0.05, ease: "sine.inOut" },
              0.95,
            )
            .eventCallback("onUpdate", () => setExposure(timeline.progress()));

          ScrollTrigger.refresh();
          return () => {
            hero.classList.remove("bay-motion");
            resetExposure();
            gsap.set(hero, { clearProps: "--progress" });
            updateFoliageCrop();
          };
        },
        hero,
      );
    })
    .catch(() => {
      hero.classList.remove("bay-motion");
      media?.revert();
      resetExposure();
      updateFoliageCrop();
    });

  return () => {
    disposed = true;
    window.removeEventListener("resize", scheduleFoliageCrop);
    stageObserver?.disconnect();
    cancelAnimationFrame(foliageFrame);
    media?.revert();
    if (hero.contains(document.activeElement)) {
      stage.focus({ preventScroll: true });
    }
  };
}
