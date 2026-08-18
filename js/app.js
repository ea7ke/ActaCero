let subestaciones = {};
let contratistas = {};
let tecnicos = [];
let tecnicoSeleccionado = null;
let representanteSeleccionado = null;

// Firmas ya capturadas en una sesión anterior (al abrir un acta guardada
// que alguien ya empezó a firmar). Se reenvían tal cual al generar/guardar
// de nuevo, para no perderlas.
let firmasAplicadasCargadas = {};

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

const MAX_IMAGENES_ADJUNTAS = 8;
const TAMANO_MAXIMO_IMAGEN = 4 * 1024 * 1024; // 4 MB por imagen

// Lista de imágenes adjuntas actuales: [{ dataUrl }, ...]. Se va acumulando
// cada vez que se eligen archivos (no se sustituye lo ya añadido), y cada una
// se puede quitar individualmente.
let imagenesAdjuntasDatos = [];

function leerArchivoComoDataUrl(archivo) {
    return new Promise((resolve, reject) => {
        const lector = new FileReader();
        lector.onload = () => resolve(lector.result);
        lector.onerror = () => reject(new Error("No se pudo leer la imagen adjunta"));
        lector.readAsDataURL(archivo);
    });
}

function renderizarImagenesAdjuntas() {
    const contenedor = document.getElementById("imagenesAdjuntasLista");
    if (!contenedor) return;

    contenedor.innerHTML = imagenesAdjuntasDatos
        .map((item, indice) => `
            <div class="imagen-adjunta-item">
                <img src="${item.dataUrl}" alt="Imagen adjunta ${indice + 1}">
                <button type="button" class="imagen-adjunta-quitar" title="Quitar esta imagen" onclick="quitarImagenAdjunta(${indice})">×</button>
            </div>
        `)
        .join("");
}

function quitarImagenAdjunta(indice) {
    imagenesAdjuntasDatos.splice(indice, 1);
    renderizarImagenesAdjuntas();
}

async function agregarImagenesAdjuntas(inputFile) {
    const archivos = Array.from(inputFile.files || []);
    inputFile.value = ""; // permite volver a elegir el mismo archivo más adelante si hace falta

    if (!archivos.length) return;

    if (imagenesAdjuntasDatos.length + archivos.length > MAX_IMAGENES_ADJUNTAS) {
        alert(`Como máximo se pueden adjuntar ${MAX_IMAGENES_ADJUNTAS} imágenes.`);
        return;
    }

    for (const archivo of archivos) {
        if (archivo.size > TAMANO_MAXIMO_IMAGEN) {
            alert(`"${archivo.name}" supera los 4 MB y no se ha añadido. Elige una imagen más ligera.`);
            continue;
        }

        try {
            const dataUrl = await leerArchivoComoDataUrl(archivo);
            imagenesAdjuntasDatos.push({ dataUrl });
        } catch (error) {
            alert(error.message);
        }
    }

    renderizarImagenesAdjuntas();
}

async function construirDatosActa() {
    const datosConfig = window.__configuracionActual || {};
    const firmantePOConfig = datosConfig.firmantePOJefe || {};
    const tecnicoActual = tecnicoSeleccionado || {};
    const representanteActual = representanteSeleccionado || {};

    return {
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
        imagenesAdjuntas: imagenesAdjuntasDatos.map(item => item.dataUrl),
        // Firmas ya realizadas (dibujadas o reutilizadas) en cualquier ordenador,
        // cada una con su fecha y hora. Se conservan al volver a guardar/generar.
        firmas: firmasAplicadasCargadas || {}
    };
}

async function generarActa() {
    let datos;
    try {
        datos = await construirDatosActa();
    } catch (error) {
        alert(error.message);
        return;
    }

    localStorage.setItem("actaCero", JSON.stringify(datos));
    window.open("/acta.html", "_blank");
}

async function guardarActaArchivo() {
    let datos;
    try {
        datos = await construirDatosActa();
    } catch (error) {
        alert(error.message);
        return;
    }

    await descargarActaComoArchivo(datos, sugerirNombreArchivoActa(datos));
}

async function abrirActaArchivo(inputFile) {
    const archivo = inputFile.files[0];
    if (!archivo) return;

    try {
        const datos = await leerArchivoActaComoJSON(archivo);
        rellenarFormularioConActa(datos);
    } catch (error) {
        alert(error.message);
    } finally {
        inputFile.value = "";
    }
}

function marcarCasillasSegunTexto(contenedorId, textoGuardado) {
    if (!textoGuardado) return;

    const valores = textoGuardado.split(",").map(v => v.trim()).filter(Boolean);
    const contenedor = document.getElementById(contenedorId);
    if (!contenedor) return;

    contenedor.querySelectorAll("input[type=checkbox]").forEach(casilla => {
        casilla.checked = valores.includes(casilla.value);
    });
}

function rellenarFormularioConActa(datos) {
    const poner = (id, valor) => {
        const el = document.getElementById(id);
        if (el) el.value = valor || "";
    };

    poner("fecha", datos.fecha);
    poner("fechaInicio", datos.fechaInicio);
    poner("fechaFin", datos.fechaFin);
    poner("lcl", datos.lcl);
    poner("linea", datos.linea);
    poner("soporte", datos.soporte);
    poner("apertura", datos.apertura);
    poner("trabajo", datos.trabajo);
    poner("textoContratista", datos.textoContratista);
    poner("descripcion", datos.descripcion);
    poner("textoJI", datos.textoJI);

    // Subestación -> dispara el pintado de las casillas de parque/posición,
    // y luego marcamos las que estaban guardadas.
    poner("subestacion", datos.subestacion);
    cambiarSubestacion();
    marcarCasillasSegunTexto("parque", datos.parque);
    marcarCasillasSegunTexto("posicion", datos.posicion);

    // Empresa -> dispara el listado de representantes, y luego seleccionamos el guardado.
    poner("empresa", datos.empresa);
    cambiarEmpresa();
    poner("representante", datos.representante);
    cambiarRepresentante();

    // Técnico: se busca por nombre (el formulario lo selecciona por id interno).
    const tecnicoEncontrado = tecnicos.find(t => t.nombre === datos.tecnico);
    const cboTecnico = document.getElementById("tecnico");
    if (cboTecnico) {
        cboTecnico.value = tecnicoEncontrado ? tecnicoEncontrado.id : "";
        cambiarTecnico();
    }

    // Imágenes adjuntas: se restauran todas las que traiga el acta guardada.
    // Compatibilidad con archivos guardados antes de este cambio, que solo
    // tenían una imagen bajo el nombre "imagenAdjunta".
    const imagenesGuardadas = datos.imagenesAdjuntas && datos.imagenesAdjuntas.length
        ? datos.imagenesAdjuntas
        : (datos.imagenAdjunta ? [datos.imagenAdjunta] : []);

    imagenesAdjuntasDatos = imagenesGuardadas.map(dataUrl => ({ dataUrl }));
    renderizarImagenesAdjuntas();

    // Firmas ya realizadas por quien haya rellenado el acta antes: se guardan
    // para no perderlas, y se avisa de cuáles faltan.
    firmasAplicadasCargadas = datos.firmas || {};

    const yaFirmado = Object.keys(firmasAplicadasCargadas).filter(rol => firmasAplicadasCargadas[rol]);
    const nombresRol = { tecnico: "Técnico Solicitante", representante: "Representante Contrata", firmantePO: "P.O. Jefe Instalación" };
    const faltan = ["tecnico", "representante", "firmantePO"].filter(rol => !yaFirmado.includes(rol));

    alert(
        "Acta cargada correctamente." +
        (yaFirmado.length ? `\n\nYa firmado: ${yaFirmado.map(r => nombresRol[r]).join(", ")}.` : "") +
        (faltan.length ? `\nFalta por firmar: ${faltan.map(r => nombresRol[r]).join(", ")}.` : "")
    );
}
