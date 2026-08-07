let subestaciones = {};
let contratistas = {};
let configuracion = {};

let subestacionSeleccionada = null;
let contratistaSeleccionado = null;

window.addEventListener("load", async () => {
    await cargarTodo();
});

async function cargarTodo() {
    await Promise.all([
        cargarConfiguracion(),
        cargarSubestaciones(),
        cargarContratistas()
    ]);
}

async function cargarConfiguracion() {
    try {
        const res = await fetch("/api/configuracion");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        configuracion = await res.json();

        const tecnico = configuracion.tecnicoSolicitante || {};
        const jefe = configuracion.jefeInstalacion || {};

        document.getElementById("cfgTecnicoNombre").value = tecnico.nombre || "";
        document.getElementById("cfgTecnicoFirma").value = tecnico.firma || "";
        document.getElementById("cfgTecnicoUsarFirma").checked = !!tecnico.usarFirma;

        document.getElementById("cfgUnidad").value = configuracion.unidadSolicitante || "";

        document.getElementById("cfgJefeNombre").value = jefe.nombre || "";
        document.getElementById("cfgJefeFirma").value = jefe.firma || "";
        document.getElementById("cfgJefeUsarFirma").checked = !!jefe.usarFirma;
    } catch (error) {
        console.error(error);
        alert(`No se pudo cargar la configuración: ${error.message}`);
    }
}


async function guardarConfiguracion() {
    const data = {
        tecnicoSolicitante: {
            nombre: document.getElementById("cfgTecnicoNombre").value.trim(),
            firma: document.getElementById("cfgTecnicoFirma").value.trim(),
            usarFirma: document.getElementById("cfgTecnicoUsarFirma").checked
        },
        unidadSolicitante: document.getElementById("cfgUnidad").value.trim(),
        jefeInstalacion: {
            nombre: document.getElementById("cfgJefeNombre").value.trim(),
            firma: document.getElementById("cfgJefeFirma").value.trim(),
            usarFirma: document.getElementById("cfgJefeUsarFirma").checked
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
            ${escapeHtml(nombre)}
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

    if (!nombre) {
        alert("Introduce el nombre de la subestación.");
        return;
    }

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
        const res = await fetch(`/api/subestaciones/${encodeURIComponent(nombre)}`, {
            method: "DELETE"
        });

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

    if (!parque) {
        alert("Introduce un parque.");
        return;
    }

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

    if (!posicion) {
        alert("Introduce una posición.");
        return;
    }

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
            ${escapeHtml(nombre)}
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

    const reps = (contratistas[contratistaSeleccionado] || []).slice().sort((a, b) => a.localeCompare(b));

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
                <ul class="chips-lista">
                    ${reps.length
                        ? reps.map(rep => `
                            <li class="chip-item">
                                <span>${escapeHtml(rep)}</span>
                                <button class="btn-peligro btn-mini" type="button" onclick="eliminarRepresentante('${escapeJs(contratistaSeleccionado)}', '${escapeJs(rep)}')">x</button>
                            </li>
                        `).join("")
                        : `<li class="detalle-vacio">Sin representantes.</li>`
                    }
                </ul>

                <div class="fila-admin">
                    <input id="nuevoRepresentanteActual" placeholder="Nuevo representante">
                    <button type="button" onclick="agregarRepresentante('${escapeJs(contratistaSeleccionado)}')">Añadir representante</button>
                </div>
            </div>
        </div>
    `;
}

async function crearContratista() {
    const input = document.getElementById("nuevoContratista");
    const nombre = input.value.trim();

    if (!nombre) {
        alert("Introduce el nombre de la contrata.");
        return;
    }

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
        const res = await fetch(`/api/contratistas/${encodeURIComponent(nombre)}`, {
            method: "DELETE"
        });

        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error || "No se pudo eliminar");

        contratistaSeleccionado = null;
        await cargarContratistas();
    } catch (error) {
        alert(error.message);
    }
}

async function agregarRepresentante(nombre) {
    const input = document.getElementById("nuevoRepresentanteActual");
    const representante = input.value.trim();

    if (!representante) {
        alert("Introduce un representante.");
        return;
    }

    try {
        const res = await fetch(`/api/contratistas/${encodeURIComponent(nombre)}/representantes`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ representante })
        });

        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error || "No se pudo añadir el representante");

        input.value = "";
        await cargarContratistas();
    } catch (error) {
        alert(error.message);
    }
}

async function eliminarRepresentante(nombre, representante) {
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
