package com.anonymous.FlightWorkApp.liquidglass

import com.anonymous.FlightWorkApp.runtime.RuntimeDiagnostics
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class LiquidGlassPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
        emptyList()

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
        if (RuntimeDiagnostics.isLiquidGlassSupported()) listOf(LiquidGlassSurfaceViewManager()) else emptyList()
}
