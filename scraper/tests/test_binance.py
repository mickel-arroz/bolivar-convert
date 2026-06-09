import pytest
import sys
import os
import responses

# Add the parent directory (scraper) to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from binance import get_usdt_avg

@responses.activate
def test_binance_median_calculation():
    """
    Tests that the Binance P2P extraction correctly calculates the median,
    ignoring outliers like 1050, and correctly filters out promoted ads.
    """
    url = "https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search"
    
    # Mock BUY response (cheaper prices first mathematically, but API could return any order)
    # 5 standard valid ads, 1 promo ad
    buy_mock_data = {
        "data": [
            {"adv": {"price": "36.10", "isPromo": False}},
            {"adv": {"price": "36.15", "isPromo": False}},
            {"adv": {"price": "35.00", "isPromo": True}}, # Promo ad (should be ignored)
            {"adv": {"price": "36.20", "isPromo": False}},
            {"adv": {"price": "36.25", "isPromo": False}},
            {"adv": {"price": "36.30", "isPromo": False}},
        ]
    }
    
    # Mock SELL response
    # 4 standard valid ads, 1 extreme outlier (1050)
    sell_mock_data = {
        "data": [
            {"adv": {"price": "1050.00", "isPromo": False}}, # Outlier
            {"adv": {"price": "36.80", "isPromo": False}},
            {"adv": {"price": "36.75", "isPromo": False}},
            {"adv": {"price": "36.70", "isPromo": False}},
            {"adv": {"price": "36.65", "isPromo": False}},
        ]
    }

    # Add responses for the two POST requests (Buy then Sell)
    responses.add(responses.POST, url, json=buy_mock_data, status=200)
    responses.add(responses.POST, url, json=sell_mock_data, status=200)

    # Valid Buy prices will be: [36.10, 36.15, 36.20, 36.25, 36.30]
    # Valid Sell prices will be: [1050.0, 36.80, 36.75, 36.70, 36.65] -> [1050.0, 36.80, 36.75, 36.70, 36.65]
    # Total combined valid pool: [36.10, 36.15, 36.20, 36.25, 36.30, 36.65, 36.70, 36.75, 36.80, 1050.0]
    # Sorted valid pool: [36.10, 36.15, 36.20, 36.25, 36.30, 36.65, 36.70, 36.75, 36.80, 1050.0]
    # The median of 10 items is the average of the 5th and 6th elements:
    # 5th element = 36.30
    # 6th element = 36.65
    # (36.30 + 36.65) / 2 = 36.475
    
    result = get_usdt_avg()
    
    assert result == 36.47 # round(36.475, 2) in Python 3 is 36.47 (bankers rounding)
