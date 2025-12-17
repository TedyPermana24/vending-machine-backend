<!-- existing content -->

---

## MQTT API Documentation

Backend menggunakan MQTT untuk komunikasi real-time dengan IoT devices (vending machines). Data dari MQTT akan disimpan ke database setiap 1 jam sekali, dan diteruskan ke frontend via WebSocket secara real-time.

### MQTT Broker Configuration

**Default Connection:**

- **Host:** `localhost` / `127.0.0.1`
- **Port:** `1883`
- **Protocol:** `mqtt://`

**Environment Variables:**

```env
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_USERNAME=          # Optional
MQTT_PASSWORD=          # Optional
```

---

## MQTT Topics Structure

### Topic Pattern:

```
vending-machine/{MACHINE_CODE}/{data_type}
```

**Available Data Types:**

- `temperature` - Data suhu dan kelembaban
- `status` - Status mesin (online/offline/maintenance)
- `heartbeat` - Heartbeat untuk monitoring koneksi

**Example Topics:**

```
vending-machine/VM-001/temperature
vending-machine/VM-001/status
vending-machine/VM-001/heartbeat
vending-machine/VM-002/temperature
vending-machine/VM-002/status
```

---

## 1. Temperature & Humidity Data

### Topic: `vending-machine/{MACHINE_CODE}/temperature`

**Payload Format (JSON):**

```json
{
  "machineCode": "VM-001",
  "temperature": 5.5,
  "humidity": 65.2,
  "timestamp": "2025-12-17T14:00:00.000Z"
}
```

**Payload Fields:**

| Field       | Type   | Required | Description                      |
| ----------- | ------ | -------- | -------------------------------- |
| machineCode | string | Yes      | Kode mesin (VM-001, VM-002, dll) |
| temperature | number | Yes      | Suhu dalam Celsius (°C)          |
| humidity    | number | Yes      | Kelembaban dalam persen (%)      |
| timestamp   | string | Yes      | ISO 8601 timestamp               |

### Publish Temperature Data (Windows PowerShell)

**Command:**

```powershell
.\mosquitto_pub.exe -h 127.0.0.1 -p 1883 -t "vending-machine/VM-001/temperature" -m "{\"machineCode\":\"VM-001\",\"temperature\":5.5,\"humidity\":65.2,\"timestamp\":\"2025-12-17T14:00:00.000Z\"}"
```

**Command (Bash/Linux/Mac):**

```bash
mosquitto_pub -h 127.0.0.1 -p 1883 -t "vending-machine/VM-001/temperature" -m '{"machineCode":"VM-001","temperature":5.5,"humidity":65.2,"timestamp":"2025-12-17T14:00:00.000Z"}'
```

**Example - Multiple Data:**

```powershell
# Data 1 - Suhu normal
.\mosquitto_pub.exe -h 127.0.0.1 -p 1883 -t "vending-machine/VM-001/temperature" -m "{\"machineCode\":\"VM-001\",\"temperature\":5.2,\"humidity\":64.8,\"timestamp\":\"2025-12-17T14:00:00.000Z\"}"

# Data 2 - Suhu naik
.\mosquitto_pub.exe -h 127.0.0.1 -p 1883 -t "vending-machine/VM-001/temperature" -m "{\"machineCode\":\"VM-001\",\"temperature\":6.5,\"humidity\":67.2,\"timestamp\":\"2025-12-17T14:01:00.000Z\"}"

# Data 3 - Suhu tinggi (warning)
.\mosquitto_pub.exe -h 127.0.0.1 -p 1883 -t "vending-machine/VM-001/temperature" -m "{\"machineCode\":\"VM-001\",\"temperature\":8.5,\"humidity\":70.1,\"timestamp\":\"2025-12-17T14:02:00.000Z\"}"
```

**What Happens When Published:**

1. ✅ Backend MQTT Service menerima data
2. ✅ Update `machines.currentTemperature` & `machines.currentHumidity` di database (ALWAYS)
3. ✅ Emit ke WebSocket untuk frontend (REAL-TIME)
4. ✅ Save ke `temperature_logs` table (EVERY 1 HOUR)

**Expected Backend Logs:**

```
[MqttService] 📨 Received message on vending-machine/VM-001/temperature: { machineCode: 'VM-001', temperature: 5.5, humidity: 65.2 }
[MqttService] 🌡️ Temperature updated for Vending Machine 1: 5.5°C, Humidity: 65.2%
[MachineGateway] 📤 Temperature update sent for machine 1
[MqttService] ⏱️ Next save in 58 minutes for Vending Machine 1
```

---

## 2. Machine Status Update

### Topic: `vending-machine/{MACHINE_CODE}/status`

**Payload Format (JSON):**

```json
{
  "machineCode": "VM-001",
  "status": "online",
  "timestamp": "2025-12-17T14:00:00.000Z"
}
```

**Payload Fields:**

| Field       | Type   | Required | Description                                |
| ----------- | ------ | -------- | ------------------------------------------ |
| machineCode | string | Yes      | Kode mesin (VM-001, VM-002, dll)           |
| status      | string | Yes      | Status: "online", "offline", "maintenance" |
| timestamp   | string | Yes      | ISO 8601 timestamp                         |

**Available Status Values:**

- `online` - Mesin aktif dan siap digunakan
- `offline` - Mesin tidak terhubung
- `maintenance` - Mesin dalam perbaikan

### Publish Status Update (Windows PowerShell)

**Command - Set Online:**

```powershell
.\mosquitto_pub.exe -h 127.0.0.1 -p 1883 -t "vending-machine/VM-001/status" -m "{\"machineCode\":\"VM-001\",\"status\":\"online\",\"timestamp\":\"2025-12-17T14:00:00.000Z\"}"
```

**Command - Set Maintenance:**

```powershell
.\mosquitto_pub.exe -h 127.0.0.1 -p 1883 -t "vending-machine/VM-001/status" -m "{\"machineCode\":\"VM-001\",\"status\":\"maintenance\",\"timestamp\":\"2025-12-17T14:00:00.000Z\"}"
```

**Command - Set Offline:**

```powershell
.\mosquitto_pub.exe -h 127.0.0.1 -p 1883 -t "vending-machine/VM-001/status" -m "{\"machineCode\":\"VM-001\",\"status\":\"offline\",\"timestamp\":\"2025-12-17T14:00:00.000Z\"}"
```

**Command (Bash/Linux/Mac):**

```bash
mosquitto_pub -h 127.0.0.1 -p 1883 -t "vending-machine/VM-001/status" -m '{"machineCode":"VM-001","status":"online","timestamp":"2025-12-17T14:00:00.000Z"}'
```

**What Happens When Published:**

1. ✅ Backend MQTT Service menerima data
2. ✅ Update `machines.status` di database
3. ✅ Update `machines.lastOnline` timestamp
4. ✅ Emit ke WebSocket untuk frontend (REAL-TIME)

**Expected Backend Logs:**

```
[MqttService] 📨 Received message on vending-machine/VM-001/status: { machineCode: 'VM-001', status: 'online' }
[MqttService] 🔄 Status updated for Vending Machine 1: online
[MachineGateway] 📤 Status update sent for machine 1
```

---

## 3. Machine Heartbeat

### Topic: `vending-machine/{MACHINE_CODE}/heartbeat`

**Payload Format (JSON):**

```json
{
  "machineCode": "VM-001",
  "timestamp": "2025-12-17T14:00:00.000Z"
}
```

**Payload Fields:**

| Field       | Type   | Required | Description                      |
| ----------- | ------ | -------- | -------------------------------- |
| machineCode | string | Yes      | Kode mesin (VM-001, VM-002, dll) |
| timestamp   | string | Yes      | ISO 8601 timestamp               |

**Purpose:**

- Monitoring koneksi mesin secara berkala
- Memastikan mesin masih aktif
- Update lastOnline timestamp

### Publish Heartbeat (Windows PowerShell)

**Command:**

```powershell
.\mosquitto_pub.exe -h 127.0.0.1 -p 1883 -t "vending-machine/VM-001/heartbeat" -m "{\"machineCode\":\"VM-001\",\"timestamp\":\"2025-12-17T14:00:00.000Z\"}"
```

**Command (Bash/Linux/Mac):**

```bash
mosquitto_pub -h 127.0.0.1 -p 1883 -t "vending-machine/VM-001/heartbeat" -m '{"machineCode":"VM-001","timestamp":"2025-12-17T14:00:00.000Z"}'
```

**Recommended Heartbeat Interval:**

```
Every 30 seconds
```

**What Happens When Published:**

1. ✅ Backend MQTT Service menerima heartbeat
2. ✅ Update `machines.lastOnline` timestamp
3. ✅ Update `machines.status` ke "ONLINE" jika offline
4. ✅ Emit ke WebSocket untuk frontend (REAL-TIME)

**Expected Backend Logs:**

```
[MqttService] 💓 Heartbeat from Vending Machine 1
[MachineGateway] 💓 Heartbeat sent
```

---

## Subscribe to Topics

Backend secara otomatis subscribe ke semua topics saat aplikasi start. Namun Anda bisa subscribe manual untuk testing/monitoring.

### Subscribe to Temperature Topic (Windows PowerShell)

**Command:**

```powershell
.\mosquitto_sub.exe -h 127.0.0.1 -p 1883 -t "vending-machine/VM-001/temperature"
```

**Command (Bash/Linux/Mac):**

```bash
mosquitto_sub -h 127.0.0.1 -p 1883 -t "vending-machine/VM-001/temperature"
```

### Subscribe to All Topics from One Machine

**Command (Windows PowerShell):**

```powershell
.\mosquitto_sub.exe -h 127.0.0.1 -p 1883 -t "vending-machine/VM-001/#"
```

**Command (Bash/Linux/Mac):**

```bash
mosquitto_sub -h 127.0.0.1 -p 1883 -t "vending-machine/VM-001/#"
```

### Subscribe to All Machines

**Command (Windows PowerShell):**

```powershell
.\mosquitto_sub.exe -h 127.0.0.1 -p 1883 -t "vending-machine/#"
```

**Command (Bash/Linux/Mac):**

```bash
mosquitto_sub -h 127.0.0.1 -p 1883 -t "vending-machine/#"
```

### Subscribe with Verbose Output

**Command (Windows PowerShell):**

```powershell
.\mosquitto_sub.exe -h 127.0.0.1 -p 1883 -t "vending-machine/#" -v
```

**Example Output:**

```
vending-machine/VM-001/temperature {"machineCode":"VM-001","temperature":5.5,"humidity":65.2,"timestamp":"2025-12-17T14:00:00.000Z"}
vending-machine/VM-001/status {"machineCode":"VM-001","status":"online","timestamp":"2025-12-17T14:00:30.000Z"}
vending-machine/VM-001/heartbeat {"machineCode":"VM-001","timestamp":"2025-12-17T14:01:00.000Z"}
```

---

## Testing MQTT Integration

### Step-by-Step Testing Flow

#### **Step 1: Start Mosquitto Broker**

**Windows:**

```powershell
# Start Mosquitto service
net start mosquitto

# Or run mosquitto in verbose mode (for testing)
mosquitto -v
```

**Linux/Mac:**

```bash
# Start Mosquitto
sudo systemctl start mosquitto

# Or run in foreground
mosquitto -v
```

**Expected Output:**

```
1702819200: mosquitto version 2.0.18 starting
1702819200: Config loaded from /etc/mosquitto/mosquitto.conf
1702819200: Opening ipv4 listen socket on port 1883
1702819200: Opening ipv6 listen socket on port 1883
1702819200: mosquitto version 2.0.18 running
```

---

#### **Step 2: Start NestJS Backend**

```bash
npm run start:dev
```

**Expected Logs:**

```
[MachineGateway] ✅ WebSocket Gateway initialized
[MqttService] 🔧 MQTT Service initializing...
[MqttService] Connecting to MQTT broker: mqtt://localhost:1883
[MqttService] ✅ Connected to MQTT broker
[MqttService] 📡 Subscribed to: vending-machine/VM-001/temperature
[MqttService] 📡 Subscribed to: vending-machine/VM-001/status
[MqttService] 📡 Subscribed to: vending-machine/VM-001/heartbeat
```

---

#### **Step 3: Open Postman WebSocket**

1. **New WebSocket Request**
2. **URL:** `ws://localhost:3000`
3. **Click Connect**

**Expected Response:**

```
Connected
```

---

#### **Step 4: Publish Temperature Data**

**Windows PowerShell:**

```powershell
.\mosquitto_pub.exe -h 127.0.0.1 -p 1883 -t "vending-machine/VM-001/temperature" -m "{\"machineCode\":\"VM-001\",\"temperature\":5.5,\"humidity\":65.2,\"timestamp\":\"2025-12-17T14:00:00.000Z\"}"
```

**Check 3 Places:**

**1. Backend Logs:**

```
[MqttService] 📨 Received message on vending-machine/VM-001/temperature
[MqttService] 🌡️ Temperature updated for Vending Machine 1: 5.5°C
[MachineGateway] 📤 Temperature update sent for machine 1
```

**2. Postman WebSocket (Messages tab):**

```json
{
  "machineId": 1,
  "machineCode": "VM-001",
  "machineName": "Vending Machine 1",
  "machineLocation": "Lobby A",
  "temperature": 5.5,
  "humidity": 65.2,
  "timestamp": "2025-12-17T14:00:00.000Z"
}
```

**3. Database:**

```sql
-- Check current temperature (updated immediately)
SELECT id, code, currentTemperature, currentHumidity, lastOnline
FROM machines
WHERE code = 'VM-001';

-- Expected Result:
-- currentTemperature: 5.5
-- currentHumidity: 65.2
-- lastOnline: 2025-12-17 14:00:00
```

---

#### **Step 5: Publish Status Update**

**Windows PowerShell:**

```powershell
.\mosquitto_pub.exe -h 127.0.0.1 -p 1883 -t "vending-machine/VM-001/status" -m "{\"machineCode\":\"VM-001\",\"status\":\"maintenance\",\"timestamp\":\"2025-12-17T14:01:00.000Z\"}"
```

**Check Postman WebSocket:**

```json
{
  "machineId": 1,
  "status": "maintenance",
  "timestamp": "2025-12-17T14:01:00.000Z"
}
```

---

#### **Step 6: Publish Heartbeat**

**Windows PowerShell:**

```powershell
.\mosquitto_pub.exe -h 127.0.0.1 -p 1883 -t "vending-machine/VM-001/heartbeat" -m "{\"machineCode\":\"VM-001\",\"timestamp\":\"2025-12-17T14:02:00.000Z\"}"
```

**Check Postman WebSocket:**

```json
{
  "machineId": 1,
  "machineCode": "VM-001",
  "timestamp": "2025-12-17T14:02:00.000Z"
}
```

---

## IoT Device Simulator Script

Untuk testing continuous data, gunakan script ini:

### **Node.js Simulator**

Create file: `mqtt-simulator.js`

```javascript
const mqtt = require('mqtt');

const client = mqtt.connect('mqtt://127.0.0.1:1883');

const MACHINE_CODE = 'VM-001';

client.on('connect', () => {
  console.log('✅ Simulator Connected to MQTT Broker');
  console.log(`📡 Simulating data for machine: ${MACHINE_CODE}\n`);

  // Send temperature every 5 seconds
  setInterval(() => {
    const temp = (Math.random() * 6 + 3).toFixed(1); // 3-9°C
    const humidity = (Math.random() * 20 + 55).toFixed(1); // 55-75%

    const payload = {
      machineCode: MACHINE_CODE,
      temperature: parseFloat(temp),
      humidity: parseFloat(humidity),
      timestamp: new Date().toISOString(),
    };

    client.publish(
      `vending-machine/${MACHINE_CODE}/temperature`,
      JSON.stringify(payload),
    );

    console.log(`🌡️ Temperature: ${temp}°C, Humidity: ${humidity}%`);
  }, 5000);

  // Send heartbeat every 30 seconds
  setInterval(() => {
    const payload = {
      machineCode: MACHINE_CODE,
      timestamp: new Date().toISOString(),
    };

    client.publish(
      `vending-machine/${MACHINE_CODE}/heartbeat`,
      JSON.stringify(payload),
    );

    console.log(`💓 Heartbeat sent`);
  }, 30000);

  // Simulate random status changes every 2 minutes
  setInterval(() => {
    const statuses = ['online', 'maintenance'];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

    const payload = {
      machineCode: MACHINE_CODE,
      status: randomStatus,
      timestamp: new Date().toISOString(),
    };

    client.publish(
      `vending-machine/${MACHINE_CODE}/status`,
      JSON.stringify(payload),
    );

    console.log(`🔄 Status changed to: ${randomStatus}`);
  }, 120000);
});

client.on('error', (error) => {
  console.error('❌ Error:', error);
});

process.on('SIGINT', () => {
  console.log('\n👋 Stopping simulator...');
  client.end();
  process.exit();
});
```

**Run Simulator:**

```bash
# Install mqtt package
npm install mqtt

# Run simulator
node mqtt-simulator.js
```

**Expected Output:**

```
✅ Simulator Connected to MQTT Broker
📡 Simulating data for machine: VM-001

🌡️ Temperature: 5.2°C, Humidity: 64.8%
🌡️ Temperature: 5.7°C, Humidity: 65.3%
💓 Heartbeat sent
🌡️ Temperature: 6.1°C, Humidity: 66.2%
🔄 Status changed to: maintenance
```

---

## PowerShell Testing Script

Create file: `mqtt-test.ps1`

```powershell
# MQTT Testing Script for Vending Machine
# Usage: .\mqtt-test.ps1

$host = "127.0.0.1"
$port = "1883"
$machineCode = "VM-001"

Write-Host "🚀 Starting MQTT Test for $machineCode" -ForegroundColor Green
Write-Host ""

# Test 1: Temperature Data
Write-Host "📊 Test 1: Sending Temperature Data..." -ForegroundColor Yellow
.\mosquitto_pub.exe -h $host -p $port -t "vending-machine/$machineCode/temperature" -m "{`"machineCode`":`"$machineCode`",`"temperature`":5.5,`"humidity`":65.2,`"timestamp`":`"$(Get-Date -Format o)`"}"
Start-Sleep -Seconds 2

# Test 2: Different Temperature
Write-Host "📊 Test 2: Sending Different Temperature..." -ForegroundColor Yellow
.\mosquitto_pub.exe -h $host -p $port -t "vending-machine/$machineCode/temperature" -m "{`"machineCode`":`"$machineCode`",`"temperature`":6.2,`"humidity`":67.5,`"timestamp`":`"$(Get-Date -Format o)`"}"
Start-Sleep -Seconds 2

# Test 3: Status Online
Write-Host "🟢 Test 3: Setting Status to Online..." -ForegroundColor Yellow
.\mosquitto_pub.exe -h $host -p $port -t "vending-machine/$machineCode/status" -m "{`"machineCode`":`"$machineCode`",`"status`":`"online`",`"timestamp`":`"$(Get-Date -Format o)`"}"
Start-Sleep -Seconds 2

# Test 4: Status Maintenance
Write-Host "🟡 Test 4: Setting Status to Maintenance..." -ForegroundColor Yellow
.\mosquitto_pub.exe -h $host -p $port -t "vending-machine/$machineCode/status" -m "{`"machineCode`":`"$machineCode`",`"status`":`"maintenance`",`"timestamp`":`"$(Get-Date -Format o)`"}"
Start-Sleep -Seconds 2

# Test 5: Heartbeat
Write-Host "💓 Test 5: Sending Heartbeat..." -ForegroundColor Yellow
.\mosquitto_pub.exe -h $host -p $port -t "vending-machine/$machineCode/heartbeat" -m "{`"machineCode`":`"$machineCode`",`"timestamp`":`"$(Get-Date -Format o)`"}"
Start-Sleep -Seconds 2

# Test 6: Multiple Temperature Data (Simulate real-time)
Write-Host "📊 Test 6: Sending Multiple Temperature Data..." -ForegroundColor Yellow
for ($i = 1; $i -le 5; $i++) {
    $temp = [math]::Round((Get-Random -Minimum 3.0 -Maximum 9.0), 1)
    $humidity = [math]::Round((Get-Random -Minimum 55.0 -Maximum 75.0), 1)

    Write-Host "   Data $i - Temp: ${temp}°C, Humidity: ${humidity}%" -ForegroundColor Cyan
    .\mosquitto_pub.exe -h $host -p $port -t "vending-machine/$machineCode/temperature" -m "{`"machineCode`":`"$machineCode`",`"temperature`":$temp,`"humidity`":$humidity,`"timestamp`":`"$(Get-Date -Format o)`"}"
    Start-Sleep -Seconds 3
}

Write-Host ""
Write-Host "✅ All tests completed!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next Steps:" -ForegroundColor Yellow
Write-Host "   1. Check backend logs for received messages"
Write-Host "   2. Check Postman WebSocket for real-time updates"
Write-Host "   3. Check database for updated data"
```

**Run PowerShell Script:**

```powershell
.\mqtt-test.ps1
```

---

## Bash Testing Script

Create file: `mqtt-test.sh`

```bash
#!/bin/bash

# MQTT Testing Script for Vending Machine
# Usage: chmod +x mqtt-test.sh && ./mqtt-test.sh

HOST="127.0.0.1"
PORT="1883"
MACHINE_CODE="VM-001"

echo "🚀 Starting MQTT Test for $MACHINE_CODE"
echo ""

# Test 1: Temperature Data
echo "📊 Test 1: Sending Temperature Data..."
mosquitto_pub -h $HOST -p $PORT -t "vending-machine/$MACHINE_CODE/temperature" -m "{\"machineCode\":\"$MACHINE_CODE\",\"temperature\":5.5,\"humidity\":65.2,\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\"}"
sleep 2

# Test 2: Different Temperature
echo "📊 Test 2: Sending Different Temperature..."
mosquitto_pub -h $HOST -p $PORT -t "vending-machine/$MACHINE_CODE/temperature" -m "{\"machineCode\":\"$MACHINE_CODE\",\"temperature\":6.2,\"humidity\":67.5,\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\"}"
sleep 2

# Test 3: Status Online
echo "🟢 Test 3: Setting Status to Online..."
mosquitto_pub -h $HOST -p $PORT -t "vending-machine/$MACHINE_CODE/status" -m "{\"machineCode\":\"$MACHINE_CODE\",\"status\":\"online\",\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\"}"
sleep 2

# Test 4: Status Maintenance
echo "🟡 Test 4: Setting Status to Maintenance..."
mosquitto_pub -h $HOST -p $PORT -t "vending-machine/$MACHINE_CODE/status" -m "{\"machineCode\":\"$MACHINE_CODE\",\"status\":\"maintenance\",\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\"}"
sleep 2

# Test 5: Heartbeat
echo "💓 Test 5: Sending Heartbeat..."
mosquitto_pub -h $HOST -p $PORT -t "vending-machine/$MACHINE_CODE/heartbeat" -m "{\"machineCode\":\"$MACHINE_CODE\",\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\"}"
sleep 2

# Test 6: Multiple Temperature Data
echo "📊 Test 6: Sending Multiple Temperature Data..."
for i in {1..5}
do
    TEMP=$(awk -v min=3 -v max=9 'BEGIN{srand(); print min+rand()*(max-min)}' | xargs printf "%.1f")
    HUMIDITY=$(awk -v min=55 -v max=75 'BEGIN{srand(); print min+rand()*(max-min)}' | xargs printf "%.1f")

    echo "   Data $i - Temp: ${TEMP}°C, Humidity: ${HUMIDITY}%"
    mosquitto_pub -h $HOST -p $PORT -t "vending-machine/$MACHINE_CODE/temperature" -m "{\"machineCode\":\"$MACHINE_CODE\",\"temperature\":$TEMP,\"humidity\":$HUMIDITY,\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\"}"
    sleep 3
done

echo ""
echo "✅ All tests completed!"
echo ""
echo "📝 Next Steps:"
echo "   1. Check backend logs for received messages"
echo "   2. Check Postman WebSocket for real-time updates"
echo "   3. Check database for updated data"
```

**Run Bash Script:**

```bash
chmod +x mqtt-test.sh
./mqtt-test.sh
```

---

## MQTT Command Reference

### Basic Commands

**Publish Message:**

```powershell
# Windows
.\mosquitto_pub.exe -h <host> -p <port> -t <topic> -m <message>

# Linux/Mac
mosquitto_pub -h <host> -p <port> -t <topic> -m <message>
```

**Subscribe to Topic:**

```powershell
# Windows
.\mosquitto_sub.exe -h <host> -p <port> -t <topic>

# Linux/Mac
mosquitto_sub -h <host> -p <port> -t <topic>
```

### Command Options

| Option | Description                              | Example                   |
| ------ | ---------------------------------------- | ------------------------- |
| `-h`   | MQTT broker host                         | `-h 127.0.0.1`            |
| `-p`   | MQTT broker port                         | `-p 1883`                 |
| `-t`   | Topic name                               | `-t "sensor/temperature"` |
| `-m`   | Message payload                          | `-m "25"`                 |
| `-v`   | Verbose output (show topic with message) | `-v`                      |
| `-u`   | Username for authentication              | `-u admin`                |
| `-P`   | Password for authentication              | `-P password123`          |
| `-q`   | QoS level (0, 1, or 2)                   | `-q 1`                    |
| `-r`   | Retain message                           | `-r`                      |

### QoS Levels

| QoS | Description                           | Use Case                                 |
| --- | ------------------------------------- | ---------------------------------------- |
| `0` | At most once (fire and forget)        | Heartbeat, non-critical data             |
| `1` | At least once (acknowledged delivery) | Temperature data, status updates         |
| `2` | Exactly once (assured delivery)       | Critical commands, payment confirmations |

---

## Data Flow Diagram

```
┌─────────────────┐
│  IoT Device     │ (ESP32/Arduino + DHT22 Sensor)
│  (Vending       │
│   Machine)      │
└────────┬────────┘
         │
         │ 1. Publish MQTT
         │ Topic: vending-machine/VM-001/temperature
         │ Payload: {"machineCode":"VM-001","temperature":5.5,"humidity":65.2}
         │
         ▼
┌─────────────────┐
│  Mosquitto      │ MQTT Broker (localhost:1883)
│  Broker         │
└────────┬────────┘
         │
         │ 2. Backend subscribed ke topic
         │
         ▼
┌─────────────────┐
│  NestJS MQTT    │
│  Service        │
└────────┬────────┘
         │
         ├──────────────────┬──────────────────┬──────────────────┐
         │                  │                  │                  │
         ▼                  ▼                  ▼                  ▼
┌────────────────┐  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│ Update         │  │ WebSocket      │  │ Save to        │  │ Check Machine  │
│ machines       │  │ Gateway        │  │ temperature    │  │ Status         │
│ table          │  │ (Emit)         │  │ _logs          │  │                │
│ (ALWAYS)       │  │ (REAL-TIME)    │  │ (EVERY 1 HOUR) │  │                │
└────────────────┘  └────────┬───────┘  └────────────────┘  └────────────────┘
                             │
                             │ 3. Emit via WebSocket
                             │
                             ▼
                    ┌────────────────┐
                    │  Frontend      │ (React/Next.js)
                    │  (Postman WS)  │
                    └────────────────┘
```

---

## Troubleshooting

### Problem: Backend tidak menerima data MQTT

**Solution:**

1. Check Mosquitto running:

   ```powershell
   # Windows
   netstat -ano | findstr :1883

   # Linux/Mac
   netstat -tuln | grep 1883
   ```

2. Check backend logs - harus ada log "Subscribed to: ..."
3. Check machineCode di payload sesuai dengan data di database
4. Test manual subscribe:
   ```powershell
   .\mosquitto_sub.exe -h 127.0.0.1 -p 1883 -t "vending-machine/#" -v
   ```

### Problem: WebSocket tidak menerima update

**Solution:**

1. Check WebSocket connected di Postman (status: Connected)
2. Check backend logs - harus ada log "Temperature update sent"
3. Restart backend dan reconnect WebSocket

### Problem: Data tidak tersimpan ke database

**Solution:**

1. Check database connection di backend logs
2. Check machineCode exist di table `machines`
3. Check backend logs untuk error messages
4. Verify payload format (must be valid JSON)

---

## Integration with ESP32/Arduino

### Arduino Example Code

```cpp
#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <ArduinoJson.h>

// WiFi credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// MQTT Broker
const char* mqtt_server = "192.168.1.100"; // Your backend server IP
const int mqtt_port = 1883;
const char* machineCode = "VM-001";

// DHT Sensor
#define DHTPIN 4
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

WiFiClient espClient;
PubSubClient client(espClient);

void setup() {
  Serial.begin(115200);
  dht.begin();

  // Connect to WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected");

  // Connect to MQTT
  client.setServer(mqtt_server, mqtt_port);
  reconnectMQTT();
}

void loop() {
  if (!client.connected()) {
    reconnectMQTT();
  }
  client.loop();

  // Read sensor data
  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();

  if (!isnan(temperature) && !isnan(humidity)) {
    publishTemperature(temperature, humidity);
    publishHeartbeat();
  }

  delay(5000); // Send data every 5 seconds
}

void reconnectMQTT() {
  while (!client.connected()) {
    Serial.print("Connecting to MQTT...");
    if (client.connect(machineCode)) {
      Serial.println("connected");
      publishStatus("online");
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      delay(5000);
    }
  }
}

void publishTemperature(float temp, float humidity) {
  StaticJsonDocument<256> doc;
  doc["machineCode"] = machineCode;
  doc["temperature"] = temp;
  doc["humidity"] = humidity;
  doc["timestamp"] = getISOTimestamp();

  char buffer[256];
  serializeJson(doc, buffer);

  String topic = "vending-machine/" + String(machineCode) + "/temperature";
  client.publish(topic.c_str(), buffer);

  Serial.print("Temperature published: ");
  Serial.println(buffer);
}

void publishStatus(const char* status) {
  StaticJsonDocument<128> doc;
  doc["machineCode"] = machineCode;
  doc["status"] = status;
  doc["timestamp"] = getISOTimestamp();

  char buffer[128];
  serializeJson(doc, buffer);

  String topic = "vending-machine/" + String(machineCode) + "/status";
  client.publish(topic.c_str(), buffer);
}

void publishHeartbeat() {
  StaticJsonDocument<128> doc;
  doc["machineCode"] = machineCode;
  doc["timestamp"] = getISOTimestamp();

  char buffer[128];
  serializeJson(doc, buffer);

  String topic = "vending-machine/" + String(machineCode) + "/heartbeat";
  client.publish(topic.c_str(), buffer);
}

String getISOTimestamp() {
  // Implement NTP time sync in production
  return "2025-12-17T14:00:00.000Z";
}
```

---

## WebSocket Events Reference

Frontend akan menerima 3 jenis events dari WebSocket:

### Event 1: `temperature-update`

**Payload:**

```json
{
  "machineId": 1,
  "machineCode": "VM-001",
  "machineName": "Vending Machine 1",
  "machineLocation": "Lobby A",
  "temperature": 5.5,
  "humidity": 65.2,
  "timestamp": "2025-12-17T14:00:00.000Z"
}
```

### Event 2: `status-update`

**Payload:**

```json
{
  "machineId": 1,
  "status": "online",
  "timestamp": "2025-12-17T14:00:00.000Z"
}
```

### Event 3: `heartbeat`

**Payload:**

```json
{
  "machineId": 1,
  "machineCode": "VM-001",
  "timestamp": "2025-12-17T14:00:00.000Z"
}
```

---

## Summary

**MQTT Topics:**

```
✅ vending-machine/{MACHINE_CODE}/temperature   - Temperature & humidity data
✅ vending-machine/{MACHINE_CODE}/status        - Machine status updates
✅ vending-machine/{MACHINE_CODE}/heartbeat     - Connection heartbeat
```

**Data Storage:**

```
✅ machines.currentTemperature   - Updated ALWAYS (real-time)
✅ machines.currentHumidity      - Updated ALWAYS (real-time)
✅ machines.status               - Updated on status change
✅ machines.lastOnline           - Updated on every message
✅ temperature_logs              - Saved EVERY 1 HOUR (for history/analytics)
```

**Real-time Updates:**

```
✅ WebSocket Gateway             - Emit ALWAYS (real-time to frontend)
✅ Frontend updates              - Real-time (no refresh needed)
✅ Postman WebSocket             - Real-time monitoring
```

---

**Last Updated:** December 17, 2025  
**MQTT Documentation Version:** 1.0.0

<!-- existing content continues -->
