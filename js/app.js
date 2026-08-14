let subestaciones = {};
let contratistas = {};
let tecnicos = [];
let tecnicoSeleccionado = null;

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
        const jefeConfig = config.jefeInstalacion || {};

        if (unidad) unidad.value = config.unidadSolicitante || "";
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

function cambiarSubestacion() {
    const sub = document.getElementById("subestacion")?.value || "";
    const parques = document.getElementById("parque");
    const posiciones = document.getElementById("posicion");

    if (!parques || !posiciones) return;

    parques.innerHTML = '<option value=""></option>';
    posiciones.innerHTML = '<option value=""></option>';

    if (!sub || !subestaciones[sub]) return;

    (subestaciones[sub].parques || []).forEach(p => {
        const option = document.createElement("option");
        option.value = p;
        option.textContent = p;
        parques.appendChild(option);
    });

    (subestaciones[sub].posiciones || []).forEach(p => {
        const option = document.createElement("option");
        option.value = p;
        option.textContent = p;
        posiciones.appendChild(option);
    });
}

function cambiarEmpresa() {
    const empresa = document.getElementById("empresa")?.value || "";
    const representante = document.getElementById("representante");

    if (!representante) return;

    representante.innerHTML = '<option value=""></option>';

    if (!empresa || !contratistas[empresa]) return;

    (contratistas[empresa] || []).forEach(persona => {
        const option = document.createElement("option");
        option.value = persona;
        option.textContent = persona;
        representante.appendChild(option);
    });
}

function cambiarTecnico() {
    const id = document.getElementById("tecnico")?.value || "";
    tecnicoSeleccionado = tecnicos.find(t => t.id === id) || null;

    const areaTecnico = document.getElementById("areaTecnico");
    if (areaTecnico) {
        areaTecnico.value = tecnicoSeleccionado?.area || "";
    }
}

function generarActa() {
    const datosConfig = window.__configuracionActual || {};
    const firmantePOConfig = datosConfig.firmantePOJefe || {};
    const tecnicoActual = tecnicoSeleccionado || {};

    const datos = {
        fecha: document.getElementById("fecha")?.value || "",
        fechaInicio: document.getElementById("fechaInicio")?.value || "",
        fechaFin: document.getElementById("fechaFin")?.value || "",
        lcl: document.getElementById("lcl")?.value || "",
        subestacion: document.getElementById("subestacion")?.value || "",
        parque: document.getElementById("parque")?.value || "",
        posicion: document.getElementById("posicion")?.value || "",
        linea: document.getElementById("linea")?.value || "",
        soporte: document.getElementById("soporte")?.value || "",
        apertura: document.getElementById("apertura")?.value || "",
        empresa: document.getElementById("empresa")?.value || "",
        representante: document.getElementById("representante")?.value || "",
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
        firmantePOJefeUsarFirma: !!firmantePOConfig.usarFirma
    };

    localStorage.setItem("actaCero", JSON.stringify(datos));
    window.open("/acta.html", "_blank");
}
