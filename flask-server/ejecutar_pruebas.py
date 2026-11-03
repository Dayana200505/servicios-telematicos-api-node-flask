
import argparse
import csv
import json
import os
import platform
import subprocess
import sys
import time
import urllib.request
from collections import defaultdict
from datetime import datetime
from pathlib import Path

CARPETA = Path(__file__).resolve().parent
SALIDA = CARPETA / "resultados_validacion"

SERVIDORES = {
    "node": "http://localhost:3001",
    "flask": "http://localhost:5000",
}

# Pruebas con Socket.IO: (id, archivo, descripcion).
# Cada script recibe la URL del servidor como primer argumento y debe terminar
# con codigo 0 si todas sus verificaciones pasan.
PRUEBAS = [
    ("rooms", "test_rooms.py", "Suscripcion por zonas y cambio de zona"),
    ("difusion", "test_difusion.py", "Emision, validacion y difusion segmentada"),
    ("validacion", "test_validacion.py", "Validacion de datos y manejo de errores"),
    ("cambio_zona", "test_cambio_zona.py", "Cambio de zona sin reconectar"),
    ("reconexion", "test_reconexion.py", "Desconexion, reconexion y recuperacion de alertas"),
]


PRUEBAS_HTTP = [
    ("http_raiz", "/", "El servidor responde en la ruta raiz"),
    ("http_historial", "/alertas", "El historial de alertas responde"),
]


def consultar(url):
    with urllib.request.urlopen(url, timeout=5) as respuesta:
        return respuesta.status, json.loads(respuesta.read().decode("utf-8"))


def ejecutar_http(base, ruta):
    inicio = time.time()
    try:
        estado, cuerpo = consultar(base + ruta)
        ok = estado == 200 and str(cuerpo.get("status", "")).lower() == "ok"
        detalle = f"HTTP {estado}, status={cuerpo.get('status')}"
    except Exception as error:
        ok, detalle = False, f"{type(error).__name__}: {error}"
    return ("PASA" if ok else "FALLA"), time.time() - inicio, detalle, detalle


def ultima_linea(texto):
    lineas = [linea.strip() for linea in texto.splitlines() if linea.strip()]
    return lineas[-1] if lineas else ""


def ejecutar_script(archivo, url, limite):
    ruta = CARPETA / archivo
    if not ruta.exists():
        return "OMITIDA", 0.0, f"No existe {archivo}", ""
    inicio = time.time()
    entorno = dict(os.environ, PYTHONIOENCODING="utf-8")
    try:
        proceso = subprocess.run(
            [sys.executable, str(ruta), url],
            cwd=CARPETA,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=limite,
            env=entorno,
        )
    except subprocess.TimeoutExpired:
        return "FALLA", time.time() - inicio, f"Tiempo de espera agotado ({limite} s)", ""
    salida = (proceso.stdout or "") + (proceso.stderr or "")
    resultado = "PASA" if proceso.returncode == 0 else "FALLA"
    return resultado, time.time() - inicio, ultima_linea(salida), salida


def main():
    parser = argparse.ArgumentParser(description="Ejecuta las pruebas funcionales en Node.js y Flask")
    parser.add_argument("--repeticiones", type=int, default=3, help="veces que se repite toda la tanda")
    parser.add_argument("--servidor", choices=["node", "flask", "ambos"], default="ambos")
    parser.add_argument("--limite", type=int, default=120, help="segundos maximos por prueba")
    args = parser.parse_args()

    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    servidores = SERVIDORES if args.servidor == "ambos" else {args.servidor: SERVIDORES[args.servidor]}
    marca = datetime.now().strftime("%Y%m%d_%H%M%S")
    carpeta_logs = SALIDA / "logs" / marca
    carpeta_logs.mkdir(parents=True, exist_ok=True)

    print(f"Entorno: {platform.system()} {platform.release()}, Python {platform.python_version()}")

    casos = [(i, d, "http", r) for i, r, d in PRUEBAS_HTTP] + [(i, d, "script", a) for i, a, d in PRUEBAS]
    filas = []
    resumen = defaultdict(list)
    descripciones = {}

    for repeticion in range(1, args.repeticiones + 1):
        print(f"\n=== Repeticion {repeticion}/{args.repeticiones} ===")
        for servidor, url in servidores.items():
            disponible = True
            for id_prueba, descripcion, tipo, destino in casos:
                if not disponible:
                    resultado, duracion, detalle, salida = "OMITIDA", 0.0, "Servidor no disponible", ""
                elif tipo == "http":
                    resultado, duracion, detalle, salida = ejecutar_http(url, destino)
                else:
                    resultado, duracion, detalle, salida = ejecutar_script(destino, url, args.limite)

                if id_prueba == "http_raiz" and resultado != "PASA":
                    disponible = False

                (carpeta_logs / f"rep{repeticion}_{servidor}_{id_prueba}.txt").write_text(
                    f"{descripcion}\nResultado: {resultado}\n\n{salida}", encoding="utf-8"
                )
                filas.append([
                    datetime.now().isoformat(timespec="seconds"), repeticion, servidor,
                    id_prueba, descripcion, resultado, round(duracion, 2), detalle,
                ])
                resumen[(servidor, id_prueba)].append(resultado)
                descripciones[id_prueba] = descripcion
                print(f"  [{servidor:5}] {id_prueba:15} {resultado:8} {duracion:5.1f}s  {detalle}")

    ruta_detalle = SALIDA / f"validacion_{marca}.csv"
    with open(ruta_detalle, "w", newline="", encoding="utf-8-sig") as archivo:
        escritor = csv.writer(archivo)
        escritor.writerow(["fecha_hora", "repeticion", "servidor", "prueba", "descripcion",
                           "resultado", "duracion_s", "detalle"])
        escritor.writerows(filas)

    print("\n=== Resumen ===")
    print(f"{'servidor':8} {'prueba':16} {'pasa':6} consistencia")
    filas_resumen = []
    hay_fallas = False
    for (servidor, id_prueba), resultados in resumen.items():
        pasan = resultados.count("PASA")
        total = len(resultados)
        consistencia = "CONSISTENTE" if len(set(resultados)) == 1 else "INCONSISTENTE"
        if pasan != total:
            hay_fallas = True
        print(f"{servidor:8} {id_prueba:16} {pasan}/{total:<4} {consistencia}")
        filas_resumen.append([servidor, id_prueba, descripciones[id_prueba], total, pasan, consistencia])

    ruta_resumen = SALIDA / f"resumen_{marca}.csv"
    with open(ruta_resumen, "w", newline="", encoding="utf-8-sig") as archivo:
        escritor = csv.writer(archivo)
        escritor.writerow(["servidor", "prueba", "descripcion", "repeticiones", "pasan", "consistencia"])
        escritor.writerows(filas_resumen)

    print(f"\nDetalle: {ruta_detalle}")
    print(f"Resumen: {ruta_resumen}")
    print(f"Logs:    {carpeta_logs}")
    sys.exit(1 if hay_fallas else 0)


if __name__ == "__main__":
    main()