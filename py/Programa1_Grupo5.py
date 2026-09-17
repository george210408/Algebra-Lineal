def imprimir_matriz(matriz):
    """Imprime la matriz aumentada de forma ordenada"""
    for fila in matriz:
        print(["{:.2f}".format(x) for x in fila])
    print()

def eliminacion_por_filas(matriz):
    """Realiza el proceso de eliminación por filas paso a paso"""
    filas = len(matriz)
    columnas = len(matriz[0])

    for i in range(filas):
        # Paso 1: Verificar si el pivote es cero
        if matriz[i][i] == 0:
            for k in range(i+1, filas):
                if matriz[k][i] != 0:
                    matriz[i], matriz[k] = matriz[k], matriz[i]
                    break

        # Paso 2: Normalizar el pivote
        pivote = matriz[i][i]
        if pivote != 0:
            for j in range(i, columnas):
                matriz[i][j] /= pivote

        imprimir_matriz(matriz)

        # Paso 3: Eliminar hacia abajo
        for k in range(i+1, filas):
            factor = matriz[k][i]
            for j in range(i, columnas):
                matriz[k][j] -= factor * matriz[i][j]

        imprimir_matriz(matriz)

    return matriz

def clasificar_sistema(matriz):
    """Clasifica el sistema según sus soluciones"""
    filas = len(matriz)
    columnas = len(matriz[0])

    # Revisar filas inconsistentes
    for fila in matriz:
        if all(abs(x) < 1e-9 for x in fila[:-1]) and abs(fila[-1]) > 1e-9:
            return "Sistema Inconsistente: Sin Solución"

    # Revisar si hay menos ecuaciones independientes que variables
    rango = sum(any(abs(x) > 1e-9 for x in fila) for fila in matriz)
    if rango < columnas - 1:
        return "Sistema Consistente Indeterminado: Infinitas Soluciones"

    return "Sistema Consistente Determinado: Solución Única"

def sustitucion_regresiva(matriz):
    """Obtiene la solución única si existe"""
    filas = len(matriz)
    columnas = len(matriz[0])
    soluciones = [0] * (columnas - 1)

    for i in range(filas-1, -1, -1):
        suma = matriz[i][-1]
        for j in range(i+1, columnas-1):
            suma -= matriz[i][j] * soluciones[j]
        soluciones[i] = suma / matriz[i][i]

    return soluciones

# ------------------ PROGRAMA PRINCIPAL ------------------
print("=== Calculadora de Sistemas de Ecuaciones Lineales ===")
m = int(input("Ingrese el número de ecuaciones: "))
n = int(input("Ingrese el número de variables: "))

matriz = []
print("Ingrese los coeficientes de la matriz aumentada (A|b):")
for i in range(m):
    fila = list(map(float, input(f"Fila {i+1}: ").split()))
    matriz.append(fila)

print("\nMatriz aumentada inicial:")
imprimir_matriz(matriz)

matriz = eliminacion_por_filas(matriz)
clasificacion = clasificar_sistema(matriz)
print("\nClasificación del sistema:", clasificacion)

if "Única" in clasificacion:
    soluciones = sustitucion_regresiva(matriz)
    print("Solución encontrada:", soluciones)

    # Verificación
    print("\nVerificación:")
    for i in range(m):
        lhs = sum(matriz[i][j] * soluciones[j] for j in range(n))
        print(f"Ecuación {i+1}: {lhs:.2f} = {matriz[i][-1]:.2f}")