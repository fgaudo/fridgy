import 'package:functionally/io.dart';
import 'package:js/js_util.dart';
import 'package:sqlite3/wasm.dart';

import 'schema.dart';

IO<void> populateDBUtil(CommonDatabase db) => () => db
  ..execute(
    'INSERT INTO $FOODS_TABLE($FOODS_TABLE_NAME) values(?);',
    ['bread'],
  );

IO<void> clearDBUtil(CommonDatabase db) => () => db
  ..execute(
    'DELETE FROM $FOODS_TABLE;',
  );

void Function(String, List<dynamic>?) executeUtil(CommonDatabase db) =>
    (sql, values) {
      db.execute(sql, values ?? []);
    };

List<dynamic> Function(String, List<dynamic>?) selectUtil(
  CommonDatabase db,
) =>
    (sql, values) => db.select(sql, values ?? []).map((row) {
          final Object object = newObject();
          row.forEach((k, v) {
            setProperty(object, k, v);
          });
          return object;
        }).toList();
