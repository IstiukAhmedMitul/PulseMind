#include <Adafruit_GFX.h>
#include <MCUFRIEND_kbv.h>

MCUFRIEND_kbv tft;

#define SENSORPIN A5   // AD8232 OUTPUT wire, tapped in alongside the NodeMCU's connection

#define BLACK 0x0000
#define GREEN 0x07E0

int screenW, screenH;
int x = 0;
int lastY = 0;

void setup() {
  uint16_t ID = tft.readID();
  tft.begin(ID);
  tft.setRotation(1);   // landscape mode
  tft.fillScreen(BLACK);

  screenW = tft.width();
  screenH = tft.height();
  lastY = screenH / 2;

  pinMode(SENSORPIN, INPUT);
}

void loop() {
  int sensorValue = analogRead(SENSORPIN);              // 0-1023
  int y = map(sensorValue, 0, 1023, screenH - 1, 0);     // higher signal = higher on screen

  // erase a thin strip just ahead of the trace so old data doesn't smear together
  tft.drawFastVLine(x + 2, 0, screenH, BLACK);

  // draw a line segment from the last point to this one (smoother than single dots)
  tft.drawLine(x, lastY, x + 1, y, GREEN);

  lastY = y;
  x++;

  if (x >= screenW - 3) {
    x = 0;
    tft.fillScreen(BLACK);  // wipe and restart the sweep from the left edge
  }

  delay(10);  // roughly matches the ~100Hz sample rate used on the NodeMCU side
}
