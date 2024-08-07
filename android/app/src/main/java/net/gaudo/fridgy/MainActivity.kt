package net.gaudo.fridgy

import android.os.Bundle
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        registerPlugin(DatabasePlugin::class.java)
        super.onCreate(savedInstanceState)
    }
}
