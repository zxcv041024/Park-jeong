const menus = [
  { id: "single", name: "\uC2F1\uAE00", scoopCount: 1, price: 3500 },
  { id: "double", name: "\uB354\uBE14", scoopCount: 2, price: 5500 },
  { id: "triple", name: "\uD2B8\uB9AC\uD50C", scoopCount: 3, price: 7500 },
];

const flavors = [
  "\uBC14\uB2D0\uB77C",
  "\uCD08\uCF5C\uB9BF",
  "\uB538\uAE30",
  "\uBBFC\uD2B8\uCD08\uCF54",
  "\uCFE0\uD0A4\uC564\uD06C\uB9BC",
  "\uB179\uCC28",
  "\uCD08\uCF54\uCE69",
  "\uB9DD\uACE0",
  "\uC694\uAC70\uD2B8",
  "\uBE14\uB8E8\uBCA0\uB9AC",
];

const containers = [
  { id: "cup", name: "\uCEF5", price: 0 },
  { id: "waffle-cone", name: "\uC640\uD50C\uCF58", price: 1000 },
];

const addons = [
  { id: "choco-syrup", name: "\uCD08\uCF54 \uC2DC\uB7FD", price: 500 },
  { id: "caramel-syrup", name: "\uCE74\uB77C\uBA5C \uC2DC\uB7FD", price: 500 },
  { id: "sprinkles", name: "\uC2A4\uD504\uB9C1\uD074", price: 500 },
  { id: "oreo", name: "\uC624\uB808\uC624 \uD1A0\uD551", price: 1000 },
];

const spoonOptions = ["\uC120\uD0DD \uC548 \uD568", "1\uAC1C", "2\uAC1C", "3\uAC1C", "4\uAC1C"];
const etaOptions = ["5\uBD84\uC774\uB0B4", "10~30\uBD84", "30\uBD84 \uC774\uC0C1"];

const copy = {
  selectPrompt: "\uC120\uD0DD \uC804",
  noAddon: "\uCD94\uAC00 \uC548 \uD568",
  noExtraCharge: "\uCD94\uAC00\uAE08 \uC5C6\uC74C",
  selected: "\uC120\uD0DD\uB428",
  tapToAdd: "\uD130\uCE58\uD574\uC11C \uCD94\uAC00",
  spoonCount: "\uC22B\uAC00\uB77D \uC218\uB7C9",
  etaLabel: "\uC608\uC0C1 \uC774\uB3D9 \uC2DC\uAC04",
  flavorPickGuide: "\uBA3C\uC800 \uBA54\uC778 \uBA54\uB274\uB97C \uC120\uD0DD\uD574\uC8FC\uC138\uC694.",
  orderReady: "\uC8FC\uBB38\uC774 \uC811\uC218\uB418\uC5C8\uC5B4\uC694.",
};

const state = {
  selectedMenu: "",
  selectedFlavors: [],
  selectedContainer: "",
  selectedAddons: [],
  selectedSpoon: "",
  selectedEta: "",
};

const menuGrid = document.getElementById("menuGrid");
const flavorGrid = document.getElementById("flavorGrid");
const containerGrid = document.getElementById("containerGrid");
const addonGrid = document.getElementById("addonGrid");
const spoonGrid = document.getElementById("spoonGrid");
const etaGrid = document.getElementById("etaGrid");
const summaryContent = document.getElementById("summaryContent");
const flavorGuide = document.getElementById("flavorGuide");
const submitButton = document.getElementById("submitButton");
const orderDialog = document.getElementById("orderDialog");
const dialogMessage = document.getElementById("dialogMessage");
const closeDialog = document.getElementById("closeDialog");

function formatPrice(value) {
  return `${value.toLocaleString("ko-KR")}\uC6D0`;
}

function getSelectedMenu() {
  return menus.find((menu) => menu.id === state.selectedMenu);
}

function getContainer() {
  return containers.find((container) => container.id === state.selectedContainer);
}

function getSelectedAddons() {
  return addons.filter((addon) => state.selectedAddons.includes(addon.id));
}

function calculateTotal() {
  const menuPrice = getSelectedMenu()?.price ?? 0;
  const containerPrice = getContainer()?.price ?? 0;
  const addonPrice = getSelectedAddons().reduce((sum, addon) => sum + addon.price, 0);
  return menuPrice + containerPrice + addonPrice;
}

function renderMenuOptions() {
  menuGrid.innerHTML = menus
    .map(
      (menu) => `
        <div class="choice-card menu-card">
          <input type="radio" name="menu" id="${menu.id}" value="${menu.id}" ${state.selectedMenu === menu.id ? "checked" : ""}>
          <label for="${menu.id}">
            <span class="card-title">${menu.name}</span>
            <span class="card-subtitle">${menu.scoopCount}\uAC00\uC9C0 \uB9DB \uC120\uD0DD \u00B7 ${formatPrice(menu.price)}</span>
          </label>
        </div>
      `
    )
    .join("");

  menuGrid.querySelectorAll('input[name="menu"]').forEach((input) => {
    input.addEventListener("change", (event) => {
      state.selectedMenu = event.target.value;
      const allowedCount = getSelectedMenu().scoopCount;
      state.selectedFlavors = state.selectedFlavors.slice(0, allowedCount);
      renderFlavors();
      renderSummary();
    });
  });
}

function renderFlavors() {
  const selectedMenu = getSelectedMenu();
  const allowedCount = selectedMenu?.scoopCount ?? 0;

  flavorGuide.textContent = selectedMenu
    ? `${selectedMenu.name} \uBA54\uB274\uB294 ${allowedCount}\uAC00\uC9C0 \uB9DB\uC744 \uC120\uD0DD\uD574\uC57C \uD574\uC694.`
    : copy.flavorPickGuide;

  flavorGrid.innerHTML = flavors
    .map((flavor) => {
      const isChecked = state.selectedFlavors.includes(flavor);
      const isDisabled = !selectedMenu || (!isChecked && state.selectedFlavors.length >= allowedCount);

      return `
        <div class="choice-card flavor-card ${isDisabled ? "disabled" : ""}">
          <input
            type="checkbox"
            name="flavor"
            id="flavor-${flavor}"
            value="${flavor}"
            ${isChecked ? "checked" : ""}
            ${isDisabled ? "disabled" : ""}
          >
          <label for="flavor-${flavor}">
            <span class="card-title">${flavor}</span>
            <span class="card-subtitle">${isChecked ? copy.selected : copy.tapToAdd}</span>
          </label>
        </div>
      `;
    })
    .join("");

  flavorGrid.querySelectorAll('input[name="flavor"]').forEach((input) => {
    input.addEventListener("change", (event) => {
      const { value, checked } = event.target;
      if (checked) {
        state.selectedFlavors = [...state.selectedFlavors, value];
      } else {
        state.selectedFlavors = state.selectedFlavors.filter((item) => item !== value);
      }

      renderFlavors();
      renderSummary();
    });
  });
}

function renderContainerOptions() {
  containerGrid.innerHTML = containers
    .map(
      (container) => `
        <div class="choice-card option-card">
          <input type="radio" name="container" id="${container.id}" value="${container.id}" ${state.selectedContainer === container.id ? "checked" : ""}>
          <label for="${container.id}">
            <span class="card-title">${container.name}</span>
            <span class="card-subtitle">${container.price ? `+${formatPrice(container.price)}` : copy.noExtraCharge}</span>
          </label>
        </div>
      `
    )
    .join("");

  containerGrid.querySelectorAll('input[name="container"]').forEach((input) => {
    input.addEventListener("change", (event) => {
      state.selectedContainer = event.target.value;
      renderSummary();
    });
  });
}

function renderAddonOptions() {
  addonGrid.innerHTML = addons
    .map(
      (addon) => `
        <div class="choice-card option-card">
          <input type="checkbox" name="addon" id="${addon.id}" value="${addon.id}" ${state.selectedAddons.includes(addon.id) ? "checked" : ""}>
          <label for="${addon.id}">
            <span class="card-title">${addon.name}</span>
            <span class="card-subtitle">+${formatPrice(addon.price)}</span>
          </label>
        </div>
      `
    )
    .join("");

  addonGrid.querySelectorAll('input[name="addon"]').forEach((input) => {
    input.addEventListener("change", (event) => {
      const { value, checked } = event.target;
      if (checked) {
        state.selectedAddons = [...state.selectedAddons, value];
      } else {
        state.selectedAddons = state.selectedAddons.filter((item) => item !== value);
      }
      renderSummary();
    });
  });
}

function renderSpoonOptions() {
  spoonGrid.innerHTML = spoonOptions
    .map(
      (option, index) => `
        <div class="choice-card spoon-card">
          <input type="radio" name="spoon" id="spoon-${index}" value="${option}" ${state.selectedSpoon === option ? "checked" : ""}>
          <label for="spoon-${index}">
            <span class="card-title">${option}</span>
            <span class="card-subtitle">${copy.spoonCount}</span>
          </label>
        </div>
      `
    )
    .join("");

  spoonGrid.querySelectorAll('input[name="spoon"]').forEach((input) => {
    input.addEventListener("change", (event) => {
      state.selectedSpoon = event.target.value;
      renderSummary();
    });
  });
}

function renderEtaOptions() {
  etaGrid.innerHTML = etaOptions
    .map(
      (option, index) => `
        <div class="choice-card eta-card">
          <input type="radio" name="eta" id="eta-${index}" value="${option}" ${state.selectedEta === option ? "checked" : ""}>
          <label for="eta-${index}">
            <span class="card-title">${option}</span>
            <span class="card-subtitle">${copy.etaLabel}</span>
          </label>
        </div>
      `
    )
    .join("");

  etaGrid.querySelectorAll('input[name="eta"]').forEach((input) => {
    input.addEventListener("change", (event) => {
      state.selectedEta = event.target.value;
      renderSummary();
    });
  });
}

function isFormValid() {
  const menu = getSelectedMenu();
  return Boolean(
    menu &&
      state.selectedFlavors.length === menu.scoopCount &&
      state.selectedContainer &&
      state.selectedSpoon &&
      state.selectedEta
  );
}

function renderSummary() {
  const menu = getSelectedMenu();
  const container = getContainer();
  const selectedAddons = getSelectedAddons();
  const total = calculateTotal();
  const isValid = isFormValid();

  summaryContent.innerHTML = `
    <div class="receipt-block">
      <p class="receipt-label">\uBA54\uC778 \uBA54\uB274</p>
      <p class="receipt-value">${menu ? `${menu.name} (${formatPrice(menu.price)})` : copy.selectPrompt}</p>
    </div>
    <div class="receipt-block">
      <p class="receipt-label">\uB9DB \uC120\uD0DD</p>
      <p class="receipt-value">${state.selectedFlavors.length ? state.selectedFlavors.join(", ") : copy.selectPrompt}</p>
    </div>
    <div class="receipt-block">
      <p class="receipt-label">\uC6A9\uAE30 \uC120\uD0DD</p>
      <p class="receipt-value">${container ? `${container.name}${container.price ? ` (+${formatPrice(container.price)})` : ""}` : copy.selectPrompt}</p>
    </div>
    <div class="receipt-block">
      <p class="receipt-label">\uCD94\uAC00 \uC635\uC158</p>
      <p class="receipt-value">${selectedAddons.length ? selectedAddons.map((addon) => `${addon.name} (+${formatPrice(addon.price)})`).join("<br>") : copy.noAddon}</p>
    </div>
    <div class="receipt-block">
      <p class="receipt-label">\uC22B\uAC00\uB77D / \uB3C4\uCC29 \uC2DC\uAC04</p>
      <p class="receipt-value">${state.selectedSpoon || copy.selectPrompt} / ${state.selectedEta || copy.selectPrompt}</p>
    </div>
    ${
      menu && state.selectedFlavors.length !== menu.scoopCount
        ? `<p class="warning-text">\uB9DB\uC744 ${menu.scoopCount}\uAC00\uC9C0 \uBAA8\uB450 \uC120\uD0DD\uD574\uC57C \uC8FC\uBB38\uD560 \uC218 \uC788\uC5B4\uC694.</p>`
        : ""
    }
    <div class="receipt-price">
      <span>\uCD1D \uACB0\uC81C \uAE08\uC561</span>
      <strong>${formatPrice(total)}</strong>
    </div>
  `;

  submitButton.disabled = !isValid;
}

submitButton.addEventListener("click", () => {
  if (!isFormValid()) {
    return;
  }

  dialogMessage.innerHTML = `
    ${getSelectedMenu().name} ${copy.orderReady}<br>
    \uB9DB: ${state.selectedFlavors.join(", ")}<br>
    \uC6A9\uAE30: ${getContainer().name} / \uC22B\uAC00\uB77D: ${state.selectedSpoon}<br>
    \uCD1D \uACB0\uC81C \uAE08\uC561: <strong>${formatPrice(calculateTotal())}</strong>
  `;

  orderDialog.showModal();
});

closeDialog.addEventListener("click", () => {
  orderDialog.close();
});

renderMenuOptions();
renderFlavors();
renderContainerOptions();
renderAddonOptions();
renderSpoonOptions();
renderEtaOptions();
renderSummary();
