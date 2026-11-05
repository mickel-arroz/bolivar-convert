from utils import parse_bcv_number


def get_eur(soup):
    """Extrae el precio del Euro (EUR) del objeto BeautifulSoup del BCV."""
    eur_div = soup.find("div", id="euro")
    if eur_div:
        strong_tag = eur_div.find("strong")
        if strong_tag:
            return parse_bcv_number(strong_tag.text)
    return None
