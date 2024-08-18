package net.gaudo.fridgy

import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import net.gaudo.fridgy.data.FridgySqliteOpenHelper
import net.gaudo.fridgy.data.Product
import net.gaudo.fridgy.data.Result

@CapacitorPlugin(name = "FridgySqlitePlugin")
class DatabasePlugin : Plugin() {
    private var helper: FridgySqliteOpenHelper? = null

    @PluginMethod
    fun openDB(call: PluginCall) {
        if (helper != null) {
            call.reject("Db already open")
            return
        }
        try {
            val name = call.getString("name")
            val version = call.getInt("version")!!

            helper = FridgySqliteOpenHelper(this.context.applicationContext, name, version)

            call.resolve(null)
            return
        } catch (e: Exception) {
            call.reject("There was a problem opening the database: ${e.message}")
            return
        }
    }


    @PluginMethod
    fun addProduct(call: PluginCall) {
        val db = helper
        if (db == null) {
            call.reject("Db not open")
            return
        }
        try {
            val product = call.getObject("product")
            val name = product.getString("name")!!
            val creationDate = product.getLong("creationDate")
            val expirationDate =
                if (!product.has("expirationDate"))
                    null
                else
                    product.getLong("expirationDate")

            db.addProduct(Product(name, expirationDate, creationDate))

            call.resolve(null)
            return
        } catch (e: Exception) {
            call.reject("There was a problem: ${e.message}")
            return
        }
    }

    @PluginMethod
    fun getAllProductsWithTotal(call: PluginCall) {
        val db = helper
        if (db == null) {
            call.reject("Db not open")
            return
        }

        val result = db.getAllProductsWithTotal()

        when (result) {
            is Result.Success -> {
                val data = JSObject()
                    .put("products", JSArray(result.data.list.map {
                        JSObject()
                            .put("id", it.id)
                            .put("name", it.name)
                            .put("creationDate", it.creationDate)
                            .put("expirationDate", it.expirationDate)
                    }))
                    .put("total", result.data.total)

                call.resolve(data)
                return
            }

            is Result.Error -> {
                call.reject(result.error)
                return
            }
        }

    }

    @PluginMethod
    fun deleteProductsByIds(call: PluginCall) {
        val db = helper
        if (db == null) {
            call.reject("Db not open")
            return
        }

        val ids = call.getArray("ids", JSArray()).let {
            if (it == null || it.length() <= 0) {
                call.reject("No ids given")
                return
            }
            try {
                return@let it.toList<Long>().toList()
            } catch (e: Exception) {
                call.reject("Wrong type for ids given")
                return
            }
        }


        val result = db.deleteProductsByIds(ids)

        when (result) {
            is Result.Success -> {
                call.resolve(null)
                return
            }

            is Result.Error -> {
                call.reject(result.error)
                return
            }
        }

    }
}
