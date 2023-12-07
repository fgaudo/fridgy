import 'package:logging/logging.dart';
import 'package:sqlite3/wasm.dart';

import '../application/app.dart';
import 'commands/execute.dart';
import 'commands/retrieve.dart';
import 'commands_impl/enqueue_delete_foods_by_ids.dart';
import 'commands_impl/execute.dart';
import 'commands_impl/foods.dart';
import 'commands_impl/log.dart';
import 'commands_impl/retrieve.dart';
import 'schema.dart';

const String _SQLITE_WASM_PATH = 'sqlite3.wasm';
const String _INDEXEDDB_DB_NAME = 'fridgy';
const String _DATABASE = '/database';
const String _APP_LOGGER_NAME = 'APP';
const String _UI_LOGGER_NAME = 'UI';
const String _DATA_LOGGER_NAME = 'DATA';

final class AppImpl extends App {
  AppImpl({
    required super.appLog,
    required super.deleteFoodsByIds,
    required super.foods,
    required super.uiLog,
    required this.retrieve,
    required this.execute,
  });

  final Retrieve retrieve;
  final Execute execute;
}

Future<AppImpl> app({
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

  return AppImpl(
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
