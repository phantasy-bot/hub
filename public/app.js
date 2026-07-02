const THEME_KEY = "phantasy-hub-theme";
const VIEW_KEY = "phantasy-hub-catalog-view";
const SIDEBAR_KEY = "phantasy-hub-sidebar";
const SORT_KEY = "phantasy-hub-catalog-sort";
const DESKTOP_QUERY = "(min-width: 961px)";
const desktopMedia = window.matchMedia(DESKTOP_QUERY);
const palette = document.querySelector("[data-command-palette]");
const openButtons = document.querySelectorAll("[data-command-palette-open]");
const closeButtons = document.querySelectorAll("[data-command-palette-close]");
const searchInput = document.querySelector("[data-command-palette-input]");
const resultsRoot = document.querySelector("[data-command-palette-results]");
const copyButtons = document.querySelectorAll("[data-copy-code]");
const themeToggle = document.querySelector("[data-theme-toggle]");
const themeToggleLabel = document.querySelector("[data-theme-toggle-label]");
const sidebarToggle = document.querySelector("[data-sidebar-toggle]");
const viewToggleButtons = document.querySelectorAll("[data-catalog-view-target]");
const sortControl = document.querySelector("[data-catalog-sort]");
const browseTabs = document.querySelectorAll("[data-browse-kind]");
const browseSections = document.querySelectorAll("[data-browse-section]");
const entryGrids = document.querySelectorAll(".entryGrid, .entryGridTight");
const kindInstallCode = document.querySelector("[data-kind-install-code]");
const kindInstallCopy = document.querySelector("[data-kind-install-copy]");
let paletteItems = [];
let activeIndex = 0;
let copyFeedbackTimer = null;

function isDesktopLayout() {
  return desktopMedia.matches;
}

function getPreferredTheme() {
  const storedTheme = window.localStorage.getItem(THEME_KEY);
  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme;
  }
  return "dark";
}

function applyTheme(theme) {
  const resolved = theme === "light" ? "light" : "dark";
  const nextTheme = resolved === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", resolved);
  document.documentElement.style.colorScheme = resolved;
  window.localStorage.setItem(THEME_KEY, resolved);
  if (themeToggleLabel) {
    themeToggleLabel.textContent = `Switch to ${nextTheme} mode`;
  }
  if (themeToggle) {
    themeToggle.setAttribute("aria-label", `Switch to ${nextTheme} mode`);
    themeToggle.setAttribute("title", `Switch to ${nextTheme} mode`);
  }
}

function getPreferredCatalogView() {
  const storedView = window.localStorage.getItem(VIEW_KEY);
  if (storedView === "grid" || storedView === "list") {
    return storedView;
  }
  return "list";
}

function getPreferredSidebarState() {
  const storedState = window.localStorage.getItem(SIDEBAR_KEY);
  if (storedState === "collapsed" || storedState === "expanded") {
    return storedState;
  }
  return "expanded";
}

function getPreferredCatalogSort() {
  const storedSort = window.localStorage.getItem(SORT_KEY);
  if (
    storedSort === "default" ||
    storedSort === "name" ||
    storedSort === "workspace" ||
    storedSort === "category"
  ) {
    return storedSort;
  }
  return "default";
}

function applySidebarState(state) {
  const resolved = state === "collapsed" ? "collapsed" : "expanded";
  const nextState = resolved === "collapsed" ? "expanded" : "collapsed";
  const nextLabel = nextState === "collapsed" ? "Minimize sidebar" : "Expand sidebar";
  document.body.setAttribute("data-sidebar-state", resolved);
  window.localStorage.setItem(SIDEBAR_KEY, resolved);

  if (sidebarToggle) {
    sidebarToggle.setAttribute("aria-label", nextLabel);
    sidebarToggle.setAttribute("title", nextLabel);
  }
}

function applyCatalogView(view) {
  const resolved = view === "grid" ? "grid" : "list";
  document.body.setAttribute("data-catalog-view", resolved);
  window.localStorage.setItem(VIEW_KEY, resolved);
  viewToggleButtons.forEach((button) => {
    const isActive = button.getAttribute("data-catalog-view-target") === resolved;
    button.setAttribute("data-active", isActive ? "true" : "false");
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

function buildInstallCommand(kind, slug = "<slug>") {
  return `phantasy extensions install ${kind} ${slug}`;
}

function updateKindInstallSnippet(kind) {
  if (!kindInstallCode && !kindInstallCopy) {
    return;
  }

  const resolvedKind =
    kind === "plugin" || kind === "skill" || kind === "workflow" || kind === "mcp"
      ? kind
      : "plugin";
  const command = buildInstallCommand(resolvedKind, "<slug>");

  if (kindInstallCode) {
    kindInstallCode.textContent = command;
  }
  if (kindInstallCopy) {
    kindInstallCopy.setAttribute("data-copy-code", command);
  }
}

function compareSortStrings(left, right) {
  return left.localeCompare(right, undefined, { sensitivity: "base" });
}

function getCardSortValue(card, key) {
  return (card.getAttribute(`data-sort-${key}`) || "").trim().toLowerCase();
}

function applyCatalogSort(sortMode) {
  const resolvedSort =
    sortMode === "name" || sortMode === "workspace" || sortMode === "category"
      ? sortMode
      : "default";

  document.body.setAttribute("data-catalog-sort", resolvedSort);
  window.localStorage.setItem(SORT_KEY, resolvedSort);

  if (sortControl) {
    sortControl.value = resolvedSort;
  }

  entryGrids.forEach((grid) => {
    const cards = [...grid.querySelectorAll(":scope > .entryCard")];
    cards.sort((left, right) => {
      if (resolvedSort === "default") {
        return (
          Number(left.getAttribute("data-sort-index") || "0") -
          Number(right.getAttribute("data-sort-index") || "0")
        );
      }

      if (resolvedSort === "name") {
        return compareSortStrings(
          getCardSortValue(left, "name"),
          getCardSortValue(right, "name"),
        );
      }

      if (resolvedSort === "workspace") {
        const byWorkspace = compareSortStrings(
          getCardSortValue(left, "workspace"),
          getCardSortValue(right, "workspace"),
        );
        if (byWorkspace !== 0) {
          return byWorkspace;
        }
      }

      if (resolvedSort === "category") {
        const byCategory = compareSortStrings(
          getCardSortValue(left, "category"),
          getCardSortValue(right, "category"),
        );
        if (byCategory !== 0) {
          return byCategory;
        }
      }

      return compareSortStrings(
        getCardSortValue(left, "name"),
        getCardSortValue(right, "name"),
      );
    });

    cards.forEach((card) => {
      grid.appendChild(card);
    });
  });
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function updateCopyButtonState(button, state) {
  if (!button) {
    return;
  }
  button.setAttribute("data-copy-state", state);
  const label = button.getAttribute("data-copy-label") || "snippet";
  const title = state === "copied" ? `Copied ${label}` : `Copy ${label}`;
  button.setAttribute("aria-label", title);
  button.setAttribute("title", title);
}

async function loadPaletteItems() {
  if (paletteItems.length > 0) {
    return paletteItems;
  }
  const response = await fetch("/registry/extensions.json");
  if (!response.ok) {
    throw new Error(`Failed to load registry: ${response.status}`);
  }
  paletteItems = await response.json();
  return paletteItems;
}

function filterPaletteItems(items, query) {
  const normalizedQuery = query.trim().toLowerCase();
  return items
    .filter((item) => {
      if (!normalizedQuery) {
        return true;
      }
      return [
        item.displayName,
        item.description,
        item.kind,
        item.workspaceLabel,
        ...(item.tags || []),
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    })
    .slice(0, 12);
}

function renderPaletteResults(items, query) {
  if (!resultsRoot) {
    return;
  }

  const filtered = filterPaletteItems(items, query);
  activeIndex = Math.min(activeIndex, Math.max(filtered.length - 1, 0));
  resultsRoot.innerHTML =
    filtered.length === 0
      ? '<p class="paletteEmpty">No matching extensions.</p>'
      : filtered
          .map(
            (item, index) => `
        <a class="paletteResult${index === activeIndex ? " paletteResultActive" : ""}" href="${item.detailPath}" data-result-index="${index}">
          <span class="paletteResultMain">
            <strong>${item.displayName}</strong>
            <small>${item.kind.toUpperCase()} • ${item.workspaceLabel}</small>
          </span>
          <span class="paletteResultMeta">${item.packageName || item.slug}</span>
        </a>`,
          )
          .join("");
}

function renderPaletteError(message) {
  if (!resultsRoot) {
    return;
  }
  resultsRoot.innerHTML = `<p class="paletteEmpty">${message}</p>`;
}

async function openPalette() {
  if (!palette) {
    return;
  }
  palette.hidden = false;
  document.body.classList.add("paletteOpen");

  try {
    const items = await loadPaletteItems();
    activeIndex = 0;
    renderPaletteResults(items, "");
  } catch (error) {
    renderPaletteError("Unable to load the catalog right now.");
  }

  if (searchInput) {
    searchInput.focus();
    searchInput.select();
  }
}

function closePalette() {
  if (!palette) {
    return;
  }
  palette.hidden = true;
  document.body.classList.remove("paletteOpen");
}

function getHomeActiveKindFromHash() {
  const hash = window.location.hash || "";
  if (!hash.startsWith("#kind-")) {
    return "";
  }
  return hash.slice("#kind-".length);
}

function getSectionForKind(kind) {
  return document.querySelector(`[data-browse-section="${kind}"]`);
}

function setActiveBrowseTab(kind, options = {}) {
  const { updateHash = false, scrollToSection = false } = options;
  if (!kind) {
    return;
  }

  document.body.setAttribute("data-active-kind", kind);
  updateKindInstallSnippet(kind);

  browseTabs.forEach((tab) => {
    const isActive = tab.getAttribute("data-browse-kind") === kind;
    tab.setAttribute("data-active", isActive ? "true" : "false");
    if (isActive) {
      tab.setAttribute("aria-current", "page");
    } else {
      tab.removeAttribute("aria-current");
    }
  });

  if (updateHash) {
    const hash = `#kind-${kind}`;
    window.history.replaceState(null, "", `${window.location.pathname}${hash}`);
  }

  if (scrollToSection) {
    const section = getSectionForKind(kind);
    section?.scrollIntoView({ block: "start", behavior: "smooth" });
  }
}

function initializeBrowseTabs() {
  if (browseTabs.length === 0) {
    return;
  }

  const pageKind = document.body.getAttribute("data-page-kind");

  browseTabs.forEach((tab) => {
    tab.addEventListener("click", (event) => {
      const kind = tab.getAttribute("data-browse-kind");
      if (!kind) {
        return;
      }

      if (pageKind === "home") {
        event.preventDefault();
        setActiveBrowseTab(kind, {
          updateHash: true,
          scrollToSection: !isDesktopLayout(),
        });
      }
    });
  });

  if (pageKind && pageKind !== "home") {
    setActiveBrowseTab(pageKind);
    return;
  }

  const initialKind =
    getHomeActiveKindFromHash() ||
    document.body.getAttribute("data-active-kind") ||
    browseTabs[0]?.getAttribute("data-browse-kind") ||
    "";

  if (initialKind) {
    setActiveBrowseTab(initialKind);
  }

  window.addEventListener("hashchange", () => {
    const nextKind = getHomeActiveKindFromHash();
    if (nextKind) {
      setActiveBrowseTab(nextKind, {
        scrollToSection: !isDesktopLayout(),
      });
    }
  });

  if (!("IntersectionObserver" in window) || browseSections.length === 0) {
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      if (isDesktopLayout()) {
        return;
      }

      const visibleEntries = entries
        .filter((entry) => entry.isIntersecting)
        .sort((left, right) => right.intersectionRatio - left.intersectionRatio);

      if (visibleEntries.length === 0) {
        return;
      }

      const nextKind = visibleEntries[0].target.getAttribute("data-browse-section") || "";
      if (nextKind) {
        setActiveBrowseTab(nextKind);
      }
    },
    {
      rootMargin: "-18% 0px -55% 0px",
      threshold: [0.2, 0.35, 0.55],
    },
  );

  browseSections.forEach((section) => observer.observe(section));

  if (typeof desktopMedia.addEventListener === "function") {
    desktopMedia.addEventListener("change", () => {
      const currentKind =
        document.body.getAttribute("data-active-kind") ||
        browseTabs[0]?.getAttribute("data-browse-kind") ||
        "";
      if (currentKind) {
        setActiveBrowseTab(currentKind);
      }
    });
  }
}

document.addEventListener("keydown", async (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    if (palette && !palette.hidden) {
      closePalette();
    } else {
      await openPalette();
    }
    return;
  }

  if (!palette || palette.hidden) {
    return;
  }

  if (event.key === "Escape") {
    closePalette();
    return;
  }

  const items = await loadPaletteItems().catch(() => []);
  const query = searchInput ? searchInput.value : "";
  const filtered = filterPaletteItems(items, query);

  if (event.key === "ArrowDown") {
    event.preventDefault();
    activeIndex = Math.min(activeIndex + 1, Math.max(filtered.length - 1, 0));
    renderPaletteResults(items, query);
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    activeIndex = Math.max(activeIndex - 1, 0);
    renderPaletteResults(items, query);
  }

  if (event.key === "Enter" && filtered[activeIndex]) {
    window.location.href = filtered[activeIndex].detailPath;
  }
});

searchInput?.addEventListener("input", async (event) => {
  const items = await loadPaletteItems().catch(() => []);
  activeIndex = 0;
  renderPaletteResults(items, event.target.value || "");
});

themeToggle?.addEventListener("click", () => {
  const current =
    document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
  applyTheme(current === "dark" ? "light" : "dark");
});

sidebarToggle?.addEventListener("click", () => {
  const current =
    document.body.getAttribute("data-sidebar-state") === "collapsed"
      ? "collapsed"
      : "expanded";
  applySidebarState(current === "collapsed" ? "expanded" : "collapsed");
});

viewToggleButtons.forEach((button) => {
  button.addEventListener("click", () => {
    applyCatalogView(button.getAttribute("data-catalog-view-target"));
  });
});

sortControl?.addEventListener("change", (event) => {
  applyCatalogSort(event.target.value);
});

openButtons.forEach((button) => {
  button.addEventListener("click", () => {
    void openPalette();
  });
});

copyButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    const value = button.getAttribute("data-copy-code") || "";
    if (!value) {
      return;
    }

    try {
      await copyText(value);
      if (copyFeedbackTimer) {
        window.clearTimeout(copyFeedbackTimer);
      }
      copyButtons.forEach((candidate) => updateCopyButtonState(candidate, "idle"));
      updateCopyButtonState(button, "copied");
      copyFeedbackTimer = window.setTimeout(() => {
        updateCopyButtonState(button, "idle");
        copyFeedbackTimer = null;
      }, 1600);
    } catch {
      updateCopyButtonState(button, "idle");
    }
  });
});

closeButtons.forEach((button) => button.addEventListener("click", closePalette));

applyTheme(getPreferredTheme());
applyCatalogView(getPreferredCatalogView());
applySidebarState(getPreferredSidebarState());
applyCatalogSort(getPreferredCatalogSort());
initializeBrowseTabs();

