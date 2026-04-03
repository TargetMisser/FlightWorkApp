# WearOS Companion App — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a WearOS companion app that displays pinned flight operational times from the phone app, with a watch face complication showing countdown to the next event.

**Architecture:** New `wear/` Gradle module with Jetpack Compose for Wear OS (Kotlin). Phone app sends pinned flight data via Wearable Data Layer API (DataClient). Watch listens for changes and renders a timeline UI. Complication provides at-a-glance countdown on the watch face.

**Tech Stack:** Kotlin 2.1.20, Jetpack Compose for Wear OS, Play Services Wearable (Data Layer API), compileSdk 36, Wear OS minSdk 30, Horologist Compose Layout.

**Existing project:** React Native (Expo) app with Android module at `android/`. Phone app namespace: `com.anonymous.FlightWorkApp`. Pinned flight stored in AsyncStorage key `pinned_flight_v1`.

---

### Task 1: Create Wear Module Scaffold

**Files:**
- Create: `android/wear/build.gradle`
- Create: `android/wear/src/main/AndroidManifest.xml`
- Create: `android/wear/src/main/java/com/anonymous/flightworkapp/wear/MainActivity.kt`
- Create: `android/wear/src/main/java/com/anonymous/flightworkapp/wear/theme/Theme.kt`
- Create: `android/wear/src/main/res/values/strings.xml`
- Create: `android/wear/src/main/res/mipmap-hdpi/ic_launcher.png` (copy from app icon)
- Modify: `android/settings.gradle`
- Modify: `android/build.gradle`

- [ ] **Step 1: Create `android/wear/build.gradle`**

```groovy
plugins {
    id 'com.android.application'
    id 'org.jetbrains.kotlin.android'
    id 'org.jetbrains.kotlin.plugin.compose'
}

android {
    namespace 'com.anonymous.flightworkapp.wear'
    compileSdk 36

    defaultConfig {
        applicationId 'com.anonymous.FlightWorkApp'
        minSdkVersion 30
        targetSdkVersion 36
        versionCode 1
        versionName "1.0"
    }

    buildFeatures {
        compose true
    }

    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = '17'
    }
}

dependencies {
    implementation platform('androidx.compose:compose-bom:2025.01.01')
    implementation 'androidx.wear.compose:compose-material3:1.0.0-alpha32'
    implementation 'androidx.wear.compose:compose-foundation:1.5.0'
    implementation 'androidx.wear.compose:compose-navigation:1.5.0'
    implementation 'androidx.activity:activity-compose:1.9.3'
    implementation 'com.google.android.gms:play-services-wearable:19.0.0'
    implementation 'androidx.wear.watchface:watchface-complications-data-source-ktx:1.2.1'
    implementation 'androidx.lifecycle:lifecycle-runtime-ktx:2.8.7'
    implementation 'com.google.android.horologist:horologist-compose-layout:0.6.22'
}
```

- [ ] **Step 2: Create `android/wear/src/main/AndroidManifest.xml`**

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <uses-feature android:name="android.hardware.type.watch" />

    <application
        android:label="@string/app_name"
        android:icon="@mipmap/ic_launcher"
        android:theme="@android:style/Theme.DeviceDefault">

        <uses-library android:name="com.google.android.wearable" android:required="true" />

        <meta-data
            android:name="com.google.android.wearable.standalone"
            android:value="false" />

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:taskAffinity=""
            android:theme="@android:style/Theme.DeviceDefault">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
```

- [ ] **Step 3: Create `android/wear/src/main/res/values/strings.xml`**

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">AeroStaff</string>
</resources>
```

- [ ] **Step 4: Create theme file `android/wear/src/main/java/com/anonymous/flightworkapp/wear/theme/Theme.kt`**

```kotlin
package com.anonymous.flightworkapp.wear.theme

import androidx.compose.ui.graphics.Color

object WearColors {
    val background = Color(0xFF0F172A)
    val textPrimary = Color(0xFFF1F5F9)
    val textSecondary = Color(0xFF94A3B8)
    val textMuted = Color(0xFF6B7280)
    val accent = Color(0xFF3B82F6)
    val accentLight = Color(0xFF93C5FD)
    val accentBg = Color(0xFF1E3A5F)
    val amber = Color(0xFFF59E0B)
    val amberBg = Color(0xFF451A03)
    val green = Color(0xFF10B981)
    val red = Color(0xFFEF4444)
    val lineBg = Color(0xFF334155)
}
```

- [ ] **Step 5: Create placeholder `MainActivity.kt`**

```kotlin
package com.anonymous.flightworkapp.wear

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.sp
import androidx.wear.compose.material3.Text
import com.anonymous.flightworkapp.wear.theme.WearColors

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(WearColors.background),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "✈️\nNessun volo\nPinna un volo dall'app",
                    color = WearColors.textSecondary,
                    fontSize = 14.sp,
                    textAlign = TextAlign.Center
                )
            }
        }
    }
}
```

- [ ] **Step 6: Add wear module to `android/settings.gradle`**

Add this line before the final `includeBuild` line:

```groovy
include ':wear'
```

- [ ] **Step 7: Copy app icon to wear module**

```bash
mkdir -p android/wear/src/main/res/mipmap-hdpi
cp android/app/src/main/res/mipmap-hdpi/ic_launcher.png android/wear/src/main/res/mipmap-hdpi/ic_launcher.png
```

- [ ] **Step 8: Build wear module to verify scaffold**

```bash
cd android && ./gradlew :wear:assembleDebug
```

Expected: BUILD SUCCESSFUL

- [ ] **Step 9: Commit**

```bash
git add android/wear/ android/settings.gradle
git commit -m "feat(wear): scaffold WearOS companion module"
```

---

### Task 2: Flight Data Model and DataLayer Receiver

**Files:**
- Create: `android/wear/src/main/java/com/anonymous/flightworkapp/wear/data/FlightData.kt`
- Create: `android/wear/src/main/java/com/anonymous/flightworkapp/wear/data/DataLayerListenerService.kt`
- Modify: `android/wear/src/main/AndroidManifest.xml`

- [ ] **Step 1: Create `FlightData.kt`**

```kotlin
package com.anonymous.flightworkapp.wear.data

import org.json.JSONObject

data class FlightOps(
    val checkInOpen: Int,
    val checkInClose: Int,
    val gateOpen: Int,
    val gateClose: Int
)

data class FlightData(
    val flightNumber: String,
    val airline: String,
    val airlineColor: String,
    val iataCode: String,
    val tab: String, // "departures" or "arrivals"
    val destination: String,
    val origin: String,
    val scheduledTime: Long, // unix seconds
    val estimatedTime: Long?,
    val realDeparture: Long?,
    val realArrival: Long?,
    val ops: FlightOps?,
    val inboundArrival: Long?,
    val pinnedAt: Long
) {
    companion object {
        fun fromJson(json: String): FlightData? {
            return try {
                val o = JSONObject(json)
                val opsObj = o.optJSONObject("ops")
                FlightData(
                    flightNumber = o.getString("flightNumber"),
                    airline = o.getString("airline"),
                    airlineColor = o.getString("airlineColor"),
                    iataCode = o.optString("iataCode", ""),
                    tab = o.getString("tab"),
                    destination = o.optString("destination", ""),
                    origin = o.optString("origin", ""),
                    scheduledTime = o.getLong("scheduledTime"),
                    estimatedTime = o.optLong("estimatedTime").takeIf { o.has("estimatedTime") && !o.isNull("estimatedTime") },
                    realDeparture = o.optLong("realDeparture").takeIf { o.has("realDeparture") && !o.isNull("realDeparture") },
                    realArrival = o.optLong("realArrival").takeIf { o.has("realArrival") && !o.isNull("realArrival") },
                    ops = opsObj?.let {
                        FlightOps(
                            checkInOpen = it.getInt("checkInOpen"),
                            checkInClose = it.getInt("checkInClose"),
                            gateOpen = it.getInt("gateOpen"),
                            gateClose = it.getInt("gateClose")
                        )
                    },
                    inboundArrival = o.optLong("inboundArrival").takeIf { o.has("inboundArrival") && !o.isNull("inboundArrival") },
                    pinnedAt = o.optLong("pinnedAt", System.currentTimeMillis() / 1000)
                )
            } catch (e: Exception) {
                null
            }
        }
    }
}
```

- [ ] **Step 2: Create `DataLayerListenerService.kt`**

```kotlin
package com.anonymous.flightworkapp.wear.data

import android.content.Intent
import com.google.android.gms.wearable.DataEventBuffer
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.WearableListenerService

class DataLayerListenerService : WearableListenerService() {

    companion object {
        const val PATH_PINNED_FLIGHT = "/pinned_flight"
        const val KEY_FLIGHT_JSON = "flight_json"
        const val ACTION_FLIGHT_UPDATED = "com.anonymous.flightworkapp.wear.FLIGHT_UPDATED"
        const val EXTRA_FLIGHT_JSON = "flight_json"
    }

    override fun onDataChanged(dataEvents: DataEventBuffer) {
        for (event in dataEvents) {
            val uri = event.dataItem.uri
            if (uri.path == PATH_PINNED_FLIGHT) {
                val dataMap = DataMapItem.fromDataItem(event.dataItem).dataMap
                val json = dataMap.getString(KEY_FLIGHT_JSON) ?: ""
                val intent = Intent(ACTION_FLIGHT_UPDATED).apply {
                    putExtra(EXTRA_FLIGHT_JSON, json)
                    setPackage(packageName)
                }
                sendBroadcast(intent)
            }
        }
    }
}
```

- [ ] **Step 3: Register service in `AndroidManifest.xml`**

Add inside `<application>`, after the `<activity>` block:

```xml
        <service
            android:name=".data.DataLayerListenerService"
            android:exported="true">
            <intent-filter>
                <action android:name="com.google.android.gms.wearable.DATA_CHANGED" />
                <data android:scheme="wear" android:host="*" android:pathPrefix="/pinned_flight" />
            </intent-filter>
        </service>
```

- [ ] **Step 4: Build to verify**

```bash
cd android && ./gradlew :wear:assembleDebug
```

Expected: BUILD SUCCESSFUL

- [ ] **Step 5: Commit**

```bash
git add android/wear/src/
git commit -m "feat(wear): add FlightData model and DataLayer listener service"
```

---

### Task 3: Timeline UI Components

**Files:**
- Create: `android/wear/src/main/java/com/anonymous/flightworkapp/wear/ui/TimelineEvent.kt`
- Create: `android/wear/src/main/java/com/anonymous/flightworkapp/wear/ui/FlightTimeline.kt`
- Create: `android/wear/src/main/java/com/anonymous/flightworkapp/wear/ui/EmptyState.kt`

- [ ] **Step 1: Create `TimelineEvent.kt`** — data class for timeline items

```kotlin
package com.anonymous.flightworkapp.wear.ui

import androidx.compose.ui.graphics.Color

enum class EventStatus { PAST, CURRENT, FUTURE }

data class TimelineEvent(
    val label: String,
    val time: String,
    val status: EventStatus,
    val accentColor: Color
)
```

- [ ] **Step 2: Create `FlightTimeline.kt`** — the main composable

```kotlin
package com.anonymous.flightworkapp.wear.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.wear.compose.material3.Text
import com.anonymous.flightworkapp.wear.data.FlightData
import com.anonymous.flightworkapp.wear.theme.WearColors
import java.text.SimpleDateFormat
import java.util.*

private val timeFmt = SimpleDateFormat("HH:mm", Locale.getDefault())
private fun fmtTime(epochSec: Long): String = timeFmt.format(Date(epochSec * 1000))

fun buildDepartureEvents(flight: FlightData): List<TimelineEvent> {
    val now = System.currentTimeMillis() / 1000
    val dep = flight.scheduledTime
    val ops = flight.ops ?: return emptyList()
    val gateOpenTime = flight.inboundArrival ?: (dep - ops.gateOpen * 60)

    data class RawEvent(val label: String, val ts: Long, val color: Color)
    val raw = listOf(
        RawEvent("CI Open", dep - ops.checkInOpen * 60, WearColors.accent),
        RawEvent("CI Close", dep - ops.checkInClose * 60, WearColors.accent),
        RawEvent("Gate", gateOpenTime, WearColors.accent),
        RawEvent("Gate Close", dep - ops.gateClose * 60, WearColors.accent),
        RawEvent("DEP", dep, WearColors.accent)
    )

    return raw.mapIndexed { i, ev ->
        val nextTs = raw.getOrNull(i + 1)?.ts ?: Long.MAX_VALUE
        val status = when {
            now >= nextTs -> EventStatus.PAST
            now >= ev.ts -> EventStatus.CURRENT
            else -> EventStatus.FUTURE
        }
        TimelineEvent(ev.label, fmtTime(ev.ts), status, ev.color)
    }
}

fun buildArrivalEvents(flight: FlightData): List<TimelineEvent> {
    val now = System.currentTimeMillis() / 1000
    val bestArrival = flight.realArrival ?: flight.estimatedTime ?: flight.scheduledTime
    val landed = flight.realArrival != null
    val departed = flight.realDeparture != null

    val events = mutableListOf<TimelineEvent>()

    // Partito
    val depStatus = if (departed) EventStatus.PAST else EventStatus.FUTURE
    events.add(TimelineEvent(
        "Partito",
        if (departed) fmtTime(flight.realDeparture!!) else "--:--",
        depStatus,
        WearColors.green
    ))

    // In volo
    if (departed && !landed) {
        val remaining = bestArrival - now
        val mins = (remaining / 60).coerceAtLeast(0)
        val h = mins / 60
        val m = mins % 60
        val timeStr = if (h > 0) "~${h}h ${m}m" else "~${m}m"
        events.add(TimelineEvent("In volo", timeStr, EventStatus.CURRENT, WearColors.amber))
    }

    // Atterraggio
    val arrStatus = when {
        landed -> EventStatus.PAST
        departed -> EventStatus.FUTURE
        else -> EventStatus.FUTURE
    }
    events.add(TimelineEvent(
        if (landed) "Atterrato" else "Atterraggio",
        fmtTime(bestArrival),
        arrStatus,
        if (landed) WearColors.green else WearColors.accent
    ))

    return events
}

@Composable
fun FlightTimelineScreen(flight: FlightData) {
    val headerColor = try { Color(android.graphics.Color.parseColor(flight.airlineColor)) } catch (_: Exception) { WearColors.accent }
    val events = if (flight.tab == "departures") buildDepartureEvents(flight) else buildArrivalEvents(flight)
    val now = System.currentTimeMillis() / 1000

    // Countdown text
    val currentOrNext = events.firstOrNull { it.status == EventStatus.CURRENT }
        ?: events.firstOrNull { it.status == EventStatus.FUTURE }
    val countdownText = if (flight.tab == "arrivals") {
        val best = flight.realArrival ?: flight.estimatedTime ?: flight.scheduledTime
        val delay = ((best - flight.scheduledTime) / 60).toInt()
        if (flight.realArrival != null) "Atterrato"
        else if (delay > 0) "+$delay min ritardo"
        else "In orario"
    } else {
        currentOrNext?.let { "${it.label} tra ${((events.indexOf(it)).let { idx ->
            // Find the timestamp for countdown
            val dep = flight.scheduledTime
            val ops = flight.ops
            if (ops != null) {
                val gateOpenTime = flight.inboundArrival ?: (dep - ops.gateOpen * 60)
                val timestamps = listOf(
                    dep - ops.checkInOpen * 60,
                    dep - ops.checkInClose * 60,
                    gateOpenTime,
                    dep - ops.gateClose * 60,
                    dep
                )
                val ts = timestamps.getOrNull(idx) ?: dep
                val mins = ((ts - now) / 60).coerceAtLeast(0)
                if (mins > 60) "${mins / 60}h ${mins % 60}m" else "${mins}m"
            } else "?"
        })}" } ?: ""
    }

    // Header label
    val headerLabel = if (flight.tab == "departures") {
        "${flight.flightNumber} → ${flight.destination}"
    } else {
        "${flight.flightNumber} ← ${flight.origin}"
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(WearColors.background)
    ) {
        // Header
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(headerColor)
                .padding(vertical = 5.dp, horizontal = 10.dp),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = headerLabel,
                color = Color.White,
                fontSize = 14.sp,
                fontWeight = FontWeight.Black
            )
        }

        // Timeline
        Column(
            modifier = Modifier
                .weight(1f)
                .padding(start = 24.dp, end = 20.dp, top = 8.dp)
        ) {
            events.forEachIndexed { index, event ->
                Row(
                    modifier = Modifier.padding(bottom = if (event.status == EventStatus.CURRENT || flight.tab == "arrivals") 8.dp else 4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Dot
                    val dotSize = if (event.status == EventStatus.CURRENT) 12.dp else 8.dp
                    val dotColor = when (event.status) {
                        EventStatus.PAST -> WearColors.green
                        EventStatus.CURRENT -> event.accentColor
                        EventStatus.FUTURE -> WearColors.lineBg
                    }
                    Box(
                        modifier = Modifier
                            .size(dotSize)
                            .clip(CircleShape)
                            .background(dotColor)
                    )

                    Spacer(Modifier.width(10.dp))

                    // Label + time
                    val rowModifier = if (event.status == EventStatus.CURRENT) {
                        Modifier
                            .fillMaxWidth()
                            .background(WearColors.accentBg, RoundedCornerShape(6.dp))
                            .padding(horizontal = 6.dp, vertical = 3.dp)
                    } else {
                        Modifier.fillMaxWidth()
                    }

                    Row(
                        modifier = rowModifier,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        val textColor = when (event.status) {
                            EventStatus.PAST -> WearColors.textMuted
                            EventStatus.CURRENT -> WearColors.accentLight
                            EventStatus.FUTURE -> WearColors.textSecondary
                        }
                        val fontSize = if (event.status == EventStatus.CURRENT) 14.sp else 12.sp
                        val weight = if (event.status == EventStatus.CURRENT) FontWeight.ExtraBold else FontWeight.Normal
                        val decoration = if (event.status == EventStatus.PAST) TextDecoration.LineThrough else TextDecoration.None

                        Text(event.label, color = textColor, fontSize = fontSize, fontWeight = weight, textDecoration = decoration)
                        Text(event.time, color = textColor, fontSize = fontSize, fontWeight = weight, textDecoration = decoration)
                    }
                }
            }
        }

        // Countdown
        if (countdownText.isNotEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 12.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = countdownText,
                    color = WearColors.amber,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.ExtraBold,
                    textAlign = TextAlign.Center
                )
            }
        }
    }
}
```

- [ ] **Step 3: Create `EmptyState.kt`**

```kotlin
package com.anonymous.flightworkapp.wear.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.wear.compose.material3.Text
import com.anonymous.flightworkapp.wear.theme.WearColors

@Composable
fun EmptyState() {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(WearColors.background),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text("✈️", fontSize = 36.sp)
            Spacer(Modifier.height(8.dp))
            Text(
                "Nessun volo",
                color = WearColors.textSecondary,
                fontSize = 14.sp,
                fontWeight = androidx.compose.ui.text.font.FontWeight.SemiBold
            )
            Spacer(Modifier.height(4.dp))
            Text(
                "Pinna un volo dall'app",
                color = WearColors.textMuted,
                fontSize = 11.sp,
                textAlign = TextAlign.Center
            )
        }
    }
}
```

- [ ] **Step 4: Build to verify**

```bash
cd android && ./gradlew :wear:assembleDebug
```

Expected: BUILD SUCCESSFUL

- [ ] **Step 5: Commit**

```bash
git add android/wear/src/
git commit -m "feat(wear): add timeline UI components and empty state"
```

---

### Task 4: Wire MainActivity with DataLayer

**Files:**
- Modify: `android/wear/src/main/java/com/anonymous/flightworkapp/wear/MainActivity.kt`

- [ ] **Step 1: Update `MainActivity.kt` to receive data and show UI**

```kotlin
package com.anonymous.flightworkapp.wear

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.*
import com.anonymous.flightworkapp.wear.data.DataLayerListenerService
import com.anonymous.flightworkapp.wear.data.FlightData
import com.anonymous.flightworkapp.wear.ui.EmptyState
import com.anonymous.flightworkapp.wear.ui.FlightTimelineScreen
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.Wearable
import kotlinx.coroutines.tasks.await

class MainActivity : ComponentActivity() {

    private var flightState = mutableStateOf<FlightData?>(null)

    private val receiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            val json = intent.getStringExtra(DataLayerListenerService.EXTRA_FLIGHT_JSON) ?: ""
            flightState.value = if (json.isNotEmpty()) FlightData.fromJson(json) else null
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Load initial data from DataLayer
        loadInitialData()

        setContent {
            val flight by flightState
            if (flight != null) {
                FlightTimelineScreen(flight!!)
            } else {
                EmptyState()
            }
        }
    }

    override fun onResume() {
        super.onResume()
        val filter = IntentFilter(DataLayerListenerService.ACTION_FLIGHT_UPDATED)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(receiver, filter)
        }
        loadInitialData()
    }

    override fun onPause() {
        super.onPause()
        unregisterReceiver(receiver)
    }

    private fun loadInitialData() {
        Wearable.getDataClient(this).getDataItems().addOnSuccessListener { items ->
            for (item in items) {
                if (item.uri.path == DataLayerListenerService.PATH_PINNED_FLIGHT) {
                    val dataMap = DataMapItem.fromDataItem(item).dataMap
                    val json = dataMap.getString(DataLayerListenerService.KEY_FLIGHT_JSON) ?: ""
                    flightState.value = if (json.isNotEmpty()) FlightData.fromJson(json) else null
                }
            }
            items.release()
        }
    }
}
```

- [ ] **Step 2: Build to verify**

```bash
cd android && ./gradlew :wear:assembleDebug
```

Expected: BUILD SUCCESSFUL

- [ ] **Step 3: Commit**

```bash
git add android/wear/src/
git commit -m "feat(wear): wire MainActivity with DataLayer receiver"
```

---

### Task 5: Watch Face Complication

**Files:**
- Create: `android/wear/src/main/java/com/anonymous/flightworkapp/wear/complication/FlightComplicationService.kt`
- Modify: `android/wear/src/main/AndroidManifest.xml`
- Create: `android/wear/src/main/res/drawable/ic_flight.xml`

- [ ] **Step 1: Create `ic_flight.xml` vector drawable**

```xml
<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="#93C5FD"
        android:pathData="M21,16v-2l-8,-5V3.5A1.5,1.5 0,0 0,11.5 2,1.5 1.5,0 0,0 10,3.5V9l-8,5v2l8,-2.5V19l-2,1.5V22l3.5,-1 3.5,1v-1.5L13,19V13.5l8,2.5z"/>
</vector>
```

- [ ] **Step 2: Create `FlightComplicationService.kt`**

```kotlin
package com.anonymous.flightworkapp.wear.complication

import android.app.PendingIntent
import android.content.Intent
import androidx.wear.watchface.complications.data.*
import androidx.wear.watchface.complications.datasource.ComplicationRequest
import androidx.wear.watchface.complications.datasource.SuspendingComplicationDataSourceService
import com.anonymous.flightworkapp.wear.MainActivity
import com.anonymous.flightworkapp.wear.data.DataLayerListenerService
import com.anonymous.flightworkapp.wear.data.FlightData
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.Wearable
import kotlinx.coroutines.tasks.await

class FlightComplicationService : SuspendingComplicationDataSourceService() {

    override fun getPreviewData(type: ComplicationType): ComplicationData {
        return ShortTextComplicationData.Builder(
            text = PlainComplicationText.Builder("Gate 12m").build(),
            contentDescription = PlainComplicationText.Builder("Flight countdown").build()
        )
            .setMonochromaticImage(
                MonochromaticImage.Builder(
                    SmallImage.Builder(
                        android.graphics.drawable.Icon.createWithResource(this, com.anonymous.flightworkapp.wear.R.drawable.ic_flight),
                        SmallImageType.ICON
                    ).build().image
                ).build()
            )
            .build()
    }

    override suspend fun onComplicationRequest(request: ComplicationRequest): ComplicationData {
        val tapIntent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, tapIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val flight = loadFlightData()

        val text = if (flight == null) {
            "—"
        } else {
            getCountdownText(flight)
        }

        return ShortTextComplicationData.Builder(
            text = PlainComplicationText.Builder(text).build(),
            contentDescription = PlainComplicationText.Builder("Flight: $text").build()
        )
            .setTapAction(pendingIntent)
            .build()
    }

    private suspend fun loadFlightData(): FlightData? {
        return try {
            val items = Wearable.getDataClient(this).dataItems.await()
            var result: FlightData? = null
            for (item in items) {
                if (item.uri.path == DataLayerListenerService.PATH_PINNED_FLIGHT) {
                    val json = DataMapItem.fromDataItem(item).dataMap
                        .getString(DataLayerListenerService.KEY_FLIGHT_JSON) ?: ""
                    if (json.isNotEmpty()) result = FlightData.fromJson(json)
                }
            }
            items.release()
            result
        } catch (_: Exception) { null }
    }

    private fun getCountdownText(flight: FlightData): String {
        val now = System.currentTimeMillis() / 1000

        if (flight.tab == "arrivals") {
            val best = flight.realArrival ?: flight.estimatedTime ?: flight.scheduledTime
            if (flight.realArrival != null) return "Landed"
            val mins = ((best - now) / 60).coerceAtLeast(0)
            return if (mins > 60) "ETA ${mins / 60}h${mins % 60}m" else "ETA ${mins}m"
        }

        // Departures
        val dep = flight.scheduledTime
        val ops = flight.ops ?: return fmtMins(dep - now)
        val gateOpenTime = flight.inboundArrival ?: (dep - ops.gateOpen * 60)

        data class Ev(val label: String, val ts: Long)
        val events = listOf(
            Ev("CI", dep - ops.checkInOpen * 60),
            Ev("CI End", dep - ops.checkInClose * 60),
            Ev("Gate", gateOpenTime),
            Ev("GClose", dep - ops.gateClose * 60),
            Ev("DEP", dep)
        )

        val next = events.firstOrNull { it.ts > now }
        return if (next != null) {
            "${next.label} ${fmtMins(next.ts - now)}"
        } else {
            "DEP"
        }
    }

    private fun fmtMins(secs: Long): String {
        val mins = (secs / 60).coerceAtLeast(0)
        return if (mins > 60) "${mins / 60}h${mins % 60}m" else "${mins}m"
    }
}
```

- [ ] **Step 3: Register complication in `AndroidManifest.xml`**

Add inside `<application>`, after the DataLayerListenerService:

```xml
        <service
            android:name=".complication.FlightComplicationService"
            android:exported="true"
            android:permission="com.google.android.wearable.permission.BIND_COMPLICATION_PROVIDER">
            <intent-filter>
                <action android:name="android.support.wearable.complications.ACTION_COMPLICATION_UPDATE_REQUEST" />
            </intent-filter>
            <meta-data
                android:name="android.support.wearable.complications.SUPPORTED_TYPES"
                android:value="SHORT_TEXT" />
            <meta-data
                android:name="android.support.wearable.complications.UPDATE_PERIOD_SECONDS"
                android:value="60" />
        </service>
```

- [ ] **Step 4: Build to verify**

```bash
cd android && ./gradlew :wear:assembleDebug
```

Expected: BUILD SUCCESSFUL

- [ ] **Step 5: Commit**

```bash
git add android/wear/src/
git commit -m "feat(wear): add watch face complication with flight countdown"
```

---

### Task 6: Phone App — Send Data to Watch

**Files:**
- Modify: `android/app/build.gradle` (add wearable dependency)
- Create: `android/app/src/main/java/com/anonymous/FlightWorkApp/WearDataSender.kt`
- Modify: `src/screens/FlightScreen.tsx` (call native module on pin/unpin)

- [ ] **Step 1: Add wearable dependency to `android/app/build.gradle`**

In the `dependencies` block, add:

```groovy
implementation 'com.google.android.gms:play-services-wearable:19.0.0'
```

- [ ] **Step 2: Create `WearDataSender.kt`** — React Native native module

```kotlin
package com.anonymous.FlightWorkApp

import com.facebook.react.bridge.*
import com.google.android.gms.wearable.PutDataMapRequest
import com.google.android.gms.wearable.Wearable

class WearDataSender(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "WearDataSender"

    @ReactMethod
    fun sendPinnedFlight(jsonString: String) {
        val request = PutDataMapRequest.create("/pinned_flight").apply {
            dataMap.putString("flight_json", jsonString)
            dataMap.putLong("timestamp", System.currentTimeMillis())
        }
        val putDataReq = request.asPutDataRequest().setUrgent()
        Wearable.getDataClient(reactApplicationContext).putDataItem(putDataReq)
    }

    @ReactMethod
    fun clearPinnedFlight() {
        val request = PutDataMapRequest.create("/pinned_flight").apply {
            dataMap.putString("flight_json", "")
            dataMap.putLong("timestamp", System.currentTimeMillis())
        }
        val putDataReq = request.asPutDataRequest().setUrgent()
        Wearable.getDataClient(reactApplicationContext).putDataItem(putDataReq)
    }
}
```

- [ ] **Step 3: Create `WearDataSenderPackage.kt`** — package registration

```kotlin
package com.anonymous.FlightWorkApp

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class WearDataSenderPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(WearDataSender(reactContext))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
```

- [ ] **Step 4: Register the package in `MainApplication.kt`**

Find `android/app/src/main/java/com/anonymous/FlightWorkApp/MainApplication.kt`. In the `getPackages()` method, add `WearDataSenderPackage()` to the list. The exact location depends on Expo's template — look for `packages.add(...)` or the list returned, and add:

```kotlin
packages.add(WearDataSenderPackage())
```

- [ ] **Step 5: Update `FlightScreen.tsx` — send data on pin/unpin**

At the top of the file, add:

```typescript
import { NativeModules, Platform } from 'react-native';

const WearDataSender = Platform.OS === 'android' ? NativeModules.WearDataSender : null;
```

In the `pinFlight` callback, after `setPinnedFlightId(id)`, add:

```typescript
      // Send to watch
      if (WearDataSender) {
        const payload = JSON.stringify({
          flightNumber: item.flight?.identification?.number?.default || '',
          airline: item.flight?.airline?.name || '',
          airlineColor: getAirlineColor(item.flight?.airline?.name || ''),
          iataCode: item.flight?.airline?.code?.iata || '',
          tab,
          destination: item.flight?.airport?.destination?.name || item.flight?.airport?.destination?.code?.iata || '',
          origin: item.flight?.airport?.origin?.name || item.flight?.airport?.origin?.code?.iata || '',
          scheduledTime: tab === 'departures' ? item.flight?.time?.scheduled?.departure : item.flight?.time?.scheduled?.arrival,
          estimatedTime: tab === 'departures' ? item.flight?.time?.estimated?.departure : item.flight?.time?.estimated?.arrival,
          realDeparture: item.flight?.time?.real?.departure || null,
          realArrival: item.flight?.time?.real?.arrival || null,
          ops: tab === 'departures' ? getAirlineOps(item.flight?.airline?.name || '') : null,
          inboundArrival: tab === 'departures' && item.flight?.aircraft?.registration ? inboundArrivals[item.flight.aircraft.registration] || null : null,
          pinnedAt: Math.floor(Date.now() / 1000),
        });
        WearDataSender.sendPinnedFlight(payload);
      }
```

In the `unpinFlight` callback, after `setPinnedFlightId(null)`, add:

```typescript
      if (WearDataSender) WearDataSender.clearPinnedFlight();
```

- [ ] **Step 6: Build both modules to verify**

```bash
cd android && ./gradlew assembleRelease :wear:assembleDebug
```

Expected: Both BUILD SUCCESSFUL

- [ ] **Step 7: Commit**

```bash
git add android/app/ src/screens/FlightScreen.tsx
git commit -m "feat(wear): add phone-to-watch data sync via native module"
```

---

### Task 7: Build and Install on Watch

- [ ] **Step 1: Build wear APK**

```bash
cd android && ./gradlew :wear:assembleRelease
```

Output at: `android/wear/build/outputs/apk/release/wear-release.apk`

- [ ] **Step 2: Copy to Downloads**

```bash
cp android/wear/build/outputs/apk/release/wear-release.apk ~/Downloads/AeroStaffWear.apk
```

- [ ] **Step 3: Build phone APK**

```bash
node rename_node_modules_builds.js && cd android && ./gradlew assembleRelease
cp app/build/outputs/apk/release/app-release.apk ~/Downloads/AeroStaffPro.apk
```

- [ ] **Step 4: Install both APKs**

Install phone APK normally. For watch:
```bash
adb -s <watch-ip>:5555 install ~/Downloads/AeroStaffWear.apk
```

Or transfer via Galaxy Wearable app / Wear Installer.

- [ ] **Step 5: Test flow**

1. Open AeroStaff Pro on phone
2. Go to Voli → Partenze
3. Swipe left on a flight to pin it
4. Check watch — should show timeline with ops times
5. Unpin flight — watch should show empty state
6. Add complication to watch face — should show countdown

- [ ] **Step 6: Commit final**

```bash
git add -A
git commit -m "feat(wear): WearOS companion app complete"
```
