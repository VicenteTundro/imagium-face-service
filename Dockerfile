FROM python:3.11-slim

# Bibliotecas de sistema que o opencv precisa para funcionar
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .

# Baixa o modelo do InsightFace AGORA, durante a construção da imagem
# — assim o serviço sobe pronto, sem esperar download na primeira
# selfie de cada dia.
ENV INSIGHTFACE_HOME=/app/.insightface
RUN python -c "from insightface.app import FaceAnalysis; fa = FaceAnalysis(name='buffalo_l'); fa.prepare(ctx_id=-1)"

EXPOSE 8080
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--timeout", "120", "app:app"]
