import { alignmentPageSession } from "../stores/alignmentPageSession";
import { practicePageSession } from "../stores/practicePageSession";
import { scoringMatrixPage } from "../stores/scoringMatrixPage";
import { normalizeRoutePath, withBase } from "../lib/routes";

function syncCurrentRouteState() {
  const currentPath = normalizeRoutePath(window.location.pathname);
  const alignmentPath = normalizeRoutePath(withBase("/"));
  const practicePath = normalizeRoutePath(withBase("/practice"));
  const matricesPath = normalizeRoutePath(withBase("/matrices"));

  if (currentPath === alignmentPath) {
    alignmentPageSession.reset();
    return;
  }

  if (currentPath === practicePath) {
    practicePageSession.reset();
    return;
  }

  if (currentPath === matricesPath) {
    scoringMatrixPage.resetFromSearch(window.location.search);
  }
}

syncCurrentRouteState();

document.addEventListener("astro:after-swap", () => {
  syncCurrentRouteState();
});
