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

function createProjectLink(href, label, iconId = "arrow") {
  const link = document.createElement("a");
  link.href = href;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  if (iconId === "github") link.className = "github-icon-link";
  else link.append(label);

  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon.setAttribute("aria-hidden", "true");
  const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
  use.setAttribute("href", `#${iconId}`);
  icon.append(use);
  link.append(icon);

  const accessibleNote = document.createElement("span");
  accessibleNote.className = "sr-only";
  accessibleNote.textContent = `${label} (opens in a new tab)`;
  link.append(accessibleNote);
  return link;
}

function getWebUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function createProjectCard(repository) {
  const card = document.createElement("article");
  card.className = "project-card";

  const heading = document.createElement("h3");
  const repositoryUrl = getWebUrl(repository.html_url);
  heading.textContent = repository.name;

  const description = document.createElement("p");
  description.className = "project-description";
  description.textContent = repository.description || "No repository description has been added yet.";

  const metadata = document.createElement("ul");
  metadata.className = "project-meta";
  const metadataItems = [
    `Updated ${new Intl.DateTimeFormat("en", { month: "short", year: "numeric" }).format(new Date(repository.pushed_at))}`
  ].filter(Boolean);
  metadataItems.forEach((value) => {
    const item = document.createElement("li");
    item.textContent = value;
    metadata.append(item);
  });

  card.append(heading, description, metadata);

  if (repository.topics?.length) {
    const topics = document.createElement("ul");
    topics.className = "project-topics";
    topics.setAttribute("aria-label", "Repository topics");
    repository.topics.slice(0, 4).forEach((topic) => {
      const item = document.createElement("li");
      item.textContent = topic;
      topics.append(item);
    });
    card.append(topics);
  }

  const actions = document.createElement("div");
  actions.className = "project-actions";
  if (repositoryUrl) actions.append(createProjectLink(repositoryUrl, "View repository on GitHub", "github"));
  const homepageUrl = getWebUrl(repository.homepage);
  if (homepageUrl) actions.append(createProjectLink(homepageUrl, "Live project"));
  if (actions.children.length) card.append(actions);

  return card;
}

async function loadGitHubProjects() {
  const section = document.querySelector("[data-github-user]");
  if (!section) return;

  const grid = section.querySelector(".project-grid");
  const status = section.querySelector(".project-status");
  const user = section.dataset.githubUser;
  const endpoint = `https://api.github.com/users/${encodeURIComponent(user)}/repos?type=owner&sort=pushed&direction=desc&per_page=100`;

  try {
    const response = await fetch(endpoint, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
      }
    });
    if (!response.ok) {
      throw new Error(`GitHub API returned HTTP ${response.status}`);
    }

    const repositories = await response.json();
    if (!Array.isArray(repositories)) {
      throw new Error("GitHub API returned an unexpected response");
    }

    const projects = repositories
      .filter((repository) => (
        !repository.fork
        && !repository.archived
        && repository.name.toLowerCase() !== "satwiki.github.io"
      ))
      .slice(0, 3);
    if (!projects.length) {
      status.textContent = "No public source repositories are available right now.";
      return;
    }

    grid.replaceChildren(...projects.map(createProjectCard));
    grid.setAttribute("aria-busy", "false");
    status.hidden = true;
  } catch (error) {
    grid.setAttribute("aria-busy", "false");
    status.textContent = "Projects could not be loaded from GitHub right now. Use the link below to view them directly.";
    console.error("Unable to load GitHub projects:", error);
  }
}

loadGitHubProjects();

const navigation = document.querySelector(".section-nav");
const links = [...navigation.querySelectorAll('a[href^="#"]')];
const sections = links.map((link) => document.querySelector(link.getAttribute("href")));
const backToTop = document.querySelector(".back-to-top");
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
  const showBackToTop = window.scrollY > 120;
  backToTop.classList.toggle("is-visible", showBackToTop);
  backToTop.setAttribute("aria-hidden", String(!showBackToTop));
  backToTop.tabIndex = showBackToTop ? 0 : -1;
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
