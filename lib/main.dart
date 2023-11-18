import 'src/application/app.dart';
import 'src/data/app.dart';
import 'src/presentation/flutter/app.dart';

void main() async {
  // ignore: omit_local_variable_types
  final AppWithDeps appWithDeps = await app(debugMode: debugMode);

  run(appWithDeps);
}
