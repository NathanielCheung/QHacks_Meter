/*
 * Parking Lot + Street Sensor (ESP32)
 *
 * Beamish Munro Hall (lot): force-sensitive resistors (FSR) at entry/exit
 *   -> count entering/exiting cars, occupancy 0-3 -> availableSpots = 3 - occupancy
 *
 * Clergy St W (street): ultrasonic sensor on one spot
 *   -> occupied (object close) = 0 available, vacant = 1 available
 *
 * POSTs to backend when values change. Configure WiFi and API_URL below.
 */
#include <WiFi.h>
#include <HTTPClient.h>

// ----------------------------
// WiFi & API (configure these)
// NOTE: Do not push this file with real passwords to a public repo.
// ----------------------------
const char* WIFI_SSID     = "Natedagreat";
const char* WIFI_PASSWORD = "weelittleman123";
const char* API_URL       = "http://192.168.1.100:3001/api/parking";

// ----------------------------
// Pin definitions (same as Arduino sketch)
// ----------------------------
const int FSR1_PIN = 36;   // Entry sensor (ESP32 A0 = GPIO36)
const int FSR2_PIN = 39;   // Exit sensor (ESP32 A1 = GPIO39)

const int LED1_PIN = 2;
const int LED2_PIN = 3;
const int LED3_PIN = 4;
const int LED4_PIN = 5;

const int ULTRASONIC_TRIG_PIN = 9;
const int ULTRASONIC_ECHO_PIN = 10;

// ----------------------------
// Constants
// ----------------------------
const int TOUCH_THRESHOLD = 300;
const unsigned long MAX_TIME_BETWEEN_SENSORS = 2000;
const unsigned long DEBOUNCE_TIME = 50;
const float MAX_DISTANCE = 100.0;
const float OBJECT_DISTANCE_THRESHOLD = 10.0;
const int MAX_SPOTS = 3;

// ----------------------------
// Variables
// ----------------------------
float duration;
float distance;

enum CarDirection { NONE, ENTERING, EXITING };
CarDirection currentDirection = NONE;

bool fsr1Active = false, fsr2Active = false;
bool fsr1Processed = false, fsr2Processed = false;
bool fsr1WasPressed = false, fsr2WasPressed = false;
unsigned long fsr1PressTime = 0, fsr2PressTime = 0;

int vehiclesEntered = 0, vehiclesExited = 0;
int currentOccupancy = 0;  // Beamish Munro: 0..MAX_SPOTS

// Clergy St W: 1 spot, ultrasonic. Last value we sent to avoid spamming.
int lastClergyAvailable = -1;
int lastBeamishAvailable = -1;

// ----------------------------
// Send occupancy to backend
// ----------------------------
void postOccupancy(const char* lotId, int availableSpots) {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.begin(API_URL);
  http.addHeader("Content-Type", "application/json");

  char body[80];
  snprintf(body, sizeof(body), "{\"lotId\":\"%s\",\"availableSpots\":%d}", lotId, availableSpots);
  int code = http.POST(body);
  http.end();

  if (code == 200) {
    Serial.printf("POST %s -> %d ok\n", lotId, availableSpots);
  } else {
    Serial.printf("POST %s failed: %d\n", lotId, code);
  }
}

void updateParkingLEDs() {
  digitalWrite(LED1_PIN, currentOccupancy >= 1 ? HIGH : LOW);
  digitalWrite(LED2_PIN, currentOccupancy >= 2 ? HIGH : LOW);
  digitalWrite(LED3_PIN, currentOccupancy >= 3 ? HIGH : LOW);
}

void setup() {
  Serial.begin(9600);

  pinMode(LED1_PIN, OUTPUT);
  pinMode(LED2_PIN, OUTPUT);
  pinMode(LED3_PIN, OUTPUT);
  pinMode(LED4_PIN, OUTPUT);
  pinMode(ULTRASONIC_TRIG_PIN, OUTPUT);
  pinMode(ULTRASONIC_ECHO_PIN, INPUT);

  updateParkingLEDs();
  digitalWrite(LED4_PIN, HIGH);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("WiFi connecting");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected");
  Serial.println("Parking Lot Tracking System Ready");
}

void loop() {
  unsigned long currentTime = millis();
  int fsr1Value = analogRead(FSR1_PIN);
  int fsr2Value = analogRead(FSR2_PIN);

  // ---------- FSR1 edge detection ----------
  if (fsr1Value > TOUCH_THRESHOLD) {
    if (!fsr1Active && !fsr1WasPressed) {
      fsr1Active = true;
      fsr1WasPressed = true;
      fsr1PressTime = currentTime;
      fsr1Processed = true;
      Serial.println("FSR1 Pressed");
    }
  } else {
    fsr1Active = false;
    if (fsr1WasPressed && currentTime - fsr1PressTime > DEBOUNCE_TIME)
      fsr1WasPressed = false;
  }

  // ---------- FSR2 edge detection ----------
  if (fsr2Value > TOUCH_THRESHOLD) {
    if (!fsr2Active && !fsr2WasPressed) {
      fsr2Active = true;
      fsr2WasPressed = true;
      fsr2PressTime = currentTime;
      fsr2Processed = true;
      Serial.println("FSR2 Pressed");
    }
  } else {
    fsr2Active = false;
    if (fsr2WasPressed && currentTime - fsr2PressTime > DEBOUNCE_TIME)
      fsr2WasPressed = false;
  }

  // ---------- Direction logic (Beamish Munro) ----------
  if (fsr1Processed && fsr2Processed) {
    if (fsr1PressTime < fsr2PressTime &&
        fsr2PressTime - fsr1PressTime <= MAX_TIME_BETWEEN_SENSORS) {
      currentDirection = ENTERING;
      vehiclesEntered++;
      if (currentOccupancy < MAX_SPOTS) currentOccupancy++;
      updateParkingLEDs();
      Serial.println("=== ENTERING ===");
    } else if (fsr2PressTime < fsr1PressTime &&
               fsr1PressTime - fsr2PressTime <= MAX_TIME_BETWEEN_SENSORS) {
      currentDirection = EXITING;
      vehiclesExited++;
      if (currentOccupancy > 0) currentOccupancy--;
      updateParkingLEDs();
      Serial.println("=== EXITING ===");
    }
    fsr1Processed = false;
    fsr2Processed = false;
    fsr1WasPressed = false;
    fsr2WasPressed = false;

    // Send Beamish occupancy when it changes
    int beamishAvailable = MAX_SPOTS - currentOccupancy;
    if (beamishAvailable != lastBeamishAvailable) {
      lastBeamishAvailable = beamishAvailable;
      postOccupancy("beamish-munro-hall", beamishAvailable);
    }
  }

  // ---------- Ultrasonic (Clergy St W: 1 spot) ----------
  digitalWrite(ULTRASONIC_TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(ULTRASONIC_TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(ULTRASONIC_TRIG_PIN, LOW);

  duration = pulseIn(ULTRASONIC_ECHO_PIN, HIGH, 30000);
  distance = (duration * 0.0343f) / 2.0f;

  int clergyAvailable;  // 1 = vacant, 0 = occupied
  if (distance > 0 && distance <= OBJECT_DISTANCE_THRESHOLD) {
    digitalWrite(LED4_PIN, HIGH);   // Occupied
    clergyAvailable = 0;
  } else {
    digitalWrite(LED4_PIN, LOW);    // Vacant
    clergyAvailable = 1;
  }
  if (clergyAvailable != lastClergyAvailable) {
    lastClergyAvailable = clergyAvailable;
    postOccupancy("clergy-st-w", clergyAvailable);
  }

  // ---------- Debug ----------
  Serial.print("Occ: ");
  Serial.print(currentOccupancy);
  Serial.print("/");
  Serial.print(MAX_SPOTS);
  Serial.print(" | Ultrasonic: ");
  Serial.print(distance);
  Serial.print("cm | Vacancy LED: ");
  Serial.println(digitalRead(LED4_PIN));

  delay(50);
}
