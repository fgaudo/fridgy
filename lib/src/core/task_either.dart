import 'package:fridgy/src/core/either.dart';

typedef TaskEither<E, A> = Future<Either<E, A>> Function();

TaskEither<E, (A, B)> sequenceTuple2<E, A, B>(
  TaskEither<E, A> te1,
  TaskEither<E, B> te2,
) =>
    () async {
      try {
        final result = await Future.wait(
          [
            () async {
              final res1 = await te1();
              switch (res1) {
                case Right(value: final value):
                  return value;
                case Left(value: final value):
                  throw _FailFastException(value);
              }
            }(),
            () async {
              final res2 = await te2();
              switch (res2) {
                case Right(value: final value):
                  return value;
                case Left(value: final value):
                  throw _FailFastException(value);
              }
            }(),
          ],
          eagerError: true,
        );

        return Right(
          (
            result[0] as A,
            result[1] as B,
          ),
        );
      } on _FailFastException<E> catch (e) {
        return Left(e.value);
      }
    };

final class _FailFastException<T> implements Exception {
  const _FailFastException(this.value);

  final T value;
}
