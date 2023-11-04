import 'package:flutter/material.dart';
import 'package:logging/logging.dart';

import 'src/application/overview.dart';
import 'src/presentation/app.dart';

void main() async {
  Logger.root.level = Level.ALL; // defaults to Level.INFO
  Logger.root.onRecord.listen((record) {
    print('${record.level.name}: ${record.time}: ${record.message}');
  });

  final createPipe = preparePipe(
    OverviewDependencies(
      pending: Stream.value(0),
      logError: (message) => () => Logger.root.severe(message),
      logInfo: (message) => () => Logger.root.fine(message),
      foods: Stream.value([]),
      deleteByIds: (ids) => () async {},
    ),
  );

  // Run the app and pass in the SettingsController. The app listens to the
  // SettingsController for changes, then passes it further down to the
  // SettingsView.
  runApp(
    MyApp(
      createPipe: createPipe,
    ),
  );
}
