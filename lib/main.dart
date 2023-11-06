import 'package:flutter/material.dart';
import 'package:logging/logging.dart';

import 'src/application/use_cases/overview.dart' as overview;
import 'src/data/generic/commands/log.dart';
import 'src/data/sqlite3/bootstrap.dart';
import 'src/data/sqlite3/commands/delete_foods_by_ids.dart';
import 'src/data/sqlite3/streams/foods.dart';
import 'src/presentation/flutter/app.dart';

void main() async {
  final sqlite3 = await bootstrap(
    pathToWasm: 'sqlite3.wasm',
    dbName: 'fridgy',
  );

  runApp(
    MyApp(
      overviewPipeIO: overview.preparePipeIO(
        pending: Stream.value(0),
        log: prepareLog(
          Logger('APPLICATION Overview'),
        ),
        foods$: prepareFoodsStream(
          sqlite3: sqlite3,
          log: prepareLog(
            Logger(r'DATA Foods$'),
          ),
        ),
        deleteByIds: prepareDeleteFoodsByIds(
          sqlite3: sqlite3,
          log: prepareLog(
            Logger('DATA DeleteByIds'),
          ),
        ),
      ),
    ),
  );
}
