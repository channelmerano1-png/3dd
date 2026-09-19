import "./style.css";
import { gsap } from "gsap";
import { createScene } from "./scene.js";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const COLORWAYS = [
  {
    id: "chalk",
    name: "Chalk",
    upper: "#d8d6c8",
    sole: "#c8c9b9",
    accent: "#d5e7a8",
    laces: "#eeede0",
  },
  {
    id: "obsidian",
    name: "Obsidian",
    upper: "#30352f",
    sole: "#222820",
    accent: "#c5d99c",
    laces: "#565e50",
  },
  {
    id: "sage",
    name: "Sage",
    upper: "#879580",
    sole: "#c5cbb8",
    accent: "#d9e6b9",
    laces: "#c6cfb8",
  },
];

const SIZES = [38, 39, 40, 41, 42, 43];
const UNIT_PRICE = 24000; // Integer cents, demo price.
const STORAGE_KEY = "aether.cart.v1";
const MAX_QUANTITY = 10;
const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const MATERIALS = {
  knit: {
    number: "01 / THE UPPER",
    title: "Recycled Ocean Knit",
    description:
      "A proposed engineered-knit upper that places openness and structure where each is needed. The concept explores recycled marine-plastic feedstock and a low-waste knitted construction.",
    specs: [
      ["Construction", "Engineered knit"],
      ["Surface", "Zoned ventilation"],
      ["Feedstock", "Proposed recycled polymer"],
      ["Verification", "Not certified"],
    ],
  },
  plate: {
    number: "02 / THE STRUCTURE",
    title: "Carbon-fiber plate",
    description:
      "A thin structural layer between the upper and cushioning system. Its sculpted geometry explores controlled flex and torsional support without adding visual weight.",
    specs: [
      ["Construction", "Composite plate concept"],
      ["Position", "Between upper and sole"],
      ["Purpose", "Structural support"],
      ["Performance", "Not independently tested"],
    ],
  },
  sole: {
    number: "03 / THE FOUNDATION",
    title: "Cloud sole",
    description:
      "An oversized, softly beveled cushioning form with a segmented traction layer. This concept balances a generous stance with a visually light profile.",
    specs: [
      ["Construction", "Foam-and-rubber concept"],
      ["Geometry", "Sculpted rocker profile"],
      ["Tread", "Segmented ribs"],
      ["Durability", "Not independently tested"],
    ],
  },
};

let selectedColor = COLORWAYS[0];
let selectedSize = null;
let scene = null;
let motionPaused = false;

const motionPreference = matchMedia("(prefers-reduced-motion: reduce)");

function announce(message) {
  $("#announcer").textContent = "";
  requestAnimationFrame(() => {
    $("#announcer").textContent = message;
  });
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// All persisted data is untrusted. Only known variants and bounded quantities survive.
function normalizeCart(value) {
  if (!Array.isArray(value)) return [];

const merged = new Map();
  for (const item of value.slice(0, 100)) {
    if (!item || typeof item !== "object") continue;
    if (!COLORWAYS.some((color) => color.id === item.color)) continue;
    if (!SIZES.includes(item.size)) continue;
    if (!Number.isInteger(item.quantity) || item.quantity < 1) continue;

const key = `${item.color}:${item.size}`;
    const current = merged.get(key);
    merged.set(key, {
      color: item.color,
      size: item.size,
      quantity: Math.min(MAX_QUANTITY, (current?.quantity || 0) + item.quantity),
    });
  }

return [...merged.values()];
}

function readCart() {
  try {
    return normalizeCart(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"));
  } catch {
    return [];
  }
}

let cart = readCart();

function saveCart() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  } catch {
    announce("Bag updated for this visit. Browser storage is unavailable.");
  }
}

window.addEventListener("storage", (event) => {
  if (event.key === STORAGE_KEY || event.key === null) {
    cart = readCart();
    renderCart();
  }
});

// Native modal dialogs provide focus containment and Escape behavior.
const dialogOpeners = new WeakMap();
const closingDialogs = new WeakSet();
let previousOverflow = "";
let previousPadding = "";

function openDialog(dialog) {
  if (dialog.open) return;

const existing = document.querySelector("dialog[open]");
  if (existing) existing.close();

dialogOpeners.set(dialog, document.activeElement);
  previousOverflow = document.body.style.overflow;
  previousPadding = document.body.style.paddingRight;

const scrollbarWidth = innerWidth - document.documentElement.clientWidth;
  document.body.style.overflow = "hidden";
  document.body.style.paddingRight = `${scrollbarWidth}px`;

dialog.showModal();

if (!motionPreference.matches) {
    gsap.fromTo(
      dialog,
      dialog.classList.contains("drawer")
        ? { x: 45, opacity: 0 }
        : { y: 12, opacity: 0 },
      {
        x: 0,
        y: 0,
        opacity: 1,
        duration: 0.3,
        ease: "power3.out",
        clearProps: "transform,opacity",
      },
    );
  }

requestAnimationFrame(() => {
    const focusTarget = dialog.querySelector("input, button, a[href]");
    focusTarget?.focus();
  });
}

function closeDialog(dialog) {
  if (!dialog.open || closingDialogs.has(dialog)) return;
  closingDialogs.add(dialog);

const finish = () => {
    dialog.close();
    closingDialogs.delete(dialog);
    gsap.set(dialog, { clearProps: "transform,opacity" });
  };

if (motionPreference.matches) {
    finish();
  } else {
    gsap.to(dialog, {
      x: dialog.classList.contains("drawer") ? 28 : 0,
      opacity: 0,
      duration: 0.18,
      ease: "power2.in",
      onComplete: finish,
    });
  }
}

$$("dialog").forEach((dialog) => {
  dialog.querySelectorAll("[data-close]").forEach((button) => {
    button.addEventListener("click", () => closeDialog(dialog));
  });

dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeDialog(dialog);
  });

dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    const outside =
      event.clientX < rect.left || event.clientX > rect.right ||
      event.clientY < rect.top || event.clientY > rect.bottom;
    if (outside) closeDialog(dialog);
  });

dialog.addEventListener("close", () => {
    document.body.style.overflow = previousOverflow;
    document.body.style.paddingRight = previousPadding;
    const opener = dialogOpeners.get(dialog);
    if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
  });
});

// Collection disclosure: links remain ordinary keyboard-accessible navigation.
const categoryToggle = $("#category-toggle");
const categoryMenu = $("#category-menu");

function setCategoryOpen(open) {
  categoryToggle.setAttribute("aria-expanded", String(open));
  categoryMenu.hidden = !open;
}

categoryToggle.addEventListener("click", () => {
  setCategoryOpen(categoryToggle.getAttribute("aria-expanded") !== "true");
});

categoryToggle.addEventListener("keydown", (event) => {
  if (event.key === "ArrowDown") {
    event.preventDefault();
    setCategoryOpen(true);
    categoryMenu.querySelector("a").focus();
  }
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".category-wrap")) setCategoryOpen(false);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !categoryMenu.hidden) {
    setCategoryOpen(false);
    categoryToggle.focus();
  }
});

categoryMenu.addEventListener("click", (event) => {
  if (event.target.closest("a")) setCategoryOpen(false);
});

document.querySelector(".category-wrap").addEventListener("focusout", (event) => {
  if (!event.currentTarget.contains(event.relatedTarget)) setCategoryOpen(false);
});

// Accessible native radio groups.
function setColor(id) {
  const color = COLORWAYS.find((item) => item.id === id);
  if (!color) return;

selectedColor = color;
  $("#color-name").textContent = color.name;
  const input = document.querySelector(`input[name="colorway"][value="${color.id}"]`);
  if (input) input.checked = true;

scene?.changeColor(color);
  announce(`${color.name} colorway selected.`);
}

COLORWAYS.forEach((color, index) => {
  const label = element("label", "swatch");
  label.style.setProperty("--swatch", color.upper);

const input = document.createElement("input");
  input.type = "radio";
  input.name = "colorway";
  input.value = color.id;
  input.checked = index === 0;
  input.setAttribute("aria-label", color.name);
  input.addEventListener("change", () => setColor(color.id));

const paint = element("span");
  paint.setAttribute("aria-hidden", "true");
  label.append(input, paint);
  $("#swatches").append(label);
});

SIZES.forEach((size) => {
  const label = element("label", "size-option");
  const input = document.createElement("input");
  input.type = "radio";
  input.name = "size";
  input.value = String(size);
  input.setAttribute("aria-label", `EU size ${size}`);
  input.setAttribute("aria-describedby", "size-error");

input.addEventListener("change", () => {
    selectedSize = size;
    $("#size-error").textContent = "";
    $$('input[name="size"]').forEach((radio) => radio.removeAttribute("aria-invalid"));
  });

label.append(input, element("span", "", String(size)));
  $("#sizes").append(label);
});

// Material details can be opened from the 3D anchors or the text-based alternatives.
function showMaterial(id) {
  const material = MATERIALS[id];
  if (!material) return;

$("#material-number").textContent = material.number;
  $("#material-title").textContent = material.title;
  $("#material-description").textContent = material.description;
  $("#material-sample").className = `material-sample ${id}`;
  $("#material-specs").replaceChildren();

for (const [label, value] of material.specs) {
    const row = element("div");
    row.append(element("dt", "", label), element("dd", "", value));
    $("#material-specs").append(row);
  }

openDialog($("#material-dialog"));
}

$$("[data-material]").forEach((button) => {
  button.addEventListener("click", () => showMaterial(button.dataset.material));
});

// Search works against the actual demo catalog rather than static suggestions.
function renderSearch() {
  const query = $("#search-input").value.trim().toLowerCase();
  const terms = query.split(/\s+/).filter(Boolean);

const matches = COLORWAYS.filter((color) => {
    const searchable = `aether one everyday sneaker footwear ${color.name}`.toLowerCase();
    return terms.every((term) => searchable.includes(term));
  });

$("#search-results").replaceChildren();
  $("#search-count").textContent =
    `${matches.length} ${matches.length === 1 ? "colorway" : "colorways"} found`;

if (!matches.length) {
    $("#search-results").append(
      element("p", "empty-state", "No matches. Try “Sage”, “Chalk”, or “AETHER”."),
    );
    return;
  }

matches.forEach((color) => {
    const button = element("button", "search-result");
    const chip = element("i");
    chip.style.backgroundColor = color.upper;
    chip.setAttribute("aria-hidden", "true");

button.append(
      chip,
      element("span", "", `AETHER ONE / ${color.name}`),
      element("small", "", `${money.format(UNIT_PRICE / 100)} ↗`),
    );

button.addEventListener("click", () => {
      setColor(color.id);
      const dialog = $("#search-dialog");

dialog.addEventListener("close", () => {
        $("#product").scrollIntoView({
          behavior: motionPreference.matches ? "instant" : "smooth",
        });
        requestAnimationFrame(() => {
          document.querySelector(`input[name="colorway"][value="${color.id}"]`)
            ?.focus({ preventScroll: true });
        });
      }, { once: true });

closeDialog(dialog);
    });

$("#search-results").append(button);
  });
}

$("#search-open").addEventListener("click", () => {
  renderSearch();
  openDialog($("#search-dialog"));
});
$("#search-input").addEventListener("input", renderSearch);

// Cart state: size/color variants, bounded quantities, subtotal, removal, persistence.
function variantKey(item) {
  return `${item.color}:${item.size}`;
}

function updateQuantity(key, delta) {
  const item = cart.find((entry) => variantKey(entry) === key);
  if (!item) return;

item.quantity = Math.max(1, Math.min(MAX_QUANTITY, item.quantity + delta));
  saveCart();
  renderCart(key, delta > 0 ? "increase" : "decrease");
  announce(`Quantity updated to ${item.quantity}.`);
}

function removeItem(key) {
  cart = cart.filter((item) => variantKey(item) !== key);
  saveCart();
  renderCart();
  $("#cart-dialog").querySelector("[data-close]").focus();
  announce("Item removed from your bag.");
}

function renderCart(focusKey, focusAction) {
  const itemsContainer = $("#cart-items");
  itemsContainer.replaceChildren();

const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = cart.reduce((sum, item) => sum + item.quantity * UNIT_PRICE, 0);

$("#cart-count").textContent = String(count);
  $("#cart-open").setAttribute(
    "aria-label",
    `Open bag, ${count} ${count === 1 ? "item" : "items"}`,
  );
  $("#cart-total").textContent = money.format(total / 100);

if (!cart.length) {
    itemsContainer.append(
      element("p", "empty-state", "Your bag is a blank canvas. Find your AETHER ONE."),
    );
    return;
  }

cart.forEach((item) => {
    const color = COLORWAYS.find((entry) => entry.id === item.color);
    const key = variantKey(item);
    const row = element("article", "cart-item");
    const top = element("div", "cart-item-top");

const chip = element("div", "cart-chip", "A");
    chip.style.backgroundColor = color.upper;
    chip.style.color = color.id === "obsidian" ? "#d5e7a8" : "#172010";
    chip.setAttribute("aria-hidden", "true");

const details = element("div");
    details.append(
      element("h3", "", "AETHER ONE"),
      element("p", "", `${color.name} / EU ${item.size}`),
      element("p", "", money.format((UNIT_PRICE * item.quantity) / 100)),
    );
    top.append(chip, details);

const controls = element("div", "cart-item-controls");
    const decrease = element("button", "quantity-button", "−");
    decrease.setAttribute("aria-label", `Decrease ${color.name}, size ${item.size}`);
    decrease.disabled = item.quantity === 1;
    decrease.dataset.action = "decrease";
    decrease.addEventListener("click", () => updateQuantity(key, -1));

const quantity = element("span", "", String(item.quantity));
    quantity.setAttribute("aria-label", `Quantity ${item.quantity}`);

const increase = element("button", "quantity-button", "+");
    increase.setAttribute("aria-label", `Increase ${color.name}, size ${item.size}`);
    increase.disabled = item.quantity === MAX_QUANTITY;
    increase.dataset.action = "increase";
    increase.addEventListener("click", () => updateQuantity(key, 1));

const remove = element("button", "remove-button", "Remove");
    remove.setAttribute("aria-label", `Remove ${color.name}, size ${item.size}`);
    remove.addEventListener("click", () => removeItem(key));

controls.append(decrease, quantity, increase, remove);
    row.append(top, controls);
    itemsContainer.append(row);

if (focusKey === key) {
      const preferred = controls.querySelector(`[data-action="${focusAction}"]`);
      const alternative = focusAction === "increase" ? decrease : increase;
      const target = preferred?.disabled ? alternative : preferred;
      target?.focus();
    }
  });
}

$("#cart-open").addEventListener("click", () => openDialog($("#cart-dialog")));

$("#add-to-cart").addEventListener("click", () => {
  if (!selectedSize) {
    $("#size-error").textContent = "Choose a size before adding to your bag.";
    $$('input[name="size"]').forEach((radio) => {
      radio.setAttribute("aria-invalid", "true");
    });
    document.querySelector('input[name="size"]').focus();
    return;
  }

const existing = cart.find(
    (item) => item.color === selectedColor.id && item.size === selectedSize,
  );

if (existing?.quantity >= MAX_QUANTITY) {
    announce("This demo allows a maximum of 10 per size and colorway.");
    openDialog($("#cart-dialog"));
    return;
  }

if (existing) {
    existing.quantity++;
  } else {
    cart.push({
      color: selectedColor.id,
      size: selectedSize,
      quantity: 1,
    });
  }

saveCart();
  renderCart();
  announce(`AETHER ONE, ${selectedColor.name}, size ${selectedSize}, added to your bag.`);
  openDialog($("#cart-dialog"));
});

renderCart();

// Shopping remains functional if WebGL initialization fails.
try {
  scene = createScene({
    mount: $("#stage"),
    hotspotLayer: $("#hotspots"),
    onMaterial: showMaterial,
    initialColor: selectedColor,
  });
} catch (error) {
  console.error("AETHER 3D initialization failed:", error);
  $("#stage canvas")?.remove();
  $("#hotspots").replaceChildren();
  $("#fallback").hidden = false;
  $("#render-status").textContent =
    "3D is unavailable on this device. Explore materials and shop below.";
  $("#motion-toggle").hidden = true;
}

function syncMotionButton() {
  const reduced = motionPreference.matches;
  const button = $("#motion-toggle");

button.disabled = reduced;
  button.textContent = reduced
    ? "Reduced motion enabled"
    : motionPaused ? "Resume motion" : "Pause motion";

button.setAttribute("aria-pressed", String(reduced || motionPaused));
  button.setAttribute(
    "aria-label",
    reduced
      ? "Reduced motion preference is enabled"
      : motionPaused ? "Resume automatic 3D motion" : "Pause automatic 3D motion",
  );
}

$("#motion-toggle").addEventListener("click", () => {
  motionPaused = !motionPaused;
  scene?.setPaused(motionPaused);
  syncMotionButton();
});

motionPreference.addEventListener("change", (event) => {
  scene?.setReducedMotion(event.matches);
  syncMotionButton();
});

syncMotionButton();

if (import.meta.hot) {
  import.meta.hot.dispose(() => scene?.dispose());
}
