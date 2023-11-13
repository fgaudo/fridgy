import 'package:functionally/extensions/reader/local.dart';
import 'package:functionally/extensions/reader_stream/do_on_data.dart';
import 'package:functionally/extensions/reader_stream/flat_map.dart';
import 'package:functionally/extensions/reader_stream/map.dart';
import 'package:functionally/extensions/reader_stream/start_with.dart';
import 'package:functionally/extensions/reader_stream/switch_map.dart';
import 'package:functionally/extensions/reader_stream/where.dart';
import 'package:functionally/reader_stream.dart';
import 'package:functionally/stream.dart';
import 'package:sqlite3/wasm.dart';

import '../../../application/streams/foods.dart';
import '../../../core/commands/log.dart';
import '../bootstrap.dart';

typedef FoodsDeps<LOG> = ({CommonDatabase db, LOG logEnv});

Foods<FoodsDeps<LOG>> prepareFoods$R<LOG>(Log<LOG> log) => Do<FoodsDeps<LOG>>()
    .flatMap(
      (_) => (deps) => deps.db.updates.asBroadcastStream(),
    )
    .doOnData(
      (event) =>
          log(LogType.info, 'received update').local((deps) => deps.logEnv),
    )
    .where((event) => event.tableName == FOODS_TABLE)
    .map((event) => null)
    .startWith(null)
    .doOnData(
      (event) =>
          log(LogType.info, 'Taking all foods').local((deps) => deps.logEnv),
    )
    .switchMap(
      (_) => (deps) => fromIO(
            () => deps.db.select('SELECT * FROM $FOODS_TABLE;'),
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
