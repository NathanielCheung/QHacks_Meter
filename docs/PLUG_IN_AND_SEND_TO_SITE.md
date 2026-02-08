# Once you plug the Arduino/ESP32 in: getting data to the site

Plugging the device in gives you **power** and **USB serial**. Data can reach the site in two ways.

**Supported boards:** The same sketch works on **ESP32** or **Arduino Uno WiFi Rev2**. In the IDE choose **Tools → Board → Arduino Uno WiFi Rev2** (or ESP32 Dev Module). For Uno WiFi Rev2, install the **ArduinoHttpClient** library (Sketch → Include Library → Manage Libraries → search “ArduinoHttpClient”).

---

## Option A: WiFi (recommended)

The ESP32 sketch sends data **over WiFi** to a backend on your computer. USB is only for **uploading the code** and viewing the Serial Monitor.

### 1. On your computer (same Wi‑Fi as the ESP32)

**Terminal 1 – start the API:**

```bash
cd server
npm install
npm start
```

Leave it running. You should see: `Parking sensor API at http://localhost:3001`.

**Terminal 2 – start the website:**

In the **project root** (parent of `server/`):

```bash
npm install
npm run dev
```

In the project root, create or edit **`.env`** (this file is gitignored):

```env
VITE_PARKING_API_URL=http://localhost:3001
```

If the browser and backend are on different machines, use your computer’s IP instead of `localhost`, e.g. `http://192.168.1.50:3001`.  
Find your IP: **Windows** → `ipconfig`; **Mac/Linux** → `ifconfig` or `ip addr`.

Open the URL shown by `npm run dev` (e.g. http://localhost:5173). The site will poll the API every 5 seconds.

### 2. Configure and upload the ESP32

1. Open **Arduino IDE** (or PlatformIO).
2. Open the sketch: **File → Open** → `hardware/parking_sensor_esp32/parking_sensor_esp32.ino`.
3. Install **ESP32** support if needed: **Tools → Board → Boards Manager** → search “ESP32” → Install.
4. At the **top of the sketch**, set:
   - **`WIFI_SSID`** — your Wi‑Fi name  
   - **`WIFI_PASSWORD`** — your Wi‑Fi password  
   - **`API_URL`** — your computer’s address:  
     `http://YOUR_PC_IP:3001/api/parking`  
     (Use the same IP as in `.env`. **Do not** use `localhost` — the ESP32 cannot resolve that.)
5. Plug in the ESP32 via USB. In Arduino IDE: **Tools → Port** → select the ESP32 port (e.g. COM3, /dev/cu.usbserial-…).
6. **Sketch → Upload**.
7. Open **Tools → Serial Monitor** (9600 baud). You should see `WiFi connected` and lines like `Occ: 0/3 | Ultrasonic: ...`. When sensors change, the ESP32 POSTs to the API and the website updates within a few seconds.

**Summary:** Backend running → website running with `VITE_PARKING_API_URL` set → ESP32 flashed with Wi‑Fi and `API_URL` → data flows: **ESP32 (WiFi) → backend (your PC) → website (polls backend)**.

**Power:** After uploading, you can unplug the ESP32 from your computer and power it with a **power bank** or wall USB adapter. It only needs power + WiFi to keep sending data; it does not need to stay connected to the PC.

---

## Option B: USB Serial bridge (no WiFi on device)

If you want to **send data over the USB cable** (e.g. Arduino without WiFi, or testing without configuring WiFi on the ESP32), run a small script on your computer that reads from the serial port and POSTs to the same API.

### 1. Backend and website

Same as Option A: start the **server** (`cd server && npm install && npm start`) and the **website** with `VITE_PARKING_API_URL=http://localhost:3001` in `.env`.

### 2. Serial bridge script (on your computer)

From the **project root**:

```bash
cd server
npm install
npm run serial-bridge
```

On first run, the script will list available serial ports. Pass your device’s port as an argument, e.g.:

- **Windows:** `npm run serial-bridge -- COM3`
- **Mac:** `npm run serial-bridge -- /dev/cu.usbserial-0001`

The bridge listens for lines in the form:

`PARK,<lotId>,<availableSpots>`

e.g. `PARK,beamish-munro-hall,2` or `PARK,clergy-st-w,1`.  
The ESP32 sketch prints such a line whenever it would POST (so when you use the bridge, the same sensor events are sent via USB → bridge → API).

### 3. Plug in the device

1. Plug the ESP32/Arduino into USB.
2. Run the bridge: `cd server && npm run serial-bridge -- [YOUR_PORT]` (e.g. `COM3` on Windows).
3. Trigger the sensors; the bridge will POST to `http://localhost:3001/api/parking` and the website will update.

**Summary:** Device (USB) → Serial bridge (on PC) → backend → website.

---

## Quick test without hardware

1. Start the server: `cd server && npm install && npm start`
2. Start the app: `npm run dev` (with `VITE_PARKING_API_URL=http://localhost:3001` in `.env`)
3. Simulate the device:

   ```bash
   curl -X POST http://localhost:3001/api/parking -H "Content-Type: application/json" -d "{\"lotId\":\"beamish-munro-hall\",\"availableSpots\":2}"
   curl -X POST http://localhost:3001/api/parking -H "Content-Type: application/json" -d "{\"lotId\":\"clergy-st-w\",\"availableSpots\":1}"
   ```

4. Refresh the site or wait a few seconds; Beamish Munro Hall and Clergy St W should show the new counts.
