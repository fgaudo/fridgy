import 'package:functionally/extensions/reader_io.dart';
import 'package:functionally/extensions/reader_stream.dart';
import 'package:functionally/reader_io.dart' as RIO;
import 'package:functionally/reader_stream.dart' as RS;
import 'package:functionally/stream.dart';
import 'package:logging/logging.dart';
import 'package:sqlite3/wasm.dart';

import '../../application/commands/foods.dart';
import '../app.dart';
import 'log.dart';

typedef FoodsDeps = ({CommonDatabase db, Logger logEnv});

final FoodsReader<FoodsDeps> prepareFoods = RS
    .asks((FoodsDeps deps) => deps.db)
    .flatMapStream(
      (db) => db.updates.asBroadcastStream(),
    )
    .doOnData(
      (event) => _info('received update'),
    )
    .where((event) => event.tableName == FOODS_TABLE)
    .map((event) => null)
    .startWith(null)
    .doOnData(
      (event) => _info('Taking all foods'),
    )
    .switchMap(
      (_) => RS.ask<FoodsDeps>().flatMapStream(
            (deps) => fromIO(
              () => deps.db.select('SELECT * FROM $FOODS_TABLE;'),
            ),
          ),
    )
    .doOnData(
      (event) => _info(
        'Retrieved ${event.length} records',
      ),
    )
    .map(
      (resultSet) => resultSet.map(
        (row) => FoodData(
          name: (row[FOODS_TABLE_NAME] as String?) ?? '[UNDEFINED]',
        ),
      ),
    );

RIO.ReaderIO<FoodsDeps, void> _info(String message) =>
    RIO.asks((FoodsDeps deps) => deps.logEnv).flatMapIO(
          log.info(message),
        );
