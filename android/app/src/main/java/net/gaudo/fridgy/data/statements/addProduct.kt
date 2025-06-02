package net.gaudo.fridgy.data.statements

import android.content.ContentValues
import android.database.sqlite.SQLiteOpenHelper
import android.provider.BaseColumns
import androidx.core.database.sqlite.transaction
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import net.gaudo.fridgy.data.schemas.Schema

data class AddProductDto(
    val name: String,
    val expirationDate: Long?,
    val creationDate: Long,
    val storage: Schema.Storage.Type
)


val addProductSql = run {
    val product = Schema.Product.TABLE_NAME
    val productName = "$product.${Schema.Product.COLUMN_NAME}"
    val productCreationDate = "$product.${Schema.Product.COLUMN_CREATION_DATE}"
    val productStorageId = "$product.${Schema.Product.COLUMN_STORAGE_ID}"
    val storage = Schema.Storage.TABLE_NAME
    val storageName = "$storage.${Schema.Storage.COLUMN_NAME}"

    """
        INSERT INTO $product ($productName, $productCreationDate, $productStorageId)
        VALUES (?, ?, (SELECT ${BaseColumns._ID} FROM $storage WHERE $storageName = ?))
    """.trimIndent()
}

fun addProduct(addProductDto: AddProductDto): suspend (helper: SQLiteOpenHelper) -> Unit {
    return { helper ->
        withContext(Dispatchers.IO) {
            val db = helper.writableDatabase

            db.transaction {
                val id = run {
                    val stmt = db.compileStatement(addProductSql)
                    stmt.bindString(1, addProductDto.name)
                    stmt.bindLong(2, addProductDto.creationDate)
                    stmt.bindString(3, addProductDto.storage.type)
                    val id = stmt.executeInsert()
                    if (id == -1L) throw Exception("Failed to insert product")
                    id
                }

                if (addProductDto.expirationDate != null) {
                    val id2 = db.insert(
                        Schema.ProductExpiration.TABLE_NAME, null, ContentValues().apply {
                            put(Schema.ProductExpiration.COLUMN_PRODUCT_ID, id)
                            put(Schema.ProductExpiration.COLUMN_DATE, addProductDto.expirationDate)
                        }
                    )
                    if (id2 == -1L) throw Exception("Failed to insert product expiration")
                }
            }
        }
    }
}