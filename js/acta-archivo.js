// Utilidades compartidas entre index.html y acta.html para:
//  - Guardar el acta actual como archivo .json en el ordenador (con selector
//    de carpeta nativo cuando el navegador lo soporta).
//  - Abrir un archivo .json de una acta guardada previamente.
//  - Convertir una imagen de firma guardada en el servidor (ruta relativa,
//    solo válida en ESTE ordenador) a una imagen autocontenida en base64,
//    para que el archivo funcione igual en el ordenador de otra persona.
//  - Formatear la fecha/hora de una firma para mostrarla en el acta.

const VERSION_FORMATO_ACTA = 1;

function sugerirNombreArchivoActa(datos) {
    const limpiar = (texto) => String(texto).trim().replace(/[\\/:*?"<>|]+/g, "-");
    const partes = ["Acta"];

    if (datos.lcl) partes.push(limpiar(datos.lcl));
    if (datos.fecha) partes.push(datos.fecha);

    return `${partes.filter(Boolean).join("_") || "Acta"}.json`;
}

async function descargarActaComoArchivo(datos, nombreSugerido) {
    const contenido = JSON.stringify({ version: VERSION_FORMATO_ACTA, ...datos }, null, 2);

    if (window.showSaveFilePicker) {
        try {
            const manejador = await window.showSaveFilePicker({
                suggestedName: nombreSugerido,
                types: [{
                    description: "Archivo de Acta Cero",
                    accept: { "application/json": [".json"] }
                }]
            });
            const flujo = await manejador.createWritable();
            await flujo.write(contenido);
            await flujo.close();
            return true;
        } catch (error) {
            if (error && error.name === "AbortError") return false; // el usuario canceló el diálogo
            console.warn("No se pudo usar el selector de guardado nativo, se usa la descarga estándar:", error);
        }
    }

    // Alternativa para navegadores sin File System Access API (Firefox, Safari...)
    const blob = new Blob([contenido], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = nombreSugerido;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    URL.revokeObjectURL(url);
    return true;
}

function leerArchivoActaComoJSON(archivo) {
    return new Promise((resolve, reject) => {
        const lector = new FileReader();
        lector.onload = () => {
            try {
                resolve(JSON.parse(lector.result));
            } catch (error) {
                reject(new Error("El archivo no es una acta válida (formato no reconocido)."));
            }
        };
        lector.onerror = () => reject(new Error("No se pudo leer el archivo."));
        lector.readAsText(archivo);
    });
}

async function convertirRutaEnDataUrl(ruta) {
    const respuesta = await fetch(ruta);
    if (!respuesta.ok) throw new Error("No se pudo cargar la imagen de firma guardada.");
    const blob = await respuesta.blob();
    return new Promise((resolve, reject) => {
        const lector = new FileReader();
        lector.onload = () => resolve(lector.result);
        lector.onerror = () => reject(new Error("No se pudo procesar la imagen de firma guardada."));
        lector.readAsDataURL(blob);
    });
}

function formatearFechaHoraFirma(iso) {
    if (!iso) return "";
    try {
        return new Date(iso).toLocaleString("es-ES", {
            day: "2-digit", month: "2-digit", year: "numeric",
            hour: "2-digit", minute: "2-digit"
        });
    } catch (error) {
        return "";
    }
}
