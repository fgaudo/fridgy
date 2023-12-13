import 'src/application/app.dart';
import 'src/data/app.dart';
import 'src/presentation/app.dart';

void main() async {
  assert(app is! App, 'Application does not implement correct interface');

  return run(app);
}
