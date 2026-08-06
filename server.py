from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import json
import os
from urllib.parse import unquote

app = Flask(__name__, static_folder=".", static_url_path="")
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "datos")

CONFIG_FILE = os.path.join(DATA_DIR, "configuracion.json")
SUBESTACIONES_FILE = os.path.join(DATA_DIR, "subestaciones.json")
CONTRATISTAS_FILE = os.path.join(DATA_DIR, "contratistas.json")


def ensure_data_dir():
    os.makedirs(DATA_DIR, exist_ok=True)


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
        "tecnicoSolicitante": "",
        "unidadSolicitante": "",
        "jefeInstalacion": ""
    })
    return jsonify(data)


@app.route("/api/configuracion", methods=["POST"])
def save_configuracion():
    data = request.get_json(silent=True) or {}

    payload = {
        "tecnicoSolicitante": str(data.get("tecnicoSolicitante", "")).strip(),
        "unidadSolicitante": str(data.get("unidadSolicitante", "")).strip(),
        "jefeInstalacion": str(data.get("jefeInstalacion", "")).strip()
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
    if not isinstance(representantes, list):
        representantes = []

    if nuevo_nombre != nombre:
        del contratistas[nombre]

    contratistas[nuevo_nombre] = [str(r).strip() for r in representantes if str(r).strip()]
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

    if not isinstance(contratistas[nombre], list):
        contratistas[nombre] = []

    if representante not in contratistas[nombre]:
        contratistas[nombre].append(representante)

    write_json(CONTRATISTAS_FILE, contratistas)
    return jsonify({"ok": True})


@app.route("/api/contratistas/<path:nombre>/representantes/<path:representante>", methods=["DELETE"])
def delete_representante(nombre, representante):
    nombre = normalize_key(nombre)
    representante = normalize_text(representante)

    contratistas = read_json(CONTRATISTAS_FILE, default={})

    if nombre not in contratistas:
        return jsonify({"ok": False, "error": "No existe la contrata"}), 404

    if not isinstance(contratistas[nombre], list):
        contratistas[nombre] = []

    if representante in contratistas[nombre]:
        contratistas[nombre].remove(representante)

    write_json(CONTRATISTAS_FILE, contratistas)
    return jsonify({"ok": True})


# ---------------- ARCHIVOS ESTATICOS ----------------
# Esta ruta va al final para no interferir con /api/...

@app.route("/<path:path>")
def static_files(path):
    return send_from_directory(BASE_DIR, path)


# if __name__ == "__main__":
    # ensure_data_dir()
    # app.run(debug=True, host="0.0.0.0", port=8000)

if __name__ == "__main__":
    ensure_data_dir()
    app.run(debug=False, host="127.0.0.1", port=8000)
