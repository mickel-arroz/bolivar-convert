import requests
import json

def debug_binance():
    url = "https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search"
    headers = {
        "Accept": "*/*",
        "Accept-Encoding": "gzip, deflate, br",
        "Accept-Language": "en-US,en;q=0.9",
        "Content-Type": "application/json",
        "Origin": "https://p2p.binance.com",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
    }
    
    payload_buy = {
        "fiat": "VES", "page": 1, "rows": 20, "tradeType": "BUY", "asset": "USDT",
        "countries": [], "proMerchantAds": False, "shieldMerchantAds": False,
        "filterType": "all", "periods": [], "additionalKycVerifyFilter": 0,
        "publisherType": "merchant", "payTypes": [], "classifies": ["mass", "profession", "user"]
    }
    
    payload_sell = {
        "fiat": "VES", "page": 1, "rows": 20, "tradeType": "SELL", "asset": "USDT",
        "countries": [], "proMerchantAds": False, "shieldMerchantAds": False,
        "filterType": "all", "periods": [], "additionalKycVerifyFilter": 0,
        "publisherType": "merchant", "payTypes": [], "classifies": ["mass", "profession", "user"]
    }
    
    try:
        print("--- COMPRA (Tú compras USDT, comerciantes verificados) ---")
        res_buy_raw = requests.post(url, headers=headers, json=payload_buy).json()
        buy_items = res_buy_raw.get("data") or []
        if not buy_items:
             print("No data received for BUY:", res_buy_raw)
        
        valid_buy_items = [item for item in buy_items if not item.get("adv", {}).get("isPromo", False)]
        valid_buy_items.sort(key=lambda x: float(x["adv"]["price"]))
        
        for i, item in enumerate(valid_buy_items[:20]):
            adv = item["adv"]
            advertiser = item["advertiser"]
            print(f"{i+1}. {advertiser['nickName']} - Precio: {adv['price']} - Min: {adv['minSingleTransAmount']}")
            
        print("\n--- VENTA (Tú vendes USDT, comerciantes verificados) ---")
        res_sell_raw = requests.post(url, headers=headers, json=payload_sell).json()
        sell_items = res_sell_raw.get("data") or []
        if not sell_items:
             print("No data received for SELL:", res_sell_raw)
             
        valid_sell_items = [item for item in sell_items if not item.get("adv", {}).get("isPromo", False)]
        valid_sell_items.sort(key=lambda x: float(x["adv"]["price"]), reverse=True)
        
        for i, item in enumerate(valid_sell_items[:20]):
            adv = item["adv"]
            advertiser = item["advertiser"]
            print(f"{i+1}. {advertiser['nickName']} - Precio: {adv['price']} - Min: {adv['minSingleTransAmount']}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    debug_binance()
