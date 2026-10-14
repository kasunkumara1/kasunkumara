const roles = [
  "Expert Video Editor",
  "AI Ad Generator",
  "Graphic Designer",
  "Content Creator",
  "Photographer"
];

const roleElement = document.getElementById("dynamic-role");
let roleIndex = 0;
let characterIndex = roles[0].length;
let deleting = true;

function typeRoles() {
  if (!roleElement) return;
  const current = roles[roleIndex];
  if (deleting) {
    characterIndex -= 1;
    roleElement.textContent = current.slice(0, Math.max(characterIndex, 0));
    if (characterIndex <= 0) {
      deleting = false;
      roleIndex = (roleIndex + 1) % roles.length;
      setTimeout(typeRoles, 260);
      return;
    }
    setTimeout(typeRoles, 28);
  } else {
    const next = roles[roleIndex];
    characterIndex += 1;
    roleElement.textContent = next.slice(0, characterIndex);
    if (characterIndex >= next.length) {
      deleting = true;
      setTimeout(typeRoles, 1500);
      return;
    }
    setTimeout(typeRoles, 52);
  }
}
if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) setTimeout(typeRoles, 1450);

const header = document.querySelector(".site-header");
const menuToggle = document.querySelector(".menu-toggle");
const navMenu = document.querySelector(".nav-menu");
const navLinks = [...document.querySelectorAll(".nav-link")];
function closeMenu() {
  navMenu?.classList.remove("open");
  menuToggle?.classList.remove("active");
  menuToggle?.setAttribute("aria-expanded", "false");
  document.body.classList.remove("menu-open");
}
menuToggle?.addEventListener("click", () => {
  const isOpen = navMenu.classList.toggle("open");
  menuToggle.classList.toggle("active", isOpen);
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  document.body.classList.toggle("menu-open", isOpen);
});
document.querySelectorAll('.nav-menu a[href^="#"]').forEach(link => link.addEventListener("click", closeMenu));
window.addEventListener("resize", () => { if (window.innerWidth > 980) closeMenu(); });
function updateHeader() { header?.classList.toggle("scrolled", window.scrollY > 20); }
updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });

const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: "0px 0px -35px" });
function observeReveal(root = document) { root.querySelectorAll?.(".reveal:not(.visible)").forEach(el => revealObserver.observe(el)); }
observeReveal();

const sections = [...document.querySelectorAll("main section[id]")];
const sectionObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    navLinks.forEach(link => link.classList.toggle("active", link.getAttribute("href") === `#${entry.target.id}`));
  });
}, { rootMargin: "-38% 0px -52%", threshold: 0 });
sections.forEach(section => sectionObserver.observe(section));

const lightbox = document.getElementById("lightbox");
const lightboxMedia = document.getElementById("lightbox-media");
const lightboxTitle = document.getElementById("lightbox-title");
const lightboxDescription = document.getElementById("lightbox-description");
const lightboxTags = document.getElementById("lightbox-tags");
const lightboxMeta = document.getElementById("lightbox-meta");
const lightboxProjectLink = document.getElementById("lightbox-project-link");
const lightboxClose = document.querySelector(".lightbox-close");
let projectMap = new Map();
let categoryMap = new Map();

function text(value) { return value == null ? "" : String(value); }
function openWork(project) {
  if (!lightbox || !lightboxMedia || !lightboxTitle) return;
  lightboxTitle.textContent = project.title || "Selected Project";
  if (lightboxDescription) lightboxDescription.textContent = project.description || "Selected portfolio project.";
  if (lightboxTags) {
    lightboxTags.replaceChildren();
    (project.tags || []).forEach(tag => {
      const chip = document.createElement("span");
      chip.textContent = tag;
      lightboxTags.appendChild(chip);
    });
  }
  if (lightboxMeta) {
    lightboxMeta.replaceChildren();
    const items = [
      ["Client", project.client],
      ["Year", project.year],
      ["Role", project.role],
      ["Tools", project.tools]
    ].filter(([, value]) => value);
    items.forEach(([label, value]) => {
      const item = document.createElement("div");
      const small = document.createElement("small");
      const strong = document.createElement("strong");
      small.textContent = label;
      strong.textContent = value;
      item.append(small, strong);
      lightboxMeta.appendChild(item);
    });
  }
  lightboxMedia.replaceChildren();
  if (project.media) {
    if (project.mediaType === "video") {
      const video = document.createElement("video");
      video.src = project.media;
      video.controls = true;
      video.playsInline = true;
      video.preload = "metadata";
      lightboxMedia.appendChild(video);
    } else {
      const img = document.createElement("img");
      img.src = project.media;
      img.alt = project.title || "Portfolio project";
      lightboxMedia.appendChild(img);
    }
  } else {
    const fallback = document.createElement("div");
    fallback.className = "lightbox-concept";
    fallback.textContent = "PROJECT";
    lightboxMedia.appendChild(fallback);
  }
  if (lightboxProjectLink) {
    if (project.externalUrl) {
      lightboxProjectLink.href = project.externalUrl;
      lightboxProjectLink.hidden = false;
    } else {
      lightboxProjectLink.hidden = true;
    }
  }
  lightbox.classList.add("open");
  lightbox.setAttribute("aria-hidden", "false");
  document.body.classList.add("lightbox-open");
}
function closeLightbox() {
  const playing = lightboxMedia?.querySelector("video");
  if (playing) playing.pause();
  lightbox?.classList.remove("open");
  lightbox?.setAttribute("aria-hidden", "true");
  document.body.classList.remove("lightbox-open");
}
lightboxClose?.addEventListener("click", closeLightbox);
lightbox?.addEventListener("click", event => { if (event.target === lightbox) closeLightbox(); });
document.addEventListener("keydown", event => { if (event.key === "Escape") closeLightbox(); });

function createProjectCard(project) {
  const article = document.createElement("article");
  const layoutClass = project.layout === "wide" ? "work-card-wide" : project.layout === "tall" ? "work-card-tall" : "";
  article.className = `work-card ${layoutClass} reveal`;
  article.dataset.category = project.category;
  article.dataset.projectId = project.id;
  article.tabIndex = 0;
  article.setAttribute("role", "button");
  article.setAttribute("aria-label", `View ${project.title}`);

  const mediaWrap = document.createElement("div");
  mediaWrap.className = "work-image";
  if (project.media) {
    if (project.mediaType === "video") {
      const video = document.createElement("video");
      video.src = project.media;
      video.muted = true;
      video.playsInline = true;
      video.preload = "metadata";
      mediaWrap.appendChild(video);
      const badge = document.createElement("span");
      badge.className = "media-type-badge";
      badge.textContent = "VIDEO";
      mediaWrap.appendChild(badge);
    } else {
      const img = document.createElement("img");
      img.src = project.media;
      img.alt = project.title;
      img.loading = "lazy";
      mediaWrap.appendChild(img);
    }
  } else {
    const placeholder = document.createElement("div");
    placeholder.className = "project-placeholder";
    placeholder.textContent = "GK / PROJECT";
    mediaWrap.appendChild(placeholder);
  }

  const overlay = document.createElement("div");
  overlay.className = "work-overlay";
  const cat = document.createElement("span");
  cat.textContent = categoryMap.get(project.category)?.label || project.category || "PROJECT";
  const title = document.createElement("h3");
  title.textContent = project.title;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "view-work";
  button.textContent = "View Project ↗";
  overlay.append(cat, title, button);
  article.append(mediaWrap, overlay);

  const open = () => openWork(project);
  article.addEventListener("click", open);
  article.addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(); } });
  article.addEventListener("mouseenter", () => {
    const video = article.querySelector("video");
    if (video) video.play().catch(() => {});
  });
  article.addEventListener("mouseleave", () => {
    const video = article.querySelector("video");
    if (video) { video.pause(); video.currentTime = 0; }
  });
  return article;
}

function applyPortfolioFilter(filter) {
  document.querySelectorAll("#portfolio-grid .work-card").forEach(card => {
    const matches = filter === "all" || card.dataset.category === filter;
    card.classList.toggle("hidden", !matches);
  });
}

function renderFilters(categories) {
  const filterBar = document.getElementById("portfolio-filters");
  if (!filterBar) return;
  filterBar.replaceChildren();
  const all = document.createElement("button");
  all.className = "filter-btn active";
  all.dataset.filter = "all";
  all.textContent = "All";
  filterBar.appendChild(all);
  categories.sort((a,b) => (a.order || 0) - (b.order || 0)).forEach(category => {
    const button = document.createElement("button");
    button.className = "filter-btn";
    button.dataset.filter = category.id;
    button.textContent = category.label;
    filterBar.appendChild(button);
  });
  filterBar.querySelectorAll(".filter-btn").forEach(button => {
    button.addEventListener("click", () => {
      filterBar.querySelectorAll(".filter-btn").forEach(btn => btn.classList.remove("active"));
      button.classList.add("active");
      applyPortfolioFilter(button.dataset.filter);
    });
  });
}

async function loadPortfolio() {
  const grid = document.getElementById("portfolio-grid");
  if (!grid) return;
  try {
    const [categoryResponse, projectResponse] = await Promise.all([
      fetch("data/categories.json", { cache: "no-store" }),
      fetch("data/projects.json", { cache: "no-store" })
    ]);
    if (!categoryResponse.ok || !projectResponse.ok) throw new Error("Portfolio data could not be loaded.");
    const categories = await categoryResponse.json();
    const projects = await projectResponse.json();
    categoryMap = new Map(categories.map(category => [category.id, category]));
    projectMap = new Map(projects.map(project => [project.id, project]));
    renderFilters(categories);
    grid.replaceChildren();
    const published = projects
      .filter(project => project.published !== false)
      .sort((a,b) => (Number(b.featured) - Number(a.featured)) || ((a.order || 999) - (b.order || 999)));
    if (!published.length) {
      const empty = document.createElement("div");
      empty.className = "portfolio-empty spotlight-card";
      empty.innerHTML = "<strong>New work is being prepared.</strong><span>Check back soon for fresh projects.</span>";
      grid.appendChild(empty);
      return;
    }
    published.forEach(project => grid.appendChild(createProjectCard(project)));
    observeReveal(grid);
  } catch (error) {
    grid.innerHTML = `<div class="portfolio-empty spotlight-card"><strong>Portfolio unavailable.</strong><span>${text(error.message)}</span></div>`;
  }
}

async function loadSiteSettings() {
  try {
    const response = await fetch("data/site.json", { cache: "no-store" });
    if (!response.ok) return;
    const site = await response.json();
    const availability = document.getElementById("availability-text");
    if (availability && site.availability) availability.textContent = site.availability;
    const emailLink = document.getElementById("contact-email");
    if (emailLink && site.email) {
      emailLink.href = `mailto:${site.email}`;
      emailLink.querySelector("strong").textContent = site.email;
    }
    const linkedin = document.getElementById("contact-linkedin");
    if (linkedin && site.linkedin) { linkedin.href = site.linkedin; linkedin.querySelector("strong").textContent = "LinkedIn Profile"; linkedin.target = "_blank"; linkedin.rel = "noopener"; }
    const fiverr = document.getElementById("contact-fiverr");
    if (fiverr && site.fiverr) { fiverr.href = site.fiverr; fiverr.querySelector("strong").textContent = "Fiverr Profile"; fiverr.target = "_blank"; fiverr.rel = "noopener"; }
    const resume = document.getElementById("resume-link");
    if (resume && site.resume) { resume.href = site.resume; resume.target = "_blank"; resume.rel = "noopener"; resume.textContent = "Download Resume ↗"; }
    window.PORTFOLIO_SITE = site;
  } catch (_) {}
}

const glow = document.querySelector(".mouse-glow");
if (glow && window.matchMedia("(pointer:fine)").matches) {
  window.addEventListener("pointermove", event => {
    glow.style.left = `${event.clientX}px`;
    glow.style.top = `${event.clientY}px`;
  }, { passive: true });
}
document.querySelectorAll(".spotlight-card").forEach(card => {
  card.addEventListener("pointermove", event => {
    const rect = card.getBoundingClientRect();
    card.style.setProperty("--mouse-x", `${event.clientX - rect.left}px`);
    card.style.setProperty("--mouse-y", `${event.clientY - rect.top}px`);
  });
});

const contactForm = document.getElementById("contact-form");
contactForm?.addEventListener("submit", event => {
  event.preventDefault();
  const site = window.PORTFOLIO_SITE || {};
  const destinationEmail = site.email || "your-email@example.com";
  const formData = new FormData(contactForm);
  const name = formData.get("name");
  const email = formData.get("email");
  const project = formData.get("project");
  const message = formData.get("message");
  const subject = encodeURIComponent(`${project} enquiry from ${name}`);
  const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\nProject type: ${project}\n\nProject details:\n${message}`);
  window.location.href = `mailto:${destinationEmail}?subject=${subject}&body=${body}`;
});

Promise.allSettled([loadSiteSettings(), loadPortfolio()]);
