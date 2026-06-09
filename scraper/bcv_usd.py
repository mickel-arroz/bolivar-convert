def get_usd(soup):
    """Extrae el precio del Dólar (USD) del objeto BeautifulSoup del BCV."""
    usd_div = soup.find("div", id="dolar")
    if usd_div:
        strong_tag = usd_div.find("strong")
        if strong_tag:
            val_str = strong_tag.text.strip().replace(",", ".")
            return float(val_str)
    return None
