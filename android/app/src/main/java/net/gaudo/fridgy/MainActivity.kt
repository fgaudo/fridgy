package net.gaudo.fridgy

import android.os.Bundle
import androidx.activity.enableEdgeToEdge
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        // Before `super.onCreate`, which builds the bridge and loads the page.
        registerPlugin(TypeScale::class.java)
        super.onCreate(savedInstanceState)
        this.enableEdgeToEdge()
    }
}
