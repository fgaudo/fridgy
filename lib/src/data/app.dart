import 'package:functionally/io.dart';
import 'package:js/js.dart';
import 'package:js/js_util.dart';
import 'package:logging/logging.dart';
import 'package:sqlite3/wasm.dart';

import '../application/app.dart';
import 'use_cases/delete_foods_by_ids.dart';
import 'use_cases/foods.dart';
import 'use_cases/log.dart';

const _INDEXEDDB_DB_NAME = 'fridgy';
const String _DATABASE = '/database';

const String FOODS_TABLE = 'foods';
const String FOODS_TABLE_NAME = 'name';

const _SQLITE_WASM_PATH = 'sqlite3.wasm';

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

Future<AppWithDeps> app({
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

  _populateDB = allowInterop(
    _populateDBUtil(readWriteDB),
  );

  _clearDB = allowInterop(
    _clearDBUtil(readWriteDB),
  );

  _execute = allowInterop(
    _executeUtil(readWriteDB),
  );

  _select = allowInterop(
    _selectUtil(readDB),
  );

  return prepareApp(
    deleteFoodsByIds: (
      execute: prepareDeleteFoodsByIds,
      env: (
        db: readWriteDB,
        logEnv: dataLogger,
      )
    ),
    foods: (
      execute: prepareFoods,
      env: (
        db: readWriteDB,
        logEnv: dataLogger,
      )
    ),
    appLog: (
      execute: log,
      env: appLogger,
    ),
    uiLog: (
      execute: log,
      env: uiLogger,
    ),
  );
}

void _createTables(CommonDatabase db) {
  db
    ..execute('pragma user_version = 1')
    ..execute(
      'CREATE TABLE IF NOT EXISTS $FOODS_TABLE (id INTEGER PRIMARY KEY AUTOINCREMENT, $FOODS_TABLE_NAME TEXT NOT NULL);',
    );
}

IO<void> _populateDBUtil(CommonDatabase db) => () => db
  ..execute(
    'INSERT INTO $FOODS_TABLE($FOODS_TABLE_NAME) values(?);',
    ['bread'],
  );

IO<void> _clearDBUtil(CommonDatabase db) => () => db
  ..execute(
    'DELETE FROM $FOODS_TABLE;',
  );

void Function(String, List<dynamic>?) _executeUtil(CommonDatabase db) =>
    (sql, values) {
      db.execute(sql, values ?? []);
    };

List<dynamic> Function(String, List<dynamic>?) _selectUtil(
  CommonDatabase db,
) =>
    (sql, values) => db.select(sql, values ?? []).map((row) {
          final Object object = newObject();
          row.forEach((k, v) {
            setProperty(object, k, v);
          });
          return object;
        }).toList();
