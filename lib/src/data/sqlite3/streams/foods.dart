import 'package:fgaudo_functional/stream.dart';
import 'package:logging/logging.dart';
import 'package:rxdart/rxdart.dart';
import 'package:sqlite3/wasm.dart';

import '../../../application/commands/log.dart';
import '../../../application/streams/foods.dart';
import '../bootstrap.dart';

final Foods$<({CommonDatabase dbEnv, Log<Logger> logEnv, Logger loggerEnv})>
    foods$ = (deps) => deps.dbEnv.updates
        .doOnData(
          (event) =>
              deps.logEnv(LogType.info, 'received update')(deps.loggerEnv),
        )
        .where((event) => event.tableName == FOODS_TABLE)
        .map((event) => null)
        .startWith(null)
        .doOnData(
          (event) =>
              deps.logEnv(LogType.info, 'Taking all foods')(deps.loggerEnv),
        )
        .switchMap(
          (_) => fromIO(() => deps.dbEnv.select('SELECT * FROM $FOODS_TABLE;')),
        )
        .map(
          (resultSet) => resultSet.map(
            (row) => FoodData(
              name: (row[FOODS_TABLE_NAME] as String?) ?? '[UNDEFINED]',
            ),
          ),
        )
        .asBroadcastStream();
