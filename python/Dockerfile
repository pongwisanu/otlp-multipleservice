FROM python:3.13-slim

RUN apt update && apt upgrade -y && apt install -y curl

WORKDIR /app

COPY requirements.txt .

RUN pip install -r requirements.txt

COPY . .

# EXPOSE 5000

CMD ["gunicorn", "main:app", "-b", "0.0.0.0:5000"]