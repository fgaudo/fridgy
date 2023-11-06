import 'package:fgaudo_functional/stream.dart';
import 'package:rxdart/rxdart.dart';
import 'package:sqlite3/wasm.dart';

import '../../../application/commands/log.dart';
import '../../../application/streams/foods.dart';
import '../bootstrap.dart';

Foods$ prepareFoodsStream({
  required CommonSqlite3 sqlite3,
  required Log log,
}) {
  CommonDatabase? db;
  return FromCallableStream(
    () async => db = sqlite3.open(DATABASE, mode: OpenMode.readOnly),
  ).doOnDone(() {
    db?.dispose();
  }).flatMap(
    (db) => db.updates
        .where((event) => event.tableName == FOODS_TABLE)
        .map((event) => null)
        .startWith(null)
        .switchMap(
          (_) => fromIO(() => db.select('SELECT * FROM $FOODS_TABLE;')),
        )
        .map(
          (resultSet) => resultSet.map(
            (row) => FoodData(
              name: (row[FOODS_TABLE_NAME] as String?) ?? '[UNDEFINED]',
            ),
          ),
        ),
  );
}
