import 'package:fgaudo_functional/task.dart';

Task<B> acquireResource<A, B>({
  required Task<A> resourceTask,
  required Task<void> Function(A) release,
  required Task<B> Function(A) use,
}) =>
    () async {
      final resource = await resourceTask();
      try {
        return use(resource)();
      } finally {
        await release(resource)();
      }
    };
