const DATA_URL = "releases.json";

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function fileChip(type) {
  const map = {
    installer: "EXE",
    portable: "ZIP",
    script: "CMD",
    cert: "CER",
    meta: "META",
    apk: "APK",
    checksum: "SHA256",
  };
  return map[type] || "FILE";
}

function renderDownloadBtn(file, variant) {
  const a = el("a", `btn ${variant === "primary" ? "btn-primary" : "btn-ghost"}`);
  a.href = file.url;
  const chip = el("span", "chip", fileChip(file.type));
  a.append(chip, el("span", null, file.label || "下载"));
  return a;
}

function renderFileRow(file) {
  const row = el("div", "file-row");
  const info = el("div", "file-info");
  info.append(
    el("div", "file-name", file.name),
    el("div", "file-meta", `${file.label || "下载"} · ${file.size || "—"}`)
  );
  const wrap = el("div", "file-dl");
  wrap.append(renderDownloadBtn(file, "ghost"));
  row.append(info, wrap);
  return row;
}

function renderNotes(notes) {
  const ul = el("ul", "notes");
  (notes || []).forEach((n) => ul.append(el("li", null, n)));
  return ul;
}

function getLatestRelease(product) {
  return (
    (product.releases || []).find((r) => r.version === product.latest) ||
    (product.releases || [])[0] ||
    null
  );
}

function primaryFile(release) {
  if (!release) return null;
  const files = release.files || [];
  return (
    files.find((f) => f.type === "installer") ||
    files.find((f) => f.type === "apk") ||
    files.find((f) => f.type === "script") ||
    files[0] ||
    null
  );
}

function findProduct(data, id) {
  return (data.products || []).find((p) => p.id === id) || null;
}

/* ---------- QR Code (pure SVG, no dependencies) ---------- */
function generateQR(text) {
  try {
    if (typeof qrcode === "undefined") return null;
    const qr = qrcode(0, "M");
    qr.addData(text);
    qr.make();
    const cellSize = 5;
    const margin = 4;
    const count = qr.getModuleCount();
    const size = count * cellSize + margin * 2;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "#000000";
    for (let r = 0; r < count; r++) {
      for (let c = 0; c < count; c++) {
        if (qr.isDark(r, c)) {
          ctx.fillRect(c * cellSize + margin, r * cellSize + margin, cellSize, cellSize);
        }
      }
    }
    return canvas;
  } catch (e) {
    console.error("QR generation failed:", e);
    return null;
  }
}

/* ---------- Hub (index) ---------- */
function renderHub(data) {
  const grid = document.getElementById("product-grid");
  if (!grid) return;

  grid.replaceChildren(
    ...(data.products || []).map((p) => {
      const rel = getLatestRelease(p);
      const file = primaryFile(rel);
      const card = el("a", "product-card");
      card.href = `${p.id}.html`;

      const top = el("div", "product-card-top");
      const icon = el("div", `product-icon ${p.id}`);
      icon.innerHTML = `<img src="logos/${p.id}.png" alt="${p.name}" style="width:100%;height:100%;object-fit:contain;border-radius:10px" />`;
      const nameWrap = el("div");
      nameWrap.append(el("div", "product-name", p.name), el("div", "product-cat", p.category || ""));
      top.append(icon, nameWrap);

      const meta = el("div", "product-meta");
      if (p.badge) meta.append(el("span", "pill ok", p.badge));
      meta.append(
        el("span", "pill ok", p.latest ? `v${p.latest}` : "—"),
        el("span", "pill", p.platform || "")
      );

      card.append(
        top,
        el("div", "product-tagline", p.tagline || ""),
        el("div", "product-desc", p.description || ""),
        meta,
        el("div", "product-cta", file ? `下载 ${file.label || file.name} →` : "查看详情 →")
      );
      return card;
    })
  );

  const meta = document.getElementById("hero-meta");
  if (meta) {
    meta.textContent = "统一发布与更新检测";
  }
}

/* ---------- Product detail ---------- */
function renderProduct(data) {
  const root = document.getElementById("product-root");
  if (!root) return;

  const id = document.body.dataset.product;
  const product = findProduct(data, id);
  if (!product) {
    const wrap = el("section", "section");
    const inner = el("div", "section-inner");
    inner.append(el("div", "empty", "未找到该产品"));
    wrap.append(inner);
    root.replaceChildren(wrap);
    return;
  }

  document.title = `${product.name} 下载 · 应用商店`;
  const navName = document.getElementById("nav-product");
  if (navName) navName.textContent = product.name;

  const latestRel = getLatestRelease(product);
  const pFile = primaryFile(latestRel);

  // ---- Hero ----
  const heroSection = el("section", "hero");
  const heroInner = el("div", "hero-inner");
  const detail = el("div", "detail-hero");

  const heroCopy = el("div", "hero-copy");
  const eyebrow = el("p", "eyebrow", `${product.category || ""} · ${product.platform || ""}`);
  if (product.badge) {
    eyebrow.append(" ");
    eyebrow.append(el("span", "pill ok", product.badge));
  }
  heroCopy.append(
    eyebrow,
    el("h1", null, product.name),
    el("p", "tagline", product.tagline || ""),
    el("p", "tagline", product.description || "")
  );

  const heroActions = el("div", "hero-actions");
  if (pFile) heroActions.append(renderDownloadBtn(pFile, "primary"));
  // 在线工具外链（releases.json 的 links 字段，新窗口打开）
  (product.links || []).forEach((lk) => {
    const a = el("a", "btn btn-ghost");
    a.href = lk.url;
    a.target = "_blank";
    a.rel = "noopener";
    a.append(el("span", "chip", lk.chip || "LINK"), el("span", null, lk.label || "打开"));
    heroActions.append(a);
  });
  heroCopy.append(heroActions);

  // QR code for APK downloads
  if (product.id === "netcontrol" && pFile) {
    const qrWrap = el("div", "qr-download");
    const qrCanvas = generateQR(pFile.url);
    if (qrCanvas) {
      qrCanvas.className = "qr-canvas";
      qrWrap.append(qrCanvas, el("div", "qr-label", "手机扫码下载 APK"));
    } else {
      qrWrap.append(el("div", "qr-label", "二维码生成失败，请直接点击下载"));
    }
    heroCopy.append(qrWrap);
  }

  const side = el("aside", "side-card");
  side.append(el("h3", null, "产品信息"));
  const kv = el("div", "kv");
  [
    ["版本", product.latest ? `v${product.latest}` : "—"],
    ["平台", product.platform || "—"],
    ["渠道", product.channel || "stable"],
  ].forEach(([k, v]) => {
    const row = el("div", "kv-row");
    row.append(el("span", "kv-k", k), el("span", "kv-v", v));
    kv.append(row);
  });
  side.append(kv);

  detail.append(heroCopy, side);
  heroInner.append(detail);
  heroSection.append(heroInner);

  // ---- Features ----
  const featuresSection = el("section", "section");
  const featuresInner = el("div", "section-inner");
  const featuresHead = el("div", "section-head");
  featuresHead.append(el("h2", null, "主要能力"));
  const ul = el("ul", "feature-list");
  (product.features || []).forEach((f) => ul.append(el("li", null, f)));
  featuresInner.append(featuresHead, ul);
  featuresSection.append(featuresInner);

  // ---- Latest downloads ----
  const dlSection = el("section", "section");
  const dlInner = el("div", "section-inner");
  const dlHead = el("div", "section-head");
  dlHead.append(
    el("h2", null, "最新下载"),
    el("p", null, "下载后按提示安装。")
  );
  const latestCard = el("article", "release-card latest");
  if (latestRel) {
    const top = el("div", "release-top");
    top.append(
      el("div", "release-version", latestRel.version === "latest" ? "latest" : `v${latestRel.version}`),
      el("span", "badge badge-latest", "Latest"),
      el("span", "badge badge-stable", latestRel.channel || "stable"),
      el("div", "release-date", latestRel.date || "")
    );
    const fileList = el("div", "file-list");
    (latestRel.files || []).forEach((f) => fileList.append(renderFileRow(f)));
    latestCard.append(top, renderNotes(latestRel.notes), fileList);
  } else {
    latestCard.append(el("div", "empty", "暂无下载"));
  }
  dlInner.append(dlHead, latestCard);
  dlSection.append(dlInner);

  // ---- History ----
  const histSection = el("section", "section muted");
  const histInner = el("div", "section-inner");
  const histHead = el("div", "section-head");
  histHead.append(el("h2", null, "历史版本"), el("p", null, "可下载的发布列表。"));
  const histList = el("div", "history-list");
  const releases = product.releases || [];
  if (releases.length === 0) {
    histList.append(el("div", "empty", "暂无历史版本"));
  } else {
    releases.forEach((rel) => {
      const details = el("details", "history-item");
      const summary = el("summary");
      summary.append(
        el("div", "release-version", rel.version === "latest" ? "latest" : `v${rel.version}`),
        el("span", "badge badge-stable", rel.channel || "stable"),
        el("div", "release-date", rel.date || ""),
        el("span", "chev", "▾")
      );
      const body = el("div", "history-body");
      const fileList = el("div", "file-list");
      (rel.files || []).forEach((f) => fileList.append(renderFileRow(f)));
      body.append(renderNotes(rel.notes), fileList);
      details.append(summary, body);
      histList.append(details);
    });
  }
  histInner.append(histHead, histList);
  histSection.append(histInner);

  root.replaceChildren(heroSection, featuresSection, dlSection, histSection);
}

async function boot() {
  try {
    const resp = await fetch(DATA_URL, { cache: "no-cache" });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    renderHub(data);
    renderProduct(data);
  } catch (err) {
    const wrap = el("section", "section");
    const inner = el("div", "section-inner");
    inner.append(el("div", "empty", `无法加载 releases.json：${err.message}`));
    wrap.append(inner);
    const grid = document.getElementById("product-grid");
    const root = document.getElementById("product-root");
    if (grid) grid.replaceChildren(el("div", "empty", `无法加载 releases.json：${err.message}`));
    if (root) root.replaceChildren(wrap);
  }
}

boot();
