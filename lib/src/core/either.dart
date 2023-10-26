sealed class Either<E, A> {}

final class Left<E, A> implements Either<E, A> {
  final E value;

  const Left(this.value);
}

final class Right<E, A> implements Either<E, A> {
  final A value;

  const Right(this.value);
}
