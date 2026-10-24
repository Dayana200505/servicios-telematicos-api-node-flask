import asyncio
import csv
import math
import sys
import time
from datetime import datetime
from pathlib import Path

import socketio

URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5000"
NOMBRE = sys.argv[2] if len(sys.argv) > 2 else ("flask" if ":5000" in URL else "node")
# Opcional: escenarios separados por coma, por ejemplo 1000 o 50,100
if len(sys.argv) > 3:
    ESCENARIOS = [int(x) for x in sys.argv[3].split(",")]
    SUFIJO = "_" + "-".join(str(x) for x in ESCENARIOS)
else:
    ESCENARIOS = [50, 100, 500, 1000]
    SUFIJO = ""

ZONA = "norte"
ALERTAS_POR_ESCENARIO = 20
PAUSA_ENTRE_ALERTAS = 0.5
ESPERA_SUSCRIPCION = 2
ESPERA_FINAL = 3
TIMEOUT_CONEXION = 8
INTERVALO_CREACION = 0.005

resultados = []
ARCHIVO = Path(__file__).with_name(f"resultados_latencia_{NOMBRE}{SUFIJO}.csv")


def armar_alerta(mensaje):
    return {"tipo": "incendio", "gravedad": "alta", "zona": ZONA, "mensaje": mensaje}


def percentil(ordenados, p):
    # Percentil por rango mas cercano.
    if not ordenados:
        return None
    k = max(0, math.ceil(p / 100 * len(ordenados)) - 1)
    return ordenados[k]


def redondear(valor):
    return round(valor, 2) if valor is not None else ""


def fila(cantidad, conectados, suscritos, ordenadas, nota=""):
    promedio = sum(ordenadas) / len(ordenadas) if ordenadas else None
    return {
        "fecha": datetime.now().isoformat(timespec="seconds"),
        "servidor": NOMBRE,
        "url": URL,
        "clientes_solicitados": cantidad,
        "clientes_conectados": conectados,
        "clientes_suscritos": suscritos,
        "alertas_enviadas": ALERTAS_POR_ESCENARIO,
        "mensajes_esperados": conectados * ALERTAS_POR_ESCENARIO,
        "mensajes_recibidos": len(ordenadas),
        "latencia_min_ms": redondear(ordenadas[0] if ordenadas else None),
        "latencia_prom_ms": redondear(promedio),
        "latencia_max_ms": redondear(ordenadas[-1] if ordenadas else None),
        "p95_ms": redondear(percentil(ordenadas, 95)),
        "p99_ms": redondear(percentil(ordenadas, 99)),
        "nota": nota,
    }


def registrar(resultado):
    # Guarda el CSV completo despues de cada escenario.
    resultados.append(resultado)
    print(resultado)
    with ARCHIVO.open("w", newline="", encoding="utf-8") as f:
        escritor = csv.DictWriter(f, fieldnames=resultados[0].keys())
        escritor.writeheader()
        escritor.writerows(resultados)


async def cerrar(cliente):
    try:
        if cliente.connected:
            await cliente.disconnect()
        sesion = getattr(cliente.eio, "http", None)
        if sesion is not None and not sesion.closed:
            await sesion.close()
    except Exception:
        pass


async def medir_escenario(cantidad):
    print(f"\n--- Escenario: {cantidad} clientes ({NOMBRE}) ---")

    latencias = []
    envios = {}              # mensaje -> hora de envio
    conteo = {"suscritos": 0}
    clientes = []

    async def crear_cliente():
        cliente = socketio.AsyncClient(reconnection=False)

        @cliente.on("alerta_recibida")
        async def on_alerta(data):
            ahora = time.perf_counter()
            if isinstance(data, dict):
                inicio = envios.get(data.get("mensaje"))
                if inicio is not None:
                    latencias.append((ahora - inicio) * 1000)

        @cliente.on("zona_confirmada")
        async def on_zona(data):
            conteo["suscritos"] += 1

        try:
            await asyncio.wait_for(
                cliente.connect(URL, transports=["websocket"]),
                timeout=TIMEOUT_CONEXION,
            )
            await cliente.emit("suscribir_zona", {"zona": ZONA})
            clientes.append(cliente)
        except Exception:
            await cerrar(cliente)

    # Conectar gradualmente, igual que prueba_carga.py.
    tareas = []
    for _ in range(cantidad):
        tareas.append(asyncio.create_task(crear_cliente()))
        await asyncio.sleep(INTERVALO_CREACION)
    await asyncio.gather(*tareas)

    conectados = len(clientes)
    print(f"Conectados: {conectados}/{cantidad}")
    await asyncio.sleep(ESPERA_SUSCRIPCION)
    print(f"Suscritos confirmados: {conteo['suscritos']}")

    emisor = socketio.AsyncClient(reconnection=False)
    try:
        await emisor.connect(URL, transports=["websocket"])
    except Exception as error:
        print(f"El emisor no pudo conectarse: {error}")
        await asyncio.gather(*(cerrar(c) for c in clientes))
        registrar(fila(cantidad, conectados, conteo["suscritos"], [],
                       "el servidor rechazo nuevas conexiones; no se midio latencia"))
        return

    # Alerta de calentamiento: no se mide.
    await emisor.emit("emitir_alerta", armar_alerta("calentamiento"))
    await asyncio.sleep(1)

    for n in range(1, ALERTAS_POR_ESCENARIO + 1):
        clave = f"lat-{n}"
        envios[clave] = time.perf_counter()
        await emisor.emit("emitir_alerta", armar_alerta(clave))
        await asyncio.sleep(PAUSA_ENTRE_ALERTAS)

    await asyncio.sleep(ESPERA_FINAL)

    await asyncio.gather(*(cerrar(c) for c in clientes + [emisor]))

    nota = ""
    if conectados < cantidad:
        nota = f"solo se conectaron {conectados} de {cantidad} clientes"

    registrar(fila(cantidad, conectados, conteo["suscritos"], sorted(latencias), nota))


async def main():
    for cantidad in ESCENARIOS:
        await medir_escenario(cantidad)
        await asyncio.sleep(1.5)

    print(f"\nListo. Resultados guardados en:\n{ARCHIVO}")


if __name__ == "__main__":
    asyncio.run(main())