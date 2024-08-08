FROM python:3-slim

WORKDIR /app

COPY phishing.py requirements.txt ./

RUN pip install --no-cache-dir -r requirements.txt

CMD [ "python", "phishing.py" ]