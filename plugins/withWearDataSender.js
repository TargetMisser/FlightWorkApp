const { withDangerousMod, withMainApplication } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// --- Kotlin source files to generate ---

const MODULE_KT = `package com.anonymous.FlightWorkApp.wear

import android.net.Uri
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.google.android.gms.wearable.PutDataMapRequest
import com.google.android.gms.wearable.Wearable
import org.json.JSONObject

class WearDataSenderModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "WearDataSender"

    @ReactMethod
    fun sendPinnedFlight(json: String, promise: Promise) {
        try {
            val request = PutDataMapRequest.create("/pinned_flight").apply {
                dataMap.putString("flight_json", json)
                dataMap.putLong("timestamp", System.currentTimeMillis())
            }
            val putRequest = request.asPutDataRequest().setUrgent()
            Wearable.getDataClient(reactApplicationContext)
                .putDataItem(putRequest)
                .addOnSuccessListener { promise.resolve(true) }
                .addOnFailureListener { e -> promise.reject("WEAR_SEND_ERROR", e.message, e) }
        } catch (e: Exception) {
            promise.reject("WEAR_SEND_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun clearPinnedFlight(promise: Promise) {
        try {
            val uri = Uri.parse("wear://*/pinned_flight")
            Wearable.getDataClient(reactApplicationContext)
                .deleteDataItems(uri)
                .addOnSuccessListener { promise.resolve(true) }
                .addOnFailureListener { e -> promise.reject("WEAR_CLEAR_ERROR", e.message, e) }
        } catch (e: Exception) {
            promise.reject("WEAR_CLEAR_ERROR", e.message, e)
        }
    }

    private fun sendMessageToNodes(path: String, data: String, promise: Promise) {
        Wearable.getNodeClient(reactApplicationContext).connectedNodes
            .addOnSuccessListener { nodes ->
                if (nodes.isEmpty()) {
                    promise.resolve(false)
                    return@addOnSuccessListener
                }
                var remaining = nodes.size
                var failed = false
                for (node in nodes) {
                    Wearable.getMessageClient(reactApplicationContext)
                        .sendMessage(node.id, path, data.toByteArray())
                        .addOnSuccessListener {
                            remaining--
                            if (remaining == 0 && !failed) promise.resolve(true)
                        }
                        .addOnFailureListener { e ->
                            if (!failed) {
                                failed = true
                                promise.reject("WEAR_MSG_ERROR", e.message, e)
                            }
                        }
                }
            }
            .addOnFailureListener { e -> promise.reject("WEAR_MSG_ERROR", e.message, e) }
    }

    @ReactMethod
    fun startWatchOngoing(flightJson: String, shiftEnd: Double, promise: Promise) {
        try {
            val payload = JSONObject().apply {
                put("flight", JSONObject(flightJson))
                put("shiftEnd", shiftEnd.toLong())
            }.toString()
            sendMessageToNodes("/watch_ongoing_start", payload, promise)
        } catch (e: Exception) {
            promise.reject("WEAR_MSG_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun sendWatchAlert(title: String, body: String, type: String, promise: Promise) {
        try {
            val payload = JSONObject().apply {
                put("title", title)
                put("body", body)
                put("type", type)
            }.toString()
            sendMessageToNodes("/watch_alert", payload, promise)
        } catch (e: Exception) {
            promise.reject("WEAR_MSG_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun stopWatchOngoing(promise: Promise) {
        try {
            sendMessageToNodes("/watch_ongoing_stop", "", promise)
        } catch (e: Exception) {
            promise.reject("WEAR_MSG_ERROR", e.message, e)
        }
    }
}
`;

const PACKAGE_KT = `package com.anonymous.FlightWorkApp.wear

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class WearDataSenderPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
        listOf(WearDataSenderModule(reactContext))

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
        emptyList()
}
`;

// --- Plugin ---

function withWearDataSender(config) {
  // Step 1: Add play-services-wearable dependency + generate Kotlin sources
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const androidDir = path.join(projectRoot, 'android');

      // Add wearable dependency to app/build.gradle
      const buildGradle = path.join(androidDir, 'app', 'build.gradle');
      if (fs.existsSync(buildGradle)) {
        let content = fs.readFileSync(buildGradle, 'utf-8');
        if (!content.includes('play-services-wearable')) {
          content = content.replace(
            /dependencies\s*\{/,
            `dependencies {\n    implementation 'com.google.android.gms:play-services-wearable:19.0.0'`
          );
          fs.writeFileSync(buildGradle, content);
        }
      }

      // Generate Kotlin source files
      const srcDir = path.join(
        androidDir, 'app', 'src', 'main', 'java',
        'com', 'anonymous', 'FlightWorkApp', 'wear'
      );
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'WearDataSenderModule.kt'), MODULE_KT);
      fs.writeFileSync(path.join(srcDir, 'WearDataSenderPackage.kt'), PACKAGE_KT);

      return config;
    },
  ]);

  // Step 2: Register the native package in MainApplication
  config = withMainApplication(config, (config) => {
    const content = config.modResults.contents;
    if (!content.includes('WearDataSenderPackage')) {
      // Add import
      config.modResults.contents = content
        .replace(
          /(import .*\n)(\n*.*class MainApplication)/,
          '$1import com.anonymous.FlightWorkApp.wear.WearDataSenderPackage\n$2'
        );

      // Add to packages list
      config.modResults.contents = config.modResults.contents
        .replace(
          /(override fun getPackages\(\).*?=.*?PackageList.*?\.packages\.apply\s*\{)/s,
          '$1\n            add(WearDataSenderPackage())'
        );
    }
    return config;
  });

  return config;
}

module.exports = withWearDataSender;
