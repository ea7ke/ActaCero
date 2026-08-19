from flask import Flask, jsonify, request, send_from_directory, abort
from flask_cors import CORS
import json
import os
import uuid
from urllib.parse import unquote

app = Flask(__name__, static_folder=".", static_url_path="")
CORS(app)

# Seguridad: aunque el servidor ya arranca escuchando solo en 127.0.0.1 (ver el
# app.run() al final del archivo), esta comprobación es una segunda barrera:
# rechaza cualquier peticion cuya IP de origen no sea la del propio ordenador,
# por si en el futuro alguien cambia el host de escucha sin darse cuenta de
# las implicaciones de seguridad.
IPS_PERMITIDAS = {"127.0.0.1", "::1"}


@app.before_request
def restringir_acceso_al_propio_ordenador():
    if request.remote_addr not in IPS_PERMITIDAS:
        abort(403)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "datos")

CONFIG_FILE = os.path.join(DATA_DIR, "configuracion.json")
SUBESTACIONES_FILE = os.path.join(DATA_DIR, "subestaciones.json")
CONTRATISTAS_FILE = os.path.join(DATA_DIR, "contratistas.json")
TECNICOS_FILE = os.path.join(DATA_DIR, "tecnicos.json")
FIRMANTESPO_FILE = os.path.join(DATA_DIR, "firmantespo.json")

FIRMAS_DIR = os.path.join(BASE_DIR, "img", "firmas")
EXTENSIONES_FIRMA_PERMITIDAS = {"png", "jpg", "jpeg"}
TAMANO_MAXIMO_FIRMA = 5 * 1024 * 1024  # 5 MB


def ensure_data_dir():
    os.makedirs(DATA_DIR, exist_ok=True)


def ensure_firmas_dir():
    os.makedirs(FIRMAS_DIR, exist_ok=True)


PID_FILE = os.path.join(BASE_DIR, "acta_cero.pid")


def escribir_pid():
    """Guarda el PID del proceso actual en un fichero, para que detener_acta.bat
    pueda localizar y cerrar el servidor aunque se ejecute sin ventana visible."""
    try:
        with open(PID_FILE, "w") as f:
            f.write(str(os.getpid()))
    except OSError:
        pass


def ensure_file(path, default_data):
    ensure_data_dir()
    if not os.path.exists(path):
        with open(path, "w", encoding="utf-8") as f:
            json.dump(default_data, f, ensure_ascii=False, indent=2)


def read_json(path, default=None):
    if default is None:
        default = {}

    if not os.path.exists(path):
        return default

    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def write_json(path, data):
    ensure_data_dir()
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def normalize_key(value):
    return unquote(str(value)).strip().upper()


def normalize_text(value):
    return unquote(str(value)).strip()


def normalizar_representantes(lista):
    """Convierte una lista de representantes al formato {nombre, firma, usarFirma}.
    Admite datos antiguos donde el representante era solo una cadena de texto."""
    normalizados = []

    if not isinstance(lista, list):
        return normalizados

    for item in lista:
        if isinstance(item, str):
            nombre = item.strip()
            if nombre:
                normalizados.append({"nombre": nombre, "firma": "", "usarFirma": False})
        elif isinstance(item, dict):
            nombre = str(item.get("nombre", "")).strip()
            if nombre:
                normalizados.append({
                    "nombre": nombre,
                    "firma": str(item.get("firma", "")).strip(),
                    "usarFirma": bool(item.get("usarFirma", False))
                })

    return normalizados


@app.route("/")
def root():
    return send_from_directory(BASE_DIR, "index.html")


@app.route("/admin")
@app.route("/admin.html")
def admin_page():
    return send_from_directory(BASE_DIR, "admin.html")


@app.route("/acta")
@app.route("/acta.html")
def acta_page():
    return send_from_directory(BASE_DIR, "acta.html")


# ---------------- CONFIGURACION ----------------

@app.route("/api/configuracion", methods=["GET"])
def get_configuracion():
    data = read_json(CONFIG_FILE, default={
        "jefeInstalacion": {
            "nombre": ""
        }
    })
    return jsonify(data)


@app.route("/api/configuracion", methods=["POST"])
def save_configuracion():
    data = request.get_json(silent=True) or {}

    jefe = data.get("jefeInstalacion", {}) or {}

    payload = {
        "jefeInstalacion": {
            "nombre": str(jefe.get("nombre", "")).strip()
        }
    }

    write_json(CONFIG_FILE, payload)
    return jsonify({"ok": True, "data": payload})


# ---------------- SUBESTACIONES ----------------

@app.route("/api/subestaciones", methods=["GET"])
def get_subestaciones():
    data = read_json(SUBESTACIONES_FILE, default={})
    return jsonify(data)


@app.route("/api/subestaciones", methods=["POST"])
def add_subestacion():
    data = request.get_json(silent=True) or {}
    nombre = normalize_key(data.get("nombre", ""))

    if not nombre:
        return jsonify({"ok": False, "error": "Nombre obligatorio"}), 400

    subestaciones = read_json(SUBESTACIONES_FILE, default={})

    if nombre in subestaciones:
        return jsonify({"ok": False, "error": "La subestación ya existe"}), 400

    parques = data.get("parques", [])
    posiciones = data.get("posiciones", [])

    if not isinstance(parques, list):
        parques = []

    if not isinstance(posiciones, list):
        posiciones = []

    subestaciones[nombre] = {
        "parques": [str(p).strip() for p in parques if str(p).strip()],
        "posiciones": [str(p).strip() for p in posiciones if str(p).strip()]
    }

    write_json(SUBESTACIONES_FILE, subestaciones)
    return jsonify({"ok": True})


@app.route("/api/subestaciones/<path:nombre>", methods=["PUT"])
def update_subestacion(nombre):
    nombre = normalize_key(nombre)
    data = request.get_json(silent=True) or {}
    subestaciones = read_json(SUBESTACIONES_FILE, default={})

    if nombre not in subestaciones:
        return jsonify({"ok": False, "error": "No existe la subestación"}), 404

    nuevo_nombre = normalize_key(data.get("nuevoNombre", nombre))
    if not nuevo_nombre:
        return jsonify({"ok": False, "error": "Nuevo nombre obligatorio"}), 400

    parques = data.get("parques", [])
    posiciones = data.get("posiciones", [])

    if not isinstance(parques, list):
        parques = []

    if not isinstance(posiciones, list):
        posiciones = []

    if nuevo_nombre != nombre:
        del subestaciones[nombre]

    subestaciones[nuevo_nombre] = {
        "parques": [str(p).strip() for p in parques if str(p).strip()],
        "posiciones": [str(p).strip() for p in posiciones if str(p).strip()]
    }

    write_json(SUBESTACIONES_FILE, subestaciones)
    return jsonify({"ok": True})


@app.route("/api/subestaciones/<path:nombre>", methods=["DELETE"])
def delete_subestacion(nombre):
    nombre = normalize_key(nombre)
    subestaciones = read_json(SUBESTACIONES_FILE, default={})

    if nombre not in subestaciones:
        return jsonify({"ok": False, "error": "No existe la subestación"}), 404

    del subestaciones[nombre]
    write_json(SUBESTACIONES_FILE, subestaciones)
    return jsonify({"ok": True})


@app.route("/api/subestaciones/<path:nombre>/parques", methods=["POST"])
def add_parque(nombre):
    nombre = normalize_key(nombre)
    data = request.get_json(silent=True) or {}
    parque = normalize_text(data.get("parque", ""))

    if not parque:
        return jsonify({"ok": False, "error": "Parque obligatorio"}), 400

    subestaciones = read_json(SUBESTACIONES_FILE, default={})

    if nombre not in subestaciones:
        return jsonify({"ok": False, "error": "No existe la subestación"}), 404

    subestaciones[nombre].setdefault("parques", [])
    if parque not in subestaciones[nombre]["parques"]:
        subestaciones[nombre]["parques"].append(parque)

    write_json(SUBESTACIONES_FILE, subestaciones)
    return jsonify({"ok": True})


@app.route("/api/subestaciones/<path:nombre>/parques/<path:parque>", methods=["PUT"])
def update_parque(nombre, parque):
    nombre = normalize_key(nombre)
    parque = normalize_text(parque)
    data = request.get_json(silent=True) or {}
    nuevo_valor = normalize_text(data.get("nuevoValor", ""))

    if not nuevo_valor:
        return jsonify({"ok": False, "error": "El nuevo nombre no puede estar vacío"}), 400

    subestaciones = read_json(SUBESTACIONES_FILE, default={})
    if nombre not in subestaciones:
        return jsonify({"ok": False, "error": "No existe la subestación"}), 404

    lista = subestaciones[nombre].setdefault("parques", [])
    if parque not in lista:
        return jsonify({"ok": False, "error": "No existe ese parque"}), 404

    if nuevo_valor != parque and nuevo_valor in lista:
        return jsonify({"ok": False, "error": "Ya existe un parque con ese nombre"}), 400

    lista[lista.index(parque)] = nuevo_valor
    write_json(SUBESTACIONES_FILE, subestaciones)
    return jsonify({"ok": True})


@app.route("/api/subestaciones/<path:nombre>/parques/<path:parque>", methods=["DELETE"])
def delete_parque(nombre, parque):
    nombre = normalize_key(nombre)
    parque = normalize_text(parque)

    subestaciones = read_json(SUBESTACIONES_FILE, default={})

    if nombre not in subestaciones:
        return jsonify({"ok": False, "error": "No existe la subestación"}), 404

    subestaciones[nombre].setdefault("parques", [])
    if parque in subestaciones[nombre]["parques"]:
        subestaciones[nombre]["parques"].remove(parque)

    write_json(SUBESTACIONES_FILE, subestaciones)
    return jsonify({"ok": True})


@app.route("/api/subestaciones/<path:nombre>/posiciones", methods=["POST"])
def add_posicion(nombre):
    nombre = normalize_key(nombre)
    data = request.get_json(silent=True) or {}
    posicion = normalize_text(data.get("posicion", ""))

    if not posicion:
        return jsonify({"ok": False, "error": "Posición obligatoria"}), 400

    subestaciones = read_json(SUBESTACIONES_FILE, default={})

    if nombre not in subestaciones:
        return jsonify({"ok": False, "error": "No existe la subestación"}), 404

    subestaciones[nombre].setdefault("posiciones", [])
    if posicion not in subestaciones[nombre]["posiciones"]:
        subestaciones[nombre]["posiciones"].append(posicion)

    write_json(SUBESTACIONES_FILE, subestaciones)
    return jsonify({"ok": True})


@app.route("/api/subestaciones/<path:nombre>/posiciones/<path:posicion>", methods=["PUT"])
def update_posicion(nombre, posicion):
    nombre = normalize_key(nombre)
    posicion = normalize_text(posicion)
    data = request.get_json(silent=True) or {}
    nuevo_valor = normalize_text(data.get("nuevoValor", ""))

    if not nuevo_valor:
        return jsonify({"ok": False, "error": "El nuevo nombre no puede estar vacío"}), 400

    subestaciones = read_json(SUBESTACIONES_FILE, default={})
    if nombre not in subestaciones:
        return jsonify({"ok": False, "error": "No existe la subestación"}), 404

    lista = subestaciones[nombre].setdefault("posiciones", [])
    if posicion not in lista:
        return jsonify({"ok": False, "error": "No existe esa posición"}), 404

    if nuevo_valor != posicion and nuevo_valor in lista:
        return jsonify({"ok": False, "error": "Ya existe una posición con ese nombre"}), 400

    lista[lista.index(posicion)] = nuevo_valor
    write_json(SUBESTACIONES_FILE, subestaciones)
    return jsonify({"ok": True})


@app.route("/api/subestaciones/<path:nombre>/posiciones/<path:posicion>", methods=["DELETE"])
def delete_posicion(nombre, posicion):
    nombre = normalize_key(nombre)
    posicion = normalize_text(posicion)

    subestaciones = read_json(SUBESTACIONES_FILE, default={})

    if nombre not in subestaciones:
        return jsonify({"ok": False, "error": "No existe la subestación"}), 404

    subestaciones[nombre].setdefault("posiciones", [])
    if posicion in subestaciones[nombre]["posiciones"]:
        subestaciones[nombre]["posiciones"].remove(posicion)

    write_json(SUBESTACIONES_FILE, subestaciones)
    return jsonify({"ok": True})


# ---------------- CONTRATISTAS ----------------

@app.route("/api/contratistas", methods=["GET"])
def get_contratistas():
    data = read_json(CONTRATISTAS_FILE, default={})
    data = {nombre: normalizar_representantes(reps) for nombre, reps in data.items()}
    return jsonify(data)


@app.route("/api/contratistas", methods=["POST"])
def add_contratista():
    data = request.get_json(silent=True) or {}
    nombre = normalize_key(data.get("nombre", ""))

    if not nombre:
        return jsonify({"ok": False, "error": "Nombre obligatorio"}), 400

    contratistas = read_json(CONTRATISTAS_FILE, default={})

    if nombre in contratistas:
        return jsonify({"ok": False, "error": "La contrata ya existe"}), 400

    representantes = data.get("representantes", [])
    if not isinstance(representantes, list):
        representantes = []

    contratistas[nombre] = [str(r).strip() for r in representantes if str(r).strip()]
    write_json(CONTRATISTAS_FILE, contratistas)
    return jsonify({"ok": True})


@app.route("/api/contratistas/<path:nombre>", methods=["PUT"])
def update_contratista(nombre):
    nombre = normalize_key(nombre)
    data = request.get_json(silent=True) or {}
    contratistas = read_json(CONTRATISTAS_FILE, default={})

    if nombre not in contratistas:
        return jsonify({"ok": False, "error": "No existe la contrata"}), 404

    nuevo_nombre = normalize_key(data.get("nuevoNombre", nombre))
    if not nuevo_nombre:
        return jsonify({"ok": False, "error": "Nuevo nombre obligatorio"}), 400

    representantes = data.get("representantes", [])
    representantes = normalizar_representantes(representantes)

    if nuevo_nombre != nombre:
        del contratistas[nombre]

    contratistas[nuevo_nombre] = representantes
    write_json(CONTRATISTAS_FILE, contratistas)
    return jsonify({"ok": True})


@app.route("/api/contratistas/<path:nombre>", methods=["DELETE"])
def delete_contratista(nombre):
    nombre = normalize_key(nombre)
    contratistas = read_json(CONTRATISTAS_FILE, default={})

    if nombre not in contratistas:
        return jsonify({"ok": False, "error": "No existe la contrata"}), 404

    del contratistas[nombre]
    write_json(CONTRATISTAS_FILE, contratistas)
    return jsonify({"ok": True})


@app.route("/api/contratistas/<path:nombre>/representantes", methods=["POST"])
def add_representante(nombre):
    nombre = normalize_key(nombre)
    data = request.get_json(silent=True) or {}
    representante = normalize_text(data.get("representante", ""))

    if not representante:
        return jsonify({"ok": False, "error": "Representante obligatorio"}), 400

    contratistas = read_json(CONTRATISTAS_FILE, default={})

    if nombre not in contratistas:
        return jsonify({"ok": False, "error": "No existe la contrata"}), 404

    lista = normalizar_representantes(contratistas[nombre])

    if any(r["nombre"] == representante for r in lista):
        return jsonify({"ok": False, "error": "Ese representante ya existe"}), 400

    lista.append({
        "nombre": representante,
        "firma": str(data.get("firma", "")).strip(),
        "usarFirma": bool(data.get("usarFirma", False))
    })

    contratistas[nombre] = lista
    write_json(CONTRATISTAS_FILE, contratistas)
    return jsonify({"ok": True})


@app.route("/api/contratistas/<path:nombre>/representantes/<path:representante>", methods=["PUT"])
def update_representante(nombre, representante):
    nombre = normalize_key(nombre)
    representante = normalize_text(representante)
    data = request.get_json(silent=True) or {}

    contratistas = read_json(CONTRATISTAS_FILE, default={})
    if nombre not in contratistas:
        return jsonify({"ok": False, "error": "No existe la contrata"}), 404

    lista = normalizar_representantes(contratistas[nombre])
    indice = next((i for i, r in enumerate(lista) if r["nombre"] == representante), None)

    if indice is None:
        return jsonify({"ok": False, "error": "No existe el representante"}), 404

    nuevo_nombre = normalize_text(data.get("nuevoNombre", representante))
    if not nuevo_nombre:
        return jsonify({"ok": False, "error": "Nombre obligatorio"}), 400

    if nuevo_nombre != representante and any(r["nombre"] == nuevo_nombre for r in lista):
        return jsonify({"ok": False, "error": "Ya existe un representante con ese nombre"}), 400

    lista[indice] = {
        "nombre": nuevo_nombre,
        "firma": str(data.get("firma", "")).strip(),
        "usarFirma": bool(data.get("usarFirma", False))
    }

    contratistas[nombre] = lista
    write_json(CONTRATISTAS_FILE, contratistas)
    return jsonify({"ok": True})


@app.route("/api/contratistas/<path:nombre>/representantes/<path:representante>", methods=["DELETE"])
def delete_representante(nombre, representante):
    nombre = normalize_key(nombre)
    representante = normalize_text(representante)

    contratistas = read_json(CONTRATISTAS_FILE, default={})

    if nombre not in contratistas:
        return jsonify({"ok": False, "error": "No existe la contrata"}), 404

    lista = normalizar_representantes(contratistas[nombre])
    nueva_lista = [r for r in lista if r["nombre"] != representante]

    contratistas[nombre] = nueva_lista
    write_json(CONTRATISTAS_FILE, contratistas)
    return jsonify({"ok": True})


# ---------------- TECNICOS ----------------

@app.route("/api/tecnicos", methods=["GET"])
def get_tecnicos():
    data = read_json(TECNICOS_FILE, default=[])
    return jsonify(data)


@app.route("/api/tecnicos", methods=["POST"])
def add_tecnico():
    data = request.get_json(silent=True) or {}
    tecnicos = read_json(TECNICOS_FILE, default=[])

    nuevo = {
        "id": str(data.get("id", "")).strip(),
        "nombre": str(data.get("nombre", "")).strip(),
        "firma": str(data.get("firma", "")).strip(),
        "usarFirma": bool(data.get("usarFirma", False)),
        "area": str(data.get("area", "")).strip(),
        "correo": str(data.get("correo", "")).strip()
    }

    if not nuevo["id"] or not nuevo["nombre"]:
        return jsonify({"ok": False, "error": "ID y nombre obligatorios"}), 400

    if any(t.get("id") == nuevo["id"] for t in tecnicos):
        return jsonify({"ok": False, "error": "Ya existe un técnico con ese ID"}), 400

    tecnicos.append(nuevo)
    write_json(TECNICOS_FILE, tecnicos)
    return jsonify({"ok": True})


@app.route("/api/tecnicos/<path:tecnico_id>", methods=["PUT"])
def update_tecnico(tecnico_id):
    tecnico_id = normalize_text(tecnico_id)
    data = request.get_json(silent=True) or {}
    tecnicos = read_json(TECNICOS_FILE, default=[])

    index = next((i for i, t in enumerate(tecnicos) if t.get("id") == tecnico_id), None)
    if index is None:
        return jsonify({"ok": False, "error": "No existe el técnico"}), 404

    tecnicos[index] = {
        "id": tecnico_id,
        "nombre": str(data.get("nombre", "")).strip(),
        "firma": str(data.get("firma", "")).strip(),
        "usarFirma": bool(data.get("usarFirma", False)),
        "area": str(data.get("area", "")).strip(),
        "correo": str(data.get("correo", "")).strip()
    }

    write_json(TECNICOS_FILE, tecnicos)
    return jsonify({"ok": True})


@app.route("/api/tecnicos/<path:tecnico_id>", methods=["DELETE"])
def delete_tecnico(tecnico_id):
    tecnico_id = normalize_text(tecnico_id)
    tecnicos = read_json(TECNICOS_FILE, default=[])

    nuevos = [t for t in tecnicos if t.get("id") != tecnico_id]

    if len(nuevos) == len(tecnicos):
        return jsonify({"ok": False, "error": "No existe el técnico"}), 404

    write_json(TECNICOS_FILE, nuevos)
    return jsonify({"ok": True})


# ---------------- FIRMANTES P.O. ----------------

def slugificar(texto):
    resultado = "".join(
        c.lower() if c.isalnum() else "-"
        for c in unquote(str(texto)).strip()
    )
    while "--" in resultado:
        resultado = resultado.replace("--", "-")
    return resultado.strip("-")


@app.route("/api/firmantespo", methods=["GET"])
def get_firmantespo():
    if not os.path.exists(FIRMANTESPO_FILE):
        # Migracion desde la version anterior, en la que solo existia UN
        # firmante P.O. guardado en Configuracion. Si ya tenia nombre, se
        # convierte en la primera entrada de la nueva lista, para no perder
        # lo que ya hubiera configurado.
        config = read_json(CONFIG_FILE, default={})
        firmante_antiguo = (config.get("firmantePOJefe") or {})
        nombre_antiguo = str(firmante_antiguo.get("nombre", "")).strip()

        lista_inicial = []
        if nombre_antiguo:
            lista_inicial.append({
                "id": slugificar(nombre_antiguo) or "firmante-po-1",
                "nombre": nombre_antiguo,
                "area": "",
                "correo": "",
                "firma": str(firmante_antiguo.get("firma", "")).strip(),
                "usarFirma": bool(firmante_antiguo.get("usarFirma", False))
            })

        write_json(FIRMANTESPO_FILE, lista_inicial)
        return jsonify(lista_inicial)

    return jsonify(read_json(FIRMANTESPO_FILE, default=[]))


@app.route("/api/firmantespo", methods=["POST"])
def add_firmantepo():
    data = request.get_json(silent=True) or {}
    firmantes = read_json(FIRMANTESPO_FILE, default=[])

    nombre = str(data.get("nombre", "")).strip()
    if not nombre:
        return jsonify({"ok": False, "error": "Nombre obligatorio"}), 400

    nuevo_id = slugificar(nombre)
    if not nuevo_id or any(f.get("id") == nuevo_id for f in firmantes):
        nuevo_id = f"{nuevo_id or 'firmante-po'}-{uuid.uuid4().hex[:6]}"

    nuevo = {
        "id": nuevo_id,
        "nombre": nombre,
        "area": str(data.get("area", "")).strip(),
        "correo": str(data.get("correo", "")).strip(),
        "firma": str(data.get("firma", "")).strip(),
        "usarFirma": bool(data.get("usarFirma", False))
    }

    firmantes.append(nuevo)
    write_json(FIRMANTESPO_FILE, firmantes)
    return jsonify({"ok": True, "id": nuevo_id})


@app.route("/api/firmantespo/<path:firmante_id>", methods=["PUT"])
def update_firmantepo(firmante_id):
    firmante_id = normalize_text(firmante_id)
    data = request.get_json(silent=True) or {}
    firmantes = read_json(FIRMANTESPO_FILE, default=[])

    index = next((i for i, f in enumerate(firmantes) if f.get("id") == firmante_id), None)
    if index is None:
        return jsonify({"ok": False, "error": "No existe el firmante P.O."}), 404

    nombre = str(data.get("nombre", "")).strip()
    if not nombre:
        return jsonify({"ok": False, "error": "Nombre obligatorio"}), 400

    firmantes[index] = {
        "id": firmante_id,
        "nombre": nombre,
        "area": str(data.get("area", "")).strip(),
        "correo": str(data.get("correo", "")).strip(),
        "firma": str(data.get("firma", "")).strip(),
        "usarFirma": bool(data.get("usarFirma", False))
    }

    write_json(FIRMANTESPO_FILE, firmantes)
    return jsonify({"ok": True})


@app.route("/api/firmantespo/<path:firmante_id>", methods=["DELETE"])
def delete_firmantepo(firmante_id):
    firmante_id = normalize_text(firmante_id)
    firmantes = read_json(FIRMANTESPO_FILE, default=[])

    nuevos = [f for f in firmantes if f.get("id") != firmante_id]
    if len(nuevos) == len(firmantes):
        return jsonify({"ok": False, "error": "No existe el firmante P.O."}), 404

    write_json(FIRMANTESPO_FILE, nuevos)
    return jsonify({"ok": True})


# ---------------- FIRMAS ----------------

@app.route("/api/subir-firma", methods=["POST"])
def subir_firma():
    ensure_firmas_dir()

    archivo = request.files.get("firma")
    if not archivo or archivo.filename == "":
        return jsonify({"ok": False, "error": "No se ha recibido ninguna imagen"}), 400

    if "." not in archivo.filename:
        return jsonify({"ok": False, "error": "Formato no permitido (usa PNG o JPG)"}), 400

    extension = archivo.filename.rsplit(".", 1)[-1].lower()
    if extension not in EXTENSIONES_FIRMA_PERMITIDAS:
        return jsonify({"ok": False, "error": "Formato no permitido (usa PNG o JPG)"}), 400

    archivo.seek(0, os.SEEK_END)
    tamano = archivo.tell()
    archivo.seek(0)

    if tamano > TAMANO_MAXIMO_FIRMA:
        return jsonify({"ok": False, "error": "La imagen no puede superar los 5 MB"}), 400

    nombre_archivo = f"{uuid.uuid4().hex}.{extension}"
    ruta_absoluta = os.path.join(FIRMAS_DIR, nombre_archivo)
    archivo.save(ruta_absoluta)

    ruta_relativa = f"img/firmas/{nombre_archivo}"
    return jsonify({"ok": True, "ruta": ruta_relativa})


# ---------------- ARCHIVOS ESTATICOS ----------------

@app.route("/<path:path>")
def static_files(path):
    return send_from_directory(BASE_DIR, path)


if __name__ == "__main__":
    ensure_data_dir()
    ensure_firmas_dir()
    escribir_pid()
    ensure_file(CONFIG_FILE, {
        "jefeInstalacion": {
            "nombre": ""
        }
    })
    ensure_file(SUBESTACIONES_FILE, {})
    ensure_file(CONTRATISTAS_FILE, {})
    ensure_file(TECNICOS_FILE, [])
    app.run(debug=False, host="127.0.0.1", port=8000)
