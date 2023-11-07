import 'package:fgaudo_functional/stream.dart';
import 'package:rxdart/rxdart.dart';
import 'package:sqlite3/wasm.dart';

import '../../../application/commands/log.dart';
import '../../../application/streams/foods.dart';
import '../bootstrap.dart';

Foods$ prepareFoodsStream({
  required CommonDatabase database,
  required Log log,
}) =>
    database.updates
        .doOnData((event) => log(LogType.info, 'received update'))
        .where((event) => event.tableName == FOODS_TABLE)
        .map((event) => null)
        .startWith(null)
        .doOnData(
          (event) => log(LogType.info, 'Taking all foods'),
        )
        .switchMap(
          (_) => fromIO(() => database.select('SELECT * FROM $FOODS_TABLE;')),
        )
        .map(
          (resultSet) => resultSet.map(
            (row) => FoodData(
              name: (row[FOODS_TABLE_NAME] as String?) ?? '[UNDEFINED]',
            ),
          ),
        )
        .asBroadcastStream();
