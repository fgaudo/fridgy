import 'package:logging/logging.dart';
import 'package:sqlite3/wasm.dart';

import 'schema.dart';

const String _APP_LOGGER_NAME = 'APP';
const String _UI_LOGGER_NAME = 'APP';
const String _DATA_LOGGER_NAME = 'APP';

Future<
    ({
      Logger appLogger,
      Logger uiLogger,
      Logger dataLogger,
    })> initLogger({
  required bool debugMode,
}) async {
  final logLevel = debugMode ? Level.ALL : Level.INFO;

  final appLogger = Logger(_APP_LOGGER_NAME);
  final dataLogger = Logger(_DATA_LOGGER_NAME);
  final uiLogger = Logger(_UI_LOGGER_NAME);

  Logger.root.level = logLevel;
  Logger.root.onRecord.listen((record) {
    print(
      '${record.level.name} [${record.loggerName}] : ${record.message}',
    );
  });

  return (
    appLogger: appLogger,
    dataLogger: dataLogger,
    uiLogger: uiLogger,
  );
}

Future<({CommonDatabase readDB, CommonDatabase readWriteDB})> initDB({
  required String wasmPath,
  required String indexedDBName,
  required String dbName,
}) async {
  final sqlite3 = await WasmSqlite3.loadFromUrl(
    Uri.parse(wasmPath),
  )
    ..registerVirtualFileSystem(
      await IndexedDbFileSystem.open(dbName: indexedDBName),
      makeDefault: true,
    );

  final readWriteDB = sqlite3.open(dbName, mode: OpenMode.readWriteCreate);
  final readDB = sqlite3.open(dbName, mode: OpenMode.readOnly);

  _createTables(readWriteDB);

  return (
    readDB: readDB,
    readWriteDB: readWriteDB,
  );
}

void _createTables(CommonDatabase db) {
  db
    ..execute('pragma user_version = 1')
    ..execute(
      'CREATE TABLE IF NOT EXISTS $FOODS_TABLE (id INTEGER PRIMARY KEY AUTOINCREMENT, $FOODS_TABLE_NAME TEXT NOT NULL);',
    );
}
