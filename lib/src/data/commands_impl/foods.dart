import 'package:functionally/oo/reader_io.dart' as RIOX;
import 'package:functionally/oo/reader_stream.dart' as RSX;
import 'package:functionally/reader_io.dart' as RIO;
import 'package:functionally/stream.dart';
import 'package:logging/logging.dart';
import 'package:sqlite3/wasm.dart';

import '../../application/commands/foods.dart';
import '../../application/commands/log.dart';
import '../schema.dart';
import 'log.dart';

typedef FoodsDeps = ({CommonDatabase db, Logger logEnv});

final FoodsReader<FoodsDeps> prepareFoods = RSX
    .asks((FoodsDeps deps) => deps.db)
    .flatMapStream(
      (db) => db.updates,
    )
    .asBroadcastStream()
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
      (_) => RSX
          .ask<FoodsDeps>()
          .flatMapStream(
            (deps) => fromIO(
              () => deps.db.select('SELECT * FROM $FOODS_TABLE;'),
            ),
          )
          .asBroadcastStream()
          .build(),
    )
    .doOnData(
      (event) => _info(
        'Retrieved ${event.length} records',
      ),
    )
    .map(
      (resultSet) => resultSet.map(
        (row) => FoodData(
          name: (row[FOODS_TABLE] as String?) ?? '[UNDEFINED]',
        ),
      ),
    )
    .build();

RIO.ReaderIO<FoodsDeps, void> _info(String message) =>
    log(LogType.info, message)
        .toReaderIOBuilder()
        .local((FoodsDeps deps) => deps.logEnv)
        .build();
