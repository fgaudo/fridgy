import 'task.dart';

Stream<A> fromTask<E, A>(Task<A> t) => Stream.fromFuture(t());
