import 'package:sqlite3/wasm.dart';

const String DATABASE = '/database';

const String FOODS_TABLE = 'foods';
const String FOODS_TABLE_NAME = 'name';

Future<CommonDatabase> loadDB({
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

  return sqlite3.open(DATABASE);
}

void createTables(CommonDatabase db) {
  db
    ..execute('pragma user_version = 1')
    ..execute(
      'CREATE TABLE IF NOT EXISTS $FOODS_TABLE (id INTEGER PRIMARY KEY AUTOINCREMENT, $FOODS_TABLE_NAME TEXT NOT NULL);',
    )
    ..dispose();
}
