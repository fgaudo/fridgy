package net.gaudo.fridgy

import android.os.Bundle
import androidx.activity.enableEdgeToEdge
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        this.enableEdgeToEdge()
    }
}
