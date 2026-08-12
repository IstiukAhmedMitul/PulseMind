const int SENSOR_PIN = A0;

void setup() {
  Serial.begin(115200);
}

void loop() {
  int value = analogRead(SENSOR_PIN);
  Serial.println(value);
  delay(5);
}