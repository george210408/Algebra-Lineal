"""
Módulo de conversión de sistemas numéricos.

Este módulo permite convertir números decimales a binarios, octales y hexadecimales,
y viceversa, utilizando únicamente Python estándar (listas, bucles, condiciones y funciones),
sin recurrir a librerías externas como numpy, scipy o funciones avanzadas de math.
"""

def decimal_a_binario(n):
    """
    Convierte un número decimal entero a su representación binaria.

    Procedimiento Algebraico:
    1. Se divide el número decimal entre 2 sucesivamente.
    2. En cada paso, se anota el residuo (0 o 1).
    3. El proceso continúa hasta que el cociente sea 0.
    4. El número binario se forma leyendo los residuos en orden inverso (del último al primero).

    Ejemplo: 13 / 2 = 6 (res 1), 6 / 2 = 3 (res 0), 3 / 2 = 1 (res 1), 1 / 2 = 0 (res 1).
    Resultado: 1101
    """
    if n == 0:
        return "0"

    residuos = []
    while n > 0:
        residuos.append(str(n % 2))
        n = n // 2

    # Invertir la lista para obtener el orden correcto (de más a menos significativo)
    binario = ""
    for i in range(len(residuos) - 1, -1, -1):
        binario += residuos[i]

    return binario

def binario_a_decimal(b):
    """
    Convierte un número binario (cadena) a su representación decimal.

    Procedimiento Algebraico:
    1. Se identifica la posición de cada dígito (empezando por 0 desde la derecha).
    2. Se multiplica cada dígito (0 o 1) por la base (2) elevada a la potencia de su posición.
    3. Se suman todos los resultados obtenidos.

    Ejemplo: 1101 -> (1 * 2^3) + (1 * 2^2) + (0 * 2^1) + (1 * 2^0) = 8 + 4 + 0 + 1 = 13
    """
    decimal = 0
    b = str(b)
    longitud = len(b)

    for i in range(longitud):
        digito = int(b[longitud - 1 - i])
        decimal += digito * (2 ** i)

    return decimal

def decimal_a_octal(n):
    """
    Convierte un número decimal entero a su representación octal.

    Procedimiento Algebraico:
    1. Se divide el número decimal entre 8 sucesivamente.
    2. En cada paso, se anota el residuo (0 al 7).
    3. El proceso continúa hasta que el cociente sea 0.
    4. El número octal se forma leyendo los residuos en orden inverso.
    """
    if n == 0:
        return "0"

    residuos = []
    while n > 0:
        residuos.append(str(n % 8))
        n = n // 8

    octal = ""
    for i in range(len(residuos) - 1, -1, -1):
        octal += residuos[i]

    return octal

def octal_a_decimal(o):
    """
    Convierte un número octal (cadena) a su representación decimal.

    Procedimiento Algebraico:
    1. Se identifica la posición de cada dígito (empezando por 0 desde la derecha).
    2. Se multiplica cada dígito por la base (8) elevada a la potencia de su posición.
    3. Se suman todos los resultados.
    """
    decimal = 0
    o = str(o)
    longitud = len(o)

    for i in range(longitud):
        digito = int(o[longitud - 1 - i])
        decimal += digito * (8 ** i)

    return decimal

def decimal_a_hexadecimal(n):
    """
    Convierte un número decimal entero a su representación hexadecimal.

    Procedimiento Algebraico:
    1. Se divide el número decimal entre 16 sucesivamente.
    2. En cada paso, se anota el residuo (0 al 15).
    3. Si el residuo es >= 10, se sustituye por la letra correspondiente (10=A, 11=B, 12=C, 13=D, 14=E, 15=F).
    4. El número hexadecimal se forma leyendo los residuos en orden inverso.
    """
    if n == 0:
        return "0"

    digitos_hex = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F']
    residuos = []

    while n > 0:
        residuos.append(digitos_hex[n % 16])
        n = n // 16

    hexadecimal = ""
    for i in range(len(residuos) - 1, -1, -1):
        hexadecimal += residuos[i]

    return hexadecimal

def hexadecimal_a_decimal(h):
    """
    Convierte un número hexadecimal (cadena) a su representación decimal.

    Procedimiento Algebraico:
    1. Se convierte cada dígito hexadecimal a su valor numérico (A=10, B=11, ..., F=15).
    2. Se identifica la posición de cada dígito (empezando por 0 desde la derecha).
    3. Se multiplica cada valor por la base (16) elevada a la potencia de su posición.
    4. Se suman todos los resultados.
    """
    digitos_hex = {'0':0, '1':1, '2':2, '3':3, '4':4, '5':5, '6':6, '7':7, '8':8, '9':9,
                   'A':10, 'B':11, 'C':12, 'D':13, 'E':14, 'F':15,
                   'a':10, 'b':11, 'c':12, 'd':13, 'e':14, 'f':15}
    decimal = 0
    h = str(h)
    longitud = len(h)

    for i in range(longitud):
        digito_char = h[longitud - 1 - i]
        valor = digitos_hex[digito_char]
        decimal += valor * (16 ** i)

    return decimal
