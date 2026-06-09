import pytest
from bs4 import BeautifulSoup
import sys
import os
from datetime import date

# Add the parent directory (scraper) to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from bcv_usd import get_usd
from bcv_eur import get_eur
from bcv_core import extract_fecha_valor

def test_bcv_usd_extraction():
    # Mocking the HTML structure of BCV for USD
    html = '''
    <div id="dolar" class="col-sm-12 col-xs-12 "> 
        <div class="field-content"> 
            <div class="row recuadrotsmc"> 
                <div class="col-sm-6 col-xs-6 centrado textp"> 
                    <strong class="strong-tb">36,54320000</strong> 
                </div> 
            </div> 
        </div> 
    </div>
    '''
    soup = BeautifulSoup(html, "html.parser")
    usd_val = get_usd(soup)
    assert usd_val == 36.5432

def test_bcv_eur_extraction():
    # Mocking the HTML structure of BCV for EUR
    html = '''
    <div id="euro" class="col-sm-12 col-xs-12 "> 
        <div class="field-content"> 
            <div class="row recuadrotsmc"> 
                <div class="col-sm-6 col-xs-6 centrado textp"> 
                    <strong class="strong-tb">39,81200000</strong> 
                </div> 
            </div> 
        </div> 
    </div>
    '''
    soup = BeautifulSoup(html, "html.parser")
    eur_val = get_eur(soup)
    assert eur_val == 39.812

def test_fecha_valor_extraction():
    # Mocking the HTML structure of BCV for Date
    html = '''
    <div class="date-display-single">
        <span class="date-display-single">Viernes, 05 Julio 2024</span>
    </div>
    '''
    soup = BeautifulSoup(html, "html.parser")
    extracted_date = extract_fecha_valor(soup)
    
    # Assert it returns a datetime.date object corresponding to 2024-07-05
    assert isinstance(extracted_date, date)
    assert extracted_date.year == 2024
    assert extracted_date.month == 7
    assert extracted_date.day == 5

def test_fecha_valor_returns_none_on_missing_html():
    html = '<div><p>No date here</p></div>'
    soup = BeautifulSoup(html, "html.parser")
    assert extract_fecha_valor(soup) is None
