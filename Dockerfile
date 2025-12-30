FROM pathwaycom/pathway:latest

WORKDIR /app

RUN apt-get update && apt-get install -y \
    poppler-utils \
    libreoffice \
    && rm -rf /var/lib/apt/lists/* /var/cache/apt/archives/*

COPY . .

CMD ["python", "app.py"]
