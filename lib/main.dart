import 'package:logging/logging.dart';

import 'src/application/overview.dart' as overview;
import 'src/presentation/flutter/app.dart';

void main() async {
  Logger.root.level = Level.ALL;
  Logger.root.onRecord.listen((record) {
    print('${record.level.name}: ${record.time}: ${record.message}');
  });

  runFlutterApp(
    overviewPipeFactory: overview.preparePipeFactory(
      pending: Stream.value(0),
      logError: (message) => () => Logger.root.severe(message),
      logInfo: (message) => () => Logger.root.fine(message),
      foods: Stream.value([]),
      deleteByIds: (ids) => () async {},
    ),
  );
}
