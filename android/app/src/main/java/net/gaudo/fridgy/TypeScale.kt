package net.gaudo.fridgy

import android.util.TypedValue
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import com.getcapacitor.Plugin
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * The user's font size as Android applies it: from Android 14 nonlinearly, large text growing less than small. The
 * WebView's own text zoom is linear, so it is turned off, and each size of Material's type scale reaches the page as
 * `--sp-<size>`, in CSS pixels, before its first script (`docs/font-size.md`). A change of the setting recreates the
 * activity, and this with it.
 */
@CapacitorPlugin(name = "TypeScale")
class TypeScale : Plugin() {
    // Capacitor loads its plugins before the page, so the script is there for its first document.
    override fun load() {
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) return
        val metrics = context.resources.displayMetrics
        val sizes = SIZES.joinToString(";") { sp ->
            val dp = TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_SP, sp, metrics) / metrics.density
            "--sp-${sp.toInt()}:${dp}px"
        }
        // At the document's start there may be no element to style yet: a sheet of its own needs none.
        val script = "{const sheet=new CSSStyleSheet();sheet.replaceSync(':root{$sizes}');" +
            "document.adoptedStyleSheets=[...document.adoptedStyleSheets,sheet]}"
        bridge.webView.settings.textZoom = 100
        WebViewCompat.addDocumentStartJavaScript(bridge.webView, script, setOf("*"))
    }

    private companion object {
        /** Material 3's type scale, in sp: every size `src/styles.css` reads as `--sp-<size>`. */
        val SIZES = floatArrayOf(11f, 12f, 14f, 16f, 22f, 24f, 28f, 32f, 36f, 45f, 57f)
    }
}
