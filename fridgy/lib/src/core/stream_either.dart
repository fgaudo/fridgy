import 'either.dart';
import 'task_either.dart';

typedef StreamEither<E, A> = Stream<Either<E, A>>;

StreamEither<E, A> fromTaskEither<E, A>(TaskEither<E, A> t) {
  return Stream.fromFuture(t());
}
