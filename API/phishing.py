import numpy as np
import onnxruntime
from huggingface_hub import hf_hub_download
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)  # initialize a flask application
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

  email = data["url"]

  urls = [
      email
  ]

  # Converting the input data into a NumPy array for the ONNX model
  inputs = np.array(urls, dtype="str")

  # Using the ONNX model to make predictions on the input data
  results = sess.run(None, {"inputs": inputs})[1]

  for url, proba in zip(urls, results):
      output = {
        "url": url,
        "phishing_probability":  proba.item() if np.isscalar(proba) else proba[0].item()
      }

  return jsonify(output)

if __name__ == '__main__':
    app.run(port=5000, debug=True, host='0.0.0.0')

