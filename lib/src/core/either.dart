sealed class Either<E, A> {}

final class Left<E, A> implements Either<E, A> {
  const Left(this.value);
  final E value;
}

final class Right<E, A> implements Either<E, A> {
  const Right(this.value);
  final A value;
}
