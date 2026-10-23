/* ===== Supabase backend configuration ===== */

var SB_URL = "https://phofidgyqqsysfgktqnt.supabase.co";
var SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBob2ZpZGd5cXFzeXNmZ2t0cW50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3NTI0MTksImV4cCI6MjEwODMyODQxOX0.iLHqZp2K2b-5FJPO_oiNUk0SliVdgnBGLJ49MhaBADM";
var BUCKET = "product-images";

var sbReady =
  !/YOUR[-_]/.test(SB_URL) &&
  !/YOUR[-_]/.test(SB_KEY) &&
  SB_KEY.length > 0;

var SESS_KEY = "printnloop_sb_session";
var session = null;

try {
  session = JSON.parse(sessionStorage.getItem(SESS_KEY));
} catch (e) {
  session = null;
}

function setSession(value) {
  session = value;

  try {
    if (value) {
      sessionStorage.setItem(SESS_KEY, JSON.stringify(value));
    } else {
      sessionStorage.removeItem(SESS_KEY);
    }
  } catch (e) {}
}

function isAdminUnlocked() {
  return !!(session && session.access_token);
}

function authCall(grant, body) {
  return fetch(
    SB_URL + "/auth/v1/token?grant_type=" + encodeURIComponent(grant),
    {
      method: "POST",
      headers: {
        apikey: SB_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    }
  ).then(function (response) {
    return response.json().catch(function () {
      return {};
    }).then(function (data) {
      if (!response.ok || !data.access_token) {
        throw new Error(
          data.msg ||
          data.message ||
          data.error_description ||
          data.error ||
          "Authentication failed. Check your Supabase configuration."
        );
      }

      setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at:
          data.expires_at ||
          Math.floor(Date.now() / 1000) + (data.expires_in || 3600)
      });

      return data;
    });
  });
}

function fresh() {
  if (!session) {
    return Promise.resolve();
  }

  if (session.expires_at - 60 > Date.now() / 1000) {
    return Promise.resolve();
  }

  if (!session.refresh_token) {
    setSession(null);
    return Promise.reject(
      new Error("Session expired. Please sign in again.")
    );
  }

  return authCall("refresh_token", {
    refresh_token: session.refresh_token
  }).catch(function (error) {
    setSession(null);
    throw error;
  });
}

function sb(path, opts) {
  opts = opts || {};

  return fresh().then(function () {
    var headers = Object.assign(
      {
        apikey: SB_KEY,
        Authorization:
          "Bearer " + (session ? session.access_token : SB_KEY)
      },
      opts.headers || {}
    );

    return fetch(
      SB_URL + (path.charAt(0) === "/" ? path : "/" + path),
      Object.assign({}, opts, {
        headers: headers
      })
    );
  }).then(function (response) {
    if (!response.ok) {
      return response.text().then(function (text) {
        var message = "Supabase request failed (" + response.status + ").";

        try {
          var data = JSON.parse(text);
          message = data.message || data.msg || data.error_description ||
            data.error || message;
        } catch (e) {}

        throw new Error(message);
      });
    }

    return response.text().then(function (text) {
      return text ? JSON.parse(text) : null;
    });
  });
}

/* ===== Site ===== */

var $ = function (id) { return document.getElementById(id); };
function esc(v) {
  return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}
function peso(n) {
  return "\u20B1" + Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

var DEFAULT_LIST = [
  ["Tarpaulin printing", "Printing", "Large-format tarpaulin for banners, events and signage."],
  ["DTF printing", "Printing", "Full-color DTF transfers for shirts, caps, bags and more."],
  ["Sublimation printing", "Printing", "Vibrant, long-lasting sublimation prints on compatible items."],
  ["Mugs", "Drinkware", "Custom sublimated mugs with your design or photo."],
  ["Tumblers", "Drinkware", "Personalized tumblers for gifts, events and everyday use."],
  ["Caps", "Apparel", "Custom-printed caps for teams, events and brands."],
  ["Tote bags", "Apparel", "Reusable tote bags printed with your artwork."],
  ["T-shirts", "Apparel", "Custom T-shirts for groups, businesses and events."],
  ["Lanyards", "Accessories", "Printed lanyards for events, offices and schools."],
  ["Button pins", "Accessories", "Custom button pins in a range of sizes."],
  ["Keychains", "Accessories", "Personalized keychains, great as giveaways."],
  ["Refrigerator magnets", "Accessories", "Custom magnets for souvenirs and promos."],
  ["Stickers", "Paper and cards", "Custom stickers, cut to the shape you need."],
  ["Card stock", "Paper and cards", "Printed card stock for flyers, invites and more."],
  ["PVC cards", "Paper and cards", "Durable PVC cards for IDs, memberships and loyalty."],
  ["Business cards", "Paper and cards", "Professional business cards printed to your layout."],
  ["Hang tags", "Paper and cards", "Hang tags for clothing, products and packaging."]
];
var DEFAULTS = DEFAULT_LIST.map(function (p, i) {
  return { id: "default-" + (i + 1), sort: i + 1, isDefault: true,
    name: p[0], category: p[1], description: p[2], price: null, image: "", table: null };
});

var products = [];
var activeCat = "All";
var editingId = null;
var tableState = null;
var lastFocus = null;

function fromRow(r) {
  var d = r.data || {};
  return { id: r.id, sort: r.sort, name: d.name || "", category: d.category || "Other",
    description: d.description || "", price: d.price == null || d.price === "" ? null : Number(d.price),
    image: d.image || "", table: d.table || null };
}
function toData(p) {
  return { name: p.name, category: p.category, description: p.description, price: p.price,
    image: p.image, table: p.table };
}

function loadProducts() {
  if (!sbReady) { products = DEFAULTS.slice(); return Promise.resolve(); }
  return sb("/rest/v1/products?select=id,data,sort&order=sort.asc").then(function (rows) {
    products = rows && rows.length ? rows.map(fromRow) : DEFAULTS.slice();
  }).catch(function () {
    products = DEFAULTS.slice();
  });
}

/* ----- Theme ----- */
function applyThemeLabel() {
  var dark = document.documentElement.getAttribute("data-theme") === "dark";
  var b = $("themeToggle");
  if (b) b.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
}
$("themeToggle").addEventListener("click", function () {
  var next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  try { localStorage.setItem("printnloop_theme", next); } catch (e) {}
  applyThemeLabel();
});
applyThemeLabel();
$("year").textContent = new Date().getFullYear();

/* ----- Routing ----- */
function route() {
  var h = (location.hash || "#home").replace("#", "");
  var v = h === "admin2600" ? "admin" : h;
  if (!$("v-" + v)) v = "home";
  Array.prototype.forEach.call(document.querySelectorAll(".view"), function (el) {
    el.classList.toggle("on", el.id === "v-" + v);
  });
  Array.prototype.forEach.call(document.querySelectorAll("header nav a"), function (a) {
    if (a.getAttribute("data-v") === v) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  closeModal(true);
  if (v === "admin") openAdmin();
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", route);

/* ----- Product grid ----- */
function categories() {
  var seen = ["All"];
  products.forEach(function (p) { if (seen.indexOf(p.category) < 0) seen.push(p.category); });
  return seen;
}
function renderChips() {
  var cats = categories();
  if (cats.indexOf(activeCat) < 0) activeCat = "All";
  $("chips").innerHTML = cats.map(function (c) {
    return '<button class="chip" type="button" data-cat="' + esc(c) + '" aria-pressed="' + (c === activeCat) + '">' + esc(c) + "</button>";
  }).join("");
}
function priceLabel(p) {
  if (p.price == null) return "Contact us for pricing";
  return (isArea(p) ? peso(p.price) + " per sq ft" : "Starts at " + peso(p.price));
}
function renderGrid() {
  var list = products.filter(function (p) { return activeCat === "All" || p.category === activeCat; });
  $("grid").innerHTML = list.map(function (p) {
    var art = p.image ? '<img src="' + esc(p.image) + '" alt="" loading="lazy">' : esc((p.name || "?").charAt(0).toUpperCase());
    return '<li class="card" tabindex="0" role="button" data-id="' + esc(p.id) + '" aria-label="View ' + esc(p.name) + '">' +
      '<div class="art">' + art + '</div><div class="txt"><span class="cat">' + esc(p.category) + "</span><h3>" + esc(p.name) +
      "</h3><p>" + esc(p.description) + '</p><p class="product-card-price"><b>' + esc(priceLabel(p)) + "</b></p></div></li>";
  }).join("");
  var dl = $("inqProducts");
  if (dl) dl.innerHTML = products.map(function (p) { return '<option value="' + esc(p.name) + '">'; }).join("");
}
function renderAll() { renderChips(); renderGrid(); if ($("v-admin").classList.contains("on")) renderAdminProducts(); }

$("chips").addEventListener("click", function (e) {
  var b = e.target.closest(".chip");
  if (!b) return;
  activeCat = b.getAttribute("data-cat");
  renderChips(); renderGrid();
});
function findProduct(id) { return products.filter(function (p) { return p.id === id; })[0]; }
$("grid").addEventListener("click", function (e) {
  var c = e.target.closest(".card");
  if (c) openModal(findProduct(c.getAttribute("data-id")), c);
});
$("grid").addEventListener("keydown", function (e) {
  if (e.key !== "Enter" && e.key !== " ") return;
  var c = e.target.closest(".card");
  if (c) { e.preventDefault(); openModal(findProduct(c.getAttribute("data-id")), c); }
});

/* ----- Product modal + calculator ----- */
var currentProduct = null;
function isArea(p) { return /tarpaulin/i.test(p.name || ""); }

function tableHtml(t) {
  if (!t || !t.headers || !t.rows || !t.rows.length) return "";
  return '<div class="pricing-table-wrap" id="modalTable">' + (t.title ? "<h3>" + esc(t.title) + "</h3>" : "") +
    '<div class="pricing-table-scroll"><table class="pricing-table"><thead><tr>' +
    t.headers.map(function (h) { return "<th>" + esc(h) + "</th>"; }).join("") + "</tr></thead><tbody>" +
    t.rows.map(function (r) { return "<tr>" + r.map(function (c) { return "<td>" + esc(c) + "</td>"; }).join("") + "</tr>"; }).join("") +
    "</tbody></table></div></div>";
}
function field(id, label, extra) {
  return "<label for=\"" + id + "\">" + label + '</label><input id="' + id + '" type="number" inputmode="decimal" min="' + (extra || "1") + '" step="any">';
}
function openModal(p, trigger) {
  if (!p) return;
  currentProduct = p;
  lastFocus = trigger || null;
  $("modalArt").innerHTML = p.image ? '<img src="' + esc(p.image) + '" alt="' + esc(p.name) + '">' : '<span style="font:400 96px var(--display)">' + esc((p.name || "?").charAt(0).toUpperCase()) + "</span>";
  $("modalPrice").textContent = priceLabel(p);
  $("modalCategory").textContent = p.category;
  $("modalTitle").textContent = p.name;
  $("modalDescription").textContent = p.description;
  var old = $("modalTable");
  if (old) old.parentNode.removeChild(old);
  var th = tableHtml(p.table);
  if (th) $("productCalculator").insertAdjacentHTML("beforebegin", th);
  var calc = $("productCalculator");
  $("calculatorResult").textContent = "";
  if (p.price != null && p.price > 0) {
    $("calculatorFields").innerHTML = isArea(p)
      ? '<div class="calculator-row">' + "<div>" + field("calcW", "Width (ft)", "0.1") + "</div><div>" + field("calcH", "Height (ft)", "0.1") + "</div></div>" +
        '<div class="calculator-row one">' + field("calcQ", "Quantity") + "</div>"
      : '<div class="calculator-row one">' + field("calcQ", "Quantity") + "</div>";
    var q = $("calcQ"); if (q) q.value = 1;
    calc.hidden = false;
  } else {
    calc.hidden = true;
  }
  $("productModal").classList.add("open");
  $("productModal").setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  var close = document.querySelector(".modal-close");
  if (close) close.focus();
}
function closeModal(silent) {
  var m = $("productModal");
  if (!m.classList.contains("open")) return;
  m.classList.remove("open");
  m.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  if (!silent && lastFocus && lastFocus.focus) lastFocus.focus();
}
$("productModal").addEventListener("click", function (e) {
  if (e.target.closest("[data-close-modal]")) closeModal();
});
document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeModal(); });

$("calculateProduct").addEventListener("click", function () {
  var p = currentProduct, out = $("calculatorResult");
  if (!p) return;
  var q = parseFloat($("calcQ").value);
  if (!(q > 0)) { out.textContent = "Please enter a quantity."; return; }
  if (isArea(p)) {
    var w = parseFloat($("calcW").value), h = parseFloat($("calcH").value);
    if (!(w > 0) || !(h > 0)) { out.textContent = "Please enter the width and height in feet."; return; }
    var area = w * h;
    out.textContent = w + " \u00D7 " + h + " ft (" + area.toFixed(2) + " sq ft) \u00D7 " + q + " = about " + peso(area * q * p.price) + ". Final price is confirmed when you message us.";
  } else {
    out.textContent = q + " \u00D7 " + peso(p.price) + " = about " + peso(q * p.price) + ". Final price is confirmed when you message us.";
  }
});

/* ----- Inquiry form ----- */
$("inquiryForm").addEventListener("submit", function (e) {
  e.preventDefault();
  var msg = $("inqMessage");
  if ($("inqWebsite").value) return;
  if (!sbReady) { msg.textContent = "The inquiry form isn't available right now. Please message us on Instagram or Messenger."; return; }
  var btn = $("inqSubmit");
  btn.disabled = true; msg.textContent = "Sending...";
  var body = { name: $("inqName").value.trim(), contact: $("inqContact").value.trim(), product: $("inqProduct").value.trim(),
    quantity: $("inqQty").value.trim() || null, message: $("inqMsg").value.trim() };
  sb("/rest/v1/inquiries", { method: "POST", headers: { "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify(body) })
    .then(function () { $("inquiryForm").reset(); msg.textContent = "Thanks! We got your inquiry and will reply soon."; })
    .catch(function () { msg.textContent = "Sorry, that didn't send. Please try again or message us directly."; })
    .then(function () { btn.disabled = false; });
});

/* ===== Admin ===== */
function say(el, text) { el.textContent = text; }
function openAdmin() {
  $("adminDashboard").hidden = false;
  renderAdminProducts();
  loadInquiries();
}

function renderAdminProducts() {
  $("adminProductList").innerHTML = products.map(function (p) {
    return '<li><div><b>' + esc(p.name) + "</b><p>" + esc(p.category) + " \u00B7 " + esc(priceLabel(p)) + "</p></div><div>" +
      '<button class="btn l s" type="button" data-edit="' + esc(p.id) + '">Edit</button> ' +
      '<button class="btn l s" type="button" data-del="' + esc(p.id) + '">Delete</button></div></li>';
  }).join("") || "<li>No products yet.</li>";
}
$("adminProductList").addEventListener("click", function (e) {
  var ed = e.target.closest("[data-edit]"), del = e.target.closest("[data-del]");
  if (ed) startEdit(ed.getAttribute("data-edit"));
  if (del) deleteProduct(del.getAttribute("data-del"));
});

function deleteProduct(id) {
  var p = findProduct(id), out = $("adminPostMessage");
  if (!p || !confirm("Delete \"" + p.name + "\"?")) return;
  sb("/rest/v1/products?id=eq." + encodeURIComponent(id), { method: "DELETE", headers: { Prefer: "return=representation" } })
    .then(function (rows) {
      if (!rows || !rows.length) throw new Error("Not allowed. Saving changes needs an admin sign-in with Supabase.");
      say(out, "Deleted."); return loadProducts();
    }).then(renderAll).catch(function (err) { say(out, err.message); });
}

/* price table editor */
function renderTableEditor() {
  var t = tableState, body = $("tableEditorBody");
  body.hidden = !t;
  $("tableEditorToggle").hidden = !!t;
  if (!t) return;
  $("tableTitle").value = t.title || "";
  var h = "<thead><tr>" + t.headers.map(function (v, c) {
    return '<th><input data-h="' + c + '" value="' + esc(v) + '" aria-label="Column ' + (c + 1) + ' heading" placeholder="Heading">' +
      (t.headers.length > 1 ? '<button class="table-x" type="button" data-delcol="' + c + '" aria-label="Remove column">&times;</button>' : "") + "</th>";
  }).join("") + "<th></th></tr></thead><tbody>";
  h += t.rows.map(function (r, ri) {
    return "<tr>" + r.map(function (v, c) {
      return '<td><input data-r="' + ri + '" data-c="' + c + '" value="' + esc(v) + '" aria-label="Row ' + (ri + 1) + ', column ' + (c + 1) + '"></td>';
    }).join("") + '<td><button class="table-x" type="button" data-delrow="' + ri + '" aria-label="Remove row">&times;</button></td></tr>';
  }).join("") + "</tbody>";
  $("tableEditorGrid").innerHTML = h;
}
$("tableEditorToggle").addEventListener("click", function () {
  tableState = { title: "", headers: ["Item", "Price"], rows: [["", ""]] };
  renderTableEditor();
});
$("tableAddRow").addEventListener("click", function () {
  if (!tableState) return;
  tableState.rows.push(tableState.headers.map(function () { return ""; }));
  renderTableEditor();
});
$("tableAddCol").addEventListener("click", function () {
  if (!tableState) return;
  tableState.headers.push("");
  tableState.rows.forEach(function (r) { r.push(""); });
  renderTableEditor();
});
$("tableRemove").addEventListener("click", function () { tableState = null; renderTableEditor(); });
$("tableTitle").addEventListener("input", function () { if (tableState) tableState.title = this.value; });
$("tableEditorGrid").addEventListener("input", function (e) {
  var i = e.target;
  if (!tableState) return;
  if (i.hasAttribute("data-h")) tableState.headers[+i.getAttribute("data-h")] = i.value;
  else if (i.hasAttribute("data-r")) tableState.rows[+i.getAttribute("data-r")][+i.getAttribute("data-c")] = i.value;
});
$("tableEditorGrid").addEventListener("click", function (e) {
  var dc = e.target.closest("[data-delcol]"), dr = e.target.closest("[data-delrow]");
  if (dc) {
    var c = +dc.getAttribute("data-delcol");
    tableState.headers.splice(c, 1);
    tableState.rows.forEach(function (r) { r.splice(c, 1); });
    renderTableEditor();
  } else if (dr) {
    tableState.rows.splice(+dr.getAttribute("data-delrow"), 1);
    renderTableEditor();
  }
});
function cleanTable() {
  var t = tableState;
  if (!t) return null;
  var rows = t.rows.filter(function (r) { return r.some(function (v) { return String(v).trim(); }); })
    .map(function (r) { return r.map(function (v) { return String(v).trim(); }); });
  if (!rows.length) return null;
  return { title: (t.title || "").trim(), headers: t.headers.map(function (v) { return String(v).trim(); }), rows: rows };
}

/* product form */
function resetProductForm() {
  editingId = null; tableState = null;
  $("productForm").reset();
  $("productFormHeading").textContent = "Add a product";
  $("productSubmitButton").textContent = "Add product";
  $("cancelProductEdit").hidden = true;
  renderTableEditor();
}
function startEdit(id) {
  var p = findProduct(id);
  if (!p) return;
  resetProductForm();
  editingId = id;
  $("newProductName").value = p.name;
  $("newProductCategory").value = p.category;
  $("newProductDescription").value = p.description;
  $("newProductPrice").value = p.price == null ? "" : p.price;
  tableState = p.table ? JSON.parse(JSON.stringify(p.table)) : null;
  renderTableEditor();
  $("productFormHeading").textContent = "Edit product";
  $("productSubmitButton").textContent = "Save changes";
  $("cancelProductEdit").hidden = false;
  $("productForm").scrollIntoView({ behavior: "smooth", block: "start" });
}
$("cancelProductEdit").addEventListener("click", function () { resetProductForm(); say($("adminPostMessage"), ""); });

function resizeImage(file) {
  return new Promise(function (resolve, reject) {
    var url = URL.createObjectURL(file), img = new Image();
    img.onload = function () {
      var max = 1000, s = Math.min(1, max / Math.max(img.width, img.height));
      var cv = document.createElement("canvas");
      cv.width = Math.round(img.width * s); cv.height = Math.round(img.height * s);
      var ctx = cv.getContext("2d");
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(url);
      cv.toBlob(function (b) { b ? resolve(b) : reject(new Error("Could not process that image.")); }, "image/jpeg", 0.85);
    };
    img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("That file isn't a readable image.")); };
    img.src = url;
  });
}
function uploadImage(file) {
  return resizeImage(file).then(function (blob) {
    var name = Date.now() + "-" + Math.random().toString(36).slice(2, 8) + ".jpg";
    return sb("/storage/v1/object/" + BUCKET + "/" + name, { method: "POST", headers: { "Content-Type": "image/jpeg" }, body: blob })
      .then(function () { return SB_URL + "/storage/v1/object/public/" + BUCKET + "/" + name; });
  });
}

$("productForm").addEventListener("submit", function (e) {
  e.preventDefault();
  var out = $("adminPostMessage"), btn = $("productSubmitButton");
  if (!sbReady) { say(out, "Supabase isn't configured yet. Add your key in script.js."); return; }
  var existing = editingId ? findProduct(editingId) : null;
  var priceVal = $("newProductPrice").value;
  var p = {
    id: editingId || ("p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)),
    sort: existing ? existing.sort : Date.now(),
    name: $("newProductName").value.trim(),
    category: $("newProductCategory").value.trim(),
    description: $("newProductDescription").value.trim(),
    price: priceVal === "" ? null : Number(priceVal),
    image: existing ? existing.image : "",
    table: cleanTable()
  };
  var file = $("newProductImage").files[0];
  btn.disabled = true; say(out, "Saving...");
  var step = Promise.resolve();
  if ($("removeProductImage").checked) p.image = "";
  if (file) step = uploadImage(file).then(function (u) { p.image = u; });
  step.then(function () {
    return sb("/rest/v1/products?on_conflict=id", { method: "POST",
      headers: { "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify([{ id: p.id, data: toData(p), sort: p.sort }]) });
  }).then(function () { return loadProducts(); })
    .then(function () { resetProductForm(); renderAll(); say(out, "Saved."); })
    .catch(function (err) { say(out, err.message + " (Saving needs an admin sign-in with Supabase.)"); })
    .then(function () { btn.disabled = false; });
});

$("removeProductImage").addEventListener("change", function () {});
$("exportProducts").addEventListener("click", function () {
  var data = JSON.stringify(products.map(function (p) { return { id: p.id, sort: p.sort, data: toData(p) }; }), null, 2);
  var a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([data], { type: "application/json" }));
  a.download = "products.json";
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
});
$("usePublished").addEventListener("click", function () {
  loadProducts().then(function () { resetProductForm(); renderAll(); say($("adminPostMessage"), "Reloaded from the database."); });
});
$("adminLogout").addEventListener("click", function () { location.hash = "#home"; });

/* inquiries */
function loadInquiries() {
  var ul = $("inquiryList");
  if (!sbReady) { ul.innerHTML = "<li>Supabase isn't configured yet.</li>"; return; }
  sb("/rest/v1/inquiries?select=*&order=created_at.desc").then(function (rows) {
    if (!rows || !rows.length) { ul.innerHTML = "<li>No inquiries to show.</li>"; return; }
    ul.innerHTML = rows.map(function (r) {
      var opts = ["new", "contacted", "done"].map(function (s) {
        return '<option value="' + s + '"' + (r.status === s ? " selected" : "") + ">" + s + "</option>";
      }).join("");
      return '<li data-id="' + esc(r.id) + '"><div><b>' + esc(r.name) + "</b><p>" + esc(r.contact) + " \u00B7 " + esc(r.product) +
        (r.quantity ? " \u00B7 Qty: " + esc(r.quantity) : "") + "</p><p>" + esc(r.message) + "</p><p>" +
        esc(new Date(r.created_at).toLocaleString()) + '</p></div><div><select data-status aria-label="Status">' + opts +
        '</select><button class="btn l s" type="button" data-delinq>Delete</button></div></li>';
    }).join("");
  }).catch(function (err) { ul.innerHTML = "<li>" + esc(err.message) + "</li>"; });
}
$("inquiryList").addEventListener("change", function (e) {
  var sel = e.target.closest("[data-status]");
  if (!sel) return;
  var id = sel.closest("li").getAttribute("data-id");
  sb("/rest/v1/inquiries?id=eq." + encodeURIComponent(id), { method: "PATCH",
    headers: { "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify({ status: sel.value }) })
    .then(function (rows) { if (!rows || !rows.length) throw new Error("Not allowed."); })
    .catch(function (err) { alert(err.message); loadInquiries(); });
});
$("inquiryList").addEventListener("click", function (e) {
  var b = e.target.closest("[data-delinq]");
  if (!b || !confirm("Delete this inquiry?")) return;
  var id = b.closest("li").getAttribute("data-id");
  sb("/rest/v1/inquiries?id=eq." + encodeURIComponent(id), { method: "DELETE", headers: { Prefer: "return=representation" } })
    .then(function (rows) { if (!rows || !rows.length) throw new Error("Not allowed."); loadInquiries(); })
    .catch(function (err) { alert(err.message); });
});

/* ----- Start ----- */
products = DEFAULTS.slice();
renderAll();
route();
loadProducts().then(renderAll);