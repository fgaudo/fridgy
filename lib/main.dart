import 'src/application/app.dart';
import 'src/data/app.dart';
import 'src/presentation/app.dart';

void main() async {
  const a = app;

  if (a is! App) {
    throw Exception('Application does not implement correct interface');
  }

  return run(a);
}
