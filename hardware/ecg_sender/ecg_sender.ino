/*
  ecg_sender.ino — FINAL VERSION
  ------------------------------------------------------------
  ESP8266 (NodeMCU) — AD8232 থেকে ECG ভ্যালু পড়ে, WiFi দিয়ে
  FastAPI backend এর /api/data endpoint এ ব্যাচ আকারে পাঠায়।

  Wiring:
    AD8232 OUTPUT -> A0
    AD8232 3.3V   -> ESP8266 3.3V
    AD8232 GND    -> ESP8266 GND
    AD8232 SDN    -> ESP8266 D7 (GPIO13)  [শুধু HIGH রাখার জন্য, shutdown glitch এড়াতে]

  LO+/LO- এই ভার্সনে ইচ্ছাকৃতভাবে ব্যবহার করা হয়নি — extensive
  troubleshooting এ দেখা গেছে এই বোর্ডে LO+/LO- reading বোর্ডের
  নিজস্ব LED indicator এর সাথে না মেলা, তাই এটাকে অবিশ্বাস্য ধরা হয়েছে।
  শুধু OUTPUT সিগন্যাল ব্যবহার করা হচ্ছে, যেটা ভালো electrode contact এ
  নির্ভরযোগ্যভাবে কাজ করতে দেখা গেছে।
*/

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include "secrets.h"   // WIFI_SSID, WIFI_PASSWORD, SERVER_IP, SERVER_PORT

// ---------- Sensor config ----------
#define SENSORPIN A0
#define SDN_PIN   D7        // GPIO13 — shutdown pin, always HIGH রাখা হচ্ছে
#define SAMPLES_PER_BATCH 15
#define SAMPLE_DELAY_MS   8   // ~125Hz sample rate

// ---------- Endpoint ----------
const char* SERVER_PATH = "/api/data";

struct Reading {
  unsigned long millisTs;
  int value;
};
Reading batch[SAMPLES_PER_BATCH];

void connectWiFi() {
  Serial.print("Connecting to WiFi");
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long startAttempt = millis();
  while (WiFi.status() != WL_CONNECTED) {
    delay(400);
    Serial.print(".");
    if (millis() - startAttempt > 15000) {
      Serial.println("\nWiFi connect timeout, retrying...");
      WiFi.disconnect();
      delay(200);
      WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
      startAttempt = millis();
    }
  }
  Serial.println();
  Serial.print("Connected! ESP8266 IP address: ");
  Serial.println(WiFi.localIP());
}

void buildPayload(char* out, size_t outSize) {
  size_t offset = 0;
  offset += snprintf(out + offset, outSize - offset, "{\"readings\":[");
  for (int i = 0; i < SAMPLES_PER_BATCH; i++) {
    offset += snprintf(out + offset, outSize - offset,
                        "{\"value\":%d,\"millis\":%lu}%s",
                        batch[i].value, batch[i].millisTs,
                        (i < SAMPLES_PER_BATCH - 1) ? "," : "");
  }
  snprintf(out + offset, outSize - offset, "]}");
}

void sendBatch() {
  static char payload[900];
  buildPayload(payload, sizeof(payload));

  WiFiClient client;
  HTTPClient http;

  char url[80];
  snprintf(url, sizeof(url), "http://%s:%d%s", SERVER_IP, SERVER_PORT, SERVER_PATH);

  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(3000);

  int httpCode = http.POST(payload);
  if (httpCode > 0) {
    Serial.printf("Sent batch -> HTTP %d\n", httpCode);
  } else {
    Serial.printf("POST failed: %s\n", http.errorToString(httpCode).c_str());
  }
  http.end();
}

void setup() {
  Serial.begin(115200);
  pinMode(SENSORPIN, INPUT);

  pinMode(SDN_PIN, OUTPUT);
  digitalWrite(SDN_PIN, HIGH);  // চিপকে সবসময় active mode এ রাখা

  connectWiFi();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected, reconnecting...");
    connectWiFi();
  }

  for (int i = 0; i < SAMPLES_PER_BATCH; i++) {
    batch[i].value = analogRead(SENSORPIN);
    batch[i].millisTs = millis();
    delay(SAMPLE_DELAY_MS);
  }

  sendBatch();
}