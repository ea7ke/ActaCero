let subestaciones = {};
let contratistas = {};
let tecnicos = [];
let tecnicoSeleccionado = null;
let representanteSeleccionado = null;
let firmantesPO = [];
let firmantePOSeleccionado = null;

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

        const jefeInstalacion = document.getElementById("jefeInstalacion");
        const jefeConfig = config.jefeInstalacion || {};

        if (jefeInstalacion) jefeInstalacion.value = jefeConfig.nombre || "";

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

        const firmantesPORes = await fetch("/api/firmantespo");
        if (!firmantesPORes.ok) {
            throw new Error(`Firmantes P.O.: HTTP ${firmantesPORes.status}`);
        }
        firmantesPO = await firmantesPORes.json();

        cargarSubestaciones();
        cargarEmpresas();
        cargarTecnicos();
        cargarFirmantesPO();
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

    // Un firmante P.O. también puede ser el solicitante de un trabajo, así que
    // aparece igualmente en este desplegable, sin necesidad de duplicarlo
    // como técnico. El prefijo del value ("t:"/"f:") indica de qué lista viene,
    // para poder localizarlo correctamente al seleccionarlo.
    const opciones = [
        ...tecnicos.map(t => ({ valor: `t:${t.id}`, nombre: t.nombre || "" })),
        ...firmantesPO.map(f => ({ valor: `f:${f.id}`, nombre: f.nombre || "" }))
    ].sort((a, b) => a.nombre.localeCompare(b.nombre));

    opciones.forEach(op => {
        const option = document.createElement("option");
        option.value = op.valor;
        option.textContent = op.nombre;
        cboTecnico.appendChild(option);
    });
}

function cargarFirmantesPO() {
    const cboFirmantePO = document.getElementById("firmantePO");
    if (!cboFirmantePO) return;

    cboFirmantePO.innerHTML = '<option value="">Seleccione...</option>';

    firmantesPO
        .slice()
        .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""))
        .forEach(f => {
            const option = document.createElement("option");
            option.value = f.id;
            option.textContent = f.nombre;
            cboFirmantePO.appendChild(option);
        });
}

function cambiarFirmantePO() {
    const id = document.getElementById("firmantePO")?.value || "";
    firmantePOSeleccionado = firmantesPO.find(f => f.id === id) || null;
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
    const valor = document.getElementById("tecnico")?.value || "";
    const [origen, id] = valor.includes(":") ? valor.split(":") : ["", valor];

    if (origen === "f") {
        // Es un firmante P.O. actuando como solicitante: sí tiene área y
        // correo propios en su ficha (a diferencia de antes), así que viajan.
        const firmante = firmantesPO.find(f => f.id === id) || null;
        tecnicoSeleccionado = firmante
            ? { id: firmante.id, nombre: firmante.nombre, firma: firmante.firma, usarFirma: firmante.usarFirma, area: firmante.area || "", correo: firmante.correo || "" }
            : null;
    } else {
        tecnicoSeleccionado = tecnicos.find(t => t.id === id) || null;
    }

    const areaTecnico = document.getElementById("areaTecnico");
    if (areaTecnico) {
        areaTecnico.value = tecnicoSeleccionado?.area || "";
    }

    // La Unidad Solicitante es el área a la que pertenece el técnico elegido.
    const unidad = document.getElementById("unidad");
    if (unidad) {
        unidad.value = tecnicoSeleccionado?.area || "";
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

function blobComoDataUrl(blob) {
    return new Promise((resolve, reject) => {
        const lector = new FileReader();
        lector.onload = () => resolve(lector.result);
        lector.onerror = () => reject(new Error("No se pudo procesar la imagen comprimida"));
        lector.readAsDataURL(blob);
    });
}

function dibujarComoJpeg(bitmap, ancho, alto, calidad) {
    const canvas = document.createElement("canvas");
    canvas.width = ancho;
    canvas.height = alto;

    const ctx = canvas.getContext("2d");
    // Fondo blanco: si la imagen original tenía transparencia (ej. un PNG),
    // al pasar a JPEG (que no admite transparencia) se rellena en blanco en
    // vez de quedar en negro.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, ancho, alto);
    ctx.drawImage(bitmap, 0, 0, ancho, alto);

    return new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", calidad));
}

async function comprimirImagenSiHaceFalta(archivo) {
    if (archivo.size <= TAMANO_MAXIMO_IMAGEN) {
        return leerArchivoComoDataUrl(archivo);
    }

    let bitmap;
    try {
        bitmap = await createImageBitmap(archivo);
    } catch (error) {
        // Si el navegador no puede procesarla (formato raro, etc.), se deja
        // tal cual y que decida el aviso de tamaño de más abajo.
        return leerArchivoComoDataUrl(archivo);
    }

    let ancho = bitmap.width;
    let alto = bitmap.height;
    let calidad = 0.85;
    let blob = null;

    // Baja primero la calidad JPEG; si con la mínima calidad razonable sigue
    // pesando de más, también reduce la resolución, hasta 10 intentos.
    for (let intento = 0; intento < 10; intento++) {
        blob = await dibujarComoJpeg(bitmap, ancho, alto, calidad);

        if (blob.size <= TAMANO_MAXIMO_IMAGEN) break;

        if (calidad > 0.4) {
            calidad -= 0.1;
        } else {
            ancho = Math.round(ancho * 0.8);
            alto = Math.round(alto * 0.8);
        }
    }

    return blobComoDataUrl(blob);
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

    const comprimidas = [];

    for (const archivo of archivos) {
        try {
            const pesabaDeMas = archivo.size > TAMANO_MAXIMO_IMAGEN;
            const dataUrl = await comprimirImagenSiHaceFalta(archivo);
            imagenesAdjuntasDatos.push({ dataUrl });

            if (pesabaDeMas) {
                comprimidas.push(archivo.name);
            }
        } catch (error) {
            alert(`No se pudo procesar "${archivo.name}": ${error.message}`);
        }
    }

    if (comprimidas.length) {
        alert(
            `Se ha reducido automáticamente el tamaño de: ${comprimidas.join(", ")} ` +
            `(pesaban más de 4 MB). El resto de imágenes se han añadido tal cual.`
        );
    }

    renderizarImagenesAdjuntas();
}

async function construirDatosActa() {
    const tecnicoActual = tecnicoSeleccionado || {};
    const representanteActual = representanteSeleccionado || {};
    const firmantePOActual = firmantePOSeleccionado || {};

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
        tecnicoCorreo: tecnicoActual.correo || "",
        jefeInstalacion: document.getElementById("jefeInstalacion")?.value || "",
        unidad: document.getElementById("unidad")?.value || "",
        trabajo: document.getElementById("trabajo")?.value || "",
        textoContratista: document.getElementById("textoContratista")?.value || "",
        descripcion: document.getElementById("descripcion")?.value || "",
        textoJI: document.getElementById("textoJI")?.value || "",
        firmantePOJefeNombre: firmantePOActual.nombre || "",
        firmantePOJefeFirma: firmantePOActual.firma || "",
        firmantePOJefeUsarFirma: !!firmantePOActual.usarFirma,
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

    // Técnico: se busca por nombre, primero entre los técnicos y si no entre
    // los firmantes P.O. (que también pueden ser solicitantes). El formulario
    // lo selecciona por el value con prefijo "t:"/"f:".
    const tecnicoEncontrado = tecnicos.find(t => t.nombre === datos.tecnico);
    const firmanteComoSolicitante = !tecnicoEncontrado
        ? firmantesPO.find(f => f.nombre === datos.tecnico)
        : null;

    const cboTecnico = document.getElementById("tecnico");
    if (cboTecnico) {
        if (tecnicoEncontrado) {
            cboTecnico.value = `t:${tecnicoEncontrado.id}`;
        } else if (firmanteComoSolicitante) {
            cboTecnico.value = `f:${firmanteComoSolicitante.id}`;
        } else {
            cboTecnico.value = "";
        }
        cambiarTecnico();
    }

    // Firmante P.O.: igual que el técnico, se busca por nombre.
    const firmantePOEncontrado = firmantesPO.find(f => f.nombre === datos.firmantePOJefeNombre);
    const cboFirmantePO = document.getElementById("firmantePO");
    if (cboFirmantePO) {
        cboFirmantePO.value = firmantePOEncontrado ? firmantePOEncontrado.id : "";
        cambiarFirmantePO();
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
