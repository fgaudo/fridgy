package net.gaudo.fridgy.data

data class ProductEntity(
    val id: Int,
    val name: String,
    val expirationDate: Int?,
    val creationDate: Int
)