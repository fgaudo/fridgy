package net.gaudo.fridgy

import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import net.gaudo.fridgy.data.EitherJS
import net.gaudo.fridgy.data.FridgySqliteOpenHelper
import net.gaudo.fridgy.data.Result

@CapacitorPlugin(name = "FridgySqlitePlugin")
class DatabasePlugin : Plugin() {
    private var helper: FridgySqliteOpenHelper? = null

    @PluginMethod
    fun openDB(call: PluginCall) {
        if (helper != null) {
            call.resolve(
                EitherJS.left("Db already open")
            )
            return
        }
        try {
            val name = call.getString("name")
            val version = call.getInt("version")!!

            helper = FridgySqliteOpenHelper(this.context.applicationContext, name, version)

            call.resolve(
                EitherJS.right(null)
            )
            return
        } catch (e: Exception) {
            call.resolve(
                EitherJS.left("There was a problem opening the database: ${e.message}")
            )
            return
        }
    }

    @PluginMethod
    fun getAllProductsWithTotal(call: PluginCall) {
        val db = helper
        if (db == null) {
            call.resolve(
                EitherJS.left("Db not open")
            )
            return
        }

        val result = db.getAllProductsWithTotal().let {
            when (it) {
                is Result.Success ->
                    EitherJS.right(
                        JSObject()
                            .put("products", JSArray(it.data.list.map {
                                JSObject()
                                    .put("id", it.id)
                                    .put("name", it.name)
                                    .put("creationDate", it.creationDate)
                                    .put("expirationDate", it.expirationDate)
                            }))
                            .put("total", it.data.total)
                    )

                is Result.Error -> EitherJS.left(it.error)
            }
        }

        call.resolve(result)
        return
    }

    @PluginMethod
    fun deleteProductsByIds(call: PluginCall) {
        val db = helper
        if (db == null) {
            call.resolve(
                EitherJS.left("Db not open")
            )
            return
        }

        val ids = call.getArray("ids", JSArray()).let {
            if (it == null || it.length() <= 0) {
                call.resolve(EitherJS.left("No ids given"))
                return
            }
            try {
                it.toList<Long>().toList()
            } catch (e: Exception) {
                call.resolve(EitherJS.left("Wrong type for ids given"))
                return
            }
        }


        val result = db.deleteProductsByIds(ids).let {
            when (it) {
                is Result.Success -> EitherJS.right(null)
                is Result.Error -> EitherJS.left(it.error)
            }
        }

        call.resolve(result)
        return
    }
}
