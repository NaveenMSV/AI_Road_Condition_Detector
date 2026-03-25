"""
AI Road Condition Detector - Flask AI Microservice
Handles image-based road condition detection with simulated YOLOv8 results.
Replace simulated detection with real model by uncommenting the YOLOv8 section.
"""

import os
import random
import json
from io import BytesIO
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import numpy as np

app = Flask(__name__)

# Restrict CORS to specific frontend or allow all for local dev
frontend_url = os.environ.get('FRONTEND_URL', '*')
CORS(app, resources={r"/*": {"origins": frontend_url}})

# Issue categories the model can detect
ISSUE_TYPES = ['pothole', 'road_crack', 'speed_bump']

# ============================================================
# SIMULATED DETECTION (replace with real YOLOv8 if model available)
# ============================================================

def simulated_detection(image):
    """
    Simulates YOLOv8 detection with realistic random results.
    Returns bounding boxes with labels and confidence scores.
    To use real YOLO: pip install ultralytics, then uncomment real_detection() below.
    """
    width, height = image.size
    num_detections = random.randint(1, 3)
    detections = []

    for _ in range(num_detections):
        label = random.choice(ISSUE_TYPES)
        confidence = round(random.uniform(0.60, 0.98), 2)

        # Generate realistic bounding box within image bounds
        box_w = random.randint(int(width * 0.1), int(width * 0.4))
        box_h = random.randint(int(height * 0.1), int(height * 0.35))
        x = random.randint(0, max(0, width - box_w))
        y = random.randint(int(height * 0.3), max(int(height * 0.3), height - box_h))

        detections.append({
            'label': label,
            'confidence': confidence,
            'bbox': {
                'x': x,
                'y': y,
                'width': box_w,
                'height': box_h
            }
        })

    # Sort by confidence (highest first)
    detections.sort(key=lambda d: d['confidence'], reverse=True)
    return detections


# ============================================================
# REAL YOLOv8 DETECTION (uncomment to use)
# ============================================================
# from ultralytics import YOLO
# model = YOLO('models/best.pt')  # Your trained model weights
#
# def real_detection(image):
#     results = model(image)
#     detections = []
#     for r in results:
#         for box in r.boxes:
#             cls_id = int(box.cls[0])
#             label = ISSUE_TYPES[cls_id] if cls_id < len(ISSUE_TYPES) else 'pothole'
#             x1, y1, x2, y2 = box.xyxy[0].tolist()
#             detections.append({
#                 'label': label,
#                 'confidence': round(float(box.conf[0]), 2),
#                 'bbox': {
#                     'x': int(x1), 'y': int(y1),
#                     'width': int(x2 - x1), 'height': int(y2 - y1)
#                 }
#             })
#     return detections


def extract_gps(image):
    """Extract GPS coordinates from image EXIF data."""
    try:
        exif = image._getexif()
        if not exif:
            return None

        GPS_TAG = 34853
        gps_info = exif.get(GPS_TAG, {})
        if not gps_info:
            return None

        def to_degrees(value):
            d, m, s = value
            return d + (m / 60.0) + (s / 3600.0)

        lat = to_degrees(gps_info.get(2, (0, 0, 0)))
        lng = to_degrees(gps_info.get(4, (0, 0, 0)))

        # Handle S/W hemispheres
        if gps_info.get(1) == 'S':
            lat = -lat
        if gps_info.get(3) == 'W':
            lng = -lng

        return {'latitude': round(lat, 6), 'longitude': round(lng, 6)}
    except Exception:
        return None


@app.route('/detect', methods=['POST'])
def detect():
    """
    POST /detect
    Accepts: multipart/form-data with 'image' field
    Returns: JSON with detection results and GPS data
    """
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400

    file = request.files['image']
    
    try:
        image = Image.open(file.stream)
        
        # Run detection (swap to real_detection(image) for real model)
        detections = simulated_detection(image)
        
        # Extract GPS if available
        gps = extract_gps(image)

        return jsonify({
            'success': True,
            'detections': detections,
            'gps': gps,
            'image_size': {'width': image.size[0], 'height': image.size[1]}
        })
    except Exception as e:
        return jsonify({'error': f'Failed to process image: {str(e)}'}), 500


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint."""
    return jsonify({'status': 'ok', 'service': 'ai-detection'})


if __name__ == '__main__':
    print('🤖 AI Detection Service starting on http://localhost:5000')
    app.run(host='0.0.0.0', port=5000, debug=True)
