package com.anonymous.FlightWorkApp.liquidglass

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import android.graphics.Color
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import com.facebook.react.views.view.ReactViewGroup
import com.qmdeve.liquidglass.widget.LiquidGlassView

class LiquidGlassSurfaceView(context: Context) : FrameLayout(context) {
    private val glassView = LiquidGlassView(context)
    private val contentView = ReactViewGroup(context)
    private var boundSource: ViewGroup? = null
    private var tintColor: Int = Color.WHITE
    private var tintAlpha: Float = 0f

    init {
        clipToPadding = false
        clipChildren = false

        glassView.layoutParams = LayoutParams(
            LayoutParams.MATCH_PARENT,
            LayoutParams.MATCH_PARENT,
        )
        glassView.isClickable = false
        glassView.isFocusable = false
        glassView.importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
        glassView.setDraggableEnabled(false)
        glassView.setElasticEnabled(false)
        glassView.setTouchEffectEnabled(false)

        contentView.layoutParams = LayoutParams(
            LayoutParams.MATCH_PARENT,
            LayoutParams.MATCH_PARENT,
        )
        contentView.clipToPadding = false
        contentView.clipChildren = false

        addView(glassView)
        addView(contentView)
        updateTint()
    }

    fun getContentView(): ViewGroup = contentView

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        post { bindToSourceIfNeeded() }
    }

    override fun onDetachedFromWindow() {
        boundSource = null
        super.onDetachedFromWindow()
    }

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        if (w != oldw || h != oldh) {
            post { bindToSourceIfNeeded() }
        }
    }

    fun setCornerRadius(value: Float) {
        glassView.setCornerRadius(value.coerceAtLeast(0f))
    }

    fun setRefractionHeight(value: Float) {
        glassView.setRefractionHeight(value.coerceAtLeast(0f))
    }

    fun setRefractionOffset(value: Float) {
        glassView.setRefractionOffset(value)
    }

    fun setDispersion(value: Float) {
        glassView.setDispersion(value.coerceIn(0f, 1f))
    }

    fun setBlurRadius(value: Float) {
        glassView.setBlurRadius(value.coerceAtLeast(0.01f))
    }

    fun setTintColor(color: Int?) {
        tintColor = color ?: Color.WHITE
        updateTint()
    }

    fun setTintAlpha(value: Float) {
        tintAlpha = value.coerceIn(0f, 1f)
        updateTint()
    }

    private fun updateTint() {
        glassView.setTintColorRed(Color.red(tintColor) / 255f)
        glassView.setTintColorGreen(Color.green(tintColor) / 255f)
        glassView.setTintColorBlue(Color.blue(tintColor) / 255f)
        glassView.setTintAlpha(tintAlpha)
    }

    private fun bindToSourceIfNeeded() {
        val source = resolveSourceView() ?: return
        if (boundSource !== source) {
            boundSource = source
            glassView.bind(source)
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
}
