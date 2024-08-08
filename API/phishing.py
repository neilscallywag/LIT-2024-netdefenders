import os
import requests
import numpy as np
import onnxruntime
from huggingface_hub import hf_hub_download
from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo.mongo_client import MongoClient
import logging
import ipaddress
import re
from bs4 import BeautifulSoup
import whois
import urllib
from urllib.parse import urlparse
from datetime import datetime
import json
from functools import lru_cache
from concurrent.futures import ThreadPoolExecutor
import cProfile
import pstats
import io
import tldextract
import pandas as pd
import multiprocessing

# Configure logging
logging.basicConfig(level=logging.INFO)

app = Flask(__name__)  # initialize a flask application

# MongoDB connection string
uri = os.getenv('MONGO_URI', "mongodb://localhost:27017/websites")
client = MongoClient(uri)
db = client["websites"]
collection = db["risk_rating"]

CORS(app)

# Downloading the pre-trained model from the Hugging Face Hub
REPO_ID = "pirocheto/phishing-url-detection"
FILENAME = "model.onnx"
model_path = hf_hub_download(repo_id=REPO_ID, filename=FILENAME)

# Initializing the ONNX Runtime session with the pre-trained model
sess = onnxruntime.InferenceSession(
    model_path,
    providers=["CPUExecutionProvider"],
)

executor = ThreadPoolExecutor(max_workers=10)
cache = {}

def populate_whitelist():
    whitelist_url = "https://raw.githubusercontent.com/cedwards4038/pihole-whitelist/main/whitelist.txt"
    response = requests.get(whitelist_url)
    if response.status_code != 200:
        logging.error("Failed to retrieve whitelist")
        return

    whitelist_data = response.text.splitlines()
    for line in whitelist_data:
        line = line.strip()
        if line and not line.startswith('#'):
            document = {
                "url": line,
                "safe_status": True,
                "probability": 0.0
            }
            collection.update_one({"url": line}, {"$set": document}, upsert=True)

def include_protocol(url):
    if not url.startswith('http://') and not url.startswith('https://'):
        url = 'https://' + url
    return url

def validate_url(url):
    try:
        response = requests.get(url, timeout=5)
        return response.status_code == 200
    except requests.exceptions.RequestException:
        return False

domain_rankings = None

def load_domain_rankings():
    global domain_rankings
    if domain_rankings is None:
        df = pd.read_csv('static/data/Bionic_Umbrella_042120.csv', usecols=[0, 1], header=None, skiprows=1)
        domain_rankings = dict(zip(df[1], df[0]))

def get_domain_rank(domain):
    load_domain_rankings()
    return domain_rankings.get(domain, 0)

@lru_cache(maxsize=1024)
def whois_data_cached(domain):
    try:
        whois_data = whois.whois(domain)
        creation_date = whois_data.creation_date
        if type(creation_date) is list:
            creation_date = creation_date[0]
        age = (datetime.now() - creation_date).days / 365 if creation_date else 'Not Given'
        return {'age': age, 'data': whois_data}
    except Exception as e:
        logging.error(f"Error: {e}")
        return False

def hsts_support(url):
    try:
        response = requests.get(url, timeout=5)
        return 'Strict-Transport-Security' in response.headers
    except:
        return False

def is_url_shortened(domain):
    try:
        with open('static/data/url-shorteners.txt') as f:
            services_arr = f.read().splitlines()
        return any(service in domain for service in services_arr)
    except:
        return False

def ip_present(url):
    try:
        ipaddress.ip_address(url)
        return True
    except ValueError:
        return False

def url_redirects(url):
    try:
        response = requests.get(url, timeout=5)
        return len(response.history) > 1
    except Exception as e:
        return False

def too_long_url(url):
    return len(url) > 75

def too_deep_url(url):
    return url.count('/') > 7

def calculate_trust_score(url):
    score = 50  # Starting score
    if not validate_url(url):
        score -= 20

    domain = urllib.parse.urlparse(url).netloc
    rank = get_domain_rank(domain)
    score += rank // 100000

    whois_info = whois_data_cached(domain)
    if whois_info and whois_info['age'] != 'Not Given':
        score += whois_info['age']

    if hsts_support(url):
        score += 10

    if is_url_shortened(domain):
        score -= 10

    if ip_present(url):
        score -= 10

    if url_redirects(url):
        score -= 10

    if too_long_url(url):
        score -= 5

    if too_deep_url(url):
        score -= 5

    return score

def process_url(url):
    if url in cache:
        return cache[url]

    document = collection.find_one({"url": url})
    if document:
        return document["safe_status"], document["probability"]

    trust_score = calculate_trust_score(url)
    inputs = np.array([url], dtype="str")
    results = sess.run(None, {"inputs": inputs})[1]
    proba = results[0][0]

    # Apply greedy logic
    if trust_score >= 60 and proba <= 0.5:
        safe_status = True
    elif trust_score < 40 or proba > 0.8:
        safe_status = False
    else:
        safe_status = bool(proba <= 0.7)

    cache[url] = (safe_status, float(proba))

    document = {
        "url": url,
        "trust_score": trust_score,
        "safe_status": safe_status,
        "probability": float(proba)  # Convert numpy.float to native Python float
    }
    collection.insert_one(document)

    return safe_status, float(proba)

def expand_url(url):
    try:
        response = requests.head(url, allow_redirects=True, timeout=5)
        return response.url
    except requests.RequestException:
        return url

def group_urls_by_domain(urls):
    domain_groups = {}
    for url in urls:
        parsed_url = urlparse(include_protocol(url))
        domain_info = tldextract.extract(parsed_url.netloc)
        domain = f"{domain_info.domain}.{domain_info.suffix}"
        if is_url_shortened(parsed_url.netloc):
            expanded_url = expand_url(url)
            parsed_expanded_url = urlparse(expanded_url)
            domain_info_expanded = tldextract.extract(parsed_expanded_url.netloc)
            domain = f"{domain_info_expanded.domain}.{domain_info_expanded.suffix}"
        if domain not in domain_groups:
            domain_groups[domain] = []
        domain_groups[domain].append(url)
    return domain_groups

@app.route("/predict", methods=["POST"])
def predict():
    pr = cProfile.Profile()
    pr.enable()

    data = request.get_json()
    urls = data["links"]

    output = {"links": []}
    domain_groups = group_urls_by_domain(urls)
    futures = [executor.submit(process_url, url) for domain in domain_groups.values() for url in domain]
    results = [future.result() for future in futures]

    for url, (safe_status, proba) in zip(urls, results):
        output['links'].append([url, safe_status])

    pr.disable()
    s = io.StringIO()
    sortby = pstats.SortKey.CUMULATIVE
    ps = pstats.Stats(pr, stream=s).sort_stats(sortby)
    ps.print_stats()
    logging.info(s.getvalue())

    return jsonify(output)


@app.route("/whitelist", methods=["GET"])
def whitelist():
    websites = collection.find({"safe_status": True})
    whitelist = [[website["url"], True] for website in websites]
    return {"links": whitelist}

if __name__ == '__main__':
    populate_whitelist()
    app.run(port=5000, debug=True, host='0.0.0.0')
