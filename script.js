function initializeCarousel(carousel) {
  const slides = [...carousel.querySelectorAll(".slide, .testimonial-slide")];
  const controls = carousel.querySelector(".carousel-controls");
  slides.forEach((slide, position) => {
    slide.setAttribute("aria-label", `${position + 1} of ${slides.length}`);
  });
  if (slides.length <= 1) {
    if (controls) controls.hidden = true;
    return;
  }

  const label = carousel.dataset.carousel;
  const status = carousel.querySelector('[role="status"]');
  let currentSlide = 0;
  let resetSwipe = () => {};
  const dots = slides.map((slide, index) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.setAttribute("aria-label", `Show ${label.toLowerCase()} ${index + 1}`);
    dot.addEventListener("click", () => showSlide(index));
    return dot;
  });
  carousel.querySelector(".slide-dots").replaceChildren(...dots);

  function showSlide(index, announce = true) {
    resetSwipe();
    currentSlide = (index + slides.length) % slides.length;
    slides.forEach((slide, position) => {
      slide.hidden = position !== currentSlide;
      dots[position].setAttribute("aria-pressed", String(position === currentSlide));
    });
    if (announce) status.textContent = `${label} ${currentSlide + 1} of ${slides.length}`;
  }

  carousel.querySelector(".previous").addEventListener("click", () => showSlide(currentSlide - 1));
  carousel.querySelector(".next").addEventListener("click", () => showSlide(currentSlide + 1));
  controls.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      showSlide(currentSlide + (event.key === "ArrowRight" ? 1 : -1));
    }
  });
  showSlide(0, false);
  controls.hidden = false;

  const swipeSurface = carousel.querySelector(".slides");
  if (swipeSurface) {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let gesture = null;
    resetSwipe = () => {
      const pointerId = gesture?.pointerId;
      gesture = null;
      carousel.classList.remove("is-dragging");
      slides.forEach((slide) => { slide.style.transform = ""; });
      if (pointerId !== undefined && swipeSurface.hasPointerCapture(pointerId)) {
        swipeSurface.releasePointerCapture(pointerId);
      }
    };
    carousel.classList.add("is-swipeable");
    const hint = carousel.querySelector(".swipe-hint");
    if (hint) hint.hidden = false;
    swipeSurface.addEventListener("dragstart", (event) => event.preventDefault());
    swipeSurface.addEventListener("pointerdown", (event) => {
      if (!event.isPrimary || event.button !== 0 || gesture) return;
      gesture = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
      swipeSurface.setPointerCapture(event.pointerId);
    });
    swipeSurface.addEventListener("pointermove", (event) => {
      if (!gesture || gesture.pointerId !== event.pointerId) return;
      const dx = event.clientX - gesture.x;
      const dy = event.clientY - gesture.y;
      if (!carousel.classList.contains("is-dragging")) {
        if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) {
          resetSwipe();
          return;
        }
        if (Math.abs(dx) <= 10) return;
        carousel.classList.add("is-dragging");
      }
      if (!reducedMotion.matches) {
        const tilt = Math.max(-12, Math.min(12, dx / 20));
        slides[currentSlide].style.transform = `translateX(${dx}px) rotate(${tilt}deg)`;
      }
    });
    swipeSurface.addEventListener("pointerup", (event) => {
      if (!gesture || gesture.pointerId !== event.pointerId) return;
      const dx = event.clientX - gesture.x;
      const dy = event.clientY - gesture.y;
      const threshold = Math.max(40, Math.min(72, swipeSurface.clientWidth * .15));
      resetSwipe();
      if (Math.abs(dx) >= threshold && Math.abs(dx) > Math.abs(dy)) {
        showSlide(currentSlide + (dx < 0 ? 1 : -1));
      }
    });
    swipeSurface.addEventListener("pointercancel", resetSwipe);
    swipeSurface.addEventListener("lostpointercapture", resetSwipe);
  }
}

document.querySelectorAll("[data-carousel]").forEach(initializeCarousel);

const navigation = document.querySelector(".section-nav");
const links = [...navigation.querySelectorAll('a[href^="#"]')];
const sections = links.map((link) => document.querySelector(link.getAttribute("href")));
let scrollPending = false;

function updateNavigation() {
  const threshold = navigation.getBoundingClientRect().height + 60;
  let activeIndex = 0;
  sections.forEach((section, index) => {
    if (section.getBoundingClientRect().top <= threshold) activeIndex = index;
  });
  if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
    activeIndex = sections.length - 1;
  }
  links.forEach((link, index) => {
    if (index === activeIndex) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  });
  scrollPending = false;
}

function scheduleNavigationUpdate() {
  if (!scrollPending) {
    scrollPending = true;
    window.requestAnimationFrame(updateNavigation);
  }
}

window.addEventListener("scroll", scheduleNavigationUpdate, { passive: true });
window.addEventListener("resize", scheduleNavigationUpdate);
window.addEventListener("pageshow", scheduleNavigationUpdate);
updateNavigation();
