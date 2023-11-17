import 'package:functionally/extensions/reader_io.dart';
import 'package:functionally/extensions/reader_stream.dart';
import 'package:functionally/reader_stream.dart' as RS;
import 'package:functionally/stream.dart';
import 'package:logging/logging.dart';
import 'package:sqlite3/wasm.dart';

import '../../application/commands/foods.dart';
import '../bootstrap.dart';
import 'log.dart';

typedef FoodsDeps = ({CommonDatabase db, Logger logEnv});

final Foods<FoodsDeps> prepareFoods = RS
    .asks((FoodsDeps deps) => deps.db)
    .flatMapStream(
      (db) => db.updates.asBroadcastStream(),
    )
    .doOnData(
      (event) => log
          .info(
            'received update',
          )
          .local((deps) => deps.logEnv),
    )
    .where((event) => event.tableName == FOODS_TABLE)
    .map((event) => null)
    .startWith(null)
    .doOnData(
      (event) => log
          .info(
            'Taking all foods',
          )
          .local((deps) => deps.logEnv),
    )
    .switchMap(
      (_) => RS.ask<FoodsDeps>().flatMapStream(
            (deps) => fromIO(
              () => deps.db.select('SELECT * FROM $FOODS_TABLE;'),
            ),
          ),
    )
    .doOnData(
      (event) => log
          .info(
            'Retrieved ${event.length} records',
          )
          .local((FoodsDeps deps) => deps.logEnv),
    )
    .map(
      (resultSet) => resultSet.map(
        (row) => FoodData(
          name: (row[FOODS_TABLE_NAME] as String?) ?? '[UNDEFINED]',
        ),
      ),
    );
