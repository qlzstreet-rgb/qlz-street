/* ==========================================================================
   QLZ STREET v2 — LÓGICA DE TIENDA
   Catálogo · Ficha (bottom sheet) · Bolsa persistente · Pedido a WhatsApp
   · Sincronización opcional con Planilla QLZ Street -> L1_Inventarios
   ========================================================================== */
"use strict";

/* --------------------------------------------------------------------------
   1. CONFIGURACIÓN
   -------------------------------------------------------------------------- */
const CONFIG = {
  whatsapp: "50252260992",
  claveBolsa: "qlz_v2_bolsa",
  stockBajo: 1, // Config!B9 en la planilla
  /**
   * URL de la Aplicación web de Google Apps Script (termina en /exec).
   * Usa el archivo ../google-apps-script-inventario.gs (mismo endpoint de la v1).
   * Déjala vacía para usar el catálogo base de js/productos.js.
   */
  SHEETS_WEBAPP_URL: "https://script.google.com/macros/s/AKfycbwE18ul74ebQDahkHVcVbUcekuOayuccKWFCQtPuf-5FPlXtdamBINOH7_YpxoJ0dyoRw/exec"
};

const CATEGORIAS = [
  { id: "todos", titulo: "Todo el catálogo" },
  { id: "gorras", titulo: "Gorras importadas" },
  { id: "joyeria", titulo: "Joyería y anillos" },
  { id: "camisas", titulo: "Camisas únicas" },
  { id: "audio", titulo: "Relojes y audio" },
  { id: "accesorios", titulo: "Accesorios" }
];

const DESTACADOS = ["GORRA-007", "JOY-002", "GORRA-006"];
const METODOS_PAGO = ["Pago contra entrega", "Transferencia bancaria"];

/* --------------------------------------------------------------------------
   2. UTILIDADES
   -------------------------------------------------------------------------- */
const $ = (sel, raiz = document) => raiz.querySelector(sel);
const $$ = (sel, raiz = document) => Array.from(raiz.querySelectorAll(sel));

function esc(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function q(monto) {
  const n = Number(monto);
  return "Q" + (Number.isFinite(n) ? n : 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function sinMarcas(t) {
  return String(t ?? "").replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, "");
}

/** Pule puntuación de los textos de la planilla sin tocar el Excel. */
function pulirTexto(t) {
  return sinMarcas(t)
    .replace(/\s+/g, " ")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/\s*,\s*(?=[^\s\d])/g, ", ")
    .replace(/\s+-\s+(?=[A-ZÁÉÍÓÚ|])/g, " — ")
    .trim();
}

function capitalizar(t) {
  const s = pulirTexto(t);
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
}

function normalizarClave(t) {
  return String(t ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function precioDesde(v) {
  if (typeof v === "number" && Number.isFinite(v)) return Math.max(0, Math.round(v * 100) / 100);
  const s = String(v ?? "").replace(/,(?=\d{3}\b)/g, "").replace(",", ".");
  const m = s.match(/\d+(?:\.\d+)?/);
  return m ? Math.round(parseFloat(m[0]) * 100) / 100 : 0;
}

function enteroDesde(v) {
  if (typeof v === "number" && Number.isFinite(v)) return Math.max(0, Math.floor(v));
  const n = parseInt(String(v ?? "").replace(/[^\d-]/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/* ----- Google Drive: uc?export=view (403 en <img>) -> CDN lh3 (200 OK) ----- */
function idDrive(entrada) {
  const s = String(entrada ?? "").trim();
  if (!s) return "";
  const a = s.match(/[?&]id=([\w-]{15,})/);
  if (a) return a[1];
  const b = s.match(/\/d\/([\w-]{15,})/);
  if (b) return b[1];
  return /^[\w-]{20,}$/.test(s) ? s : "";
}

function urlFoto(entrada, ancho = 800) {
  const id = idDrive(entrada);
  if (id) return `https://lh3.googleusercontent.com/d/${id}=w${ancho}`;
  return /^https?:\/\//.test(String(entrada)) ? String(entrada) : "";
}

function urlFotoRespaldo(entrada, ancho = 800) {
  const id = idDrive(entrada);
  return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w${ancho}` : "";
}

/* --------------------------------------------------------------------------
   3. MODELO DE PRODUCTO
   -------------------------------------------------------------------------- */
function categoriaDesde(categoriaHoja, codigo) {
  const c = normalizarClave(categoriaHoja);
  const sku = String(codigo).toUpperCase();
  if (c.includes("gorra") || sku.startsWith("GORRA-")) return "gorras";
  if (c.includes("joyeria") || c.includes("anillo") || sku.startsWith("JOY-") || sku.startsWith("ANILL-")) return "joyeria";
  if (c.includes("camisa") || c.includes("playera") || sku.startsWith("CAM-")) return "camisas";
  if (c.includes("reloj") || c.includes("audifono") || c.includes("audio") || sku.startsWith("AUDIF-") || sku.startsWith("REL-")) return "audio";
  return "accesorios"; // Accesorios, Otros y Cosmeticos
}

function etiquetaCategoria(p) {
  const c = normalizarClave(p.categoriaHoja);
  if (c.includes("cosmetic")) return "Cuidado personal";
  if (c.includes("audifono")) return "Audífonos";
  if (c.includes("reloj")) return "Relojes";
  if (p.codigo.startsWith("ANILL-")) return "Anillos";
  return { gorras: "Gorras", joyeria: "Joyería", camisas: "Camisas", audio: "Audio", accesorios: "Accesorios" }[p.categoria];
}

function normalizarProducto(raw, previo = null) {
  const codigo = String(raw.codigo ?? raw.sku ?? "").trim().toUpperCase();
  const categoriaHoja = String(raw.categoriaSheet ?? raw.categoria ?? previo?.categoriaHoja ?? "").trim();
  const categoria = categoriaDesde(categoriaHoja, codigo);

  let nombre = pulirTexto(raw.nombre ?? raw.producto ?? previo?.nombre ?? "");
  if (categoria === "gorras" && !/^gorr/i.test(nombre)) nombre = "Gorra " + nombre;

  const estadoHoja = String(raw.estado ?? previo?.estadoHoja ?? "Disponible").trim();
  const disponible = normalizarClave(estadoHoja) === "agotado" ? 0 : enteroDesde(raw.disponible ?? previo?.disponible ?? 0);

  let fotos = [];
  if (Array.isArray(raw.fotos) && raw.fotos.length) fotos = raw.fotos;
  else if (raw.enlaceFoto) fotos = String(raw.enlaceFoto).split(/[\s,|]+/);
  else if (raw.fotos === undefined && raw.enlaceFoto === undefined && previo) fotos = previo.fotos;
  fotos = [...new Set(fotos.map((f) => String(f).trim()).filter(Boolean))];

  return {
    codigo,
    nombre,
    categoriaHoja,
    categoria,
    detalles: capitalizar(raw.detalles ?? previo?.detalles ?? ""),
    precio: precioDesde(raw.precio ?? previo?.precio ?? 0),
    disponible,
    estadoHoja,
    fotos,
    porUnidad: Boolean(raw.precioPorUnidad || /\bpor unidad\b/i.test(nombre) || codigo === "ANILL-001")
  };
}

/** agotado | ultima (Bajo stock / 1 unidad) | ok */
function estadoDe(p) {
  const e = normalizarClave(p.estadoHoja);
  if (p.disponible <= 0 || e === "agotado") return { clave: "agotado", sello: "Agotado", clase: "sello--agotado" };
  if (p.disponible <= CONFIG.stockBajo || e === "bajo stock") return { clave: "ultima", sello: "🔥 Última pieza", clase: "sello--ultima" };
  return { clave: "ok", sello: `Disponible · ${p.disponible}`, clase: "sello--ok" };
}

let PRODUCTOS = PRODUCTOS_BASE.map((p) => normalizarProducto(p));
const buscar = (codigo) => PRODUCTOS.find((p) => p.codigo === codigo) || null;

/* --------------------------------------------------------------------------
   4. ESTADO
   -------------------------------------------------------------------------- */
const estado = {
  categoria: "todos",
  vista: "grilla",
  bolsa: [], // [{ codigo, cantidad }]
  fichaCodigo: null,
  fichaCantidad: 1,
  tocados: { nombre: false, direccion: false, telefono: false, pago: false },
  ultimoFoco: null,
  timerAviso: 0
};

/* --------------------------------------------------------------------------
   5. BOLSA (localStorage + tope de stock real)
   -------------------------------------------------------------------------- */
function leerBolsa() {
  try {
    const datos = JSON.parse(localStorage.getItem(CONFIG.claveBolsa) || "[]");
    return Array.isArray(datos) ? datos : [];
  } catch (_) {
    return [];
  }
}

function guardarBolsa() {
  try { localStorage.setItem(CONFIG.claveBolsa, JSON.stringify(estado.bolsa)); } catch (_) { /* modo privado */ }
}

/** Ajusta la bolsa al inventario actual y devuelve avisos para el cliente. */
function reconciliarBolsa(lista) {
  const suma = new Map();
  for (const it of Array.isArray(lista) ? lista : []) {
    const cod = String(it?.codigo ?? "").trim();
    const n = Math.floor(Number(it?.cantidad));
    if (cod && n > 0) suma.set(cod, (suma.get(cod) || 0) + n);
  }
  const avisos = [];
  const limpia = [];
  for (const [codigo, pedida] of suma) {
    const p = buscar(codigo);
    if (!p) continue;
    if (estadoDe(p).clave === "agotado") {
      avisos.push(`[${codigo}] se agotó y salió de tu bolsa.`);
      continue;
    }
    const cant = Math.min(pedida, p.disponible);
    if (cant < pedida) avisos.push(`[${codigo}] ajustado a ${cant} (stock disponible).`);
    limpia.push({ codigo, cantidad: cant });
  }
  estado.bolsa = limpia;
  guardarBolsa();
  return avisos;
}

const enBolsa = (codigo) => estado.bolsa.find((i) => i.codigo === codigo)?.cantidad || 0;
const unidadesBolsa = () => estado.bolsa.reduce((a, i) => a + i.cantidad, 0);
const totalBolsa = () => Math.round(estado.bolsa.reduce((a, i) => a + (buscar(i.codigo)?.precio || 0) * i.cantidad, 0) * 100) / 100;

function agregar(codigo, cantidad = 1) {
  const p = buscar(codigo);
  if (!p) return false;
  if (estadoDe(p).clave === "agotado") { avisar(`[${codigo}] está agotado.`); return false; }
  const libre = p.disponible - enBolsa(codigo);
  if (libre <= 0) { avisar(`Ya tienes todo el stock de [${codigo}] (${p.disponible}).`); return false; }
  const n = Math.max(1, Math.min(Math.floor(cantidad) || 1, libre));
  const it = estado.bolsa.find((i) => i.codigo === codigo);
  if (it) it.cantidad += n; else estado.bolsa.push({ codigo, cantidad: n });
  guardarBolsa();
  refrescar();
  avisar(`+${n} [${codigo}] en tu bolsa`);
  return true;
}

function cambiarCantidad(codigo, delta) {
  const it = estado.bolsa.find((i) => i.codigo === codigo);
  const p = buscar(codigo);
  if (!it || !p) return;
  const nueva = it.cantidad + delta;
  if (nueva <= 0) estado.bolsa = estado.bolsa.filter((i) => i.codigo !== codigo);
  else if (nueva > p.disponible) { it.cantidad = p.disponible; avisar(`Solo hay ${p.disponible} de [${codigo}].`); }
  else it.cantidad = nueva;
  guardarBolsa();
  refrescar();
}

function quitar(codigo) {
  estado.bolsa = estado.bolsa.filter((i) => i.codigo !== codigo);
  guardarBolsa();
  refrescar();
}

/* --------------------------------------------------------------------------
   6. RENDER: PORTADA, FILTROS Y CATÁLOGO
   -------------------------------------------------------------------------- */
function htmlVacio(p, conTexto = true) {
  const txt = estadoDe(p).clave === "agotado" ? "Pieza agotada" : "Foto en camino";
  return `<span class="vacio"><span class="vacio__cod">${esc(p.codigo)}</span>${conTexto ? `<span class="vacio__txt">${txt}</span>` : ""}</span>`;
}

function htmlImg(p, fuente, ancho, clase, alt, perezosa = true) {
  return `<img class="${clase}" src="${esc(urlFoto(fuente, ancho))}" data-respaldo="${esc(urlFotoRespaldo(fuente, ancho))}" data-sku="${esc(p.codigo)}" alt="${esc(alt)}" referrerpolicy="no-referrer" decoding="async"${perezosa ? ' loading="lazy"' : ""} />`;
}

/** Captura global de errores de imagen: 1º respaldo de Drive, 2º marco vacío. */
function manejarErrorImagen(ev) {
  const img = ev.target;
  if (!(img instanceof HTMLImageElement) || !img.dataset.sku) return;
  if (img.dataset.respaldo && !img.dataset.intento) {
    img.dataset.intento = "1";
    img.src = img.dataset.respaldo;
    return;
  }
  const p = buscar(img.dataset.sku);
  if (!p) { img.remove(); return; }
  const contenedor = img.parentElement;
  img.insertAdjacentHTML("afterend", contenedor?.classList.contains("linea__img") ? `<span>${esc(p.codigo)}</span>` : htmlVacio(p));
  img.remove();
}

function ordenarVitrina(lista) {
  const peso = (p) => (estadoDe(p).clave === "agotado" ? 2 : 0) + (p.fotos.length ? 0 : 1);
  return [...lista].sort((a, b) => peso(a) - peso(b) || a.codigo.localeCompare(b.codigo, "es", { numeric: true }));
}

function renderContactos() {
  const cont = $("#contactos");
  if (!cont) return;
  const elegidos = DESTACADOS.map(buscar).filter((p) => p && p.fotos.length && estadoDe(p).clave !== "agotado");
  cont.innerHTML = elegidos.map((p, i) => `
    <button type="button" class="contacto" data-abrir="${esc(p.codigo)}" aria-label="Ver ${esc(p.nombre)}">
      ${htmlImg(p, p.fotos[0], i === 0 ? 1000 : 500, "", "", false)}
      <span class="contacto__cod">${esc(p.codigo)} · ${q(p.precio)}</span>
    </button>`).join("");
}

function renderConteos() {
  const conStock = PRODUCTOS.filter((p) => estadoDe(p).clave !== "agotado").length;
  const datoPiezas = $("#datoPiezas");
  if (datoPiezas) datoPiezas.textContent = String(conStock);
  for (const c of CATEGORIAS) {
    const el = $(`[data-n="${c.id}"]`);
    if (!el) continue;
    const n = c.id === "todos" ? PRODUCTOS.length : PRODUCTOS.filter((p) => p.categoria === c.id).length;
    el.textContent = c.id === "camisas" && n === 0 ? "PRONTO" : String(n);
  }
}

function renderNota() {
  const nota = $("#catNota");
  let html = "";
  if (estado.categoria === "joyeria") {
    const anillo = PRODUCTOS.find((p) => p.categoria === "joyeria" && p.porUnidad);
    if (anillo) html = `<b>Anillos [${esc(anillo.codigo)}]:</b> ${q(anillo.precio)} es el precio de <b>1 anillo</b>. Elige cuántos quieres; el diseño se confirma por WhatsApp según disponibilidad.`;
  } else if (estado.categoria === "accesorios") {
    html = "<b>Accesorios y cuidado personal:</b> brillos labiales y sérum para sumar al mismo envío.";
  }
  nota.hidden = !html;
  nota.innerHTML = html;
}

function htmlProximoDrop() {
  const msg = encodeURIComponent("Hola QLZ Street, vi en la web que vienen Camisas Únicas. Avísenme cuando entren y qué tallas tendrán.");
  return `
    <article class="proximo">
      <span class="proximo__k">Próximo drop en camino</span>
      <p class="proximo__gigante" aria-hidden="true">Camisas</p>
      <h3>Camisas únicas · series cortas</h3>
      <p>Estamos preparando el siguiente lote. Escríbenos y te avisamos primero cuando entren a bodega, con tallas y precio.</p>
      <div class="proximo__acciones">
        <a class="btn btn--bronce" href="https://wa.me/${CONFIG.whatsapp}?text=${msg}" target="_blank" rel="noopener noreferrer">Avísame por WhatsApp</a>
        <button type="button" class="btn btn--linea" data-ir-cat="todos">Ver lo disponible</button>
      </div>
    </article>`;
}

function htmlPieza(p, i) {
  const est = estadoDe(p);
  const agotado = est.clave === "agotado";
  const cant = enBolsa(p.codigo);
  const tope = !agotado && cant >= p.disponible;
  const marco = p.fotos.length ? htmlImg(p, p.fotos[0], 800, "pieza__foto", p.nombre, i > 5) : htmlVacio(p);
  let botonTxt = "+";
  let botonLabel = `Agregar ${p.nombre} a la bolsa`;
  if (agotado) { botonTxt = "✕"; botonLabel = `${p.nombre} agotado`; }
  else if (tope) { botonTxt = `${cant}/${p.disponible}`; botonLabel = `Ya tienes todo el stock de ${p.nombre}. Abrir bolsa`; }

  return `
    <article class="pieza${agotado ? " is-agotada" : ""}" data-sku="${esc(p.codigo)}">
      <button type="button" class="pieza__abrir" data-abrir="${esc(p.codigo)}" aria-label="Ver ficha de ${esc(p.nombre)}">
        <span class="pieza__marco">
          <span class="pieza__num">N°${String(i + 1).padStart(2, "0")}</span>
          ${marco}
          <span class="sello ${est.clase}">${esc(est.sello)}</span>
          ${p.fotos.length > 1 ? `<span class="pieza__fotos-n">${p.fotos.length} fotos</span>` : ""}
        </span>
        <span class="pieza__textos">
          <span class="pieza__codigo">[${esc(p.codigo)}]</span>
          <span class="pieza__nombre">${esc(p.nombre)}</span>
        </span>
      </button>
      <div class="pieza__fila">
        <span class="pieza__precio">${q(p.precio)}${p.porUnidad ? "<small>c/u</small>" : ""}</span>
        <button type="button" class="pieza__mas${tope ? " is-tope" : ""}" data-agregar="${esc(p.codigo)}" aria-label="${esc(botonLabel)}" ${agotado ? "disabled" : ""}>${botonTxt}</button>
      </div>
    </article>`;
}

function renderCatalogo() {
  const rejilla = $("#rejilla");
  const cat = CATEGORIAS.find((c) => c.id === estado.categoria) || CATEGORIAS[0];
  const lista = ordenarVitrina(estado.categoria === "todos" ? PRODUCTOS : PRODUCTOS.filter((p) => p.categoria === estado.categoria));

  $("#catTitulo").textContent = cat.titulo;
  const conStock = lista.filter((p) => estadoDe(p).clave !== "agotado").length;
  $("#catConteo").textContent = lista.length
    ? `${lista.length} pieza${lista.length === 1 ? "" : "s"} · ${conStock} con stock`
    : "0 en bodega · lote en camino";
  renderNota();

  if (!lista.length) {
    rejilla.innerHTML = estado.categoria === "camisas"
      ? htmlProximoDrop()
      : `<article class="proximo"><span class="proximo__k">Sin piezas</span><h3 style="margin-top:12px">Nada en esta categoría por ahora</h3><div class="proximo__acciones"><button type="button" class="btn btn--linea" data-ir-cat="todos">Ver todo</button></div></article>`;
    return;
  }
  rejilla.innerHTML = lista.map(htmlPieza).join("");
}

function seleccionarCategoria(id, enfocar = false) {
  if (!CATEGORIAS.some((c) => c.id === id)) return;
  estado.categoria = id;
  const pista = $("#filtros");
  $$(".filtro").forEach((tab) => {
    const activo = tab.dataset.cat === id;
    tab.classList.toggle("is-activo", activo);
    tab.setAttribute("aria-selected", String(activo));
    tab.tabIndex = activo ? 0 : -1;
    if (activo) {
      $("#rejilla").setAttribute("aria-labelledby", tab.id);
      if (enfocar) tab.focus({ preventScroll: true });
      pista.scrollTo({ left: Math.max(0, tab.offsetLeft - (pista.clientWidth - tab.offsetWidth) / 2), behavior: "smooth" });
    }
  });
  renderCatalogo();

  // Si el cliente estaba más abajo, regresa al inicio del catálogo
  const seccion = $("#catalogo");
  const alto = $("#cabecera").offsetHeight;
  const destino = Math.max(0, seccion.getBoundingClientRect().top + window.scrollY - alto - 6);
  if (window.scrollY > destino + 20) window.scrollTo({ top: destino, behavior: "auto" });
}

function cambiarVista(vista) {
  estado.vista = vista === "lista" ? "lista" : "grilla";
  $("#rejilla").dataset.vista = estado.vista;
  $$(".vista__btn").forEach((b) => {
    const activo = b.dataset.vista === estado.vista;
    b.classList.toggle("is-activo", activo);
    b.setAttribute("aria-pressed", String(activo));
  });
}

/* --------------------------------------------------------------------------
   7. FICHA DE PRODUCTO (BOTTOM SHEET)
   -------------------------------------------------------------------------- */
function abrirFicha(codigo, origen) {
  const p = buscar(codigo);
  if (!p) return;
  estado.ultimoFoco = origen || document.activeElement;
  estado.fichaCodigo = codigo;
  estado.fichaCantidad = 1;
  renderFicha(true);
  $("#capaFicha").hidden = false;
  $("#fichaCuerpo").scrollTop = 0;
  actualizarBloqueo();
  $("#ficha").focus({ preventScroll: true });
}

function cerrarFicha() {
  const capa = $("#capaFicha");
  if (capa.hidden) return;
  capa.hidden = true;
  estado.fichaCodigo = null;
  actualizarBloqueo();
  estado.ultimoFoco?.focus?.({ preventScroll: true });
}

function renderFicha(reiniciarGaleria = false) {
  const p = buscar(estado.fichaCodigo);
  if (!p) { cerrarFicha(); return; }
  const est = estadoDe(p);

  $("#fichaCodigo").textContent = `[${p.codigo}]`;
  const sello = $("#fichaSello");
  sello.className = `sello ${est.clase}`;
  sello.textContent = est.sello;
  $("#fichaNombre").textContent = p.nombre;
  $("#fichaPrecio").textContent = q(p.precio);
  $("#fichaUnidad").hidden = !p.porUnidad;
  $("#fichaTCodigo").textContent = p.codigo;
  $("#fichaTCategoria").textContent = etiquetaCategoria(p);
  $("#fichaTStock").textContent = est.clave === "agotado" ? "Agotado" : est.clave === "ultima" ? "Última pieza (1)" : `${p.disponible} en bodega`;
  $("#fichaDetalles").textContent = p.detalles || "Pieza seleccionada del catálogo QLZ Street.";

  const notas = [];
  if (p.porUnidad) {
    notas.push(`<b>Precio por unidad:</b> ${q(p.precio)} = 1 anillo. ${p.disponible > 0 ? `Hay ${p.disponible} en bodega.` : "Agotado por ahora."} El diseño se confirma por WhatsApp.`);
  }
  if (!p.fotos.length && est.clave !== "agotado") {
    const msg = encodeURIComponent(`Hola QLZ Street, ¿me pueden mandar foto real de [${p.codigo}] ${p.nombre}?`);
    notas.push(`Foto de estudio en camino. <a href="https://wa.me/${CONFIG.whatsapp}?text=${msg}" target="_blank" rel="noopener noreferrer">Pide una foto real por WhatsApp →</a>`);
  }
  const nota = $("#fichaNota");
  nota.hidden = !notas.length;
  nota.innerHTML = notas.join("<br />");

  if (reiniciarGaleria) renderGaleria(p);
  else $(".galeria")?.classList.toggle("is-agotada", est.clave === "agotado");
  renderAccionFicha();
}

function renderGaleria(p) {
  const carril = $("#galeriaCarril");
  const ctrl = $("#galeriaCtrl");
  const galeria = carril.closest(".galeria");
  galeria.classList.toggle("is-agotada", estadoDe(p).clave === "agotado");
  carril.innerHTML = p.fotos.length
    ? p.fotos.map((f, i) => `<div class="galeria__slide">${htmlImg(p, f, 1200, "", `${p.nombre} — foto ${i + 1}`, i > 0)}</div>`).join("")
    : `<div class="galeria__slide">${htmlVacio(p)}</div>`;
  carril.scrollLeft = 0;
  ctrl.hidden = p.fotos.length < 2;
  actualizarContadorGaleria();
}

function actualizarContadorGaleria() {
  const carril = $("#galeriaCarril");
  const total = carril.children.length;
  const idx = Math.min(total - 1, Math.round(carril.scrollLeft / Math.max(1, carril.clientWidth)));
  $("#galeriaCont").textContent = `${String(idx + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;
}

function moverGaleria(dir) {
  const carril = $("#galeriaCarril");
  const total = carril.children.length;
  const idx = Math.round(carril.scrollLeft / Math.max(1, carril.clientWidth));
  const sig = (idx + dir + total) % total;
  carril.scrollTo({ left: sig * carril.clientWidth, behavior: "smooth" });
}

function renderAccionFicha() {
  const p = buscar(estado.fichaCodigo);
  if (!p) return;
  const pasos = $("#fichaPasos");
  const btn = $("#fichaAgregar");
  const libre = p.disponible - enBolsa(p.codigo);

  if (estadoDe(p).clave === "agotado") {
    pasos.hidden = true;
    btn.disabled = true;
    btn.dataset.modo = "agotado";
    btn.textContent = "Agotado · sin existencias";
    return;
  }
  if (libre <= 0) {
    pasos.hidden = true;
    btn.disabled = false;
    btn.dataset.modo = "bolsa";
    btn.textContent = `Ya en tu bolsa (${enBolsa(p.codigo)}) · ver bolsa`;
    return;
  }
  estado.fichaCantidad = Math.max(1, Math.min(estado.fichaCantidad, libre));
  pasos.hidden = false;
  $("#fichaCantidad").textContent = String(estado.fichaCantidad);
  $("#fichaMenos").disabled = estado.fichaCantidad <= 1;
  $("#fichaMas").disabled = estado.fichaCantidad >= libre;
  btn.disabled = false;
  btn.dataset.modo = "agregar";
  btn.textContent = `Agregar al carrito · ${q(p.precio * estado.fichaCantidad)}`;
}

/* --------------------------------------------------------------------------
   8. BOLSA / RECIBO (DRAWER) + FORMULARIO
   -------------------------------------------------------------------------- */
function abrirBolsa(origen) {
  if (!$("#capaFicha").hidden) {
    // Viene desde la ficha: al cerrar la bolsa el foco vuelve a la tarjeta original
    $("#capaFicha").hidden = true;
    estado.fichaCodigo = null;
  } else {
    estado.ultimoFoco = origen || document.activeElement;
  }
  $("#aviso").hidden = true;
  renderBolsa();
  $("#capaRecibo").hidden = false;
  $("#btnBolsa").setAttribute("aria-expanded", "true");
  actualizarBloqueo();
  $("#recibo").focus({ preventScroll: true });
}

function cerrarBolsa() {
  const capa = $("#capaRecibo");
  if (capa.hidden) return;
  capa.hidden = true;
  $("#btnBolsa").setAttribute("aria-expanded", "false");
  actualizarBloqueo();
  estado.ultimoFoco?.focus?.({ preventScroll: true });
}

function mostrarAlertaBolsa(avisos) {
  const el = $("#reciboAlerta");
  el.hidden = !avisos.length;
  el.textContent = avisos.join(" ");
}

function renderBolsa() {
  const unidades = unidadesBolsa();
  const total = totalBolsa();
  $("#reciboN").textContent = `(${unidades})`;
  $("#reciboVacio").hidden = unidades > 0;
  $("#reciboLleno").hidden = unidades === 0;

  if (unidades > 0) {
    $("#reciboLineas").innerHTML = estado.bolsa.map((it) => {
      const p = buscar(it.codigo);
      if (!p) return "";
      const tope = it.cantidad >= p.disponible;
      return `
        <li class="linea">
          <div class="linea__img">${p.fotos.length ? htmlImg(p, p.fotos[0], 200, "", "", false) : `<span>${esc(p.codigo)}</span>`}</div>
          <div>
            <p class="linea__cod">[${esc(p.codigo)}] · ${q(p.precio)}${it.cantidad > 1 || p.porUnidad ? " c/u" : ""}</p>
            <p class="linea__nom">${esc(p.nombre)}</p>
            <div class="linea__ctrl">
              <div class="pasos" role="group" aria-label="Cantidad de ${esc(p.codigo)}">
                <button type="button" data-menos="${esc(p.codigo)}" aria-label="Quitar uno de ${esc(p.codigo)}">−</button>
                <output>${it.cantidad}</output>
                <button type="button" data-mas="${esc(p.codigo)}" aria-label="Agregar uno de ${esc(p.codigo)}" ${tope ? "disabled" : ""}>+</button>
              </div>
              ${tope ? `<span class="linea__tope">máx. ${p.disponible}</span>` : ""}
              <button type="button" class="linea__quitar" data-quitar="${esc(p.codigo)}">Quitar</button>
            </div>
          </div>
          <p class="linea__sub">${q(p.precio * it.cantidad)}</p>
        </li>`;
    }).join("");
    $("#totUnidades").textContent = String(unidades);
    $("#totSubtotal").textContent = q(total);
    $("#totTotal").textContent = q(total);
  }
  validarPedido(false);
}

/* ----- Validación estricta de los datos que necesita el bot ----- */
function telefonoValido(t) {
  const s = sinMarcas(t).trim();
  if (!s || !/^[+\d\s().-]+$/.test(s)) return false;
  let d = s.replace(/\D/g, "");
  if (s.startsWith("+")) {
    if (!d.startsWith("502")) return d.length >= 10 && d.length <= 15; // número extranjero
    d = d.slice(3);
  } else if (d.length === 11 && d.startsWith("502")) {
    d = d.slice(3);
  }
  return /^[2-7]\d{7}$/.test(d) && !/^(\d)\1{7}$/.test(d);
}

function leerFormulario() {
  const nombre = pulirTexto($("#inNombre").value);
  const direccion = pulirTexto($("#inDireccion").value);
  const telefono = pulirTexto($("#inTelefono").value);
  const pago = $('input[name="pago"]:checked')?.value || "";
  const palabras = nombre.split(" ").filter((w) => /\p{L}{2,}/u.test(w));
  return {
    datos: { nombre, direccion, telefono, pago },
    ok: {
      nombre: palabras.length >= 2,
      direccion: direccion.length >= 10 && /\p{L}{3,}/u.test(direccion),
      telefono: telefonoValido(telefono),
      pago: METODOS_PAGO.includes(pago)
    }
  };
}

function validarPedido(mostrarTodo) {
  if (mostrarTodo) Object.keys(estado.tocados).forEach((k) => { estado.tocados[k] = true; });
  const { datos, ok } = leerFormulario();
  const mensajes = {
    nombre: ["Nombre y apellido de quien recibe.", "Escribe nombre y apellido.", "Listo."],
    direccion: ["Incluye zona, colonia y municipio / departamento.", "Agrega zona, colonia y municipio o departamento.", "Listo."],
    telefono: ["8 dígitos de Guatemala (con o sin +502).", "Número no válido. Ej.: 5555-4444 o +502 5555 4444.", "Listo."],
    pago: ["Elige cómo vas a pagar.", "Selecciona un método de pago.", `Listo: ${datos.pago}.`]
  };
  const ids = { nombre: "Nombre", direccion: "Direccion", telefono: "Telefono", pago: "Pago" };

  for (const k of Object.keys(ok)) {
    const campo = $(`[data-campo="${k}"]`);
    const msg = $(`#msg${ids[k]}`);
    const visible = estado.tocados[k];
    campo.classList.toggle("is-ok", ok[k]);
    campo.classList.toggle("is-error", visible && !ok[k]);
    msg.textContent = ok[k] ? mensajes[k][2] : visible ? mensajes[k][1] : mensajes[k][0];
  }

  const completos = Object.values(ok).filter(Boolean).length;
  $("#progresoN").textContent = String(completos);
  $$(".pedido__barras i").forEach((b, i) => b.classList.toggle("lleno", i < completos));

  const hayProductos = unidadesBolsa() > 0;
  const listo = hayProductos && completos === 4;
  const btn = $("#btnPedir");
  btn.disabled = !listo;
  btn.setAttribute("aria-disabled", String(!listo));

  const nombres = { nombre: "nombre", direccion: "dirección", telefono: "teléfono", pago: "pago" };
  const faltan = Object.keys(ok).filter((k) => !ok[k]).map((k) => nombres[k]);
  const estadoEl = $("#pedidoEstado");
  estadoEl.classList.toggle("listo", listo);
  estadoEl.textContent = !hayProductos ? "Agrega al menos una pieza." : listo ? "✓ Todo listo. Tu pedido se enviará por WhatsApp." : `Faltan: ${faltan.join(" · ")}`;

  return { listo, datos };
}

/* ----- Mensaje de WhatsApp listo para el bot (columnas de pedidos_bot) ----- */
function construirPedidoWhatsApp(datos) {
  const lineas = estado.bolsa.map((it, i) => {
    const p = buscar(it.codigo);
    if (!p) return "";
    const unit = it.cantidad > 1 ? ` (${q(p.precio)} c/u)` : "";
    return `${i + 1}) [${p.codigo}] ${p.nombre} x${it.cantidad} = ${q(p.precio * it.cantidad)}${unit}`;
  }).filter(Boolean);

  const mensaje = [
    "Hola QLZ Street, quiero confirmar este pedido desde la tienda web:",
    "",
    "PRODUCTOS:",
    ...lineas,
    "",
    `TOTAL: ${q(totalBolsa())} (envío a coordinar según ubicación)`,
    `MÉTODO DE PAGO: ${datos.pago}`,
    "",
    "MIS DATOS:",
    `Nombre completo: ${datos.nombre}`,
    `Dirección de entrega: ${datos.direccion}`,
    `Teléfono: ${datos.telefono}`
  ].join("\n");

  return { mensaje, url: `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(mensaje)}` };
}

function abrirWhatsApp(url) {
  const ua = navigator.userAgent || "";
  if (/Android|iPhone|iPad|iPod|Mobile|TikTok|Bytedance|Instagram|FBAN|FBAV|WhatsApp/i.test(ua)) {
    window.location.assign(url); // abre la app directamente, sin bloqueo de popups
    return;
  }
  const a = Object.assign(document.createElement("a"), { href: url, target: "_blank", rel: "noopener noreferrer" });
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/* --------------------------------------------------------------------------
   9. INTERFAZ GENERAL
   -------------------------------------------------------------------------- */
function avisar(texto) {
  const el = $("#aviso");
  el.textContent = texto;
  el.hidden = false;
  clearTimeout(estado.timerAviso);
  estado.timerAviso = setTimeout(() => { el.hidden = true; }, 2200);
}

function actualizarIndicadores() {
  const n = unidadesBolsa();
  const conteo = $("#bolsaConteo");
  conteo.textContent = String(n).padStart(2, "0");
  $("#btnBolsa").classList.toggle("tiene", n > 0);
  $("#btnBolsa").setAttribute("aria-label", `Abrir bolsa, ${n} pieza${n === 1 ? "" : "s"}`);
  $("#flotanteN").textContent = String(n);
  $("#flotanteTotal").textContent = q(totalBolsa());
  const dialogo = !$("#capaFicha").hidden || !$("#capaRecibo").hidden;
  $("#bolsaFlotante").hidden = n === 0 || dialogo;
}

function actualizarBloqueo() {
  const dialogo = !$("#capaFicha").hidden || !$("#capaRecibo").hidden;
  document.body.classList.toggle("bloqueado", dialogo);
  ["#cabecera", "main", ".pie", "#bolsaFlotante", ".saltar"].forEach((s) => {
    const el = $(s);
    if (el) el.inert = dialogo;
  });
  actualizarIndicadores();
}

function refrescar() {
  renderConteos();
  renderCatalogo();
  actualizarIndicadores();
  if (estado.fichaCodigo) renderFicha(false);
  if (!$("#capaRecibo").hidden) renderBolsa();
}

function enfocables(raiz) {
  return $$('a[href], button:not(:disabled), input:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])', raiz)
    .filter((el) => !el.closest("[hidden]") && el.getClientRects().length);
}

function atraparFoco(ev) {
  const dialogo = !$("#capaRecibo").hidden ? $("#recibo") : !$("#capaFicha").hidden ? $("#ficha") : null;
  if (!dialogo) return;
  const lista = enfocables(dialogo);
  if (!lista.length) { ev.preventDefault(); return; }
  const primero = lista[0];
  const ultimo = lista[lista.length - 1];
  const activo = document.activeElement;
  if (ev.shiftKey && (activo === primero || activo === dialogo || !dialogo.contains(activo))) {
    ev.preventDefault(); ultimo.focus();
  } else if (!ev.shiftKey && (activo === ultimo || !dialogo.contains(activo))) {
    ev.preventDefault(); primero.focus();
  }
}

/* --------------------------------------------------------------------------
   10. INVENTARIO EN VIVO (Planilla QLZ Street -> L1_Inventarios)
   -------------------------------------------------------------------------- */
/**
 * Lee el endpoint doGet de Apps Script y actualiza precios, stock, estado y fotos.
 * GET simple sin headers personalizados (evita el preflight CORS de script.google.com).
 * Respuesta esperada: { ok: true, productos: [{ codigo, nombre, categoria, detalles,
 * precio, disponible, estado, enlaceFoto, fotos }] } o directamente un arreglo.
 */
async function cargarInventarioDesdeSheets(url = CONFIG.SHEETS_WEBAPP_URL) {
  const etiqueta = $("#estadoInventario");
  const endpoint = String(url || "").trim();
  if (!endpoint) {
    etiqueta.textContent = "INVENTARIO · L1";
    return PRODUCTOS;
  }

  const control = new AbortController();
  const corte = setTimeout(() => control.abort(), 9000);
  etiqueta.textContent = "SINCRONIZANDO STOCK…";

  try {
    const res = await fetch(endpoint, { method: "GET", cache: "no-store", signal: control.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const filas = Array.isArray(json) ? json : Array.isArray(json?.productos) ? json.productos : [];
    if (!filas.length) throw new Error("Inventario vacío");

    const previos = new Map(PRODUCTOS.map((p) => [p.codigo, p]));
    const nuevos = filas
      .filter((f) => (f.codigo || f.sku) && (f.nombre || f.producto))
      .filter((f) => normalizarClave(f.estado) !== "sin compra recibida")
      .map((f) => normalizarProducto(f, previos.get(String(f.codigo ?? f.sku).trim().toUpperCase())));
    if (!nuevos.length) throw new Error("Sin filas válidas");

    PRODUCTOS = nuevos;
    mostrarAlertaBolsa(reconciliarBolsa(estado.bolsa));
    renderContactos();
    refrescar();
    etiqueta.textContent = "● EN VIVO · L1_INVENTARIOS";
    etiqueta.classList.add("en-vivo");
  } catch (err) {
    console.warn("[QLZ v2] Se mantiene el catálogo base:", err);
    etiqueta.textContent = "INVENTARIO · RESPALDO LOCAL";
    etiqueta.classList.remove("en-vivo");
  } finally {
    clearTimeout(corte);
  }
  return PRODUCTOS;
}

/* --------------------------------------------------------------------------
   11. EVENTOS
   -------------------------------------------------------------------------- */
function iniciarEventos() {
  document.addEventListener("error", manejarErrorImagen, true);

  // Filtros (clic + flechas)
  const pista = $("#filtros");
  pista.addEventListener("click", (ev) => {
    const tab = ev.target.closest("[data-cat]");
    if (tab) seleccionarCategoria(tab.dataset.cat);
  });
  pista.addEventListener("keydown", (ev) => {
    const tabs = $$(".filtro");
    const i = tabs.findIndex((t) => t.dataset.cat === estado.categoria);
    const mapa = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 };
    if (!(ev.key in mapa)) return;
    ev.preventDefault();
    seleccionarCategoria(tabs[(mapa[ev.key] + tabs.length) % tabs.length].dataset.cat, true);
  });

  // Vista grilla / lista
  $$(".vista__btn").forEach((b) => b.addEventListener("click", () => cambiarVista(b.dataset.vista)));

  // Delegación: abrir ficha, agregar, cambiar categoría desde tarjetas
  document.addEventListener("click", (ev) => {
    const agregarBtn = ev.target.closest("[data-agregar]");
    if (agregarBtn) {
      const cod = agregarBtn.dataset.agregar;
      const p = buscar(cod);
      if (p && enBolsa(cod) >= p.disponible && p.disponible > 0) {
        abrirBolsa(agregarBtn);
      } else if (agregar(cod, 1)) {
        // La rejilla se re-renderiza: devolvemos el foco al botón equivalente
        $(`#rejilla [data-agregar="${CSS.escape(cod)}"]`)?.focus({ preventScroll: true });
      }
      return;
    }
    const abrir = ev.target.closest("[data-abrir]");
    if (abrir) { abrirFicha(abrir.dataset.abrir, abrir); return; }
    const irCat = ev.target.closest("[data-ir-cat]");
    if (irCat) seleccionarCategoria(irCat.dataset.irCat);
  });

  // Ficha
  $("#fichaCerrar").addEventListener("click", cerrarFicha);
  $("#capaFicha").addEventListener("click", (ev) => { if (ev.target.id === "capaFicha") cerrarFicha(); });
  $("#fichaMenos").addEventListener("click", () => { estado.fichaCantidad -= 1; renderAccionFicha(); });
  $("#fichaMas").addEventListener("click", () => { estado.fichaCantidad += 1; renderAccionFicha(); });
  $("#fichaAgregar").addEventListener("click", (ev) => {
    const modo = ev.currentTarget.dataset.modo;
    if (modo === "bolsa") { abrirBolsa(ev.currentTarget); return; }
    if (modo === "agregar" && agregar(estado.fichaCodigo, estado.fichaCantidad)) cerrarFicha();
  });
  $("#galeriaPrev").addEventListener("click", () => moverGaleria(-1));
  $("#galeriaSig").addEventListener("click", () => moverGaleria(1));
  let rafGaleria = 0;
  $("#galeriaCarril").addEventListener("scroll", () => {
    cancelAnimationFrame(rafGaleria);
    rafGaleria = requestAnimationFrame(actualizarContadorGaleria);
  }, { passive: true });
  $("#galeriaCarril").addEventListener("keydown", (ev) => {
    if (ev.key === "ArrowRight") { ev.preventDefault(); moverGaleria(1); }
    if (ev.key === "ArrowLeft") { ev.preventDefault(); moverGaleria(-1); }
  });

  // Deslizar el asa hacia abajo cierra la ficha
  let inicioY = 0;
  const asa = $("#fichaAsa");
  asa.addEventListener("touchstart", (ev) => { inicioY = ev.touches[0].clientY; }, { passive: true });
  asa.addEventListener("touchend", (ev) => { if (ev.changedTouches[0].clientY - inicioY > 60) cerrarFicha(); }, { passive: true });

  // Bolsa
  $("#btnBolsa").addEventListener("click", (ev) => abrirBolsa(ev.currentTarget));
  $("#bolsaFlotante").addEventListener("click", (ev) => abrirBolsa(ev.currentTarget));
  $("#reciboCerrar").addEventListener("click", cerrarBolsa);
  $("#reciboSeguir").addEventListener("click", cerrarBolsa);
  $("#capaRecibo").addEventListener("click", (ev) => { if (ev.target.id === "capaRecibo") cerrarBolsa(); });
  $("#reciboVaciar").addEventListener("click", () => {
    estado.bolsa = [];
    guardarBolsa();
    mostrarAlertaBolsa([]);
    refrescar();
  });
  $("#reciboLineas").addEventListener("click", (ev) => {
    const menos = ev.target.closest("[data-menos]");
    const mas = ev.target.closest("[data-mas]");
    const fuera = ev.target.closest("[data-quitar]");
    if (menos) cambiarCantidad(menos.dataset.menos, -1);
    else if (mas) cambiarCantidad(mas.dataset.mas, 1);
    else if (fuera) quitar(fuera.dataset.quitar);
  });

  // Formulario
  const campos = { inNombre: "nombre", inDireccion: "direccion", inTelefono: "telefono" };
  Object.entries(campos).forEach(([id, clave]) => {
    const el = $(`#${id}`);
    el.addEventListener("input", () => validarPedido(false));
    el.addEventListener("blur", () => { if (el.value.trim()) estado.tocados[clave] = true; validarPedido(false); });
  });
  $$('input[name="pago"]').forEach((r) => r.addEventListener("change", () => { estado.tocados.pago = true; validarPedido(false); }));

  $("#formPedido").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const { listo, datos } = validarPedido(true);
    if (!listo) {
      const primerError = $(".campo.is-error input, .campo.is-error textarea, .campo.is-error input[type=radio]");
      primerError?.focus();
      return;
    }
    const { url } = construirPedidoWhatsApp(datos);
    ev.currentTarget.dataset.ultimoEnlace = url;
    abrirWhatsApp(url);
  });

  // Teclado global
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Tab") { atraparFoco(ev); return; }
    if (ev.key === "Escape") {
      if (!$("#capaRecibo").hidden) cerrarBolsa();
      else if (!$("#capaFicha").hidden) cerrarFicha();
    }
  });

  // Sincroniza la bolsa si se modifica en otra pestaña
  window.addEventListener("storage", (ev) => {
    if (ev.key !== CONFIG.claveBolsa) return;
    mostrarAlertaBolsa(reconciliarBolsa(leerBolsa()));
    refrescar();
  });
}

/* --------------------------------------------------------------------------
   12. ARRANQUE
   -------------------------------------------------------------------------- */
function iniciar() {
  mostrarAlertaBolsa(reconciliarBolsa(leerBolsa()));
  iniciarEventos();
  renderContactos();
  refrescar();
  if (CONFIG.SHEETS_WEBAPP_URL) cargarInventarioDesdeSheets();
}

window.QLZ = {
  CONFIG,
  productos: () => PRODUCTOS,
  cargarInventarioDesdeSheets,
  construirPedidoWhatsApp,
  telefonoValido,
  urlFoto
};

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
else iniciar();
