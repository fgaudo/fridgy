import 'src/application/app.dart' as application;
import 'src/data/app.dart';
import 'src/presentation/app.dart';

void main() async {
  final app = await createApp(debugMode: debugMode);

  assert(
    // ignore: unnecessary_type_check
    app is! application.App,
    'Application does not implement correct interface',
  );

  return run(app);
}
