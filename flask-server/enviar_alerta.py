import sys
import time
from datetime import datetime
from pathlib import Path

import socketio
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter

# Uso:
#   py enviar_alerta.py
#   py enviar_alerta.py http://localhost:5000
#   py enviar_alerta.py http://localhost:5000 sur
#
# Se ejecutan todos los casos y se genera resultados_Alertas.xlsx
# en la misma carpeta de este script.

URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5000"
ZONA_BASE = sys.argv[2] if len(sys.argv) > 2 else "norte"
ARCHIVO_EXCEL = Path(__file__).resolve().parent / "resultados_Alertas.xlsx"
PAUSA_SEGUNDOS = 0.5

def alerta_base():
    return {
        "tipo": "incendio",
        "gravedad": "alta",
        "zona": ZONA_BASE,
        "mensaje": f"Prueba automatizada de alerta en zona {ZONA_BASE}",
    }

# Cada caso contiene: nombre, descripción, datos y si se espera aceptación.
def crear_casos():
    casos = []

    a = alerta_base()
    casos.append(("valida", "Todos los campos contienen valores permitidos", a, True))

    a = alerta_base(); a["mensaje"] = ""
    casos.append(("mensaje_vacio", "Mensaje vacío", a, False))

    a = alerta_base(); del a["tipo"]
    casos.append(("campo_faltante_tipo", "Falta el campo tipo", a, False))

    a = alerta_base(); del a["gravedad"]
    casos.append(("campo_faltante_gravedad", "Falta el campo gravedad", a, False))

    a = alerta_base(); del a["zona"]
    casos.append(("campo_faltante_zona", "Falta el campo zona", a, False))

    a = alerta_base(); del a["mensaje"]
    casos.append(("campo_faltante_mensaje", "Falta el campo mensaje", a, False))

    a = alerta_base(); a["tipo"] = ""
    casos.append(("tipo_vacio", "Tipo vacío", a, False))

    a = alerta_base(); a["gravedad"] = ""
    casos.append(("gravedad_vacia", "Gravedad vacía", a, False))

    a = alerta_base(); a["zona"] = ""
    casos.append(("zona_vacia", "Zona vacía", a, False))

    a = alerta_base(); a["gravedad"] = "extrema"
    casos.append(("gravedad_invalida", "Gravedad no permitida", a, False))

    a = alerta_base(); a["zona"] = "este"
    casos.append(("zona_invalida", "Zona no permitida", a, False))

    a = alerta_base(); a["tipo"] = "x" * 51
    casos.append(("tipo_largo", "Tipo supera 50 caracteres", a, False))

    a = alerta_base(); a["mensaje"] = "x" * 201
    casos.append(("mensaje_largo", "Mensaje supera 200 caracteres", a, False))

    a = alerta_base(); a["tipo"] = 123
    casos.append(("tipo_no_texto", "Tipo no es texto", a, False))

    a = alerta_base(); a["gravedad"] = 2
    casos.append(("gravedad_no_texto", "Gravedad no es texto", a, False))

    a = alerta_base(); a["zona"] = 1
    casos.append(("zona_no_texto", "Zona no es texto", a, False))

    a = alerta_base(); a["mensaje"] = 123
    casos.append(("mensaje_no_texto", "Mensaje no es texto", a, False))

    a = alerta_base(); a["mensaje"] = "x" * 200
    casos.append(("mensaje_limite", "Mensaje en el límite de 200 caracteres", a, True))

    a = alerta_base(); a["tipo"] = "alerta123"
    casos.append(("tipo_texto_numerico", "Tipo de texto con números", a, True))

    casos.append(("no_objeto", "El contenido enviado no es un objeto", "esto no es un objeto", False))
    return casos

def resumen_respuesta(respuesta):
    if respuesta is None:
        return "El servidor no devolvió una respuesta ACK"
    if isinstance(respuesta, dict):
        return str(respuesta.get("error") or respuesta.get("mensaje") or respuesta)
    return str(respuesta)

def ejecutar_caso(nombre, descripcion, datos, se_espera_aceptacion):
    sio = socketio.Client()
    inicio = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    respuesta = None
    error_conexion = ""
    recibido = False

    try:
        sio.connect(URL, transports=["websocket"], wait_timeout=5)
        recibido = True
        respuesta = sio.call("emitir_alerta", datos, timeout=5)

        aceptada = isinstance(respuesta, dict) and respuesta.get("ok") is True
        rechazada = isinstance(respuesta, dict) and respuesta.get("ok") is False

        if se_espera_aceptacion:
            estado = "CORRECTO" if aceptada else "FALLIDO"
            obtenido = "Aceptada" if aceptada else "Rechazada / sin ACK válido"
        else:
            estado = "CORRECTO" if rechazada else "FALLIDO"
            obtenido = "Rechazada" if rechazada else "Aceptada / sin rechazo válido"

        detalle = resumen_respuesta(respuesta)
    except Exception as exc:
        error_conexion = str(exc)
        estado = "FALLIDO"
        obtenido = "Error de conexión o emisión"
        detalle = error_conexion
    finally:
        if sio.connected:
            sio.disconnect()

    esperado = "Aceptada" if se_espera_aceptacion else "Rechazada"
    datos_texto = repr(datos)
    print(f"[{estado}] {nombre}: esperado={esperado}; obtenido={obtenido}")
    if detalle:
        print(f"    Respuesta: {detalle}")
    return {
        "Fecha y hora": inicio,
        "Caso": nombre,
        "Descripción": descripcion,
        "Datos enviados": datos_texto,
        "Resultado esperado": esperado,
        "Resultado obtenido": obtenido,
        "Respuesta del servidor": detalle,
        "Estado": estado,
    }

def guardar_excel(resultados):
    wb = Workbook()
    ws = wb.active
    ws.title = "Resultados"
    encabezados = list(resultados[0].keys()) if resultados else [
        "Fecha y hora", "Caso", "Descripción", "Datos enviados",
        "Resultado esperado", "Resultado obtenido", "Respuesta del servidor", "Estado"
    ]
    ws.append(encabezados)

    for fila in resultados:
        ws.append([fila.get(col, "") for col in encabezados])

    header_fill = PatternFill("solid", fgColor="1F4E78")
    for celda in ws[1]:
        celda.font = Font(bold=True, color="FFFFFF")
        celda.fill = header_fill
        celda.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

    anchos = [21, 25, 42, 65, 22, 28, 55, 16]
    for i, ancho in enumerate(anchos, 1):
        ws.column_dimensions[get_column_letter(i)].width = ancho

    for fila in ws.iter_rows(min_row=2):
        for celda in fila:
            celda.alignment = Alignment(vertical="top", wrap_text=True)
        estado = fila[7].value
        if estado == "CORRECTO":
            fila[7].fill = PatternFill("solid", fgColor="C6EFCE")
            fila[7].font = Font(color="006100", bold=True)
        elif estado == "FALLIDO":
            fila[7].fill = PatternFill("solid", fgColor="FFC7CE")
            fila[7].font = Font(color="9C0006", bold=True)

    ws.freeze_panes = "A2"
    ws.auto_filter.ref = ws.dimensions
    ws.row_dimensions[1].height = 32

    resumen = wb.create_sheet("Resumen")
    total = len(resultados)
    correctas = sum(1 for r in resultados if r["Estado"] == "CORRECTO")
    fallidas = total - correctas
    resumen.append(["Resumen de ejecución", "Valor"])
    resumen.append(["Backend", "Flask"])
    resumen.append(["URL", URL])
    resumen.append(["Fecha de ejecución", datetime.now().strftime("%Y-%m-%d %H:%M:%S")])
    resumen.append(["Total de casos", total])
    resumen.append(["Pruebas correctas", correctas])
    resumen.append(["Pruebas fallidas", fallidas])
    resumen.append(["Resultado general", "TODAS CORRECTAS" if fallidas == 0 else "REVISAR CASOS FALLIDOS"])
    for celda in resumen[1]:
        celda.font = Font(bold=True, color="FFFFFF")
        celda.fill = header_fill
    resumen.column_dimensions["A"].width = 30
    resumen.column_dimensions["B"].width = 48
    resumen.freeze_panes = "A2"

    wb.save(ARCHIVO_EXCEL)

def main():
    casos = crear_casos()
    resultados = []
    print("=" * 62)
    print("PRUEBAS AUTOMATIZADAS DE VALIDACIÓN - BACKEND FLASK")
    print(f"Servidor: {URL}")
    print(f"Casos: {len(casos)}")
    print("=" * 62)

    for indice, caso in enumerate(casos, start=1):
        print(f"\n[{indice}/{len(casos)}] {caso[0]} - {caso[1]}")
        resultados.append(ejecutar_caso(*caso))
        time.sleep(PAUSA_SEGUNDOS)

    guardar_excel(resultados)
    correctas = sum(1 for r in resultados if r["Estado"] == "CORRECTO")
    fallidas = len(resultados) - correctas
    print("\n" + "=" * 62)
    print(f"TOTAL: {len(resultados)} | CORRECTAS: {correctas} | FALLIDAS: {fallidas}")
    print(f"Excel generado: {ARCHIVO_EXCEL}")
    print("=" * 62)

if __name__ == "__main__":
    main()
