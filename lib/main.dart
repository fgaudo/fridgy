import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:logging/logging.dart';

import 'src/application/app.dart';
import 'src/data/app.dart';
import 'src/data/bootstrap.dart';
import 'src/presentation/flutter/app.dart';

const LOG_LEVEL = kDebugMode ? Level.ALL : Level.INFO;
const DB_NAME = 'fridgy';
const SQLITE_WASM_PATH = 'sqlite3.wasm';

void main() async {
  final (
    appLogger: appLogger,
    uiLogger: uiLogger,
    dataLogger: dataLogger,
    readDB: _,
    readWriteDB: readWriteDB,
  ) = await bootstrap(
    logLevel: LOG_LEVEL,
    pathToWasm: SQLITE_WASM_PATH,
    dbName: DB_NAME,
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
    AppWidget(
      appWithDeps: appWithDeps,
    ),
  );
}
