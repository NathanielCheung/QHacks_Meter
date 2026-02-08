/**
 * Serial bridge: read lines from Arduino/ESP32 over USB and POST to the parking API.
 * Line format: PARK,<lotId>,<availableSpots>  e.g.  PARK,beamish-munro-hall,2
 *
 * Usage:
 *   cd server && npm install serialport && node serial-bridge.js
 *   node serial-bridge.js COM3          (Windows)
 *   node serial-bridge.js /dev/cu.usbserial-0001   (Mac)
 *
 * Requires: backend (npm start) running on API_URL below.
 */
import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';

const API_URL = process.env.API_URL || 'http://localhost:3001';
const PORT_NAME = process.argv[2]; // e.g. COM3 or /dev/cu.usbserial-0001

async function listPorts() {
  const ports = await SerialPort.list();
  if (ports.length === 0) {
    console.log('No serial ports found. Plug in the device and try again.');
    return [];
  }
  console.log('Available ports:');
  ports.forEach((p) => console.log(`  ${p.path}  ${p.manufacturer || ''}`));
  return ports;
}

function openPort(path) {
  const port = new SerialPort({ path, baudRate: 9600 }, (err) => {
    if (err) {
      console.error('Failed to open port:', err.message);
      process.exit(1);
    }
    console.log(`Opened ${path} at 9600 baud. Sending PARK,<lotId>,<spots> lines to ${API_URL}`);
  });

  const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));
  parser.on('data', async (line) => {
    const trimmed = String(line).trim();
    const match = /^PARK,([^,]+),(\d+)$/.exec(trimmed);
    if (!match) return;
    const [, lotId, availableSpotsStr] = match;
    const availableSpots = Math.max(0, parseInt(availableSpotsStr, 10));
    try {
      const res = await fetch(`${API_URL.replace(/\/$/, '')}/api/parking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lotId, availableSpots }),
      });
      if (res.ok) {
        console.log(`  -> ${lotId} = ${availableSpots} available`);
      } else {
        console.warn(`  POST failed: ${res.status}`);
      }
    } catch (e) {
      console.warn('  POST error:', e.message);
    }
  });

  port.on('error', (err) => {
    console.error('Port error:', err.message);
  });
}

async function main() {
  if (PORT_NAME) {
    openPort(PORT_NAME);
    return;
  }
  const ports = await listPorts();
  if (ports.length === 1) {
    console.log(`\nUsing only port: ${ports[0].path}\n`);
    openPort(ports[0].path);
    return;
  }
  if (ports.length > 1) {
    console.log('\nPass the port as an argument, e.g.:  node serial-bridge.js', ports[0].path);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
