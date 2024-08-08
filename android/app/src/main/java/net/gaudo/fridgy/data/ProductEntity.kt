package net.gaudo.fridgy.data

data class ProductEntity(
    val id: Long,
    val name: String,
    val expirationDate: Long?,
    val creationDate: Long
)