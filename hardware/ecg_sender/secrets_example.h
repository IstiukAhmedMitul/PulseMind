// ============================================================
// secrets_example.h
// ------------------------------------------------------------
// এই ফাইলটা কপি করে "secrets.h" নামে সেভ করো (একই ফোল্ডারে)।
// secrets.h কে .gitignore এ রাখতে হবে, যাতে GitHub এ push না হয়।
//
//   cp secrets_example.h secrets.h
//
// তারপর secrets.h এ তোমার আসল WiFi credential আর server IP বসাও।
// ============================================================

#define WIFI_SSID     "YOUR_WIFI_NAME"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

// PC/সার্ভার যে মেশিনে FastAPI চলবে, তার WiFi IPv4 address
// (Windows: ipconfig, Linux/Mac: ifconfig / ip addr)
#define SERVER_IP     "192.168.1.100"
#define SERVER_PORT   8000   // FastAPI ডিফল্ট পোর্ট (uvicorn সাধারণত 8000 ব্যবহার করে)
