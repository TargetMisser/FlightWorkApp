package com.anonymous.FlightWorkApp.runtime

import android.app.Application
import android.content.Context
import android.os.Build
import com.anonymous.FlightWorkApp.BuildConfig
import org.json.JSONObject
import java.io.File
import java.io.PrintWriter
import java.io.StringWriter
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlin.system.exitProcess

object RuntimeDiagnostics {
    private const val PREFS_NAME = "runtime_diagnostics"
    private const val KEY_LAST_REPORT = "last_report"
    private const val KEY_STARTUP_PENDING = "startup_pending"
    private const val KEY_STARTUP_STARTED_AT = "startup_started_at"
    private const val KEY_STARTUP_COMPLETED_AT = "startup_completed_at"
    private const val KEY_LIQUID_GLASS_ENABLED = "liquid_glass_enabled"
    private const val KEY_LIQUID_GLASS_AUTO_DISABLED = "liquid_glass_auto_disabled"
    private const val KEY_RUNTIME_VERSION = "runtime_version"
    private const val LOG_FILE_NAME = "runtime-events.log"

    @Volatile
    private var installed = false

    data class StartupState(
        val liquidGlassSupported: Boolean,
        val liquidGlassEnabled: Boolean,
        val liquidGlassAutoDisabled: Boolean,
    )

    @Synchronized
    fun prepareStartup(application: Application): StartupState {
        val prefs = prefs(application)
        val supported = isLiquidGlassSupported()
        val currentVersion = BuildConfig.VERSION_NAME
        val previousVersion = prefs.getString(KEY_RUNTIME_VERSION, null)

        if (!prefs.contains(KEY_LIQUID_GLASS_ENABLED)) {
            prefs.edit()
                .putBoolean(KEY_LIQUID_GLASS_ENABLED, supported)
                .putBoolean(KEY_LIQUID_GLASS_AUTO_DISABLED, false)
                .putString(KEY_RUNTIME_VERSION, currentVersion)
                .apply()
        } else if (previousVersion != currentVersion) {
            prefs.edit()
                .putBoolean(KEY_LIQUID_GLASS_ENABLED, false)
                .putBoolean(KEY_LIQUID_GLASS_AUTO_DISABLED, false)
                .putString(KEY_RUNTIME_VERSION, currentVersion)
                .apply()
        }

        val startupWasPending = prefs.getBoolean(KEY_STARTUP_PENDING, false)
        val liquidGlassWasEnabled = prefs.getBoolean(KEY_LIQUID_GLASS_ENABLED, supported)
        if (startupWasPending && liquidGlassWasEnabled) {
            prefs.edit()
                .putBoolean(KEY_LIQUID_GLASS_ENABLED, false)
                .putBoolean(KEY_LIQUID_GLASS_AUTO_DISABLED, true)
                .apply()

            if (prefs.getString(KEY_LAST_REPORT, null).isNullOrBlank()) {
                recordEvent(
                    context = application,
                    type = "startup_recovery",
                    message = "Previous startup did not complete. Native liquid glass was disabled for recovery.",
                    stack = null,
                    threadName = "main",
                    metadata = mapOf("reason" to "startup_not_completed"),
                )
            }
        }

        prefs.edit()
            .putBoolean(KEY_STARTUP_PENDING, true)
            .putLong(KEY_STARTUP_STARTED_AT, System.currentTimeMillis())
            .apply()

        if (!installed) {
            val previousHandler = Thread.getDefaultUncaughtExceptionHandler()
            Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
                recordNativeCrash(application, thread, throwable)
                if (previousHandler != null) {
                    previousHandler.uncaughtException(thread, throwable)
                } else {
                    exitProcess(10)
                }
            }

            installed = true
        }

        return StartupState(
            liquidGlassSupported = supported,
            liquidGlassEnabled = isLiquidGlassEnabled(application),
            liquidGlassAutoDisabled = wasLiquidGlassAutoDisabled(application),
        )
    }

    fun isLiquidGlassSupported(): Boolean = Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE

    fun isLiquidGlassEnabled(context: Context): Boolean =
        isLiquidGlassSupported() && prefs(context).getBoolean(KEY_LIQUID_GLASS_ENABLED, isLiquidGlassSupported())

    fun wasLiquidGlassAutoDisabled(context: Context): Boolean =
        prefs(context).getBoolean(KEY_LIQUID_GLASS_AUTO_DISABLED, false)

    fun setLiquidGlassEnabled(context: Context, enabled: Boolean) {
        prefs(context).edit()
            .putBoolean(KEY_LIQUID_GLASS_ENABLED, enabled && isLiquidGlassSupported())
            .putBoolean(KEY_LIQUID_GLASS_AUTO_DISABLED, false)
            .apply()
    }

    fun autoDisableLiquidGlass(context: Context, reason: String, metadata: Map<String, String> = emptyMap()) {
        val wasEnabled = isLiquidGlassEnabled(context)
        prefs(context).edit()
            .putBoolean(KEY_LIQUID_GLASS_ENABLED, false)
            .putBoolean(KEY_LIQUID_GLASS_AUTO_DISABLED, true)
            .apply()

        if (wasEnabled) {
            recordEvent(
                context = context,
                type = "liquid_glass_auto_disabled",
                message = "Native liquid glass was auto-disabled after a runtime failure.",
                stack = null,
                threadName = Thread.currentThread().name,
                metadata = buildMap {
                    put("reason", reason)
                    metadata.forEach { (key, value) -> put(key, value) }
                },
            )
        }
    }

    fun clearLastReport(context: Context) {
        prefs(context).edit().remove(KEY_LAST_REPORT).apply()
        File(context.filesDir, LOG_FILE_NAME).delete()
    }

    fun markStartupCompleted(context: Context) {
        prefs(context).edit()
            .putBoolean(KEY_STARTUP_PENDING, false)
            .putLong(KEY_STARTUP_COMPLETED_AT, System.currentTimeMillis())
            .apply()
    }

    fun recordNativeCrash(context: Context, thread: Thread, throwable: Throwable) {
        recordEvent(
            context = context,
            type = "native_crash",
            message = throwable.message ?: throwable.javaClass.simpleName,
            stack = stackTraceString(throwable),
            threadName = thread.name,
            metadata = mapOf(
                "exceptionClass" to throwable.javaClass.name,
            ),
        )
    }

    fun recordJsError(
        context: Context,
        message: String,
        stack: String?,
        isFatal: Boolean,
        source: String?,
    ) {
        recordEvent(
            context = context,
            type = if (isFatal) "js_fatal" else "js_error",
            message = message,
            stack = stack,
            threadName = Thread.currentThread().name,
            metadata = buildMap {
                put("source", source ?: "unknown")
                put("fatal", isFatal.toString())
            },
        )
    }

    fun recordSoftFailure(
        context: Context,
        type: String,
        message: String,
        throwable: Throwable? = null,
        metadata: Map<String, String> = emptyMap(),
    ) {
        recordEvent(
            context = context,
            type = type,
            message = message,
            stack = throwable?.let(::stackTraceString),
            threadName = Thread.currentThread().name,
            metadata = metadata,
        )
    }

    fun getDiagnosticsJson(context: Context): String {
        val prefs = prefs(context)
        val payload = JSONObject()
        payload.put("appVersion", BuildConfig.VERSION_NAME)
        payload.put("device", "${Build.MANUFACTURER} ${Build.MODEL}".trim())
        payload.put("androidVersion", "Android ${Build.VERSION.RELEASE} (SDK ${Build.VERSION.SDK_INT})")
        payload.put("liquidGlassSupported", isLiquidGlassSupported())
        payload.put("liquidGlassEnabled", isLiquidGlassEnabled(context))
        payload.put("liquidGlassAutoDisabled", wasLiquidGlassAutoDisabled(context))
        payload.put("startupPending", prefs.getBoolean(KEY_STARTUP_PENDING, false))
        payload.put("startupStartedAt", prefs.getLong(KEY_STARTUP_STARTED_AT, 0L))
        payload.put("startupCompletedAt", prefs.getLong(KEY_STARTUP_COMPLETED_AT, 0L))
        payload.put("logFilePath", File(context.filesDir, LOG_FILE_NAME).absolutePath)

        val lastReport = prefs.getString(KEY_LAST_REPORT, null)
        if (!lastReport.isNullOrBlank()) {
            payload.put("lastReport", JSONObject(lastReport))
        }

        return payload.toString()
    }

    @Synchronized
    private fun recordEvent(
        context: Context,
        type: String,
        message: String,
        stack: String?,
        threadName: String?,
        metadata: Map<String, String>,
    ) {
        val report = JSONObject()
        report.put("type", type)
        report.put("message", message)
        report.put("timestamp", isoNow())
        report.put("thread", threadName ?: "unknown")
        report.put("appVersion", BuildConfig.VERSION_NAME)
        report.put("device", "${Build.MANUFACTURER} ${Build.MODEL}".trim())
        report.put("androidVersion", "Android ${Build.VERSION.RELEASE} (SDK ${Build.VERSION.SDK_INT})")
        report.put("liquidGlassEnabled", isLiquidGlassEnabled(context))
        report.put("liquidGlassSupported", isLiquidGlassSupported())
        report.put("liquidGlassAutoDisabled", wasLiquidGlassAutoDisabled(context))
        report.put("startupPending", prefs(context).getBoolean(KEY_STARTUP_PENDING, false))
        if (!stack.isNullOrBlank()) {
            report.put("stack", stack)
        }
        if (metadata.isNotEmpty()) {
            val metadataJson = JSONObject()
            metadata.forEach { (key, value) -> metadataJson.put(key, value) }
            report.put("metadata", metadataJson)
        }

        prefs(context).edit()
            .putString(KEY_LAST_REPORT, report.toString())
            .apply()

        appendToLogFile(context, report.toString(2))
    }

    private fun prefs(context: Context) =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    private fun appendToLogFile(context: Context, payload: String) {
        File(context.filesDir, LOG_FILE_NAME).appendText(payload + "\n\n")
    }

    private fun isoNow(): String =
        SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSZ", Locale.US).format(Date())

    private fun stackTraceString(throwable: Throwable): String {
        val writer = StringWriter()
        throwable.printStackTrace(PrintWriter(writer))
        return writer.toString()
    }
}
