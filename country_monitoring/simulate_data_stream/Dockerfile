FROM python:3.9-slim

WORKDIR /app

# The simulator only uses standard library, but we might need 
# a requirements file if it expands. For now, it's empty or basic.
# COPY requirements.txt .
# RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Environment variables to handle paths if needed
ENV PYTHONUNBUFFERED=1

CMD ["python", "stream_simulator.py"]
