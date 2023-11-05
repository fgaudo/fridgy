import 'package:logging/logging.dart';

import 'src/application/commands/log.dart';
import 'src/application/use_cases/overview.dart' as overview;
import 'src/presentation/flutter/app.dart';

void main() async {
  Logger.root.level = Level.ALL;
  Logger.root.onRecord.listen((record) {
    print('${record.level.name}: ${record.time}: ${record.message}');
  });

  runFlutterApp(
    overviewPipeFactory: overview.preparePipeFactory(
      pending: Stream.value(0),
      log: (type, message) => () => type == LogType.info
          ? Logger.root.fine(message)
          : Logger.root.severe(message),
      foods$: Stream.value([]),
      deleteByIds: (ids) => () async {},
    ),
  );
}
