package net.gaudo.fridgy

import android.os.Bundle
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
      /*  StrictMode.setThreadPolicy(
            StrictMode.ThreadPolicy.Builder()
                .detectDiskWrites()
                .detectNetwork() // optional: to catch network on main thread
                .penaltyLog()
                .penaltyDeath() // or penaltyDialog() for non-fatal alert
                .build()
        )

        StrictMode.setVmPolicy(
            VmPolicy.Builder()
                .detectLeakedSqlLiteObjects()
                .detectLeakedClosableObjects()
                .penaltyLog()
                .build()
        )
*/
        super.onCreate(savedInstanceState)
        setTheme(R.style.AppTheme_NoActionBar)
        registerPlugin(DatabasePlugin::class.java)
    }
}
