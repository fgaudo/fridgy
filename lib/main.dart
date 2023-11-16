import 'package:flutter/material.dart';
import 'package:logging/logging.dart';

import 'src/application/app.dart';
import 'src/data/app.dart';
import 'src/data/bootstrap.dart';
import 'src/presentation/flutter/app.dart';

void main() async {
  final (
    appLogger: appLogger,
    uiLogger: uiLogger,
    dataLogger: dataLogger,
    readDB: _,
    readWriteDB: readWriteDB,
  ) = await bootstrap(
    logLevel: Level.ALL,
    pathToWasm: 'sqlite3.wasm',
    dbName: 'fridgy',
  );

  // ignore: omit_local_variable_types
  final AppWithDeps appWithDeps = app(
    (
      overviewEnv: (
        deleteEnv: (db: readWriteDB, logEnv: dataLogger),
        foodsEnv: (db: readWriteDB, logEnv: dataLogger),
        logEnv: appLogger
      ),
      logEnv: uiLogger,
    ),
  );

  runApp(
    MyApp(
      appWithDeps: appWithDeps,
    ),
  );
}
