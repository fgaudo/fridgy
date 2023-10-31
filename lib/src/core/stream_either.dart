import 'dart:async';

import 'either.dart';
import 'task_either.dart';

typedef StreamEither<E, A> = Stream<Either<E, A>>;

StreamEither<E, A> fromTaskEither<E, A>(TaskEither<E, A> t) =>
    Stream.fromFuture(t());

final class MapEitherStreamTransformer<E1, E2, A, B>
    extends StreamTransformerBase<Either<E1, A>, Either<E2, B>> {
  const MapEitherStreamTransformer({
    required this.right,
    required this.left,
  });
  final B Function(A) right;
  final E2 Function(E1) left;

  @override
  Stream<Either<E2, B>> bind(
    Stream<Either<E1, A>> stream,
  ) =>
      FoldEitherStreamTransformer<E1, A, Either<E2, B>>(
        right: (value) => Right(this.right(value)),
        left: (value) => Left(this.left(value)),
      ).bind(stream);
}

final class FoldEitherStreamTransformer<E, A, B>
    extends StreamTransformerBase<Either<E, A>, B> {
  const FoldEitherStreamTransformer({
    required this.right,
    required this.left,
  });

  final B Function(E) left;
  final B Function(A) right;

  @override
  Stream<B> bind(Stream<Either<E, A>> stream) => stream.map(
        (event) => switch (event) {
          Right(value: final value) => this.right(value),
          Left(value: final value) => this.left(value)
        },
      );
}
