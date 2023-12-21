import 'package:sqlite3/common.dart';

const String FOODS_TABLE = 'foods';
const String FOODS_TABLE_NAME = 'name';
const String FOODS_TABLE_ID = 'id';
const String FOODS_TABLE_SQLITE_ID = '_id';

void initTables(CommonDatabase db) {
  db.execute('''
    pragma user_version = 1;

    CREATE TABLE IF NOT EXISTS $FOODS_TABLE (
      $FOODS_TABLE_SQLITE_ID INTEGER PRIMARY KEY, 
      $FOODS_TABLE_ID TEXT UNIQUE NOT NULL,
      $FOODS_TABLE_NAME TEXT NOT NULL
    );
  ''');
}
