import time
from functools import wraps
import requests

def retry(attempts=3, delay=2):
    """
    Decorador para reintentar la ejecución de una función si lanza una excepción.
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(1, attempts + 1):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    print(f"[Intento {attempt}/{attempts}] Falló la ejecución de {func.__name__}: {e}")
                    if attempt == attempts:
                        print(f"Error definitivo en {func.__name__} después de {attempts} intentos.")
                        raise
                    time.sleep(delay)
        return wrapper
    return decorator
