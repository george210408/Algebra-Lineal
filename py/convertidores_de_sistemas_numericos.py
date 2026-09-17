"""
PROYECTO: Módulo de Conversión de Sistemas Numéricos
UAM - FIA
Asignatura: [Asignatura, ej. Programación/Matemáticas]
Docente: [Nombre del Docente]
Grupo: [Tu Grupo]
Integrantes: [Tus Nombres]

DESCRIPCIÓN:
Este programa permite la conversión bidireccional entre el sistema decimal
y los sistemas binario, octal y hexadecimal, mostrando el procedimiento
algebraico mediante combinaciones lineales.
"""

# =============================================================================
# MÓDULO DE CONVERSIONES
# =============================================================================

def decimal_a_base(n, base):
    """
    Convierte un número decimal entero a una base específica (2, 8, 16).

    Procedimiento Algebraico:
    1. Se divide el número decimal entre la base elegida sucesivamente.
    2. Se registran los residuos de cada división.
    3. El proceso termina cuando el cociente es 0.
    4. El número en la base destino se forma leyendo los residuos en orden inverso.
    """
    if n == 0:
        return "0"

    # Definición de caracteres para base 16
    digitos_hex = "0123456789ABCDEF"
    residuos = []

    temp_n = n
    while temp_n > 0:
        residuos.append(digitos_hex[temp_n % base])
        temp_n = temp_n // base

    # Invertimos la lista de residuos para obtener el número correcto
    return "".join(residuos[::-1])

def base_a_decimal(numero_str, base):
    """
    Convierte un número de una base específica (2, 8, 16) a decimal.
    Muestra la combinación lineal que genera el resultado.

    Procedimiento Algebraico:
    1. Se identifica la posición 'i' de cada dígito empezando desde 0 a la derecha.
    2. Se multiplica el valor del dígito por la base elevada a la potencia de su posición: (dígito * base^i).
    3. Se suman todos estos términos para obtener el valor decimal.
    """
    digitos_hex = "0123456789ABCDEF"
    numero_str = numero_str.upper()
    decimal = 0
    combinacion_lineal = []

    # Recorremos el número de derecha a izquierda
    for i in range(len(numero_str)):
        char = numero_str[len(numero_str) - 1 - i]

        # Obtener valor numérico del carácter
        valor = digitos_hex.find(char)

        if valor == -1 or (base == 2 and valor > 1) or (base == 8 and valor > 7):
            raise ValueError(f"El carácter '{char}' no es válido para la base {base}.")

        termino = valor * (base ** i)
        decimal += termino

        # Guardamos el formato para mostrar la combinación lineal
        combinacion_lineal.append(f"({valor} * {base}^{i})")

    # Invertimos la combinación para mostrarla en orden natural (izquierda a derecha)
    combinacion_lineal.reverse()
    ## Proceso final de formato
    return decimal, " + ".join(combinacion_lineal)

# =============================================================================
# INTERFAZ DE USUARIO (ESTÉTICA)
# =============================================================================

def mostrar_menu():
    print("\n" + "="*50)
    print("     SISTEMA DE CONVERSIÓN DE NÚMEROS - UAM FIA")
    print("="*50)
    print("1. Decimal  --->  Binario / Octal / Hexadecimal")
    print("2. Binario/Octal/Hex  --->  Decimal")
    print("3. Salir")
    print("-" * 50)

def menu_decimal_a_base():
    try:
        n = int(input("\nIngrese el número decimal: "))
        print("\nSeleccione la base de destino:")
        print("2. Binario")
        print("8. Octal")
        print("16. Hexadecimal")
        base = int(input("Base: "))

        if base not in [2, 8, 16]:
            print("Error: Base no soportada. Use 2, 8 o 16.")
            return

        resultado = decimal_a_base(n, base)
        print(f"\n>>> Resultado: {n} (dec) = {resultado} (base {base})")
    except ValueError:
        print("Error: Ingrese solo números enteros.")

def menu_base_a_decimal():
    try:
        print("\nSeleccione la base de origen:")
        print("2. Binario")
        print("8. Octal")
        print("16. Hexadecimal")
        base = int(input("Base: "))

        if base not in [2, 8, 16]:
            print("Error: Base no soportada. Use 2, 8 o 16.")
            return

        numero = input(f"Ingrese el número en base {base}: ")
        decimal, proceso = base_a_decimal(numero, base)

        print("\n--- Procedimiento Algebraico (Combinación Lineal) ---")
        print(f"  {proceso} = {decimal}")
        print(f"\n>>> Resultado: {numero} (base {base}) = {decimal} (decimal)")
    except ValueError as e:
        print(f"Error: {e}")

def main():
    while True:
        mostrar_menu()
        opcion = input("Elija una opción: ")

        if opcion == "1":
            menu_decimal_a_base()
        elif opcion == "2":
            menu_base_a_decimal()
        elif opcion == "3":
            print("\nSaliendo del programa... ¡Hasta luego!")
            break
        else:
            print("Opción no válida, intente de nuevo.")

if __name__ == "__main__":
    main()
