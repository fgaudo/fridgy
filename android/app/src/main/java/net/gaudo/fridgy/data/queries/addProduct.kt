package net.gaudo.fridgy.data.queries

import android.content.ContentValues
import android.database.sqlite.SQLiteOpenHelper
import android.provider.BaseColumns
import androidx.core.database.sqlite.transaction
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import net.gaudo.fridgy.data.db.Schema

data class AddProductDto(
    val name: String,
    val expirationDate: Long?,
    val creationDate: Long,
    val storage: Schema.Storage.Type?
)

val addProductStorageSql = run {
    val product_storage = Schema.ProductStorage.TABLE_NAME
    val product_storage_product_id = "$product_storage.${Schema.ProductStorage.COLUMN_PRODUCT_ID}"
    val product_storage_storage_id = "$product_storage.${Schema.ProductStorage.COLUMN_STORAGE_ID}"
    val storage = Schema.Storage.TABLE_NAME
    val storage_name = "$storage . ${Schema.Storage.COLUMN_NAME}"

    """
        INSERT INTO $product_storage ($product_storage_product_id, $product_storage_storage_id)
        VALUES (?, (SELECT ${BaseColumns._ID} from $storage where $storage_name = ?))
    """.trimIndent()
}

fun addProduct(addProductDto: AddProductDto): suspend (helper: SQLiteOpenHelper) -> Unit {
    return { helper ->
        withContext(Dispatchers.IO) {
            val db = helper.writableDatabase

            db.transaction {
                val id = db.insert(Schema.Product.TABLE_NAME, null, ContentValues().apply {
                    put(Schema.Product.COLUMN_NAME, addProductDto.name)
                    put(Schema.Product.COLUMN_CREATION_DATE, addProductDto.creationDate)
                })

                addProductDto.storage?.let { storage ->
                    db.compileStatement(addProductStorageSql).use { stmt ->
                        stmt.bindLong(1, id)
                        stmt.bindString(2, storage.type)
                        val id2 = stmt.executeInsert()
                        if (id2 == -1L) throw Exception("Failed to insert product_storage")
                    }
                }

                addProductDto.expirationDate?.let { expirationDate ->
                    val id2 = db.insert(
                        Schema.ProductExpiration.TABLE_NAME, null, ContentValues().apply {
                            put(Schema.ProductExpiration.COLUMN_PRODUCT_ID, id)
                            put(Schema.ProductExpiration.COLUMN_DATE, expirationDate)
                        }
                    )

                    if (id2 == -1L) throw Exception("Failed to insert product expiration")
                }
            }
        }
    }

}