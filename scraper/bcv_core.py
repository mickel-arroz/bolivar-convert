import requests
from bs4 import BeautifulSoup
from utils import retry
from datetime import datetime

# Desactivar warnings de certificados SSL para el BCV
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

@retry(attempts=3, delay=5)
def fetch_bcv_html():
    """Descarga y parsea el HTML de la página del Banco Central de Venezuela."""
    url = "https://www.bcv.org.ve/"
    response = requests.get(url, verify=False, timeout=15)
    response.raise_for_status()
    return BeautifulSoup(response.content, "html.parser")

def extract_fecha_valor(soup):
    """
    Extrae y convierte la 'Fecha Valor' del HTML del BCV a un formato de fecha (YYYY-MM-DD).
    """
    date_span = soup.find("span", class_="date-display-single")
    if not date_span:
        return None
        
    date_str = date_span.text.strip().lower()
    
    # Mapeo de meses en español
    meses = {
        "enero": "01", "febrero": "02", "marzo": "03", "abril": "04",
        "mayo": "05", "junio": "06", "julio": "07", "agosto": "08",
        "septiembre": "09", "octubre": "10", "noviembre": "11", "diciembre": "12"
    }
    
    # El formato suele ser "Viernes, 05 Julio 2024" o similar
    # Vamos a extraer los números y la palabra clave
    partes = date_str.replace(",", "").split()
    
    dia = "01"
    mes = "01"
    anio = str(datetime.now().year)
    
    for parte in partes:
        if parte.isdigit() and len(parte) <= 2:
            dia = parte.zfill(2)
        elif parte.isdigit() and len(parte) == 4:
            anio = parte
        elif parte in meses:
            mes = meses[parte]
            
    try:
        # Devolvemos un objeto date o un ISO string
        fecha_obj = datetime.strptime(f"{anio}-{mes}-{dia}", "%Y-%m-%d").date()
        return fecha_obj
    except Exception as e:
        print("Error parseando fecha:", e)
        return None
