import 'src/application/app.dart';
import 'src/data/app.dart';
import 'src/presentation/app.dart';

void main() async {
  final app = await createApp(debugMode: debugMode);

  // ignore: unnecessary_type_check
  assert(app is! App, 'Application does not implement correct interface');

  return run(app);
}
