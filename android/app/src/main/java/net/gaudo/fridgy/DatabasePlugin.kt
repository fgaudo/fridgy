package net.gaudo.fridgy

import android.util.Log
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import net.gaudo.fridgy.data.FridgySqliteOpenHelper
import net.gaudo.fridgy.data.db.Schema
import net.gaudo.fridgy.data.queries.AddProductDto
import net.gaudo.fridgy.data.queries.getAllProductsWithTotal as getAllProductsWithTotalQuery
import net.gaudo.fridgy.data.queries.addProduct as addProductCommand
import net.gaudo.fridgy.data.queries.deleteProductsByIds as deleteProductsByIdsCommand

@CapacitorPlugin(name = "FridgySqlitePlugin")
class DatabasePlugin : Plugin() {
    private lateinit var helper: FridgySqliteOpenHelper
    private val pluginScope: CoroutineScope = CoroutineScope(Dispatchers.Main)

    override fun load() {
        super.load()

        helper = FridgySqliteOpenHelper(context.applicationContext)
    }

    override fun handleOnDestroy() {
        super.handleOnDestroy()
        pluginScope.cancel()
        helper.close()
    }

    @PluginMethod
    fun addProduct(call: PluginCall) {

        pluginScope.launch {
            try {
                val product = call.getObject("product")
                val name = product.getString("name")!!
                val creationDate = product.getLong("creationDate")

                val storage = runCatching {
                    if (!product.has("storage"))
                        return@runCatching null

                    val t = product.getString("storage")!!

                    Schema.Storage.Type.valueOf(t.lowercase())
                }.getOrNull()


                val expirationDate =
                    if (!product.has("expirationDate"))
                        null
                    else
                        product.getLong("expirationDate")

                addProductCommand(AddProductDto(name, expirationDate, creationDate, storage))(
                    helper
                )
                call.resolve()
                return@launch
            } catch (e: Exception) {
                Log.e("FridgySqlitePlugin", e.message, e)
                call.reject(e.message)
                return@launch
            }
        }
    }

    @PluginMethod
    fun getAllProductsWithTotal(call: PluginCall) {
        pluginScope.launch {
            try {
                val result = getAllProductsWithTotalQuery(helper)
                val data = JSObject()
                    .put("products", JSArray(result.list.map {
                        JSObject()
                            .put("id", it.id)
                            .put("name", it.name)
                            .put("creationDate", it.creationDate)
                            .put("expirationDate", it.expirationDate)
                            .put("storage", it.storage)
                    }))
                    .put("total", result.total)

                call.resolve(data)
                return@launch

            } catch (e: Exception) {
                Log.e("FridgySqlitePlugin", e.message, e)
                call.reject(e.message)
                return@launch
            }
        }
    }

    @PluginMethod
    fun deleteProductsByIds(call: PluginCall) {
        pluginScope.launch {
            try {
                val ids = call.getArray("ids", JSArray()).let {
                    if (it == null || it.length() <= 0) {
                        throw Exception("No ids given")
                    }

                    (0 until it.length()).map { index ->
                        val value = it.get(index)
                        when (value) {
                            is Int -> value.toLong()
                            is Long -> value
                            is Number -> value.toLong()
                            else -> throw IllegalArgumentException("Invalid ID type: ${value?.javaClass}")
                        }
                    }
                }

                deleteProductsByIdsCommand(ids)(helper)

                call.resolve(null)
                return@launch
            } catch (e: Exception) {
                Log.e("FridgySqlitePlugin", e.message, e)
                call.reject(e.message)
                return@launch
            }
        }
    }


}
