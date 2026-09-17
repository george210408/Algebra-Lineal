"""
PROYECTO: Álgebra Lineal - Operaciones Vectoriales y Matriciales
UAM - FIA
Asignatura: Álgebra Lineal
"""

# =============================================================================
# MÓDULO 1: VECTORES EN Rn
# =============================================================================

def sumar_vectores(u, v):
    """
    Suma de dos vectores en Rn.
    Procedimiento Algebraico: w_i = u_i + v_i para todo i desde 1 hasta n.
    """
    if len(u) != len(v):
        raise ValueError("Los vectores deben tener la misma dimensión.")
    return [u[i] + v[i] for i in range(len(u))]

def restar_vectores(u, v):
    """
    Resta de dos vectores en Rn.
    Procedimiento Algebraico: w_i = u_i - v_i para todo i desde 1 hasta n.
    """
    if len(u) != len(v):
        raise ValueError("Los vectores deben tener la misma dimensión.")
    return [u[i] - v[i] for i in range(len(u))]

def multiplicar_vector_escalar(k, v):
    """
    Multiplicación de un vector por un escalar.
    Procedimiento Algebraico: w_i = k * v_i para todo i desde 1 hasta n.
    """
    return [k * x for x in v]

def es_combinacion_lineal(b, vectores):
    """
    Verifica si el vector b es combinación lineal de {v1, v2, ..., vk}.

    Procedimiento Algebraico:
    1. Se plantea la ecuación vectorial: c1*v1 + c2*v2 + ... + ck*vk = b.
    2. Esto se convierte en un sistema de ecuaciones lineales Ax = b, donde A
       es la matriz cuyas columnas son los vectores vi.
    3. Se resuelve el sistema mediante Gauss-Jordan.
    4. Si el sistema tiene solución (única o infinitas), b es combinación lineal.
    """
    # Validar dimensiones
    dim_b = len(b)
    for v in vectores:
        if len(v) != dim_b:
            return False, "Los vectores deben tener la misma dimensión que el vector b."

    # Construir la matriz aumentada [A | b]
    # A es la matriz donde cada columna es un vector vi
    matriz_aumentada = []
    for i in range(dim_b):
        fila = []
        for v in vectores:
            fila.append(v[i])
        fila.append(b[i])
        matriz_aumentada.append(fila)

    # Resolver usando el motor de Gauss-Jordan implementado abajo
    try:
        # Usamos la función interna de resolución
        resultado = resolver_sistema_gj(matriz_aumentada)
        if resultado['status'] == 'sin-solucion':
            return False, "El sistema es inconsistente."
        return True, f"Es combinación lineal. Solución de coeficientes: {resultado['soluciones']}"
    except Exception as e:
        return False, f"Error en el cálculo: {str(e)}"

# =============================================================================
# MÓDULO 2: OPERACIONES MATRICIALES BÁSICAS
# =============================================================================

def sumar_matrices(A, B):
    """
    Suma de matrices A + B.
    Procedimiento Algebraico: C_ij = A_ij + B_ij.
    """
    if len(A) != len(B) or len(A[0]) != len(B[0]):
        raise ValueError("Las matrices deben tener las mismas dimensiones mxn.")

    filas = len(A)
    cols = len(A[0])
    C = []
    for i in range(filas):
        fila = [A[i][j] + B[i][j] for j in range(cols)]
        C.append(fila)
    return C

def restar_matrices(A, B):
    """
    Resta de matrices A - B.
    Procedimiento Algebraico: C_ij = A_ij - B_ij.
    """
    if len(A) != len(B) or len(A[0]) != len(B[0]):
        raise ValueError("Las matrices deben tener las mismas dimensiones mxn.")

    filas = len(A)
    cols = len(A[0])
    C = []
    for i in range(filas):
        fila = [A[i][j] - B[i][j] for j in range(cols)]
        C.append(fila)
    return C

def multiplicar_matriz_escalar(k, A):
    """
    Multiplicación de matriz por escalar kA.
    Procedimiento Algebraico: C_ij = k * A_ij.
    """
    return [[k * val for val in fila] for fila in A]

def multiplicar_matrices(A, B):
    """
    Multiplicación de matrices A(m x n) * B(n x p).
    Procedimiento Algebraico: C_ij = sum(A_ik * B_kj) para k=1 hasta n.
    """
    filas_A = len(A)
    cols_A = len(A[0])
    filas_B = len(B)
    cols_B = len(B[0])

    if cols_A != filas_B:
        raise ValueError("Las columnas de A deben ser iguales a las filas de B.")

    C = []
    for i in range(filas_A):
        fila_C = []
        for j in range(cols_B):
            suma = 0
            for k in range(cols_A):
                suma += A[i][k] * B[k][j]
            fila_C.append(suma)
        C.append(fila_C)
    return C

# =============================================================================
# MÓDULO 3: ECUACIONES MATRICIALES (Integración de Gauss-Jordan)
# =============================================================================

def resolver_sistema_gj(matriz):
    """
    Resuelve un sistema Ax=b usando Gauss-Jordan.
    Retorna un diccionario con el status y las soluciones.
    """
    m = [fila[:] for fila in matriz]
    filas = len(m)
    cols = len(m[0])

    fila_pivote = 0
    for col in range(cols - 1):
        if fila_pivote >= filas: break

        # Pivotaje
        if abs(m[fila_pivote][col]) < 1e-9:
            for f in range(fila_pivote + 1, filas):
                if abs(m[f][col]) > 1e-9:
                    m[fila_pivote], m[f] = m[f], m[fila_pivote]
                    break

        if abs(m[fila_pivote][col]) < 1e-9: continue

        # Normalizar pivote
        piv = m[fila_pivote][col]
        for c in range(cols):
            m[fila_pivote][c] /= piv

        # Eliminar arriba y abajo
        for f in range(filas):
            if f != fila_pivote:
                factor = m[f][col]
                for c in range(cols):
                    m[f][c] -= factor * m[fila_pivote][c]
        fila_pivote += 1

    # Análisis de solución
    n_vars = cols - 1
    soluciones = [None] * n_vars

    # Verificar inconsistencia
    for f in range(filas):
        todos_ceros = True
        for c in range(n_vars):
            if abs(m[f][c]) > 1e-9: todos_ceros = False; break
        if todos_ceros and abs(m[f][n_vars]) > 1e-9:
            return {'status': 'sin-solucion', 'soluciones': None}

    # Extraer soluciones
    for f in range(filas):
        pivote_col = -1
        for c in range(n_vars):
            if abs(m[f][c] - 1.0) < 1e-9:
                # Verificar que sea el único no cero en su columna para solución única
                pivote_col = c
                break
        if pivote_col != -1:
            soluciones[pivote_col] = m[f][n_vars]

    if any(s is None for s in soluciones):
        return {'status': 'infinitas', 'soluciones': soluciones}

    return {'status': 'unica', 'soluciones': soluciones}

def resolver_ecuacion_matricial(A, b):
    """
    Resuelve la ecuación matricial Ax = b.
    Procedimiento Algebraico: Se construye la matriz aumentada [A | b]
    y se resuelve mediante el método de Gauss-Jordan.
    """
    # Validar dimensiones
    if len(A) != len(b):
        raise ValueError("La cantidad de filas de A debe coincidir con la dimensión de b.")

    # Construir matriz aumentada
    matriz_aumentada = []
    for i in range(len(A)):
        matriz_aumentada.append(A[i] + [b[i]])

    return resolver_sistema_gj(matriz_aumentada)

# =============================================================================
# FUNCIONES DE SOPORTE Y VISUALIZACIÓN
# =============================================================================

def imprimir_matriz(nombre, matriz):
    print(f"\\n{nombre}:")
    for fila in matriz:
        print([round(x, 2) for x in fila])

def imprimir_vector(nombre, v):
    print(f"\\n{nombre}: {[round(x, 2) for x in v]}")

# =============================================================================
# PROGRAMA PRINCIPAL (DEMOSTRACIÓN)
# =============================================================================

if __name__ == "__main__":
    print("=== DEMOSTRACIÓN DE ÁLGEBRA LINEAL COMPLETA ===")

    # 1. Vectores
    v1 = [1, 2, 3]
    v2 = [4, 5, 6]
    b_vec = [7, 8, 9]
    imprimir_vector("Vector v1", v1)
    imprimir_vector("Vector v2", v2)
    imprimir_vector("Vector b", b_vec)

    print("\\n--- Operaciones Vectoriales ---")
    imprimir_vector("Suma v1+v2", sumar_vectores(v1, v2))
    imprimir_vector("Escalar 2*v1", multiplicar_vector_escalar(2, v1))

    res_cl, msg_cl = es_combinacion_lineal(b_vec, [v1, v2])
    print(f"¿b es combinación lineal de {{v1, v2}}? {res_cl} -> {msg_cl}")

    # 2. Matrices
    M1 = [[1, 2], [3, 4]]
    M2 = [[5, 6], [7, 8]]
    imprimir_matriz("Matriz M1", M1)
    imprimir_matriz("Matriz M2", M2)

    print("\\n--- Operaciones Matriciales ---")
    imprimir_matriz("Suma M1+M2", sumar_matrices(M1, M2))
    imprimir_matriz("Mult M1*M2", multiplicar_matrices(M1, M2))

    # 3. Ecuación Matricial Ax = b
    A = [[2, 1], [1, -1]]
    b = [5, 1]
    imprimir_matriz("Matriz A", A)
    imprimir_vector("Vector b", b)

    res_eq = resolver_ecuacion_matricial(A, b)
    print(f"Solución de Ax=b: {res_eq['status']} -> {res_eq['soluciones']}")
