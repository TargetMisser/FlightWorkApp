package com.anonymous.FlightWorkApp.liquidglass

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import android.graphics.Color
import android.os.Build
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import com.anonymous.FlightWorkApp.runtime.RuntimeDiagnostics
import com.facebook.react.views.view.ReactViewGroup
import com.qmdeve.liquidglass.widget.LiquidGlassView

class LiquidGlassSurfaceView(context: Context) : FrameLayout(context) {
    private val contentView = ReactViewGroup(context)
    private val glassView = createGlassView(context)
    private var boundSource: ViewGroup? = null
    private var tintColor: Int = Color.WHITE
    private var tintAlpha: Float = 0f
    private var bindFailureLogged = false

    init {
        clipToPadding = false
        clipChildren = false

        glassView?.let { nativeView ->
            nativeView.layoutParams = LayoutParams(
                LayoutParams.MATCH_PARENT,
                LayoutParams.MATCH_PARENT,
            )
            addView(nativeView)
        }

        contentView.layoutParams = LayoutParams(
            LayoutParams.MATCH_PARENT,
            LayoutParams.MATCH_PARENT,
        )
        contentView.clipToPadding = false
        contentView.clipChildren = false

        addView(contentView)
        updateTint()
    }

    fun getContentView(): ViewGroup = contentView

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        if (glassView != null) {
            post { bindToSourceIfNeeded() }
        }
    }

    override fun onDetachedFromWindow() {
        boundSource = null
        super.onDetachedFromWindow()
    }

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        if (glassView != null && (w != oldw || h != oldh)) {
            post { bindToSourceIfNeeded() }
        }
    }

    fun setCornerRadius(value: Float) {
        runOnGlass("cornerRadius") { it.setCornerRadius(value.coerceAtLeast(0f)) }
    }

    fun setRefractionHeight(value: Float) {
        runOnGlass("refractionHeight") { it.setRefractionHeight(value.coerceAtLeast(0f)) }
    }

    fun setRefractionOffset(value: Float) {
        runOnGlass("refractionOffset") { it.setRefractionOffset(value) }
    }

    fun setDispersion(value: Float) {
        runOnGlass("dispersion") { it.setDispersion(value.coerceIn(0f, 1f)) }
    }

    fun setBlurRadius(value: Float) {
        runOnGlass("blurRadius") { it.setBlurRadius(value.coerceAtLeast(0.01f)) }
    }

    fun setTintColor(color: Int?) {
        tintColor = color ?: Color.WHITE
        updateTint()
    }

    fun setTintAlpha(value: Float) {
        tintAlpha = value.coerceIn(0f, 1f)
        updateTint()
    }

    private fun createGlassView(context: Context): LiquidGlassView? =
        runCatching {
            LiquidGlassView(context).apply {
                isClickable = false
                isFocusable = false
                importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
                setDraggableEnabled(false)
                setElasticEnabled(false)
                setTouchEffectEnabled(false)
            }
        }.getOrElse { error ->
            RuntimeDiagnostics.recordSoftFailure(
                context = context.applicationContext,
                type = "liquid_glass_init",
                message = "Failed to initialize native liquid glass view.",
                throwable = error,
                metadata = mapOf("sdkInt" to Build.VERSION.SDK_INT.toString()),
            )
            null
        }

    private fun updateTint() {
        runOnGlass("tint") {
            it.setTintColorRed(Color.red(tintColor) / 255f)
            it.setTintColorGreen(Color.green(tintColor) / 255f)
            it.setTintColorBlue(Color.blue(tintColor) / 255f)
            it.setTintAlpha(tintAlpha)
        }
    }

    private fun bindToSourceIfNeeded() {
        val nativeView = glassView ?: return
        val source = resolveSourceView() ?: return
        if (boundSource === source) {
            return
        }

        runCatching {
            nativeView.bind(source)
            boundSource = source
        }.onFailure { error ->
            if (!bindFailureLogged) {
                bindFailureLogged = true
                RuntimeDiagnostics.recordSoftFailure(
                    context = context.applicationContext,
                    type = "liquid_glass_bind",
                    message = "Failed to bind liquid glass to the activity content view.",
                    throwable = error,
                    metadata = mapOf(
                        "sourceClass" to source.javaClass.name,
                    ),
                )
            }
        }
    }

    private fun resolveSourceView(): ViewGroup? {
        val activityContent = findActivity()?.findViewById<ViewGroup>(android.R.id.content)
        if (activityContent != null) {
            return activityContent
        }

        val root = rootView
        if (root is ViewGroup) {
            return root
        }

        val directParent = parent
        return if (directParent is ViewGroup) directParent else null
    }

    private fun findActivity(): Activity? {
        var current: Context? = context
        while (current is ContextWrapper) {
            if (current is Activity) {
                return current
            }
            current = current.baseContext
        }
        return null
    }

    private fun runOnGlass(propertyName: String, action: (LiquidGlassView) -> Unit) {
        val nativeView = glassView ?: return
        runCatching { action(nativeView) }
            .onFailure { error ->
                RuntimeDiagnostics.recordSoftFailure(
                    context = context.applicationContext,
                    type = "liquid_glass_property",
                    message = "Failed to apply liquid glass property: $propertyName.",
                    throwable = error,
                    metadata = mapOf("property" to propertyName),
                )
            }
    }
}
