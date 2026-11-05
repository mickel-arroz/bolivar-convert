from utils import parse_bcv_number


def get_usd(soup):
    """Extrae el precio del Dólar (USD) del objeto BeautifulSoup del BCV."""
    usd_div = soup.find("div", id="dolar")
    if usd_div:
        strong_tag = usd_div.find("strong")
        if strong_tag:
            return parse_bcv_number(strong_tag.text)
    return None
