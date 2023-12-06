import 'package:logging/logging.dart';
import 'package:sqlite3/wasm.dart';

import '../application/app.dart';
import 'commands/delete_foods_by_ids.dart';
import 'commands/execute.dart';
import 'commands/foods.dart';
import 'commands/log.dart';
import 'commands/retrieve.dart';
import 'schema.dart';

const _SQLITE_WASM_PATH = 'sqlite3.wasm';
const _INDEXEDDB_DB_NAME = 'fridgy';
const String _DATABASE = '/database';

Future<App> app({
  required bool debugMode,
}) async {
  final logLevel = debugMode ? Level.ALL : Level.INFO;

  final appLogger = Logger('APP');
  final dataLogger = Logger('DATA');
  final uiLogger = Logger('UI');

  Logger.root.level = logLevel;
  Logger.root.onRecord.listen((record) {
    print(
      '${record.level.name} [${record.loggerName}] : ${record.message}',
    );
  });

  final sqlite3 = await WasmSqlite3.loadFromUrl(
    Uri.parse(_SQLITE_WASM_PATH),
  )
    ..registerVirtualFileSystem(
      await IndexedDbFileSystem.open(dbName: _INDEXEDDB_DB_NAME),
      makeDefault: true,
    );

  final readWriteDB = sqlite3.open(_DATABASE, mode: OpenMode.readWriteCreate);
  final readDB = sqlite3.open(_DATABASE, mode: OpenMode.readOnly);

  _createTables(readWriteDB);

  return prepareApp(
    deleteFoodsByIds: (ids) => prepareDeleteFoodsByIds(ids)(
      (
        db: readWriteDB,
        logEnv: dataLogger,
      ),
    ),
    foods: prepareFoods(
      (
        db: readWriteDB,
        logEnv: dataLogger,
      ),
    ),
    appLog: (type, message) => log(type, message)(appLogger),
    uiLog: (type, message) => log(type, message)(uiLogger),
    retrieve: (query, values) => retrieve(query, values)(readDB),
    execute: (query, values) => execute(query, values)(readWriteDB),
  );
}

void _createTables(CommonDatabase db) {
  db
    ..execute('pragma user_version = 1')
    ..execute(
      'CREATE TABLE IF NOT EXISTS $FOODS_TABLE (id INTEGER PRIMARY KEY AUTOINCREMENT, $FOODS_TABLE_NAME TEXT NOT NULL);',
    );
}
