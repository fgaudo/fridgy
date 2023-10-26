import 'package:fridgy/src/core/either.dart';

typedef TaskEither<E, A> = Future<Either<E, A>> Function();

TaskEither<E, (A, B)> sequenceTuple2<E, A, B>(
  TaskEither<E, A> te1,
  TaskEither<E, B> te2,
) =>
    () async {
      try {
        final result = await Future.wait([
          te1().then((value) => switch (value) {
                Right(value: final value) => Right<E, A>(value),
                Left(value: final value) => throw Left<E, (A, B)>(value)
              }),
          te2().then((value) => switch (value) {
                Right(value: final value) => Right<E, B>(value),
                Left(value: final value) => throw Left<E, (A, B)>(value)
              })
        ], eagerError: true);

        return Right((result[0] as A, result[1] as B));
      } on Left<E, (A, B)> catch (e) {
        return e;
      }
    };
