import 'package:fgaudo_functional/extensions/reader/local.dart';
import 'package:fgaudo_functional/extensions/reader_stream/do_on_data.dart';
import 'package:fgaudo_functional/extensions/reader_stream/flat_map.dart';
import 'package:fgaudo_functional/extensions/reader_stream/map.dart';
import 'package:fgaudo_functional/extensions/reader_stream/start_with.dart';
import 'package:fgaudo_functional/extensions/reader_stream/switch_map.dart';
import 'package:fgaudo_functional/extensions/reader_stream/where.dart';
import 'package:fgaudo_functional/reader_stream.dart';
import 'package:fgaudo_functional/stream.dart';
import 'package:logging/logging.dart';
import 'package:sqlite3/wasm.dart';

import '../../../application/commands/log.dart';
import '../../../application/streams/foods.dart';
import '../../generic/commands/log.dart';
import '../bootstrap.dart';

typedef FoodsDeps = ({CommonDatabase db, Logger logger});

final Foods<FoodsDeps> foods = Do<FoodsDeps>()
    .flatMap(
      (_) => (deps) => deps.db.updates.asBroadcastStream(),
    )
    .doOnData(
      (event) =>
          log(LogType.info, 'received update').local((deps) => deps.logger),
    )
    .where((event) => event.tableName == FOODS_TABLE)
    .map((event) => null)
    .startWith(null)
    .doOnData(
      (event) =>
          log(LogType.info, 'Taking all foods').local((deps) => deps.logger),
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
      ).local((FoodsDeps deps) => deps.logger),
    )
    .map(
      (resultSet) => resultSet.map(
        (row) => FoodData(
          name: (row[FOODS_TABLE_NAME] as String?) ?? '[UNDEFINED]',
        ),
      ),
    );
