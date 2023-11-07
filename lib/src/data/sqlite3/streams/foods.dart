import 'package:fgaudo_functional/stream.dart';
import 'package:logging/logging.dart';
import 'package:rxdart/rxdart.dart';
import 'package:sqlite3/wasm.dart';

import '../../../application/commands/log.dart';
import '../../../application/streams/foods.dart';
import '../bootstrap.dart';

final Foods$<({CommonDatabase db, Log<Logger> log, Logger logger})> foods$ =
    (deps) => deps.db.updates
        .doOnData(
          (event) => deps.log(LogType.info, 'received update')(deps.logger),
        )
        .where((event) => event.tableName == FOODS_TABLE)
        .map((event) => null)
        .startWith(null)
        .doOnData(
          (event) => deps.log(LogType.info, 'Taking all foods')(deps.logger),
        )
        .switchMap(
          (_) => fromIO(() => deps.db.select('SELECT * FROM $FOODS_TABLE;')),
        )
        .map(
          (resultSet) => resultSet.map(
            (row) => FoodData(
              name: (row[FOODS_TABLE_NAME] as String?) ?? '[UNDEFINED]',
            ),
          ),
        )
        .asBroadcastStream();
