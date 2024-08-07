package net.gaudo.fridgy.data

sealed class Result<L, R> {
    data class Success<L, R>(val data: R) : Result<L, R>()
    data class Error<L, R>(val error: L) : Result<L, R>()
}
