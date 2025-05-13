package net.gaudo.fridgy

import android.os.Bundle
import android.os.StrictMode
import android.os.StrictMode.VmPolicy
import android.view.WindowManager
import androidx.core.view.WindowCompat
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
        setTheme(R.style.AppTheme_NoActionBar)
        registerPlugin(DatabasePlugin::class.java)
        super.onCreate(savedInstanceState)


    }
}
