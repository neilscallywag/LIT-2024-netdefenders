import numpy as np
import onnxruntime
from huggingface_hub import hf_hub_download
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import logging

app = Flask(__name__)  # initialize a flask application

app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+mysqlconnector://root:root@localhost:3306/OnlineHarm'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

CORS(app)

db = SQLAlchemy(app)

'''
SQL Set up code
-- Create the database
CREATE DATABASE OnlineHarm;

-- Use the database
USE OnlineHarm;

-- Create the table
CREATE TABLE Websites (
    url VARCHAR(256) NOT NULL PRIMARY KEY,
    risk_rating FLOAT NOT NULL
);

'''

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class Website(db.Model):
    __tablename__ = 'Websites'

    url = db.Column(db.String(256), primary_key=True)
    risk_rating = db.Column(db.Float, nullable=False)

    def __init__(self, url, risk_rating):
        self.url = url
        self.risk_rating = risk_rating
    
    def json(self):
        return {"url": self.url, "risk_rating": self.risk_rating}


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

      website = Website(output["url"], output["phishing_probability"])
      try:
        db.session.add(website)
        db.session.commit()
      except Exception as e:
          logger.error(f"Error occurred: {e}")
          return jsonify(
              {
                  "data": {
                      "website": output['url'],
                      "phishing_probability": output['phishing_probability']
                  },
                  "message": "An error occurred creating the website entry."
              }
          ), 500

  return jsonify(output)

if __name__ == '__main__':
    app.run(port=5000, debug=True, host='0.0.0.0')
