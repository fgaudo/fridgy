package net.gaudo.fridgy.data

import android.provider.BaseColumns

object Schema {
    object Product : BaseColumns {
        const val TABLE_NAME = "product"
        const val COLUMN_NAME = "name"
        const val COLUMN_CREATION_DATE = "creation_date"
    }

    object ProductExpiration : BaseColumns {
        const val TABLE_NAME = "product_expiration"
        const val COLUMN_DATE = "date"
        const val COLUMN_PRODUCT_ID = "product_id"
    }
}
