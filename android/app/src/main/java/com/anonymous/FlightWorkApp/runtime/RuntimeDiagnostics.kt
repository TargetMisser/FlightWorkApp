package com.anonymous.FlightWorkApp.runtime

import android.app.ActivityManager
import android.app.Application
import android.app.ApplicationExitInfo
import android.content.ContentUris
import android.content.Context
import android.content.ContentValues
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
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
    private const val KEY_LAST_EXIT_INFO = "last_exit_info"
    private const val KEY_LAST_PROCESSED_EXIT_TIMESTAMP = "last_processed_exit_timestamp"
    private const val LOG_FILE_NAME = "runtime-events.log"
    private const val PUBLIC_LOG_FILE_NAME = "AeroStaffPro-runtime-events.log"
    private const val LOG_MIME_TYPE = "text/plain"

    @Volatile
    private var installed = false

    data class StartupState(
        val liquidGlassSupported: Boolean,
        val liquidGlassEnabled: Boolean,
        val liquidGlassAutoDisabled: Boolean,
    )

    data class ExitInfoSnapshot(
        val timestamp: Long,
        val reasonCode: Int,
        val reasonLabel: String,
        val status: Int,
        val importance: Int,
        val processName: String?,
        val description: String?,
        val pssKb: Long,
        val rssKb: Long,
        val traceAvailable: Boolean,
    ) {
        fun toJson(): JSONObject =
            JSONObject().apply {
                put("timestamp", timestamp)
                put("reasonCode", reasonCode)
                put("reasonLabel", reasonLabel)
                put("status", status)
                put("importance", importance)
                put("processName", processName ?: JSONObject.NULL)
                put("description", description ?: JSONObject.NULL)
                put("pssKb", pssKb)
                put("rssKb", rssKb)
                put("traceAvailable", traceAvailable)
            }
    }

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
        val previousStartupStartedAt = prefs.getLong(KEY_STARTUP_STARTED_AT, 0L)
        val lastProcessedExitTimestamp = prefs.getLong(KEY_LAST_PROCESSED_EXIT_TIMESTAMP, 0L)
        val lastExitInfo = if (startupWasPending) {
            loadLatestExitInfo(
                context = application,
                startedAt = previousStartupStartedAt,
                processedAfter = lastProcessedExitTimestamp,
            )
        } else {
            null
        }
        if (lastExitInfo != null) {
            prefs.edit()
                .putString(KEY_LAST_EXIT_INFO, lastExitInfo.toJson().toString())
                .putLong(KEY_LAST_PROCESSED_EXIT_TIMESTAMP, lastExitInfo.timestamp)
                .apply()
        }

        if (startupWasPending && liquidGlassWasEnabled) {
            prefs.edit()
                .putBoolean(KEY_LIQUID_GLASS_ENABLED, false)
                .putBoolean(KEY_LIQUID_GLASS_AUTO_DISABLED, true)
                .apply()

            recordEvent(
                context = application,
                type = "startup_recovery",
                message = "Previous startup did not complete. Native liquid glass was disabled for recovery.",
                stack = null,
                threadName = "main",
                metadata = buildMap {
                    put("reason", "startup_not_completed")
                    if (previousStartupStartedAt > 0L) {
                        put("previousStartupStartedAt", previousStartupStartedAt.toString())
                    }
                    lastExitInfo?.appendToMetadata(this)
                },
            )
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
        prefs(context).edit()
            .remove(KEY_LAST_REPORT)
            .remove(KEY_LAST_EXIT_INFO)
            .apply()
        privateLogFile(context).delete()
        deletePublicLogFile(context)
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
        val prefersPublicLog = supportsPublicLogMirror()
        val publicLogReady = if (prefersPublicLog) syncPublicLogFile(context) else false
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
        payload.put(
            "logFilePath",
            when {
                publicLogReady || prefersPublicLog -> publicLogDisplayPath()
                else -> privateLogFile(context).absolutePath
            },
        )

        val lastReport = prefs.getString(KEY_LAST_REPORT, null)
        if (!lastReport.isNullOrBlank()) {
            payload.put("lastReport", JSONObject(lastReport))
        }
        val lastExitInfo = prefs.getString(KEY_LAST_EXIT_INFO, null)
        if (!lastExitInfo.isNullOrBlank()) {
            payload.put("lastExitInfo", JSONObject(lastExitInfo))
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
        privateLogFile(context).appendText(payload + "\n\n")
        syncPublicLogFile(context)
    }

    private fun privateLogFile(context: Context): File =
        File(context.filesDir, LOG_FILE_NAME)

    private fun supportsPublicLogMirror(): Boolean =
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q || legacyPublicLogFile() != null

    private fun syncPublicLogFile(context: Context): Boolean {
        return try {
            val source = privateLogFile(context)
            if (!source.exists()) {
                deletePublicLogFile(context)
                true
            } else {
                val content = source.readText()
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    val uri = findOrCreatePublicLogUri(context) ?: return false
                    val stream = context.contentResolver.openOutputStream(uri, "wt") ?: return false
                    stream.bufferedWriter().use { writer ->
                        writer.write(content)
                    }
                    true
                } else {
                    val target = legacyPublicLogFile() ?: return false
                    target.parentFile?.mkdirs()
                    target.writeText(content)
                    true
                }
            }
        } catch (_: Throwable) {
            false
        }
    }

    private fun deletePublicLogFile(context: Context) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                findPublicLogUri(context)?.let { uri ->
                    context.contentResolver.delete(uri, null, null)
                }
            } else {
                legacyPublicLogFile()?.delete()
            }
        } catch (_: Throwable) {
        }
    }

    private fun publicLogDisplayPath(): String =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            "Download/$PUBLIC_LOG_FILE_NAME"
        } else {
            legacyPublicLogFile()?.absolutePath ?: "Download/$PUBLIC_LOG_FILE_NAME"
        }

    private fun legacyPublicLogFile(): File? =
        Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
            ?.let { directory -> File(directory, PUBLIC_LOG_FILE_NAME) }

    private fun findOrCreatePublicLogUri(context: Context) =
        findPublicLogUri(context) ?: context.contentResolver.insert(
            MediaStore.Downloads.EXTERNAL_CONTENT_URI,
            ContentValues().apply {
                put(MediaStore.MediaColumns.DISPLAY_NAME, PUBLIC_LOG_FILE_NAME)
                put(MediaStore.MediaColumns.MIME_TYPE, LOG_MIME_TYPE)
                put(MediaStore.MediaColumns.RELATIVE_PATH, "${Environment.DIRECTORY_DOWNLOADS}/")
            },
        )

    private fun findPublicLogUri(context: Context) =
        context.contentResolver.query(
            MediaStore.Downloads.EXTERNAL_CONTENT_URI,
            arrayOf(MediaStore.MediaColumns._ID),
            "${MediaStore.MediaColumns.DISPLAY_NAME}=? AND ${MediaStore.MediaColumns.RELATIVE_PATH}=?",
            arrayOf(PUBLIC_LOG_FILE_NAME, "${Environment.DIRECTORY_DOWNLOADS}/"),
            null,
        )?.use { cursor ->
            if (!cursor.moveToFirst()) {
                return@use null
            }
            val id = cursor.getLong(cursor.getColumnIndexOrThrow(MediaStore.MediaColumns._ID))
            ContentUris.withAppendedId(MediaStore.Downloads.EXTERNAL_CONTENT_URI, id)
        }

    private fun isoNow(): String =
        SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSZ", Locale.US).format(Date())

    private fun stackTraceString(throwable: Throwable): String {
        val writer = StringWriter()
        throwable.printStackTrace(PrintWriter(writer))
        return writer.toString()
    }

    private fun loadLatestExitInfo(
        context: Context,
        startedAt: Long,
        processedAfter: Long,
    ): ExitInfoSnapshot? {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
            return null
        }

        val activityManager = context.getSystemService(ActivityManager::class.java) ?: return null
        val currentProcessName = runCatching { Application.getProcessName() }
            .getOrNull()
            ?.takeIf { it.isNotBlank() }
            ?: context.packageName
        val notBefore = maxOf(startedAt, processedAfter)

        return runCatching {
            activityManager.getHistoricalProcessExitReasons(context.packageName, 0, 8)
                .asSequence()
                .filter { info ->
                    val processName = info.processName
                    processName == currentProcessName || processName == context.packageName
                }
                .filter { info -> info.timestamp > notBefore }
                .maxByOrNull { info -> info.timestamp }
                ?.toSnapshot()
        }.getOrNull()
    }

    private fun ApplicationExitInfo.toSnapshot(): ExitInfoSnapshot =
        ExitInfoSnapshot(
            timestamp = timestamp,
            reasonCode = reason,
            reasonLabel = exitReasonLabel(reason),
            status = status,
            importance = importance,
            processName = processName?.takeIf { it.isNotBlank() },
            description = description?.singleLineSummary(),
            pssKb = pss,
            rssKb = rss,
            traceAvailable = hasTraceInput(),
        )

    private fun ApplicationExitInfo.hasTraceInput(): Boolean =
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
            false
        } else {
            runCatching {
                traceInputStream?.use { true } ?: false
            }.getOrDefault(false)
        }

    private fun exitReasonLabel(reason: Int): String =
        when (reason) {
            ApplicationExitInfo.REASON_UNKNOWN -> "REASON_UNKNOWN"
            ApplicationExitInfo.REASON_EXIT_SELF -> "REASON_EXIT_SELF"
            ApplicationExitInfo.REASON_SIGNALED -> "REASON_SIGNALED"
            ApplicationExitInfo.REASON_LOW_MEMORY -> "REASON_LOW_MEMORY"
            ApplicationExitInfo.REASON_CRASH -> "REASON_CRASH"
            ApplicationExitInfo.REASON_CRASH_NATIVE -> "REASON_CRASH_NATIVE"
            ApplicationExitInfo.REASON_ANR -> "REASON_ANR"
            ApplicationExitInfo.REASON_INITIALIZATION_FAILURE -> "REASON_INITIALIZATION_FAILURE"
            ApplicationExitInfo.REASON_PERMISSION_CHANGE -> "REASON_PERMISSION_CHANGE"
            ApplicationExitInfo.REASON_EXCESSIVE_RESOURCE_USAGE -> "REASON_EXCESSIVE_RESOURCE_USAGE"
            ApplicationExitInfo.REASON_USER_REQUESTED -> "REASON_USER_REQUESTED"
            ApplicationExitInfo.REASON_USER_STOPPED -> "REASON_USER_STOPPED"
            ApplicationExitInfo.REASON_DEPENDENCY_DIED -> "REASON_DEPENDENCY_DIED"
            ApplicationExitInfo.REASON_OTHER -> "REASON_OTHER"
            ApplicationExitInfo.REASON_FREEZER -> "REASON_FREEZER"
            ApplicationExitInfo.REASON_PACKAGE_STATE_CHANGE -> "REASON_PACKAGE_STATE_CHANGE"
            ApplicationExitInfo.REASON_PACKAGE_UPDATED -> "REASON_PACKAGE_UPDATED"
            else -> "REASON_$reason"
        }

    private fun ExitInfoSnapshot.appendToMetadata(target: MutableMap<String, String>) {
        target["exitReason"] = reasonLabel
        target["exitReasonCode"] = reasonCode.toString()
        target["exitStatus"] = status.toString()
        target["exitImportance"] = importance.toString()
        target["exitTimestamp"] = timestamp.toString()
        target["exitTraceAvailable"] = traceAvailable.toString()
        if (processName != null) {
            target["exitProcessName"] = processName
        }
        if (!description.isNullOrBlank()) {
            target["exitDescription"] = description
        }
        if (pssKb > 0L) {
            target["exitPssKb"] = pssKb.toString()
        }
        if (rssKb > 0L) {
            target["exitRssKb"] = rssKb.toString()
        }
    }

    private fun String.singleLineSummary(): String =
        replace(Regex("\\s+"), " ")
            .trim()
            .let { summary ->
                if (summary.length <= 240) summary else "${summary.take(237)}..."
            }
}
