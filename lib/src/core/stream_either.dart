import 'dart:async';

import 'either.dart';
import 'task_either.dart';

typedef StreamEither<E, A> = Stream<Either<E, A>>;

StreamEither<E, A> fromTaskEither<E, A>(TaskEither<E, A> t) {
  return Stream.fromFuture(t());
}

final class MapEitherStreamTransformer<E1, E2, A, B>
    extends StreamTransformerBase<Either<E1, A>, Either<E2, B>> {
  final B Function(A) rightMap;
  final E2 Function(E1) leftMap;

  const MapEitherStreamTransformer(
      {required this.rightMap, required this.leftMap});

  @override
  Stream<Either<E2, B>> bind(
    Stream<Either<E1, A>> stream,
  ) =>
      stream.transform(
        FoldEitherStreamTransformer(
          onRight: (value) => Right(this.rightMap(value)),
          onLeft: (value) => Left(this.leftMap(value)),
        ),
      );
}

final class FoldEitherStreamTransformer<E, A, B>
    extends StreamTransformerBase<Either<E, A>, B> {
  final B Function(E) onLeft;
  final B Function(A) onRight;

  const FoldEitherStreamTransformer({
    required this.onRight,
    required this.onLeft,
  });

  @override
  Stream<B> bind(Stream<Either<E, A>> stream) => stream.map(
        (event) => switch (event) {
          Right(value: final value) => this.onRight(value),
          Left(value: final value) => this.onLeft(value)
        },
      );
}
