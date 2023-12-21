import 'package:functionally/common.dart';
import 'package:functionally/reader.dart' as R;
import 'package:functionally/reader_stream.dart' as RS;
import 'package:functionally/stream.dart';
import 'package:logging/logging.dart';
import 'package:rxdart/rxdart.dart';
import 'package:sqlite3/common.dart';

import '../../application/commands/foods.dart';
import '../../application/commands/log.dart';
import '../schema.dart';
import 'log.dart';

typedef FoodsDeps = ({CommonDatabase db, Logger logEnv});

final FoodsReader<FoodsDeps> prepareFoods =
    Builder(RS.asks((FoodsDeps deps) => deps.db))
        .transform(
          R.map_(
            (db$) => db$.flatMap((db) => db.updates).asBroadcastStream(),
          ),
        )
        .transform(
          R.flatMap(
            (updates$) => (deps) => updates$.doOnData(
                  (_) => log(LogType.info, 'received update')(deps.logEnv),
                ),
          ),
        )
        .transform(
          R.map_(
            (event$) => event$.where((event) => event.tableName == FOODS_TABLE),
          ),
        )
        .transform(
          RS.map_((_) => null),
        )
        .transform(
          R.map_(
            (event$) => event$.startWith(null),
          ),
        )
        .transform(
          R.flatMap(
            (updates$) => (deps) => updates$.doOnData(
                  (_) => log(LogType.info, 'Taking all foods')(deps.logEnv),
                ),
          ),
        )
        .transform(
          R.flatMap(
            (updates$) => (deps) => updates$.switchMap(
                  (_) => fromIO(
                    () => deps.db.select('SELECT * FROM $FOODS_TABLE;'),
                    reusable: true,
                  ),
                ),
          ),
        )
        .transform(
          R.flatMap(
            (updates$) => (deps) => updates$.doOnData(
                  (event) =>
                      log(LogType.info, 'Retrieved ${event.length} records')(
                    deps.logEnv,
                  ),
                ),
          ),
        )
        .transform(
          RS.map_(
            (resultSet) => resultSet.map(
              (row) => FoodData(
                name: (row[FOODS_TABLE] as String?) ?? '[UNDEFINED]',
              ),
            ),
          ),
        )
        .build();
