typedef Task<A> = Future<A> Function();

Task<(A, B)> sequenceTuple2<A, B>(
  Task<A> te1,
  Task<B> te2,
) =>
    () async {
      final result = await Future.wait([te1(), te2()]);
      return (result[0] as A, result[1] as B);
    };
