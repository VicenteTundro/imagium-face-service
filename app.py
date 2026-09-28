"""
Imagium Foto — Serviço de Busca Facial

Roda como um serviço sempre ligado (Railway, ou qualquer host com
Docker), separado do site principal (que continua no Vercel).

Recebe uma selfie, gera o embedding com InsightFace, compara com os
rostos já indexados no Supabase e devolve os IDs das fotos que batem.

A selfie enviada NUNCA é salva em disco — só existe na memória durante
essa requisição.
"""

import os

from flask import Flask, request, jsonify
import numpy as np
import cv2
import base64

app = Flask(__name__)

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SECRET_KEY = os.environ["SUPABASE_SECRET_KEY"]
FACE_SERVICE_SECRET = os.environ["FACE_SERVICE_SECRET"]

# Carregado UMA vez, quando o processo sobe — como o serviço fica
# sempre ligado, não existe "cold start" depois da primeira vez.
print("Carregando o modelo do InsightFace...")
from insightface.app import FaceAnalysis

face_app = FaceAnalysis(name="buffalo_l")
face_app.prepare(ctx_id=-1)
print("Modelo carregado. Serviço pronto.")

from supabase import create_client

supabase = create_client(SUPABASE_URL, SUPABASE_SECRET_KEY)


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


@app.route("/search-face", methods=["POST"])
def search_face():
    # Trava simples: só o nosso próprio site (Vercel) deve conseguir
    # chamar essa rota, usando uma senha compartilhada.
    if request.headers.get("X-Face-Service-Secret") != FACE_SERVICE_SECRET:
        return jsonify({"error": "Não autorizado."}), 401

    body = request.get_json(silent=True) or {}
    image_b64 = body.get("image")
    event_id = body.get("eventId")

    if not image_b64 or not event_id:
        return jsonify({"error": "Faltam dados (image, eventId)."}), 400

    if "," in image_b64:
        image_b64 = image_b64.split(",", 1)[1]

    try:
        image_bytes = base64.b64decode(image_b64)
        arr = np.frombuffer(image_bytes, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    except Exception:
        return jsonify({"error": "Não foi possível ler a imagem enviada."}), 400

    if img is None:
        return jsonify({"error": "Não foi possível ler a imagem enviada."}), 400

    faces = face_app.get(img)

    if not faces:
        return jsonify({"matches": [], "message": "Nenhum rosto detectado na foto enviada."})

    # Se detectar mais de um rosto na selfie, usa o maior (o mais
    # próximo da câmera — provavelmente é quem está buscando).
    faces.sort(key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]), reverse=True)
    embedding = faces[0].embedding.tolist()

    result = supabase.rpc(
        "match_faces",
        {
            "query_embedding": embedding,
            "match_event_id": event_id,
            "match_threshold": 0.4,
            "match_count": 200,
        },
    ).execute()

    best_per_photo = {}
    for row in result.data or []:
        pid = row["photo_id"]
        if pid not in best_per_photo or row["similarity"] > best_per_photo[pid]:
            best_per_photo[pid] = row["similarity"]

    matches = sorted(best_per_photo.keys(), key=lambda pid: best_per_photo[pid], reverse=True)

    return jsonify({"matches": matches})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    app.run(host="0.0.0.0", port=port)
