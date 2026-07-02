#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>

// ---------- WiFi credentials ----------
const char* ssid     = "3RD_Floor";
const char* password = "february@2026";

// ---------- Your PC's info (where the Python script will run) ----------
const char* serverIP   = "192.168.10.192";  // PC's WiFi IPv4 address (from ipconfig)
const int   serverPort = 5000;
const char* serverPath = "/data";

// ---------- Sensor ----------
#define SENSORPIN A0          // AD8232 OUTPUT pin
#define SAMPLES_PER_BATCH 4  // how many readings to send per HTTP request
#define SAMPLE_DELAY_MS   100  // ~100Hz sampling rate

WiFiClient wifiClient;

void connectWiFi() {
  Serial.print("Connecting to WiFi");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("Connected! ESP32 IP address: ");
  Serial.println(WiFi.localIP());
}

void setup() {
  Serial.begin(115200);
  pinMode(SENSORPIN, INPUT);
  connectWiFi();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected, reconnecting...");
    connectWiFi();
  }

  // Build a small JSON batch of sensor readings
  String payload = "{\"readings\":[";
  for (int i = 0; i < SAMPLES_PER_BATCH; i++) {
    int sensorValue = analogRead(SENSORPIN);
    payload += "{\"value\":" + String(sensorValue) + ",\"millis\":" + String(millis()) + "}";
    if (i < SAMPLES_PER_BATCH - 1) payload += ",";
    delay(SAMPLE_DELAY_MS);
  }
  payload += "]}";

  // Send the batch to your PC
  HTTPClient http;
  String url = "http://" + String(serverIP) + ":" + String(serverPort) + String(serverPath);
  http.begin(wifiClient, url);
  http.addHeader("Content-Type", "application/json");

  int httpCode = http.POST(payload);

  if (httpCode > 0) {
    Serial.printf("Sent batch -> server responded with code: %d\n", httpCode);
  } else {
    Serial.printf("POST failed, error: %s\n", http.errorToString(httpCode).c_str());
  }
  http.end();
}
