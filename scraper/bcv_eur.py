def get_eur(soup):
    """Extrae el precio del Euro (EUR) del objeto BeautifulSoup del BCV."""
    eur_div = soup.find("div", id="euro")
    if eur_div:
        strong_tag = eur_div.find("strong")
        if strong_tag:
            val_str = strong_tag.text.strip().replace(",", ".")
            return float(val_str)
    return None
