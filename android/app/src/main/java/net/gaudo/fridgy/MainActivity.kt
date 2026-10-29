package net.gaudo.fridgy

import android.os.Bundle
import android.view.View
import androidx.activity.enableEdgeToEdge
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        // Before `super.onCreate`, which builds the bridge and loads the page.
        registerPlugin(TypeScale::class.java)
        super.onCreate(savedInstanceState)
        this.enableEdgeToEdge()
    }

    // Capacitor destroys the WebView when the activity's window detaches, which a recreation can skip: one before the
    // window was added (a font size changed during the launch), or one that hands the window to the new activity
    // (`recreate()`). The page would live on, holding the database (`docs/font-size.md`). Capacitor waits for the
    // detach because a WebView must not be destroyed in a window: this waits for the WebView's own detach instead.
    override fun onDestroy() {
        super.onDestroy()
        val webView = bridge?.webView ?: return
        if (!webView.isAttachedToWindow) return webView.destroy()
        webView.addOnAttachStateChangeListener(
            object : View.OnAttachStateChangeListener {
                override fun onViewAttachedToWindow(view: View) {}

                override fun onViewDetachedFromWindow(view: View) {
                    view.removeOnAttachStateChangeListener(this)
                    webView.destroy()
                }
            },
        )
    }
}
