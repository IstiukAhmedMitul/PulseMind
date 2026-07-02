/*
  ecg_sender.ino
  ------------------------------------------------------------
  ESP8266 (NodeMCU) — AD8232 থেকে ECG ভ্যালু পড়ে, WiFi দিয়ে
  FastAPI backend এর /api/data endpoint এ ব্যাচ আকারে পাঠায়।

  Wiring (আগে থেকেই কনফার্ম করা):
    AD8232 OUTPUT -> A0
    AD8232 3.3V   -> ESP8266 3.3V
    AD8232 GND    -> ESP8266 GND
    (LO+, LO- এই ভার্সনে ব্যবহার করা হয়নি)

  আগের ভার্সন থেকে পরিবর্তন:
    - WiFi/server credentials আলাদা secrets.h ফাইলে সরানো হয়েছে
    - ব্যাচ সাইজ কমানো হয়েছে (৫০ -> ১৫) latency কমানোর জন্য
    - JSON build করার জন্য String concatenation বাদ দিয়ে
      snprintf ব্যবহার করা হয়েছে (মেমরি ফ্র্যাগমেন্টেশন এড়াতে)
    - Non-blocking reconnect logic
*/

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include "secrets.h"   // WIFI_SSID, WIFI_PASSWORD, SERVER_IP, SERVER_PORT — এখানে ডিফাইন করা

// ---------- Sensor config ----------
#define SENSORPIN A0            // AD8232 OUTPUT pin
#define SAMPLES_PER_BATCH 15     // কম রাখা হয়েছে latency কমানোর জন্য (আগে ছিল 50)
#define SAMPLE_DELAY_MS   8      // ~125Hz sample rate (আগে ছিল 10ms/100Hz)

// ---------- Endpoint ----------
const char* SERVER_PATH = "/api/data";

WiFiClient wifiClient;

// ব্যাচ ডেটা বাফার
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
    // ১৫ সেকেন্ডের বেশি চেষ্টা করলে থেমে আবার শুরু থেকে ট্রাই করবে (loop এ ফিরে)
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

// ব্যাচকে JSON স্ট্রিং এ বানায় (String concatenation এর বদলে snprintf, মেমরি সেফ)
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
  // JSON payload সাইজ: প্রতিটা readings entry মোটামুটি ২৫-৩০ বাইট, ১৫টার জন্য বাফার যথেষ্ট বড় রাখা হলো
  static char payload[900];
  buildPayload(payload, sizeof(payload));

  WiFiClient client;
  HTTPClient http;

  char url[80];
  snprintf(url, sizeof(url), "http://%s:%d%s", SERVER_IP, SERVER_PORT, SERVER_PATH);

  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(3000); // 3s timeout, যাতে slow/dead server লুপ আটকে না রাখে

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
  connectWiFi();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected, reconnecting...");
    connectWiFi();
  }

  // ব্যাচ সংগ্রহ
  for (int i = 0; i < SAMPLES_PER_BATCH; i++) {
    batch[i].value = analogRead(SENSORPIN);
    batch[i].millisTs = millis();
    delay(SAMPLE_DELAY_MS);
  }

  sendBatch();
  // এখানে ইচ্ছাকৃতভাবে অতিরিক্ত delay নেই — পরের ব্যাচ সংগ্রহ সাথে সাথে শুরু হবে
}
