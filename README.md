# Acta Cero

Aplicación web local para confeccionar el **Acta de Reunión Previa para la Planificación de Trabajos en Subestaciones y LAT**. Funciona en modo local: un pequeño servidor en Python sirve el formulario, guarda los datos maestros (subestaciones, contratistas, técnicos...) y genera el acta lista para imprimir o guardar en PDF.

No requiere conexión a internet ni instalación en un servidor externo: se ejecuta en el propio ordenador.

---

## 1. Requisitos

- **Python 3** instalado en el equipo.
- Las siguientes librerías de Python (recogidas en `requirements.txt`):
  - `flask`
  - `flask-cors`

### Instalación de dependencias

Abre una terminal (CMD/PowerShell en Windows, o Terminal en Mac/Linux) dentro de la carpeta del proyecto y ejecuta:

```bash
pip install -r requirements.txt
```

> En Windows no hace falta hacer esto a mano: el propio `ejecutar_acta.bat` instala las dependencias solo la primera vez que se usa.

---

## 2. Instalación rápida en Windows (recomendada para compañeros)

Si no eres la persona que va a tocar el código, esta es la forma más sencilla de tener Acta Cero funcionando:

1. Descarga y descomprime el `.zip` del proyecto en cualquier sitio (Descargas, Escritorio... da igual, es un paso intermedio).
2. Asegúrate de tener **Python** instalado. Si no lo tienes, descárgalo de [python.org/downloads](https://www.python.org/downloads/) e instálalo marcando la casilla **"Add python.exe to PATH"** durante la instalación.
3. Haz doble clic en **`ejecutar_acta.bat`**. La primera vez, esto instala la aplicación de verdad en tu carpeta de usuario (`C:\Users\<tu_usuario>\.ACERO`), crea el icono **"Acta Cero"** en tu Escritorio, y arranca el programa automáticamente. Ya puedes borrar la carpeta descomprimida del paso 1 si quieres — la copia que cuenta a partir de ahora es la de `.ACERO`.
4. A partir de ahora, usa siempre el icono **"Acta Cero"** del Escritorio para abrir la aplicación. El servidor arranca en segundo plano (sin mostrar ninguna ventana) y el navegador se abre solo con el formulario.
5. Para detener el servidor, ejecuta **`detener_acta.bat`** (dentro de `.ACERO`) — no es obligatorio, ver más abajo.

> Si más adelante recibes una versión más nueva del programa, repite el paso 3 con el `.zip` nuevo: `ejecutar_acta.bat` se dará cuenta de que ya estabas instalado, actualizará los archivos del programa en `.ACERO` y **no tocará** tu configuración (técnicos, subestaciones, contratistas, firmas guardadas...), que vive aparte.

| Archivo | Para qué sirve |
|---|---|
| `ejecutar_acta.bat` | Punto de entrada único. La primera vez instala la app en `.ACERO` y crea el acceso directo; el resto de veces, simplemente la arranca. |
| `detener_acta.bat` | Detiene el servidor cuando se termina de usar. |
| `crear_acceso_directo.bat` | Ya no hace falta usarlo a mano — `ejecutar_acta.bat` crea el acceso directo solo. Se deja por si algún día hay que recrearlo manualmente (por ejemplo, si alguien borra el icono del Escritorio sin querer). |

> El servidor arranca con `pythonw`/`pyw` (las versiones de Python "sin consola"), así que no aparece ninguna ventana mientras funciona. `detener_acta.bat` sabe qué proceso parar porque `server.py` guarda su identificador de proceso en `acta_cero.pid` al arrancar.

---

## 3. Puesta en marcha manual (para desarrollo)

1. Descarga o clona el proyecto desde GitHub.
2. Abre una terminal en la carpeta del proyecto (donde está `server.py`).
3. Arranca el servidor:

   ```bash
   python server.py
   ```

4. Verás que el servidor queda escuchando en:

   ```
   http://127.0.0.1:8000
   ```

5. Abre esa dirección en el navegador (Chrome o Edge recomendado). Ahí aparecerá el formulario del acta.

Para **detener** el servidor, vuelve a la terminal donde lo lanzaste y pulsa `Ctrl + C`.

> La primera vez que se arranca, el propio servidor crea automáticamente una carpeta `datos/` con los ficheros donde se guarda toda la configuración (subestaciones, contratistas, técnicos, etc.), así que no hay que crear nada a mano.

---

## 4. Estructura del proyecto

```
ActaCero/
├── server.py                 → Servidor local (Flask). Sirve las páginas y la API de datos.
├── requirements.txt           → Dependencias de Python del proyecto.
├── ejecutar_acta.bat           → (Windows) Arranca el servidor y abre el navegador.
├── detener_acta.bat            → (Windows) Detiene el servidor.
├── crear_acceso_directo.bat    → (Windows) Crea el icono de acceso directo en el Escritorio.
├── index.html                 → Formulario principal para rellenar un acta.
├── acta.html                   → Vista del acta ya generada, lista para imprimir/PDF.
├── admin.html                  → Panel de administración (configuración, técnicos, subestaciones, contratistas).
├── css/                        → Hojas de estilo.
├── js/                         → Lógica del formulario y del panel de administración.
├── img/                        → Logo y firmas (incluye img/firmas/, donde se guardan las firmas subidas o dibujadas con lápiz).
├── datos/                      → Se crea sola al arrancar. Guarda la configuración en ficheros .json:
│   ├── configuracion.json
│   ├── subestaciones.json
│   ├── contratistas.json
│   └── tecnicos.json
└── acta_cero.pid                → Se crea sola al arrancar el servidor. Identificador del proceso, usado por detener_acta.bat.
```

---

## 5. Cómo funciona (uso diario)

### 5.1. Rellenar un acta

1. Con el servidor en marcha, entra en `http://127.0.0.1:8000`.
2. Rellena los datos del formulario: fecha, Nº LCL/OT/PLAN, subestación, parque, posición, línea, empresa contratista, técnico, descripción del trabajo, etc.
   - El **Nº LCL/OT/PLAN** que se introduce aparece automáticamente en las dos hojas del acta.
   - Al elegir una **subestación**, las listas de **parque** y **posición** se rellenan solas con lo que haya en el panel de administración. En ambas se puede marcar **más de una casilla**, por si el trabajo afecta a varios parques o posiciones a la vez.
   - Al elegir la **empresa contratista**, se rellenan los representantes disponibles (con su firma, si la tienen configurada).
   - Al elegir el **técnico**, se autocompletan su área/departamento (que también se usa como "Unidad Solicitante") y el resto de datos vinculados.
3. Pulsa **"Vista previa Acta"**. Esto abre `acta.html` con el acta ya maquetada con los datos introducidos.
4. En esa vista, el botón **"Generar PDF"** abre el diálogo de impresión del navegador. Ahí se puede elegir "Guardar como PDF" o enviarla a una impresora física.

> Si alguno de los tres bloques de texto (Unidad Solicitante / Empresa Contratista / Jefe de Instalación) se deja vacío, el acta se imprime igualmente pero con líneas guía para rellenar ese bloque a mano.

### 5.2. Panel de administración

Accesible desde el botón **"Administración"** del formulario, o directamente en `http://127.0.0.1:8000/admin.html`.

Desde aquí se gestiona todo lo que luego aparece como opción en el formulario principal:

- **Configuración general**: unidad solicitante por defecto, nombre y firma del Jefe de Instalación, nombre y firma del firmante P.O. (este último se muestra también en el formulario principal, como referencia).
- **Técnicos solicitantes**: alta/baja de técnicos, su área y su firma.
- **Subestaciones**: alta/baja de subestaciones, y dentro de cada una, sus parques y posiciones.
- **Contratistas**: alta/baja de empresas contratistas y de sus representantes (nombre, firma y opción de editarlos después de creados).

Todos estos cambios se guardan automáticamente en los ficheros `.json` de la carpeta `datos/`, así que persisten entre reinicios del servidor.

### 5.3. Firmas

Para el Jefe de Instalación, el firmante P.O., cada técnico y cada representante de contratista, la firma se puede indicar de tres formas desde el panel de administración:

- Escribiendo a mano la ruta de una imagen ya existente (ej: `img/firma-juan.png`).
- Pulsando **"Subir imagen"**, para elegir un archivo PNG/JPG desde el propio equipo.
- Pulsando **"Firmar con lápiz"**, que abre un lienzo para firmar con el dedo, ratón o lápiz óptico (útil en pantallas táctiles) y genera una imagen con fondo transparente.

En cualquiera de los tres casos, hay que marcar la casilla **"Usar firma automática"** para que esa firma se inserte como imagen en el acta; si no, se deja el hueco en blanco con una línea para firmar a mano.

---

## 6. Seguridad: acceso solo desde este ordenador

Acta Cero está pensado para usarse en local, no como servicio compartido en red. Por eso el servidor está configurado con dos barreras independientes para que **solo el propio ordenador** pueda usarlo, aunque esté conectado a una red local o a internet:

1. El servidor arranca escuchando únicamente en `127.0.0.1` (la propia máquina), no en la IP de red del equipo — a nivel de sistema operativo, otro ordenador de la red no puede ni abrir la conexión.
2. Como segunda barrera, el propio servidor rechaza con un error `403` cualquier petición cuya IP de origen no sea `127.0.0.1`/`::1`, por si en el futuro alguien cambia la configuración de arranque sin darse cuenta de la implicación.

No hace falta hacer nada para beneficiarse de esto: viene así de fábrica.

---

## 7. Notas para quien vaya a tocar el código

- El servidor expone una pequeña API REST bajo `/api/...` (configuración, subestaciones, contratistas, técnicos, subida de firmas) que consumen `js/app.js` y `js/admin.js`.
- El paso de datos del formulario (`index.html`) a la vista del acta (`acta.html`) se hace a través de `localStorage` del navegador, no por la API — por eso `acta.html` solo funciona si se navega desde el propio formulario (o si `localStorage` ya tiene datos previos).
- Los estilos de impresión del acta están en `css/acta.css`, usando `@media print` para controlar cómo queda al generar el PDF.
- `parque` y `posicion` viajan como texto plano con los valores marcados separados por `", "` (ej. `"Parque Norte, Parque Sur"`), generado en `app.js` a partir de las casillas marcadas — no como una lista/array.
- El filtro de seguridad (`@app.before_request` en `server.py`) se aplica a **todas** las rutas, incluidas las estáticas; si algún día hace falta exponer el servidor en red (no recomendado), hay que revisar tanto ese filtro como el `host=` de `app.run()`.
- `escribir_pid()` en `server.py` guarda el PID del proceso en `acta_cero.pid` al arrancar; `ejecutar_acta.bat` lo usa para matar una instancia anterior antes de arrancar una nueva, y `detener_acta.bat` para pararla. Si se edita el arranque del servidor (por ejemplo, para añadir el *reloader* de Flask en modo debug), hay que revisar que el PID guardado siga siendo el del proceso que realmente escucha en el puerto.
