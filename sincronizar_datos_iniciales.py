"""Sincroniza los datos "de fábrica" (datos_iniciales/) con los datos reales
del usuario (datos/), sumando lo que venga nuevo sin tocar nada de lo que
ya exista en local -- ni de fábrica de una versión anterior, ni añadido a
mano por el usuario desde Administración.

Se ejecuta automáticamente al arrancar (ver ejecutar_acta.bat), tanto en la
primera instalación (datos/ está vacío, así que "fusionar" equivale a copiar
todo) como en cada actualización posterior (datos/ ya tiene cosas propias del
usuario, que se conservan intactas).
"""

import json
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SEED_DIR = os.path.join(BASE_DIR, "datos_iniciales")
DATA_DIR = os.path.join(BASE_DIR, "datos")

ARCHIVO_TECNICOS = "tecnicos.json"
ARCHIVO_SUBESTACIONES = "subestaciones.json"
ARCHIVO_CONTRATISTAS = "contratistas.json"


def leer_json(ruta, valor_por_defecto):
    if not os.path.exists(ruta):
        return valor_por_defecto
    try:
        with open(ruta, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return valor_por_defecto


def escribir_json(ruta, datos):
    os.makedirs(os.path.dirname(ruta), exist_ok=True)
    with open(ruta, "w", encoding="utf-8") as f:
        json.dump(datos, f, ensure_ascii=False, indent=2)


def fusionar_tecnicos(semilla, local):
    """Lista de {id, nombre, area, firma, usarFirma}. Se añaden por id."""
    ids_locales = {t.get("id") for t in local if isinstance(t, dict)}
    nuevos = [t for t in semilla if isinstance(t, dict) and t.get("id") not in ids_locales]
    return local + nuevos


def fusionar_subestaciones(semilla, local):
    """Diccionario nombre -> {parques: [...], posiciones: [...]}.
    Se añaden subestaciones nuevas enteras, y dentro de las que ya existen
    en ambos lados, se añaden los parques/posiciones que falten."""
    resultado = json.loads(json.dumps(local))  # copia profunda

    for nombre, datos_semilla in semilla.items():
        if not isinstance(datos_semilla, dict):
            continue

        if nombre not in resultado:
            resultado[nombre] = datos_semilla
            continue

        actual = resultado[nombre]

        parques_locales = set(actual.get("parques", []))
        for parque in datos_semilla.get("parques", []):
            if parque not in parques_locales:
                actual.setdefault("parques", []).append(parque)
                parques_locales.add(parque)

        posiciones_locales = set(actual.get("posiciones", []))
        for posicion in datos_semilla.get("posiciones", []):
            if posicion not in posiciones_locales:
                actual.setdefault("posiciones", []).append(posicion)
                posiciones_locales.add(posicion)

    return resultado


def fusionar_contratistas(semilla, local):
    """Diccionario nombre -> [representantes]. Se añaden contratas nuevas
    enteras, y dentro de las que ya existen en ambos lados, se añaden los
    representantes que falten (comparando por nombre)."""
    resultado = json.loads(json.dumps(local))  # copia profunda

    def nombre_de(representante):
        return representante.get("nombre") if isinstance(representante, dict) else representante

    for nombre, representantes_semilla in semilla.items():
        if not isinstance(representantes_semilla, list):
            continue

        if nombre not in resultado:
            resultado[nombre] = representantes_semilla
            continue

        nombres_locales = {nombre_de(r) for r in resultado[nombre]}
        for representante in representantes_semilla:
            if nombre_de(representante) not in nombres_locales:
                resultado[nombre].append(representante)
                nombres_locales.add(nombre_de(representante))

    return resultado


def sincronizar():
    if not os.path.isdir(SEED_DIR):
        return

    ruta_semilla = os.path.join(SEED_DIR, ARCHIVO_TECNICOS)
    ruta_local = os.path.join(DATA_DIR, ARCHIVO_TECNICOS)
    escribir_json(ruta_local, fusionar_tecnicos(
        leer_json(ruta_semilla, []),
        leer_json(ruta_local, [])
    ))

    ruta_semilla = os.path.join(SEED_DIR, ARCHIVO_SUBESTACIONES)
    ruta_local = os.path.join(DATA_DIR, ARCHIVO_SUBESTACIONES)
    escribir_json(ruta_local, fusionar_subestaciones(
        leer_json(ruta_semilla, {}),
        leer_json(ruta_local, {})
    ))

    ruta_semilla = os.path.join(SEED_DIR, ARCHIVO_CONTRATISTAS)
    ruta_local = os.path.join(DATA_DIR, ARCHIVO_CONTRATISTAS)
    escribir_json(ruta_local, fusionar_contratistas(
        leer_json(ruta_semilla, {}),
        leer_json(ruta_local, {})
    ))


if __name__ == "__main__":
    sincronizar()
    print("Datos comunes sincronizados.")
