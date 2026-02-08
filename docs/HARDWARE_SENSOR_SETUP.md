# Parking sensor → website flow

Your Arduino code counts cars (FSR entry/exit) and reads the ultrasonic for street parking. To get that data onto the QHacks Meter website you need **WiFi** and a **backend** the device can POST to.

---

## Run everything (hardware + website)

Do these in order on the **same Wi‑Fi network** (so the ESP32 can reach your computer).

### 1. Start the backend (API)

On your computer, from the project root:

```bash
cd server
npm install
npm start
```

Leave this running. You should see: `Parking sensor API at http://localhost:3001`.

### 2. Point the website at the API

In the **project root** (not inside `server/`), create a file named `.env` if it doesn’t exist, with:

```env
VITE_PARKING_API_URL=http://localhost:3001
```

If the ESP32 and the website will run on **different machines**, use your computer’s local IP instead of `localhost` (e.g. `http://192.168.1.100:3001`). Find your IP: **Windows** — `ipconfig`; **Mac/Linux** — `ifconfig` or `ip addr`.

### 3. Start the website

In a **new terminal**, from the project root:

```bash
npm install
npm run dev
```

Open the URL shown (e.g. http://localhost:5173). The app will poll the API every 5 seconds and update Beamish Munro and Clergy St W when the ESP32 sends data.

### 4. Configure and flash the ESP32

1. Open the sketch in Arduino IDE (or PlatformIO):
   - **Arduino IDE**: File → Open → `hardware/parking_sensor_esp32/parking_sensor_esp32.ino`
   - Install the **ESP32 board support** if needed: Boards Manager → search “ESP32” → install.

2. At the **top of the sketch**, set:
   - `WIFI_SSID` — your Wi‑Fi name  
   - `WIFI_PASSWORD` — your Wi‑Fi password  
   - `API_URL` — backend address the ESP32 can reach:
     - If the **server runs on this same computer**: use your computer’s local IP, e.g. `http://192.168.1.100:3001/api/parking` (not `localhost` — the ESP32 can’t resolve that).
     - Replace `192.168.1.100` with the IP from step 2.

3. Connect the ESP32 via USB, select the correct **Board** and **Port**, then **Upload**.

4. Open **Tools → Serial Monitor** (9600 baud). You should see `WiFi connected` and then `Occ: 0/3 | Ultrasonic: ...`. When you trigger the FSRs or ultrasonic, the ESP32 will POST to the API and the website will update within a few seconds.

**Summary:** Backend running → website running with `VITE_PARKING_API_URL` set → ESP32 flashed with your Wi‑Fi and `API_URL` → hardware and website work together.

---

## What you need

### 1. WiFi on the device

The current sketch runs on a standard Arduino (Uno, etc.) with no network. To send data over the internet you have two options:

| Option | Hardware | Notes |
|--------|----------|--------|
| **A. ESP32** (recommended) | ESP32 dev board | Same IDE (Arduino or PlatformIO), built-in WiFi. Run the same logic and add HTTP POST. |
| **B. Arduino + WiFi module** | Arduino + ESP-01 / ESP8266 / Ethernet shield | Arduino talks to the module over Serial or SPI; the module does HTTP. More wiring and code. |

So: **use an ESP32** (or ESP8266) and run the equivalent sketch that POSTs to the backend when occupancy changes.

### 2. Backend API (in this repo)

The **server** in `server/` is a small Express API that:

- **POST /api/parking** — accepts `{ "lotId": "beamish-munro-hall", "availableSpots": 2 }` (from ESP32).
- **GET /api/parking** — returns current sensor data so the website can poll.

Run it (from project root):

```bash
cd server && npm install && npm start
```

Runs at `http://localhost:3001` by default. Set `PORT` if you need another port.

### 3. Data mapping

- **Beamish Munro Hall (lot)** — **Force-sensitive resistors (FSR)** at entry and exit  
  - FSR1 → FSR2 = entering, FSR2 → FSR1 = exiting; `currentOccupancy` 0–3.  
  - Send: `lotId: "beamish-munro-hall"`, `availableSpots: 3 - currentOccupancy` (only when it changes).

- **Clergy St W (street)** — **Ultrasonic sensor** on one street spot  
  - Ultrasonic ≤ 10 cm = occupied (LED HIGH), else vacant.  
  - Send `lotId: "clergy-st-w"`, `availableSpots: 1` when vacant, `0` when occupied (only when it changes).

The website already expects these IDs and will update the map/sidebar when it gets data (from the API or from the `parking-sensor-update` CustomEvent).

### 4. ESP32 sketch

See `hardware/parking_sensor_esp32/` for an ESP32 version of your sketch that:

- Connects to WiFi.
- Keeps your FSR + ultrasonic logic.
- When **Beamish** occupancy changes → POSTs `beamish-munro-hall` and `availableSpots`.
- When **Clergy** ultrasonic state changes (vacant/occupied) → POSTs `clergy-st-w` and `availableSpots` (0 or 1).

Configure your WiFi SSID/password and the backend URL (e.g. `http://YOUR_PC_IP:3001`) in the sketch.

### 5. Website

The frontend already:

- Listens for `parking-sensor-update` (for local/testing).
- Polls **GET /api/parking** when `VITE_PARKING_API_URL` is set (e.g. `http://localhost:3001`), and merges sensor data into the displayed lots/streets.

So once the backend is running and the ESP32 is POSTing to it, the Beamish and Clergy counts on the website will update automatically.

## Quick test without hardware

1. Start the server: `cd server && npm install && npm start`
2. Start the app: `npm run dev`
3. Set in `.env`: `VITE_PARKING_API_URL=http://localhost:3001`
4. Simulate the ESP32:
   ```bash
   curl -X POST http://localhost:3001/api/parking -H "Content-Type: application/json" -d "{\"lotId\":\"beamish-munro-hall\",\"availableSpots\":2}"
   curl -X POST http://localhost:3001/api/parking -H "Content-Type: application/json" -d "{\"lotId\":\"clergy-st-w\",\"availableSpots\":1}"
   ```
5. Refresh or wait for the next poll; Beamish and Clergy St W should show the new counts.

## Summary

- **WiFi**: Use an ESP32 (or Arduino + WiFi module) so the device can send HTTP requests.
- **Backend**: Run `server/` so there is a POST endpoint and a GET for the frontend.
- **ESP32 code**: Same logic as your Arduino sketch, plus POST on occupancy change to `http://<your-server>:3001/api/parking`.
- **Website**: Already wired to use the API when `VITE_PARKING_API_URL` is set; no extra step besides running the server and configuring the URL.
