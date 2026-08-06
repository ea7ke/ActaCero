let subestaciones = {};
let contratistas = {};

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

        const tecnico = document.getElementById("tecnico");
        const unidad = document.getElementById("unidad");
        const jefeInstalacion = document.getElementById("jefeInstalacion");

        if (tecnico) tecnico.value = config.tecnicoSolicitante || "";
        if (unidad) unidad.value = config.unidadSolicitante || "";
        if (jefeInstalacion) jefeInstalacion.value = config.jefeInstalacion || "";

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

        cargarSubestaciones();
        cargarEmpresas();
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

function generarActa() {
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
        tecnico: document.getElementById("tecnico")?.value || "",
        jefeInstalacion: document.getElementById("jefeInstalacion")?.value || "",
        unidad: document.getElementById("unidad")?.value || "",
        trabajo: document.getElementById("trabajo")?.value || "",
        textoContratista: document.getElementById("textoContratista")?.value || "",
        descripcion: document.getElementById("descripcion")?.value || "",
        textoJI: document.getElementById("textoJI")?.value || ""
    };

    localStorage.setItem("actaCero", JSON.stringify(datos));
    window.open("/acta.html", "_blank");
}
