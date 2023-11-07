import 'package:fgaudo_functional/io.dart';
import 'package:js/js_util.dart';
import 'package:sqlite3/wasm.dart';

const String DATABASE = '/database';

const String FOODS_TABLE = 'foods';
const String FOODS_TABLE_NAME = 'name';

Future<WasmSqlite3> bootstrap({
  required String pathToWasm,
  required String dbName,
}) async {
  final sqlite3 = await WasmSqlite3.loadFromUrl(
    Uri.parse(pathToWasm),
  )
    ..registerVirtualFileSystem(
      await IndexedDbFileSystem.open(dbName: dbName),
      makeDefault: true,
    );

  sqlite3.open(DATABASE)
    ..execute('pragma user_version = 1')
    ..execute(
      'CREATE TABLE IF NOT EXISTS $FOODS_TABLE (id INTEGER PRIMARY KEY AUTOINCREMENT, $FOODS_TABLE_NAME TEXT NOT NULL);',
    )
    ..dispose();

  return sqlite3;
}

IO<void> populateDB(CommonDatabase db) => () => db
  ..execute(
    'INSERT INTO $FOODS_TABLE($FOODS_TABLE_NAME) values(?);',
    ['bread'],
  );

IO<void> clearDB(CommonDatabase db) => () => db
  ..execute(
    'DELETE FROM $FOODS_TABLE;',
  );

void Function(String, List<dynamic>?) execute(CommonDatabase db) =>
    (sql, values) {
      db.execute(sql, values ?? []);
    };

List<dynamic> Function(String, List<dynamic>?) select(
  CommonDatabase db,
) =>
    (sql, values) => db.select(sql, values ?? []).map((row) {
          final Object object = newObject();
          row.forEach((k, v) {
            setProperty(object, k, v);
          });
          return object;
        }).toList();
