from flask import Flask, request, jsonify
import csv
import os
from datetime import datetime

app = Flask(__name__)
CSV_FILE = "ecg_data.csv"

# Create the CSV file with a header row if it doesn't exist yet
if not os.path.exists(CSV_FILE):
    with open(CSV_FILE, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["received_at", "esp32_millis", "value"])

@app.route("/data", methods=["POST"])
def receive_data():
    payload = request.get_json()
    if not payload or "readings" not in payload:
        return jsonify({"status": "error", "message": "no readings field"}), 400

    readings = payload["readings"]
    now = datetime.now().isoformat()

    with open(CSV_FILE, "a", newline="") as f:
        writer = csv.writer(f)
        for r in readings:
            writer.writerow([now, r.get("millis"), r.get("value")])

    print(f"[{now}] Saved {len(readings)} readings")
    return jsonify({"status": "ok", "count": len(readings)}), 200

if __name__ == "__main__":
    # 0.0.0.0 means "listen on all network interfaces" so the ESP32 can reach it
    print("Server starting on http://0.0.0.0:5000  (saving to ecg_data.csv)")
    app.run(host="0.0.0.0", port=5000)