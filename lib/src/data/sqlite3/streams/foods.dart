import 'package:functionally/extensions/reader_io.dart';
import 'package:functionally/extensions/reader_stream.dart';
import 'package:functionally/reader_stream.dart' as RS;
import 'package:functionally/stream.dart';
import 'package:sqlite3/wasm.dart';

import '../../../application/streams/foods.dart';
import '../../../application/commands/log.dart';
import '../bootstrap.dart';

typedef FoodsDeps<LOG> = ({CommonDatabase db, LOG logEnv});

Foods<FoodsDeps<LOG>> prepareFoods<LOG>(Log<LOG> log) => RS
    .asks((FoodsDeps<LOG> deps) => deps.db)
    .flatMapStream(
      (db) => db.updates.asBroadcastStream(),
    )
    .doOnData(
      (event) => log(
        LogType.info,
        'received update',
      ).local((deps) => deps.logEnv),
    )
    .where((event) => event.tableName == FOODS_TABLE)
    .map((event) => null)
    .startWith(null)
    .doOnData(
      (event) => log(
        LogType.info,
        'Taking all foods',
      ).local((deps) => deps.logEnv),
    )
    .switchMap(
      (_) => RS.ask<FoodsDeps<LOG>>().flatMapStream(
            (deps) => fromIO(
              () => deps.db.select('SELECT * FROM $FOODS_TABLE;'),
            ),
          ),
    )
    .doOnData(
      (event) => log(
        LogType.info,
        'Retrieved ${event.length} records',
      ).local((FoodsDeps<LOG> deps) => deps.logEnv),
    )
    .map(
      (resultSet) => resultSet.map(
        (row) => FoodData(
          name: (row[FOODS_TABLE_NAME] as String?) ?? '[UNDEFINED]',
        ),
      ),
    );
