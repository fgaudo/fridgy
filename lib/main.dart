import 'package:flutter/foundation.dart';
import 'package:js/js.dart';

import 'src/application/app.dart';
import 'src/data/app.dart';
import 'src/data/init.dart';
import 'src/data/interop.dart';
import 'src/presentation/flutter/app.dart';

const String _SQLITE_WASM_PATH = 'sqlite3.wasm';
const String _INDEXEDDB_DB_NAME = 'fridgy';
const String _DATABASE = '/database';
const bool debugMode = kDebugMode;

@JS('populateDB')
external set _populateDB(void Function() f);

@JS('clearDB')
external set _clearDB(void Function() f);

@JS('execute')
external set _execute(void Function(String, List<dynamic>?) f);

@JS('select')
external set _select(
  List<dynamic> Function(String, List<dynamic>?) f,
);

void main() async {
  // ignore: omit_local_variable_types
  final (
    appLogger: appLogger,
    uiLogger: uiLogger,
    dataLogger: dataLogger,
  ) = await initLogger(
    debugMode: debugMode,
  );

  final (
    readDB: readDB,
    readWriteDB: readWriteDB,
  ) = await initDB(
    wasmPath: _SQLITE_WASM_PATH,
    indexedDBName: _INDEXEDDB_DB_NAME,
    dbName: _DATABASE,
  );

  _populateDB = allowInterop(
    populateDBUtil(readWriteDB),
  );

  _clearDB = allowInterop(
    clearDBUtil(readWriteDB),
  );

  _execute = allowInterop(
    executeUtil(readWriteDB),
  );

  _select = allowInterop(
    selectUtil(readDB),
  );

  // ignore: omit_local_variable_types
  final App appWithDeps = app(
    (
      deleteByIds: (
        db: readWriteDB,
        logEnv: dataLogger,
      ),
      foods: (
        db: readWriteDB,
        logEnv: dataLogger,
      ),
      appLog: appLogger,
      uiLog: uiLogger
    ),
  );

  run(appWithDeps);
}
