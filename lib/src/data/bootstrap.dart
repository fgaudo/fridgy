import 'package:functionally/io.dart';
import 'package:js/js.dart';
import 'package:js/js_util.dart';
import 'package:logging/logging.dart';
import 'package:sqlite3/wasm.dart';

const String DATABASE = '/database';

const String FOODS_TABLE = 'foods';
const String FOODS_TABLE_NAME = 'name';

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

Future<
    ({
      CommonDatabase readWriteDB,
      CommonDatabase readDB,
      Logger appLogger,
      Logger uiLogger,
      Logger dataLogger,
    })> bootstrap({
  required Level logLevel,
  required String pathToWasm,
  required String dbName,
}) async {
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
    Uri.parse(pathToWasm),
  )
    ..registerVirtualFileSystem(
      await IndexedDbFileSystem.open(dbName: dbName),
      makeDefault: true,
    );

  final dependencies = (
    appLogger: appLogger,
    dataLogger: dataLogger,
    uiLogger: uiLogger,
    readWriteDB: sqlite3.open(DATABASE, mode: OpenMode.readWriteCreate),
    readDB: sqlite3.open(DATABASE, mode: OpenMode.readOnly),
  );

  _createTables(dependencies.readWriteDB);

  _populateDB = allowInterop(
    _populateDBUtil(dependencies.readWriteDB),
  );

  _clearDB = allowInterop(
    _clearDBUtil(dependencies.readWriteDB),
  );

  _execute = allowInterop(
    _executeUtil(dependencies.readWriteDB),
  );

  _select = allowInterop(
    _selectUtil(dependencies.readDB),
  );

  return dependencies;
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
