let subestaciones = {};
let contratistas = {};
let configuracion = {};
let tecnicos = [];

let subestacionSeleccionada = null;
let contratistaSeleccionado = null;
let representanteEditando = null;

window.addEventListener("load", async () => {
    await cargarTodo();
});

async function cargarTodo() {
    await Promise.all([
        cargarConfiguracion(),
        cargarSubestaciones(),
        cargarContratistas(),
        cargarTecnicos()
    ]);

    // El formulario de "nuevo técnico" es estático en el HTML (no se regenera),
    // así que su vista previa de firma se inicializa aquí una sola vez.
    actualizarPreviewFirma("nuevoTecnicoFirma", "");
}

async function cargarConfiguracion() {
    try {
        const res = await fetch("/api/configuracion");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        configuracion = await res.json();

        const jefe = configuracion.jefeInstalacion || {};
        const firmantePO = configuracion.firmantePOJefe || {};

        document.getElementById("cfgUnidad").value = configuracion.unidadSolicitante || "";

        document.getElementById("cfgJefeNombre").value = jefe.nombre || "";
        document.getElementById("cfgJefeFirma").value = jefe.firma || "";
        document.getElementById("cfgJefeUsarFirma").checked = !!jefe.usarFirma;
        mostrarPreviewExistente("cfgJefeFirma", jefe.firma);

        document.getElementById("cfgFirmantePONombre").value = firmantePO.nombre || "";
        document.getElementById("cfgFirmantePOFirma").value = firmantePO.firma || "";
        document.getElementById("cfgFirmantePOUsarFirma").checked = !!firmantePO.usarFirma;
        mostrarPreviewExistente("cfgFirmantePOFirma", firmantePO.firma);
    } catch (error) {
        console.error(error);
        alert(`No se pudo cargar la configuración: ${error.message}`);
    }
}

async function guardarConfiguracion() {
    const data = {
        unidadSolicitante: document.getElementById("cfgUnidad").value.trim(),
        jefeInstalacion: {
            nombre: document.getElementById("cfgJefeNombre").value.trim(),
            firma: document.getElementById("cfgJefeFirma").value.trim(),
            usarFirma: document.getElementById("cfgJefeUsarFirma").checked
        },
        firmantePOJefe: {
            nombre: document.getElementById("cfgFirmantePONombre").value.trim(),
            firma: document.getElementById("cfgFirmantePOFirma").value.trim(),
            usarFirma: document.getElementById("cfgFirmantePOUsarFirma").checked
        }
    };

    try {
        const res = await fetch("/api/configuracion", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });

        const json = await res.json();

        if (!res.ok || !json.ok) {
            throw new Error(json.error || "No se pudo guardar la configuración");
        }

        alert("Configuración guardada.");
    } catch (error) {
        console.error("Error guardando configuración:", error);
        alert(error.message);
    }
}

async function cargarTecnicos() {
    try {
        const res = await fetch("/api/tecnicos");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        tecnicos = await res.json();
        renderTecnicos();
    } catch (error) {
        console.error(error);
        alert(`No se pudieron cargar los técnicos: ${error.message}`);
    }
}

function renderTecnicos() {
    const contenedor = document.getElementById("listaTecnicos");
    if (!contenedor) return;

    if (!tecnicos.length) {
        contenedor.innerHTML = `<div class="detalle-vacio">No hay técnicos.</div>`;
        return;
    }

    contenedor.innerHTML = tecnicos
        .slice()
        .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""))
        .map(t => `
            <div class="card-admin">
                <div class="card-header">
                    <h3>${escapeHtml(t.nombre || "")}</h3>
                    <button class="btn-peligro" type="button" onclick="eliminarTecnico('${escapeJs(t.id)}')">Eliminar</button>
                </div>
                <div class="card-linea"><strong>Área:</strong> ${escapeHtml(t.area || "") || "—"}</div>
                <div class="card-firma-thumb">
                    <img src="${t.firma ? `/${escapeHtml(t.firma)}` : FIRMA_PLACEHOLDER}" alt="Firma de ${escapeHtml(t.nombre || "")}">
                    <span class="estado-firma">${t.usarFirma ? '<span class="badge-si">Firma activa</span>' : '<span class="badge-no">Sin usar</span>'}</span>
                </div>
            </div>
        `)
        .join("");
}

function slugifyId(texto) {
    return String(texto)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
}

async function crearTecnico() {
    const nombre = document.getElementById("nuevoTecnicoNombre").value.trim();
    const area = document.getElementById("nuevoTecnicoArea").value.trim();
    const firma = document.getElementById("nuevoTecnicoFirma").value.trim();
    const usarFirma = document.getElementById("nuevoTecnicoUsarFirma").checked;

    if (!nombre) {
        alert("Introduce el nombre del técnico.");
        return;
    }

    const data = {
        id: slugifyId(nombre),
        nombre,
        area,
        firma,
        usarFirma
    };

    try {
        const res = await fetch("/api/tecnicos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });

        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error || "No se pudo crear el técnico");

        document.getElementById("nuevoTecnicoNombre").value = "";
        document.getElementById("nuevoTecnicoArea").value = "";
        document.getElementById("nuevoTecnicoFirma").value = "";
        document.getElementById("nuevoTecnicoUsarFirma").checked = false;
        ocultarPreview("nuevoTecnicoFirma");

        await cargarTecnicos();
    } catch (error) {
        alert(error.message);
    }
}

async function eliminarTecnico(id) {
    if (!confirm("¿Eliminar este técnico?")) return;

    try {
        const res = await fetch(`/api/tecnicos/${encodeURIComponent(id)}`, {
            method: "DELETE"
        });

        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error || "No se pudo eliminar el técnico");

        await cargarTecnicos();
    } catch (error) {
        alert(error.message);
    }
}

async function cargarSubestaciones() {
    try {
        const res = await fetch("/api/subestaciones");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        subestaciones = await res.json();

        const nombres = Object.keys(subestaciones).sort((a, b) => a.localeCompare(b));
        if (nombres.length && (!subestacionSeleccionada || !subestaciones[subestacionSeleccionada])) {
            subestacionSeleccionada = nombres[0];
        }

        renderSubestacionesLista();
        renderDetalleSubestacion();
    } catch (error) {
        console.error(error);
        alert(`No se pudieron cargar las subestaciones: ${error.message}`);
    }
}

function renderSubestacionesLista() {
    const contenedor = document.getElementById("listaSubestaciones");
    const filtro = document.getElementById("filtroSubestaciones").value.trim().toLowerCase();

    const nombres = Object.keys(subestaciones)
        .sort((a, b) => a.localeCompare(b))
        .filter(nombre => nombre.toLowerCase().includes(filtro));

    if (!nombres.length) {
        contenedor.innerHTML = `<div class="detalle-vacio">No hay resultados.</div>`;
        return;
    }

    contenedor.innerHTML = nombres.map(nombre => `
        <button
            class="item-lista ${nombre === subestacionSeleccionada ? "activo" : ""}"
            onclick="seleccionarSubestacion('${escapeJs(nombre)}')"
            type="button"
        >
            <span class="avatar-inicial">${escapeHtml(nombre.charAt(0) || "?")}</span>
            <span>${escapeHtml(nombre)}</span>
        </button>
    `).join("");
}

function seleccionarSubestacion(nombre) {
    subestacionSeleccionada = nombre;
    renderSubestacionesLista();
    renderDetalleSubestacion();
}

function renderDetalleSubestacion() {
    const contenedor = document.getElementById("detalleSubestacion");

    if (!subestacionSeleccionada || !subestaciones[subestacionSeleccionada]) {
        contenedor.innerHTML = `<div class="detalle-vacio">Selecciona una subestación para editarla.</div>`;
        return;
    }

    const data = subestaciones[subestacionSeleccionada];
    const parques = (data.parques || []).slice().sort((a, b) => a.localeCompare(b));
    const posiciones = (data.posiciones || []).slice().sort((a, b) => a.localeCompare(b));

    contenedor.innerHTML = `
        <div class="detalle-card">
            <div class="detalle-header">
                <h3>${escapeHtml(subestacionSeleccionada)}</h3>
                <button class="btn-peligro" type="button" onclick="eliminarSubestacion('${escapeJs(subestacionSeleccionada)}')">
                    Eliminar subestación
                </button>
            </div>

            <div class="bloque-admin">
                <h4>Parques</h4>
                <ul class="chips-lista">
                    ${parques.length
                        ? parques.map(parque => `
                            <li class="chip-item">
                                <span>${escapeHtml(parque)}</span>
                                <button class="btn-peligro btn-mini" type="button" onclick="eliminarParque('${escapeJs(subestacionSeleccionada)}', '${escapeJs(parque)}')">x</button>
                            </li>
                        `).join("")
                        : `<li class="detalle-vacio">Sin parques.</li>`
                    }
                </ul>

                <div class="fila-admin">
                    <input id="nuevoParqueActual" placeholder="Nuevo parque">
                    <button type="button" onclick="agregarParque('${escapeJs(subestacionSeleccionada)}')">Añadir parque</button>
                </div>
            </div>

            <div class="bloque-admin">
                <h4>Posiciones</h4>
                <ul class="chips-lista">
                    ${posiciones.length
                        ? posiciones.map(posicion => `
                            <li class="chip-item">
                                <span>${escapeHtml(posicion)}</span>
                                <button class="btn-peligro btn-mini" type="button" onclick="eliminarPosicion('${escapeJs(subestacionSeleccionada)}', '${escapeJs(posicion)}')">x</button>
                            </li>
                        `).join("")
                        : `<li class="detalle-vacio">Sin posiciones.</li>`
                    }
                </ul>

                <div class="fila-admin">
                    <input id="nuevaPosicionActual" placeholder="Nueva posición">
                    <button type="button" onclick="agregarPosicion('${escapeJs(subestacionSeleccionada)}')">Añadir posición</button>
                </div>
            </div>
        </div>
    `;
}

async function crearSubestacion() {
    const input = document.getElementById("nuevaSubestacion");
    const nombre = input.value.trim();
    if (!nombre) return alert("Introduce el nombre de la subestación.");

    try {
        const res = await fetch("/api/subestaciones", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nombre, parques: [], posiciones: [] })
        });

        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error || "No se pudo crear");

        input.value = "";
        subestacionSeleccionada = nombre.toUpperCase();
        await cargarSubestaciones();
    } catch (error) {
        alert(error.message);
    }
}

async function eliminarSubestacion(nombre) {
    if (!confirm(`¿Eliminar la subestación "${nombre}"?`)) return;

    try {
        const res = await fetch(`/api/subestaciones/${encodeURIComponent(nombre)}`, { method: "DELETE" });
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error || "No se pudo eliminar");

        subestacionSeleccionada = null;
        await cargarSubestaciones();
    } catch (error) {
        alert(error.message);
    }
}

async function agregarParque(nombre) {
    const input = document.getElementById("nuevoParqueActual");
    const parque = input.value.trim();
    if (!parque) return alert("Introduce un parque.");

    try {
        const res = await fetch(`/api/subestaciones/${encodeURIComponent(nombre)}/parques`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ parque })
        });

        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error || "No se pudo añadir el parque");

        input.value = "";
        await cargarSubestaciones();
    } catch (error) {
        alert(error.message);
    }
}

async function eliminarParque(nombre, parque) {
    try {
        const res = await fetch(`/api/subestaciones/${encodeURIComponent(nombre)}/parques/${encodeURIComponent(parque)}`, {
            method: "DELETE"
        });

        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error || "No se pudo eliminar el parque");

        await cargarSubestaciones();
    } catch (error) {
        alert(error.message);
    }
}

async function agregarPosicion(nombre) {
    const input = document.getElementById("nuevaPosicionActual");
    const posicion = input.value.trim();
    if (!posicion) return alert("Introduce una posición.");

    try {
        const res = await fetch(`/api/subestaciones/${encodeURIComponent(nombre)}/posiciones`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ posicion })
        });

        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error || "No se pudo añadir la posición");

        input.value = "";
        await cargarSubestaciones();
    } catch (error) {
        alert(error.message);
    }
}

async function eliminarPosicion(nombre, posicion) {
    try {
        const res = await fetch(`/api/subestaciones/${encodeURIComponent(nombre)}/posiciones/${encodeURIComponent(posicion)}`, {
            method: "DELETE"
        });

        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error || "No se pudo eliminar la posición");

        await cargarSubestaciones();
    } catch (error) {
        alert(error.message);
    }
}

async function cargarContratistas() {
    try {
        const res = await fetch("/api/contratistas");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        contratistas = await res.json();

        const nombres = Object.keys(contratistas).sort((a, b) => a.localeCompare(b));
        if (nombres.length && (!contratistaSeleccionado || !contratistas[contratistaSeleccionado])) {
            contratistaSeleccionado = nombres[0];
        }

        renderContratistasLista();
        renderDetalleContratista();
    } catch (error) {
        console.error(error);
        alert(`No se pudieron cargar las contratas: ${error.message}`);
    }
}

function renderContratistasLista() {
    const contenedor = document.getElementById("listaContratistas");
    const filtro = document.getElementById("filtroContratistas").value.trim().toLowerCase();

    const nombres = Object.keys(contratistas)
        .sort((a, b) => a.localeCompare(b))
        .filter(nombre => nombre.toLowerCase().includes(filtro));

    if (!nombres.length) {
        contenedor.innerHTML = `<div class="detalle-vacio">No hay resultados.</div>`;
        return;
    }

    contenedor.innerHTML = nombres.map(nombre => `
        <button
            class="item-lista ${nombre === contratistaSeleccionado ? "activo" : ""}"
            onclick="seleccionarContratista('${escapeJs(nombre)}')"
            type="button"
        >
            <span class="avatar-inicial">${escapeHtml(nombre.charAt(0) || "?")}</span>
            <span>${escapeHtml(nombre)}</span>
        </button>
    `).join("");
}

function seleccionarContratista(nombre) {
    contratistaSeleccionado = nombre;
    renderContratistasLista();
    renderDetalleContratista();
}

function renderDetalleContratista() {
    const contenedor = document.getElementById("detalleContratista");

    if (!contratistaSeleccionado || !contratistas[contratistaSeleccionado]) {
        contenedor.innerHTML = `<div class="detalle-vacio">Selecciona una contrata para editarla.</div>`;
        return;
    }

    const reps = (contratistas[contratistaSeleccionado] || [])
        .slice()
        .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));

    contenedor.innerHTML = `
        <div class="detalle-card">
            <div class="detalle-header">
                <h3>${escapeHtml(contratistaSeleccionado)}</h3>
                <button class="btn-peligro" type="button" onclick="eliminarContratista('${escapeJs(contratistaSeleccionado)}')">
                    Eliminar contrata
                </button>
            </div>

            <div class="bloque-admin">
                <h4>Representantes</h4>
                <ul class="reps-lista">
                    ${reps.length
                        ? reps.map(rep => `
                            <li class="rep-card">
                                <img src="${rep.firma ? `/${escapeHtml(rep.firma)}` : FIRMA_PLACEHOLDER}" alt="Firma de ${escapeHtml(rep.nombre || "")}">
                                <div class="rep-info">
                                    <div class="rep-nombre">${escapeHtml(rep.nombre || "")}</div>
                                    <div class="estado-firma">${rep.usarFirma ? '<span class="badge-si">Firma activa</span>' : '<span class="badge-no">Sin usar</span>'}</div>
                                </div>
                                <div class="rep-acciones">
                                    <button class="btn-secundario btn-mini" type="button" onclick="editarRepresentante('${escapeJs(contratistaSeleccionado)}', '${escapeJs(rep.nombre)}')">Editar</button>
                                    <button class="btn-peligro btn-mini" type="button" onclick="eliminarRepresentante('${escapeJs(contratistaSeleccionado)}', '${escapeJs(rep.nombre)}')">x</button>
                                </div>
                            </li>
                        `).join("")
                        : `<li class="detalle-vacio">Sin representantes.</li>`
                    }
                </ul>

                <div class="fila-admin">
                    <input id="nuevoRepresentanteActual" placeholder="Nuevo representante">
                    <input id="nuevoRepresentanteFirma" placeholder="Ruta firma (ej: img/firma-representante.png)">
                </div>
                <div class="campo-firma-acciones">
                    <button type="button" class="btn-secundario" onclick="document.getElementById('nuevoRepresentanteFirmaArchivo').click()">Subir imagen</button>
                    <input type="file" id="nuevoRepresentanteFirmaArchivo" accept="image/png,image/jpeg" hidden onchange="subirArchivoFirma(this, 'nuevoRepresentanteFirma')">
                    <button type="button" class="btn-secundario" onclick="abrirModalFirma('nuevoRepresentanteFirma')">Firmar con lápiz</button>
                </div>
                <img id="nuevoRepresentanteFirmaPreview" class="firma-preview" alt="Vista previa firma representante" src="${FIRMA_PLACEHOLDER}">
                <div class="fila-check">
                    <label class="check-label">
                        <input type="checkbox" id="nuevoRepresentanteUsarFirma">
                        Usar firma automática
                    </label>
                </div>

                <div class="fila-admin">
                    <button type="button" id="btnGuardarRepresentante" onclick="guardarRepresentante('${escapeJs(contratistaSeleccionado)}')">Añadir representante</button>
                    <button type="button" id="btnCancelarEdicionRepresentante" class="btn-secundario oculto" onclick="cancelarEdicionRepresentante()">Cancelar</button>
                </div>
            </div>
        </div>
    `;
}

async function crearContratista() {
    const input = document.getElementById("nuevoContratista");
    const nombre = input.value.trim();
    if (!nombre) return alert("Introduce el nombre de la contrata.");

    try {
        const res = await fetch("/api/contratistas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nombre, representantes: [] })
        });

        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error || "No se pudo crear");

        input.value = "";
        contratistaSeleccionado = nombre.toUpperCase();
        await cargarContratistas();
    } catch (error) {
        alert(error.message);
    }
}

async function eliminarContratista(nombre) {
    if (!confirm(`¿Eliminar la contrata "${nombre}"?`)) return;

    try {
        const res = await fetch(`/api/contratistas/${encodeURIComponent(nombre)}`, { method: "DELETE" });
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error || "No se pudo eliminar");

        contratistaSeleccionado = null;
        await cargarContratistas();
    } catch (error) {
        alert(error.message);
    }
}

async function guardarRepresentante(contratista) {
    const input = document.getElementById("nuevoRepresentanteActual");
    const nombre = input.value.trim();
    if (!nombre) return alert("Introduce un representante.");

    const firma = document.getElementById("nuevoRepresentanteFirma")?.value.trim() || "";
    const usarFirma = document.getElementById("nuevoRepresentanteUsarFirma")?.checked || false;

    const editandoEstaContrata = representanteEditando && representanteEditando.contratista === contratista;

    try {
        const url = editandoEstaContrata
            ? `/api/contratistas/${encodeURIComponent(contratista)}/representantes/${encodeURIComponent(representanteEditando.nombreOriginal)}`
            : `/api/contratistas/${encodeURIComponent(contratista)}/representantes`;

        const res = await fetch(url, {
            method: editandoEstaContrata ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(
                editandoEstaContrata
                    ? { nuevoNombre: nombre, firma, usarFirma }
                    : { representante: nombre, firma, usarFirma }
            )
        });

        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error || "No se pudo guardar el representante");

        representanteEditando = null;
        await cargarContratistas();
    } catch (error) {
        alert(error.message);
    }
}

function editarRepresentante(contratista, nombre) {
    const lista = contratistas[contratista] || [];
    const rep = lista.find(r => r.nombre === nombre);
    if (!rep) return;

    representanteEditando = { contratista, nombreOriginal: rep.nombre };

    document.getElementById("nuevoRepresentanteActual").value = rep.nombre || "";
    document.getElementById("nuevoRepresentanteFirma").value = rep.firma || "";
    document.getElementById("nuevoRepresentanteUsarFirma").checked = !!rep.usarFirma;

    if (rep.firma) {
        mostrarPreviewExistente("nuevoRepresentanteFirma", rep.firma);
    } else {
        ocultarPreview("nuevoRepresentanteFirma");
    }

    const boton = document.getElementById("btnGuardarRepresentante");
    if (boton) boton.textContent = "Guardar cambios";

    const cancelar = document.getElementById("btnCancelarEdicionRepresentante");
    if (cancelar) cancelar.classList.remove("oculto");

    document.getElementById("nuevoRepresentanteActual").scrollIntoView({ behavior: "smooth", block: "center" });
}

function cancelarEdicionRepresentante() {
    representanteEditando = null;

    document.getElementById("nuevoRepresentanteActual").value = "";
    document.getElementById("nuevoRepresentanteFirma").value = "";
    document.getElementById("nuevoRepresentanteUsarFirma").checked = false;
    ocultarPreview("nuevoRepresentanteFirma");

    const boton = document.getElementById("btnGuardarRepresentante");
    if (boton) boton.textContent = "Añadir representante";

    const cancelar = document.getElementById("btnCancelarEdicionRepresentante");
    if (cancelar) cancelar.classList.add("oculto");
}

async function eliminarRepresentante(nombre, representante) {
    if (!confirm(`¿Eliminar el representante "${representante}" de "${nombre}"?`)) return;

    try {
        const res = await fetch(`/api/contratistas/${encodeURIComponent(nombre)}/representantes/${encodeURIComponent(representante)}`, {
            method: "DELETE"
        });

        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error || "No se pudo eliminar el representante");

        await cargarContratistas();
    } catch (error) {
        alert(error.message);
    }
}

function escapeHtml(texto) {
    return String(texto)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function escapeJs(texto) {
    return String(texto)
        .replaceAll("\\", "\\\\")
        .replaceAll("'", "\\'");
}

// ---------------- FIRMAS: subida de imagen y previsualización ----------------

// Imagen de aviso "sin firma" (SVG en línea, no depende de ningún archivo externo)
const FIRMA_PLACEHOLDER = "data:image/svg+xml;utf8," + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="70" viewBox="0 0 200 70">
    <rect x="1" y="1" width="198" height="68" rx="8" fill="#f7f7f8" stroke="#c9ccd1" stroke-width="1.5" stroke-dasharray="5 4"/>
    <path d="M28 42 Q 38 18, 52 38 T 82 33 Q 96 16, 112 38 T 150 30" fill="none" stroke="#b7bbc2" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="100" y="59" font-family="Arial, sans-serif" font-size="10" fill="#9a9ea5" text-anchor="middle">Sin firma configurada</text>
</svg>
`.trim());

// Relaciona cada campo de firma con su checkbox "usar firma automática",
// para marcarlo solo cuando corresponde al subir/dibujar una firma nueva.
const CHECKBOX_USAR_FIRMA = {
    cfgJefeFirma: "cfgJefeUsarFirma",
    cfgFirmantePOFirma: "cfgFirmantePOUsarFirma",
    nuevoTecnicoFirma: "nuevoTecnicoUsarFirma",
    nuevoRepresentanteFirma: "nuevoRepresentanteUsarFirma"
};

// Punto único que decide qué se muestra en cada vista previa de firma:
// la imagen real si existe, o si no un aviso visual de "sin firma" (nunca queda vacío).
function actualizarPreviewFirma(targetInputId, ruta) {
    const preview = document.getElementById(`${targetInputId}Preview`);
    if (!preview) return;

    preview.hidden = false;
    preview.src = ruta ? `/${ruta}?t=${Date.now()}` : FIRMA_PLACEHOLDER;
    preview.classList.toggle("firma-preview-vacia", !ruta);
}

function mostrarPreviewExistente(targetInputId, ruta) {
    actualizarPreviewFirma(targetInputId, ruta || "");
}

function ocultarPreview(targetInputId) {
    actualizarPreviewFirma(targetInputId, "");
}

function aplicarRutaFirma(targetInputId, ruta) {
    const input = document.getElementById(targetInputId);
    if (input) input.value = ruta;

    actualizarPreviewFirma(targetInputId, ruta);

    const checkboxId = CHECKBOX_USAR_FIRMA[targetInputId];
    if (checkboxId) {
        const checkbox = document.getElementById(checkboxId);
        if (checkbox) checkbox.checked = true;
    }
}

async function subirBlobFirma(blob, nombreArchivo, targetInputId) {
    const formData = new FormData();
    formData.append("firma", blob, nombreArchivo);

    const res = await fetch("/api/subir-firma", {
        method: "POST",
        body: formData
    });

    const json = await res.json();
    if (!res.ok || !json.ok) {
        throw new Error(json.error || "No se pudo guardar la firma");
    }

    aplicarRutaFirma(targetInputId, json.ruta);
}

async function subirArchivoFirma(inputFile, targetInputId) {
    const archivo = inputFile.files[0];
    if (!archivo) return;

    try {
        await subirBlobFirma(archivo, archivo.name, targetInputId);
    } catch (error) {
        alert(error.message);
    } finally {
        inputFile.value = "";
    }
}

// ---------------- FIRMAS: dibujo con lápiz / dedo en canvas ----------------

let firmaTargetInputId = null;
let firmaContexto = null;
let firmaDibujando = false;

function abrirModalFirma(targetInputId) {
    firmaTargetInputId = targetInputId;

    const canvas = document.getElementById("canvasFirma");
    firmaContexto = canvas.getContext("2d");
    firmaContexto.clearRect(0, 0, canvas.width, canvas.height);
    firmaContexto.lineWidth = 2.5;
    firmaContexto.lineCap = "round";
    firmaContexto.lineJoin = "round";
    firmaContexto.strokeStyle = "#000000";

    document.getElementById("modalFirma").classList.remove("oculto");
}

function cerrarModalFirma() {
    document.getElementById("modalFirma").classList.add("oculto");
    firmaTargetInputId = null;
}

function borrarCanvasFirma() {
    const canvas = document.getElementById("canvasFirma");
    if (firmaContexto) {
        firmaContexto.clearRect(0, 0, canvas.width, canvas.height);
    }
}

function posicionEnCanvas(canvas, evento) {
    const rect = canvas.getBoundingClientRect();
    const escalaX = canvas.width / rect.width;
    const escalaY = canvas.height / rect.height;
    return {
        x: (evento.clientX - rect.left) * escalaX,
        y: (evento.clientY - rect.top) * escalaY
    };
}

function inicializarCanvasFirma() {
    const canvas = document.getElementById("canvasFirma");
    if (!canvas) return;

    canvas.addEventListener("pointerdown", (evento) => {
        firmaDibujando = true;
        canvas.setPointerCapture(evento.pointerId);
        const pos = posicionEnCanvas(canvas, evento);
        firmaContexto.beginPath();
        firmaContexto.moveTo(pos.x, pos.y);
        evento.preventDefault();
    });

    canvas.addEventListener("pointermove", (evento) => {
        if (!firmaDibujando) return;
        const pos = posicionEnCanvas(canvas, evento);
        firmaContexto.lineTo(pos.x, pos.y);
        firmaContexto.stroke();
        evento.preventDefault();
    });

    ["pointerup", "pointerleave", "pointercancel"].forEach(nombreEvento => {
        canvas.addEventListener(nombreEvento, () => {
            firmaDibujando = false;
        });
    });
}

function canvasFirmaTieneTrazo(canvas) {
    const datos = firmaContexto.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 3; i < datos.length; i += 4) {
        if (datos[i] !== 0) return true; // canal alfa distinto de 0 = hay algo dibujado
    }
    return false;
}

async function guardarFirmaCanvas() {
    const canvas = document.getElementById("canvasFirma");

    if (!canvasFirmaTieneTrazo(canvas)) {
        alert("Dibuja la firma antes de guardar.");
        return;
    }

    canvas.toBlob(async (blob) => {
        try {
            await subirBlobFirma(blob, "firma.png", firmaTargetInputId);
            cerrarModalFirma();
        } catch (error) {
            alert(error.message);
        }
    }, "image/png");
}

window.addEventListener("load", inicializarCanvasFirma);
