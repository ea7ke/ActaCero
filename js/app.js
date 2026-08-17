let subestaciones = {};
let contratistas = {};
let tecnicos = [];
let tecnicoSeleccionado = null;
let representanteSeleccionado = null;

window.addEventListener("load", async () => {
    try {
        const hoy = new Date().toISOString().split("T")[0];

        const campoFecha = document.getElementById("fecha");
        if (campoFecha && !campoFecha.value) {
            campoFecha.value = hoy;
        }

        const campoFechaInicio = document.getElementById("fechaInicio");
        if (campoFechaInicio && !campoFechaInicio.value) {
            campoFechaInicio.value = hoy;
        }

        const campoFechaFin = document.getElementById("fechaFin");
        if (campoFechaFin && !campoFechaFin.value) {
            campoFechaFin.value = hoy;
        }

        const configRes = await fetch("/api/configuracion");
        if (!configRes.ok) {
            throw new Error(`Configuración: HTTP ${configRes.status}`);
        }
        const config = await configRes.json();
        window.__configuracionActual = config;

        const unidad = document.getElementById("unidad");
        const jefeInstalacion = document.getElementById("jefeInstalacion");
        const firmantePODisplay = document.getElementById("firmantePODisplay");
        const jefeConfig = config.jefeInstalacion || {};
        const firmantePOConfig = config.firmantePOJefe || {};

        if (unidad) unidad.value = config.unidadSolicitante || "";
        if (jefeInstalacion) jefeInstalacion.value = jefeConfig.nombre || "";
        if (firmantePODisplay) firmantePODisplay.value = firmantePOConfig.nombre || "";

        const subRes = await fetch("/api/subestaciones");
        if (!subRes.ok) {
            throw new Error(`Subestaciones: HTTP ${subRes.status}`);
        }
        subestaciones = await subRes.json();

        const contratasRes = await fetch("/api/contratistas");
        if (!contratasRes.ok) {
            throw new Error(`Contratistas: HTTP ${contratasRes.status}`);
        }
        contratistas = await contratasRes.json();

        const tecnicosRes = await fetch("/api/tecnicos");
        if (!tecnicosRes.ok) {
            throw new Error(`Técnicos: HTTP ${tecnicosRes.status}`);
        }
        tecnicos = await tecnicosRes.json();

        cargarSubestaciones();
        cargarEmpresas();
        cargarTecnicos();
    } catch (error) {
        console.error("Error cargando datos iniciales:", error);
        alert(`No se pudieron cargar los datos iniciales: ${error.message}`);
    }
});

function cargarSubestaciones() {
    const cboSub = document.getElementById("subestacion");
    if (!cboSub) return;

    cboSub.innerHTML = '<option value="">Seleccione...</option>';

    Object.keys(subestaciones)
        .sort((a, b) => a.localeCompare(b))
        .forEach(nombre => {
            const option = document.createElement("option");
            option.value = nombre;
            option.textContent = nombre;
            cboSub.appendChild(option);
        });
}

function cargarEmpresas() {
    const cboEmpresa = document.getElementById("empresa");
    if (!cboEmpresa) return;

    cboEmpresa.innerHTML = '<option value="">Seleccione...</option>';

    Object.keys(contratistas)
        .sort((a, b) => a.localeCompare(b))
        .forEach(nombre => {
            const option = document.createElement("option");
            option.value = nombre;
            option.textContent = nombre;
            cboEmpresa.appendChild(option);
        });
}

function cargarTecnicos() {
    const cboTecnico = document.getElementById("tecnico");
    if (!cboTecnico) return;

    cboTecnico.innerHTML = '<option value="">Seleccione...</option>';

    tecnicos
        .slice()
        .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""))
        .forEach(t => {
            const option = document.createElement("option");
            option.value = t.id;
            option.textContent = t.nombre;
            cboTecnico.appendChild(option);
        });
}

function escapeHtmlTexto(texto) {
    const div = document.createElement("div");
    div.textContent = texto;
    return div.innerHTML;
}

function renderMultiSelect(contenedorId, opciones) {
    const contenedor = document.getElementById(contenedorId);
    if (!contenedor) return;

    if (!opciones.length) {
        contenedor.innerHTML = `<div class="multi-select-vacio">Selecciona antes una subestación.</div>`;
        return;
    }

    contenedor.innerHTML = opciones
        .map((valor, indice) => `
            <label>
                <input type="checkbox" name="${contenedorId}" id="${contenedorId}_${indice}" value="${escapeHtmlTexto(valor)}">
                ${escapeHtmlTexto(valor)}
            </label>
        `)
        .join("");
}

function obtenerSeleccionMultiple(contenedorId) {
    const contenedor = document.getElementById(contenedorId);
    if (!contenedor) return "";

    const marcados = contenedor.querySelectorAll("input[type=checkbox]:checked");
    return Array.from(marcados).map(cb => cb.value).join(", ");
}

function cambiarSubestacion() {
    const sub = document.getElementById("subestacion")?.value || "";

    if (!sub || !subestaciones[sub]) {
        renderMultiSelect("parque", []);
        renderMultiSelect("posicion", []);
        return;
    }

    renderMultiSelect("parque", subestaciones[sub].parques || []);
    renderMultiSelect("posicion", subestaciones[sub].posiciones || []);
}

function cambiarEmpresa() {
    const empresa = document.getElementById("empresa")?.value || "";
    const representante = document.getElementById("representante");

    representanteSeleccionado = null;

    if (!representante) return;

    representante.innerHTML = '<option value=""></option>';

    if (!empresa || !contratistas[empresa]) return;

    (contratistas[empresa] || []).forEach(persona => {
        const nombre = typeof persona === "string" ? persona : (persona.nombre || "");
        const option = document.createElement("option");
        option.value = nombre;
        option.textContent = nombre;
        representante.appendChild(option);
    });
}

function cambiarRepresentante() {
    const empresa = document.getElementById("empresa")?.value || "";
    const nombre = document.getElementById("representante")?.value || "";
    const lista = contratistas[empresa] || [];

    const encontrado = lista.find(persona => {
        const nombrePersona = typeof persona === "string" ? persona : (persona.nombre || "");
        return nombrePersona === nombre;
    });

    if (!encontrado) {
        representanteSeleccionado = null;
    } else if (typeof encontrado === "string") {
        representanteSeleccionado = { nombre: encontrado, firma: "", usarFirma: false };
    } else {
        representanteSeleccionado = encontrado;
    }
}

function cambiarTecnico() {
    const id = document.getElementById("tecnico")?.value || "";
    tecnicoSeleccionado = tecnicos.find(t => t.id === id) || null;

    const areaTecnico = document.getElementById("areaTecnico");
    if (areaTecnico) {
        areaTecnico.value = tecnicoSeleccionado?.area || "";
    }

    // La Unidad Solicitante es el área a la que pertenece el técnico elegido.
    // Si no hay técnico seleccionado, se usa la unidad solicitante global de Administración.
    const unidad = document.getElementById("unidad");
    if (unidad) {
        const config = window.__configuracionActual || {};
        unidad.value = tecnicoSeleccionado?.area || config.unidadSolicitante || "";
    }
}

function leerArchivoComoDataUrl(archivo) {
    return new Promise((resolve, reject) => {
        const lector = new FileReader();
        lector.onload = () => resolve(lector.result);
        lector.onerror = () => reject(new Error("No se pudo leer la imagen adjunta"));
        lector.readAsDataURL(archivo);
    });
}

async function generarActa() {
    const datosConfig = window.__configuracionActual || {};
    const firmantePOConfig = datosConfig.firmantePOJefe || {};
    const tecnicoActual = tecnicoSeleccionado || {};
    const representanteActual = representanteSeleccionado || {};

    let imagenAdjunta = "";
    const archivoImagen = document.getElementById("imagenAdjunta")?.files[0] || null;

    if (archivoImagen) {
        const TAMANO_MAXIMO = 4 * 1024 * 1024; // 4 MB
        if (archivoImagen.size > TAMANO_MAXIMO) {
            alert("La imagen adjunta no puede superar los 4 MB. Elige una imagen más ligera.");
            return;
        }

        try {
            imagenAdjunta = await leerArchivoComoDataUrl(archivoImagen);
        } catch (error) {
            alert(error.message);
            return;
        }
    }

    const datos = {
        fecha: document.getElementById("fecha")?.value || "",
        fechaInicio: document.getElementById("fechaInicio")?.value || "",
        fechaFin: document.getElementById("fechaFin")?.value || "",
        lcl: document.getElementById("lcl")?.value || "",
        subestacion: document.getElementById("subestacion")?.value || "",
        parque: obtenerSeleccionMultiple("parque"),
        posicion: obtenerSeleccionMultiple("posicion"),
        linea: document.getElementById("linea")?.value || "",
        soporte: document.getElementById("soporte")?.value || "",
        apertura: document.getElementById("apertura")?.value || "",
        empresa: document.getElementById("empresa")?.value || "",
        representante: document.getElementById("representante")?.value || "",
        representanteFirma: representanteActual.firma || "",
        representanteUsarFirma: !!representanteActual.usarFirma,
        tecnico: tecnicoActual.nombre || "",
        tecnicoFirma: tecnicoActual.firma || "",
        tecnicoUsarFirma: !!tecnicoActual.usarFirma,
        tecnicoArea: tecnicoActual.area || "",
        jefeInstalacion: document.getElementById("jefeInstalacion")?.value || "",
        unidad: document.getElementById("unidad")?.value || "",
        trabajo: document.getElementById("trabajo")?.value || "",
        textoContratista: document.getElementById("textoContratista")?.value || "",
        descripcion: document.getElementById("descripcion")?.value || "",
        textoJI: document.getElementById("textoJI")?.value || "",
        firmantePOJefeNombre: firmantePOConfig.nombre || "",
        firmantePOJefeFirma: firmantePOConfig.firma || "",
        firmantePOJefeUsarFirma: !!firmantePOConfig.usarFirma,
        imagenAdjunta
    };

    localStorage.setItem("actaCero", JSON.stringify(datos));
    window.open("/acta.html", "_blank");
}
