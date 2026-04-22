const themeLabels = {
  system: "Auto",
  light: "Light",
  dark: "Dark",
} as const;

type ThemePreference = keyof typeof themeLabels;

interface ThemeController {
  getPreference: () => ThemePreference;
  getNextPreference: (currentPreference: ThemePreference) => ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

const openClasses = [
  "max-h-40",
  "opacity-100",
  "translate-y-0",
  "pointer-events-auto",
];
const closedClasses = [
  "max-h-0",
  "opacity-0",
  "-translate-y-1",
  "pointer-events-none",
];

function getThemeController(): ThemeController | undefined {
  return (window as Window & { themeController?: ThemeController })
    .themeController;
}

function setMobileMenuState(
  menu: HTMLElement,
  toggle: HTMLButtonElement,
  isOpen: boolean,
): void {
  menu.dataset.open = String(isOpen);
  menu.classList.remove(...(isOpen ? closedClasses : openClasses));
  menu.classList.add(...(isOpen ? openClasses : closedClasses));
  toggle.setAttribute("aria-expanded", String(isOpen));
}

function applyThemeButtonsState(): void {
  const themeController = getThemeController();
  const preference = themeController?.getPreference() ?? "system";
  const labelText = themeLabels[preference];

  document
    .querySelectorAll<HTMLButtonElement>("[data-theme-toggle]")
    .forEach((button) => {
      const label = button.querySelector("[data-theme-label]");
      const systemIcon = button.querySelector('[data-theme-icon="system"]');
      const lightIcon = button.querySelector('[data-theme-icon="light"]');
      const darkIcon = button.querySelector('[data-theme-icon="dark"]');

      if (label) {
        label.textContent = labelText;
      }

      button.setAttribute("aria-label", `Theme: ${labelText}`);
      button.title = `Theme: ${labelText}`;

      systemIcon?.classList.toggle("hidden", preference !== "system");
      lightIcon?.classList.toggle("hidden", preference !== "light");
      darkIcon?.classList.toggle("hidden", preference !== "dark");
    });
}

function setupTopBar(): void {
  const toggle = document.querySelector<HTMLButtonElement>(
    "[data-mobile-nav-toggle]",
  );
  const menu = document.querySelector<HTMLElement>("[data-mobile-nav]");

  if (toggle && menu) {
    setMobileMenuState(menu, toggle, false);
    toggle.onclick = () => {
      const isOpen = menu.dataset.open === "true";
      setMobileMenuState(menu, toggle, !isOpen);
    };
  }

  document
    .querySelectorAll<HTMLButtonElement>("[data-theme-toggle]")
    .forEach((button) => {
      button.onclick = () => {
        const themeController = getThemeController();

        if (!themeController) {
          return;
        }

        const currentPreference = themeController.getPreference();
        const nextPreference =
          themeController.getNextPreference(currentPreference);

        themeController.setPreference(nextPreference);
        applyThemeButtonsState();
      };
    });

  applyThemeButtonsState();
}

setupTopBar();

document.addEventListener("astro:page-load", () => {
  setupTopBar();
});
