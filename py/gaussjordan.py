"""
Calculadora de matrices y sistemas de ecuaciones.

Este archivo parte del programa original (creación/edición de matrices,
suma, resta, multiplicación y resolución por Gauss-Jordan) y le agrega:

  1. Resolución por el método de Gauss (eliminación hacia adelante +
     sustitución regresiva), además del Gauss-Jordan que ya existía.
  2. Verificación "reversible": después de resolver, el programa toma
     las soluciones y las sustituye de nuevo en las ecuaciones
     ORIGINALES para comprobar que son correctas.
  3. Monitoreo de RAM que corre en segundo plano desde que arranca el
     programa hasta que se cierra, usando solo la librería estándar de
     Python (tracemalloc + threading, ninguna instalación adicional).
  4. Comparación de ambos métodos sobre el mismo sistema.

Todas las funciones originales (crear_matriz, mostrar_matriz, sumar,
restar, multiplicar, etc.) se mantienen sin cambios de comportamiento.
"""

import threading
import time
import tracemalloc


# Diferencia máxima que toleramos al comparar números decimales.
# Comparar floats con == es poco confiable (0.1 + 0.2 != 0.3 en Python),
# así que en su lugar comprobamos que la diferencia sea muy pequeña.
TOLERANCIA = 1e-6


# ===================== FORMATO Y VISUALIZACIÓN (sin cambios) =====================

def formatear(numero):
    numero = round(numero, 2)
    if numero == int(numero):
        return str(int(numero))
    else:
        return str(numero)


def mostrar_matriz(matriz):
    for fila in matriz:
        for valor in fila:
            print(formatear(valor), end="  ")
        print()


# ===================== CREACIÓN Y GESTIÓN DE MATRICES (sin cambios) =====================

def crear_matriz():
    filas = int(input("¿Cuántas filas tendrá la matriz? "))
    columnas = int(input("¿Cuántas columnas tendrá la matriz? "))
    matriz = []
    for i in range(filas):
        fila = []
        for j in range(columnas):
            valor = float(input(f"Elemento [{i+1}][{j+1}]: "))
            fila.append(valor)
        matriz.append(fila)
    return matriz


def listar_matrices(matrices):
    if len(matrices) == 0:
        print("Todavía no has creado ninguna matriz.")
        return
    for indice in range(len(matrices)):
        print(f"\nMatriz {indice + 1}:")
        mostrar_matriz(matrices[indice])


def elegir_matriz(matrices, mensaje):
    listar_matrices(matrices)
    numero = int(input(mensaje)) - 1
    if 0 <= numero < len(matrices):
        return numero
    else:
        print("Esa matriz no existe.")
        return None


def modificar_elemento(matriz):
    fila = int(input("¿Qué fila quieres modificar? ")) - 1
    columna = int(input("¿Qué columna quieres modificar? ")) - 1
    if 0 <= fila < len(matriz) and 0 <= columna < len(matriz[0]):
        nuevo_valor = float(input("Nuevo valor: "))
        matriz[fila][columna] = nuevo_valor
        print("Elemento actualizado correctamente.")
    else:
        print("Esa posición no existe en la matriz.")


# ===================== OPERACIONES ENTRE MATRICES (sin cambios) =====================

def sumar(matriz_a, matriz_b):
    filas = len(matriz_a)
    columnas = len(matriz_a[0])
    matriz_suma = []
    for i in range(filas):
        fila = []
        for j in range(columnas):
            valor = matriz_a[i][j] + matriz_b[i][j]
            fila.append(valor)
        matriz_suma.append(fila)
    print("\nResultado de la suma:")
    mostrar_matriz(matriz_suma)


def restar(matriz_a, matriz_b):
    filas = len(matriz_a)
    columnas = len(matriz_a[0])
    matriz_resta = []
    for i in range(filas):
        fila = []
        for j in range(columnas):
            valor = matriz_a[i][j] - matriz_b[i][j]
            fila.append(valor)
        matriz_resta.append(fila)
    print("\nResultado de la resta:")
    mostrar_matriz(matriz_resta)


def multiplicar(matriz_a, matriz_b):
    filas = len(matriz_a)
    columnas = len(matriz_b[0])
    columnas_a = len(matriz_a[0])
    matriz_mult = []
    for i in range(filas):
        fila = []
        for j in range(columnas):
            suma = 0
            for k in range(columnas_a):
                suma = suma + matriz_a[i][k] * matriz_b[k][j]
            fila.append(suma)
        matriz_mult.append(fila)
    print("\nResultado de la multiplicación:")
    mostrar_matriz(matriz_mult)


# ===================== MÉTODO DE GAUSS-JORDAN (sin cambios) =====================

def gauss_jordan(matriz):
    """Reduce la matriz aumentada hasta la forma escalonada REDUCIDA
    (cada pivote vale 1 y es el único valor distinto de cero en su
    columna). Imprime cada paso, igual que en el programa original."""
    m = [fila[:] for fila in matriz]
    filas = len(m)
    columnas = len(m[0])
    paso = 1

    fila_pivote = 0
    for col in range(columnas - 1):
        if fila_pivote >= filas:
            break

        if m[fila_pivote][col] == 0:
            for f in range(fila_pivote + 1, filas):
                if m[f][col] != 0:
                    m[fila_pivote], m[f] = m[f], m[fila_pivote]
                    print(f"\nPaso {paso}: F{fila_pivote+1} <-> F{f+1}")
                    mostrar_matriz(m)
                    paso += 1
                    break

        if m[fila_pivote][col] == 0:
            continue

        pivote = m[fila_pivote][col]
        if pivote != 1:
            for c in range(columnas):
                m[fila_pivote][c] = m[fila_pivote][c] / pivote
            print(f"\nPaso {paso}: F{fila_pivote+1} = F{fila_pivote+1} / {formatear(pivote)}")
            mostrar_matriz(m)
            paso += 1

        for f in range(filas):
            if f != fila_pivote:
                factor = m[f][col]
                if factor != 0:
                    for c in range(columnas):
                        m[f][c] = m[f][c] - factor * m[fila_pivote][c]
                    if factor > 0:
                        print(f"\nPaso {paso}: F{f+1} = F{f+1} - ({formatear(factor)})F{fila_pivote+1}")
                    else:
                        print(f"\nPaso {paso}: F{f+1} = F{f+1} + ({formatear(abs(factor))})F{fila_pivote+1}")
                    mostrar_matriz(m)
                    paso += 1

        fila_pivote += 1

    return m


# ===================== MÉTODO DE GAUSS (NUEVO) =====================

def gauss_eliminacion(matriz):
    """Reduce la matriz aumentada hasta la forma escalonada (triangular),
    eliminando SOLO hacia abajo del pivote. A diferencia de Gauss-Jordan,
    no normaliza el pivote a 1 ni elimina las filas de arriba; los
    valores de las incógnitas se obtienen después con sustitución
    regresiva (ver obtener_soluciones). Imprime cada paso."""
    m = [fila[:] for fila in matriz]
    filas = len(m)
    columnas = len(m[0])
    paso = 1

    fila_pivote = 0
    for col in range(columnas - 1):
        if fila_pivote >= filas:
            break

        if m[fila_pivote][col] == 0:
            for f in range(fila_pivote + 1, filas):
                if m[f][col] != 0:
                    m[fila_pivote], m[f] = m[f], m[fila_pivote]
                    print(f"\nPaso {paso}: F{fila_pivote+1} <-> F{f+1}")
                    mostrar_matriz(m)
                    paso += 1
                    break

        if m[fila_pivote][col] == 0:
            continue

        pivote = m[fila_pivote][col]

        # Solo eliminamos las filas que están DEBAJO del pivote.
        for f in range(fila_pivote + 1, filas):
            factor = m[f][col] / pivote
            if factor != 0:
                for c in range(columnas):
                    m[f][c] = m[f][c] - factor * m[fila_pivote][c]
                if factor > 0:
                    print(f"\nPaso {paso}: F{f+1} = F{f+1} - ({formatear(factor)})F{fila_pivote+1}")
                else:
                    print(f"\nPaso {paso}: F{f+1} = F{f+1} + ({formatear(abs(factor))})F{fila_pivote+1}")
                mostrar_matriz(m)
                paso += 1

        fila_pivote += 1

    return m


# ===================== OBTENER LAS INCÓGNITAS X1, X2, ... (NUEVO) =====================

def obtener_soluciones(matriz_resuelta):
    """Extrae los valores de las incógnitas a partir de una matriz ya
    reducida (sirve tanto para el resultado de Gauss como el de
    Gauss-Jordan). Recorre las filas de abajo hacia arriba haciendo
    sustitución regresiva, así que funciona aunque la matriz no esté
    completamente reducida (caso de Gauss) o ya lo esté (Gauss-Jordan).

    La cantidad de incógnitas se calcula a partir del tamaño de la
    matriz (columnas - 1), así que se adapta sola si el sistema tiene
    más o menos variables."""
    filas = len(matriz_resuelta)
    columnas = len(matriz_resuelta[0])
    n_variables = columnas - 1
    soluciones = [None] * n_variables

    for i in range(filas - 1, -1, -1):
        # Buscamos la primera columna de esta fila que no sea (casi) cero;
        # esa es la incógnita "responsable" de esta ecuación.
        columna_pivote = None
        for j in range(n_variables):
            if abs(matriz_resuelta[i][j]) > TOLERANCIA:
                columna_pivote = j
                break

        if columna_pivote is None:
            # Fila completamente en ceros (0 = 0): no aporta ninguna incógnita.
            continue

        valor = matriz_resuelta[i][n_variables]
        for j in range(columna_pivote + 1, n_variables):
            if soluciones[j] is not None:
                valor -= matriz_resuelta[i][j] * soluciones[j]

        soluciones[columna_pivote] = valor / matriz_resuelta[i][columna_pivote]

    return soluciones


def mostrar_soluciones(soluciones):
    """Imprime cada incógnita con su nombre, en vez de mostrar solo números sueltos."""
    print()
    for i, valor in enumerate(soluciones):
        if valor is None:
            print(f"X{i+1} = (no se pudo determinar; el sistema tiene infinitas soluciones o es indeterminado)")
        else:
            print(f"X{i+1} = {formatear(valor)}")


# ===================== VERIFICACIÓN REVERSIBLE POR SUSTITUCIÓN (NUEVO) =====================

def guardar_copia_matriz(matriz):
    """Devuelve una copia independiente de la matriz, para conservar las
    ecuaciones originales antes de que Gauss o Gauss-Jordan las modifiquen."""
    return [fila[:] for fila in matriz]


def verificar_solucion(ecuaciones_originales, soluciones):
    """Toma las soluciones encontradas (X1, X2, ...) y las sustituye de
    nuevo en cada ecuación ORIGINAL, para comprobar que el resultado
    coincide con el término independiente. Esto es lo que hace que la
    verificación sea "reversible": deshacemos el camino, yendo de la
    solución de vuelta a las ecuaciones que la generaron.

    Como los cálculos con decimales casi nunca dan un resultado exacto,
    comparamos con una tolerancia (TOLERANCIA) en lugar de usar ==.
    """
    print("\nVERIFICACIÓN")
    todas_correctas = True

    for indice, ecuacion in enumerate(ecuaciones_originales):
        n_variables = len(ecuacion) - 1
        resultado_esperado = ecuacion[n_variables]

        # Si alguna incógnita quedó indeterminada, no podemos verificar esta ecuación.
        if any(soluciones[j] is None for j in range(n_variables)):
            print(f"Ecuación {indice+1}: no se pudo verificar (solución indeterminada).")
            todas_correctas = False
            continue

        resultado_calculado = 0
        terminos = []
        for j in range(n_variables):
            coeficiente = ecuacion[j]
            valor = soluciones[j]
            resultado_calculado += coeficiente * valor
            terminos.append(f"{formatear(coeficiente)}({formatear(valor)})")

        texto_sustitucion = " + ".join(terminos).replace("+ -", "- ")
        es_correcta = abs(resultado_calculado - resultado_esperado) <= TOLERANCIA

        print(f"Ecuación {indice+1}: {texto_sustitucion} = {formatear(resultado_esperado)}")
        print(f"  {texto_sustitucion} -> {formatear(resultado_calculado)}")
        if es_correcta:
            print(f"  {formatear(resultado_calculado)} = {formatear(resultado_esperado)}  ✓ Correcta")
        else:
            print(f"  {formatear(resultado_calculado)} ≠ {formatear(resultado_esperado)}  ✗ Incorrecta")
            todas_correctas = False

    if todas_correctas:
        print("\nSolución verificada correctamente.")
    else:
        print("\nLa verificación encontró diferencias; revisa la matriz ingresada.")

    return todas_correctas


# ===================== MONITOREO DE RAM (NUEVO, SIN LIBRERÍAS EXTERNAS) =====================

class MonitorRAM:
    """
    Mide cuánta memoria está usando el programa MIENTRAS se ejecuta,
    no solo antes/después de una función puntual.

    ¿Por qué tracemalloc y no una librería externa como psutil?
    tracemalloc viene incluido en la librería estándar de Python (no
    hay que instalar nada) y permite preguntar en cualquier momento
    cuánta memoria tienen reservada los objetos de Python vivos en ese
    instante, además de llevar un registro del pico máximo alcanzado.
    Es una medida del uso de memoria del propio programa Python, no del
    proceso del sistema operativo completo, pero es suficiente para ver
    cómo crece y decrece el consumo según lo que el usuario hace.

    Un hilo (threading.Thread) en segundo plano actualiza la lectura
    cada "intervalo" segundos mientras el usuario navega el menú, crea
    matrices o resuelve sistemas, sin que tengamos que llamar a nada
    manualmente en cada función. Ese hilo se marca como "daemon" y,
    además, se detiene explícitamente con detener() para no dejar nada
    corriendo en segundo plano al cerrar el programa.
    """

    def __init__(self, intervalo_segundos=0.5):
        self.intervalo_segundos = intervalo_segundos
        self._detener_evento = threading.Event()
        self._hilo = None
        self.ram_actual_mb = 0.0
        self.ram_maxima_mb = 0.0

    def iniciar(self):
        tracemalloc.start()
        self._hilo = threading.Thread(target=self._loop_monitoreo, daemon=True)
        self._hilo.start()

    def _loop_monitoreo(self):
        while not self._detener_evento.is_set():
            actual_bytes, pico_bytes = tracemalloc.get_traced_memory()
            self.ram_actual_mb = actual_bytes / (1024 * 1024)
            self.ram_maxima_mb = max(self.ram_maxima_mb, pico_bytes / (1024 * 1024))
            # Esperamos por partes para poder reaccionar rápido si nos piden detenernos.
            self._detener_evento.wait(self.intervalo_segundos)

    def detener(self):
        self._detener_evento.set()
        if self._hilo is not None:
            self._hilo.join(timeout=2)
        if tracemalloc.is_tracing():
            tracemalloc.stop()

    def mostrar(self):
        print(f"\nRAM actual: {self.ram_actual_mb:.2f} MB")
        print(f"RAM máxima utilizada: {self.ram_maxima_mb:.2f} MB")

    def linea_estado(self):
        """Una línea corta para mostrar arriba del menú en cada vuelta."""
        return f"[RAM actual: {self.ram_actual_mb:.2f} MB | máxima: {self.ram_maxima_mb:.2f} MB]"


# ===================== FLUJO PARA RESOLVER UN SISTEMA (NUEVO) =====================

def resolver_sistema(matrices, monitor, metodo):
    """
    Flujo completo para las opciones "Resolver por Gauss" y "Resolver
    por Gauss-Jordan": elegir la matriz aumentada, resolver mostrando
    los pasos, mostrar X1, X2, ... y verificar automáticamente
    sustituyendo en las ecuaciones originales.

    'metodo' es la cadena "gauss" o "gauss_jordan".
    """
    indice = elegir_matriz(matrices, "¿Qué matriz (sistema) quieres resolver? (número): ")
    if indice is None:
        return

    ecuaciones_originales = guardar_copia_matriz(matrices[indice])

    print(f"\n--- Procedimiento ({'Gauss' if metodo == 'gauss' else 'Gauss-Jordan'}) ---")
    if metodo == "gauss":
        matriz_resuelta = gauss_eliminacion(matrices[indice])
    else:
        matriz_resuelta = gauss_jordan(matrices[indice])

    print("\nMatriz final:")
    mostrar_matriz(matriz_resuelta)

    soluciones = obtener_soluciones(matriz_resuelta)
    print("\nSoluciones:")
    mostrar_soluciones(soluciones)

    verificar_solucion(ecuaciones_originales, soluciones)
    monitor.mostrar()


def comparar_metodos(matrices, monitor):
    """
    Opción "Comparar Gauss y Gauss-Jordan": resuelve EXACTAMENTE el
    mismo sistema con los dos métodos (cada uno sobre su propia copia,
    para no mezclar resultados), mide cuánto tarda cada uno, verifica
    ambas soluciones contra las ecuaciones originales y muestra el
    consumo de RAM observado.
    """
    indice = elegir_matriz(matrices, "¿Qué matriz (sistema) quieres usar para comparar? (número): ")
    if indice is None:
        return

    ecuaciones_originales = guardar_copia_matriz(matrices[indice])

    print("\n=== MÉTODO DE GAUSS ===")
    inicio_gauss = time.perf_counter()
    resuelto_gauss = gauss_eliminacion(guardar_copia_matriz(matrices[indice]))
    tiempo_gauss = time.perf_counter() - inicio_gauss
    soluciones_gauss = obtener_soluciones(resuelto_gauss)
    print("\nSoluciones (Gauss):")
    mostrar_soluciones(soluciones_gauss)
    correcto_gauss = verificar_solucion(ecuaciones_originales, soluciones_gauss)

    print("\n=== MÉTODO DE GAUSS-JORDAN ===")
    inicio_gj = time.perf_counter()
    resuelto_gj = gauss_jordan(guardar_copia_matriz(matrices[indice]))
    tiempo_gj = time.perf_counter() - inicio_gj
    soluciones_gj = obtener_soluciones(resuelto_gj)
    print("\nSoluciones (Gauss-Jordan):")
    mostrar_soluciones(soluciones_gj)
    correcto_gj = verificar_solucion(ecuaciones_originales, soluciones_gj)

    print("\n=== RESUMEN DE LA COMPARACIÓN ===")
    print(f"Gauss:        tiempo = {tiempo_gauss*1000:.4f} ms | verificación: {'correcta' if correcto_gauss else 'con diferencias'}")
    print(f"Gauss-Jordan: tiempo = {tiempo_gj*1000:.4f} ms | verificación: {'correcta' if correcto_gj else 'con diferencias'}")
    monitor.mostrar()


# ===================== MENÚ PRINCIPAL =====================

def mostrar_menu(monitor):
    print("\n" + monitor.linea_estado())
    print("\n----- MENÚ -----")
    print("1. Crear una matriz nueva")
    print("2. Ver todas las matrices")
    print("3. Modificar un elemento de una matriz")
    print("4. Sumar dos matrices")
    print("5. Restar dos matrices")
    print("6. Multiplicar dos matrices")
    print("7. Resolver un sistema por Gauss")
    print("8. Resolver un sistema por Gauss-Jordan")
    print("9. Comparar Gauss y Gauss-Jordan")
    print("10. Ver consumo de RAM")
    print("11. Salir")


def main():
    matrices = []

    # El monitoreo arranca aquí, antes de mostrar el primer menú, y no
    # se detiene hasta la opción "Salir" (o si el programa termina por
    # un error), para cubrir TODO el tiempo que el usuario use el programa.
    monitor = MonitorRAM(intervalo_segundos=0.5)
    monitor.iniciar()

    try:
        while True:
            mostrar_menu(monitor)
            opcion = input("Elige una opción: ")

            if opcion == "1":
                nueva = crear_matriz()
                matrices.append(nueva)
                print(f"\nMatriz {len(matrices)} creada correctamente.")

            elif opcion == "2":
                listar_matrices(matrices)

            elif opcion == "3":
                indice = elegir_matriz(matrices, "¿Qué matriz quieres modificar? (número): ")
                if indice is not None:
                    modificar_elemento(matrices[indice])

            elif opcion == "4":
                if len(matrices) < 2:
                    print("Necesitas al menos 2 matrices creadas para sumar.")
                else:
                    i1 = elegir_matriz(matrices, "Elige la primera matriz (número): ")
                    i2 = elegir_matriz(matrices, "Elige la segunda matriz (número): ")
                    if i1 is not None and i2 is not None:
                        if len(matrices[i1]) == len(matrices[i2]) and len(matrices[i1][0]) == len(matrices[i2][0]):
                            sumar(matrices[i1], matrices[i2])
                        else:
                            print("Esas matrices no tienen el mismo tamaño, no se pueden sumar.")

            elif opcion == "5":
                if len(matrices) < 2:
                    print("Necesitas al menos 2 matrices creadas para restar.")
                else:
                    i1 = elegir_matriz(matrices, "Elige la primera matriz (número): ")
                    i2 = elegir_matriz(matrices, "Elige la segunda matriz (número): ")
                    if i1 is not None and i2 is not None:
                        if len(matrices[i1]) == len(matrices[i2]) and len(matrices[i1][0]) == len(matrices[i2][0]):
                            restar(matrices[i1], matrices[i2])
                        else:
                            print("Esas matrices no tienen el mismo tamaño, no se pueden restar.")

            elif opcion == "6":
                if len(matrices) < 2:
                    print("Necesitas al menos 2 matrices creadas para multiplicar.")
                else:
                    i1 = elegir_matriz(matrices, "Elige la primera matriz (número): ")
                    i2 = elegir_matriz(matrices, "Elige la segunda matriz (número): ")
                    if i1 is not None and i2 is not None:
                        if len(matrices[i1][0]) == len(matrices[i2]):
                            multiplicar(matrices[i1], matrices[i2])
                        else:
                            print("El número de columnas de la primera debe ser igual al de filas de la segunda.")

            elif opcion == "7":
                resolver_sistema(matrices, monitor, metodo="gauss")

            elif opcion == "8":
                resolver_sistema(matrices, monitor, metodo="gauss_jordan")

            elif opcion == "9":
                comparar_metodos(matrices, monitor)

            elif opcion == "10":
                monitor.mostrar()

            elif opcion == "11":
                print("¡Hasta luego!")
                break

            else:
                print("Opción no válida, intenta de nuevo.")
    finally:
        # Pase lo que pase (salida normal, error o Ctrl+C), apagamos el
        # hilo de monitoreo para no dejar nada corriendo en segundo plano.
        monitor.detener()


if __name__ == "__main__":
    main()


# Actualiza gauss_jordan para retornar la matriz y sus columnas pivote
def gauss_jordan(matriz):
    m = [fila[:] for fila in matriz]
    filas = len(m)
    columnas = len(m[0])
    paso = 1
    columnas_pivote = []

    fila_pivote = 0
    for col in range(columnas - 1):
        if fila_pivote >= filas:
            break

        if m[fila_pivote][col] == 0:
            for f in range(fila_pivote + 1, filas):
                if m[f][col] != 0:
                    m[fila_pivote], m[f] = m[f], m[fila_pivote]
                    print(f"\nPaso {paso}: F{fila_pivote+1} <-> F{f+1}")
                    mostrar_matriz(m)
                    paso += 1
                    break

        if m[fila_pivote][col] == 0:
            continue

        columnas_pivote.append(col)  # Columna pivote identificada

        pivote = m[fila_pivote][col]
        if pivote != 1:
            for c in range(columnas):
                m[fila_pivote][c] = m[fila_pivote][c] / pivote
            print(f"\nPaso {paso}: F{fila_pivote+1} = F{fila_pivote+1} / {formatear(pivote)}")
            mostrar_matriz(m)
            paso += 1

        for f in range(filas):
            if f != fila_pivote:
                factor = m[f][col]
                if factor != 0:
                    for c in range(columnas):
                        m[f][c] = m[f][c] - factor * m[fila_pivote][c]
                    if factor > 0:
                        print(f"\nPaso {paso}: F{f+1} = F{f+1} - ({formatear(factor)})F{fila_pivote+1}")
                    else:
                        print(f"\nPaso {paso}: F{f+1} = F{f+1} + ({formatear(abs(factor))})F{fila_pivote+1}")
                    mostrar_matriz(m)
                    paso += 1

        fila_pivote += 1

    return m, columnas_pivote


# Aplica el mismo retorno en gauss_eliminacion
def gauss_eliminacion(matriz):
    m = [fila[:] for fila in matriz]
    filas = len(m)
    columnas = len(m[0])
    paso = 1
    columnas_pivote = []

    fila_pivote = 0
    for col in range(columnas - 1):
        if fila_pivote >= filas:
            break

        if m[fila_pivote][col] == 0:
            for f in range(fila_pivote + 1, filas):
                if m[f][col] != 0:
                    m[fila_pivote], m[f] = m[f], m[fila_pivote]
                    print(f"\nPaso {paso}: F{fila_pivote+1} <-> F{f+1}")
                    mostrar_matriz(m)
                    paso += 1
                    break

        if m[fila_pivote][col] == 0:
            continue

        columnas_pivote.append(col)  # Columna pivote identificada
        pivote = m[fila_pivote][col]

        for f in range(fila_pivote + 1, filas):
            factor = m[f][col] / pivote
            if factor != 0:
                for c in range(columnas):
                    m[f][c] = m[f][c] - factor * m[fila_pivote][c]
                if factor > 0:
                    print(f"\nPaso {paso}: F{f+1} = F{f+1} - ({formatear(factor)})F{fila_pivote+1}")
                else:
                    print(f"\nPaso {paso}: F{f+1} = F{f+1} + ({formatear(abs(factor))})F{fila_pivote+1}")
                mostrar_matriz(m)
                paso += 1

        fila_pivote += 1

    return m, columnas_pivote


# Muestra las columnas identificadas en resolver_sistema
def resolver_sistema(matrices, monitor, metodo):
    indice = elegir_matriz(matrices, "¿Qué matriz (sistema) quieres resolver? (número): ")
    if indice is None:
        return

    ecuaciones_originales = guardar_copia_matriz(matrices[indice])

    print(f"\n--- Procedimiento ({'Gauss' if metodo == 'gauss' else 'Gauss-Jordan'}) ---")
    if metodo == "gauss":
        matriz_resuelta, pivotes = gauss_eliminacion(matrices[indice])
    else:
        matriz_resuelta, pivotes = gauss_jordan(matrices[indice])

    print("\nMatriz final:")
    mostrar_matriz(matriz_resuelta)

    # Impresión de columnas pivote e identificación de variables
    cols_str = ", ".join([f"Columna {c+1} (X{c+1})" for c in pivotes])
    print(f"\nColumnas pivote identificadas: {cols_str if cols_str else 'Ninguna'}")

    soluciones = obtener_soluciones(matriz_resuelta)
    print("\nSoluciones:")
    mostrar_soluciones(soluciones)

    verificar_solucion(ecuaciones_originales, soluciones)
    monitor.mostrar()