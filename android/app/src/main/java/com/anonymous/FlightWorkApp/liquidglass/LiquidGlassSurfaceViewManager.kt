package com.anonymous.FlightWorkApp.liquidglass

import android.view.View
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager
import com.facebook.react.uimanager.annotations.ReactProp

class LiquidGlassSurfaceViewManager : ViewGroupManager<LiquidGlassSurfaceView>() {
    override fun getName(): String = "AeroLiquidGlassSurface"

    override fun createViewInstance(reactContext: ThemedReactContext): LiquidGlassSurfaceView =
        LiquidGlassSurfaceView(reactContext)

    override fun addView(parent: LiquidGlassSurfaceView, child: View, index: Int) {
        parent.getContentView().addView(child, index)
    }

    override fun getChildCount(parent: LiquidGlassSurfaceView): Int =
        parent.getContentView().childCount

    override fun getChildAt(parent: LiquidGlassSurfaceView, index: Int): View? =
        parent.getContentView().getChildAt(index)

    override fun removeViewAt(parent: LiquidGlassSurfaceView, index: Int) {
        parent.getContentView().removeViewAt(index)
    }

    override fun removeAllViews(parent: LiquidGlassSurfaceView) {
        parent.getContentView().removeAllViews()
    }

    @ReactProp(name = "cornerRadius")
    fun setCornerRadius(view: LiquidGlassSurfaceView, value: Float) {
        view.setCornerRadius(value)
    }

    @ReactProp(name = "refractionHeight")
    fun setRefractionHeight(view: LiquidGlassSurfaceView, value: Float) {
        view.setRefractionHeight(value)
    }

    @ReactProp(name = "refractionOffset")
    fun setRefractionOffset(view: LiquidGlassSurfaceView, value: Float) {
        view.setRefractionOffset(value)
    }

    @ReactProp(name = "dispersion")
    fun setDispersion(view: LiquidGlassSurfaceView, value: Float) {
        view.setDispersion(value)
    }

    @ReactProp(name = "blurRadius")
    fun setBlurRadius(view: LiquidGlassSurfaceView, value: Float) {
        view.setBlurRadius(value)
    }

    @ReactProp(name = "glassOpacity")
    fun setGlassOpacity(view: LiquidGlassSurfaceView, value: Float) {
        view.setTintAlpha(value)
    }

    @ReactProp(name = "tintColor", customType = "Color")
    fun setTintColor(view: LiquidGlassSurfaceView, value: Int?) {
        view.setTintColor(value)
    }
}
