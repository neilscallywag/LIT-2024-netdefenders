import numpy as np
import onnxruntime
from huggingface_hub import hf_hub_download
from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo.mongo_client import MongoClient

app = Flask(__name__)  # initialize a flask application

# MongoDB connection string
uri = "mongodb+srv://root:root@netdefenders.0c3hj.mongodb.net/?retryWrites=true&w=majority&appName=netdefenders"
# Create a new client and connect to the server
client = MongoClient(uri)
# Access the specific database and collection
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

@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json()

    urls = data["links"]

    # Converting the input data into a NumPy array for the ONNX model
    inputs = np.array(urls, dtype="str")

    # Using the ONNX model to make predictions on the input data
    results = sess.run(None, {"inputs": inputs})[1]

    output = {
        "links": []
    }

    for url, proba in zip(urls, results):
        # Check if the website is safe based on the results of the API call
        safe_status = True
        if proba[0] > 0.7:
            safe_status = False

        # Add the results to the output
        output['links'].append([
            url, safe_status
        ])

        # Store the information into MongoDB
        document = {
            "url": url,
            "safe_status": safe_status,
            "probability": proba[0].item()  # Store the probability as well
        }
        collection.insert_one(document)

    return jsonify(output)

@app.route("/whitelist", methods=["GET"])
def whitelist():
    # Retrieve all the safe websites from the database
    websites = collection.find({"safe_status": True})

    whitelist = []

    for website in websites:
        whitelist.append([website["url"], True])

    return {"links": whitelist}

if __name__ == '__main__':
    app.run(port=5000, debug=True, host='0.0.0.0')
